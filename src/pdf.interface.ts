import type { Canvas } from "canvas";

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

export interface PdfMetadataLegacy {
  direction: "ltr" | "rtl";
  fontName: string;
  fontSize: number;
  hasEOL: boolean;
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

export interface PdfWordLegacy {
  text: string;
  bbox: PdfBbox;
  dimension: PdfDimension;
  metadata: PdfMetadataLegacy;
}

export interface PdfTexts {
  words: PdfWord[];
}

export interface PdfTextsLegacy {
  words: PdfWordLegacy[];
  lang: string;
}

export interface PdfLine {
  text: string;
  bbox: PdfBbox;
  dimension: PdfDimension;
  averageFontSize: number;
  words: PdfWord[];
}

export interface PdfLineLegacy {
  text: string;
  bbox: PdfBbox;
  dimension: PdfDimension;
  averageFontSize: number;
  words: PdfWordLegacy[];
}

export type PageTexts = Map<number, PdfTexts>;
export type PageTextsLegacy = Map<number, PdfTextsLegacy>;
export type PageLines = Map<number, PdfLine[]>;
export type PageLinesLegacy = Map<number, PdfLineLegacy[]>;

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
  toStructuredTextArgs?: string;
}

export type PdfCompactLineAlgorithm = "middleY" | "y0";

export interface PdfScannedThreshold {
  wordsPerPage: number;
  textLength: number;
}

export type CanvasMap = Map<number, Canvas>;
