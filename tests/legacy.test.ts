import { describe, expect, test } from "bun:test";
import { PdfReaderLegacy } from "../src/pdf-reader-legacy";

const pdfReader = new PdfReaderLegacy();
const file = Bun.file("./src/assets/opposite-expectation.pdf");

const truthWordsFile = Bun.file(
  "./src/assets/opposite-expectation.words.legacy.json"
);
const truthWords = await truthWordsFile.json();

const truthLinesFile = Bun.file(
  "./src/assets/opposite-expectation.lines.legacy.json"
);
const truthLines = await truthLinesFile.json();

const buffer = await file.arrayBuffer();
const pdf = await pdfReader.open(buffer);

describe("open", () => {
  test("should open a PDF and have a positive number of pages", () => {
    expect(pdf.numPages).toBeGreaterThan(0);
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
});
