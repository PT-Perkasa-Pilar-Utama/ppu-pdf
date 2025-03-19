import { Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

/**
 * Factory class for creating and managing Node.js canvases using @napi-rs/canvas.
 */
export class NodeCanvasFactory {
  /**
   * Creates a new canvas with the specified dimensions.
   * @param width - The width of the canvas.
   * @param height - The height of the canvas.
   * @returns An object containing the created canvas and its 2D rendering context.
   */
  create(
    width: number,
    height: number
  ): { canvas: Canvas; context: SKRSContext2D } {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas,
      context,
    };
  }

  /**
   * Resets the given canvas to new dimensions.
   * @param canvasAndContext - The canvas object containing the canvas and its context.
   * @param width - The new width of the canvas.
   * @param height - The new height of the canvas.
   */
  reset(
    canvasAndContext: { canvas: Canvas; context: SKRSContext2D },
    width: number,
    height: number
  ): void {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  /**
   * Destroys the given canvas by clearing its dimensions and references.
   * @param canvasAndContext - The canvas object containing the canvas and its context.
   */
  destroy(canvasAndContext: {
    canvas: Canvas | null;
    context: SKRSContext2D | null;
  }): void {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}
