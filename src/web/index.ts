/** @module Web/browser entrypoint for ppu-pdf.
 *
 * Use `import { PdfReaderLegacyWeb } from "ppu-pdf/web"` to access the browser-compatible
 * PDF reader powered by pdfjs-dist. Supports text extraction, line grouping, compact lines,
 * TOON format, scanned PDF detection, page rendering, and scanned PDF OCR (via ppu-paddle-ocr/web).
 *
 * @example
 * ```ts
 * import { PdfReaderLegacyWeb } from "ppu-pdf/web";
 *
 * const reader = new PdfReaderLegacyWeb();
 * const response = await fetch("document.pdf");
 * const pdf = await reader.open(await response.arrayBuffer());
 * const texts = await reader.getTexts(pdf);
 * console.log(texts.get(1)?.fullText);
 * await reader.destroy(pdf);
 * ```
 */

export {
  PdfReaderLegacyWeb,
  type WebCanvasMap,
} from "./pdf-reader-legacy.web.js";

export { CONSTANT, PDF_READER_DEFAULT_OPTIONS } from "../pdf.constant.js";

export type {
  CompactPageLines,
  CompactPdfLine,
  CompactPdfWord,
  PageLines,
  PageTexts,
  PdfBbox,
  PdfCompactLineAlgorithm,
  PdfDimension,
  PdfFont,
  PdfLine,
  PdfMetadata,
  PdfReaderOptions,
  PdfScannedThreshold,
  PdfTexts,
  PdfWord,
} from "../pdf.interface.js";

export type { PdfToken } from "../pdfjs.interface.js";
