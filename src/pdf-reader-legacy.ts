import "pdfjs-dist/build/pdf.worker.min.mjs";
import "./pdfjs-workaround.js";

import { createCanvas, GlobalFonts, type Canvas } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "fs";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

import { type PdfToken } from "./pdfjs.interface.js";

import {
  type DocumentInitParameters,
  type TextItem,
  type TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
import { type PDFPageProxy } from "pdfjs-dist/types/web/interfaces";

import { NodeCanvasFactory } from "./canvas-factory.js";
import { PdfReaderCommon } from "./pdf-reader-common.js";
import { CONSTANT, PDF_READER_DEFAULT_OPTIONS } from "./pdf.constant.js";
import {
  type CanvasMap,
  type CompactPageLines,
  type PageLines,
  type PageTexts,
  type PageToonLines,
  type PdfCompactLineAlgorithm,
  type PdfReaderOptions,
  type PdfScannedThreshold,
  type PdfWord,
} from "./pdf.interface.js";

import { type PaddleOcrResult, type PaddleOcrService } from "ppu-paddle-ocr";

/**
 * PdfReaderLegacy class based on pdfjs-dist for reading and processing PDF documents.
 */
export class PdfReaderLegacy extends PdfReaderCommon {
  private options: PdfReaderOptions;
  public readonly startIndex = 1;

  constructor(options: Partial<PdfReaderOptions> = {}) {
    super();
    this.options = { ...PDF_READER_DEFAULT_OPTIONS, ...options };

    if (this.options.fonts.length) {
      for (const f of this.options.fonts) {
        if (!existsSync(f.path))
          throw new Error(`Invalid font path: [${f.name}] ${f}`);

        GlobalFonts.registerFromPath(f.path, f.name);
      }
    }
  }

  /**
   * Opens a PDF document from a file path or an ArrayBuffer.
   * @param filename - The file path or ArrayBuffer of the PDF document.
   * @returns The opened PDFDocument instance.
   */
  async open(filename: string | ArrayBuffer): Promise<pdfjs.PDFDocumentProxy> {
    let data: Uint8Array<ArrayBuffer>;

    if (typeof filename == "string") {
      data = new Uint8Array(readFileSync(filename));
    } else {
      data = new Uint8Array(filename);
    }

    return pdfjs.getDocument({
      verbosity: +this.options.verbose!,
      CanvasFactory: NodeCanvasFactory,
      data,
    } as DocumentInitParameters).promise;
  }

  /**
   * Renders all pages of a PDF document into canvases.
   * @param doc - The PDFDocumentProxy to render.
   * @returns A map of page numbers to Canvas instances.
   */
  async renderAll(doc: pdfjs.PDFDocumentProxy): Promise<CanvasMap> {
    const canvasMap = new Map<number, Canvas>();

    const numOfPages = doc.numPages;
    const renderPromises: Promise<void>[] = [];
    for (let i = this.startIndex; i <= numOfPages; i++) {
      const page = await doc.getPage(i);
      renderPromises.push(this.getCanvas(canvasMap, i, page));
    }

    await Promise.all(renderPromises);
    return canvasMap;
  }

  /**
   * Extracts text from scanned PDF pages using ppu-paddle-ocr package.
   * @param paddleOcrService - The OCR service instance specifically from ppu-paddle-ocr to use for text recognition.
   * @param canvasMap - A map of page numbers to Canvas instances representing rendered PDF pages.
   * @returns A map of page numbers to extracted text data with OCR results.
   */
  async getTextsScanned(
    paddleOcrService: PaddleOcrService,
    canvasMap: CanvasMap
  ): Promise<PageTexts> {
    await paddleOcrService.initialize();

    const pages: PageTexts = new Map();
    const numOfPages = canvasMap.size;
    const ocrPromises: Promise<void>[] = [];

    for (let i = this.startIndex; i <= numOfPages; i++) {
      const canvas = canvasMap.get(i);
      if (canvas) {
        ocrPromises.push(
          this.extractOcrTexts(pages, i, canvas, paddleOcrService)
        );
      }
    }

    await Promise.all(ocrPromises);
    return pages;
  }

  private async getCanvas(
    canvasMap: CanvasMap,
    pageNum: number,
    page: PDFPageProxy,
    normalizedWidth?: number
  ): Promise<void> {
    let viewport = page.getViewport({ scale: 1 });

    if (this.options.scale && this.options.scale > 1) {
      viewport = page.getViewport({ scale: this.options.scale });
    } else if (normalizedWidth) {
      const normalizedScale = Math.floor(normalizedWidth / viewport.width);
      viewport = page.getViewport({ scale: normalizedScale });
    }

    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    const renderContext: any = {
      intent: "print",
      canvasContext: context,
      viewport: viewport,
    };

    canvasMap.set(pageNum, canvas);
    return page.render(renderContext).promise;
  }

  /**
   * Extracts text from all pages of a PDF document.
   * @param doc - The PDFDocumentProxy to extract text from.
   * @returns A map of page numbers to extracted text data.
   */
  async getTexts(pdf: pdfjs.PDFDocumentProxy): Promise<PageTexts> {
    const pages: PageTexts = new Map();
    const numOfPages = pdf.numPages;
    const getTextContentPromises: Promise<void>[] = [];

    for (let i = this.startIndex; i <= numOfPages; i++) {
      const page = await pdf.getPage(i);
      getTextContentPromises.push(this.extractTexts(pages, i, page));
    }

    await Promise.all(getTextContentPromises);
    return pages;
  }

  private async extractTexts(
    linesMap: PageTexts,
    pageNum: number,
    page: PDFPageProxy
  ): Promise<void> {
    const { height, transform } = page.getViewport({ scale: 1 });
    const pdfToken = await page.getTextContent();

    const textsMapped = this.mapTokenToPdfWord(
      pdfToken.items,
      transform,
      pageNum
    );

    let textsSorted = this.options.simpleSortAlgorithm
      ? this.sortTextContentSimple(textsMapped)
      : this.sortTextContent(textsMapped);

    if (!this.options.raw) {
      textsSorted = this.removeFakeBold(textsSorted);
    }

    const textsMerged = this.options.mergeCloseTextNeighbor
      ? this.mergeTextContent(textsSorted)
      : textsSorted;

    const textsFiltered = this.filterTextContent(textsMerged, height);
    const fullText = textsFiltered.map((word) => word.text).join(" ");

    linesMap.set(pageNum, {
      words: textsFiltered,
      fullText,
      confidence: 1,
      toon: this.getToonWords(textsFiltered, this.options.enableToon),
    });
  }

  private async extractOcrTexts(
    linesMap: PageTexts,
    pageNum: number,
    canvas: Canvas,
    paddleOcrService: PaddleOcrService
  ): Promise<void> {
    try {
      const ocrResult = await paddleOcrService.recognize(canvas);
      const pdfWords: PdfWord[] = this.convertOcrToPdfWords(ocrResult, pageNum);

      let textsSorted = this.options.simpleSortAlgorithm
        ? this.sortTextContentSimple(pdfWords)
        : this.sortTextContent(pdfWords);

      if (!this.options.raw) {
        textsSorted = this.removeFakeBold(textsSorted);
      }

      const textsMerged = this.options.mergeCloseTextNeighbor
        ? this.mergeTextContent(textsSorted)
        : textsSorted;

      const canvasHeight = canvas.height;
      const textsFiltered = this.filterTextContent(textsMerged, canvasHeight);
      const fullText = textsFiltered.map((word) => word.text).join(" ");

      linesMap.set(pageNum, {
        words: textsFiltered,
        fullText,
        confidence: ocrResult.confidence,
        toon: this.getToonWords(textsFiltered, this.options.enableToon),
      });
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`OCR failed for page ${pageNum}:`, error);
      }
      linesMap.set(pageNum, {
        words: [],
        fullText: "",
        confidence: 0,
        toon: "",
      });
    }
  }

  private convertOcrToPdfWords(
    ocrResult: PaddleOcrResult,
    pageNum: number
  ): PdfWord[] {
    if (!ocrResult?.lines || !Array.isArray(ocrResult.lines)) {
      return [];
    }

    return ocrResult.lines.flatMap((line) => {
      if (!Array.isArray(line)) return [];

      return line.map((recognition) => {
        const { x, y, width, height } = recognition.box;

        return {
          text: recognition.text,
          bbox: {
            x0: Math.round(x),
            y0: Math.round(y),
            x1: Math.round(x + width),
            y1: Math.round(y + height),
          },
          dimension: {
            width: Math.round(width),
            height: Math.round(height),
          },
          metadata: {
            writing: "",
            direction: "",
            font: {
              name: "",
              size: height,
              family: "",
              weight: "" as const,
              style: "" as const,
            },
            hasEOL: false,
            pageNum,
          },
        };
      });
    });
  }

  private mapTokenToPdfWord(
    items: (TextItem | TextMarkedContent)[],
    transform: number[],
    pageNum: number
  ): PdfWord[] {
    let pdfWords: PdfWord[] = [];

    for (const item of items) {
      const token = item as PdfToken;

      const [_, __, ___, ____, x, y] = pdfjs.Util.transform(
        transform,
        token.transform
      );

      const scale = x / token.transform[4];

      const pdfWord: PdfWord = {
        text: token.str,
        bbox: {
          x0: Math.round(x),
          y0: Math.round(y - token.height * scale),
          x1: Math.round(x + token.width * scale),
          y1: Math.round(y),
        },
        dimension: {
          width: Math.round(token.width),
          height: Math.round(token.height),
        },
        metadata: {
          writing: "",
          direction: token.dir,
          font: {
            name: token.fontName,
            size: Number(token.height.toFixed(4)),
            family: "",
            style: "",
            weight: "",
          },
          hasEOL: token.hasEOL,
          pageNum,
        },
      };

      pdfWords.push(pdfWord);
    }
    return pdfWords;
  }

  private mergeTextContent(texts: PdfWord[]): PdfWord[] {
    const result: PdfWord[] = [];

    let currentGroup: PdfWord | null = null;
    const UNORDERED_LIST = ["•", "-", "◦", "▪", "▫"];

    for (const content of texts) {
      const { text, dimension, metadata, bbox } = content;

      if (text === "" && (dimension.width === 0 || metadata.hasEOL)) continue;
      if (text == " " && metadata.font.size == 0 && !metadata.hasEOL) continue;

      if (!currentGroup) {
        currentGroup = { ...content };
        continue;
      }

      const prevMiddleY: number =
        (currentGroup.bbox.y0 + currentGroup.bbox.y1) / 2;

      const isWithinXRange: boolean =
        bbox.x0 <= currentGroup.bbox.x1 + currentGroup.metadata.font.size;

      const isWithinYRange: boolean =
        content.bbox.y0 <= prevMiddleY && prevMiddleY <= bbox.y1;

      const hasSameFontSize =
        Math.abs(metadata.font.size - currentGroup.metadata.font.size) < 0.01;

      const isLeadingGroupAnUnorderedList: boolean =
        isWithinYRange &&
        currentGroup.text.trim().length == 1 &&
        UNORDERED_LIST.includes(currentGroup.text.trim());

      if (
        isLeadingGroupAnUnorderedList ||
        (isWithinXRange &&
          isWithinYRange &&
          hasSameFontSize &&
          !currentGroup.metadata.hasEOL)
      ) {
        currentGroup = {
          text:
            currentGroup.text +
            (bbox.x0 - currentGroup.bbox.x1 < 1 ? "" : " ") +
            text,
          dimension: {
            width: bbox.x1 - currentGroup.bbox.x0,
            height: Math.max(
              currentGroup.dimension.height,
              content.dimension.height
            ),
          },
          bbox: {
            x0: currentGroup.bbox.x0,
            y0: Math.min(currentGroup.bbox.y0, bbox.y0),
            x1: bbox.x1,
            y1: Math.max(currentGroup.bbox.y1, bbox.y1),
          },
          metadata: {
            writing: "",
            direction: metadata.direction,
            font: {
              name: metadata.font.name,
              size: isLeadingGroupAnUnorderedList
                ? metadata.font.size
                : currentGroup.metadata.font.size,
              family: "",
              style: "",
              weight: "",
            },
            hasEOL: metadata.hasEOL,
            pageNum: metadata.pageNum,
          },
        };
      } else {
        result.push(currentGroup);
        currentGroup = { ...content };
      }

      if (metadata.hasEOL) {
        if (currentGroup) {
          result.push(currentGroup);
        }
        currentGroup = null;
      }
    }

    if (currentGroup) {
      result.push(currentGroup);
    }

    return result;
  }

  private filterTextContent(texts: PdfWord[], height: number): PdfWord[] {
    const HEADER_THRESHOLD = height * this.options.headerFromHeightPercentage!;
    const FOOTER_THRESHOLD = height * this.options.footerFromHeightPercentage!;

    return texts
      .filter((el) => {
        const hasFontSize = el.metadata.font.size !== 0;
        const isAfterHeader = el.bbox.y0 > HEADER_THRESHOLD;
        const isBeforeFooter = el.bbox.y0 < FOOTER_THRESHOLD;

        return (
          hasFontSize &&
          (!this.options.excludeHeader || isAfterHeader) &&
          (!this.options.excludeFooter || isBeforeFooter)
        );
      })
      .map((el, id) => ({
        ...el,
        id,
        text: !this.options.raw ? this.normalizedText(el.text) : el.text,
      }));
  }

  /**
   * Converts extracted text into structured lines.
   * @param pageTexts - The extracted text data from a PDF.
   * @returns A map of page numbers to structured lines.
   */
  getLinesFromTexts(pageTexts: PageTexts): PageLines {
    return this.getLinesFromTextsCommon(pageTexts, this.startIndex);
  }

  /**
   * Converts extracted text into TOON format string for LLM-friendly input.
   * @param pageTexts - The extracted text data from a PDF.
   * @returns A string of TOON format
   */
  getLinesFromTextsInToon(pageTexts: PageTexts): PageToonLines {
    return this.getLinesFromTextsInToonCommon(pageTexts, this.startIndex);
  }

  /**
   * Converts extracted text into compact structured lines using a specified algorithm.
   * @param pageTexts - The extracted text data from a PDF.
   * @param algorithm - The algorithm for compacting lines (default: "middleY").
   * @returns A map of page numbers to compact structured lines.
   */
  getCompactLinesFromTexts(
    pageTexts: PageTexts,
    algorithm: PdfCompactLineAlgorithm = "middleY"
  ): CompactPageLines {
    return this.getCompactLinesFromTextsCommon(
      pageTexts,
      algorithm,
      this.startIndex
    );
  }

  /**
   * Determines if the PDF document is scanned based on text thresholds.
   * @param pageTexts - The extracted text data from a PDF.
   * @param options - The threshold options for scanned detection.
   * @returns True if the document is likely scanned, false otherwise.
   */
  isScanned(
    pageTexts: PageTexts,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    }
  ): boolean {
    return this.isScannedCommon(pageTexts, options, this.startIndex);
  }

  /**
   * Determines if the individual PDF page is a scanned/digital based on text thresholds.
   * @param pageText - The extracted page text.
   * @param options - The threshold options for scanned detection.
   * @returns True if the page is likely scanned, false otherwise.
   */
  isPageScanned(
    pageText: string,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    }
  ): boolean {
    return this.isPageScannedCommon(pageText, options);
  }

  /**
   * Saves rendered canvases as image files.
   * @param canvasMap - The map of canvases to save.
   * @param filename - The base filename for the output images.
   * @param foldername - The folder to save the images in (default: "out").
   */
  async dumpCanvasMap(
    canvasMap: Map<number, Canvas>,
    filename: string,
    foldername = "out"
  ): Promise<void> {
    this.dumpCanvasMapCommon(canvasMap, filename, foldername, this.startIndex);
  }

  /**
   * Destroys the PDF document instance to free memory.
   * @param doc - The PDFDocumentProxy instance to destroy.
   */
  async destroy(pdf: pdfjs.PDFDocumentProxy): Promise<void> {
    await pdf.destroy();
  }
}
