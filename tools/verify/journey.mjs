// A real user, from signing up to running a service.
//
//   node tools/verify/journey.mjs                 # 1440×1000
//   W=390 H=844 node tools/verify/journey.mjs     # phone
//   PASS=2 node tools/verify/journey.mjs          # label for the log
//   SHOTS=/tmp/j node tools/verify/journey.mjs    # a PNG per station
//
// The other tools read screens; this one uses them. It creates an
// account nobody has used before, picks a dashboard on the chooser, and
// walks the six steps of the establishment flow filling every field —
// the management mode, accents, a Moroccan phone number, a real photo, a
// pin dragged on the map — and then works the venue it just made: every
// form saved and re-read, every day arrow, every row action, on the
// empty venue it created and on the seeded one that has a full book.
//
// Since DigiNegoce's 27 October decision the road is two walks. The
// account half belongs to `tools/verify/inscription.mjs`, which also
// owns the chooser and the empty Accueil on their own; here they are
// stations on the way to an establishment, because this tool's subject
// is what one partner does in a day.
//
// It writes: each run creates an account, an establishment and a handful
// of bookings in whatever database the portal points at. Reseed
// afterwards if the dataset is going anywhere.

import { chromiumOrExplain } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { DEMO_CLOCK, LOT, LOT_LABEL, clockLine, requireWrites, signIn } from "./lot.mjs";
import { CITY_CENTRE } from "../../src/lib/types/onboarding.ts";

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

// Every map tile the page asks for, so a check can read where the map
// opened. Registered once, for the whole run.
const tiles = [];
page.on("request", (request) => {
  const m = /\/(\d+)\/(\d+)\/(\d+)\.png(?:\?|$)/.exec(request.url());
  if (m && /tile|openstreetmap/i.test(request.url())) {
    tiles.push({ z: Number(m[1]), x: Number(m[2]), y: Number(m[3]) });
  }
});

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
// The venue flow's `h1` is the route — « Créer mon établissement » — and
// the step's own name is the `h2` inside the card, because the route is
// one screen a partner walks six times rather than six pages.
const stepName = async () =>
  ((await page.locator("h2").first().textContent().catch(() => "")) ?? "").trim();
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

console.log(
  `\nParcours complet · passe ${pass} · ${LOT_LABEL} · ${width}×${height} · ${clockLine()}\n`,
);

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
const venueName = `Dar Malabata n°${stamp.slice(-3)}`;
const owner = "Amine El Fassi-Ouazzani";
const address = "7, rue Ibn Battouta, Malabata";

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
await shot("compte-etape1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(2000);
check("étape 2 · Votre compte est créé", (await heading()) === "Votre compte est créé");
await shot("compte-etape2");

// ── 2. The screen between an account and a dashboard ────────
await page.locator('button:has-text("Choisir mon espace")').click();
await settle(2800);
check("mène à l'écran de choix", new URL(page.url()).pathname === "/choisir", page.url());
await rendersFine("Choisir un espace");
const offers = await page.locator("[data-dashboard]").allTextContents();
check("trois cartes", offers.length === 3, offers.join(" · "));
check(
  "un compte neuf n'en tient aucune",
  offers.every((a) => a.trim() === "Ajouter"),
  offers.join(" · "),
);
await shot("choisir");

// ── 3. The dashboard, before it has an establishment ────────
// Reached by its own card, and then by the button that card's Accueil
// puts in front of a partner: both have to lead to the same flow.
await go("/restaurant");
// Not `rendersFine`: that one asks for 200 characters of page text, and
// this screen is deliberately a heading, a sentence and a button — on a
// phone, where there is no sidebar either, the whole of it is shorter
// than the floor a dashboard is held to. What it owes is the card.
const emptyCard = page.locator("[data-empty-dashboard]");
check("l'Accueil porte la carte d'état vide", (await emptyCard.count()) > 0, await heading());
check(
  "et la phrase de la décision du 27 octobre",
  /Votre espace est prêt\. Créez votre établissement/.test(await body()),
);
await shot("accueil-vide");

// The card's own button, not the sidebar's entry: at 390 the sidebar is
// rendered and hidden, and an unscoped match found that copy first.
await emptyCard.locator("a").first().click();
await settle(2400);
check(
  "le bouton ouvre la création",
  new URL(page.url()).pathname === "/restaurant/etablissement/nouveau",
  page.url(),
);
check("étape 1 · Mode de gestion des réservations", (await stepName()) === "Mode de gestion des réservations", await stepName());
check(
  "la barre de progression a six segments",
  (await page.locator("[data-progress]").first().getAttribute("data-progress")) === "6",
);

// ── 3 bis. The first step, on a slow line ───────────────────
//
// The fields have to be in the document and **visible** when it paints,
// not assembled once the bundle lands. They were in the document all
// along: `motion.div` writes its `initial` into the server markup, so
// `opacity: 0` shipped with them and the step was painted invisible
// until JavaScript arrived and animated it in. On this machine that is
// a flicker. On the line a partner opens the portal on, it is a card
// with a title, a sentence and six hundred pixels of nothing.
//
// Two assertions, and they are different claims. The first is about the
// document: fetched with no JavaScript at all, through the session's own
// cookies, it has to contain the three radio cards. The second is about
// the paint: throttled to 3G, the group has to be *visible* long before
// a 200 kB bundle could have arrived.
{
  const raw = await context.request.get(
    `${BASE}/restaurant/etablissement/nouveau`,
  );
  const html = await raw.text();
  check(
    "le document porte les champs de l'étape 1",
    /role="radiogroup"/.test(html) &&
      /Dashboard LYFE/.test(html) &&
      /WhatsApp/.test(html),
    `${html.length} caractères`,
  );
  check(
    "et rien ne les peint invisibles",
    !/opacity:0/.test(html),
    (html.match(/opacity:0[^;"]*/) ?? ["aucun"])[0],
  );

  // 400 kbit/s down, 400 ms of latency: Chrome's own « Slow 3G » is
  // 400/400 kbit and 2 s, which is slower than anything a Casablanca
  // rooftop sees; this is the fast end of 3G, so an assertion that
  // holds here holds there.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  const started = Date.now();
  await page.goto(`${BASE}/restaurant/etablissement/nouveau`, {
    // The response, not the load: waiting for `load` would wait for the
    // very bundle this is measuring against.
    waitUntil: "commit",
  });
  let painted = -1;
  try {
    await page
      .locator('[role="radiogroup"]')
      .first()
      .waitFor({ state: "visible", timeout: 6000 });
    painted = Date.now() - started;
  } catch {
    painted = -1;
  }
  check(
    "en 3G, les trois cartes sont peintes avant le bundle",
    painted >= 0,
    painted >= 0 ? `${painted} ms` : "jamais visibles en 6 s",
  );
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await cdp.detach();
  await settle(1200);
}

// ── 4. The establishment, step by step ──────────────────────
// Alternating the type across passes is how the bar vocabulary gets
// exercised without a second script. The chooser's card carries it as
// `?type=`, which is a hint the flow applies to a draft nobody has
// answered yet — so coming in that way has to pre-select it, and step 2
// has to let it be changed anyway.
const wantsBar = pass === "2";
await go(`/choisir`);
await page
  .locator(`a:has([data-dashboard="${wantsBar ? "bar" : "restaurant"}"])`)
  .first()
  .click();
await settle(2400);
check(
  "la carte ouvre la même création",
  new URL(page.url()).pathname === "/restaurant/etablissement/nouveau",
  page.url(),
);
check("et reprend le brouillon à l'étape 1", (await stepName()) === "Mode de gestion des réservations", await stepName());

// Three answers, and they are three different places a booking lands.
const modes = page.locator('[role="radiogroup"][aria-label="Mode de gestion des réservations"] [role="radio"]');
check("trois modes de gestion", (await modes.count()) === 3, `${await modes.count()}`);
check(
  "« Dashboard LYFE » est coché par défaut",
  (await modes.first().getAttribute("aria-checked")) === "true",
);
const modeText = await body();
for (const line of [
  "Une réservation arrive dans votre carnet",
  "Une réservation vous arrive par WhatsApp",
  "Une réservation part dans votre système par notre API",
]) {
  check(`chaque mode dit ce qui arrive à une réservation · « ${line.slice(0, 28)}… »`, modeText.includes(line));
}
// The second pass answers WhatsApp, so the column is written with
// something other than its default at least once per run pair.
const mode = wantsBar ? 1 : 0;
await modes.nth(mode).click();
await settle(300);
check(
  "le mode choisi est coché",
  (await modes.nth(mode).getAttribute("aria-checked")) === "true",
);
await shot("creation-etape1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1800);
check("étape 2 · Votre établissement", (await stepName()) === "Votre établissement", await stepName());

// The hint from the card, read back: a partner who pressed « Bar ou
// lounge » must not have to answer the same question again.
const types = page.locator('[role="radiogroup"][aria-label="C\'est plutôt"] [role="radio"]');
check(
  "l'indication de la carte est reprise",
  (await types.nth(wantsBar ? 1 : 0).getAttribute("aria-checked")) === "true",
  `${wantsBar ? "bar" : "restaurant"}`,
);

await page.getByLabel("Nom de l'établissement").fill(venueName);
await page
  .locator(`button:has-text("${wantsBar ? "Un bar ou lounge" : "Un restaurant"}")`)
  .click();
// The two the app's detail screen shows under the venue's name. The
// cuisine is one of the ten the app's filter row offers — a select, not
// a field — and the sentence goes on the line under it.
await page.getByLabel("Type de cuisine").selectOption(wantsBar ? "fusion" : "marocaine");
await page.getByLabel("Spécialités").fill(
  wantsBar ? "Cocktails d'auteur et petite restauration" : "Tajines de saison et pastilla",
);
await page
  .locator('[role="radiogroup"][aria-label="Fourchette de prix"] [role="radio"]')
  .nth(2)
  .click();
// Tanger, and not Marrakech, for one reason: Marrakech's centre is
// the coordinate the map used to fall back to, so a flow that picked it
// could not tell a map that follows the city from a map that ignores it.
await page.getByLabel("Ville").selectOption("Tanger");
await settle(400);
await shot("creation-etape2");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 3 · Adresse", (await stepName()) === "Adresse", await stepName());

// The quarter comes before the address: the app's header reads
// « quartier, ville », in that order.
await page.getByLabel("Quartier").fill("Malabata");
await page.getByLabel("Adresse", { exact: true }).fill(address);
const carte = page.locator(".leaflet-container");
check("la carte s'affiche", (await carte.count()) > 0);

// The map opens on the city that was answered one step earlier, before
// any geocoding — it used to open on Jemaa el-Fna whatever the answer,
// so a partner in Tanger was handed a map of Marrakech and asked to
// place a point on it.
//
// Read off the tiles, because that is the only thing the page exposes:
// Leaflet asks for `{z}/{x}/{y}.png`, and the tile a city falls in is
// arithmetic. Within two tiles of the centre, since a 240px-tall map at
// zoom 12 spans a few of them. The tile server itself is unreachable
// from a sandboxed runner, which does not matter — the *request* is
// the evidence.
{
  const z = 12;
  const [lat, lon] = CITY_CENTRE.Tanger;
  const wantX = Math.floor(((lon + 180) / 360) * 2 ** z);
  const rad = (lat * Math.PI) / 180;
  const wantY = Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
  const near = tiles.filter(
    (t) => t.z === z && Math.abs(t.x - wantX) <= 2 && Math.abs(t.y - wantY) <= 2,
  );
  check(
    "la carte s'ouvre sur la ville choisie, avant tout géocodage",
    near.length > 0,
    near.length > 0
      ? `${near.length} tuile(s) autour de ${wantX}/${wantY}`
      : `attendu ~${wantX}/${wantY}, demandé ${
          tiles
            .filter((t) => t.z === z)
            .slice(0, 3)
            .map((t) => `${t.x}/${t.y}`)
            .join(", ") || "aucune tuile"
        }`,
  );
}
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
await shot("creation-etape3");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 4 · Photos", (await stepName()) === "Photos", await stepName());

// A real upload, through the same ticket the portal mints in production.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=",
  "base64",
);
const file = `/tmp/couverture-${stamp}.png`;
writeFileSync(file, png);
// Four files on this step — cover, second photo, vignette, carte — and
// the cover is the first of them.
const chooser = page.locator('input[type="file"]').first();
if ((await chooser.count()) > 0) {
  await chooser.setInputFiles(file);
  await settle(2600);
  check("la photo est acceptée", /Photo de couverture/.test(await body()));
} else {
  check("un sélecteur de photo existe", false);
}
await shot("creation-etape4");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 5 · Ambiance et équipements", (await stepName()) === "Ambiance et équipements", await stepName());

// Two of the app's ambience chips, and one equipment row. The step can
// be passed; this pass answers it, so the venue it creates carries both
// lists and the fiche it opens is not six blank rows.
const ambience = page.locator(
  'fieldset:has(> legend:text-is("Ambiance")) button[role="switch"]',
);
check("les ambiances sont une liste fermée", (await ambience.count()) === 12, `${await ambience.count()} puces`);
await ambience.nth(2).click();
await ambience.nth(6).click();
await settle(300);
const equipment = page.locator('label:has([role="switch"])');
check("huit équipements", (await equipment.count()) === 8, `${await equipment.count()} lignes`);
await equipment.first().locator('[role="switch"]').click();
await settle(300);
await shot("creation-etape5");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
check("étape 6 · Horaires", (await stepName()) === "Horaires", await stepName());

const switches = page.locator('[role="switch"]:visible');
check("sept jours", (await switches.count()) === 7, `${await switches.count()} interrupteurs`);
await page.locator('button:has-text("Appliquer lundi à tous les jours")').click();
await settle(400);
// Sunday closed: a venue that shuts one day a week is the normal case.
await switches.nth(6).click();
await settle(400);
check("dimanche fermé", /Fermé/.test(await body()));
await shot("creation-etape6");

// Reopening mid-flow must not lose anything — and this is the reason
// the steps moved into the dashboard at all: a partner who stops here
// has a session to come back with.
await go("/restaurant/etablissement/nouveau");
check("le brouillon survit à un rechargement", (await stepName()) === "Horaires", await stepName());

// ── 5. The establishment exists ─────────────────────────────
await page.locator('button:has-text("Créer mon établissement")').first().click();
await page.waitForTimeout(3600);
check("atterrit sur l'Accueil", page.url().endsWith("/restaurant"), page.url());

// ── 6. The venue they just made, which has nothing in it ────
await rendersFine("Accueil du nouvel établissement");
const landing = await body();
// Lot 2's phone lane opens on the floor, not on a greeting: a manager
// who has the app out mid-service wants the room, and the card that
// says good evening is the first thing that goes. Lot 1's phone lane
// keeps it, because its Accueil is the greeting and three groups.
if (LOT === 1 || !phone) {
  check("salue le partenaire par son prénom", landing.includes("Amine"), (await heading()).slice(0, 48));
} else {
  console.log("  —    salue le partenaire par son prénom · absent de la voie téléphone du lot 2");
}
// Polled, with a reload, for the HTTP driver's sake: that branch memoises
// the account for five seconds (`HttpDirectory.TTL_MS`), and the chrome
// is read within three of the venue being created — so the first render
// after a submit can still be the account as it was a moment before,
// with no establishment in it. Deliberate behaviour, so the tool waits
// for it rather than reporting a sidebar that is a second behind.
const named = await (async () => {
  const deadline = Date.now() + 12000;
  let reloaded = false;
  while (Date.now() < deadline) {
    const chrome = (await page.textContent(phone ? "body" : "aside").catch(() => "")) ?? "";
    if (chrome.includes(venueName)) return true;
    if (!reloaded && Date.now() > deadline - 6000) {
      await page.reload({ waitUntil: "domcontentloaded" });
      reloaded = true;
    }
    await page.waitForTimeout(400);
  }
  return false;
})();
check("la barre latérale nomme l'établissement", named);
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
  (await fieldValue("Adresse")).includes("rue Ibn Battouta"),
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

// Every other tab of the fiche, one record behind all of them.
for (const tab of ["Détails", "Horaires", "Photos", "Menu"]) {
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
    if (tab === "Détails") {
      const b = await body();
      check("la fourchette de prix est là", /Fourchette de prix/.test(b));
      check("les équipements sont des interrupteurs", /Réservation recommandée/.test(b));
    }
    if (tab === "Menu") {
      // One optional PDF under the item list, since 12 October. The
      // ten photographed pages are gone with the review.
      const menuTab = await body();
      check("la carte est une liste de plats", /Ajouter un plat|Ajouter une rubrique/.test(menuTab));
      check(
        "et le fichier est un PDF facultatif, un seul",
        /un PDF que les clients peuvent ouvrir/.test(menuTab) && !/photos de ses pages/.test(menuTab),
      );
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

// ── 7. The seeded venue, which has a book to work ───────────
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
// The whole of `main`, not the first 400 characters of it. At 1440 the
// date sits inside that slice and at 390 it does not, so the same
// assertion was reading the day on one width and reading the toolbar
// on the other — and calling the toolbar unchanged a failure.
const dayLabel = async () =>
  ((await page.textContent("main").catch(() => "")) ?? "").replace(/\s+/g, " ").trim();

// The day arrows, then the date picker.
//
// Waited on the URL, not on a stopwatch. The day a partner is reading
// lives in `?jour=`, so a click is done when that parameter changes —
// and a fixed 1400 ms was not always enough at 390 on a box running
// the portal and the browser at once, which made two of these
// assertions fail at random and say nothing about the screen.
const param = (name) => {
  try {
    return new URL(page.url()).searchParams.get(name) ?? "";
  } catch {
    return "";
  }
};
const waitForParam = async (name, isDone, timeout = 12000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (isDone(param(name))) return true;
    await page.waitForTimeout(150);
  }
  return isDone(param(name));
};

/**
 * Clicks, then waits for the screen to actually be another day.
 *
 * The URL changes the instant the button is pressed — the day lives in
 * `?jour=` — but the list is a server component, so the content it
 * names arrives afterwards. Waiting on the URL therefore reads the old
 * day with the new address, and waiting a fixed 1400 ms reads whichever
 * of the two the machine happened to be on: both assertions below
 * failed at random, on one width or the other, and neither failure said
 * anything about the screen. So: click, then poll the screen until it
 * is not what it was, with a deadline.
 */
const clickToAnotherDay = async (button, before, timeout = 15000) => {
  // Pressed again if nothing moved, not just waited on.
  //
  // A day arrow re-renders the screen it sits on, and a press that
  // lands while that render is in flight is swallowed: the button the
  // browser hands the event to is about to be replaced. It is visible
  // in a four-click probe on any build — press, press, press, press,
  // and one of the four does nothing — so an assertion that clicks
  // once and then waits fifteen seconds is testing which half of the
  // render it caught. Re-pressing while the screen is still the one we
  // started on is safe: the press that works is the one that changes
  // it, and the loop stops there.
  const deadline = Date.now() + timeout;
  let now = before;
  let lastClick = 0;
  while (Date.now() < deadline) {
    if (Date.now() - lastClick > 2500) {
      await button.click().catch(() => {});
      lastClick = Date.now();
    }
    now = await dayLabel();
    if (now !== before) return now;
    await page.waitForTimeout(200);
  }
  return now;
};

const prev = page.locator('button[aria-label*="précédent" i]:visible').first();
const next = page.locator('button[aria-label*="suivant" i]:visible').first();
if ((await prev.count()) > 0 && (await next.count()) > 0) {
  const before = await dayLabel();
  const back = await clickToAnotherDay(prev, before);
  check("le jour précédent change l'écran", back !== before, param("jour"));
  const middle = await clickToAnotherDay(next, back);
  const forward = await clickToAnotherDay(next, middle);
  check("le jour suivant change l'écran", forward !== back, param("jour"));
  await rendersFine("Réservations · autre jour");
} else {
  lot1Only("Réservations a des flèches de jour");
}

const picker = page.locator('input[type="date"]:visible').first();
if (await picker.count()) {
  // The day as the venue counts it, not as UTC does: between 23h and
  // midnight UTC the two are different days in Casablanca, and the
  // screen would be asked for yesterday.
  //
  // And the *portal's* day, not the container's. The portal runs on
  // `LYFE_DEMO_CLOCK` — the Thursday of the week at 20h30 — so on any
  // other weekday the real date is a date the screen does not call
  // « Aujourd'hui », and this check failed for the calendar rather
  // than for the screen.
  const today = DEMO_CLOCK.toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });

  // Refilled if nothing moved, for the arrows' reason one screen up.
  //
  // The picker is reached straight off the last arrow press, so the
  // day list is still re-rendering when `fill` runs — and a controlled
  // input whose React tree is replaced mid-fill keeps the value the
  // server sent, not the one Playwright typed. The URL then still says
  // tomorrow, `waitForParam` spends its twelve seconds, and the tool
  // reports a date picker that does not work. It does; nobody types
  // that fast. So: fill, and fill again while the day has not moved.
  const deadline = Date.now() + 15000;
  let lastFill = 0;
  while (Date.now() < deadline && param("jour") !== today && param("jour") !== "") {
    if (Date.now() - lastFill > 2500) {
      await picker.fill(today).catch(() => {});
      lastFill = Date.now();
    }
    await page.waitForTimeout(200);
  }
  // Same reasoning as the arrows: the URL says when the navigation
  // landed, and only then is the screen worth reading.
  await waitForParam("jour", (v) => v === today || v === "");
  const landedToday = await waitForText(/Aujourd'hui/i);
  check(
    "le sélecteur de date ramène à aujourd'hui",
    landedToday,
    landedToday ? today : `?jour=${param("jour")} attendu ${today} · ${page.url()}`,
  );
} else {
  check("Réservations a un sélecteur de date", false);
}

// Service tabs and filter chips.
for (const label of ["Déjeuner", "Dîner"]) {
  const tab = page.locator(`button:has-text("${label}"):visible`).first();
  if (await tab.count()) {
    const before = param("service");
    await tab.click();
    await waitForParam("service", (v) => v !== before);
    await settle(700);
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
  //
  // Off a book row, not off the page's text. The page carries other
  // people's names — the waiting list is on the same screen at 390 —
  // and a query taken from one of those is a name the book's own search
  // correctly cannot find, which this tool then reported as a search
  // that does not filter.
  const firstName = (
    (await page
      .locator("main [data-book-row]:visible h4")
      .first()
      .textContent()
      .catch(() => "")) ?? ""
  ).trim();
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
} else if (LOT === 2 && phone) {
  // Same reason: the shortcut lives on the greeting card, and the
  // greeting card is not in this lot's phone lane.
  console.log("  —    Ouvrir le carnet · sur la carte d'accueil, absente de la voie téléphone du lot 2");
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

// ── 8. The chooser, opened on purpose ───────────────────────
//
// `/choisir` is the switcher, not a destination, and the difference is
// this station. It used to redirect an account holding one space
// straight to that space — so the sidebar card that leads here was a
// card you could press and stay where you were, and the two spaces a
// partner does *not* hold were unreachable and unmentioned.
//
// Yassine is the account that shows it. Under Lot 1 he holds an
// organisation and no establishment: signing in takes him to the event
// dashboard, because one space is nothing to choose — and opening the
// chooser from there has to show all three anyway, one « Ouvrir » and
// two « Ajouter ». Under Lot 2 the seed gives him venues as well, so he holds
// two spaces, the sign-in itself lands on the chooser, and the counts
// move with what he holds.
await context.clearCookies();
const yassine = await signIn(page, BASE, { email: "yassine@darzellij.ma" });
const landedOn = typeof yassine === "string" ? new URL(yassine).pathname : "";
check(
  "yassine se connecte",
  typeof yassine === "string",
  typeof yassine === "string" ? landedOn : JSON.stringify(yassine),
);
if (LOT === 1) {
  // One space: the sign-in is the one moment the chooser is skipped.
  check(
    "une seule activité : la connexion saute l'écran de choix",
    landedOn === "/dashboard",
    landedOn,
  );
} else {
  // A venue *and* an organisation: the case the 27 October decision was
  // about, and the one the old rule resolved by naming the first of the
  // two without saying so.
  check(
    "un lieu et une organisation : la connexion mène à l'écran de choix",
    landedOn === "/choisir",
    landedOn,
  );
}

await go("/choisir");
check(
  "ouvert exprès, l'écran se rend au lieu de rediriger",
  new URL(page.url()).pathname === "/choisir",
  page.url(),
);
const held = page.locator('[data-dashboard][data-active="1"]');
const offered = page.locator('[data-dashboard][data-active="0"]');
const heldCount = await held.count();
const offeredCount = await offered.count();
check("trois cartes, toujours", heldCount + offeredCount === 3, `${heldCount} + ${offeredCount}`);
// The shape the review asked for, at the lot it asked for it in: under
// Lot 1 Yassine holds the organisation and nothing else, so one card is
// live and two are offers. Under Lot 2 the seed gives him both venues
// as well and all three are live — which is not a different rule, it is
// the same rule over a different account, so the count is reported
// rather than guessed.
if (LOT === 1) {
  check(
    "1 « Ouvrir » et 2 « Ajouter »",
    heldCount === 1 && offeredCount === 2,
    `${heldCount} actives, ${offeredCount} à ajouter`,
  );
} else {
  check(
    "les cartes tenues sont celles du compte",
    heldCount === 3 && offeredCount === 0,
    `${heldCount} actives, ${offeredCount} à ajouter`,
  );
}
check(
  "les cartes tenues disent « Ouvrir »",
  (await held.allTextContents()).every((t) => t.trim() === "Ouvrir"),
  (await held.allTextContents()).join(" · "),
);
check(
  "les autres disent « Ajouter »",
  (await offered.allTextContents()).every((t) => t.trim() === "Ajouter"),
  (await offered.allTextContents()).join(" · "),
);

// « Actif » left the button and became a badge beside the title. It is
// a state, and a state folded into the label of a control makes the
// partner read two things to find the one word they can press. One
// badge per held card, none anywhere else — the second half is what
// would catch it drifting back into the button.
const badge = page.locator("[data-space-state]");
check(
  "un badge « Actif » par carte tenue, et pas ailleurs",
  (await badge.count()) === heldCount &&
    (await badge.allTextContents()).every((t) => t.trim() === "Actif"),
  `${await badge.count()} badge(s) pour ${heldCount} carte(s) tenue(s)`,
);
// « Beside the title » is geometry, so it is measured: the badge shares
// the label's line and sits to its right.
if (heldCount > 0) {
  const beside = await page.evaluate(() => {
    const out = [];
    for (const pill of document.querySelectorAll("[data-space-state]")) {
      const id = pill.getAttribute("data-space-state");
      const label = document.querySelector(`[data-space-label="${id}"]`);
      if (!label) continue;
      const a = label.getBoundingClientRect();
      const b = pill.getBoundingClientRect();
      out.push({
        id,
        right: Math.round(b.left - a.right),
        sameLine: b.top < a.bottom && a.top < b.bottom,
      });
    }
    return out;
  });
  check(
    "le badge est sur la ligne du titre, à sa droite",
    beside.length === heldCount &&
      beside.every((b) => b.sameLine && b.right >= 0 && b.right <= 24),
    beside.map((b) => `${b.id} +${b.right}px${b.sameLine ? "" : " (autre ligne)"}`).join(" · "),
  );
}

// **One layout for the three.** The cards used to disagree about their
// own shape — one a link with a word floated right, the other a row
// that broke into a column under 640 — and the thing that proves they
// agree now is geometry, not markup: three action controls, each the
// width of the card that holds it, so they are all the same width as
// each other.
const actions = page.locator("[data-card] a:has([data-dashboard])");
const cardBoxes = await page.locator("[data-card]").evaluateAll((nodes) =>
  nodes.map((n) => {
    const link = n.querySelector("a:has([data-dashboard])");
    const button = link ? link.getBoundingClientRect() : null;
    // `clientWidth`, not the rect: box-sizing is border-box here, so
    // the rect carries the card's two hairlines and a full-width child
    // measures two pixels short of it. The content box is what
    // « pleine largeur » means.
    const css = getComputedStyle(n);
    const pad =
      (parseFloat(css.paddingLeft) || 0) + (parseFloat(css.paddingRight) || 0);
    return button
      ? {
          inner: Math.round(n.clientWidth - pad),
          button: Math.round(button.width),
          height: Math.round(button.height),
        }
      : null;
  }),
);
const laid = cardBoxes.filter(Boolean);
check(
  "trois cartes, un seul gabarit",
  (await actions.count()) === 3 &&
    laid.length === 3 &&
    // Full-width: the control fills its card between the paddings.
    laid.every((b) => Math.abs(b.button - b.inner) <= 1) &&
    // And the three are the same control, so the same height.
    new Set(laid.map((b) => b.height)).size === 1,
  laid.map((b) => `${b.button}/${b.inner}×${b.height}`).join(" · "),
);

// The held space is the easiest tap on the page. Not a claim about
// pixels alone — it is the primary, in violet, while the offers are
// secondary on the surface — but the pixels are what a tool can read,
// and a word floated to the right of a card was 90 of them.
if (heldCount > 0) {
  const paint = await page
    .locator('a:has([data-dashboard][data-active="1"])')
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        area: Math.round(r.width * r.height),
        bg: getComputedStyle(el).backgroundColor,
      };
    });
  const offers = offeredCount
    ? await page
        .locator('a:has([data-dashboard][data-active="0"])')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor)
    : "";
  check(
    "l'espace déjà utilisé est le bouton principal, pleine largeur",
    paint.area >= 2000 && paint.bg !== offers,
    `${paint.area} px² · ${paint.bg}${offers ? ` vs ${offers}` : " (aucune offre)"}`,
  );
}
check(
  "le sous-titre ne salue personne par son prénom",
  /Un espace par activité\. Vous pourrez en ajouter d'autres plus tard\./.test(
    await body(),
  ),
);
await shot("choisir-switcher");

// ── 9. A second space, from the sidebar card ────────────────
//
// The card above the navigation is the way to the chooser from inside
// a dashboard. It used to be a menu — the account's establishments on
// one side, the two workspaces on the other — which could not offer a
// space the account did not hold, which is the only thing worth
// pressing it for.
//
// Not on a phone: the sidebar is `hidden lg:flex` there, and the
// identity lives behind the Plus tab. The card is what this station is
// about, so it runs where the card is drawn.
if (phone) {
  console.log("  —    la carte d'espace vit dans la barre latérale, absente à 390");
} else {
  await context.clearCookies();
  // Rachid holds one establishment under Lot 1 and two under Lot 2 — a
  // restaurant and a lounge, which is **two spaces**, so under Lot 2 the
  // sign-in now lands him on the chooser rather than picking one for
  // him. That is the fix, not a detour: the card he presses decides.
  const inVenue = await signIn(page, BASE, { venue: "Dar Zellij" });
  check(
    "le partenaire se connecte",
    typeof inVenue === "string",
    typeof inVenue === "string" ? inVenue : JSON.stringify(inVenue),
  );
  if (new URL(page.url()).pathname === "/choisir") {
    check(
      "deux espaces : la connexion mène à l'écran de choix",
      true,
      page.url(),
    );
    await page
      .locator('a:has([data-dashboard="restaurant"][data-active="1"])')
      .first()
      .click();
    await settle(2400);
  }
  check(
    "et ouvre un tableau de bord de salle",
    new URL(page.url()).pathname.startsWith("/restaurant"),
    page.url(),
  );
  const card = page.locator("[data-space-card]").first();
  check("la barre latérale porte la carte d'espace", (await card.count()) > 0);
  if (await card.count()) {
    check(
      "elle nomme l'établissement en cours",
      /Dar Zellij/.test((await card.innerText()) ?? ""),
      ((await card.innerText()) ?? "").replace(/\s+/g, " ").slice(0, 60),
    );
    await card.click();
    await settle(2200);
    check(
      "elle ouvre l'écran de choix",
      new URL(page.url()).pathname === "/choisir",
      page.url(),
    );
    // The space he does not hold, added from here. « Bar ou lounge »
    // under Lot 1, where he owns one restaurant; under Lot 2 the seed
    // gives him the lounge too, so the one left is Événements.
    const add = page.locator('[data-dashboard][data-active="0"]').first();
    if ((await add.count()) === 0) {
      // Nothing left to add, which is a fact about the seed rather than
      // about the screen: under Lot 2 the owner of Dar Zellij holds the
      // lounge and the organisation as well, so all three cards are
      // live. The half of this station that adds a space is exercised
      // under Lot 1, where the same account holds one restaurant.
      console.log(
        "  —    ce compte tient les trois espaces : rien à ajouter depuis la carte",
      );
    } else {
      const which = await add.getAttribute("data-dashboard");
      await add.click();
      await settle(2600);
      const where = new URL(page.url()).pathname;
      check(
        `« Ajouter » ouvre le parcours de création (${which})`,
        which === "events"
          ? where === "/onboarding"
          : where === "/restaurant/etablissement/nouveau",
        where,
      );
      if (which !== "events") {
        // The card's hint travels, and the first step is the one the
        // 27 October decision put in front of the others.
        check(
          "le type de la carte voyage dans l'URL",
          page.url().includes(`type=${which}`),
          page.url(),
        );
        check(
          "et la création s'ouvre sur le mode de gestion",
          (await stepName()) === "Mode de gestion des réservations",
          await stepName(),
        );
      }
    }
  }
  await shot("second-espace");
}

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
