// Forces the four demo states on every venue screen.
//
// `?etat=chargement|vide|erreur|refus` exists so an external team can
// *see* what a slow load, an empty venue, a failed read and a role
// without the right look like. States nobody can reach are states
// nobody maintains, so this checks that all four are reachable on all
// thirty screens rather than on the four somebody remembered to wire.
//
// `refus` is the newest, and it is here for the reason the other three
// are: before the design audit it could only be reached with a second
// account, so nothing ever looked at it and nothing tested it.
//
//   node tools/verify/states.mjs

import { chromiumOrExplain } from "./browser.mjs";
import { LOT, LOT_LABEL, venuePaths } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";
const ERROR_MARKER = "Cette page n'a pas pu charger";
const DENIED_MARKER = "Accès non autorisé";

const PATHS = venuePaths();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', "yassine@darzellij.ma");
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

let fails = 0;
for (const path of PATHS) {
  const row = [];
  for (const state of ["chargement", "vide", "erreur", "refus"]) {
    const res = await page.goto(`${BASE}/restaurant${path}?etat=${state}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(150);
    const body = (await page.textContent("body")) ?? "";
    const status = res?.status() ?? 0;

    let ok = status === 200;
    // The error state must show the error screen; the other two must
    // not. A forced "vide" that renders an error is the failure this
    // check exists to catch.
    if (ok) {
      ok = state === "erreur" ? body.includes(ERROR_MARKER) : !body.includes(ERROR_MARKER);
    }
    if (ok && state === "chargement") ok = body.includes("Chargement");
    // `refus` has to show the refusal, not an empty screen that happens
    // to render: a forced state that renders the happy path is the
    // failure this check exists to catch.
    if (ok && state === "refus") ok = body.includes(DENIED_MARKER);

    row.push(`${state}:${ok ? "ok" : `FAIL(${status})`}`);
    if (!ok) fails += 1;
  }
  console.log(`  ${(path || "/").padEnd(18)} ${row.join("  ")}`);
}

console.log(
  fails === 0
    ? `\nAll four states forceable on all ${PATHS.length} routes · ${LOT_LABEL}.`
    : `\n${fails} failures`,
);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
