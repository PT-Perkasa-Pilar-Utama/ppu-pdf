import "./mupdf-workaround";

import { Canvas, createCanvas, GlobalFonts, ImageData } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "fs";

import { type PDFDocument, type PDFPage } from "mupdf/mupdfjs";
import { type DocumentStructure } from "./mupdf.interface";

import { PdfReaderCommon } from "./pdf-reader-common";
import { CONSTANT, PDF_READER_DEFAULT_OPTIONS } from "./pdf.constant";
import {
  type CanvasMap,
  type CompactPageLines,
  type PageLines,
  type PageTexts,
  type PdfCompactLineAlgorithm,
  type PdfReaderOptions,
  type PdfScannedThreshold,
  type PdfWord,
} from "./pdf.interface";

const mupdf = await import("mupdf/mupdfjs");

/**
 * PdfReader class based on mupdfjs for reading and processing PDF documents.
 */
export class PdfReader extends PdfReaderCommon {
  private options: PdfReaderOptions;
  private startIndex = 0;

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
  open(filename: string | ArrayBuffer): PDFDocument {
    let data: Uint8Array<ArrayBuffer>;

    if (typeof filename == "string") {
      data = new Uint8Array(readFileSync(filename));
    } else {
      data = new Uint8Array(filename);
    }

    return mupdf.PDFDocument.openDocument(data, "application/pdf");
  }

  /**
   * Renders all pages of a PDF document into canvases.
   * @param doc - The PDFDocument to render.
   * @param dpi - The resolution (dots per inch) to render the PDF pages.
   *              Higher values improve OCR accuracy but increase memory usage.
   * @returns A map of page numbers to Canvas instances, where each page number
   *          corresponds to its rendered canvas representation.
   */
  async renderAll(doc: PDFDocument, dpi: number = 72): Promise<CanvasMap> {
    const canvasMap = new Map<number, Canvas>();

    const numOfPages = doc.countPages();
    const renderPromises = Array.from({ length: numOfPages }, (_, i) => {
      const page = new mupdf.PDFPage(doc, i);
      return this.getCanvas(canvasMap, i, page, dpi);
    });

    await Promise.all(renderPromises);
    return canvasMap;
  }

  private async getCanvas(
    canvasMap: CanvasMap,
    pageNum: number,
    page: PDFPage,
    dpi: number
  ): Promise<void> {
    const pageDimension = page.getBounds();
    const scaleFactor = mupdf.Matrix.scale(dpi / 72, dpi / 72);
    const bbox = mupdf.Rect.transform(pageDimension, scaleFactor);

    const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, bbox, false);
    pixmap.clear(255);

    const device = new mupdf.DrawDevice(scaleFactor, pixmap);
    page.run(device, mupdf.Matrix.identity);

    device.close();
    page.destroy();

    const width = pixmap.getWidth();
    const height = pixmap.getHeight();

    const pixels3 = new Uint8ClampedArray(pixmap.getPixels());
    const pixels4 = new Uint8ClampedArray(width * height * 4);

    for (let i = 0, j = 0; i < pixels3.length; i += 3, j += 4) {
      pixels4[j] = pixels3[i];
      pixels4[j + 1] = pixels3[i + 1];
      pixels4[j + 2] = pixels3[i + 2];
      pixels4[j + 3] = 255;
    }

    const imageData = new ImageData(pixels4, width, height) as any;
    imageData.colorSpace = "srgb";

    const canvas = createCanvas(pageDimension[2], pageDimension[3]);
    const context = canvas.getContext("2d");

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    context.putImageData(imageData, 0, 0);
    canvasMap.set(pageNum, canvas);
  }

  /**
   * Extracts text from all pages of a PDF document.
   * @param doc - The PDFDocument to extract text from.
   * @returns A map of page numbers to extracted text data.
   */
  async getTexts(doc: PDFDocument): Promise<PageTexts> {
    const pages: PageTexts = new Map();
    const numOfPages = doc.countPages();
    const getTextContentPromises: Promise<void>[] = [];

    for (let i = this.startIndex; i < numOfPages; i++) {
      const page = new mupdf.PDFPage(doc, i);
      getTextContentPromises.push(this.extractTexts(pages, i, page));
    }

    await Promise.all(getTextContentPromises);
    return pages;
  }

  private async extractTexts(
    linesMap: PageTexts,
    pageNum: number,
    page: PDFPage
  ): Promise<void> {
    const [, , , height] = page.getBounds();

    const docStructure = JSON.parse(
      page.toStructuredText("ignore-actualtext").asJSON()
    ) as DocumentStructure;

    page.destroy();

    const textsMapped = this.mapStructureToPdfWord(docStructure, pageNum);
    const textsSorted = this.options.simpleSortAlgorithm
      ? this.sortTextContentSimple(textsMapped)
      : this.sortTextContent(textsMapped);

    const textsMerged = this.options.mergeCloseTextNeighbor
      ? this.mergeTextContent(textsSorted)
      : textsSorted;

    const textsFiltered = this.filterTextContent(textsMerged, height);

    linesMap.set(pageNum, {
      words: textsFiltered,
    });
  }

  private mapStructureToPdfWord(
    structure: DocumentStructure,
    pageNum: number
  ): PdfWord[] {
    let pdfWords: PdfWord[] = [];

    const rawTexts = structure.blocks.map((el) => el.lines).flat();

    for (const item of rawTexts) {
      const { x, y, w, h } = item.bbox;
      const font = item.font;

      const pdfWord: PdfWord = {
        text: item.text,
        bbox: {
          x0: x,
          y0: y,
          x1: x + w,
          y1: y + h,
        },
        dimension: {
          width: w,
          height: h,
        },
        metadata: {
          writing: item.wmode == 0 ? "horizontal" : "vertical",
          direction: "",
          font: font,
          hasEOL: false,
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

      if (text === "" && dimension.width === 0) continue;
      if (text == " " && metadata.font.size == 0) continue;

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
        (isWithinXRange && isWithinYRange && hasSameFontSize)
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
            writing: metadata.writing,
            direction: "",
            font: isLeadingGroupAnUnorderedList
              ? metadata.font
              : currentGroup.metadata.font,
            hasEOL: false,
            pageNum: metadata.pageNum,
          },
        };
      } else {
        result.push(currentGroup);
        currentGroup = { ...content };
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
        const notEmptySpace = el.text.trim() !== "";
        const isAfterHeader = el.bbox.y0 > HEADER_THRESHOLD;
        const isBeforeFooter = el.bbox.y0 < FOOTER_THRESHOLD;

        return (
          hasFontSize &&
          notEmptySpace &&
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
   * Destroys the PDF document instance to free memory.
   * @param doc - The PDFDocument instance to destroy.
   */
  destroy(doc: PDFDocument): void {
    return doc.destroy();
  }

  /**
   * Destroys a PDF page instance to free memory.
   * @param page - The PDFPage instance to destroy.
   */
  destroyPage(page: PDFPage): void {
    return page.destroy();
  }
}
