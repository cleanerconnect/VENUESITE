// `replay-page09.js` plus the frames of one or two sections, as one
// `use_figma` call.
//
//   SECTIONS="5 · Ma fiche" node tools/figma/replay-pack.mjs
//
// The plugin sandbox has no `fetch`, so the capture has to be handed
// in. `pack-frames.mjs` does that for the whole file: 52 000 characters
// of base64 stored on the page, then a second call to replay from it.
// That is the only way to carry 38 frames, and it has one failure mode
// worth avoiding — a literal that long is pasted into a tool call by
// hand, and a single character lost in the transfer surfaces as a
// `JSON.parse` error in the middle of the unpacked document, which is
// the same symptom as a broken codec and a much worse thing to debug.
//
// A pass that changed three tabs does not need 38 frames. This writes
// `build/replay-call.js`: the replay minified, the frames of the asked
// sections as a plain object literal beside it, and the `return`
// already written. No codec, one call, and a corrupted paste is a
// JavaScript syntax error on the spot rather than a silent half-load.
//
// It also writes `build/replay-frames.json`, which is the same trimmed
// capture for `replay-dry-run.mjs`:
//
//   OUT=build/replay-frames.json ONLY="5 · Ma fiche" \
//     node tools/figma/replay-dry-run.mjs
//
// Run that before the real call. The dry run is the only thing that
// knows whether the shelf still lays out without a frame on top of
// another once a section is replayed from part of its frames.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "tools/figma/replay-page09.js";
const CAPTURE = process.env.CAPTURE ?? "docs/lot1-figma-frames.json";
const OUT = process.env.OUT ?? "build/replay-call.js";
const FRAMES_OUT = process.env.FRAMES_OUT ?? "build/replay-frames.json";
const SECTIONS = (process.env.SECTIONS ?? "5 · Ma fiche").split("|");
// A whole section is often more frames than fit. `KEYS` narrows it to
// the frames a pass actually changed — the replay leaves the rest of
// the shelf where it stands, which is what `replay-dry-run.mjs` is for
// checking.
const KEYS = process.env.KEYS ? process.env.KEYS.split("|") : null;
const ESBUILD = "./node_modules/.bin/esbuild";
// `use_figma` refuses code longer than this, and a call that is refused
// after the frames were trimmed is a trim that has to be done again.
const CEILING = 50000;

const src = readFileSync(SRC, "utf8");
const doc = JSON.parse(readFileSync(CAPTURE, "utf8"));

// Which section a key belongs to is the replay's own business, so the
// table is read out of it rather than copied here — a second copy is a
// second thing to forget.
const HOME = new Function(`${src}\nreturn HOME;`)();

const unknown = SECTIONS.filter(
  (s) => !Object.values(HOME).some(([section]) => section === s),
);
if (unknown.length) {
  throw new Error(`section inconnue : ${unknown.join(", ")}`);
}

const slug = (key) => key.slice(0, key.lastIndexOf("@"));
const wanted = doc.frames.filter((f) => {
  const home = HOME[slug(f.k)];
  if (!home || !SECTIONS.includes(home[0])) return false;
  return !KEYS || KEYS.includes(f.k);
});
if (KEYS) {
  const missing = KEYS.filter((k) => !wanted.some((f) => f.k === k));
  if (missing.length) throw new Error(`cadre introuvable : ${missing.join(", ")}`);
}
if (!wanted.length) throw new Error("aucun cadre dans ces sections");

// `base`, `clock` and `pal` are read by the replay for every frame;
// everything else in the capture is the frames themselves.
const trimmed = {
  capturedAt: doc.capturedAt,
  base: doc.base,
  clock: doc.clock,
  pal: doc.pal,
  frames: wanted,
};
mkdirSync("build", { recursive: true });
writeFileSync(FRAMES_OUT, `${JSON.stringify(trimmed, null, 2)}\n`);

// esbuild's `--global-name` emits `var R = (() => { … })();`, which is
// a declaration and so runs inside the async function body `use_figma`
// wraps the code in. A bare `export` would not.
writeFileSync("build/replay-entry.js", `${src}\nexport { replayPage09 };\n`);
execFileSync(ESBUILD, [
  "build/replay-entry.js",
  "--bundle",
  "--minify",
  "--target=es2020",
  "--format=iife",
  "--global-name=R",
  "--outfile=build/replay-min.js",
  "--log-level=warning",
]);
const bundle = readFileSync("build/replay-min.js", "utf8").trim();

const data = JSON.stringify(trimmed);

// A rolling hash of those exact characters, checked inside the sandbox
// before anything is drawn.
//
// The frames are mostly numbers, and the call is typed into a tool by
// whatever is driving it: a dropped digit in a coordinate is still
// valid JavaScript, so it would not fail — it would draw one line of
// one frame in the wrong place and leave nothing to find it by. A
// literal that re-stringifies to the same characters is the literal
// that was sent; one that does not stops here.
const hash = (text) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 1000000007;
  return h;
};

const script =
  `${bundle}\n` +
  `const DOC = ${data};\n` +
  `const SUM = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 1000000007; return h; };\n` +
  `const seen = SUM(JSON.stringify(DOC));\n` +
  `if (seen !== ${hash(data)}) throw new Error("capture altérée en transfert : " + seen + " au lieu de ${hash(data)}");\n` +
  `return await R.replayPage09(figma, ${JSON.stringify(SECTIONS)}, DOC);\n`;
writeFileSync(OUT, script);

console.log(
  `${OUT} · ${script.length} caractères ` +
    `(${bundle.length} de code, ${data.length} de cadres) · ` +
    `${wanted.length} cadres : ${wanted.map((f) => f.k).join(", ")}`,
);
if (script.length > CEILING) {
  console.log(
    `\n!! ${script.length} > ${CEILING} : une section de moins par appel.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Vérifier d'abord :  OUT=${FRAMES_OUT} ONLY=${JSON.stringify(SECTIONS.join("|"))} node tools/figma/replay-dry-run.mjs`,
  );
}
