// `accueil-frames.js` plus its figures, as one `use_figma` call.
//
//   node tools/figma/accueil-pack.mjs
//
// The Figma plugin sandbox has no `fetch`, so the builder and the data
// both have to be handed in as text. `pack-frames.mjs` solves the same
// problem for the capture by base64-ing it onto the page's shared plugin
// data; this one is small enough to go in the call itself, which is one
// round trip rather than two.
//
// What it writes is `build/accueil-call.js`: the builder, minified so
// the comments that belong in the file do not have to be typed into a
// tool call, and the figures rounded to a tenth of a pixel — the chart
// geometry is a drawing, not a measurement, and three decimals is four
// kilobytes of noise. Paste the whole file as the `code` of one
// `use_figma` call. It ends with its own `return`.
//
// Then `node tools/figma/accueil-dry-run.mjs` with `SRC` pointing at the
// bundle and `BUNDLED=1`, which is what `--check` does here: the bytes
// that will run, through the same assertions as the source they came
// from.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "tools/figma/accueil-frames.js";
const FIGURES = process.env.FIGURES ?? "docs/lot1-accueil-figures.json";
const OUT = process.env.OUT ?? "build/accueil-call.js";
const ESBUILD = "./node_modules/.bin/esbuild";

mkdirSync("build", { recursive: true });

// ── the builder, as `A.buildAccueil` ──
// esbuild's `--global-name` emits `var A = (() => { … })();`, which is a
// declaration rather than a module, so it runs inside the async function
// body `use_figma` wraps the code in.
writeFileSync("build/accueil-entry.js", `${readFileSync(SRC, "utf8")}\nexport { buildAccueil };\n`);
execFileSync(ESBUILD, [
  "build/accueil-entry.js",
  "--bundle",
  "--minify",
  "--target=es2020",
  "--format=iife",
  "--global-name=A",
  "--outfile=build/accueil-min.js",
  "--log-level=warning",
]);
const bundle = readFileSync("build/accueil-min.js", "utf8").trim();

// ── the figures, trimmed to what the builder reads ──
const tenths = (o) =>
  JSON.parse(JSON.stringify(o, (key, value) => (typeof value === "number" ? Math.round(value * 10) / 10 : value)));
const figures = tenths(JSON.parse(readFileSync(FIGURES, "utf8")));
for (const lane of Object.values(figures.chart.lanes)) {
  // `screen` is the bar's width in CSS pixels, recorded as a check on
  // the viewBox mapping. The builder draws from the viewBox.
  for (const bar of lane.bars) delete bar.screen;
}
delete figures.base;
delete figures.account;
const data = JSON.stringify(figures);

const script = `${bundle}\nconst FIGURES = ${data};\nreturn await A.buildAccueil(figma, FIGURES);\n`;
writeFileSync(OUT, script);

const tiles = figures.rows.reduce((n, r) => n + r.tiles.length, 0);
console.log(
  `${OUT} · ${script.length} caractères ` +
    `(${bundle.length} de code, ${data.length} de chiffres) · ` +
    `${figures.rows.length} rangées × ${tiles} tuiles · ` +
    `${figures.chart.lanes.desktop.bars.length} barres · ${Object.keys(figures.icons).length} icônes`,
);
console.log(
  "Vérifier le paquet :  BUNDLED=1 SRC=build/accueil-min.js node tools/figma/accueil-dry-run.mjs",
);
