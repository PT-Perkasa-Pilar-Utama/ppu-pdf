import { readFileSync } from "fs";

// Comment this until Bun.js support process.getBuiltinModule("module")
// see: https://github.com/oven-sh/bun/pull/12689
// import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
// import { getDocument, Util } from "pdfjs-dist/legacy/build/pdf.mjs";

import { getDocument, Util, type PDFDocumentProxy } from "pdfjs-dist/";
import "pdfjs-dist/build/pdf.worker.min.mjs";

import type {
  DocumentInitParameters,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
import type { PDFPageProxy } from "pdfjs-dist/types/web/interfaces";
import { CONSTANT } from "./pdf.constant";
import {
  type CompactPageLines,
  type CompactPdfLine,
  type CompactPdfWord,
  type PageLinesLegacy,
  type PageTextsLegacy,
  type PdfCompactLineAlgorithm,
  type PdfLineLegacy,
  type PdfReaderOptions,
  type PdfScannedThreshold,
  type PdfToken,
  type PdfWordLegacy,
} from "./pdf.interface";

const defaultOptions: PdfReaderOptions = {
  verbose: false,
  excludeFooter: true,
  excludeHeader: true,
  raw: false,
  headerFromHeightPercentage: CONSTANT.HEADER_FROM_HEIGHT_PERCENTAGE,
  footerFromHeightPercentage: CONSTANT.FOOTER_FROM_HEIGHT_PERCENTAGE,
  mergeCloseTextNeighbor: true,
  simpleSortAlgorithm: false,
};

export class PdfReaderLegacy {
  private options: PdfReaderOptions;

  constructor(options: Partial<PdfReaderOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  async open(filename: string | ArrayBuffer): Promise<PDFDocumentProxy> {
    let data: Uint8Array<ArrayBuffer>;

    if (typeof filename == "string") {
      data = new Uint8Array(readFileSync(filename));
    } else {
      data = new Uint8Array(filename);
    }

    return getDocument({
      verbosity: +this.options.verbose!,
      data,
    } as DocumentInitParameters).promise;
  }

  async getTexts(pdf: PDFDocumentProxy): Promise<PageTextsLegacy> {
    const pages: PageTextsLegacy = new Map();
    const numOfPages = pdf.numPages;
    const getTextContentPromises: Promise<void>[] = [];

    for (let i = 1; i <= numOfPages; i++) {
      const page = await pdf.getPage(i);
      getTextContentPromises.push(this.extractTexts(pages, i, page));
    }

    await Promise.all(getTextContentPromises);
    return pages;
  }

  private async extractTexts(
    linesMap: PageTextsLegacy,
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
      lang: pdfToken.lang || "",
    });
  }

  private mapTokenToPdfWord(
    items: (TextItem | TextMarkedContent)[],
    transform: number[],
    pageNum: number
  ): PdfWordLegacy[] {
    let pdfWords: PdfWordLegacy[] = [];

    for (const item of items) {
      const token = item as PdfToken;

      const [_, __, ___, ____, x, y] = Util.transform(
        transform,
        token.transform
      );

      const scale = x / token.transform[4];

      const pdfWord: PdfWordLegacy = {
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
          direction: token.dir,
          fontName: token.fontName,
          fontSize: Number(token.height.toFixed(4)),
          hasEOL: token.hasEOL,
          pageNum,
        },
      };

      pdfWords.push(pdfWord);
    }
    return pdfWords;
  }

  private sortTextContent(texts: PdfWordLegacy[]): PdfWordLegacy[] {
    return texts.sort((a, b) => {
      const heightA = Math.abs(a.bbox.y1 - a.bbox.y0);
      const heightB = Math.abs(b.bbox.y1 - b.bbox.y0);

      const avgHeight = (heightA + heightB) / 2;
      const threshold = avgHeight * 0.5;

      const verticalDiff = Math.abs(a.bbox.y0 - b.bbox.y0);

      if (verticalDiff <= threshold) {
        return a.bbox.x0 - b.bbox.x0;
      }

      return a.bbox.y0 - b.bbox.y0;
    });
  }

  private sortTextContentSimple(texts: PdfWordLegacy[]): PdfWordLegacy[] {
    return texts.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  }

  private mergeTextContent(texts: PdfWordLegacy[]): PdfWordLegacy[] {
    const result: PdfWordLegacy[] = [];

    let currentGroup: PdfWordLegacy | null = null;
    const UNORDERED_LIST = ["•", "-", "◦", "▪", "▫"];

    for (const content of texts) {
      const { text, dimension, metadata, bbox } = content;

      if (text === "" && (dimension.width === 0 || metadata.hasEOL)) continue;
      if (text == " " && metadata.fontSize == 0 && !metadata.hasEOL) continue;

      if (!currentGroup) {
        currentGroup = { ...content };
        continue;
      }

      const prevMiddleY: number =
        (currentGroup.bbox.y0 + currentGroup.bbox.y1) / 2;

      const isWithinXRange: boolean =
        bbox.x0 <= currentGroup.bbox.x1 + currentGroup.metadata.fontSize;

      const isWithinYRange: boolean =
        content.bbox.y0 <= prevMiddleY && prevMiddleY <= bbox.y1;

      const hasSameFontSize =
        Math.abs(metadata.fontSize - currentGroup.metadata.fontSize) < 0.01;

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
            fontSize: isLeadingGroupAnUnorderedList
              ? metadata.fontSize
              : currentGroup.metadata.fontSize,
            direction: metadata.direction,
            fontName: metadata.fontName,
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

  private filterTextContent(
    texts: PdfWordLegacy[],
    height: number
  ): PdfWordLegacy[] {
    const HEADER_THRESHOLD = height * this.options.headerFromHeightPercentage!;
    const FOOTER_THRESHOLD = height * this.options.footerFromHeightPercentage!;

    return texts
      .filter((el) => {
        const hasFontSize = el.metadata.fontSize !== 0;
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

  getLinesFromTexts(pageTexts: PageTextsLegacy): PageLinesLegacy {
    const pageLines: PageLinesLegacy = new Map();
    const numOfPages = pageTexts.size;

    for (let i = 1; i <= numOfPages; i++) {
      const pdfText = pageTexts.get(i);
      let lines: PdfLineLegacy[] = [];
      if (pdfText) {
        lines = this.getLines(pdfText.words);
      }
      pageLines.set(i, lines);
    }

    return pageLines;
  }

  private getLines(words: PdfWordLegacy[] = []): PdfLineLegacy[] {
    const lineGroups: PdfWordLegacy[][] = [];

    for (const word of words) {
      let appended = false;

      for (const line of lineGroups) {
        let currentY0 = Infinity;
        let currentY1 = -Infinity;
        for (const w of line) {
          currentY0 = Math.min(currentY0, w.bbox.y0);
          currentY1 = Math.max(currentY1, w.bbox.y1);
        }
        const midY = (currentY0 + currentY1) / 2;

        if (word.bbox.y0 <= midY && word.bbox.y1 >= midY) {
          line.push(word);
          appended = true;
          break;
        }
      }

      if (!appended) {
        lineGroups.push([word]);
      }
    }

    return this.mergeLines(lineGroups);
  }

  private mergeLines(lines: PdfWordLegacy[][]): PdfLineLegacy[] {
    const mergedLines: PdfLineLegacy[] = lines.map((lineWords) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;

      for (const word of lineWords) {
        x0 = Math.min(x0, word.bbox.x0);
        y0 = Math.min(y0, word.bbox.y0);
        x1 = Math.max(x1, word.bbox.x1);
        y1 = Math.max(y1, word.bbox.y1);
      }

      lineWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);

      const averageFontSize =
        lineWords.reduce((sum, word) => sum + word.metadata.fontSize, 0) /
        lineWords.length;

      const dimension = { width: x1 - x0, height: y1 - y0 };

      return {
        bbox: { x0, y0, x1, y1 },
        averageFontSize,
        dimension,
        words: lineWords,
        text: lineWords.map((word) => word.text).join(" "),
      };
    });

    return mergedLines;
  }

  getCompactLinesFromTexts(
    pageTexts: PageTextsLegacy,
    algorithm: PdfCompactLineAlgorithm = "middleY"
  ): CompactPageLines {
    const pageLines: CompactPageLines = new Map();
    const numOfPages = pageTexts.size;

    for (let i = 1; i <= numOfPages; i++) {
      const pdfText = pageTexts.get(i);
      let lines: CompactPdfLine[] = [];
      if (pdfText) {
        const mappedCompactWords = this.mapWordsToCompactWords(pdfText.words);

        if (algorithm == "y0") {
          lines = this.getCompactLinesOldAlgorithm(mappedCompactWords);
        } else {
          lines = this.getCompactLines(mappedCompactWords);
        }
      }
      pageLines.set(i, lines);
    }

    return pageLines;
  }

  private mapWordsToCompactWords(
    words: PdfWordLegacy[] = []
  ): CompactPdfWord[] {
    return words.map((word) => ({ text: word.text, bbox: word.bbox }));
  }

  private getCompactLines(words: CompactPdfWord[] = []): CompactPdfLine[] {
    const lineGroups: CompactPdfWord[][] = [];

    for (const word of words) {
      let appended = false;

      for (const line of lineGroups) {
        let currentY0 = Infinity;
        let currentY1 = -Infinity;
        for (const w of line) {
          currentY0 = Math.min(currentY0, w.bbox.y0);
          currentY1 = Math.max(currentY1, w.bbox.y1);
        }
        const midY = (currentY0 + currentY1) / 2;

        if (word.bbox.y0 <= midY && word.bbox.y1 >= midY) {
          line.push(word);
          appended = true;
          break;
        }
      }

      if (!appended) {
        lineGroups.push([word]);
      }
    }

    return this.mergeCompactLines(lineGroups);
  }

  private mergeCompactLines(lines: CompactPdfWord[][]): CompactPdfLine[] {
    const mergedLines: CompactPdfLine[] = lines.map((lineWords) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;

      for (const word of lineWords) {
        x0 = Math.min(x0, word.bbox.x0);
        y0 = Math.min(y0, word.bbox.y0);
        x1 = Math.max(x1, word.bbox.x1);
        y1 = Math.max(y1, word.bbox.y1);
      }

      lineWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);

      return {
        bbox: { x0, y0, x1, y1 },
        words: lineWords.map((word) => ({ text: word.text, bbox: word.bbox })),
        text: lineWords.map((word) => word.text).join(" "),
      };
    });

    return mergedLines;
  }

  private getCompactLinesOldAlgorithm(
    words: CompactPdfWord[] = []
  ): CompactPdfLine[] {
    const lines: CompactPdfWord[][] = [];
    for (const word of words) {
      const line = lines.find(
        (l) => Math.abs(l[0].bbox.y0 - word.bbox.y0) <= 5
      );

      if (line) {
        line.push(word);
      } else {
        lines.push([word]);
      }
    }

    const linesMerged = this.mergeCompactLinesOldAlgorithm(lines);
    return linesMerged;
  }

  private mergeCompactLinesOldAlgorithm(
    lines: CompactPdfWord[][]
  ): CompactPdfLine[] {
    const mergedLines: CompactPdfLine[] = lines.map((line) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = 0;
      let y1 = 0;
      let words: CompactPdfWord[] = [];

      line = line.sort((a, b) => a.bbox.x0 - b.bbox.x0);

      for (const word of line) {
        x0 = Math.min(x0, word.bbox.x0);
        y0 = Math.min(y0, word.bbox.y0);
        x1 = Math.max(x1, word.bbox.x1);
        y1 = Math.max(y1, word.bbox.y1);
        words.push(word);
      }
      return {
        bbox: { x0, y0, x1, y1 },
        words,
        text: words.map((word) => word.text).join(" "),
      };
    });

    return mergedLines;
  }

  isScanned(
    pageTexts: PageTextsLegacy,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    }
  ): boolean {
    let totalWords = 0;
    let fullText = "";
    const totalPages = pageTexts.size;

    for (let i = 1; i <= totalPages; i++) {
      const page = pageTexts.get(i);

      if (page) {
        const texts = page.words.map((w) => w.text).join(" ");
        fullText += texts + " ";
        totalWords += texts
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
      }
    }

    const averageWordsPerPage = totalWords / totalPages;
    const isWordsBelowThreshold = averageWordsPerPage < options.wordsPerPage;
    const isTextLengthBelowThreshold = fullText.length < options.textLength;

    return isWordsBelowThreshold || isTextLengthBelowThreshold;
  }

  private normalizedText(str: string): string {
    const spacedLetterPattern = /^([A-Z]\s)+[A-Z]$/;

    str = str.replace(/  +/g, " ");

    if (spacedLetterPattern.test(str)) {
      return str.replace(/\s/g, "");
    }

    return str?.trim();
  }

  async destroy(pdf: PDFDocumentProxy): Promise<void> {
    await pdf.destroy();
  }
}
