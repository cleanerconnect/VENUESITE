// Walks the onboarding flow end to end and reports what broke.
//
//   node tools/verify/inscription.mjs
//   W=390 H=844 node tools/verify/inscription.mjs
//   SHOTS=docs/lot1-reference node tools/verify/inscription.mjs
//
// « Création de Venue » is one of the three nouns in Planning V3's
// Prio 02 row, and it is the only Lot 1 surface with more than one
// screen: six steps, a draft that has to survive the tab closing, and
// an establishment that has to exist at the end. None of that is
// visible to `walk.mjs`, which reads one route at a time — so it has a
// tool of its own.
//
// It writes: every run creates an account and an establishment in
// whatever database the portal is pointed at. Reseed afterwards if the
// dataset is going anywhere (`npm run db:reset`).

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { LOT, LOT_LABEL } from "./lot.mjs";

const BASE = process.env.BASE ?? "http://localhost:3210";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const shots = process.env.SHOTS;
const tag = width <= 480 ? "390" : "1440";
if (shots) mkdirSync(shots, { recursive: true });

// Unique per run: the address is the one thing the flow refuses twice.
const email = `inscription.${Date.now().toString(36)}@lyfe-verify.ma`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width, height } });

const problems = [];
const noise = [];
page.on("pageerror", (e) => noise.push(`pageerror: ${String(e).slice(0, 140)}`));
page.on("console", (m) => {
  if (m.type() === "error") noise.push(`console: ${m.text().slice(0, 140)}`);
});

const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

async function shot(name) {
  if (!shots) return;
  await page.screenshot({ path: `${shots}/inscription-${name}@${tag}.png`, fullPage: true });
}

const heading = async () =>
  ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();

console.log(`\nInscription · ${LOT_LABEL} · ${width}×${height}\n`);

// ── The door ──
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
const door = page.locator('a[href="/inscription"]');
check("Connexion propose l'inscription", (await door.count()) > 0);
if (await door.count()) await door.first().click();
await page.waitForTimeout(1200);
check("étape 1 · Vous", (await heading()) === "Vous", page.url());
await shot("1-vous");

// ── Step 1 · the account ──
await page.getByLabel("Votre nom").fill("Partenaire Vérification");
await page.getByLabel("Adresse e-mail").fill(email);
await page.getByLabel("Téléphone (facultatif)").fill("+212 6 00 00 00 00");
// Eight characters is the whole rule; a shorter one must be refused.
await page.getByLabel("Mot de passe").fill("court");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(900);
check("mot de passe trop court refusé", (await heading()) === "Vous");

await page.getByLabel("Mot de passe").fill("motdepasse1");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1800);
check("étape 2 · Votre établissement", (await heading()) === "Votre établissement");
await shot("2-etablissement");

// ── Step 2 · the establishment ──
await page.getByLabel("Nom de l'établissement").fill("Le Petit Riad");
await page.locator('button:has-text("Un bar")').click();
await page.getByLabel("Ville").fill("Marrakech");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 3 · Adresse", (await heading()) === "Adresse");
await shot("3-adresse");

// ── Step 3 · the address and its pin ──
await page.getByLabel("Adresse").fill("45 rue de la Kasbah, Médina");
await page.locator('button:has-text("Placer")').click();
await page.waitForTimeout(400);
check("point posé", (await page.locator('text="Point placé"').count()) > 0);
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 4 · Photos", (await heading()) === "Photos");
await shot("4-photos");

// ── Step 4 · skippable, and it says so ──
const skip = page.locator('button:has-text("Passer cette étape")');
check("l'étape photo peut être passée", (await skip.count()) > 0);
await skip.click();
await page.waitForTimeout(1500);
check("étape 5 · Horaires", (await heading()) === "Horaires");

// ── Step 5 · the weekly grid ──
const rows = await page.locator('[role="switch"]').count();
check("sept jours", rows === 7, `${rows} interrupteurs`);
const copy = page.locator('button:has-text("Appliquer lundi à tous les jours")');
check("raccourci de copie", (await copy.count()) > 0);
await copy.click();
await page.waitForTimeout(400);
await shot("5-horaires");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 6 · C'est prêt", (await heading()) === "C'est prêt");
await shot("6-cest-pret");

// ── The draft outlives the tab ──
await page.goto(`${BASE}/inscription`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1300);
check(
  "rouvre là où le parcours s'est arrêté",
  (await heading()) === "C'est prêt",
  await heading(),
);
const summary = (await page.textContent("body")) ?? "";
check("le récapitulatif porte les réponses", summary.includes("Le Petit Riad"));

// ── Step 6 · the establishment exists, and it is theirs ──
await page.locator('button:has-text("Ouvrir mon tableau de bord")').click();
await page.waitForTimeout(3200);
check("atterrit sur l'Accueil", page.url().endsWith("/restaurant"), page.url());
const landing = await heading();
check("salue le nouveau partenaire", landing.includes("Partenaire"), landing);
const aside = (await page.textContent("aside").catch(() => "")) ?? "";
check("la barre latérale nomme l'établissement", aside.includes("Le Petit Riad"));
await shot("7-accueil");

// A new venue has no bookings; the dashboard has to say so rather than
// break. This is the assertion that would have caught a missing service
// row, which is the one way this endpoint fails silently.
const body = (await page.textContent("body")) ?? "";
check(
  "l'Accueil d'un établissement vide s'affiche",
  !/Cette page n'a pas pu charger/.test(body),
);

await browser.close();

if (noise.length) {
  console.log(`\n${noise.length} message(s) de console :`);
  for (const line of [...new Set(noise)].slice(0, 5)) console.log(`  ${line}`);
}

console.log(
  problems.length === 0
    ? `\nLes six étapes de l'inscription passent · ${LOT_LABEL} · ${width}×${height}.`
    : `\n${problems.length} failures`,
);
process.exit(problems.length === 0 ? 0 : 1);
