/** @module Web entrypoint for ppu-pdf browser support.
 *
 * Provides `PdfReaderLegacyWeb`, a browser-compatible PDF reader based on pdfjs-dist.
 * Supports text extraction, line grouping, compact lines, TOON format, scanned detection,
 * page rendering to HTMLCanvasElement, and scanned PDF OCR via ppu-paddle-ocr/web.
 *
 * @example
 * ```ts
 * import { PdfReaderLegacyWeb } from "ppu-pdf/web";
 *
 * const reader = new PdfReaderLegacyWeb({ verbose: false });
 * const response = await fetch("my-document.pdf");
 * const buffer = await response.arrayBuffer();
 *
 * const pdf = await reader.open(buffer);
 * const texts = await reader.getTexts(pdf);
 * console.log(texts.get(1)?.fullText);
 * await reader.destroy(pdf);
 * ```
 */

import * as pdfjs from "pdfjs-dist";

import {
  type TextItem,
  type TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
import { type PDFPageProxy } from "pdfjs-dist/types/web/interfaces";

import { BasePdfReaderCommon } from "../core/base-pdf-reader-common.js";
import { CONSTANT, PDF_READER_DEFAULT_OPTIONS } from "../pdf.constant.js";
import {
  type CompactPageLines,
  type PageLines,
  type PageTexts,
  type PageToonLines,
  type PdfCompactLineAlgorithm,
  type PdfReaderOptions,
  type PdfScannedThreshold,
  type PdfWord,
} from "../pdf.interface.js";
import { type PdfToken } from "../pdfjs.interface.js";

/** Canvas map type for web — uses HTMLCanvasElement instead of Node.js native Canvas. */
export type WebCanvasMap = Map<number, HTMLCanvasElement>;

/**
 * Browser-compatible PDF reader based on pdfjs-dist.
 *
 * Supports all digital PDF features: text extraction, line grouping,
 * compact lines, TOON format, and scanned detection.
 * Also supports page rendering to HTMLCanvasElement and scanned PDF OCR
 * when combined with ppu-paddle-ocr/web.
 */
export class PdfReaderLegacyWeb extends BasePdfReaderCommon {
  private options: PdfReaderOptions;
  public readonly startIndex = 1;

  constructor(options: Partial<PdfReaderOptions> = {}) {
    super();
    // In browser, fonts are handled by the browser itself — ignore fonts option
    this.options = {
      ...PDF_READER_DEFAULT_OPTIONS,
      ...options,
      fonts: [],
    };
  }

  /**
   * Opens a PDF document from an ArrayBuffer.
   * @param data - The ArrayBuffer containing the PDF data.
   * @returns The opened PDFDocumentProxy instance.
   */
  async open(data: ArrayBuffer): Promise<pdfjs.PDFDocumentProxy> {
    const uint8 = new Uint8Array(data);

    return pdfjs.getDocument({
      verbosity: +this.options.verbose!,
      data: uint8,
    }).promise;
  }

  /**
   * Renders all pages of a PDF document into HTMLCanvasElements.
   * @param doc - The PDFDocumentProxy to render.
   * @returns A map of page numbers to HTMLCanvasElement instances.
   */
  async renderAll(doc: pdfjs.PDFDocumentProxy): Promise<WebCanvasMap> {
    const canvasMap = new Map<number, HTMLCanvasElement>();

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
   * Extracts text from scanned PDF pages using an OCR service.
   * Compatible with ppu-paddle-ocr/web's PaddleOcrService.
   * @param ocrService - Any OCR service with initialize() and recognize(canvas) methods.
   * @param canvasMap - A map of page numbers to HTMLCanvasElement instances.
   * @returns A map of page numbers to extracted text data with OCR results.
   */
  async getTextsScanned(
    ocrService: {
      initialize(): Promise<void>;
      recognize(canvas: HTMLCanvasElement): Promise<any>;
    },
    canvasMap: WebCanvasMap,
  ): Promise<PageTexts> {
    await ocrService.initialize();

    const pages: PageTexts = new Map();
    const numOfPages = canvasMap.size;
    const ocrPromises: Promise<void>[] = [];

    for (let i = this.startIndex; i <= numOfPages; i++) {
      const canvas = canvasMap.get(i);
      if (canvas) {
        ocrPromises.push(this.extractOcrTexts(pages, i, canvas, ocrService));
      }
    }

    await Promise.all(ocrPromises);
    return pages;
  }

  private async getCanvas(
    canvasMap: WebCanvasMap,
    pageNum: number,
    page: PDFPageProxy,
    normalizedWidth?: number,
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

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;

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
    page: PDFPageProxy,
  ): Promise<void> {
    const { height, transform } = page.getViewport({ scale: 1 });
    const pdfToken = await page.getTextContent();

    const textsMapped = this.mapTokenToPdfWord(
      pdfToken.items,
      transform,
      pageNum,
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
    canvas: HTMLCanvasElement,
    ocrService: {
      recognize(canvas: HTMLCanvasElement): Promise<any>;
    },
  ): Promise<void> {
    try {
      const ocrResult = await ocrService.recognize(canvas);
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

  private convertOcrToPdfWords(ocrResult: any, pageNum: number): PdfWord[] {
    if (!ocrResult?.lines || !Array.isArray(ocrResult.lines)) {
      return [];
    }

    return ocrResult.lines.flatMap((line: any) => {
      if (!Array.isArray(line)) return [];

      return line.map((recognition: any) => {
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
    pageNum: number,
  ): PdfWord[] {
    let pdfWords: PdfWord[] = [];

    for (const item of items) {
      const token = item as PdfToken;

      const [_, __, ___, ____, x, y] = pdfjs.Util.transform(
        transform,
        token.transform,
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
              content.dimension.height,
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
    algorithm: PdfCompactLineAlgorithm = "middleY",
  ): CompactPageLines {
    return this.getCompactLinesFromTextsCommon(
      pageTexts,
      algorithm,
      this.startIndex,
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
    },
  ): boolean {
    return this.isScannedCommon(pageTexts, options, this.startIndex);
  }

  /**
   * Determines if the individual PDF page is scanned/digital based on text thresholds.
   * @param pageText - The extracted page text.
   * @param options - The threshold options for scanned detection.
   * @returns True if the page is likely scanned, false otherwise.
   */
  isPageScanned(
    pageText: string,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    },
  ): boolean {
    return this.isPageScannedCommon(pageText, options);
  }

  /**
   * Destroys the PDF document instance to free memory.
   * @param doc - The PDFDocumentProxy instance to destroy.
   */
  async destroy(pdf: pdfjs.PDFDocumentProxy): Promise<void> {
    await pdf.destroy();
  }
}
