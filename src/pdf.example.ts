// Bun

import { PdfReader } from ".";

const pdfReader = new PdfReader({ verbose: false });
const file = Bun.file("./src/assets/opposite-expectation.pdf");

const buffer = await file.arrayBuffer();
const pdf = await pdfReader.open(buffer);

const texts = await pdfReader.getTexts(pdf);
console.log("texts: ", texts.get(1));

const lines = pdfReader.getLinesFromTexts(texts);
console.log("lines: ", lines.get(1));

const isScanned = pdfReader.isScanned(texts);
console.log("is pdf scanned: ", isScanned);
