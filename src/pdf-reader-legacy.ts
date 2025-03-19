import "pdfjs-dist/build/pdf.worker.min.mjs";
import "./pdfjs-workaround";

import { createCanvas, GlobalFonts, type Canvas } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "fs";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

import { type PdfToken } from "./pdfjs.interface";

import {
  type DocumentInitParameters,
  type TextItem,
  type TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
import { type PDFPageProxy } from "pdfjs-dist/types/web/interfaces";

import { NodeCanvasFactory } from "./canvas-factory";
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

export class PdfReaderLegacy extends PdfReaderCommon {
  private options: PdfReaderOptions;
  private startIndex = 1;

  constructor(options: Partial<PdfReaderOptions> = {}) {
    super();
    this.options = { ...PDF_READER_DEFAULT_OPTIONS, ...options };
  }

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

    if (this.options.fonts.length) {
      for (const f of this.options.fonts) {
        if (!existsSync(f.path))
          throw new Error(`Invalid font path: [${f.name}] ${f}`);

        GlobalFonts.registerFromPath(f.path, f.name);
      }
    }

    const renderContext: any = {
      intent: "print",
      canvasContext: context,
      viewport: viewport,
    };

    canvasMap.set(pageNum, canvas);
    return page.render(renderContext).promise;
  }

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
          x0: x,
          y0: y - token.height * scale,
          x1: x + token.width * scale,
          y1: y,
        },
        dimension: {
          width: token.width,
          height: token.height,
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

  isScanned(
    pageTexts: PageTexts,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    }
  ): boolean {
    return this.isScannedCommon(pageTexts, options, this.startIndex);
  }

  async dumpCanvasMap(
    canvasMap: Map<number, Canvas>,
    filename: string,
    foldername = "out"
  ): Promise<void> {
    this.dumpCanvasMapCommon(canvasMap, filename, foldername, this.startIndex);
  }

  async destroy(pdf: pdfjs.PDFDocumentProxy): Promise<void> {
    await pdf.destroy();
  }
}
