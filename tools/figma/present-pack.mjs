// `present-page09.js` as one `use_figma` call.
//
//   node tools/figma/present-pack.mjs
//
// The presentation needs no data — it reads the frames off the page —
// so the only thing to hand over is the code, and the source is 39 000
// characters of which most are the comments that make it readable.
// Minified it is a quarter of that, which is a quarter of the chances
// of losing a character in the transfer.
//
// What it writes is `build/present-call.js`: the file as `P`, then the
// two calls it ends with. Paste the whole thing as the `code` of one
// `use_figma` call.
//
// `--check` is `BUNDLED=1 SRC=build/present-min.js node
// tools/figma/present-dry-run.mjs`: the bytes that will run, through
// the same assertions as the source they came from.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "tools/figma/present-page09.js";
const OUT = process.env.OUT ?? "build/present-call.js";
const VERSION = process.env.VERSION ?? "v1";
// `REDRAW=0` presents the frames the page already carries instead of
// drawing them again from the capture stored on it — the short path
// after a replay, and the only one that does not need those 56 000
// characters of base64 handed over first. `CAPTURED_AT` is then the
// date the cover prints, since the capture is not read.
const REDRAW = process.env.REDRAW !== "0";
const CAPTURED_AT = process.env.CAPTURED_AT ?? "";
const ESBUILD = "./node_modules/.bin/esbuild";
const CEILING = 50000;

mkdirSync("build", { recursive: true });

// esbuild's `--global-name` emits `var P = (() => { … })();`, a
// declaration, which runs inside the async body `use_figma` wraps the
// code in. The dry run reads the same `P`.
writeFileSync(
  "build/present-entry.js",
  `${readFileSync(SRC, "utf8")}\nexport { ensureKit, presentPage09, GAP, SECTION_GAP, PAD, SCREENS };\n`,
);
execFileSync(ESBUILD, [
  "build/present-entry.js",
  "--bundle",
  "--minify",
  "--target=es2020",
  "--format=iife",
  "--global-name=P",
  "--outfile=build/present-min.js",
  "--log-level=warning",
]);
const bundle = readFileSync("build/present-min.js", "utf8").trim();

const options = REDRAW
  ? { version: VERSION }
  : { version: VERSION, redraw: false, capturedAt: CAPTURED_AT };
const script =
  `${bundle}\n` +
  `await P.ensureKit(figma);\n` +
  `return await P.presentPage09(figma, ${JSON.stringify(options)});\n`;
writeFileSync(OUT, script);

console.log(`${OUT} · ${script.length} caractères (source : ${readFileSync(SRC, "utf8").length})`);
if (script.length > CEILING) process.exitCode = 1;
else console.log("Vérifier d'abord :  BUNDLED=1 SRC=build/present-min.js node tools/figma/present-dry-run.mjs");
