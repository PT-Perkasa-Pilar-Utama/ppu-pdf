import { Canvas, createCanvas, loadImage } from "canvas";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "fs";
import { ColorSpace, Matrix, PDFDocument, PDFPage } from "mupdf/mupdfjs";
import { join } from "path";
import type { DocumentStructure } from "./mupdf.interface";
import { CONSTANT } from "./pdf.constant";
import {
  type CanvasMap,
  type CompactPageLines,
  type CompactPdfLine,
  type CompactPdfWord,
  type PageLines,
  type PageTexts,
  type PdfCompactLineAlgorithm,
  type PdfLine,
  type PdfReaderOptions,
  type PdfScannedThreshold,
  type PdfWord,
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
  scale: 1,
};

export class PdfReader {
  private options: PdfReaderOptions;

  constructor(options: Partial<PdfReaderOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  open(filename: string | ArrayBuffer): PDFDocument {
    let data: Uint8Array<ArrayBuffer>;

    if (typeof filename == "string") {
      data = new Uint8Array(readFileSync(filename));
    } else {
      data = new Uint8Array(filename);
    }

    return PDFDocument.openDocument(data, "application/pdf");
  }

  async renderAll(doc: PDFDocument): Promise<CanvasMap> {
    const canvasMap = new Map<number, Canvas>();

    const numOfPages = doc.countPages();
    const renderPromises = Array.from({ length: numOfPages }, (_, i) => {
      const page = new PDFPage(doc, i);
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

    const pixmap = page.toPixmap(
      Matrix.identity,
      ColorSpace.DeviceRGB,
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

    for (let i = 0; i < numOfPages; i++) {
      const page = new PDFPage(doc, i);
      getTextContentPromises.push(this.extractTexts(pages, i, page));
    }

    await Promise.all(getTextContentPromises);
    return pages;
  }

  async saveCanvasToPng(
    canvas: Canvas,
    filename: string,
    foldername: string
  ): Promise<void> {
    return new Promise((res, rej) => {
      try {
        const folderPath = join(process.cwd(), foldername);
        if (!existsSync(folderPath)) {
          mkdirSync(folderPath, { recursive: true });
        }

        const newCanvas = createCanvas(canvas.width, canvas.height);
        const ctx = newCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, 0);

        const filePath = join(folderPath, filename);
        const out = createWriteStream(filePath);
        const stream = newCanvas.createPNGStream();

        stream.pipe(out);
        stream.on("finish", res);
        stream.on("error", rej);
      } catch (error) {
        rej(error);
      }
    });
  }

  async dumpCanvasMap(
    canvasMap: Map<number, Canvas>,
    filename: string,
    foldername = "out"
  ): Promise<void> {
    for (let i = 0; i < canvasMap.size; i++) {
      const canvas = canvasMap.get(i);
      if (canvas) {
        await this.saveCanvasToPng(canvas, `${filename}-${i}.png`, foldername);
      }
    }
  }

  private async extractTexts(
    linesMap: PageTexts,
    pageNum: number,
    page: PDFPage
  ): Promise<void> {
    const [, , , height] = page.getBounds();
    const docStructure = JSON.parse(
      page.toStructuredText().asJSON()
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
        text: !this.options.raw ? this.normalizedText(item.text) : item.text,
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
          font: font,
          pageNum,
        },
      };

      pdfWords.push(pdfWord);
    }
    return pdfWords;
  }

  private sortTextContent(texts: PdfWord[]): PdfWord[] {
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

  private sortTextContentSimple(texts: PdfWord[]): PdfWord[] {
    return texts.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
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
            font: isLeadingGroupAnUnorderedList
              ? metadata.font
              : currentGroup.metadata.font,
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
      .map((el, id) => ({ ...el, id }));
  }

  getLinesFromTexts(pageTexts: PageTexts): PageLines {
    const pageLines: PageLines = new Map();
    const numOfPages = pageTexts.size;

    for (let i = 0; i < numOfPages; i++) {
      const pdfText = pageTexts.get(i);
      let lines: PdfLine[] = [];
      if (pdfText) {
        lines = this.getLines(pdfText.words);
      }
      pageLines.set(i, lines);
    }

    return pageLines;
  }

  private getLines(words: PdfWord[] = []): PdfLine[] {
    const lineGroups: PdfWord[][] = [];

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

  private mergeLines(lines: PdfWord[][]): PdfLine[] {
    const mergedLines: PdfLine[] = lines.map((lineWords) => {
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
        lineWords.reduce((sum, word) => sum + word.metadata.font.size, 0) /
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
    pageTexts: PageTexts,
    algorithm: PdfCompactLineAlgorithm = "middleY"
  ): CompactPageLines {
    const pageLines: CompactPageLines = new Map();
    const numOfPages = pageTexts.size;

    for (let i = 0; i < numOfPages; i++) {
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

  private mapWordsToCompactWords(words: PdfWord[] = []): CompactPdfWord[] {
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
    pageTexts: PageTexts,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    }
  ): boolean {
    let totalWords = 0;
    let fullText = "";
    const totalPages = pageTexts.size;

    for (let i = 0; i < totalPages; i++) {
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

    str = str.replace(/\s{2,}/g, " ");

    if (spacedLetterPattern.test(str)) {
      return str.replace(/\s/g, "");
    }

    return str?.trim();
  }

  destroy(doc: PDFDocument): void {
    return doc.destroy();
  }

  destroyPage(page: PDFPage): void {
    return page.destroy();
  }
}
