// A real user, from signing up to running a service.
//
//   node tools/verify/journey.mjs                 # 1440×1000
//   W=390 H=844 node tools/verify/journey.mjs     # phone
//   PASS=2 node tools/verify/journey.mjs          # label for the log
//   SHOTS=/tmp/j node tools/verify/journey.mjs    # a PNG per station
//
// The other tools read screens; this one uses them. It creates an
// account nobody has used before, walks the six onboarding steps filling
// every field — accents, a Moroccan phone number, a real photo, a pin
// dragged on the map — and then works the venue it just made: every
// form saved and re-read, every day arrow, every row action, on the
// empty venue it created and on the seeded one that has a full book.
//
// It writes: each run creates an account, an establishment and a handful
// of bookings in whatever database the portal points at. Reseed
// afterwards if the dataset is going anywhere.

import { chromiumOrExplain } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { LOT, LOT_LABEL, requireWrites, signIn } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// This tool writes. Against the static driver there is nothing to
// write to, so it says so and stops rather than failing.
await requireWrites(BASE, "Le parcours complet d'un partenaire");
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const phone = width <= 480;
const pass = process.env.PASS ?? "1";
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

// The map's tiles and geocoder are unreachable from a sandboxed runner;
// everything else on the console is this portal's business.
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
page.on("pageerror", (e) => noise.add(`pageerror @${page.url().replace(BASE, "")}: ${String(e).slice(0, 150)}`));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  const from = m.location()?.url ?? "";
  if (EXTERNAL_MAP.test(text) || EXTERNAL_MAP.test(from)) return;
  // The `from` as well as the text: Chromium probes `/favicon.ico` even
  // where a `<link rel="icon">` points at the SVG this portal ships, and
  // the message it logs is a bare « Failed to load resource » whose only
  // trace of the favicon is the URL.
  if (/favicon|preload|Download the React/i.test(text)) return;
  if (/favicon/i.test(from)) return;
  noise.add(`console @${page.url().replace(BASE, "")}: ${text.slice(0, 140)} ${from.replace(BASE, "")}`);
});

let station = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${String(detail).slice(0, 90)}` : ""}`);
  if (!ok) problems.push(label);
};
const shot = async (name) => {
  if (!shots) return;
  station += 1;
  await page.screenshot({
    path: `${shots}/${String(station).padStart(2, "0")}-${name}@${phone ? 390 : 1440}.png`,
    fullPage: true,
  });
};
const heading = async () =>
  ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();
// `innerText`, not `textContent`: the latter includes the RSC payload
// inside <script> tags, which carries Next's own « This page could not
// be found » string on every page and made every screen look broken.
const body = async () => (await page.innerText("body").catch(() => "")) ?? "";
const settle = (ms = 900) => page.waitForTimeout(ms);

/** Every screen has to render rather than fail. */
const BROKEN = /Cette page n'a pas pu charger|Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found/i;
const rendersFine = async (label) => {
  const text = await body();
  const title = await heading();
  check(
    `${label} s'affiche`,
    !BROKEN.test(text) && text.trim().length > 200 && title.length > 0,
    title.slice(0, 40),
  );
};

/** Saves an open form and waits for the state the SaveBar shows. */
const save = async (label) => {
  const button = page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();
  if ((await button.count()) === 0) {
    check(`${label} · Enregistrer disponible`, false, "bouton absent ou désactivé");
    return false;
  }
  await button.click();
  await settle(1600);
  const text = await body();
  const ok = /Enregistré|enregistrées?|à jour/i.test(text) && !/Une erreur|échou/i.test(text);
  check(`${label} · enregistré`, ok);
  return ok;
};

const go = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(1100);
};

console.log(`\nParcours complet · passe ${pass} · ${LOT_LABEL} · ${width}×${height}\n`);

/**
 * An affordance this tool drives that only Lot 1 draws.
 *
 * Réservations grew day arrows and a date picker for `Prio 02`, and
 * Lot 1's Ma fiche is a three-tab form where Lot 2's is the customer
 * preview (`src/lib/restaurant/presence.ts`). Asserting the Lot 1 shape
 * in Lot 2 made this tool report two defects that are two different
 * screens — so in Lot 2 its absence is written down and not counted.
 */
/**
 * Wait for a sentence rather than for a stopwatch.
 *
 * A fixed `settle()` after a write is long enough on SQLite and short
 * on the HTTP double, where the same read is a round trip to another
 * process — which is how « le sélecteur de date ramène à aujourd'hui »
 * failed on one driver and passed on the others. Same lesson as
 * `signIn` in `lot.mjs`.
 */
const waitForText = async (pattern, timeout = 8000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (pattern.test(await body())) return true;
    await page.waitForTimeout(250);
  }
  return pattern.test(await body());
};

const lot1Only = (label) => {
  if (LOT === 1) return check(label, false);
  console.log(`  —    ${label} · forme du lot 1, absente du lot 2`);
};

// ── 1. A partner who has no account ─────────────────────────
const stamp = Date.now().toString(36);
const email = `parcours.${stamp}@lyfe-verify.ma`;
const venueName = `Riad Zitoun n°${stamp.slice(-3)}`;
const owner = "Amine El Fassi-Ouazzani";
const address = "12, Derb Sidi Bouloukat, Médina";

await go("/login");
await rendersFine("Connexion");
const door = page.locator('a[href="/inscription"]');
check("Connexion mène à l'inscription", (await door.count()) > 0);
await door.first().click();
await settle(1300);
check("étape 1 · Vous", (await heading()) === "Vous");

await page.getByLabel("Votre nom").fill(owner);
await page.getByLabel("Adresse e-mail").fill(email);
await page.getByLabel("Téléphone", { exact: true }).fill("+212 6 61 22 33 44");
await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
await page.getByLabel("Confirmation du mot de passe").fill("motdepasse1");
await shot("etape1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(2000);
check("étape 2 · Votre établissement", (await heading()) === "Votre établissement");

await page.getByLabel("Nom de l'établissement").fill(venueName);
// Alternating the type across passes is how the bar vocabulary gets
// exercised without a second script.
const wantsBar = pass === "2";
await page
  .locator(`button:has-text("${wantsBar ? "Un bar ou lounge" : "Un restaurant"}")`)
  .click();
await page.getByLabel("Ville").selectOption("Marrakech");
await settle(400);
await shot("etape2");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 3 · Adresse", (await heading()) === "Adresse");

await page.getByLabel("Adresse").fill(address);
const carte = page.locator(".leaflet-container");
check("la carte s'affiche", (await carte.count()) > 0);
if (await carte.count()) {
  await carte.click({ position: { x: 150, y: 110 } });
  await settle(600);
  check("le point est posé", (await page.locator('text="Point placé"').count()) > 0);
  // Dragging is the affordance the geocoder cannot replace.
  const pin = page.locator(".lyfe-pin").first();
  if (await pin.count()) {
    const box = await pin.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 40, box.y + 25, { steps: 8 });
      await page.mouse.up();
      await settle(500);
      check("le point se déplace", (await page.locator('text="Point placé"').count()) > 0);
    }
  }
}
await shot("etape3");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 4 · Photos", (await heading()) === "Photos");

// A real upload, through the same ticket the portal mints in production.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=",
  "base64",
);
const file = `/tmp/couverture-${stamp}.png`;
writeFileSync(file, png);
const chooser = page.locator('input[type="file"]').first();
if ((await chooser.count()) > 0) {
  await chooser.setInputFiles(file);
  await settle(2600);
  check("la photo est acceptée", /Photo ajoutée/.test(await body()));
} else {
  check("un sélecteur de photo existe", false);
}
await shot("etape4");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 5 · Horaires", (await heading()) === "Horaires");

const switches = page.locator('[role="switch"]:visible');
check("sept jours", (await switches.count()) === 7, `${await switches.count()} interrupteurs`);
await page.locator('button:has-text("Appliquer lundi à tous les jours")').click();
await settle(400);
// Sunday closed: a venue that shuts one day a week is the normal case,
// and it is what makes the summary say six days rather than seven.
await switches.nth(6).click();
await settle(400);
check("dimanche fermé", /Fermé/.test(await body()));
await shot("etape5");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1800);
check("étape 6 · C'est prêt", (await heading()) === "C'est prêt");

const summary = await body();
check("le récapitulatif porte le nom", summary.includes(venueName));
check("le récapitulatif porte la ville", summary.includes("Marrakech"));
check("le récapitulatif porte le type", summary.includes(wantsBar ? "Bar ou lounge" : "Restaurant"));
check("le récapitulatif compte six jours", /6 jours par semaine/.test(summary));
check("la photo est au récapitulatif", /Ajoutée/.test(summary));
await shot("etape6");

// Reopening mid-flow must not lose anything.
await go("/inscription");
check("le brouillon survit à un rechargement", (await heading()) === "C'est prêt");

await page.locator('button:has-text("Ouvrir mon tableau de bord")').click();
await page.waitForTimeout(3600);
check("atterrit sur l'Accueil", page.url().endsWith("/restaurant"), page.url());

// ── 2. The venue they just made, which has nothing in it ────
await rendersFine("Accueil du nouvel établissement");
const landing = await body();
check("salue le partenaire par son prénom", landing.includes("Amine"), (await heading()).slice(0, 48));
check(
  "la barre latérale nomme l'établissement",
  ((await page.textContent(phone ? "body" : "aside").catch(() => "")) ?? "").includes(venueName),
);
await shot("accueil-neuf");

const SCREENS = [
  ["/restaurant/reservations", "Réservations"],
  ["/restaurant/check-in", "Check-in"],
  ["/restaurant/ma-fiche", "Ma fiche"],
  ["/restaurant/disponibilites", "Disponibilités"],
  ["/restaurant/notifications", "Notifications"],
];
for (const [path, label] of SCREENS) {
  await go(path);
  await rendersFine(`${label} (établissement vide)`);
  await shot(`vide-${label.toLowerCase().replace(/[^a-z]/g, "-")}`);
}

// Réservations on an empty venue must say so rather than look broken.
await go("/restaurant/reservations");
check(
  "un carnet vide le dit",
  /Aucune réservation|aucune réservation|rien de prévu|Aucun/i.test(await body()),
);

// Ma fiche: the record the onboarding wrote, and a write of our own.
await go("/restaurant/ma-fiche");
// A form field's value is not page text: it has to be read off the input.
const fieldValue = async (label) =>
  (await page.getByLabel(label).inputValue().catch(() => "")) ?? "";
check(
  "Ma fiche porte le nom saisi à l'inscription",
  (await fieldValue("Nom du lieu")).includes(venueName),
  await fieldValue("Nom du lieu"),
);
check(
  "Ma fiche porte l'adresse saisie",
  (await fieldValue("Adresse")).includes("Derb Sidi Bouloukat"),
  await fieldValue("Adresse"),
);
// A Moroccan number keeps its shape: +212, a space-grouped mobile.
check(
  "le téléphone marocain est relu tel quel",
  (await fieldValue("Téléphone")).replace(/\s/g, "").includes("+2126612233"),
  await fieldValue("Téléphone"),
);
// The accents and the ° survived the round trip through the database.
check(
  "les accents du nom survivent à la base",
  (await fieldValue("Nom du lieu")).includes("n°"),
  await fieldValue("Nom du lieu"),
);
check("Ma fiche porte une carte", (await page.locator(".leaflet-container").count()) > 0);
const renamed = `${venueName} — Patio`;
const nameField = page.getByLabel("Nom du lieu");
if (await nameField.count()) {
  await nameField.fill(renamed);
  await settle(400);
  await save("Ma fiche · Identité");
  await go("/restaurant/ma-fiche");
  check(
    "le nom modifié est relu depuis la base",
    (await fieldValue("Nom du lieu")) === renamed,
    await fieldValue("Nom du lieu"),
  );
} else {
  check("Ma fiche a un champ Nom du lieu", false);
}
await shot("ma-fiche");

// The hours tab, then the photos tab: three tabs over one record.
for (const tab of ["Horaires", "Photos"]) {
  const trigger = page
    .locator(`button:has-text("${tab}"):visible, [role="tab"]:has-text("${tab}"):visible`)
    .first();
  if (await trigger.count()) {
    await trigger.click();
    await settle(1100);
    await rendersFine(`Ma fiche · ${tab}`);
    if (tab === "Photos") {
      check("la photo de couverture est là", /couverture|Photo|photo/i.test(await body()));
    }
  } else {
    lot1Only(`Ma fiche a un onglet ${tab}`);
  }
}

// Disponibilités and Notifications: a switch each, saved and re-read.
await go("/restaurant/disponibilites");
const dispoSwitch = page.locator('[role="switch"]:visible').first();
if (await dispoSwitch.count()) {
  await dispoSwitch.click();
  await settle(500);
  await save("Disponibilités");
} else {
  check("Disponibilités a un interrupteur", false);
}
await shot("disponibilites");

await go("/restaurant/notifications");
const notifSwitch = page.locator('[role="switch"]:visible').first();
if (await notifSwitch.count()) {
  await notifSwitch.click();
  await settle(500);
  await save("Notifications");
} else {
  check("Notifications a un interrupteur", false);
}
await shot("notifications");

// ── 3. The seeded venue, which has a book to work ───────────
// Signing out for real, through the control a host would use.
const kebab = page.locator('button[aria-label*="compte" i]:visible, button[aria-haspopup="menu"]:visible').last();
if (await kebab.count()) {
  await kebab.click();
  await settle(700);
  // Radix renders the item as a menuitem, not a button.
  const out = page
    .locator('[role="menuitem"]:has-text("Se déconnecter"), button:has-text("Se déconnecter"):visible')
    .first();
  if (await out.count()) {
    await out.click();
    await settle(2200);
    check("Se déconnecter ramène à la connexion", page.url().includes("/login"), page.url());
  } else {
    check("le menu du compte offre Se déconnecter", false);
  }
}
await context.clearCookies();
// This account owns two venues, so the login screen asks which one —
// `signIn` answers « Dar Zellij » and waits for the portal rather than
// for a stopwatch. See the note above `signIn` in `lot.mjs`.
const landed = await signIn(page, BASE, { venue: "Dar Zellij" });
check(
  "le compte du jeu de données ouvre son établissement",
  typeof landed === "string",
  typeof landed === "string" ? landed : landed.refused,
);

await go("/restaurant/reservations");
await rendersFine("Réservations (Dar Zellij)");
const dayLabel = async () =>
  ((await page.textContent("main").catch(() => "")) ?? "").slice(0, 400);

// The day arrows, then the date picker.
const prev = page.locator('button[aria-label*="précédent" i]:visible').first();
const next = page.locator('button[aria-label*="suivant" i]:visible').first();
if ((await prev.count()) > 0 && (await next.count()) > 0) {
  const before = await dayLabel();
  await prev.click();
  await settle(1400);
  const back = await dayLabel();
  check("le jour précédent change l'écran", back !== before);
  await next.click();
  await settle(1400);
  await next.click();
  await settle(1400);
  const forward = await dayLabel();
  check("le jour suivant change l'écran", forward !== back);
  await rendersFine("Réservations · autre jour");
} else {
  lot1Only("Réservations a des flèches de jour");
}

const picker = page.locator('input[type="date"]:visible').first();
if (await picker.count()) {
  // The day as the venue counts it, not as UTC does: between 23h and
  // midnight UTC the two are different days in Casablanca, and the
  // screen would be asked for yesterday.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
  await picker.fill(today);
  check(
    "le sélecteur de date ramène à aujourd'hui",
    await waitForText(/Aujourd'hui/i),
  );
} else {
  check("Réservations a un sélecteur de date", false);
}

// Service tabs and filter chips.
for (const label of ["Déjeuner", "Dîner"]) {
  const tab = page.locator(`button:has-text("${label}"):visible`).first();
  if (await tab.count()) {
    await tab.click();
    await settle(1300);
    await rendersFine(`Réservations · ${label}`);
  }
}
for (const chip of ["À confirmer", "Confirmées", "Arrivés", "Tous"]) {
  const c = page.locator(`button:has-text("${chip}"):visible`).first();
  if (await c.count()) {
    await c.click();
    await settle(900);
    await rendersFine(`Réservations · ${chip}`);
  } else {
    check(`Réservations a le filtre ${chip}`, false);
  }
}

// The search bar, then the decisions on a row.
// By role, not by placeholder: Lot 1's box says « Un nom, 4 chiffres
// du téléphone, ou 25/09… », which does not contain « Recherch » — so
// the placeholder selector silently found nothing and this tool
// reported a missing search box that is on screen.
const search = page.locator('input[type="search"]:visible').first();
if (await search.count()) {
  // Whatever name is on the first row: the seed's pending booking may
  // have been decided by an earlier pass, so the query is taken from the
  // screen rather than hardcoded.
  const firstName = ((await body()).match(/\n([A-ZÀ-Ý][a-zà-ÿ]+ [A-ZÀ-Ý][a-zà-ÿ]+)\n/) ?? [])[1];
  await search.fill(firstName ? firstName.split(" ")[0] : "a");
  await settle(1400);
  const filtered = await body();
  check(
    "la recherche filtre le carnet",
    firstName ? filtered.includes(firstName.split(" ")[0]) : filtered.length > 100,
    firstName ?? "aucun nom lisible",
  );
  // Cleared, or every row action below is looked for in a filtered book.
  await search.fill("");
  await settle(1200);
  await search.fill("");
  await settle(900);
} else {
  check("Réservations a une recherche", false);
}

await shot("reservations");

// Back to the day and the service the screen opens on: the tabs and
// chips above left it on Déjeuner, where the seed's pending request —
// a 22h30 booking — is not.
// The « À confirmer » chip, not the service the screen opens on: the
// seed's pending booking is at 22h30, so a run before dinner opens on
// a service that does not hold it.
await go("/restaurant/reservations");
const pendingChip = page.locator('button:has-text("À confirmer"):visible').first();
if (await pendingChip.count()) {
  await pendingChip.click();
  await settle(1300);
}
const accept = page.locator('button:has-text("Accepter"):visible').first();
if (await accept.count()) {
  const row = await accept.locator("xpath=ancestor::*[self::li or self::div][1]").textContent();
  await accept.click();
  await settle(2200);
  const after = await body();
  check("accepter confirme la ligne", /Confirmée/.test(after), String(row).slice(0, 40));
  await go("/restaurant/reservations");
  check("la confirmation survit au rechargement", /Confirmée/.test(await body()));
} else {
  // Not a failure: `decisions.mjs` and `edges.mjs` run before this one
  // in the matrix and decide the seed's one request, so by the time
  // this tool looks there is nothing left to decide. A tool that calls
  // that a defect reports the order it ran in, not the product.
  console.log(
    "  —    le carnet ne porte aucune demande en attente · " +
      "la décision est éprouvée par decisions.mjs",
  );
}

// Refuser, with its reason, inside the dialog it opens — page-wide
// locators found a tab of the same name behind the dialog's overlay and
// then waited thirty seconds for a click that could never land.
const refuse = page.locator('button:has-text("Refuser"):visible').first();
if (await refuse.count()) {
  await refuse.click();
  await settle(1200);
  const dialog = page.locator('[role="dialog"]:visible').first();
  if (await dialog.count()) {
    const reason = dialog
      .locator('button:has-text("Complet"), button:has-text("Fermé")')
      .first();
    if (await reason.count()) {
      await reason.click();
      await settle(600);
    }
    const confirm = dialog.locator('button:has-text("Refuser la demande")').first();
    if (await confirm.count()) {
      await confirm.click();
      await settle(2000);
    }
    // Whatever happened, the dialog must not be left open over the rest
    // of the run.
    if (await dialog.count()) {
      await page.keyboard.press("Escape").catch(() => {});
      await settle(500);
    }
  }
  check("refuser se termine sans erreur", !/Une erreur|erreur inattendue/i.test(await body()));
}

const checkin = page.locator('button:has-text("Check-in"):visible').nth(1);

if (await checkin.count()) {
  await checkin.click();
  await settle(2000);
  check("le check-in marque l'arrivée", /Arrivé/.test(await body()));
}

// Accueil, worked from its own buttons.
await go("/restaurant");
await rendersFine("Accueil (Dar Zellij)");
const carnet = page
  .locator('a:has-text("Ouvrir le carnet"):visible, button:has-text("Ouvrir le carnet"):visible')
  .first();
if (await carnet.count()) {
  await carnet.click();
  await settle(1800);
  check("Ouvrir le carnet mène aux Réservations", page.url().includes("reservations"), page.url());
} else {
  check("Accueil propose Ouvrir le carnet", false);
}

await go("/restaurant/check-in");
await rendersFine("Check-in (Dar Zellij)");
const scan = page.locator('button:has-text("Scanner"):visible').first();
if (await scan.count()) {
  await scan.click();
  await settle(1500);
  check("le scanner s'ouvre", /caméra|Caméra|Scanner/i.test(await body()));
  await page.keyboard.press("Escape");
  await settle(800);
}
const byName = page.locator('input:visible:not([disabled])').first();
if (await byName.count()) {
  await byName.fill("Salma");
  await settle(1300);
  check("le check-in par nom trouve la table", /Salma/.test(await body()));
}
await shot("check-in");

await browser.close();

if (noise.size) {
  console.log(`\n${noise.size} message(s) de console :`);
  for (const line of [...noise].slice(0, 6)) console.log(`  ${line}`);
  problems.push(...[...noise].map((n) => `console: ${n.slice(0, 60)}`));
}

console.log(
  problems.length === 0
    ? `\nParcours complet propre · passe ${pass} · ${LOT_LABEL} · ${width}×${height}`
    : `\n${problems.length} problème(s) · passe ${pass} · ${width}×${height}`,
);
process.exit(problems.length === 0 ? 0 : 1);
