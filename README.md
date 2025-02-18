# ppu-pdf

Easily extract text from digital PDF files with coordinate and font size included, and optionally group text by lines.

## Features

- **Text Extraction:** Retrieve all text content from a PDF.
- **Coordinate Data:** Get precise bounding box and dimension information for each text element.
- **Line Grouping:** Merge individual text tokens into coherent lines.
- **Scanned PDF Detection:** Determine if a PDF appears to be scanned or digitally generated.

## Installation

Note: Using Bun is recommended, im tired getting `Error [ERR_REQUIRE_ESM]: require() of ES Module` or somebody wants to patch it, feel free to open a pull request

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
const pdf = await pdfReader.open(buffer);

// remember it's a map
const texts = await pdfReader.getTexts(pdf);
const page1texts = texts.get(1);
console.log("texts: ", page1texts);

const isScanned = pdfReader.isScanned(texts);
console.log("is pdf scanned: ", isScanned);
```

## `PdfReaderOptions`

Configuration options for `PdfReader`, allowing customization of PDF text extraction behavior.

| Option                       | Type      | Default Value                            | Description                                                                 |
| ---------------------------- | --------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| `verbose`                    | `boolean` | `false`                                  | Enables logging for debugging purposes.                                     |
| `excludeFooter`              | `boolean` | `true`                                   | Excludes detected footer text from the extracted content.                   |
| `excludeHeader`              | `boolean` | `true`                                   | Excludes detected header text from the extracted content.                   |
| `raw`                        | `boolean` | `false`                                  | If `true`, returns raw text without additional processing.                  |
| `headerFromHeightPercentage` | `number`  | `CONSTANT.HEADER_FROM_HEIGHT_PERCENTAGE` | Defines the height percentage from the top used to identify header text.    |
| `footerFromHeightPercentage` | `number`  | `CONSTANT.FOOTER_FROM_HEIGHT_PERCENTAGE` | Defines the height percentage from the bottom used to identify footer text. |
| `mergeCloseTextNeighbor`     | `boolean` | `true`                                   | Merges text elements that are close to each other into a single entity.     |
| `simpleSortAlgorithm`        | `boolean` | `false`                                  | Uses a simplified sorting algorithm for text positioning.                   |

### Usage Example:

```typescript
const reader = new PdfReader({ verbose: true, excludeFooter: false });
```

These options allow fine-tuned control over how text is extracted and processed from PDFs.

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
// Map (1)
{
  "1": {
    "words": [
      {
        "text": "Opposite Expectation: How to See the World as Two-Sided",
        "bbox": {
          "x0": 72,
          "y0": 83.13183584999996,
          "x1": 461.4900053795799,
          "y1": 97.13183534999996
        },
        "dimension": {
          "width": 389.4900053795799,
          "height": 13.9999995
        },
        "metadata": {
          "direction": "ltr",
          "fontName": "g_d0_f1",
          "fontSize": 14,
          "hasEOL": false,
          "pageNum": 1
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
// Map (1)
{
  "1": [
    {
      "bbox": {
        "x0": 72,
        "y0": 83.13183584999996,
        "x1": 461.4900053795799,
        "y1": 97.13183534999996
      },
      "averageFontSize": 14,
      "dimension": {
        "width": 389.4900053795799,
        "height": 13.999999500000001
      },
      "words": [
        {
          "text": "Opposite Expectation: How to See the World as Two-Sided",
          "bbox": {
            "x0": 72,
            "y0": 83.13183584999996,
            "x1": 461.4900053795799,
            "y1": 97.13183534999996
          },
          "dimension": {
            "width": 389.4900053795799,
            "height": 13.9999995
          },
          "metadata": {
            "direction": "ltr",
            "fontName": "g_d0_f1",
            "fontSize": 14,
            "hasEOL": false,
            "pageNum": 1
          },
          "id": 0
        }
      ],
      "text": "Opposite Expectation: How to See the World as Two-Sided"
    }
  ]
}
```

#### Method: `getCompactLinesFromTexts(pageTexts: PageTexts, algorithm: PdfCompactLineAlgorithm = PdfCompactLineAlgorithm.MiddleY): CompactPageLines`

Retrieves a compact representation of line information from the page texts using the specified algorithm.

- **Parameters:**

  - `pageTexts`: A `Map` of page numbers to their corresponding `PdfTexts`.
  - `algorithm`: An optional `PdfCompactLineAlgorithm` specifying the method for grouping lines. Defaults to `MiddleY`.

- **Returns:** A `Map` of page numbers to an array of `CompactPdfLine` objects, where the line extraction method depends on the chosen algorithm.

Sample return:

```json
// Map (1)
{
  "1": [
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
