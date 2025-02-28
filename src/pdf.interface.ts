export interface PdfToken {
  str: string;
  dir: "ltr" | "rtl";
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
}

export interface PdfBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PdfMetadata {
  writing: "horizontal" | "vertical";
  font: {
    name: string;
    family: string;
    weight: "normal" | "bold";
    style: "normal" | "italic";
    size: number;
  };
  pageNum: number;
}

export interface PdfDimension {
  width: number;
  height: number;
}

export interface PdfWord {
  text: string;
  bbox: PdfBbox;
  dimension: PdfDimension;
  metadata: PdfMetadata;
}

export interface PdfTexts {
  words: PdfWord[];
}

export interface PdfLine {
  text: string;
  bbox: PdfBbox;
  dimension: PdfDimension;
  averageFontSize: number;
  words: PdfWord[];
}

export type PageTexts = Map<number, PdfTexts>;
export type PageLines = Map<number, PdfLine[]>;

export interface CompactPdfWord {
  text: string;
  bbox: PdfBbox;
}

export interface CompactPdfLine {
  text: string;
  bbox: PdfBbox;
  words: CompactPdfWord[];
}

export type CompactPageLines = Map<number, CompactPdfLine[]>;

export interface PdfFont {
  path: string[];
  family: string;
  size?: number;
  fallback?: string;
  style?: string;
  weight?: string;
}

export interface PdfReaderOptions {
  verbose?: boolean;
  excludeFooter?: boolean;
  excludeHeader?: boolean;
  raw?: boolean;
  headerFromHeightPercentage?: number;
  footerFromHeightPercentage?: number;
  mergeCloseTextNeighbor?: boolean;
  simpleSortAlgorithm?: boolean;
  scale?: number;
}

export type PdfCompactLineAlgorithm = "middleY" | "y0";

export interface PdfScannedThreshold {
  wordsPerPage: number;
  textLength: number;
}
