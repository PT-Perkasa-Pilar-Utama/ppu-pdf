/**
 * Interface defining platform-specific canvas operations.
 * Implementations handle differences between Node.js (native canvas) and browser (DOM Canvas) environments.
 */
export interface CanvasLike {
  width: number;
  height: number;
}

/**
 * A generic 2D rendering context compatible with both Node.js and browser canvas implementations.
 */
export interface ContextLike {
  drawImage(image: CanvasLike, dx: number, dy: number): void;
  putImageData(imageData: unknown, dx: number, dy: number): void;
}

/**
 * Result of creating a canvas via a PlatformProvider.
 */
export interface CanvasAndContext<
  TCanvas extends CanvasLike = CanvasLike,
  TContext extends ContextLike = ContextLike,
> {
  canvas: TCanvas;
  context: TContext;
}

/**
 * Interface for platform-specific operations.
 * Abstracts canvas creation and destruction for Node.js and browser environments.
 */
export interface PlatformProvider<
  TCanvas extends CanvasLike = CanvasLike,
  TContext extends ContextLike = ContextLike,
> {
  /** Creates a new canvas with the specified dimensions. */
  createCanvas(
    width: number,
    height: number,
  ): CanvasAndContext<TCanvas, TContext>;

  /** Resets a canvas to new dimensions. */
  resetCanvas(
    canvasAndContext: CanvasAndContext<TCanvas, TContext>,
    width: number,
    height: number,
  ): void;

  /** Destroys/cleans up a canvas. */
  destroyCanvas(canvasAndContext: {
    canvas: TCanvas | null;
    context: TContext | null;
  }): void;
}
