import { PdfReader } from "./pdf-reader";

const pdfReader = new PdfReader({
  raw: false,
  excludeFooter: false,
  excludeHeader: false,
  verbose: true,
});
