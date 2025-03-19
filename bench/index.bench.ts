import { bench, run, summary } from "mitata";
import { PdfReaderLegacy } from "../src";
import { PdfReader } from "../src/pdf-reader";

const pdfReader = new PdfReader();
const pdfReaderLegacy = new PdfReaderLegacy();

const file = Bun.file("../src/assets/opposite-expectation.pdf");
const fileScan = Bun.file("../src/assets/opposite-expectation-scan.pdf");

const buffer = await file.arrayBuffer();
const buffer2 = await file.arrayBuffer();

const pdf = pdfReader.open(buffer);
const pdfLegacy = await pdfReaderLegacy.open(buffer2);

const texts = await pdfReader.getTexts(pdf);
const textsLegacy = await pdfReaderLegacy.getTexts(pdfLegacy);

const buffer3 = await fileScan.arrayBuffer();
const buffer4 = await fileScan.arrayBuffer();

const pdfScan = pdfReader.open(buffer3);
const pdfLegacyScan = await pdfReaderLegacy.open(buffer4);

summary(() => {
  bench("pdfReader.getTexts()", async () => await pdfReader.getTexts(pdf));
  bench(
    "pdfReaderLegacy.getTexts()",
    async () => await pdfReaderLegacy.getTexts(pdfLegacy)
  );
});

summary(() => {
  bench("pdfReader.getLinesFromTexts()", () =>
    pdfReader.getLinesFromTexts(texts)
  );
  bench("pdfReaderLegacy.getLinesFromTexts()", () =>
    pdfReaderLegacy.getLinesFromTexts(textsLegacy)
  );
});

summary(() => {
  bench("pdfReader.getCompactLinesFromTexts()", () =>
    pdfReader.getCompactLinesFromTexts(texts)
  );
  bench("pdfReaderLegacy.getCompactLinesFromTexts()", () =>
    pdfReaderLegacy.getCompactLinesFromTexts(textsLegacy)
  );
});

summary(() => {
  bench("pdfReader.open()", async () =>
    pdfReader.open(await fileScan.arrayBuffer())
  );
  bench(
    "pdfReaderLegacy.open()",
    async () => await pdfReaderLegacy.open(await fileScan.arrayBuffer())
  );
});

summary(() => {
  bench("pdfReader.renderAll()", async () => pdfReader.renderAll(pdfScan));
  bench("pdfReaderLegacy.renderAll()", async () =>
    pdfReaderLegacy.renderAll(pdfLegacyScan)
  );
});

run();
