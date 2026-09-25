// What a screen renders when a field is missing.
//
//   BASE=http://localhost:3210 node tools/verify/payload.mjs
//   LYFE_DATA=static … node tools/verify/payload.mjs
//
// Every other tool here asks whether a screen works against the data it
// was built with. This one asks the opposite question: what does a
// screen draw when the payload is *not* what the types promise?
//
// That is not hypothetical. `ServiceDefinition.slotMinutes` is typed as
// required, and a JSON payload is not a type: the committed snapshot
// predates the field, so both the static driver and `tools/mock-api.mjs`
// served a service definition without it — and Disponibilités read
// « créneaux de undefined minutes » on a Lot 1 screen, in the exact
// configuration a cold clone lands on. `walk.mjs` passed 12/12 through
// all of it, because the page rendered, returned 200 and logged nothing.
//
// So: the name of a JavaScript value must never reach a partner. Any of
// `undefined`, `NaN`, `[object Object]`, `Invalid Date` or a bare `null`
// in rendered text is a failure, wherever it comes from.

import { chromiumOrExplain } from "./browser.mjs";
import { venueScreens, LOT_LABEL } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const EMAIL = process.env.EMAIL ?? "yassine@darzellij.ma";
const VENUE = process.env.VENUE ?? "rst_dar_zellij";

// `null` only on its own line: « null » inside a sentence is French for
// nothing and a partner will never see it, while a table cell holding
// exactly that is a field that failed to render.
const LEAKS = [
  ["undefined", /\bundefined\b/],
  ["NaN", /\bNaN\b/],
  ["[object Object]", /\[object Object\]/],
  ["Invalid Date", /Invalid Date/],
  ["null", /^null$/],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(2200);
// The account may hold two venues, in which case the panel asks which
// one. Going through the route the switcher calls settles it either way,
// and signs the cookie the way the portal expects.
await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: VENUE } });

let failures = 0;
for (const [path, label] of venueScreens()) {
  await page.goto(`${BASE}/restaurant${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const lines = ((await page.locator("body").innerText()) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const hits = [];
  for (const line of lines) {
    for (const [name, pattern] of LEAKS) {
      if (pattern.test(line)) hits.push(`${name} · ${line.slice(0, 120)}`);
    }
  }
  if (hits.length === 0) {
    console.log(`  ok   ${label.padEnd(20)} ${path || "/"}`);
  } else {
    failures += hits.length;
    console.log(`  ✗    ${label.padEnd(20)} ${path || "/"}`);
    for (const h of hits) console.log(`         ${h}`);
  }
}

await browser.close();

if (failures === 0) {
  console.log(
    `\nAucune valeur JavaScript rendue sur ${venueScreens().length} écrans · ${LOT_LABEL} · ${width}×${height}.`,
  );
  process.exit(0);
}
console.log(`\n${failures} valeur(s) rendue(s) · ${LOT_LABEL} · ${width}×${height}`);
process.exit(1);
