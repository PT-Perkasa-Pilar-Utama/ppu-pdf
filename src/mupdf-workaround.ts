// Workaround for compiling binary in bun
// See: https://github.com/ArtifexSoftware/mupdf.js/issues/147

if (!(process.argv[1]?.endsWith(".ts") || process.argv[1]?.endsWith(".js"))) {
  globalThis.$libmupdf_wasm_Module = {
    locateFile(path: string) {
      return "./" + path;
    },
  };
}
