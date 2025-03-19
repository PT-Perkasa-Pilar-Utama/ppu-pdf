import type { PdfReaderOptions } from "./pdf.interface";

export const CONSTANT = {
  WORDS_PER_PAGE_THRESHOLD: 30,
  TEXT_LENGTH_THRESHOLD: 300,
  HEADER_FROM_HEIGHT_PERCENTAGE: 0.02,
  FOOTER_FROM_HEIGHT_PERCENTAGE: 0.95,
};

export const PDF_READER_DEFAULT_OPTIONS: PdfReaderOptions = {
  verbose: false,
  excludeFooter: true,
  excludeHeader: true,
  raw: false,
  headerFromHeightPercentage: CONSTANT.HEADER_FROM_HEIGHT_PERCENTAGE,
  footerFromHeightPercentage: CONSTANT.FOOTER_FROM_HEIGHT_PERCENTAGE,
  mergeCloseTextNeighbor: true,
  simpleSortAlgorithm: false,
  scale: 1,
  fonts: [],
};
