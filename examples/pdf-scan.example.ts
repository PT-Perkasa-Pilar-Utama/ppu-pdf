// Bun

import { PdfReader } from "../src";

const pdfReader = new PdfReader({ verbose: false });
const file = Bun.file("./assets/opposite-expectation-scan.pdf");

const buffer = await file.arrayBuffer();
const pdf = pdfReader.open(buffer);

const canvasMap = await pdfReader.renderAll(pdf);
pdfReader.destroy(pdf);

pdfReader.dumpCanvasMap(canvasMap, "opposite-expextation-scan");
