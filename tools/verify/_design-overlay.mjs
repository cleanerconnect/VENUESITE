// Section 8 of the audit: the venue portal laid over the event dashboard.
//
//   BASE=http://localhost:3230 LOT=1 OUT=scratch/design/overlay-lot1 \
//     node tools/verify/_design-overlay.mjs
//
// Run it once against a Lot 1 portal and once against a Lot 2 one, then
// `node tools/verify/_design-overlay.mjs --diff` prints what differs.
//
// It measures the two things the brief names — the shell chrome, and
// the first screen of each product (venue Accueil against event Vue
// d'ensemble) — on the properties a designer would put a ruler to:
// widths, paddings, radii, type steps, card treatment, control sizes.
// Numbers, not impressions: "the sidebar feels tighter" is not a
// finding anybody can act on.

import { chromiumOrExplain } from "./browser.mjs";
import { signIn } from "./lot.mjs";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const DIFF = process.argv.includes("--diff");

const KEYS = [
  ["sidebar", "aside, [data-sidebar]"],
  ["sidebar item actif", ".sidebar-item[aria-current], .sidebar-item[data-active='true']"],
  ["sidebar item", ".sidebar-item"],
  ["topbar", "header:first-of-type, [data-topbar]"],
  ["main", "main"],
  ["titre d'écran", "main h1"],
  ["première carte", "main [data-card='surface']"],
  ["carte, variante ink", "main [data-card='ink']"],
  ["bouton principal", "main [data-variant='primary']"],
  ["bouton secondaire", "main [data-variant='secondary']"],
  ["bouton fantôme", "main [data-variant='ghost']"],
];

const PROBE = (keys) => {
  const px = (v) => Math.round(parseFloat(v) || 0);
  const read = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.left),
      padding: `${px(s.paddingTop)}/${px(s.paddingRight)}/${px(s.paddingBottom)}/${px(s.paddingLeft)}`,
      radius: s.borderTopLeftRadius,
      border: `${px(s.borderTopWidth)}px`,
      shadow: s.boxShadow === "none" ? "aucune" : "oui",
      size: px(s.fontSize),
      weight: Number(s.fontWeight),
      lineHeight: (parseFloat(s.lineHeight) / px(s.fontSize) || 0).toFixed(2),
      gap: s.gap === "normal" ? "—" : s.gap,
    };
  };
  const out = {};
  for (const [name, sel] of keys) {
    const el = document.querySelector(sel);
    out[name] = el ? read(el) : null;
  }
  return out;
};

if (DIFF) {
  const a = JSON.parse(readFileSync("scratch/design/overlay-lot1/shell.json", "utf8"));
  const b = JSON.parse(readFileSync("scratch/design/overlay-lot2/shell.json", "utf8"));
  const pad = (s, n) => String(s).padEnd(n);
  let n = 0;
  console.log(`\n  ${pad("élément · propriété", 34)}${pad("partenaire", 14)}${pad("événement", 14)}`);
  console.log(`  ${"─".repeat(62)}`);
  for (const key of Object.keys(a)) {
    if (!a[key] || !b[key]) {
      console.log(`  ${pad(key, 34)}${pad(a[key] ? "présent" : "absent", 14)}${b[key] ? "présent" : "absent"}`);
      n += 1;
      continue;
    }
    for (const prop of Object.keys(a[key])) {
      // x is where it sits, not how it is built; two products put their
      // first card at the same offset only by accident.
      // Where a thing sits is not how it is built, and a card's height
      // is its content's. A control's height is a spec, so it stays.
      if (prop === "x") continue;
      if (prop === "h" && !/bouton|item/.test(key)) continue;
      if (String(a[key][prop]) === String(b[key][prop])) continue;
      console.log(`  ${pad(`${key} · ${prop}`, 34)}${pad(a[key][prop], 14)}${b[key][prop]}`);
      n += 1;
    }
  }
  console.log(`\n  ${n} différence${n === 1 ? "" : "s"}`);
  process.exit(0);
}

const chromium = await chromiumOrExplain();
const BASE = process.env.BASE ?? "http://localhost:3230";
const LOT = process.env.LOT ?? "1";
const OUT = process.env.OUT ?? `scratch/design/overlay-lot${LOT}`;
const PATH = LOT === "1" ? "/restaurant" : "/dashboard";

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
  reducedMotion: "reduce",
});
const page = await context.newPage();
const landed = await signIn(page, BASE, LOT === "1" ? { venue: "Dar Zellij" } : {});
if (typeof landed !== "string") throw new Error(landed.refused);
await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1800);
const shell = await page.evaluate(PROBE, KEYS);
writeFileSync(`${OUT}/shell.json`, JSON.stringify(shell, null, 2));
await page.screenshot({ path: `${OUT}/plate.png` });
for (const [k, v] of Object.entries(shell)) {
  console.log(
    `  ${k.padEnd(24)} ${v ? `${v.w}px  pad ${v.padding}  r ${v.radius}  ${v.size}/${v.weight}/${v.lineHeight}` : "absent"}`,
  );
}
await browser.close();
console.log(`\n${OUT}/shell.json · lot ${LOT} · ${PATH}`);
