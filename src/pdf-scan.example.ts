// Bun

import { PdfReader } from ".";

const pdfReader = new PdfReader({ verbose: false });
const file = Bun.file("./src/assets/opposite-expectation-scan.pdf");

const buffer = await file.arrayBuffer();
const pdf = await pdfReader.open(buffer);

const canvasMap = await pdfReader.renderAll(pdf);
pdf.destroy();

// pdfReader.dumpCanvasMap(canvasMap, "opposite-expextation-scan");
