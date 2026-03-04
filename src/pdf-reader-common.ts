import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";

import { BasePdfReaderCommon } from "./core/base-pdf-reader-common.js";

/**
 * Node.js-specific extension of BasePdfReaderCommon.
 * Adds filesystem operations (saveCanvasToPng, dumpCanvasMap) using @napi-rs/canvas and fs.
 */
export class PdfReaderCommon extends BasePdfReaderCommon {
  async saveCanvasToPng(
    canvas: Canvas,
    filename: string,
    foldername: string,
  ): Promise<void> {
    return new Promise((res, rej) => {
      try {
        const folderPath = join(process.cwd(), foldername);
        if (!existsSync(folderPath)) {
          mkdirSync(folderPath, { recursive: true });
        }

        const newCanvas = createCanvas(canvas.width, canvas.height);
        const ctx = newCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, 0);

        const filePath = join(folderPath, filename);
        const out = createWriteStream(filePath);
        const buffer = newCanvas.toBuffer("image/png");
        out.write(buffer, (err) => {
          if (err) {
            rej(err);
          } else {
            res();
          }
        });
      } catch (error) {
        rej(error);
      }
    });
  }

  protected async dumpCanvasMapCommon(
    canvasMap: Map<number, Canvas>,
    filename: string,
    foldername = "out",
    startIndex = 0,
  ): Promise<void> {
    for (let i = startIndex; i < canvasMap.size + startIndex; i++) {
      const canvas = canvasMap.get(i);
      if (canvas) {
        await this.saveCanvasToPng(canvas, `${filename}-${i}.png`, foldername);
      }
    }
  }
}
