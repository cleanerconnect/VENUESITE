// Section 7 of the audit: the four states, side by side, at both widths.
//
//   PHASE=apres BASE=http://localhost:3230 W=1440 H=900 \
//     node tools/verify/_design-states.mjs
//
// Writes `docs/design-audit/<phase>-etats/<screen>@<width>-<state>.png`.
// The rule the plates answer is that the four are the same components
// at the same spacing, not eight interpretations — which you cannot
// judge from four separate reviews a week apart, only from four plates
// next to each other. It also measures each state's page rhythm, so
// "the same spacing" is a number and not a look.

import { chromiumOrExplain } from "./browser.mjs";
import { signIn } from "./lot.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const chromium = await chromiumOrExplain();
const BASE = process.env.BASE ?? "http://localhost:3230";
const PHASE = process.env.PHASE ?? "apres";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const DIR = `docs/design-audit/${PHASE}-etats`;

const STATES = ["chargement", "vide", "erreur", "refus"];

// Only the six screens behind a session: Connexion and Inscription read
// no repository, so `?etat=` has nothing to force on them.
const SCREENS = [
  ["reservations", "/restaurant/reservations"],
  ["accueil", "/restaurant"],
  ["check-in", "/restaurant/check-in"],
  ["disponibilites", "/restaurant/disponibilites"],
  ["ma-fiche", "/restaurant/ma-fiche"],
  ["notifications", "/restaurant/notifications"],
];

mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const landed = await signIn(page, BASE, { venue: "Dar Zellij" });
if (typeof landed !== "string") throw new Error(landed.refused);

// Does the state's own surface keep the rhythm the happy path keeps?
const SHAPE = () => {
  const px = (v) => Math.round(parseFloat(v) || 0);
  const main = document.querySelector("main");
  if (!main) return null;
  const r = main.getBoundingClientRect();
  const s = getComputedStyle(main);
  // The first block under the banner: its box is the state's surface.
  const first = [...main.children].find((el) => {
    const b = el.getBoundingClientRect();
    return b.height > 40;
  });
  const fb = first?.getBoundingClientRect();
  const fs = first ? getComputedStyle(first) : null;
  return {
    mainWidth: Math.round(r.width),
    mainPadding: `${px(s.paddingTop)}/${px(s.paddingRight)}/${px(s.paddingBottom)}/${px(s.paddingLeft)}`,
    surface: fb ? `${Math.round(fb.width)}×${Math.round(fb.height)}` : "—",
    padding: fs ? `${px(fs.paddingTop)}/${px(fs.paddingRight)}/${px(fs.paddingBottom)}/${px(fs.paddingLeft)}` : "—",
    radius: fs?.borderTopLeftRadius ?? "—",
    heading: main.querySelector("h1, h2")?.textContent?.trim().slice(0, 40) ?? "—",
    buttons: main.querySelectorAll("button, a[href][class*='bg-']").length,
  };
};

const shapes = {};
for (const [slug, path] of SCREENS) {
  shapes[slug] = {};
  for (const state of STATES) {
    await page.goto(`${BASE}${path}?etat=${state}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/${slug}@${width}-${state}.png` });
    shapes[slug][state] = await page.evaluate(SHAPE);
  }
  const s = shapes[slug];
  const same = new Set(
    STATES.map((k) => `${s[k]?.mainWidth}|${s[k]?.mainPadding}`),
  ).size === 1;
  console.log(
    `  ${slug.padEnd(16)} ${STATES.map((k) => `${k} ${s[k]?.surface ?? "—"}`).join(" · ")}` +
      (same ? "" : "  ✗ la page ne garde pas sa forme"),
  );
}
writeFileSync(`${DIR}/shapes-${width}.json`, JSON.stringify(shapes, null, 2));
await browser.close();
console.log(`\n${DIR} · ${width}×${height} · ${SCREENS.length * STATES.length} plaques`);
