import { Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

export class NodeCanvasFactory {
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

  reset(canvasAndContext: any, width: number, height: number): void {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any): void {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}
