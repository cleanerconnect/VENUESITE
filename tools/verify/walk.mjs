// Walks every venue screen in a real browser and reports what broke.
//
// Not a test suite — a walk. It opens each of the thirty screens the
// specification names, at a given viewport, as a given account, and
// checks the four things that actually go wrong in this codebase: a
// non-200, horizontal overflow at phone width, an error page where a
// screen should be, and anything logged to the console.
//
//   node tools/verify/walk.mjs
//   W=390 H=844 node tools/verify/walk.mjs
//   VENUE=bar_nomad_casa node tools/verify/walk.mjs
//
// Needs a server already running on BASE and `npm install --no-save
// playwright`. Kept out of package.json on purpose: it is a check to run
// deliberately, not a dependency to carry.

import { chromium } from "playwright";
import { LOT, LOT_LABEL, venueScreens } from "./lot.mjs";

const BASE = process.env.BASE ?? "http://localhost:3210";

// Derived from the route index and filtered by lot, so a screen this
// build does not register is not walked and not counted as missing.
const SCREENS = venueScreens();

const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const email = process.env.EMAIL ?? "yassine@darzellij.ma";
// Both venues by default, because they are not the same product.
// `Détail Sprint` row 41 puts the same user story on Drinks/Cellar, so a
// lounge renders these seven screens too — and it books créneaux rather
// than services, which is a different vocabulary through every builder.
// Walking only the restaurant let a lounge-only crash on Accueil sit
// behind a clean 6/6 for as long as nobody passed VENUE by hand.
const venues = process.env.VENUE
  ? [process.env.VENUE]
  : ["rst_dar_zellij", "bar_nomad_casa"];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
// `locale` because a native date input formats its own value from the
// browser's locale, not from the page: without it a French portal
// captures `09/25/2026` next to a day it spells "vendredi 25 septembre".
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
});
const page = await context.newPage();

const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 160)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

let ok = 0;
let expected = 0;

for (const venue of venues) {
  const res = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: venue },
  });
  if (!res.ok()) problems.push(`venue switch failed: ${res.status()}`);
  await page.waitForTimeout(400);
  console.log(`\n${venue}`);

  for (const [path, label] of SCREENS) {
    const before = problems.length;
    const response = await page.goto(`${BASE}/restaurant${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    const status = response?.status() ?? 0;
    await page.waitForTimeout(450);

    const bodyText = (await page.textContent("body")) ?? "";
    const h1 = (await page.textContent("h1").catch(() => "")) ?? "";
    // The phone-width failure that survives review: the page body itself
    // scrolling sideways. Wide content must scroll inside its own box.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    const issues = [];
    if (status !== 200) issues.push(`HTTP ${status}`);
    if (overflow > 2) issues.push(`overflow ${overflow}px`);
    if (/Cette page n'a pas pu charger|Application error/i.test(bodyText)) {
      issues.push("error page");
    }
    if (bodyText.trim().length < 200) issues.push("near-empty body");
    const found = problems.slice(before);

    expected += 1;
    if (issues.length === 0 && found.length === 0) {
      ok += 1;
      console.log(`  ok   ${label.padEnd(20)} ${path || "/"}  · ${h1.trim().slice(0, 40)}`);
    } else {
      console.log(`  FAIL ${label.padEnd(20)} ${path || "/"}  · ${[...issues, ...found].join(" | ")}`);
    }
  }
}

console.log(
  `\n${ok}/${expected} screens clean at ${width}×${height} · ${LOT_LABEL} · ${venues.join(", ")}`,
);
await browser.close();
process.exit(ok === expected ? 0 : 1);
