import { file, write } from "bun";
import { join } from "node:path";
import { cpToLib, exec } from "./utils";

// Get the latest pdfjs.worker
const workerFile = await file(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
).text();
await write(join("./pdf.worker.min.mjs"), workerFile);

// Write required files
await Promise.all(["./README.md", "./package.json"].map(cpToLib));

await exec`cd lib && bun publish --access=public`;
