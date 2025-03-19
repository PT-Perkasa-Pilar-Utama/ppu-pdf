import "./mupdf-workaround";

import { Canvas, createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
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

export class PdfReader extends PdfReaderCommon {
  private options: PdfReaderOptions;
  private startIndex = 0;

  constructor(options: Partial<PdfReaderOptions> = {}) {
    super();
    this.options = { ...PDF_READER_DEFAULT_OPTIONS, ...options };
  }

  open(filename: string | ArrayBuffer): PDFDocument {
    let data: Uint8Array<ArrayBuffer>;

    if (typeof filename == "string") {
      data = new Uint8Array(readFileSync(filename));
    } else {
      data = new Uint8Array(filename);
    }

    return mupdf.PDFDocument.openDocument(data, "application/pdf");
  }

  async renderAll(doc: PDFDocument): Promise<CanvasMap> {
    const canvasMap = new Map<number, Canvas>();

    const numOfPages = doc.countPages();
    const renderPromises = Array.from({ length: numOfPages }, (_, i) => {
      const page = new mupdf.PDFPage(doc, i);
      return this.getCanvas(canvasMap, i, page);
    });

    await Promise.all(renderPromises);
    return canvasMap;
  }

  private async getCanvas(
    canvasMap: CanvasMap,
    pageNum: number,
    page: PDFPage
  ): Promise<void> {
    const [, , width, height] = page.getBounds();

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    if (this.options.fonts.length) {
      for (const f of this.options.fonts) {
        if (!existsSync(f.path))
          throw new Error(`Invalid font path: [${f.name}] ${f}`);

        GlobalFonts.registerFromPath(f.path, f.name);
      }
    }

    const pixmap = page.toPixmap(
      mupdf.Matrix.identity,
      mupdf.ColorSpace.DeviceRGB,
      false,
      true
    );

    page.destroy();

    const pngImage = Buffer.from(pixmap.asPNG());
    const image = await loadImage(pngImage);

    context.drawImage(image, 0, 0, width, height);
    canvasMap.set(pageNum, canvas);
  }

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

  getLinesFromTexts(pageTexts: PageTexts): PageLines {
    return this.getLinesFromTextsCommon(pageTexts, this.startIndex);
  }

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

  async dumpCanvasMap(
    canvasMap: Map<number, Canvas>,
    filename: string,
    foldername = "out"
  ): Promise<void> {
    this.dumpCanvasMapCommon(canvasMap, filename, foldername, this.startIndex);
  }

  isScanned(
    pageTexts: PageTexts,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    }
  ): boolean {
    return this.isScannedCommon(pageTexts, options, this.startIndex);
  }

  destroy(doc: PDFDocument): void {
    return doc.destroy();
  }

  destroyPage(page: PDFPage): void {
    return page.destroy();
  }
}
