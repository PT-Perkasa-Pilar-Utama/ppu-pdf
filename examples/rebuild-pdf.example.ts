import { PaddleOcrService } from "ppu-paddle-ocr";
import { PdfReader } from "../src";

export const MODEL_BASE_URL =
  "https://media.githubusercontent.com/media/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main";
export const DICT_BASE_URL =
  "https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main";

const pdfReader = new PdfReader({ verbose: false });

// Tweak the model variant and dictionary to balance the accuracy and performance.
// Note that the dictionary should match the recognition model, otherwise the OCR results will be inaccurate.
const ocr = new PaddleOcrService({
  model: {
    detection: `${MODEL_BASE_URL}/detection/PP-OCRv5_mobile_det_infer.onnx`,
    recognition: `${MODEL_BASE_URL}/recognition/PP-OCRv5_mobile_rec_infer.onnx`,
    charactersDictionary: `${DICT_BASE_URL}/recognition/ppocrv5_dict.txt`,
  },
});

await ocr.initialize();

// 1. Reading the file from disk
const fileScan = Bun.file("./assets/test_japanese.pdf");
const bufferScan = await fileScan.arrayBuffer();

// 2. Open and Render
const pdfScan = pdfReader.open(bufferScan);
const canvasMap = await pdfReader.renderAll(pdfScan);
pdfReader.destroy(pdfScan);

// 3. Extract OCR Texts
const texts = await pdfReader.getTextsScanned(ocr, canvasMap);

// 4. Rebuild Searchable PDF
const pdfForRebuild = pdfReader.open(bufferScan);
const rebuiltPdfBuffer = await pdfReader.rebuild(pdfForRebuild, texts);
pdfReader.destroy(pdfForRebuild);

// 5. Save onto disk
await Bun.write("./test_japanese_searchable.pdf", rebuiltPdfBuffer);
