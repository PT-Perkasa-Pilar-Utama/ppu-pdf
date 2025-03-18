# ppu-pdf

Easily extract text from digital PDF and Scanned PDF files with coordinate and font size included, and optionally group text by lines or render scanned pdf to canvas/png.

There are two class of `PdfReader` (uses MuPDF) and `PdfReaderLegacy` uses (pdfjs-dist). Both are good, for digital pdf with `PdfReader` having more capability to render pdf into Canvas and dump to image/png as well so you can process it further with Tesseract/other OCR tool.

If you want `PdfReaderLegacy` headless version, go check https://www.npmjs.com/package/ppu-pdf-headless

## Features

- **Text Extraction:** Retrieve all text content from a PDF.
- **Coordinate Data:** Get precise bounding box and dimension information for each text element.
- **Line Grouping:** Merge individual text tokens into coherent lines.
- **Scanned PDF Detection:** Determine if a PDF appears to be scanned or digitally generated.
- **Scanned PDF Canvas Rendering:** Convert scanned pdf per page into a ready to processed canvas.
- **Scanned PDF to PNG Images:** Convert and write all pdf pages to PNG images.

## Differences

| Indicator                  | PdfReader | PdfReaderLegacy |
| -------------------------- | --------- | --------------- |
| Library                    | MuPDF     | pdfjs-dist      |
| Pages index start          | 0         | 1               |
| open()                     | ✅        | ✅              |
| getTexts()                 | ✅        | ✅              |
| isScanned()                | ✅        | ✅              |
| getLinesFromTexts()        | ✅        | ✅              |
| getCompactLinesFromTexts() | ✅        | ✅              |
| destroy()                  | ✅        | ✅              |
| destroyPage()              | ✅        | ❌              |
| renderAll()                | ✅        | ❌              |
| saveCanvasToPng()          | ✅        | ❌              |
| dumpCanvasMap()            | ✅        | ❌              |

## Latest Benchmark

```sh
clk: ~4.12 GHz
cpu: 11th Gen Intel(R) Core(TM) i5-11400H @ 2.70GHz
runtime: bun 1.2.5 (x64-linux)

benchmark                                 avg (min … max) p75 / p99    (min … top 1%)
--------------------------------------------------------- -------------------------------
pdfReader.getTexts()                        12.06 ms/iter  12.19 ms ▆█▄
                                    (10.21 ms … 22.29 ms)  21.23 ms ████▃
                                  (  0.00  b …   5.32 mb) 524.38 kb █████▇▃▃▁▁▃▁▃▁▃▁▁▁▁▁▃

pdfReaderLegacy.getTexts()                   4.41 ms/iter   4.55 ms  █▇
                                      (3.39 ms … 9.62 ms)   8.61 ms ▃██▆
                                  (  0.00  b …   3.09 mb) 707.68 kb ████▇█▄▁▄▂▁▂▂▂▂▂▁▂▂▂▂

summary
  pdfReaderLegacy.getTexts()
   2.73x faster than pdfReader.getTexts()

--------------------------------------------------------- -------------------------------
pdfReader.getLinesFromTexts()                5.61 µs/iter   5.08 µs  █
                                      (3.94 µs … 2.60 ms)  19.94 µs ▂█
                                  (  0.00  b … 264.00 kb) 763.87  b ██▆▃▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁

pdfReaderLegacy.getLinesFromTexts()          5.93 µs/iter   5.46 µs  █
                                      (3.94 µs … 2.78 ms)  17.71 µs  █▅
                                  (  0.00  b … 264.00 kb) 949.15  b ▆██▄▂▂▂▂▂▁▁▁▁▁▁▁▁▁▁▁▁

summary
  pdfReader.getLinesFromTexts()
   1.06x faster than pdfReaderLegacy.getLinesFromTexts()

--------------------------------------------------------- -------------------------------
pdfReader.getCompactLinesFromTexts()         6.52 µs/iter   5.89 µs  █
                                      (4.29 µs … 2.54 ms)  20.34 µs  █▃
                                  (  0.00  b … 528.00 kb) 995.44  b ▃██▄▂▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁

pdfReaderLegacy.getCompactLinesFromTexts()   6.52 µs/iter   6.05 µs  █
                                      (4.59 µs … 2.25 ms)  20.94 µs  █▂
                                  (  0.00  b … 264.00 kb) 540.34  b ▅██▃▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁

summary
  pdfReader.getCompactLinesFromTexts()
   1x faster than pdfReaderLegacy.getCompactLinesFromTexts()
```

## Installation

Using Bun is recommended

Install the package via npm:

```bash
npm install ppu-pdf
```

Or using Yarn:

```bash
yarn add ppu-pdf
```

Bun:

```bash
bun add ppu-pdf
```

## Usage

Below is an example of how to use the library with Bun:

```ts
import { PdfReader } from "ppu-pdf";

const pdfReader = new PdfReader({ verbose: false });
const file = Bun.file("./src/assets/opposite-expectation.pdf");

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
          "font": {
            "name": "AAAAAA+Arial-BoldItalicMT",
            "family": "sans-serif",
            "weight": "bold",
            "style": "italic",
            "size": 14
          },
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
            "font": {
              "name": "AAAAAA+Arial-BoldItalicMT",
              "family": "sans-serif",
              "weight": "bold",
              "style": "italic",
              "size": 14
            },
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
bun bench index # Run bench/index.bench.ts
```

To run the benchmark in `node`, add a `--node` parameter

```bash
bun bench --node

bun bench --node index # Run bench/index.bench.ts with node
```
