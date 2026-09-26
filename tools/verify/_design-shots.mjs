// Before-and-after plates for the design audit.
//
//   PHASE=avant BASE=http://localhost:3230 node tools/verify/_design-shots.mjs
//   PHASE=apres W=390 H=844 node tools/verify/_design-shots.mjs
//
// Writes `docs/design-audit/<phase>/<screen>@<width>.png`. Full page,
// so a row count is countable off the plate, plus a `-fold` crop at the
// viewport for the density question — what the owner sees without
// scrolling is the thing the brief measures.

import { chromiumOrExplain } from "./browser.mjs";
import { clockLine, signIn } from "./lot.mjs";
import { mkdirSync } from "node:fs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";
const PHASE = process.env.PHASE ?? "avant";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const DIR = `docs/design-audit/${PHASE}`;

const SCREENS = [
  ["reservations", "/restaurant/reservations", true],
  ["accueil", "/restaurant", true],
  ["check-in", "/restaurant/check-in", true],
  ["connexion", "/login", false],
  ["inscription", "/inscription", false],
  ["disponibilites", "/restaurant/disponibilites", true],
  ["ma-fiche", "/restaurant/ma-fiche", true],
  ["notifications", "/restaurant/notifications", true],
];

mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

const open = async (session) => {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
    deviceScaleFactor: 1,
    // Motion off for a plate: an entrance animation caught mid-flight
    // is not what the screen looks like.
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  if (session) {
    const landed = await signIn(page, BASE, { venue: "Dar Zellij" });
    if (typeof landed !== "string") throw new Error(landed.refused);
  }
  return { context, page };
};

let session = await open(true);

for (const [slug, path, needsSession] of SCREENS) {
  const { page } = needsSession ? session : await open(false);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${DIR}/${slug}@${width}.png`, fullPage: true });
  await page.screenshot({ path: `${DIR}/${slug}@${width}-fold.png` });
  const rows = await page.evaluate(() => {
    // What is countable above the fold, for the density rule.
    const h = window.innerHeight;
    // Visible only: both lanes of the spec render the book, and the one
    // this width does not use is `display:none` with zero-height rows.
    const lines = [...document.querySelectorAll("main [data-book-row]")].filter(
      (el) => el.getBoundingClientRect().height > 1,
    );
    if (lines.length) {
      return {
        kind: "book",
        total: lines.length,
        aboveFold: lines.filter((el) => el.getBoundingClientRect().bottom <= h).length,
        rowHeight: Math.round(lines[0].getBoundingClientRect().height),
      };
    }
    return null;
  });
  console.log(
    `  ${slug.padEnd(16)} ${width}px` + (rows ? `  ${rows.aboveFold}/${rows.total} lignes au-dessus du pli · ${rows.rowHeight}px par ligne` : ""),
  );
  if (!needsSession) await page.context().close();
}

await browser.close();
console.log(`\n${DIR} · ${width}×${height} · ${clockLine()}`);
