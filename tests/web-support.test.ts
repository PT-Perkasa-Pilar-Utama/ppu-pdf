import { describe, expect, test } from "bun:test";

// ── 1. Web module exports ────────────────────────────────────────────
// Verify every symbol the web entrypoint promises is actually exported.

describe("Web module exports", () => {
  test("src/web/index.ts exports PdfReaderLegacyWeb", async () => {
    const mod = await import("../src/web/index.js");
    expect(mod.PdfReaderLegacyWeb).toBeDefined();
    expect(typeof mod.PdfReaderLegacyWeb).toBe("function");
  });

  test("src/web/index.ts exports shared constants", async () => {
    const mod = await import("../src/web/index.js");
    expect(mod.CONSTANT).toBeDefined();
    expect(mod.PDF_READER_DEFAULT_OPTIONS).toBeDefined();
  });

  test("CONSTANT has expected shape", async () => {
    const mod = await import("../src/web/index.js");
    const c = mod.CONSTANT;
    expect(c).toHaveProperty("WORDS_PER_PAGE_THRESHOLD");
    expect(c).toHaveProperty("TEXT_LENGTH_THRESHOLD");
    expect(c).toHaveProperty("HEADER_FROM_HEIGHT_PERCENTAGE");
    expect(c).toHaveProperty("FOOTER_FROM_HEIGHT_PERCENTAGE");
  });

  test("PDF_READER_DEFAULT_OPTIONS has expected shape", async () => {
    const mod = await import("../src/web/index.js");
    const opts = mod.PDF_READER_DEFAULT_OPTIONS;
    expect(opts).toHaveProperty("verbose");
    expect(opts).toHaveProperty("excludeFooter");
    expect(opts).toHaveProperty("excludeHeader");
    expect(opts).toHaveProperty("raw");
    expect(opts).toHaveProperty("headerFromHeightPercentage");
    expect(opts).toHaveProperty("footerFromHeightPercentage");
    expect(opts).toHaveProperty("mergeCloseTextNeighbor");
    expect(opts).toHaveProperty("simpleSortAlgorithm");
    expect(opts).toHaveProperty("scale");
    expect(opts).toHaveProperty("enableToon");
  });
});

// ── 2. Instantiation & lifecycle ─────────────────────────────────────
// Prove a service can be created and has expected methods.

describe("Web service instantiation", () => {
  test("can create instance with default options", async () => {
    const { PdfReaderLegacyWeb } = await import("../src/web/index.js");
    const reader = new PdfReaderLegacyWeb();
    expect(reader).toBeDefined();
    expect(reader.startIndex).toBe(1);
  });

  test("can create instance with custom options", async () => {
    const { PdfReaderLegacyWeb } = await import("../src/web/index.js");
    const reader = new PdfReaderLegacyWeb({
      verbose: true,
      excludeFooter: false,
      scale: 2,
    });
    expect(reader).toBeDefined();
  });

  test("has all expected public methods", async () => {
    const { PdfReaderLegacyWeb } = await import("../src/web/index.js");
    const reader = new PdfReaderLegacyWeb();
    expect(typeof reader.open).toBe("function");
    expect(typeof reader.getTexts).toBe("function");
    expect(typeof reader.getTextsScanned).toBe("function");
    expect(typeof reader.getLinesFromTexts).toBe("function");
    expect(typeof reader.getLinesFromTextsInToon).toBe("function");
    expect(typeof reader.getCompactLinesFromTexts).toBe("function");
    expect(typeof reader.isScanned).toBe("function");
    expect(typeof reader.isPageScanned).toBe("function");
    expect(typeof reader.renderAll).toBe("function");
    expect(typeof reader.destroy).toBe("function");
  });
});

// ── 3. No Node-specific imports ──────────────────────────────────────
// Read each web source file as text and assert it does NOT reference
// any Node built-in or platform-specific modules.

describe("Web services do not import Node-specific modules", () => {
  const WEB_FILES = [
    "./src/web/pdf-reader-legacy.web.ts",
    "./src/web/index.ts",
    "./src/core/base-pdf-reader-common.ts",
  ];

  for (const filePath of WEB_FILES) {
    test(`${filePath} has no Node imports`, async () => {
      const content = await Bun.file(filePath).text();
      expect(content).not.toContain('from "fs"');
      expect(content).not.toContain('from "path"');
      expect(content).not.toContain('from "os"');
      expect(content).not.toContain("@napi-rs/canvas");
      expect(content).not.toContain('from "mupdf"');
    });
  }
});

// ── 4. Shared modules are reused (single source of truth) ────────────
// Confirm the web entrypoint re-exports from shared sources and that
// constants are byte-identical between main and web.

describe("Shared modules are reused in web path", () => {
  test("web index re-exports shared interface types", async () => {
    const content = await Bun.file("./src/web/index.ts").text();
    expect(content).toContain("../pdf.interface.js");
    expect(content).toContain("../pdf.constant.js");
    expect(content).toContain("../pdfjs.interface.js");
  });

  test("web reader uses base-pdf-reader-common from core", async () => {
    const content = await Bun.file(
      "./src/web/pdf-reader-legacy.web.ts",
    ).text();
    expect(content).toContain("../core/base-pdf-reader-common.js");
  });

  test("constants exports match between main and web", async () => {
    const mainMod = await import("../src/pdf.constant.js");
    const webMod = await import("../src/web/index.js");
    expect(webMod.CONSTANT).toEqual(mainMod.CONSTANT);
    expect(webMod.PDF_READER_DEFAULT_OPTIONS).toEqual(
      mainMod.PDF_READER_DEFAULT_OPTIONS,
    );
  });
});
