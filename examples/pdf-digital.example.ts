// Bun

import { PdfReader } from "../src";

const pdfReader = new PdfReader({ verbose: false, enableToon: true });
const file = Bun.file("./assets/opposite-expectation.pdf");

const buffer = await file.arrayBuffer();
const pdf = pdfReader.open(buffer);

const texts = await pdfReader.getTexts(pdf);
console.log("texts: ", texts.get(0));

pdfReader.destroy(pdf);

const lines = pdfReader.getLinesFromTexts(texts);
console.log("lines: ", lines.get(0));

const linesInToon = pdfReader.getLinesFromTextsInToon(texts);
console.log("lines in toon: ", linesInToon);

const isScanned = pdfReader.isScanned(texts);
console.log("is pdf scanned: ", isScanned);
