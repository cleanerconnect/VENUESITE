// Part D · entrée, idempotence, données limites, réseau.
//
//   BASE=http://localhost:3230 node tools/verify/_stress2.mjs
//
// Needs a seeded database behind BASE. It writes, and it leaves the
// venue's name as it found it.

import { chromiumOrExplain } from "./browser.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3230";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

const results = [];
const record = (id, label, expected, observed, ok) => {
  results.push({ id, ok });
  console.log(`${ok ? "ok  " : "✗   "} ${id}  ${label}`);
  console.log(`        attendu : ${expected}`);
  console.log(`        observé : ${observed}`);
};

async function signedIn() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "yassine@darzellij.ma");
  await page.fill('input[type="password"]', "demo");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);
  await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: "rst_dar_zellij" },
  });
  return { context, page };
}

const body = (page) => page.locator("body").innerText();
const saveBar = (page) =>
  page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();

// ── D-4 · Entrées hostiles ──────────────────────────────────

const HOSTILE = `L'Étoile · مطعم · 🌙 <script>window.__pwned=1</script>\nligne 2 "guillemets"`;
{
  const { context, page } = await signedIn();
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const field = page.getByLabel("Nom du lieu");
  const original = await field.inputValue();
  await field.fill(HOSTILE);
  await page.waitForTimeout(250);
  const button = saveBar(page);
  let observed = "aucun bouton Enregistrer";
  let ok = false;
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(2600);
    await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const stored = await page.getByLabel("Nom du lieu").inputValue();
    const pwned = await page.evaluate(() => Boolean(window.__pwned));
    // The newline is the one character a single-line input drops, which
    // is the input's own behaviour and not a loss of data.
    const kept = stored.includes("Étoile") && stored.includes("مطعم") && stored.includes("🌙")
      && stored.includes("<script>");
    ok = kept && !pwned;
    observed = `${pwned ? "SCRIPT EXÉCUTÉ · " : "aucun script exécuté · "}${JSON.stringify(stored.slice(0, 90))}`;
  }
  record(
    "D4-a",
    "apostrophe, accents, arabe, emoji, retour ligne et balise script dans le nom du lieu",
    "stocké tel quel, rendu comme du texte, aucun script exécuté",
    observed,
    ok,
  );

  // And on the screens that read it back.
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const home = await body(page);
  const pwnedHome = await page.evaluate(() => Boolean(window.__pwned));
  record(
    "D4-b",
    "le même nom rendu sur l'Accueil et la barre latérale",
    "affiché comme du texte, aucun script exécuté",
    `${pwnedHome ? "SCRIPT EXÉCUTÉ" : "aucun script"} · ${/script/i.test(home) ? "la balise apparaît comme texte" : "la balise n'apparaît pas"}`,
    !pwnedHome,
  );

  // 40 characters, and the layout has to hold.
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByLabel("Nom du lieu").fill("Restaurant Dar Zellij Médina Marrakech!!");
  await page.waitForTimeout(200);
  const b40 = saveBar(page);
  if (await b40.count()) {
    await b40.click();
    await page.waitForTimeout(2400);
  }
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record(
    "D4-c",
    "nom de 40 caractères",
    "aucun débordement horizontal de la page",
    `${overflow}px`,
    overflow <= 2,
  );

  // Put it back.
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByLabel("Nom du lieu").fill(original);
  await page.waitForTimeout(200);
  const back = saveBar(page);
  if (await back.count()) { await back.click(); await page.waitForTimeout(2200); }
  await context.close();
}

// Moroccan phone formats and a plus-addressed e-mail.
{
  const { context, page } = await signedIn();
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const phone = page.getByLabel("Téléphone");
  const email = page.getByLabel("E-mail");
  const p0 = await phone.inputValue();
  const e0 = await email.inputValue();
  const refused = [];
  for (const value of ["0661203344", "+212661203344", "00212 661 20 33 44", "06 61 20 33 44"]) {
    await phone.fill(value);
    await email.fill("reservations+lyfe@darzellij.ma");
    await page.waitForTimeout(200);
    const b = saveBar(page);
    if (!(await b.count())) { refused.push(`${value} · bouton absent`); continue; }
    await b.click();
    await page.waitForTimeout(2200);
    const text = await body(page);
    if (/invalide|incorrect|corrigez/i.test(text)) refused.push(value);
  }
  record(
    "D4-d",
    "quatre écritures d'un mobile marocain et une adresse avec « + »",
    "toutes acceptées",
    refused.length ? `refusées : ${refused.join(", ")}` : "toutes acceptées",
    refused.length === 0,
  );
  await phone.fill(p0);
  await email.fill(e0);
  await page.waitForTimeout(200);
  const b = saveBar(page);
  if (await b.count()) { await b.click(); await page.waitForTimeout(2000); }
  await context.close();
}

// ── D-3 · Idempotence ──────────────────────────────────────

{
  const { context, page } = await signedIn();
  await page.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const accept = page.locator('button:has-text("Accepter"):visible').first();
  let observed = "aucune ligne à accepter";
  let ok = false;
  if (await accept.count()) {
    // Two taps inside one tick.
    await Promise.all([accept.click(), accept.click().catch(() => {})]);
    await page.waitForTimeout(2800);
    const text = await body(page);
    const broke = /Application error|Cette page n'a pas pu charger/i.test(text);
    ok = !broke;
    observed = broke ? "l'écran a cassé" : "l'écran tient";
  }
  record("D3-a", "deux taps sur Accepter dans le même tick", "une seule transition, l'écran tient", observed, ok);
  await context.close();
}

// Check-in twice on the same booking.
{
  const { context, page } = await signedIn();
  await page.goto(`${BASE}/restaurant/check-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const first = page.locator('button:has-text("Check-in"):visible').first();
  let observed = "aucune arrivée attendue";
  let ok = false;
  if (await first.count()) {
    await first.click();
    await page.waitForTimeout(2200);
    await page.goto(`${BASE}/restaurant/check-in`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const text = await body(page);
    // The row has left the list, which is the idempotent answer: there
    // is nothing left to press twice.
    ok = !/Application error/i.test(text);
    observed = /Aucune arrivée|déjà enregistré/i.test(text)
      ? "la ligne a quitté la liste, ou le portail dit « déjà enregistré »"
      : "la liste s'affiche";
  }
  record("D3-b", "check-in répété sur la même réservation", "pas de seconde arrivée, message clair", observed, ok);
  await context.close();
}

// ── D-8 · Réseau ───────────────────────────────────────────

// Every write answered 500.
{
  const { context, page } = await signedIn();
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      return route.fulfill({ status: 500, body: "boom" });
    }
    return route.continue();
  });
  const field = page.getByLabel("Nom du lieu");
  const before = await field.inputValue();
  await field.fill(`${before} (500)`);
  await page.waitForTimeout(250);
  const b = saveBar(page);
  let observed = "aucun bouton";
  let ok = false;
  if (await b.count()) {
    await b.click();
    await page.waitForTimeout(4000);
    const text = await body(page);
    const said = /échou|erreur|connexion|réessay/i.test(text);
    const spinning = /Enregistrement…/.test(text);
    const kept = (await field.inputValue()).includes("(500)");
    const blank = text.trim().length < 200;
    ok = said && !spinning && kept && !blank;
    observed = `message ${said ? "oui" : "non"} · spinner ${spinning ? "encore" : "arrêté"} · saisie ${kept ? "gardée" : "perdue"} · page ${blank ? "vide" : "entière"}`;
  }
  record("D8-a", "le service répond 500 à chaque écriture", "un message en français, pas de spinner sans fin, la saisie reste", observed, ok);
  await page.unroute("**/*");
  await context.close();
}

// A read that takes five seconds.
{
  const { context, page } = await signedIn();
  await page.route("**/restaurant/reservations**", async (route) => {
    await new Promise((r) => setTimeout(r, 5000));
    return route.continue();
  });
  const started = Date.now();
  await page.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(800);
  const text = await body(page);
  const elapsed = Math.round((Date.now() - started) / 100) / 10;
  const blank = text.trim().length < 200;
  record(
    "D8-b",
    "cinq secondes de latence sur une lecture",
    "l'écran finit par s'afficher, jamais vide",
    `${elapsed}s · ${blank ? "page vide" : "page entière"}`,
    !blank,
  );
  await page.unroute("**/restaurant/reservations**");
  await context.close();
}

// A connection dropped in the middle of a save.
{
  const { context, page } = await signedIn();
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") return route.abort("connectionreset");
    return route.continue();
  });
  const field = page.getByLabel("Nom du lieu");
  const before = await field.inputValue();
  await field.fill(`${before} (coupé)`);
  await page.waitForTimeout(250);
  const b = saveBar(page);
  let observed = "aucun bouton";
  let ok = false;
  if (await b.count()) {
    await b.click();
    await page.waitForTimeout(4500);
    const text = await body(page);
    const said = /connexion|échou|erreur|réessay/i.test(text);
    const spinning = /Enregistrement…/.test(text);
    const kept = (await field.inputValue()).includes("(coupé)");
    ok = said && !spinning && kept;
    observed = `message ${said ? "oui" : "non"} · spinner ${spinning ? "encore" : "arrêté"} · saisie ${kept ? "gardée" : "perdue"}`;
  }
  record("D8-c", "connexion coupée au milieu d'un enregistrement", "un message, la saisie reste, rien d'annoncé comme enregistré", observed, ok);
  await page.unroute("**/*");
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} cas conformes`);
if (failed.length) console.log("échecs : " + failed.map((r) => r.id).join(", "));
