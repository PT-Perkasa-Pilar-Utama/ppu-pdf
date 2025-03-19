/**
 * Represents a token extracted from a PDF using pdf.js.
 */
export interface PdfToken {
  /** The extracted text content of the token. */
  str: string;

  /** The text direction, either left-to-right ("ltr") or right-to-left ("rtl"). */
  dir: "ltr" | "rtl";

  /** The width of the token in PDF units. */
  width: number;

  /** The height of the token in PDF units. */
  height: number;

  /**
   * The transformation matrix applied to the token.
   * It follows the standard 6-element array representation:
   * [a, b, c, d, e, f] for a 2D transformation.
   */
  transform: number[];

  /** The name of the font used for this token. */
  fontName: string;

  /** Indicates whether this token marks the end of a line. */
  hasEOL: boolean;
}
