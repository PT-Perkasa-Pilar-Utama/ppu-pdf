import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { PaddleOcrService } from "ppu-paddle-ocr";
import { PdfReaderLegacy } from "../src/pdf-reader-legacy.js";

const pdfReader = new PdfReaderLegacy();
const file = Bun.file("./assets/opposite-expectation.pdf");
const fileScan = Bun.file("./assets/opposite-expectation-scan.pdf");

const truthWordsFile = Bun.file(
  "./assets/opposite-expectation.words.legacy.json"
);
const truthWords = await truthWordsFile.json();

const truthLinesFile = Bun.file(
  "./assets/opposite-expectation.lines.legacy.json"
);
const truthLines = await truthLinesFile.json();

const buffer = await file.arrayBuffer();
const scanBuffer = await fileScan.arrayBuffer();

const pdf = await pdfReader.open(buffer);
const pdfScan = await pdfReader.open(scanBuffer);

describe("open", () => {
  test("should open a PDF and have a positive number of pages", () => {
    expect(pdf.numPages).toBeGreaterThan(0);
  });
  test("should open a PDF Scanned and have a positive number of pages", () => {
    expect(pdfScan.numPages).toBeGreaterThan(0);
  });
});

describe("getTexts", () => {
  test("should extract text content matching expected truth words", async () => {
    const texts = await pdfReader.getTexts(pdf);
    expect(texts.size).toBeGreaterThan(0);

    const page1Texts = texts.get(1);
    expect(page1Texts).toBeDefined();
    expect(page1Texts!.words.length).toEqual(truthWords["1"].words.length);

    const extractedWords = page1Texts!.words.map((word) => word.text);
    const expectedWords = truthWords["1"].words.map((w: any) => w.text);
    expect(extractedWords).toEqual(expectedWords);
  });
});

describe("getTextsScanned", () => {
  test("should extract text from scanned pdf matching expected truth words", async () => {
    const ocr = new PaddleOcrService();
    const canvasMap = await pdfReader.renderAll(pdfScan);
    const texts = await pdfReader.getTextsScanned(ocr, canvasMap);
    expect(texts.size).toBeGreaterThan(0);

    const page1Texts = texts.get(1);
    expect(page1Texts).toBeDefined();
    expect(page1Texts!.words.length).toEqual(truthWords["1"].words.length);

    await ocr.destroy();
  });
});

describe("getLinesFromTexts", () => {
  test("should produce lines that match expected truth lines", async () => {
    const texts = await pdfReader.getTexts(pdf);
    const lines = pdfReader.getLinesFromTexts(texts);
    expect(lines.size).toBeGreaterThan(0);

    const page1Lines = lines.get(1);
    expect(page1Lines).toBeDefined();
    expect(page1Lines!.length).toEqual(truthLines["1"].length);

    const extractedLinesText = page1Lines!.map((line) => line.text);
    const expectedLinesText = truthLines["1"].map((line: any) => line.text);
    expect(extractedLinesText).toEqual(expectedLinesText);
  });
});

describe("isScanned", () => {
  test("should correctly detect that the PDF is not scanned", async () => {
    const texts = await pdfReader.getTexts(pdf);
    const scanned = pdfReader.isScanned(texts);
    expect(scanned).toBe(false);
  });

  test("should correctly detect that the page 1 is a scanned", async () => {
    const texts = await pdfReader.getTexts(pdfScan);
    const page1FullText = texts.get(pdfReader.startIndex)?.fullText || "";
    const scanned = pdfReader.isPageScanned(page1FullText);
    expect(scanned).toBe(true);
  });
});

describe("renderAll", () => {
  test("should render a pngs in out folder", async () => {
    const canvasMap = await pdfReader.renderAll(pdfScan);
    expect(canvasMap.size).toBeGreaterThan(0);

    const files = readdirSync("out");
    for (const f of files) {
      unlinkSync(`./out/${f}`);
    }

    await pdfReader.dumpCanvasMap(canvasMap, "pdfreaderlegacy-scan-test");
    const filePath = join(
      __dirname,
      "..",
      "out",
      "pdfreaderlegacy-scan-test-1.png"
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    const isFileExist = existsSync(filePath);
    expect(isFileExist).toBe(true);
  });
});

afterAll(() => {
  pdfReader.destroy(pdf);
  pdfReader.destroy(pdfScan);
});
