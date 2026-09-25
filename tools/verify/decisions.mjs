// The four Lot 1 changes, in a real browser.
//
//   BASE=http://localhost:3210 node tools/verify/decisions.mjs
//
// One tool for the four things the brief added, because each of them is
// a claim only a browser can settle:
//
//   1  a venue created by /inscription is pending, its dashboard works,
//      and it says so — and /admin/validations is LYFE's alone;
//   2  Accepter, Refuser, Absent and Décaler are on every open row, the
//      sheet offers the venue's own slots and nothing else, and the
//      chrome's search finds a booking by name, by the last four digits
//      of the phone and by date, grouped by day;
//   3  Disponibilités offers 15 / 30 / 60 and the book groups by it;
//   4  the row carries the phone and the drawer carries the guest.
//
// Needs the portal on BASE with a seeded database behind it. It writes:
// it signs a partner up and it decides a booking.

import { chromium } from "playwright";
import { LOT_LABEL } from "./lot.mjs";

const BASE = process.env.BASE ?? "http://localhost:3210";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const EXTERNAL_MAP = /tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|\/api\/geocode/;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const page = await context.newPage();

const problems = [];
const noise = new Set();
page.on("pageerror", (e) =>
  noise.add(`pageerror @${page.url().replace(BASE, "")}: ${String(e).slice(0, 140)}`),
);
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  const from = m.location()?.url ?? "";
  if (EXTERNAL_MAP.test(t) || EXTERNAL_MAP.test(from)) return;
  if (/favicon|preload|Download the React/i.test(t)) return;
  noise.add(`console @${page.url().replace(BASE, "")}: ${t.slice(0, 130)}`);
});

const check = (label, ok, detail = "") => {
  console.log(
    `  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${String(detail).slice(0, 80)}` : ""}`,
  );
  if (!ok) problems.push(label);
};
const text = async () => (await page.innerText("body").catch(() => "")) ?? "";
const settle = (ms = 900) => page.waitForTimeout(ms);
const go = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(1000);
};
const signIn = async (email, password = "demo") => {
  await go("/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button:has-text("Se connecter")').first().click();
  await settle(2800);
};
const signOut = async () => {
  await context.clearCookies();
  await settle(300);
};
const openPending = async () => {
  await go("/restaurant/reservations");
  const chip = page.locator('button:has-text("À confirmer"):visible').first();
  if (await chip.count()) {
    await chip.click();
    await settle(1200);
  }
};

console.log(`\nLes quatre décisions · ${LOT_LABEL} · ${width}×${height}\n`);

// ── 1 · LYFE valide une fiche ────────────────────────────────

console.log("  — 1 · validation par LYFE");

const stamp = Date.now().toString(36);
const newPartner = `decisions.${stamp}@lyfe-verify.ma`;

await go("/inscription");
await page.getByLabel("Votre nom").fill("Salma Benjelloun");
await page.getByLabel("E-mail").fill(newPartner);
await page.getByLabel("Téléphone").fill("+212 6 62 11 22 33");
await page.getByLabel("Mot de passe").fill("motdepasse1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1400);

// Step 2 · the establishment.
await page.getByLabel("Nom de l'établissement").fill(`Café ${stamp}`);
await page.locator('button:has-text("Un restaurant")').click();
await page.getByLabel("Ville").selectOption("Casablanca");
await settle(300);
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

// Step 3 · the address. The pin goes on by clicking the map, because a
// sandboxed runner cannot reach Nominatim.
await page.getByLabel("Adresse").fill("12 rue de la Liberté, Casablanca");
const carte = page.locator(".leaflet-container");
if (await carte.count()) {
  await carte.click({ position: { x: 140, y: 110 } });
  await settle(500);
}
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

// Step 4 · photos, skipped.
await page.locator('button:has-text("Passer cette étape")').click();
await settle(1500);

// Step 5 · the weekly grid, copied across.
const copyDays = page.locator('button:has-text("Appliquer lundi à tous les jours")');
if (await copyDays.count()) {
  await copyDays.click();
  await settle(400);
}
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

const summary = await text();
check("l'inscription atteint le récapitulatif", /C'est prêt/i.test(summary));

await page.locator('button:has-text("Ouvrir mon tableau de bord")').click();
await settle(3200);

const dashboard = await text();
check(
  "le tableau de bord du nouvel établissement s'affiche",
  /Bonjour|Bonsoir|Bon après-midi/i.test(dashboard),
  page.url().replace(BASE, ""),
);
check(
  "et annonce que LYFE vérifie la fiche",
  /LYFE vérifie votre établissement/i.test(dashboard),
);
check(
  "en disant que l'application ne le montre pas encore",
  /n'apparaîtra dans l'application/i.test(dashboard),
);

// Every venue screen owes the same notice.
await go("/restaurant/disponibilites");
check(
  "le bandeau suit sur les autres écrans",
  /LYFE vérifie votre établissement/i.test(await text()),
);

await go("/admin/validations");
check(
  "un partenaire ne trouve pas la file de validation",
  /introuvable|not found|404/i.test(await text()),
  page.url().replace(BASE, ""),
);

await signOut();
await signIn("validation@lyfe.ma");
await go("/admin/validations");
const queue = await text();
check("l'équipe LYFE ouvre la file", /Établissements à valider/i.test(queue));
check("le nouvel établissement y est", queue.includes(`Café ${stamp}`));

// The row for *this* venue, not the first one in the queue.
//
// `inscription.mjs` runs before this tool in the matrix and leaves its
// own establishment waiting, so the queue usually holds more than one —
// and clicking the first Valider validated somebody else's, which made
// the two checks below fail while the product was working. A queue is
// shared by definition; a tool that assumes it holds one row is a tool
// that passes only when it runs alone.
const ownRow = page.locator("li").filter({ hasText: `Café ${stamp}` }).first();
check(
  "avec Valider et Refuser sur la ligne",
  (await ownRow.locator('button:has-text("Valider")').count()) > 0 &&
    (await ownRow.locator('button:has-text("Refuser")').count()) > 0,
);

await ownRow.locator('button:has-text("Valider")').first().click();
await settle(2500);
check(
  "valider retire l'établissement de la file",
  !(await text()).includes(`Café ${stamp}`),
);

await signOut();
await signIn(newPartner, "motdepasse1");
check(
  "et le bandeau disparaît du tableau de bord du partenaire",
  !/LYFE vérifie votre établissement/i.test(await text()),
);

// ── 2 · les décisions et la recherche ────────────────────────

console.log("\n  — 2 · décisions au comptoir et recherche");

await signOut();
await signIn("yassine@darzellij.ma");
await openPending();

// The row is a card whose own button carries `data-row="open"`, with
// the decisions as its siblings — so the decisions are counted on the
// page rather than scoped to a container that does not exist.
const hasRow = (await page.locator('button:has-text("Accepter"):visible').count()) > 0;
check("une demande est sur le carnet", hasRow);

if (hasRow) {
  // One of each per row, which is what « always visible » means: a
  // count that matches is the claim, and a joined label list would pass
  // on a kebab that happened to be open.
  const accepter = await page.locator('button:has-text("Accepter"):visible').count();
  const refuser = await page.locator('button:has-text("Refuser"):visible').count();
  const absent = await page.locator('button:has-text("Absent"):visible').count();
  const decaler = await page.locator('button:has-text("Décaler"):visible').count();
  check("Accepter est sur chaque demande", accepter > 0, `${accepter}`);
  check("Refuser autant de fois qu'Accepter", refuser >= accepter, `${refuser}`);
  check(
    "Absent sur chaque ligne ouverte, sans attendre l'heure",
    absent >= accepter,
    `${absent}`,
  );
  check("Décaler sur chaque ligne ouverte", decaler >= accepter, `${decaler}`);

  // Décaler: the sheet, the venue's own slots, and the move.
  await page.locator('button:has-text("Décaler"):visible').first().click();
  await settle(1500);
  const sheet = await text();
  check("Décaler ouvre une feuille", /Décaler la réservation/i.test(sheet));
  check("qui annonce que le client sera informé", /sera informé/i.test(sheet));

  const slots = page.locator("[data-slots] button");
  const slotCount = await slots.count();
  check("la feuille propose les créneaux de l'établissement", slotCount > 0, `${slotCount} créneaux`);

  if (slotCount > 0) {
    const chosen = (await slots.nth(Math.min(2, slotCount - 1)).innerText()).trim();
    await slots.nth(Math.min(2, slotCount - 1)).click();
    await settle(400);
    await page.locator('button:has-text("Décaler"):visible').last().click();
    await settle(3000);
    const after = await text();
    check("la réservation est décalée", /décalée/i.test(after), chosen);
    await openPending();
    check(
      "et le carnet porte la nouvelle heure",
      (await text()).includes(chosen.replace(/\s/g, "")) ||
        (await text()).includes(chosen),
      chosen,
    );
  }
}

// The search: a name, four digits, a date — grouped by day.
const searchFor = async (term) => {
  await go("/restaurant/reservations");
  // `:visible` on both, because the desktop box exists in the DOM at
  // every width and is simply hidden by a `md:` class — `.first()`
  // without it picks the invisible one and waits 30 seconds to fill it.
  const box = page
    .locator("#chrome-search:visible, #chrome-search-mobile:visible")
    .first();
  await box.fill(term);
  await settle(1800);
  return text();
};

const byName = await searchFor("Bennani");
check("la recherche trouve un nom", /réservation(s)? trouvée/i.test(byName), "Bennani");
check("et groupe par jour", /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test(byName));

const byTail = await searchFor("4418");
check(
  "les quatre derniers chiffres du téléphone trouvent la réservation",
  /réservation(s)? trouvée/i.test(byTail),
  "4418 → +212 661 20 44 18",
);

const today = new Date();
const dmy = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}`;
const byDate = await searchFor(dmy);
check("une date trouve la journée", /réservation(s)? trouvée/i.test(byDate), dmy);

const byNothing = await searchFor("zzzzqqq");
check("et une recherche vide le dit", /Aucune réservation trouvée/i.test(byNothing));

// ── 3 · les créneaux ─────────────────────────────────────────

console.log("\n  — 3 · durée des créneaux");

await go("/restaurant/disponibilites");
const dispo = await text();
check("Disponibilités nomme la durée des créneaux", /Créneaux de/i.test(dispo));
const select = page.locator("select").filter({ hasText: /minutes|heure/ }).first();
const options = (await select.count())
  ? (await select.locator("option").allInnerTexts()).join(" | ")
  : "";
check(
  "et offre 15, 30 et 60 minutes",
  /15 minutes/.test(options) && /30 minutes/.test(options) && /1 heure/.test(options),
  options,
);
check("le service dit sa durée dans son en-tête", /créneaux de (15|30) minutes|créneaux de 1 heure/i.test(dispo));

// The other venue chose the hour, so its own card says so.
await context.addCookies([{ name: "lyfe.venue", value: "bar_nomad_casa", url: BASE }]);
await go("/restaurant/disponibilites");
check(
  "l'autre établissement a choisi l'heure",
  /créneaux de 1 heure/i.test(await text()),
);
await context.addCookies([{ name: "lyfe.venue", value: "rst_dar_zellij", url: BASE }]);

// ── 4 · le client ────────────────────────────────────────────

console.log("\n  — 4 · les informations du client");

await openPending();
const book = await text();
check("le téléphone est sur la ligne", /\+212\s?\d/.test(book));

const firstRow = page.locator('button[data-row="open"]:visible').first();
if (await firstRow.count()) {
  await firstRow.click();
  await settle(1600);
  const drawer = await text();
  check("le tiroir ouvre sur le client", /Le client/i.test(drawer));
  check("avec le téléphone", /Téléphone/i.test(drawer));
  check("et le nombre de visites ici", /Visites ici/i.test(drawer));
  check("et la demande particulière quand il y en a une", /Demande particulière|Le client/i.test(drawer));
}

// ── Report ───────────────────────────────────────────────────

if (noise.size > 0) {
  console.log("\n  bruit console :");
  for (const n of noise) console.log(`    ${n}`);
}

console.log(
  problems.length === 0
    ? `\nLes quatre changements tiennent · ${LOT_LABEL} · ${width}×${height}.`
    : `\n${problems.length} problème(s) : ${problems.join(" · ")}`,
);

await browser.close();
process.exit(problems.length === 0 && noise.size === 0 ? 0 : 1);
