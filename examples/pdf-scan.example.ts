// Bun

import { PaddleOcrService } from "ppu-paddle-ocr";
import { PdfReader } from "../src";

const file = Bun.file("./assets/opposite-expectation-scan.pdf");

const pdfReader = new PdfReader({ verbose: false });
const ocr = new PaddleOcrService();

const buffer = await file.arrayBuffer();
const pdf = pdfReader.open(buffer);

const canvasMap = await pdfReader.renderAll(pdf);
pdfReader.destroy(pdf);

pdfReader.dumpCanvasMap(canvasMap, "opposite-expextation-scan");
const texts = await pdfReader.getTextsScanned(ocr, canvasMap);
console.log("texts: ", texts.get(0));
