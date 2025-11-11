import type { PdfReaderOptions } from "./pdf.interface";

/**
 * A collection of constant values used for PDF processing thresholds.
 */
export const CONSTANT = {
  /** Minimum number of words per page to consider a page as containing text. */
  WORDS_PER_PAGE_THRESHOLD: 30,

  /** Minimum text length per page to consider it as containing content. */
  TEXT_LENGTH_THRESHOLD: 300,

  /** Height percentage from the top of the page used to detect headers. */
  HEADER_FROM_HEIGHT_PERCENTAGE: 0.02,

  /** Height percentage from the bottom of the page used to detect footers. */
  FOOTER_FROM_HEIGHT_PERCENTAGE: 0.95,
};

/**
 * Default options for configuring the PDF reader.
 */
export const PDF_READER_DEFAULT_OPTIONS: PdfReaderOptions = {
  /** Enable or disable verbose logging. */
  verbose: false,

  /** Exclude footer text during extraction. */
  excludeFooter: true,

  /** Exclude header text during extraction. */
  excludeHeader: true,

  /** Extract raw text without additional formatting. */
  raw: false,

  /** Height percentage threshold for detecting headers. */
  headerFromHeightPercentage: CONSTANT.HEADER_FROM_HEIGHT_PERCENTAGE,

  /** Height percentage threshold for detecting footers. */
  footerFromHeightPercentage: CONSTANT.FOOTER_FROM_HEIGHT_PERCENTAGE,

  /** Merge text elements that are close together. */
  mergeCloseTextNeighbor: true,

  /** Use a simpler sorting algorithm for text layout processing. */
  simpleSortAlgorithm: false,

  /** Scaling factor for text positioning adjustments. */
  scale: 1,

  /** List of fonts to be used in the document. */
  fonts: [],

  /** Whether to turn on/off toon notation format extraction for LLM-friendly text */
  enableToon: false,
};
