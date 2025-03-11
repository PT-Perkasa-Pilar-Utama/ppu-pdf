// import { file, write } from "bun";
// import { join } from "node:path";
import { cpToLib, exec } from "./utils";

// Get the latest pdfjs.worker
// const workerFile = await file(
//   "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
// ).text();
// await write(join("./pdf.worker.min.mjs"), workerFile);

// Get the latest mupdf-wasm.wasm
// const mupdfWasm = await file("node_modules/mupdf/dist/mupdf-wasm.wasm").text();
// await write(join("./mupdf-wasm.wasm"), mupdfWasm);

// Write required files
await Promise.all(
  [
    "./README.md",
    "./package.json",
    // "./pdf.worker.min.mjs",
    // "./mupdf-wasm.wasm",
  ].map(cpToLib)
);

// await exec`rm pdf.worker.min.mjs mupdf-wasm.wasm`;
await exec`cd lib && bun publish --access=public`;
