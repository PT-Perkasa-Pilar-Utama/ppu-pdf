/**
 * Represents a rectangular bounding box in a document.
 */
interface BoundingBox {
  /** The x-coordinate of the top-left corner. */
  x: number;

  /** The y-coordinate of the top-left corner. */
  y: number;

  /** The width of the bounding box. */
  w: number;

  /** The height of the bounding box. */
  h: number;
}

/**
 * Represents font information for a text element.
 */
interface Font {
  /** The full name of the font. */
  name: string;

  /** The font family, such as "Arial" or "Times New Roman". */
  family: string;

  /** The font weight, either "normal" or "bold". */
  weight: "normal" | "bold";

  /** The font style, either "normal" or "italic". */
  style: "normal" | "italic";

  /** The font size in points. */
  size: number;
}

/**
 * Represents a single line of text in a document.
 */
interface Line {
  /** Writing mode (0 for horizontal, 1 for vertical). */
  wmode: number;

  /** The bounding box of the text line. */
  bbox: BoundingBox;

  /** The font used in this text line. */
  font: Font;

  /** The x-coordinate of the text baseline. */
  x: number;

  /** The y-coordinate of the text baseline. */
  y: number;

  /** The extracted text content of the line. */
  text: string;
}

/**
 * Represents a block of text within a document.
 */
interface Block {
  /** The type of block, currently only supports "text". */
  type: "text";

  /** The bounding box of the block. */
  bbox: BoundingBox;

  /** The lines of text contained in this block. */
  lines: Line[];
}

/**
 * Represents the structure of a document as extracted by MuPDF.
 */
export interface DocumentStructure {
  /** The detected blocks of text within the document. */
  blocks: Block[];
}
