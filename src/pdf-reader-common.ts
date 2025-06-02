import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";

import { CONSTANT } from "./pdf.constant";
import {
  type CompactPageLines,
  type CompactPdfLine,
  type CompactPdfWord,
  type PageLines,
  type PageTexts,
  type PdfCompactLineAlgorithm,
  type PdfLine,
  type PdfScannedThreshold,
  type PdfWord,
} from "./pdf.interface";

export class PdfReaderCommon {
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
        const buffer = newCanvas.toBuffer("image/png");
        out.write(buffer, (err) => {
          if (err) {
            rej(err);
          } else {
            res();
          }
        });
      } catch (error) {
        rej(error);
      }
    });
  }

  protected async dumpCanvasMapCommon(
    canvasMap: Map<number, Canvas>,
    filename: string,
    foldername = "out",
    startIndex = 0
  ): Promise<void> {
    for (let i = startIndex; i < canvasMap.size + startIndex; i++) {
      const canvas = canvasMap.get(i);
      if (canvas) {
        await this.saveCanvasToPng(canvas, `${filename}-${i}.png`, foldername);
      }
    }
  }

  protected sortTextContent(texts: PdfWord[]): PdfWord[] {
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

  protected sortTextContentSimple(texts: PdfWord[]): PdfWord[] {
    return texts.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  }

  protected getLinesFromTextsCommon(
    pageTexts: PageTexts,
    startIndex = 0
  ): PageLines {
    const pageLines: PageLines = new Map();
    const numOfPages = pageTexts.size;

    for (let i = startIndex; i < numOfPages + startIndex; i++) {
      const pdfText = pageTexts.get(i);
      let lines: PdfLine[] = [];
      if (pdfText) {
        lines = this.getLines(pdfText.words);
      }
      pageLines.set(i, lines);
    }

    return pageLines;
  }

  protected getLines(words: PdfWord[] = []): PdfLine[] {
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

  protected mergeLines(lines: PdfWord[][]): PdfLine[] {
    return lines.map((lineWords) => {
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
  }

  protected getCompactLines(words: CompactPdfWord[] = []): CompactPdfLine[] {
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

  protected mergeCompactLines(lines: CompactPdfWord[][]): CompactPdfLine[] {
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

  protected getCompactLinesOldAlgorithm(
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

  protected mergeCompactLinesOldAlgorithm(
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

  getCompactLinesFromTextsCommon(
    pageTexts: PageTexts,
    algorithm: PdfCompactLineAlgorithm = "middleY",
    startIndex = 0
  ): CompactPageLines {
    const pageLines: CompactPageLines = new Map();
    const numOfPages = pageTexts.size;

    for (let i = startIndex; i < numOfPages + startIndex; i++) {
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

  protected mapWordsToCompactWords(words: PdfWord[] = []): CompactPdfWord[] {
    return words.map((word) => ({ text: word.text, bbox: word.bbox }));
  }

  protected isScannedCommon(
    pageTexts: PageTexts,
    options: PdfScannedThreshold = {
      wordsPerPage: CONSTANT.WORDS_PER_PAGE_THRESHOLD,
      textLength: CONSTANT.TEXT_LENGTH_THRESHOLD,
    },
    startIndex = 0
  ): boolean {
    let totalWords = 0;
    let fullText = "";

    const totalPages = pageTexts.size;

    for (let i = startIndex; i < totalPages + startIndex; i++) {
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

  protected normalizedText(str: string): string {
    const spacedLetterPattern = /^([A-Z]\s)+[A-Z]$/;
    str = str.replace(/  +/g, " ");

    if (spacedLetterPattern.test(str)) {
      str = str.replace(/\s/g, "");
    }

    str = this.removeDuplicates(str);
    return str?.trim();
  }

  protected removeDuplicates(text: string): string {
    text = text.replace(/\s+/g, " ").trim();
    if (!text) return text;

    const words = text.split(" ").filter((word) => word.length > 0);
    const newString = [];

    const wordLength = words.length;
    let repetitionCount = 0;

    for (const word of words) {
      if (word.length < 3) return text;

      const threeLetters = word.substring(0, 3);
      const restOfWord = word.substring(3);
      const patternIndex = restOfWord.indexOf(threeLetters);

      if (patternIndex === -1) return text;
      const checkPattern = word.substring(0, 3 + patternIndex);
      if (!this.isWordRepeatedPattern(word, checkPattern)) return text;

      newString.push(checkPattern);
      repetitionCount++;
    }

    if (wordLength !== repetitionCount) return text;
    return newString.join(" ");
  }

  protected isWordRepeatedPattern(word: string, pattern: string): boolean {
    if (word.length < pattern.length * 2) return false;
    if (!word.startsWith(pattern + pattern)) return false;

    let pos = 0;
    while (pos < word.length) {
      const remainingLength = word.length - pos;
      if (remainingLength >= pattern.length) {
        if (word.substring(pos, pos + pattern.length) === pattern) {
          pos += pattern.length;
        } else {
          const remaining = word.substring(pos);
          if (pattern.startsWith(remaining)) break;
          return false;
        }
      } else {
        const remaining = word.substring(pos);
        return pattern.startsWith(remaining);
      }
    }

    return true;
  }
}
