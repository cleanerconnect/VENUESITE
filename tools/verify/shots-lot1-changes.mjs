// The two new surfaces, captured for page 09.
//
//   BASE=… SHOTS=docs/lot1-reference node tools/verify/shots-lot1-changes.mjs
//   BASE=… W=390 H=844 SHOTS=docs/lot1-reference node … (the phone pair)
//
// `extract.mjs` records what a *route* renders, and neither of these is
// a route: the validation banner only exists on an establishment that is
// still under review, and the Décaler sheet only exists while a host is
// deciding. So they are driven here, by the same steps a partner and a
// host take.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3210";
const SHOTS = process.env.SHOTS ?? "docs/lot1-reference";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const tag = width <= 480 ? "390" : "1440";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const page = await context.newPage();

const settle = (ms = 1000) => page.waitForTimeout(ms);
const go = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(1200);
};
const signIn = async (email, password = "demo") => {
  await go("/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Se connecter")').first().click();
  await settle(3000);
};
const shot = async (name, full = true) => {
  await page.screenshot({ path: `${SHOTS}/${name}@${tag}.png`, fullPage: full });
  console.log(`  wrote ${SHOTS}/${name}@${tag}.png`);
};

// ── The validation banner ────────────────────────────────────
//
// A fresh signup, because that is the only way to see it: no seeded
// venue is under review, and stamping one in the database would be a
// capture of a state the product cannot reach on its own.

const stamp = Date.now().toString(36);
await go("/inscription");
await page.getByLabel("Votre nom").fill("Salma Benjelloun");
await page.getByLabel("E-mail").fill(`shots.${stamp}@lyfe-verify.ma`);
await page.getByLabel("Téléphone").fill("+212 6 62 11 22 33");
await page.getByLabel("Mot de passe").fill("motdepasse1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

await page.getByLabel("Nom de l'établissement").fill("Le Comptoir Doré");
await page.locator('button:has-text("Un restaurant")').click();
await page.getByLabel("Ville").selectOption("Casablanca");
await settle(300);
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

await page.getByLabel("Adresse").fill("8 boulevard d'Anfa, Casablanca");
const carte = page.locator(".leaflet-container");
if (await carte.count()) {
  await carte.click({ position: { x: 140, y: 110 } });
  await settle(500);
}
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);
await page.locator('button:has-text("Passer cette étape")').click();
await settle(1500);
const copyDays = page.locator('button:has-text("Appliquer lundi à tous les jours")');
if (await copyDays.count()) {
  await copyDays.click();
  await settle(400);
}
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);
await page.locator('button:has-text("Ouvrir mon tableau de bord")').click();
await settle(3200);

await shot("validation-bandeau");

// ── The review queue, as LYFE sees it ────────────────────────

await context.clearCookies();
await signIn("validation@lyfe.ma");
await go("/admin/validations");
await shot("validation-file");

// ── The Décaler sheet ────────────────────────────────────────

await context.clearCookies();
await signIn("yassine@darzellij.ma");
await go("/restaurant/reservations");
const chip = page.locator('button:has-text("À confirmer"):visible').first();
if (await chip.count()) {
  await chip.click();
  await settle(1200);
}
const decaler = page.locator('button:has-text("Décaler"):visible').first();
if (await decaler.count()) {
  await decaler.click();
  await settle(2000);
  // The sheet, not the page behind it: a full-page shot of a dialog is a
  // picture of the dim layer.
  await shot("decaler-feuille", false);
} else {
  console.log("  (aucune demande à décaler — feuille non capturée)");
}

await browser.close();
