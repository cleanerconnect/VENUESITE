// Forces the three demo states on every venue screen.
//
// `?etat=chargement|vide|erreur` exists so an external team can *see*
// what a slow load, an empty venue and a failed read look like. States
// nobody can reach are states nobody maintains, so this checks that all
// three are reachable on all thirty screens rather than on the four
// somebody remembered to wire.
//
//   node tools/verify/states.mjs

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3210";
const ERROR_MARKER = "Cette page n'a pas pu charger";

const PATHS = ["", "/reservations", "/calendrier", "/liste-attente", "/check-in",
  "/briefing", "/clients", "/clients/cus_1", "/segments", "/ma-fiche", "/menu",
  "/avis", "/visibilite", "/offres", "/experiences", "/guest-list", "/tables",
  "/promoteurs", "/acomptes", "/annulations", "/lyfe-pay", "/performance",
  "/bilans", "/campagnes", "/disponibilites", "/equipe", "/notifications",
  "/parametres", "/abonnement", "/support"];

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
  for (const state of ["chargement", "vide", "erreur"]) {
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

    row.push(`${state}:${ok ? "ok" : `FAIL(${status})`}`);
    if (!ok) fails += 1;
  }
  console.log(`  ${(path || "/").padEnd(18)} ${row.join("  ")}`);
}

console.log(
  fails === 0
    ? `\nAll three states forceable on all ${PATHS.length} routes.`
    : `\n${fails} failures`,
);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
