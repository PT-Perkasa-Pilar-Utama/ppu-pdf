# ppu-pdf

Easily extract text from digital PDF and Scanned PDF files with coordinate and font size included, and optionally group text by lines or render scanned pdf to canvas/png.

There are two class of `PdfReader` (uses mupdfjs) and `PdfReaderLegacy` uses (pdfjs-dist).

> **[Live Demo →](https://pt-perkasa-pilar-utama.github.io/ppu-pdf/)**


## Features

- **Text Extraction:** Retrieve all text content from a PDF.
- **LLM-Friendly Text Extraction:** Retrieve all text content while maintaining bbox and encode in Token Object Notation (TOON).
- **Coordinate Data:** Get precise bounding box and dimension information for each text element.
- **Line Grouping:** Merge individual text tokens into coherent lines.
- **Scanned PDF Detection:** Determine if a PDF/individual page appears to be scanned or digitally generated.
- **Scanned PDF Canvas Rendering:** Convert scanned pdf per page into a ready to processed canvas.
- **Scanned PDF to PNG Images:** Convert and write all pdf pages to PNG images.
- **Scanned PDF Text Extraction:** Retrieve all text content from a scanned PDF using `ppu-paddle-ocr`.

## Differences

| Indicator                           | PdfReader | PdfReaderLegacy |
| ----------------------------------- | --------- | --------------- |
| Library                             | mupdfjs   | pdfjs-dist      |
| Pages index start                   | 0         | 1               |
| open()                              | ✅        | ✅              |
| getTexts()                          | ✅        | ✅              |
| getTextsScanned()                   | ✅        | ✅              |
| isScanned()                         | ✅        | ✅              |
| isPageScanned()                     | ✅        | ✅              |
| getLinesFromTexts()                 | ✅        | ✅              |
| getCompactLinesFromTexts()          | ✅        | ✅              |
| destroy()                           | ✅        | ✅              |
| destroyPage()                       | ✅        | ❌              |
| renderAll()                         | ✅        | ✅              |
| saveCanvasToPng()                   | ✅        | ✅              |
| dumpCanvasMap()                     | ✅        | ✅              |
| Resize viewport/Custom DPI          | ✅        | ✅              |
| pdfReader.getLinesFromTextsInToon() | ✅        | ✅              |

## Benchmark

Both digital pdf and scanned pdf with a total 28 pages.

```sh
clk: ~4.02 GHz
cpu: 11th Gen Intel(R) Core(TM) i5-11400H @ 2.70GHz
runtime: bun 1.2.5 (x64-linux)

benchmark                                 avg (min … max) p75 / p99    (min … top 1%)
--------------------------------------------------------- -------------------------------
pdfReader.getTexts()                       461.74 ms/iter 459.53 ms    █
                                  (436.19 ms … 524.12 ms) 513.69 ms   ███
                                  (  2.29 mb … 107.16 mb)  27.86 mb █▁███▁█▁█▁▁▁▁▁▁▁▁▁▁▁█

pdfReaderLegacy.getTexts()                 217.58 ms/iter 233.21 ms   █
                                  (196.63 ms … 238.71 ms) 236.38 ms   █               ▅
                                  (  1.58 mb … 118.27 mb)  40.84 mb ▇▁█▁▁▁▇▁▁▁▁▁▁▁▁▁▇▁█▇▇

summary
  pdfReaderLegacy.getTexts()
   2.12x faster than pdfReader.getTexts()

--------------------------------------------------------- -------------------------------
pdfReader.getLinesFromTexts()                3.82 ms/iter   3.91 ms   ▆    █
                                      (3.52 ms … 4.95 ms)   4.53 ms  ▇█ ▂ ▄█▆
                                  (  0.00  b …   1.29 mb) 590.91 kb ▅██▇█▂███▇▅▃▂▂▂▁▂▂▂▂▂

pdfReaderLegacy.getLinesFromTexts()          4.77 ms/iter   4.87 ms  █▄  ▄▅▅
                                      (4.41 ms … 5.66 ms)   5.52 ms  ██▂ ███▅
                                  (  0.00  b …   1.29 mb) 647.72 kb ████▇████▆▇▆█▂▂▄▄▅▂▁▄

summary
  pdfReader.getLinesFromTexts()
   1.25x faster than pdfReaderLegacy.getLinesFromTexts()

--------------------------------------------------------- -------------------------------
pdfReader.getCompactLinesFromTexts()         3.87 ms/iter   3.98 ms  ▂█     ▄▃▂
                                      (3.57 ms … 4.60 ms)   4.40 ms  ██▃▂   ███▄▂
                                  (  0.00  b …   2.06 mb) 920.63 kb ▇█████▃▇█████▄▄▄▃▄▃▁▂

pdfReaderLegacy.getCompactLinesFromTexts()   4.62 ms/iter   4.71 ms  ▃▂   █▂
                                      (4.27 ms … 5.59 ms)   5.52 ms  ██  ▆██
                                  (  0.00  b …   1.55 mb) 876.22 kb ▆██▇▆███▇█▅▂▅▄▂▂▁▂▁▁▂

summary
  pdfReader.getCompactLinesFromTexts()
   1.19x faster than pdfReaderLegacy.getCompactLinesFromTexts()

--------------------------------------------------------- -------------------------------
pdfReader.open()                            14.30 ms/iter  19.97 ms █▄
                                     (8.56 ms … 31.51 ms)  27.49 ms ██
                                  (  0.00  b …  58.52 mb)  19.89 mb ██▅▁▃▃▁▃▇▁▃▁▅▁▇█▁▅▁▁▃

pdfReaderLegacy.open()                       6.19 ms/iter   6.51 ms  █
                                     (5.11 ms … 13.27 ms)  10.40 ms  ██▂ ▂
                                  (  0.00  b …  29.13 mb) 682.14 kb ██████▅▄▃▁▃▁▄▃▁▂▁▁▁▁▂

summary
  pdfReaderLegacy.open()
   2.31x faster than pdfReader.open()

--------------------------------------------------------- -------------------------------
pdfReader.renderAll()                         1.10 s/iter    1.12 s                     █
                                        (1.05 s … 1.13 s)    1.12 s █                 █ █
                                  ( 66.35 mb … 248.17 mb) 191.68 mb █▁▁▁▁▁▁▁▁██▁▁▁█▁▁▁███

pdfReaderLegacy.renderAll()                   1.68 s/iter    1.70 s             █
                                        (1.56 s … 1.84 s)    1.77 s ▅ ▅▅    ▅▅ ▅█▅ ▅    ▅
                                  (231.91 mb … 384.77 mb) 352.18 mb █▁██▁▁▁▁██▁███▁█▁▁▁▁█

summary
  pdfReader.renderAll()
   1.52x faster than pdfReaderLegacy.renderAll()
```

## Installation

Using Bun is recommended

Install the package via npm:

```bash
npm install ppu-pdf ppu-paddle-ocr
```

Or using Yarn:

```bash
yarn add ppu-pdf ppu-paddle-ocr
```

Bun:

```bash
bun add ppu-pdf ppu-paddle-ocr
```

You can opt-out `ppu-paddle-ocr` if you are planning on not extracting text from scanned pdf.

## Usage

Below is an example of how to use the library with Bun.

Digital PDF Example:

```ts
import { PdfReader } from "ppu-pdf";

const pdfReader = new PdfReader({ verbose: false });
const file = Bun.file("./assets/opposite-expectation.pdf");

const buffer = await file.arrayBuffer();
const pdf = pdfReader.open(buffer);

// remember it's a map
const texts = await pdfReader.getTexts(pdf);
const page0texts = texts.get(0);
console.log("texts: ", page0texts);

pdfReader.destroy(pdf);

const isScanned = pdfReader.isScanned(texts);
console.log("is pdf scanned: ", isScanned);
```

Scanned PDF Example:

```ts
import { join } from "path";
import { PdfReader } from "ppu-pdf";
import { PaddleOcrService } from "ppu-paddle-ocr";

const fonts = [
  {
    path: join(__dirname, "..", "fonts", "Arial.ttf"),
    name: "Arial",
  },
];

const pdfReader = new PdfReader({ verbose: false, fonts: fonts });
const ocr = new PaddleOcrService();

const fileScan = Bun.file("./assets/opposite-expectation-scan.pdf");
const bufferScan = await fileScan.arrayBuffer();

const pdfScan = pdfReader.open(bufferScan);
const canvasMap = await pdfReader.renderAll(pdfScan);
pdfReader.destroy(pdfScan); // Destroy early since we already hold the canvases

pdfReader.dumpCanvasMap(canvasMap, "my-dumped-pdf");
const texts = await pdfReader.getTextsScanned(ocr, canvasMap);
console.log("texts: ", texts.get(0));
```

### Rebuilding a Scanned PDF into a Searchable PDF

You can rebuild a scanned (flattened) PDF, turning it into a fully searchable document by overlaying the invisible recognized text on top of the original images. For a complete script, refer to `examples/rebuild-pdf.example.ts`.

```ts
import { PdfReader } from "ppu-pdf";
import { PaddleOcrService } from "ppu-paddle-ocr";

const pdfReader = new PdfReader({ verbose: false });
const ocr = new PaddleOcrService();
await ocr.initialize();

const fileScan = Bun.file("./assets/test_japanese.pdf");
const bufferScan = await fileScan.arrayBuffer();

// 1. Open and Render the PDF into Canvases
const pdfScan = pdfReader.open(bufferScan);
const canvasMap = await pdfReader.renderAll(pdfScan);
pdfReader.destroy(pdfScan);

// 2. Extract OCR Texts
const texts = await pdfReader.getTextsScanned(ocr, canvasMap);

// 3. Rebuild Searchable PDF
// Note: We open a fresh instance of the PDF for rebuilding
const pdfForRebuild = pdfReader.open(bufferScan);
const rebuiltPdfBuffer = await pdfReader.rebuild(pdfForRebuild, texts);
pdfReader.destroy(pdfForRebuild);

// 4. Save onto disk
await Bun.write("./test_japanese_searchable.pdf", rebuiltPdfBuffer);
```

## `PdfReaderOptions`

Configuration options for `PdfReader`, allowing customization of PDF text extraction behavior.

| Option                       | Type      | Default Value | Description                                                                 |
| ---------------------------- | --------- | ------------- | --------------------------------------------------------------------------- |
| `verbose`                    | `boolean` | `false`       | Enables logging for debugging purposes.                                     |
| `excludeFooter`              | `boolean` | `true`        | Excludes detected footer text from the extracted content.                   |
| `excludeHeader`              | `boolean` | `true`        | Excludes detected header text from the extracted content.                   |
| `raw`                        | `boolean` | `false`       | If `true`, returns raw text without additional processing.                  |
| `headerFromHeightPercentage` | `number`  | `0.02`        | Defines the height percentage from the top used to identify header text.    |
| `footerFromHeightPercentage` | `number`  | `0.95`        | Defines the height percentage from the bottom used to identify footer text. |
| `mergeCloseTextNeighbor`     | `boolean` | `true`        | Merges text elements that are close to each other into a single entity.     |
| `simpleSortAlgorithm`        | `boolean` | `false`       | Uses a simplified sorting algorithm for text positioning.                   |
| `scale`                      | `number`  | `1`           | The pdf document scale                                                      |
| `enableToon`                 | `boolean` | `false`       | To enable pdf words extraction in TOON format                               |

### Usage Example:

```typescript
const reader = new PdfReader({ verbose: true, excludeFooter: false });
```

These options allow fine-tuned control over how text is extracted and processed from PDFs.

### Compiling

You can compile your project into a single binary, but remember to also copy `node_modules/mupdf/dist/mupdf-wasm.wasm` and place it alongside your binary.
See `package.json` for an example.

## Method Documentation

### `PdfReader` Class

#### Constructor: `constructor(options?: Partial<PdfReaderOptions>)`

Creates an instance of `PdfReader`.

- **Parameters:**
  - `options` (optional): Partial options to override the defaults. Refer to the `PdfReaderOptions` interface for available options.

#### Method: `open(filename: string | ArrayBuffer): Promise<PDFDocumentProxy>`

Opens a PDF document.

- **Parameters:**

  - `filename`: The path to the PDF file or an `ArrayBuffer` containing the PDF data.

- **Returns:** A promise that resolves with the `PDFDocumentProxy`.

#### Method: `getTexts(pdf: PDFDocumentProxy): Promise<PageTexts>`

Extracts the text content from the PDF document.

- **Parameters:**

  - `pdf`: The `PDFDocumentProxy` instance.

- **Returns:** A promise that resolves with a `Map` of page numbers to their corresponding `PdfTexts`.

Sample return:

```json
// Map (1) starting index from 0
{
  "0": {
    "fullText": "Opposite Expectation: How to See the World as Two-Sided Lorem ipsum",
    "words": [
      {
        "text": "Opposite Expectation: How to See the World as Two-Sided​",
        "bbox": {
          "x0": 72,
          "y0": 84,
          "x1": 464,
          "y1": 99
        },
        "dimension": {
          "width": 392,
          "height": 15
        },
        "metadata": {
          "writing": "horizontal",
          "direction": "",
          "font": {
            "name": "AAAAAA+Arial-BoldItalicMT",
            "family": "sans-serif",
            "weight": "bold",
            "style": "italic",
            "size": 14
          },
          "hasEOL": undefined,
          "pageNum": 0
        },
        "id": 0
      }
    ]
  }
}
```

#### Method: `getLinesFromTexts(pageTexts: PageTexts): PageLines`

Retrieves line information from the page texts.

- **Parameters:**

  - `pageTexts`: A `Map` of page numbers to their corresponding `PdfTexts`.

- **Returns:** A `Map` of page numbers to an array of `PdfLine` objects.

Sample return:

```json
// Map (1) starting index from 0
{
  "0": [
    {
      "bbox": {
        "x0": 72,
        "y0": 84,
        "x1": 464,
        "y1": 99
      },
      "averageFontSize": 14,
      "dimension": {
        "width": 392,
        "height": 15
      },
      "words": [
        {
          "text": "Opposite Expectation: How to See the World as Two-Sided​",
          "bbox": {
            "x0": 72,
            "y0": 84,
            "x1": 464,
            "y1": 99
          },
          "dimension": {
            "width": 392,
            "height": 15
          },
          "metadata": {
            "writing": "horizontal",
            "direction": "",
            "font": {
              "name": "AAAAAA+Arial-BoldItalicMT",
              "family": "sans-serif",
              "weight": "bold",
              "style": "italic",
              "size": 14
            },
            "hasEOL": false,
            "pageNum": 0
          },
          "id": 0
        }
      ],
      "text": "Opposite Expectation: How to See the World as Two-Sided​"
    }
  ]
}
```

#### Method: `getCompactLinesFromTexts(pageTexts: PageTexts, algorithm: PdfCompactLineAlgorithm = "middleY"): CompactPageLines`

Retrieves a compact representation of line information from the page texts using the specified algorithm.

- **Parameters:**

  - `pageTexts`: A `Map` of page numbers to their corresponding `PdfTexts`.
  - `algorithm`: An optional `PdfCompactLineAlgorithm` specifying the method for grouping lines. Defaults to `middleY`.

- **Returns:** A `Map` of page numbers to an array of `CompactPdfLine` objects, where the line extraction method depends on the chosen algorithm.

Sample return:

```json
// Map (1) starting index from 0
{
  "0": [
    {
      "bbox": {
        "x0": 72,
        "y0": 83.13183584999996,
        "x1": 461.4900053795799,
        "y1": 97.13183534999996
      },
      "words": [
        {
          "text": "Opposite Expectation: How to See the World as Two-Sided",
          "bbox": {
            "x0": 72,
            "y0": 83.13183584999996,
            "x1": 461.4900053795799,
            "y1": 97.13183534999996
          }
        }
      ],
      "text": "Opposite Expectation: How to See the World as Two-Sided"
    }
  ]
}
```

#### Method: `isScanned(pageTexts: PageTexts, options?: PdfScannedThreshold): boolean`

Determines whether the PDF appears to be a scanned document.

- **Parameters:**

  - `pageTexts`: A `Map` of page numbers to their corresponding `PdfTexts`.
  - `options` (optional): Thresholds for scanned detection. Defaults to `CONSTANT.WORDS_PER_PAGE_THRESHOLD` and `CONSTANT.TEXT_LENGTH_THRESHOLD`.

- **Returns:** `true` if the PDF is considered scanned; otherwise, `false`.

For other methods I encourage you to try it out yourself.

## Web / Browser Support

Starting from v6.0.0, **ppu-pdf** supports running directly in the browser! Import from `ppu-pdf/web` to use `PdfReaderLegacyWeb` — a browser-native PDF reader powered by `pdfjs-dist`.

### Web Features

| Feature                  | Node (`PdfReaderLegacy`) | Web (`PdfReaderLegacyWeb`) |
| ------------------------ | :----------------------: | :------------------------: |
| `open()`                 |            ✅            |             ✅             |
| `getTexts()`             |            ✅            |             ✅             |
| `getTextsScanned()`      |            ✅            |      ✅ (ppu-paddle-ocr/web)      |
| `getLinesFromTexts()`    |            ✅            |             ✅             |
| `getCompactLinesFromTexts()` |        ✅            |             ✅             |
| `getLinesFromTextsInToon()` |         ✅            |             ✅             |
| `isScanned()`            |            ✅            |             ✅             |
| `isPageScanned()`        |            ✅            |             ✅             |
| `renderAll()`            |     ✅ (Node Canvas)     |    ✅ (HTMLCanvasElement)   |
| `destroy()`              |            ✅            |             ✅             |
| `dumpCanvasMap()`        |            ✅            |      ❌ (no filesystem)    |
| `saveCanvasToPng()`      |            ✅            |      ❌ (no filesystem)    |

> **Note:** `PdfReader` (mupdf-based) is **not available** in the browser — it requires native bindings. Only `PdfReaderLegacyWeb` (pdfjs-dist) is supported on the web.

### Web Installation

```bash
npm install ppu-pdf
# Optional for scanned PDF OCR in the browser:
npm install ppu-paddle-ocr
```

### Web Usage (Bundler)

```ts
import { PdfReaderLegacyWeb } from "ppu-pdf/web";

const reader = new PdfReaderLegacyWeb({ verbose: false });

// From a file input or fetch
const response = await fetch("document.pdf");
const buffer = await response.arrayBuffer();

const pdf = await reader.open(buffer);
const texts = await reader.getTexts(pdf);
console.log(texts.get(1)?.fullText);

const lines = reader.getLinesFromTexts(texts);
const compactLines = reader.getCompactLinesFromTexts(texts);
const isScanned = reader.isScanned(texts);

await reader.destroy(pdf);
```

### Web Usage (CDN / No Bundler)

```html
<script type="importmap">
{
  "imports": {
    "pdfjs-dist": "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/+esm",
    "pdfjs-dist/types/src/display/api": "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/+esm",
    "pdfjs-dist/types/web/interfaces": "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/+esm",
    "@toon-format/toon": "https://cdn.jsdelivr.net/npm/@toon-format/toon@2.1.0/+esm",
    "onnxruntime-web": "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/ort.all.bundle.min.mjs",
    "ppu-paddle-ocr/web": "https://cdn.jsdelivr.net/npm/ppu-paddle-ocr@4/web/index.js",
    "ppu-ocv/web": "https://cdn.jsdelivr.net/npm/ppu-ocv@2/index.web.js"
  }
}
</script>
<script type="module">
  import { PdfReaderLegacyWeb } from "https://cdn.jsdelivr.net/npm/ppu-pdf@6/web/index.js";

  const reader = new PdfReaderLegacyWeb();
  // ... use as shown above
</script>
```

### Scanned PDF OCR (Web)

For scanned PDF text extraction in the browser, explicitly load the engine in top-level await space (`<script type="module">`) instead of subscribing to `DOMContentLoaded`.

```html
<script type="module">
  import { PdfReaderLegacyWeb } from "ppu-pdf/web";
  import { PaddleOcrService } from "ppu-paddle-ocr/web";

  // Eagerly pre-warm the WebAssembly engine
  const ocrService = new PaddleOcrService();
  await ocrService.initialize();

  // Create an adapter matching the exact interface `getTextsScanned` requires
  const ocrAdapter = {
    initialize: async () => {}, // Pre-initialized above to avoid stutter
    recognize: async (canvas) => {
      return await ocrService.recognize(canvas);
    }
  };

  const reader = new PdfReaderLegacyWeb();
  const pdf = await reader.open(buffer);
  
  // Render PDF explicitly into mapped canvas elements first
  const canvasMap = await reader.renderAll(pdf, 72);
  
  // Inject the mapped canvas and the OCR engine to extract words and bounding boxes
  const texts = await reader.getTextsScanned(ocrAdapter, canvasMap);
  console.log(texts.get(1)?.fullText);

  await reader.destroy(pdf);
</script>
```


## Contributing

Contributions are welcome! If you would like to contribute, please follow these steps:

1. **Fork the Repository:** Create your own fork of the project.
2. **Create a Feature Branch:** Use a descriptive branch name for your changes.
3. **Implement Changes:** Make your modifications, add tests, and ensure everything passes.
4. **Submit a Pull Request:** Open a pull request to discuss your changes and get feedback.

### Running Tests

This project uses Bun for testing. To run the tests locally, execute:

```bash
bun test
```

Ensure that all tests pass before submitting your pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have suggestions, please open an issue in the repository.

Happy coding!

## Scripts

Recommended development environment is in linux-based environment. Library template: https://github.com/aquapi/lib-template

All script sources and usage.

### [Build](./scripts/build.ts)

Emit `.js` and `.d.ts` files to [`lib`](./lib).

### [Publish](./scripts/publish.ts)

Move [`package.json`](./package.json), [`README.md`](./README.md) to [`lib`](./lib) and publish the package.

### [Bench](./scripts/bench.ts)

Run files that ends with `.bench.ts` extension.

To run a specific file.

```bash
bun task bench index # Run bench/index.bench.ts
```

To run the benchmark in `node`, add a `--node` parameter

```bash
bun task bench --node

bun task bench --node index # Run bench/index.bench.ts with node
```
