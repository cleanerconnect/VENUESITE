// Walks the account creation and reports what broke.
//
//   node tools/verify/inscription.mjs
//   W=390 H=844 node tools/verify/inscription.mjs
//   SHOTS=docs/lot1-reference node tools/verify/inscription.mjs
//
// « Création de Venue » is one of the three nouns in Planning V3's
// Prio 02 row, and since DigiNegoce's 27 October decision it is two
// walks rather than one: an account, and then — from inside the
// dashboard it belongs to — the establishment. This tool owns the
// first, plus the screen between them. `journey.mjs` owns the second.
//
// What the split moved out of here: five steps, the draft that had to
// survive a closed tab, and the establishment at the end. All of that
// is still verified, in `journey.mjs`, where the partner is signed in
// and the flow can actually be resumed — which is the whole reason the
// steps moved.
//
// It writes: every run creates an account in whatever database the
// portal is pointed at. Reseed afterwards if the dataset is going
// anywhere (`npm run db:reset`).

import { chromiumOrExplain } from "./browser.mjs";
import { mkdirSync } from "node:fs";
import { LOT, LOT_LABEL, clockLine, requireWrites } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// This tool writes. Against the static driver there is nothing to
// write to, so it says so and stops rather than failing.
await requireWrites(BASE, "L'inscription d'un partenaire");
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
  if (m.type() !== "error") return;
  const text = m.text();
  const from = m.location()?.url ?? "";
  // Chromium probes `/favicon.ico` whatever a `<link rel="icon">`
  // points at, and logs a bare « Failed to load resource » for it.
  if (/favicon|preload|Download the React/i.test(text)) return;
  if (/favicon/i.test(from)) return;
  noise.push(`console: ${text.slice(0, 140)}`);
});

const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

async function shot(name) {
  if (!shots) return;
  await page.screenshot({ path: `${shots}/inscription-${name}@${tag}.png`, fullPage: true });
}

// ── Le pli ──
//
// Chaque écran doit tenir dans une fenêtre : la passe responsive de la
// revue demande l'action principale et le contenu principal dans le
// premier écran, sans défilement. Vérifié à la largeur où le tool
// tourne, donc `W=390 H=844` le vérifie sur un téléphone et
// `W=1024 H=768` sur une tablette couchée — les deux écrans les plus
// courts de la liste.
//
// Il n'y a pas d'exception, et il y en avait deux : les deux étapes les
// plus chargées de l'ancienne route. Le bouton a quitté la carte — il
// est épinglé au bas de la fenêtre, comme la barre d'enregistrement de
// Ma fiche — donc la règle vaut telle quelle, sans liste de dispenses.
const folds = [];
// `selector` names the action when it is not a button: `/choisir` has
// no « Continuer » — its action is the last of the three cards, and the
// rule the fold is about is that a partner sees all three without
// scrolling.
const fold = async (name, selector = null) => {
  const m = await page.evaluate((sel) => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.height > 1 && r.width > 1 ? r : null;
    };
    const candidates = sel
      ? [...document.querySelectorAll(sel)]
      : [...document.querySelectorAll("button")].filter((b) =>
          /^(Continuer|Choisir mon espace|Terminer|Envoyer)/.test(
            (b.textContent ?? "").trim(),
          ),
        );
    const cta = candidates
      .map(visible)
      .filter(Boolean)
      .sort((a, b) => b.bottom - a.bottom)[0];
    const doc = document.documentElement;
    return {
      action: cta ? Math.round(cta.bottom) : null,
      fold: window.innerHeight,
      page: Math.round(doc.scrollHeight),
      overflow: Math.round(doc.scrollWidth - doc.clientWidth),
    };
  }, selector);
  folds.push(`${name} ${m.action ?? "—"}/${m.fold} · page ${m.page}`);
  check(
    `${name} · l'action principale est dans l'écran`,
    m.action != null && m.action <= m.fold,
    `${m.action} sur ${m.fold}`,
  );
  check(`${name} · rien ne déborde en largeur`, m.overflow <= 2, `${m.overflow}px`);
};

const heading = async () =>
  ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();

console.log(`\nInscription · ${LOT_LABEL} · ${width}×${height} · ${clockLine()}\n`);

// ── The door ──
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
const door = page.locator('a[href="/inscription"]');
check("Connexion propose l'inscription", (await door.count()) > 0);
if (await door.count()) await door.first().click();
await page.waitForTimeout(1200);
check("étape 1 · Vous", (await heading()) === "Vous", page.url());
await fold("étape 1");
await shot("1-vous");

// The step asks who you are, and nothing about a room. That is the
// 27 October decision, and it is an assertion rather than a comment:
// a venue field back on this step would mean the split was undone.
const stepOne = await page.innerText("body");
check(
  "l'étape ne demande rien sur l'établissement",
  !/Nom de l'établissement|Un bar ou lounge|Type de cuisine/.test(stepOne),
);
check(
  "la barre de progression a deux segments",
  (await page.locator("[data-progress]").first().getAttribute("data-progress")) === "2",
  (await page.locator("[data-progress]").first().getAttribute("data-progress")) ?? "aucune",
);

// ── Step 1 · the account ──
await page.getByLabel("Votre nom").fill("Partenaire Vérification");
await page.getByLabel("Adresse e-mail").fill(email);
await page.getByLabel("Téléphone", { exact: true }).fill("+212 6 00 00 00 00");
// Eight characters is the whole rule; a shorter one must be refused.
await page.getByLabel("Mot de passe", { exact: true }).fill("court");
await page.getByLabel("Confirmation du mot de passe").fill("court");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(900);
check("mot de passe trop court refusé", (await heading()) === "Vous");

// Row 39 asks for the password twice, so two that disagree must be
// refused as well — otherwise the second field is decoration.
await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
await page.getByLabel("Confirmation du mot de passe").fill("motdepasse2");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(900);
check("confirmation différente refusée", (await heading()) === "Vous");

await page.getByLabel("Confirmation du mot de passe").fill("motdepasse1");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1800);

// ── Step 2 · the confirmation, and it confirms one thing ──
check("étape 2 · Votre compte est créé", (await heading()) === "Votre compte est créé");
await fold("étape 2");
await shot("2-compte-cree");
const confirmation = await page.innerText("body");
check("elle dit que le compte existe", /Votre compte est créé/.test(confirmation));
check(
  "elle ne récapitule aucun établissement",
  !/Le Petit Riad|6 jours par semaine|1 photo/.test(confirmation),
);

// The draft the account carries outlives the tab, as it always did —
// reopening `/inscription` must not send a partner back to step 1.
await page.goto(`${BASE}/inscription`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1300);
check(
  "rouvre là où le parcours s'est arrêté",
  (await heading()) === "Votre compte est créé",
  await heading(),
);

// ── The chooser ──
await page.locator('button:has-text("Choisir mon espace")').click();
await page.waitForTimeout(2600);
check("mène à l'écran de choix", new URL(page.url()).pathname === "/choisir", page.url());
check(
  "« Que voulez-vous gérer sur LYFE ? »",
  /Que voulez-vous gérer sur LYFE/.test(await heading()),
  await heading(),
);
await fold("choisir", "[data-dashboard]");
await shot("3-choisir");

const cards = page.locator("[data-dashboard]");
check("trois cartes", (await cards.count()) === 3, `${await cards.count()}`);
const chooser = await page.innerText("body");
for (const label of ["Restaurant", "Bar ou lounge", "Événements"]) {
  check(`carte « ${label} »`, chooser.includes(label));
}
// A brand new account holds nothing, so all three are offers. « Actif ·
// ouvrir » here would mean the screen is reading something other than
// the session.
const actions = await cards.allTextContents();
check(
  "les trois sont proposées, aucune active",
  actions.every((a) => a.trim() === "Ajouter"),
  actions.join(" · "),
);
const actives = await page.locator('[data-active="1"]').count();
check("et aucune n'est marquée active", actives === 0, `${actives}`);

// Each card goes where the flow that creates it lives, and the two
// venue cards carry the hint the creation flow reads at step 2.
const hrefs = {};
for (const id of ["restaurant", "bar", "events"]) {
  hrefs[id] =
    (await page
      .locator(`a:has([data-dashboard="${id}"])`)
      .first()
      .getAttribute("href")
      .catch(() => "")) ?? "";
}
check(
  "la carte Restaurant ouvre la création avec son indication",
  hrefs.restaurant === "/restaurant/etablissement/nouveau?type=restaurant",
  hrefs.restaurant,
);
check(
  "la carte Bar ouvre la même création, autre indication",
  hrefs.bar === "/restaurant/etablissement/nouveau?type=bar",
  hrefs.bar,
);
check(
  "la carte Événements garde son propre parcours",
  hrefs.events === "/onboarding",
  hrefs.events,
);

// ── The dashboard behind the card, before there is a venue ──
await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1600);
check(
  "l'Accueil sans établissement s'affiche",
  (await page.locator("[data-empty-dashboard]").count()) > 0,
  page.url(),
);
// Scoped to the card: « Créer mon établissement » is also the sidebar's
// one entry, so an unscoped match would pass on a card that is not
// there — which is how the first run of this tool reported the state as
// drawn while the card itself was throwing.
const card = page.locator("[data-empty-dashboard]");
const empty = (await card.innerText().catch(() => "")) ?? "";
check(
  "il porte la phrase de la décision",
  /Votre espace est prêt\. Créez votre établissement pour recevoir vos premières réservations/.test(
    empty,
  ),
  empty.replace(/\s+/g, " ").slice(0, 60),
);
const inside = await card.locator("a, button").count();
check("et un seul bouton", inside === 1, `${inside} dans la carte`);
// The sidebar is reduced to what there is to do. A Réservations entry
// here is a link to a book that does not exist.
if (width > 1024) {
  const aside = (await page.textContent("aside").catch(() => "")) ?? "";
  check(
    "la barre latérale ne propose que l'Accueil et la création",
    /Créer mon établissement/.test(aside) && !/Réservations|Check-in|Ma fiche/.test(aside),
    aside.replace(/\s+/g, " ").slice(0, 80),
  );
}
await shot("4-accueil-vide");

// The other screens cannot be opened: each one redirects rather than
// rendering a dashboard for a venue that is not there. The last two are
// Lot 2 routes, so they are only asked for there — a `404` from the lot
// gate is a different answer, and a correct one.
const siblings = [
  "/restaurant/reservations",
  "/restaurant/check-in",
  "/restaurant/ma-fiche",
  ...(LOT === 2 ? ["/restaurant/menu", "/restaurant/equipe"] : []),
];
for (const path of siblings) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1100);
  check(
    `${path} ramène à l'Accueil`,
    new URL(page.url()).pathname === "/restaurant",
    page.url(),
  );
}

await browser.close();

if (noise.length) {
  console.log(`\n${noise.length} message(s) de console :`);
  for (const line of [...new Set(noise)].slice(0, 5)) console.log(`  ${line}`);
}

console.log(`\nL'action principale et le pli, écran par écran :`);
for (const line of folds) console.log(`  ${line}`);

console.log(
  problems.length === 0
    ? `\nLe compte, l'écran de choix et l'Accueil vide passent · ${LOT_LABEL} · ${width}×${height}.`
    : `\n${problems.length} failures`,
);
process.exit(problems.length === 0 ? 0 : 1);
