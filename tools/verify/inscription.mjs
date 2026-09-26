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
// The map draws OpenStreetMap tiles and geocodes through Nominatim.
// Neither is reachable from a sandboxed runner, and a tile that fails to
// load is not this portal's defect — the component renders and stays
// usable without them. Anything else on the console still fails the run.
const EXTERNAL_MAP = /tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|\/api\/geocode/;
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  // A failed resource logs its message here and its URL in `location()`;
  // a tile server refused by the runner's proxy says only
  // « ERR_TUNNEL_CONNECTION_FAILED » in the text, so both are checked.
  const from = m.location()?.url ?? "";
  if (EXTERNAL_MAP.test(text) || EXTERNAL_MAP.test(from)) return;
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
await shot("1-vous");

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
check("étape 2 · Votre établissement", (await heading()) === "Votre établissement");
await shot("2-etablissement");

// ── Step 2 · the establishment ──
await page.getByLabel("Nom de l'établissement").fill("Le Petit Riad");
await page.locator('button:has-text("Un bar ou lounge")').click();
// « Type de cuisine » and the price band: the two the app's detail
// screen draws under the venue's name and nothing used to ask for.
await page.getByLabel("Type de cuisine").fill("Cocktails d'auteur et mezzés");
const bands = page.locator('[role="radiogroup"][aria-label="Fourchette de prix"] [role="radio"]');
check("quatre niveaux de prix", (await bands.count()) === 4, `${await bands.count()}`);
await bands.nth(2).click();
await page.waitForTimeout(200);
check("le niveau choisi est coché", (await bands.nth(2).getAttribute("aria-checked")) === "true");
// The city is a list of five, not a field: a typed city is five
// spellings of Marrakech in the database by the end of the month.
const cities = await page.getByLabel("Ville").locator("option").allTextContents();
check(
  "la ville se choisit dans une liste",
  ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir"].every((c) => cities.includes(c)),
  cities.join(" · "),
);
await page.getByLabel("Ville").selectOption("Marrakech");
await page.waitForTimeout(300);
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 3 · Adresse", (await heading()) === "Adresse");
await shot("3-adresse");

// ── Step 3 · the quarter, the address and its pin ──
// The quarter comes first, because that is the order the app prints
// them in: its header reads « quartier, ville ».
await page.getByLabel("Quartier").fill("Médina");
await page.getByLabel("Adresse", { exact: true }).fill("45 rue de la Kasbah, Médina");
// The map is real Leaflet now. « Trouver sur la carte » geocodes through
// Nominatim, which a sandboxed runner cannot reach, so the pin is placed
// the other way the screen allows — a click on the map — which is also
// the assertion that the map is interactive rather than a picture.
const carte = page.locator(".leaflet-container");
check("la carte s'affiche", (await carte.count()) > 0);
await carte.click({ position: { x: 140, y: 110 } });
await page.waitForTimeout(500);
check("point posé", (await page.locator('text="Point placé"').count()) > 0);
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 4 · Photos", (await heading()) === "Photos");
await shot("4-photos");

// ── Step 4 · three files, all skippable, and it says so ──
const drops = await page.locator('input[type="file"]').count();
check("couverture, deuxième photo et carte", drops === 3, `${drops} sélecteurs`);
const pdf = await page
  .locator('input[type="file"]')
  .nth(2)
  .getAttribute("accept");
check("la carte accepte un PDF", (pdf ?? "").includes("application/pdf"), pdf ?? "");
const skip = page.locator('button:has-text("Passer cette étape")');
check("l'étape photo peut être passée", (await skip.count()) > 0);
await skip.click();
await page.waitForTimeout(1500);
check("étape 5 · Ambiance et équipements", (await heading()) === "Ambiance et équipements");
await shot("5-ambiance");

// ── Step 5 · the two lists the app draws, and it too can be passed ──
// Scoped to the ambience fieldset: the equipment rows are Radix
// switches, which are also `button[role="switch"]`, and an unscoped
// count is the two lists added together.
const chips = page.locator('fieldset:has(> legend:text-is("Ambiance")) button[role="switch"]');
check("les ambiances sont une liste fermée", (await chips.count()) === 12, `${await chips.count()} puces`);
await chips.first().click();
await page.waitForTimeout(200);
check("une ambiance se coche", (await chips.first().getAttribute("aria-checked")) === "true");
const equipment = page.locator('label:has([role="switch"])');
check("huit équipements", (await equipment.count()) === 8, `${await equipment.count()} lignes`);
for (const label of [
  "Wi-Fi",
  "Réservation recommandée",
  "Cartes de crédit acceptées",
  "Terrasse / extérieur",
  "Déjeuner & dîner servis",
  "Ambiance musique & mixologie",
  "Parking",
  "Accès PMR",
]) {
  check(
    `équipement « ${label} »`,
    (await page.locator(`label:has-text("${label}")`).count()) > 0,
  );
}
const skip5 = page.locator('button:has-text("Passer cette étape")');
check("l'étape ambiance peut être passée", (await skip5.count()) > 0);
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 6 · Horaires", (await heading()) === "Horaires");

// ── Step 6 · the weekly grid ──
const rows = await page.locator('[role="switch"]').count();
check("sept jours", rows === 7, `${rows} interrupteurs`);
const copy = page.locator('button:has-text("Appliquer lundi à tous les jours")');
check("raccourci de copie", (await copy.count()) > 0);
await copy.click();
await page.waitForTimeout(400);
await shot("6-horaires");
await page.locator('button:has-text("Continuer")').first().click();
await page.waitForTimeout(1500);
check("étape 7 · C'est prêt", (await heading()) === "C'est prêt");
await shot("7-cest-pret");

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
check(
  "le type est nommé comme sur la question",
  summary.includes("Bar ou lounge"),
);
// Every new answer has to survive the round trip to the draft and back,
// or the step that collected it was theatre.
check("le récapitulatif porte la cuisine", summary.includes("Cocktails d'auteur et mezzés"));
check("le récapitulatif porte le quartier", summary.includes("Médina"));
// The band names itself in dirhams now, not in euro glyphs: « €€€ »
// asked the partner to guess what three of them meant, and priced a
// Marrakech riad in a currency nobody at the table uses.
check(
  "le récapitulatif porte la fourchette de prix",
  /300 à 500 MAD/.test(summary),
  summary.split("\n").find((l) => /MAD/.test(l)) ?? "",
);
check("et plus aucun glyphe d'euro", !summary.includes("€"), summary.match(/€+/g)?.join(" ") ?? "aucun");
check("le récapitulatif porte l'ambiance", summary.includes("Élégant"));

// ── Step 7 · the establishment exists, and it is theirs ──
await page.locator('button:has-text("Ouvrir mon tableau de bord")').click();
await page.waitForTimeout(3200);
check("atterrit sur l'Accueil", page.url().endsWith("/restaurant"), page.url());
const landing = await heading();
check("salue le nouveau partenaire", landing.includes("Partenaire"), landing);
const aside = (await page.textContent("aside").catch(() => "")) ?? "";
check("la barre latérale nomme l'établissement", aside.includes("Le Petit Riad"));
await shot("8-accueil");

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
    ? `\nLes sept étapes de l'inscription passent · ${LOT_LABEL} · ${width}×${height}.`
    : `\n${problems.length} failures`,
);
process.exit(problems.length === 0 ? 0 : 1);
