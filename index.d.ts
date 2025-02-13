import type { PDFDocumentProxy } from "pdfjs-dist";
import type {
  PageLines,
  PageTexts,
  PdfReaderOptions,
  PdfScannedThreshold,
} from "./src/pdf.interface";

export { PageLines, PageTexts, PdfReaderOptions, PdfScannedThreshold };

export declare class PdfReader {
  /**
   * Creates an instance of PdfReader.
   * @param options - Partial options to override the defaults.
   */
  constructor(options?: Partial<PdfReaderOptions>);

  /**
   * Opens a PDF document.
   * @param filename - The path to the PDF file or an ArrayBuffer.
   * @returns A promise that resolves with the PDFDocumentProxy.
   */
  open(filename: string | ArrayBuffer): Promise<PDFDocumentProxy>;

  /**
   * Extracts the text content from the PDF document.
   * @param pdf - The PDFDocumentProxy instance.
   * @returns A promise that resolves with the texts mapped by page number.
   */
  getTexts(pdf: PDFDocumentProxy): Promise<PageTexts>;

  /**
   * Retrieves line information from the page texts.
   * @param pageTexts - The map of page texts.
   * @returns A map of page numbers to their corresponding PdfLine arrays.
   */
  getLinesFromTexts(pageTexts: PageTexts): PageLines;

  /**
   * Determines whether the PDF appears to be a scanned document.
   * @param pageTexts - The map of page texts.
   * @param options - Optional thresholds for scanned detection.
   * @returns True if the PDF is considered scanned; otherwise, false.
   */
  isScanned(pageTexts: PageTexts, options?: PdfScannedThreshold): boolean;
}
