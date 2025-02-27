import { bench, run, summary } from "mitata";
import { PdfReader } from "../src/pdf-reader";

const pdfReader = new PdfReader();
const file = Bun.file("../src/assets/opposite-expectation.pdf");
const buffer = await file.arrayBuffer();

const pdf = await pdfReader.open(buffer);
const texts = await pdfReader.getTexts(pdf);

// Example benchmark
summary(() => {
  bench("pdfReader.getTexts()", async () => await pdfReader.getTexts(pdf));
  bench("pdfReader.getLinesFromTexts()", () =>
    pdfReader.getLinesFromTexts(texts)
  );
  bench("pdfReader.getCompactLinesFromTexts()", async () =>
    pdfReader.getCompactLinesFromTexts(texts)
  );
});

// Start the benchmark
run();
