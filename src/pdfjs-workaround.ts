// Use this workaround until Bun.js support process.getBuiltinModule("module")
// see: https://github.com/oven-sh/bun/pull/12689

import { createRequire } from "module";

globalThis.process = globalThis.process || {};
if (!globalThis.process.getBuiltinModule) {
  globalThis.process.getBuiltinModule = function (name: string) {
    if (name === "module") {
      return { createRequire };
    }
    throw new Error(
      `process.getBuiltinModule is not implemented for module: ${name}`
    );
  };
}

// aLternative solution:
// process.getBuiltinModule = require;
