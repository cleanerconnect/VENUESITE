// Part D of the acceptance audit, in a browser.
//
//   BASE=http://localhost:3230 node tools/verify/_stress.mjs
//
// Adversarial, not confirmatory: every case here is a way a real
// session goes wrong or a way someone tries to get somewhere they are
// not. Each prints « cas · attendu · observé · verdict ».
//
// Needs a seeded database behind BASE. It writes.

import { chromiumOrExplain } from "./browser.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3230";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

const results = [];
const record = (id, label, expected, observed, ok) => {
  results.push({ id, label, expected, observed, ok });
  console.log(`${ok ? "ok  " : "✗   "} ${id}  ${label}`);
  console.log(`        attendu : ${expected}`);
  console.log(`        observé : ${observed}`);
};

async function fresh(email = "yassine@darzellij.ma", password = "demo") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);
  return { context, page };
}

const body = (page) => page.locator("body").innerText();

// ── D-5 · Authentification et autorisation ──────────────────

// A5 · a hand-written venue cookie
{
  const { context, page } = await fresh();
  await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: "rst_dar_zellij" },
  });
  await context.addCookies([
    { name: "lyfe.venue", value: "bar_nomad_casa", url: BASE },
  ]);
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const text = await body(page);
  record(
    "D5-a",
    "cookie d'établissement écrit à la main",
    "ignoré — le portail reste sur Dar Zellij",
    /Nomad/.test(text) ? "le portail a ouvert Bar Nomad" : "resté sur Dar Zellij",
    !/Nomad/.test(text),
  );
  await context.close();
}

// A5b · a hand-written identity cookie
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR" });
  const page = await context.newPage();
  await context.addCookies([
    { name: "lyfe.session.present", value: "1", url: BASE },
    { name: "lyfe.user", value: "usr_yassine", url: BASE },
  ]);
  const response = await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const url = page.url();
  record(
    "D5-b",
    "cookie d'identité écrit à la main",
    "renvoyé vers /login — la signature manque",
    `${response?.status() ?? "?"} · ${url}`,
    /\/login/.test(url),
  );
  await context.close();
}

// A4 · the LYFE-only route with a partner session
{
  const { context, page } = await fresh();
  const response = await page.goto(`${BASE}/admin/validations`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const text = await body(page);
  const leaked = /file de validation|Valider/i.test(text);
  record(
    "D5-c",
    "/admin/validations avec une session partenaire",
    "refusé — la file n'apparaît pas",
    leaked ? "la file est visible" : `${response?.status() ?? "?"} · ${text.slice(0, 70).replace(/\n/g, " ")}`,
    !leaked,
  );
  await context.close();
}

// A1 · a session that died with a form open
{
  const { context, page } = await fresh();
  await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: "rst_dar_zellij" } });
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const field = page.getByLabel("Nom du lieu");
  await field.fill("Dar Zellij (session morte)");
  // The session dies between the typing and the save.
  await context.clearCookies();
  const save = page.locator('button:has-text("Enregistrer")').first();
  await save.click();
  await page.waitForTimeout(2500);
  const text = await body(page);
  const said = /session/i.test(text);
  const kept = (await field.inputValue()).includes("session morte");
  record(
    "D5-d",
    "session expirée pendant une écriture",
    "un message en français, et la saisie reste à l'écran",
    `message ${said ? "présent" : "absent"} · saisie ${kept ? "conservée" : "perdue"}`,
    said && kept,
  );
  await context.close();
}

// A2 · a staff account on an owner's form
{
  const { context, page } = await fresh("imane@darzellij.ma");
  await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: "rst_dar_zellij" } });
  await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const field = page.getByLabel("Nom du lieu");
  const exists = (await field.count()) > 0;
  let observed = "l'onglet Identité n'est pas rendu";
  let ok = true;
  if (exists) {
    await field.fill("Dar Zellij (par le personnel)");
    await page.locator('button:has-text("Enregistrer")').first().click();
    await page.waitForTimeout(2200);
    const text = await body(page);
    ok = /rôle|permet pas|autoris/i.test(text);
    observed = ok
      ? "refusé, avec la raison"
      : `accepté · ${text.slice(0, 90).replace(/\n/g, " ")}`;
  }
  record("D5-e", "compte « staff » sur un formulaire du propriétaire", "refusé", observed, ok);
  await context.close();
}

// A7 · a password list against one address
{
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  let refused = 0;
  let attempts = 0;
  const started = Date.now();
  // Twelve wrong passwords on one address, which is what a list looks
  // like. The ceiling is ten a minute.
  for (let i = 0; i < 12; i += 1) {
    await page.fill('input[type="email"]', "yassine@darzellij.ma");
    await page.fill('input[type="password"]', `guess-${i}`);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(400);
    attempts += 1;
    const text = await body(page);
    if (/Trop de tentatives/i.test(text)) refused += 1;
  }
  record(
    "D5-f",
    "douze mots de passe faux sur une adresse, en moins d'une minute",
    "les tentatives au-delà du plafond sont refusées comme telles",
    `${refused} refus sur ${attempts} en ${Math.round((Date.now() - started) / 100) / 10}s`,
    refused > 0,
  );
  await context.close();
}

// A7b · and the right password still works afterwards, from elsewhere
{
  const { context, page } = await fresh("rachid@darzellij.ma");
  const text = await body(page);
  record(
    "D5-h",
    "un autre partenaire pendant le blocage du premier",
    "se connecte normalement — le plafond est par adresse",
    /Quel lieu|Vue d'ensemble|Bonjour|Bonsoir|Bon /i.test(text)
      ? "connecté"
      : text.slice(0, 80).replace(/\n/g, " "),
    !/Trop de tentatives/i.test(text),
  );
  await context.close();
}

// A6 · the password reset, end to end
{
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "yassine@darzellij.ma");
  await page.locator('button:has-text("Mot de passe oublié")').click();
  await page.waitForTimeout(1500);
  const text = await body(page);
  const honest = /Nous contacter|n'est pas reliée|réinitialisation vient d'être envoyé/.test(text);
  const lies = /vient d'être envoyé/.test(text);
  record(
    "D5-g",
    "« Mot de passe oublié ? » sans service de messagerie",
    "dit où écrire, et ne promet pas un e-mail",
    lies ? "promet un lien envoyé" : text.match(/[^\n]*(Nous contacter|reliée)[^\n]*/)?.[0]?.slice(0, 110) ?? "aucun message",
    honest && !lies,
  );
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} cas conformes`);
if (failed.length) console.log("échecs : " + failed.map((r) => r.id).join(", "));
