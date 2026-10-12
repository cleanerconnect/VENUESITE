// The capture, small enough to type into a Figma plugin.
//
//   node tools/figma/pack-frames.mjs > /tmp/page09.b64
//
// `replay-page09.js` runs in a sandbox with no `fetch`, so the capture
// has to be handed to it as source code. Handed over raw that is about
// 223 000 characters once escaped for a JavaScript string literal, and
// every one of them has to be typed out by whoever or whatever is
// driving the plugin. This is the same bytes at a quarter of that.
//
// The format is LZ77 and nothing else — no Huffman, no entropy coding —
// because the decoder has to be read and trusted by somebody looking at
// a plugin script, and twenty lines can be read. Three ops:
//
//   0nnnnnnn                 literal run of n+1 bytes (1…128), inline
//   10nnnnnn dd dd           match of n+3 bytes (3…66) at distance dd
//   11nnnnnn nnnnnnnn dd dd  match of n+3 bytes (3…16386)
//
// Distances are 16-bit big-endian, so the window is 64 KiB: this file
// repeats whole day blocks and whole equipment lists, and a window
// smaller than the document loses them.
//
// The JSON is escaped to pure ASCII first. It costs 7 KiB before
// compression and 264 bytes after, and it means the decoder can turn
// bytes into a string with `String.fromCharCode` instead of needing a
// UTF-8 decoder the sandbox does not provide.
//
// `--check` unpacks its own output and compares, which is the only
// thing worth trusting about a codec.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SOURCE = process.env.OUT ?? "docs/lot1-figma-frames.json";
const WINDOW = 65535;
const MAX_RUN = 128;
const MAX_MATCH = 16386;

/** The document as ASCII-only JSON, which is still JSON. */
function ascii(text) {
  return JSON.stringify(JSON.parse(text)).replace(
    // Everything above 0x7e, as a `\uXXXX` escape.
    /[\u007f-￿]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export function pack(bytes) {
  const out = [];
  let literals = [];
  const flush = () => {
    while (literals.length) {
      const run = literals.slice(0, MAX_RUN);
      literals = literals.slice(MAX_RUN);
      out.push(run.length - 1, ...run);
    }
  };
  // Four-byte keys: three matches too much noise in a file this regular
  // and costs more in candidates than it wins in matches.
  const seen = new Map();
  const keyAt = (i) =>
    `${bytes[i]},${bytes[i + 1]},${bytes[i + 2]},${bytes[i + 3]}`;
  const remember = (i) => {
    if (i + 4 > bytes.length) return;
    const key = keyAt(i);
    const list = seen.get(key);
    if (list) list.push(i);
    else seen.set(key, [i]);
  };

  let i = 0;
  while (i < bytes.length) {
    let best = 0;
    let bestDistance = 0;
    if (i + 4 <= bytes.length) {
      const candidates = seen.get(keyAt(i)) ?? [];
      // The most recent forty, newest first: a nearer match is a shorter
      // distance and the cheapest token, and the list of an often-seen
      // key is long enough to make scanning all of it the slow part.
      for (let c = candidates.length - 1, tried = 0; c >= 0 && tried < 40; c--, tried++) {
        const at = candidates[c];
        const distance = i - at;
        if (distance > WINDOW) break;
        const limit = Math.min(bytes.length - i, MAX_MATCH);
        let n = 0;
        while (n < limit && bytes[at + n] === bytes[i + n]) n++;
        if (n > best) {
          best = n;
          bestDistance = distance;
          if (n >= 4096) break;
        }
      }
    }
    // Five, not three: a three-byte match costs three or four bytes to
    // encode and saves three.
    if (best >= 5) {
      flush();
      const value = best - 3;
      if (value < 64) out.push(0x80 | value);
      else out.push(0xc0 | (value >> 8), value & 0xff);
      out.push(bestDistance >> 8, bestDistance & 0xff);
      for (let k = i; k < i + best; k++) remember(k);
      i += best;
    } else {
      literals.push(bytes[i]);
      remember(i);
      i += 1;
    }
  }
  flush();
  return Uint8Array.from(out);
}

/** The decoder, in the same twenty lines the plugin carries. */
export function unpack(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    const token = bytes[i++];
    if (token < 128) {
      const n = token + 1;
      for (let k = 0; k < n; k++) out.push(bytes[i + k]);
      i += n;
    } else {
      let n;
      if (token < 192) n = (token & 63) + 3;
      else n = (((token & 63) << 8) | bytes[i++]) + 3;
      const distance = (bytes[i] << 8) | bytes[i + 1];
      i += 2;
      const from = out.length - distance;
      for (let k = 0; k < n; k++) out.push(out[from + k]);
    }
  }
  let text = "";
  for (let k = 0; k < out.length; k += 8192) {
    text += String.fromCharCode.apply(null, out.slice(k, k + 8192));
  }
  return text;
}

const source = ascii(readFileSync(SOURCE, "utf8"));
const bytes = Uint8Array.from(source, (c) => c.charCodeAt(0));
const packed = pack(bytes);
const base64 = Buffer.from(packed).toString("base64");

/** A rolling hash, the same one the generated calls carry. */
const sum = (text) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 1000000007;
  return h;
};

if (process.argv.includes("--call")) {
  // ── the two calls that put the capture on the page ──
  //
  //   node tools/figma/pack-frames.mjs --call
  //
  // 56 000 characters of base64 is more than one `use_figma` call
  // takes, so it goes in two halves: the first call parks its half on
  // the page, the second adds its own and then decodes, unpacks and
  // writes the JSON chunks `replay-page09.js` and `present-page09.js`
  // read.
  //
  // Every step states what it expects — each half's length, the
  // rejoined length, the unpacked length, and a hash of the unpacked
  // text. A base64 literal is typed into a tool call by whatever is
  // driving the plugin, and one character lost in that transfer used
  // to surface as a `JSON.parse` error in the middle of the document,
  // which reads exactly like a broken codec. Now it says which half
  // is short, and by how much.
  const NS = "lyfe.page09";
  const CEILING = 50000;
  const half = Math.ceil(base64.length / 2);
  const parts = [base64.slice(0, half), base64.slice(half)];
  mkdirSync("build", { recursive: true });

  const decoder = `const unpack = (bytes) => {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    const token = bytes[i++];
    if (token < 128) {
      const n = token + 1;
      for (let k = 0; k < n; k++) out.push(bytes[i + k]);
      i += n;
    } else {
      let n;
      if (token < 192) n = (token & 63) + 3;
      else n = (((token & 63) << 8) | bytes[i++]) + 3;
      const distance = (bytes[i] << 8) | bytes[i + 1];
      i += 2;
      const from = out.length - distance;
      for (let k = 0; k < n; k++) out.push(out[from + k]);
    }
  }
  let text = "";
  for (let k = 0; k < out.length; k += 8192) text += String.fromCharCode.apply(null, out.slice(k, k + 8192));
  return text;
};`;

  const head = (i) => `const PART = "${parts[i]}";
if (PART.length !== ${parts[i].length}) throw new Error("morceau ${i} tronqu\u00e9 : " + PART.length + " au lieu de ${parts[i].length}");
const page = figma.root.children.find((p) => /^09 /.test(p.name));
if (!page) throw new Error("page 09 absente");
await page.loadAsync();
page.setSharedPluginData("${NS}", "b64_${i}", PART);`;

  const first = `${head(0)}
return ["b64_0 pos\u00e9", PART.length];
`;

  const second = `${head(1)}
const b64 = page.getSharedPluginData("${NS}", "b64_0") + PART;
if (b64.length !== ${base64.length}) throw new Error("base64 recoll\u00e9 : " + b64.length + " au lieu de ${base64.length}");
${decoder}
const text = unpack(figma.base64Decode(b64));
if (text.length !== ${source.length}) throw new Error("d\u00e9paquet\u00e9 : " + text.length + " au lieu de ${source.length}");
let h = 0;
for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 1000000007;
if (h !== ${sum(source)}) throw new Error("empreinte " + h + " au lieu de ${sum(source)}");
const SIZE = 26000;
const n = Math.ceil(text.length / SIZE);
for (let i = 0; i < n; i++) page.setSharedPluginData("${NS}", "data" + i, text.slice(i * SIZE, (i + 1) * SIZE));
page.setSharedPluginData("${NS}", "chunks", String(n));
page.setSharedPluginData("${NS}", "b64_0", "");
page.setSharedPluginData("${NS}", "b64_1", "");
return [n + " morceaux", text.length + " caract\u00e8res", JSON.parse(text).frames.length + " cadres"];
`;

  writeFileSync("build/store-call-1.js", first);
  writeFileSync("build/store-call-2.js", second);
  process.stderr.write(
    `build/store-call-1.js · ${first.length} caractères\n` +
      `build/store-call-2.js · ${second.length} caractères\n` +
      `  ${base64.length} de base64 en deux moitiés · ${source.length} caractères une fois dépaquetés\n`,
  );
  if (first.length > CEILING || second.length > CEILING) {
    process.stderr.write(`!! un appel dépasse ${CEILING} caractères\n`);
    process.exit(1);
  }
} else if (process.argv.includes("--check")) {
  const back = unpack(packed);
  const same = back === source;
  const frames = JSON.parse(back).frames.length;
  process.stderr.write(
    `${SOURCE}\n` +
      `  json ascii      ${source.length}\n` +
      `  empaqueté       ${packed.length}\n` +
      `  base64          ${base64.length}  (${(source.length / base64.length).toFixed(1)}× moins à taper)\n` +
      `  aller-retour    ${same ? "identique" : "!! DIFFÉRENT"}, ${frames} cadres\n`,
  );
  if (!same) process.exit(1);
} else {
  process.stdout.write(base64);
}
