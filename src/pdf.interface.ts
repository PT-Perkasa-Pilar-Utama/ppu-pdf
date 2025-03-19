import type { Canvas } from "@napi-rs/canvas";

/**
 * Represents a bounding box in a PDF document.
 */
export interface PdfBbox {
  /** The x-coordinate of the top-left corner. */
  x0: number;

  /** The y-coordinate of the top-left corner. */
  y0: number;

  /** The x-coordinate of the bottom-right corner. */
  x1: number;

  /** The y-coordinate of the bottom-right corner. */
  y1: number;
}

/**
 * Metadata associated with a PDF text element.
 */
export interface PdfMetadata {
  /** Writing orientation: horizontal, vertical, or unknown. */
  writing: "horizontal" | "vertical" | "";

  /** Text direction: left-to-right (ltr), right-to-left (rtl), or unknown. */
  direction: "ltr" | "rtl" | "";

  /** Font details. */
  font: {
    /** Font name. */
    name: string;

    /** Font size. */
    size: number;

    /** Font family, or empty string if unknown. */
    family: string | "";

    /** Font weight: normal, bold, or unknown. */
    weight: "normal" | "bold" | "";

    /** Font style: normal, italic, or unknown. */
    style: "normal" | "italic" | "";
  };

  /** Indicates if this element is at the end of a line. */
  hasEOL: boolean;

  /** The page number where this element appears. */
  pageNum: number;
}

/**
 * Represents the width and height of a PDF element.
 */
export interface PdfDimension {
  /** The width of the element. */
  width: number;

  /** The height of the element. */
  height: number;
}

/**
 * Represents a single word extracted from a PDF.
 */
export interface PdfWord {
  /** The extracted text. */
  text: string;

  /** The bounding box of the word. */
  bbox: PdfBbox;

  /** The dimensions of the word. */
  dimension: PdfDimension;

  /** Additional metadata about the word. */
  metadata: PdfMetadata;
}

/**
 * Represents all words extracted from a page.
 */
export interface PdfTexts {
  /** List of extracted words. */
  words: PdfWord[];
}

/**
 * Represents a single line of text in a PDF.
 */
export interface PdfLine {
  /** The extracted text content of the line. */
  text: string;

  /** The bounding box of the line. */
  bbox: PdfBbox;

  /** The dimensions of the line. */
  dimension: PdfDimension;

  /** The average font size of the text in this line. */
  averageFontSize: number;

  /** The words that make up this line. */
  words: PdfWord[];
}

/**
 * Represents a mapping of page numbers to their corresponding extracted texts.
 */
export type PageTexts = Map<number, PdfTexts>;

/**
 * Represents a mapping of page numbers to their corresponding extracted lines.
 */
export type PageLines = Map<number, PdfLine[]>;

/**
 * Represents a compact version of a PDF word with only text and bounding box.
 */
export interface CompactPdfWord {
  /** The extracted text. */
  text: string;

  /** The bounding box of the word. */
  bbox: PdfBbox;
}

/**
 * Represents a compact version of a PDF line with only text, bounding box, and words.
 */
export interface CompactPdfLine {
  /** The extracted text content of the line. */
  text: string;

  /** The bounding box of the line. */
  bbox: PdfBbox;

  /** The words that make up this line in a compact format. */
  words: CompactPdfWord[];
}

/**
 * Represents a mapping of page numbers to their corresponding compact extracted lines.
 */
export type CompactPageLines = Map<number, CompactPdfLine[]>;

/**
 * Algorithm types for compacting PDF lines.
 */
export type PdfCompactLineAlgorithm = "middleY" | "y0";

/**
 * Represents a font used in the PDF.
 */
export interface PdfFont {
  /** The file path of the font. */
  path: string;

  /** The name of the font. */
  name: string;
}

/**
 * Options for configuring the PDF reader.
 */
export interface PdfReaderOptions {
  /** Enable verbose logging. */
  verbose?: boolean;

  /** Exclude footer text from extraction. */
  excludeFooter?: boolean;

  /** Exclude header text from extraction. */
  excludeHeader?: boolean;

  /** Extract raw text without additional processing. */
  raw?: boolean;

  /** Height percentage threshold for detecting headers. */
  headerFromHeightPercentage?: number;

  /** Height percentage threshold for detecting footers. */
  footerFromHeightPercentage?: number;

  /** Merge text elements that are close to each other. */
  mergeCloseTextNeighbor?: boolean;

  /** Use a simpler sorting algorithm for text layout. */
  simpleSortAlgorithm?: boolean;

  /** Scaling factor for text positioning adjustments. */
  scale?: number;

  /** List of fonts used in the document. */
  fonts: PdfFont[];
}

/**
 * Represents thresholds for determining whether a PDF is scanned.
 */
export interface PdfScannedThreshold {
  /** Minimum number of words per page. */
  wordsPerPage: number;

  /** Minimum text length per page. */
  textLength: number;
}

/**
 * Represents a mapping of page numbers to their corresponding canvas elements.
 */
export type CanvasMap = Map<number, Canvas>;
