/**
 * Post-build fixup for the CJS output.
 *
 * The root package.json has `"type": "module"`, which tells Node to
 * treat every `.js` under this package as ESM by default. That would
 * misinterpret `dist-cjs/*.js` (which is CommonJS) as ESM at runtime.
 *
 * Fix: drop a `dist-cjs/package.json` with `{"type": "commonjs"}` so
 * Node's package-scope resolution correctly tags the CJS output. This
 * is the standard trick every dual-build TypeScript package uses.
 *
 * We do NOT copy .d.ts -> .d.cts. Consumers that need CJS types resolve
 * them through the `"types"` field inside the `"require"` condition in
 * package.json exports, which points back at the ESM .d.ts. That works
 * for every consumer on TypeScript >= 4.7 (i.e., everyone today).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cjsDir = path.resolve(HERE, "..", "dist-cjs");

await fs.mkdir(cjsDir, { recursive: true });
await fs.writeFile(
  path.join(cjsDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
);

console.log("[fixup] wrote dist-cjs/package.json (type: commonjs)");
