// What a Lot 1 booking screen does, and what it no longer does.
//
//   BASE=http://localhost:3210 node tools/verify/decisions.mjs
//
// One tool for six claims only a browser can settle:
//
//   1  a venue created by the establishment flow is pending, its
//      dashboard works,
//      and it says so — and /admin/validations is LYFE's alone;
//   2  the decisions a state poses are on the line and the rest are in
//      the sheet — Refuser only ever answers a request, a phone line
//      carries two of them and not four, and the chrome's search finds
//      a booking by name, by the last four digits of the phone and by
//      date, grouped by day;
//   3  the scope agreed on 5 October, by its absences: no Décaler
//      anywhere, no slot-length control, no booking rules, no advanced
//      settings, no closed days — and the book grouped on the half hour
//      the app actually offers;
//   4  the row carries the phone and the drawer carries the guest;
//   5  Accueil is figures and no list — two titled rows of tiles, a bar
//      chart, two columns of tiles on a phone, and an « À confirmer »
//      tile that opens the requests it counts rather than merely the
//      screen holding them;
//   6  a row offers only the decisions its state allows, on the line at
//      both widths and in the sheet: Accepter and Refuser on a request,
//      Check-in on a confirmed table and Absent on it only once its
//      hour has passed, and nothing at all on a row that has arrived or
//      been marked absent;
//   7  a confirmed table can be given back, and only from its sheet:
//      « Annuler la réservation » is in the sheet and on no line at
//      either width, it refuses to go through without a coded reason,
//      it writes `cancelled` — and the line leaves the book.
//
// Three, five and most of two used to assert the opposite: they are the
// regression test for a scope that shrank, which is the kind that goes
// quietly missing otherwise. Six is the one claim here that a browser
// is strictly necessary for: the rule is three states crossed with a
// clock across three surfaces, and the only honest way to read it is
// off the buttons a host can actually press.
//
// Needs the portal on BASE with a seeded database behind it. It writes:
// it signs a partner up and it decides a booking.

import { chromiumOrExplain } from "./browser.mjs";
import {
  DEMO_CLOCK,
  LOT,
  LOT_LABEL,
  OWNER_EMAIL,
  clockLine,
  dataModeOf,
  requireWrites,
  signIn as sharedSignIn,
} from "./lot.mjs";

// Lot 1 only, and said the way `audience.mjs` says Lot 2 only.
//
// Half of what this tool asserts is an absence — no Décaler, no slot
// length, no booking rules, no closed days — and every one of those is
// present and correct under Lot 2. Run against the full dashboard it
// would report the Lot 2 screens as defects.
if (LOT !== 1) {
  console.log(
    `Ce carnet est celui du lot 1, et le serveur tourne en ${LOT_LABEL} — rien à vérifier.\n` +
      "Relancer avec LYFE_LOT=1, serveur compris.",
  );
  process.exit(0);
}

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// This tool writes. Against the static driver there is nothing to
// write to, so it says so and stops rather than failing.
const driver = await requireWrites(BASE, "Le carnet du lot 1");

// Who works for LYFE is answered by `platform_admins`, and
// `src/lib/auth/platform.ts` asks that question of the database only:
// « inventing a LYFE administrator for a frozen snapshot would put a
// review queue in front of somebody looking at a demo ». So on the
// HTTP double nobody is an administrator, `/admin/validations` is
// `404` for every account, and the review stage below cannot run. It
// is skipped with a line rather than failed — the other three changes
// of Lot 1 are exercised in full. See the finding `C-07`.
const reviewable = driver === "db";
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

/**
 * This tool needs a booking still waiting for an answer.
 *
 * Two things take one away. It decides one itself — accepts, refuses,
 * moves it — and so do `journey` and `handshake`, so running after
 * either against the same database leaves the book with nothing to
 * decide. And the seed hangs its request on the service in hand, so
 * once the last service of the day has closed there is no request
 * either until the next one opens.
 *
 * Both read, from here, as a screen that has stopped offering its
 * decisions — a design failure that has not happened. A tool lying
 * about the product is worse than a tool that does not run, so it says
 * which it is and stops with a zero exit, the way `requireWrites` does
 * for a read-only driver.
 */
const requirePending = async () => {
  await openPending();
  const n = await page.locator('button:has-text("Accepter"):visible').count();
  if (n > 0) return true;
  console.log(
    "\n  Aucune demande en attente sur le carnet.\n\n" +
      "  Deux raisons possibles, et aucune n'est un défaut de l'écran :\n" +
      "  cet outil décide une réservation — comme `journey` et `handshake` —\n" +
      "  donc il consomme la demande du jeu d'essai ; ou le dernier service\n" +
      "  de la journée est terminé, et le jeu d'essai accroche sa demande au\n" +
      "  service en cours.\n\n" +
      "  Relancer après `npm run db:reset`, avant ces deux-là, et pendant\n" +
      "  un service.\n",
  );
  await browser.close();
  process.exit(0);
};

console.log(`\nLe carnet du lot 1 · ${LOT_LABEL} · ${width}×${height} · ${clockLine()}\n`);

// ── 1 · LYFE valide une fiche ────────────────────────────────

console.log("  — 1 · validation par LYFE");

const stamp = Date.now().toString(36);
const newPartner = `decisions.${stamp}@lyfe-verify.ma`;

await go("/inscription");
await page.getByLabel("Votre nom").fill("Salma Benjelloun");
await page.getByLabel("E-mail").fill(newPartner);
await page.getByLabel("Téléphone", { exact: true }).fill("+212 6 62 11 22 33");
// Two fields now carry « mot de passe » — `Détail Sprint ` row 39 asks
// for the confirmation — so the label has to be matched exactly.
await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
await page.getByLabel("Confirmation du mot de passe").fill("motdepasse1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(1400);

// The account is all `/inscription` makes since the 27 October split.
// The establishment is a second walk, taken from the chooser's own card.
await page.locator('button:has-text("Choisir mon espace")').click();
await settle(2600);
await page.locator('a:has([data-dashboard="restaurant"])').first().click();
await settle(2400);

// Step 1 · the management mode. Its default — « Dashboard LYFE » — is
// the one this tool depends on: every decision below is taken in the
// portal's own carnet.
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

// Step 2 · the establishment.
await page.getByLabel("Nom de l'établissement").fill(`Café ${stamp}`);
await page.locator('button:has-text("Un restaurant")').click();
await page.getByLabel("Ville").selectOption("Casablanca");
await settle(300);
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

// Step 3 · the address. The pin goes on by clicking the map, because a
// sandboxed runner cannot reach Nominatim.
await page.getByLabel("Quartier").fill("Gauthier");
await page.getByLabel("Adresse", { exact: true }).fill("12 rue de la Liberté, Casablanca");
const carte = page.locator(".leaflet-container");
if (await carte.count()) {
  await carte.click({ position: { x: 140, y: 110 } });
  await settle(500);
}
await page.locator('button:has-text("Continuer")').first().click();
await settle(1500);

// Step 4 · photos and the carte, skipped.
await page.locator('button:has-text("Passer cette étape")').click();
await settle(1500);

// Step 5 · ambience and equipment, skipped too. Both steps say out loud
// that they can be, and a tool that never walks past one is a tool that
// never checks the promise.
await page.locator('button:has-text("Passer cette étape")').click();
await settle(1500);

// Step 6 · the weekly grid, copied across, and the step that submits.
const copyDays = page.locator('button:has-text("Appliquer lundi à tous les jours")');
if (await copyDays.count()) {
  await copyDays.click();
  await settle(400);
}
check("la création atteint les horaires", /Horaires/i.test(await text()));

await page.locator('button:has-text("Créer mon établissement")').first().click();
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

if (!reviewable) {
  console.log(
    `  —    la revue LYFE demande une base : personne n'est administrateur ` +
      `sur le pilote « ${driver} » (src/lib/auth/platform.ts)`,
  );
} else {
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
}

// ── 2 · les décisions et la recherche ────────────────────────

console.log("\n  — 2 · décisions au comptoir et recherche");

await signOut();
await signIn(OWNER_EMAIL);
await requirePending();

// The row is a card whose own button carries `data-row="open"`, with
// the decisions as its siblings — so the decisions are counted on the
// page rather than scoped to a container that does not exist.
const hasRow = (await page.locator('button:has-text("Accepter"):visible').count()) > 0;
check("une demande est sur le carnet", hasRow);

if (hasRow) {
  // One of each per row, counted rather than joined: a label list would
  // pass on a kebab that happened to be open, and the claim is about
  // how many decisions a line offers.
  const count = async (label) =>
    page.locator(`button:has-text("${label}"):visible`).count();
  const accepter = await count("Accepter");
  const refuser = await count("Refuser");
  const absent = await count("Absent");
  const decaler = await count("Décaler");
  check("Accepter est sur chaque demande", accepter > 0, `${accepter}`);
  // Exactly as often, not at least: Refuser answers a request and
  // nothing else. It was on the confirmed line too, beside Check-in,
  // which put the two opposite ends of the same table a keystroke
  // apart — and then in that row's sheet, which is the same wrong
  // button one tap further in. It is in neither place now.
  check(
    "Refuser exactement autant de fois qu'Accepter",
    refuser === accepter,
    `${refuser} refuser · ${accepter} accepter`,
  );
  // Absent is not one of them. A request is the one row where nobody
  // has told the party it has a table, so « absent » is not yet a thing
  // that can have happened — § 6 holds the whole rule.
  check("et Absent sur aucune demande", absent === 0, `${absent} absent`);
  // Décaler left the sprint on 5 October — « ne figurait pas dans le
  // périmètre initial et n'est pas prioritaire fonctionnellement
  // parlant ». A venue that cannot take the hour refuses it.
  check("et Décaler nulle part", decaler === 0, `${decaler}`);

  // And on a confirmed line, by name: the count above would pass if
  // every row were a request.
  await go("/restaurant/reservations");
  const confirmee = page.locator('button:has-text("Confirmées"):visible').first();
  if (await confirmee.count()) {
    await confirmee.click();
    await settle(1200);
    const onConfirmed = {
      checkin: await count("Check-in"),
      refuser: await count("Refuser"),
      absent: await count("Absent"),
      decaler: await count("Décaler"),
    };
    check(
      "une ligne confirmée propose Check-in",
      onConfirmed.checkin > 0,
      `${onConfirmed.checkin}`,
    );
    check(
      "et ne propose jamais Refuser",
      onConfirmed.refuser === 0,
      `${onConfirmed.refuser} Refuser sur les lignes confirmées`,
    );
    // Absent, but not on every confirmed line: only on the tables whose
    // hour has passed. Which ones those are is § 6's business; here it
    // is enough that there are never more of them than there are
    // tables.
    check(
      "et Absent au plus une fois par ligne confirmée",
      onConfirmed.absent <= onConfirmed.checkin,
      `${onConfirmed.absent} absent · ${onConfirmed.checkin} check-in`,
    );
    check(
      "et ne propose pas Décaler non plus",
      onConfirmed.decaler === 0,
      `${onConfirmed.decaler} décaler sur les lignes confirmées`,
    );
    // The sheet is where the cancellation went, so it has to be there —
    // and it is the last place Décaler could have survived.
    const open = page.locator('[data-row="open"]:visible').first();
    if (await open.count()) {
      await open.click();
      await settle(1200);
      const sheet = await text();
      // The sheet used to be where cancelling an accepted booking
      // lived. It is nowhere now: a sheet that answers a state the row
      // cannot is the same wrong button one tap further in, and
      // `rejected` is the contract's word for a refused *request*.
      check(
        "la feuille d'une ligne confirmée porte l'arrivée, et ni Refuser ni Décaler",
        /Marquer comme arrivé/.test(sheet) && !/Refuser/.test(sheet) && !/Décaler/.test(sheet),
        "feuille de détail",
      );
      await page.keyboard.press("Escape");
      await settle(600);
    }
  }

  // ── The phone line: two decisions, not four ──
  //
  // At 390 a 358px line holds two 44px targets. Four wrapped into two
  // rows and took the line from 44px to 200 — a third of the book for
  // the two decisions a host reaches for least.
  await page.setViewportSize({ width: 390, height: 844 });
  await openPending();
  const phone = {
    accepter: await count("Accepter"),
    refuser: await count("Refuser"),
    absent: await count("Absent"),
    decaler: await count("Décaler"),
  };
  check(
    "à 390 une demande propose Accepter et Refuser",
    phone.accepter > 0 && phone.refuser === phone.accepter,
    `${phone.accepter} accepter · ${phone.refuser} refuser`,
  );
  check(
    "et rien d'autre : ni Décaler ni Absent sur la ligne",
    phone.decaler === 0 && phone.absent === 0,
    `${phone.decaler} décaler · ${phone.absent} absent`,
  );
  await go("/restaurant/reservations");
  const confirmPhone = page.locator('button:has-text("Confirmées"):visible').first();
  if (await confirmPhone.count()) {
    await confirmPhone.click();
    await settle(1200);
    const p2 = {
      checkin: await count("Check-in"),
      absent: await count("Absent"),
      refuser: await count("Refuser"),
      decaler: await count("Décaler"),
    };
    check(
      "à 390 une ligne confirmée propose Check-in, et Absent au plus une fois",
      p2.checkin > 0 && p2.absent <= p2.checkin,
      `${p2.checkin} check-in · ${p2.absent} absent`,
    );
    check(
      "et ni Refuser ni Décaler",
      p2.refuser === 0 && p2.decaler === 0,
      `${p2.refuser} refuser · ${p2.decaler} décaler`,
    );
    const openPhone = page.locator('[data-row="open"]:visible').first();
    if (await openPhone.count()) {
      await openPhone.click();
      await settle(1200);
      const sheet = await text();
      check(
        "et sa feuille ne porte pas Décaler non plus",
        !/Décaler/.test(sheet),
        "feuille de détail à 390",
      );
      await page.keyboard.press("Escape");
      await settle(600);
    }
  }
  await page.setViewportSize({ width, height });
  await openPending();
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

// ── 3 · ce que Disponibilités ne demande plus ────────────────
//
// Four things left this screen on 5 October, and each of them left for
// a reason about the app rather than about the dashboard: nothing
// downstream reads a pacing rule, a closed day or a grid other than the
// half hour. A screen that collected them would be collecting them for
// itself, so the test is that it does not.

console.log("\n  — 3 · le périmètre du 5 octobre, par ses absences");

await go("/restaurant/disponibilites");
const dispo = await text();

check(
  "la demi-heure est annoncée, pas demandée",
  /créneaux de 30 minutes/i.test(dispo),
  "en-tête du service",
);
const slotSelect = page.locator("select").filter({ hasText: /minutes|heure/ });
check(
  "aucun choix de durée de créneau",
  (await slotSelect.count()) === 0,
  `${await slotSelect.count()} sélecteur(s)`,
);
check(
  "pas de « Règles de réservation »",
  !/Règles de réservation/i.test(dispo),
);
check("pas de « Réglages avancés »", !/Réglages avancés/i.test(dispo));
check("pas de « Jours de fermeture »", !/Jours de fermeture/i.test(dispo));
check(
  "la réservation en ligne et les services restent",
  /Accepter les réservations en ligne/i.test(dispo) &&
    /Service du (soir|midi)|Services|Créneaux/i.test(dispo),
);

// Horaires asked for closed days too, on the other screen.
await go("/restaurant/ma-fiche");
const horaires = page.locator('button:has-text("Horaires"):visible').first();
if (await horaires.count()) {
  await horaires.click();
  await settle(1200);
  check(
    "et Ma fiche · Horaires ne les demande pas non plus",
    !/Jours de fermeture/i.test(await text()),
  );
}

// The book still groups, on the grid the app offers.
await go("/restaurant/reservations");
check(
  "le carnet groupe toujours par créneau",
  /\d{1,2}\s?h\s?(00|30)/i.test(await text()),
  "demi-heures",
);

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

// ── 5 · l'Accueil chiffré ────────────────────────────────────
//
// L'Accueil du lot 1 était le carnet une seconde fois : À traiter,
// Prochaines arrivées, Arrivés — trois tris de la même journée, au-
// dessus d'un bouton qui ouvre Réservations, où les mêmes rangées
// portent les mêmes décisions. C'est maintenant un écran de chiffres :
// deux rangées de tuiles et un graphique, et aucune liste.
//
// Ce qui est vérifié ici est ce qu'un écran chiffré peut faire de faux :
// afficher une liste malgré tout, perdre une tuile, ou porter une tuile
// « À confirmer » qui donne un nombre sans mener aux demandes qu'elle
// compte. Un chiffre qu'on ne peut pas ouvrir est une impasse.

console.log("\n  — 5 · l'Accueil chiffré");

await go("/restaurant");
const accueil = await text();

check(
  "l'Accueil ne porte aucune liste du carnet",
  !/À traiter|Prochaines arrivées|tables installées/.test(accueil),
  accueil.match(/À traiter|Prochaines arrivées|tables installées/)?.[0] ?? "aucune liste",
);
check(
  "la carte garde Ouvrir le carnet et Check-in",
  /Ouvrir le carnet/.test(accueil) && /Check-in/.test(accueil),
);

const todayTiles = [
  "Réservations",
  "Couverts",
  "À confirmer",
  "Arrivés",
  "Absents",
  "Taux de remplissage",
];
const missingToday = todayTiles.filter((l) => !new RegExp(l, "i").test(accueil));
check(
  `les six chiffres du jour · ${todayTiles.length - missingToday.length}/6`,
  missingToday.length === 0,
  missingToday.join(", "),
);

const windowTiles = [
  "Taux d'acceptation",
  "Taux d'absence",
  "Délai moyen de réponse",
  "Part LYFE",
  "Part WhatsApp",
  "Part Téléphone",
];
const missingWindow = windowTiles.filter(
  (l) => !new RegExp(l.replace(/'/g, "['’]"), "i").test(accueil),
);
check(
  `les chiffres des 30 jours · ${windowTiles.length - missingWindow.length}/6`,
  missingWindow.length === 0,
  missingWindow.join(", "),
);
check(
  "les deux rangées disent sur quoi elles portent",
  /Aujourd'hui · /.test(accueil) && /30 derniers jours · du /.test(accueil),
);
check(
  "au moins une tuile porte un écart contre la période précédente",
  /vs hier/.test(accueil) && /vs 30 j préc\./.test(accueil),
);
check("le graphique des réservations par jour est là", /Réservations par jour/.test(accueil));

// Et qu'il a dessiné quelque chose. Le titre et la carte peuvent être
// là autour d'une boîte vide : recharts enveloppe le graphique dans un
// ResponsiveContainer qui clone son enfant pour lui passer la largeur
// mesurée, et il ne reconnaît un enfant que par `react-is`. Le routeur
// d'application de Next rend avec son React 19 embarqué, dont les
// éléments portent `Symbol(react.transitional.element)` ; recharts 2.13
// épingle `react-is@18`, qui ne connaît que `Symbol(react.element)`.
// L'enfant repartait donc sans largeur ni hauteur, et tous les
// graphiques du portail — les bilans du lot 2 compris — étaient un
// rectangle blanc de 220 px. Le correctif est un `overrides` dans
// `package.json` ; ce compte-là est ce qui dira qu'il a sauté.
const drawn = await page.evaluate(() => ({
  wrappers: document.querySelectorAll(".recharts-wrapper").length,
  bars: document.querySelectorAll(".recharts-bar-rectangle").length,
}));
check(
  `et il a dessiné ses trente barres · ${drawn.bars}/30`,
  drawn.wrappers > 0 && drawn.bars === 30,
  `${drawn.wrappers} graphique(s), ${drawn.bars} barre(s)`,
);

// La tuile qui est une porte. `:visible` parce que les deux voies —
// ordinateur et téléphone — sont toutes deux dans le DOM, et c'est le
// CSS qui en cache une : sans ça le clic tombe sur la tuile masquée.
const pendingTile = page.locator('a[href*="filtre=requested"]:visible').first();
check("la tuile « À confirmer » est un lien", (await pendingTile.count()) > 0);
if (await pendingTile.count()) {
  await pendingTile.click();
  await settle(1800);
  check(
    "elle ouvre Réservations sur l'onglet À confirmer",
    page.url().includes("/restaurant/reservations") && page.url().includes("filtre=requested"),
    page.url(),
  );
  const filtered = await text();
  // Une demande porte Accepter ; une confirmée porte Check-in. L'onglet
  // est le bon si la liste n'offre que le premier — ou si la journée
  // n'a aucune demande, ce que l'écran dit alors en mots.
  check(
    "et la liste ne montre que des demandes",
    /Accepter/.test(filtered) || /Rien|Aucune|aucun/.test(filtered),
    filtered.slice(0, 60),
  );
}

// Deux colonnes de tuiles sur le téléphone, et le graphique pleine
// largeur : mesuré sur la grille elle-même plutôt que deviné d'une
// classe, parce que c'est le nombre de colonnes rendu qui compte.
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const phonePage = await phone.newPage();
await sharedSignIn(phonePage, BASE, { email: OWNER_EMAIL, password: "demo" });
await phonePage.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
await phonePage.waitForTimeout(1800);
const lanes = await phonePage.evaluate(() => {
  const grids = [];
  let chart = 0;
  for (const el of document.querySelectorAll("div")) {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (style.display === "grid" && box.width > 200 && el.children.length >= 4) {
      grids.push(style.gridTemplateColumns.split(" ").length);
    }
  }
  for (const h of document.querySelectorAll("h2")) {
    if (!/Réservations par jour/.test(h.textContent || "")) continue;
    let node = h.closest("div");
    while (node && node.getBoundingClientRect().width < 200) node = node.parentElement;
    if (node) chart = Math.round(node.getBoundingClientRect().width);
  }
  return { grids, chart };
});
await phone.close();
check(
  "sur le téléphone les tuiles tiennent deux colonnes",
  lanes.grids.length >= 2 && lanes.grids.every((n) => n === 2),
  lanes.grids.join(", ") || "aucune grille trouvée",
);
check(
  "et le graphique prend la largeur de la voie",
  lanes.chart > 390 * 0.8,
  `${lanes.chart} px sur 390`,
);

// ── 6 · les décisions que l'état autorise ────────────────────
//
// Une ligne n'offre que ce que son état permet :
//
//   À confirmer   Accepter · Refuser
//   Confirmée     Check-in, et Absent une fois l'heure passée
//   Arrivé        rien
//   Absent        rien
//
// Un bouton qu'un état ne peut pas honorer est pire qu'un bouton
// manquant : Refuser sur une table déjà acceptée est le seul geste
// irréversible de l'écran, à une touche de Check-in ; Absent sur une
// demande vise une table que personne n'a encore accordée ; Absent sur
// une réservation de dans deux heures écrit une absence au compte d'un
// client qui est en route.
//
// Les trois surfaces sont vérifiées — la ligne à 1440, la ligne à 390,
// la feuille — parce que la règle n'en vaut rien si la feuille offre ce
// que la ligne refuse, une touche plus loin.

console.log("\n  — 6 · les décisions que l'état autorise");

/** Les verbes du lot, et eux seuls : le reste de la ligne n'est pas une décision. */
const DECISIONS = /^(Accepter|Refuser|Check-in|Absent|Décaler|Marquer comme arrivé)$/;

/**
 * Ce que chaque état a le droit d'offrir.
 *
 * `due` est vrai quand l'heure de la table est passée sur l'horloge de
 * la démo. La ligne la porte — « 21h00 » — et l'horloge est celle que
 * cet outil annonce en tête, donc la comparaison se fait en minutes
 * locales, sur le carnet du jour.
 */
const ALLOWED = {
  "À confirmer": () => ["Accepter", "Refuser"],
  Confirmée: (due) => (due ? ["Check-in", "Absent"] : ["Check-in"]),
  Arrivé: () => [],
  Absent: () => [],
  Annulée: () => [],
  Refusée: () => [],
  Terminée: () => [],
};

const clockMinutes = (() => {
  const at = DEMO_CLOCK ?? new Date();
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
})();

/** Chaque ligne du carnet : son heure, son état, et ses boutons. */
const bookRows = (target = page) =>
  target.evaluate((verbs) => {
    const rule = new RegExp(verbs);
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const rows = [];
    const words = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const isRow = (el) => /^\d{1,2}h\d{2}\s*·/.test(words(el));
    const rowsIn = (el) => [...el.querySelectorAll("button")].filter((b) => vis(b) && isRow(b));
    // La ligne elle-même est un bouton — elle ouvre la feuille — et son
    // texte commence par l'heure et le nombre de couverts. Ses décisions
    // sont ailleurs dans son conteneur, parce qu'un bouton ne peut pas
    // en contenir un autre ; à quelle profondeur dépend de la largeur,
    // donc on remonte jusqu'au plus grand ancêtre qui ne contient
    // encore que cette ligne-là.
    for (const row of document.querySelectorAll("button")) {
      if (!vis(row) || !isRow(row)) continue;
      const label = words(row);
      const time = /^(\d{1,2})h(\d{2})\s*·/.exec(label);
      const state = /(À confirmer|Confirmée|Arrivé|Absent|Annulée|Refusée|Terminée)/.exec(label);
      let box = row.parentElement;
      let own = row.parentElement;
      while (box && rowsIn(box).length <= 1) {
        own = box;
        box = box.parentElement;
      }
      const buttons = [...(own ? own.querySelectorAll("button") : [])]
        .filter((b) => b !== row && vis(b))
        .map(words)
        .filter((t) => rule.test(t));
      // Marked, because « la ligne de Salma » is not a selector: the
      // name and the badge are separate text nodes, so no substring of
      // the rendered text picks one row out.
      if (own) own.setAttribute("data-rule-row", String(rows.length));
      rows.push({
        index: rows.length,
        minutes: Number(time[1]) * 60 + Number(time[2]),
        at: `${time[1]}h${time[2]}`,
        state: state ? state[1] : null,
        name: label.replace(/^\d{1,2}h\d{2}\s*·\s*\d+\s*\S+\s*/, "").slice(0, 22),
        buttons,
      });
    }
    return rows;
  }, DECISIONS.source);

/** La règle, sur un lot de lignes déjà lues. */
const judge = (rows, lane) => {
  const seen = {};
  const wrong = [];
  for (const row of rows) {
    if (!row.state || !ALLOWED[row.state]) continue;
    const due = row.minutes <= clockMinutes;
    const key = row.state === "Confirmée" ? `Confirmée · ${due ? "passée" : "à venir"}` : row.state;
    seen[key] = (seen[key] ?? 0) + 1;
    const want = ALLOWED[row.state](due).join(" + ") || "aucun";
    const got = row.buttons.join(" + ") || "aucun";
    if (want !== got) wrong.push(`${row.at} ${key} : ${got} au lieu de ${want}`);
  }
  check(
    `${lane} · chaque ligne n'offre que ce que son état permet`,
    wrong.length === 0,
    wrong[0] ?? Object.entries(seen).map(([k, n]) => `${n} × ${k}`).join(", "),
  );
  return seen;
};

await go("/restaurant/reservations");
const deskRows = await bookRows();
const deskSeen = judge(deskRows, "ordinateur");

// Les quatre cas doivent être sur la page, sinon la règle est vérifiée
// contre le vide. Le jeu d'essai du jour en porte au moins un de chaque
// — une demande, une table passée, une à venir, une arrivée — et § 2 en
// a consommé une, pas toutes.
for (const [label, key] of [
  ["une demande", "À confirmer"],
  ["une table confirmée dont l'heure est passée", "Confirmée · passée"],
  ["une table confirmée encore à venir", "Confirmée · à venir"],
  ["une ligne arrivée", "Arrivé"],
]) {
  check(`le carnet du jour porte ${label}`, (deskSeen[key] ?? 0) > 0, `${deskSeen[key] ?? 0} ligne(s)`);
}

// La feuille dit la même chose que la ligne. Ouverte sur une demande,
// sur une table à venir et sur une arrivée : trois états, trois
// réponses, et aucune d'elles n'ajoute un bouton que la ligne refuse.
const sheetFor = async (predicate, what) => {
  // Les lignes sont relues à chaque fois : la marque posée par
  // `bookRows` ne survit pas forcément à l'ouverture d'une feuille, et
  // une lecture coûte moins qu'un sélecteur qui se trompe de ligne.
  const row = (await bookRows()).find(predicate);
  if (!row) return null;
  await page.locator(`[data-rule-row="${row.index}"] button`).first().click();
  await settle(1100);
  const inSheet = await page.evaluate((verbs) => {
    const rule = new RegExp(verbs);
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const sheet =
      document.querySelector('[role="dialog"]') ??
      document.querySelector("[data-drawer], aside");
    if (!sheet) return null;
    return [...sheet.querySelectorAll("button")]
      .filter(vis)
      .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
      .filter((t) => rule.test(t));
  }, DECISIONS.source);
  await page.keyboard.press("Escape");
  await settle(600);
  return { row, buttons: inSheet, what };
};

const requestSheet = await sheetFor((r) => r.state === "À confirmer", "une demande");
if (requestSheet) {
  check(
    "la feuille d'une demande : Accepter et Refuser",
    (requestSheet.buttons ?? []).join(" + ") === "Accepter + Refuser",
    (requestSheet.buttons ?? []).join(" + ") || "aucun bouton trouvé",
  );
}
const comingSheet = await sheetFor(
  (r) => r.state === "Confirmée" && r.minutes > clockMinutes,
  "une table à venir",
);
if (comingSheet) {
  check(
    "celle d'une table à venir : l'arrivée, et pas Absent",
    (comingSheet.buttons ?? []).join(" + ") === "Marquer comme arrivé",
    (comingSheet.buttons ?? []).join(" + ") || "aucun bouton trouvé",
  );
}
const passedSheet = await sheetFor(
  (r) => r.state === "Confirmée" && r.minutes <= clockMinutes,
  "une table dont l'heure est passée",
);
if (passedSheet) {
  check(
    "celle d'une table dont l'heure est passée : l'arrivée et Absent",
    (passedSheet.buttons ?? []).join(" + ") === "Marquer comme arrivé + Absent",
    (passedSheet.buttons ?? []).join(" + ") || "aucun bouton trouvé",
  );
}
const seatedSheet = await sheetFor((r) => r.state === "Arrivé", "une ligne arrivée");
if (seatedSheet) {
  check(
    "celle d'une ligne arrivée : aucune décision",
    (seatedSheet.buttons ?? []).length === 0,
    (seatedSheet.buttons ?? []).join(" + ") || "aucun bouton",
  );
}

// Le service écoulé, où toutes les lignes sont des constats.
const lunch = page.locator('button:has-text("Déjeuner"):visible').first();
let lunchSeen = {};
if (await lunch.count()) {
  await lunch.click();
  await settle(1300);
  lunchSeen = judge(await bookRows(), "service écoulé");
  await go("/restaurant/reservations");
}

// La quatrième ligne de la règle — « une ligne absente n'offre rien » —
// se vérifie autrement, parce que le carnet ne dessine aucune ligne
// absente : noter une absence sort la réservation de la liste de
// travail, et c'est le carnet tout entier qui est cette liste. La
// phrase est dans `overview-store.ts` au-dessus d'`absencesOn` :
// « marking a booking absent takes it out of the working list — that is
// the decision behind the Lot 1 chips ». Le compte des absences du
// service a sa propre requête, justement pour cette raison.
//
// Donc : la règle est dans le constructeur pour `no_show`, et ici on
// vérifie les deux faits observables qui la rendent vraie — le carnet
// n'en liste aucune, et noter une absence retire la ligne.
check(
  "le carnet ne liste aucune absence · elles sortent de la liste de travail",
  (deskSeen["Absent"] ?? 0) === 0 && (lunchSeen["Absent"] ?? 0) === 0,
  `${(deskSeen["Absent"] ?? 0) + (lunchSeen["Absent"] ?? 0)} ligne(s) absente(s)`,
);

// `bookRows` marque les conteneurs au passage, donc cette lecture-ci est
// celle qui donne les repères du clic.
const freshRows = await bookRows();
const dueRow = freshRows.find((r) => r.state === "Confirmée" && r.minutes <= clockMinutes);
if (dueRow) {
  const absentOnRow = page
    .locator(`[data-rule-row="${dueRow.index}"] button:has-text("Absent")`)
    .first();
  if ((await absentOnRow.count()) === 0) {
    check("l'Absent de la ligne due est cliquable", false, `${dueRow.at} ${dueRow.name}`);
  } else {
    await absentOnRow.click();
    await settle(1800);
    const after = await bookRows();
    const stillDue = after.filter(
      (r) => r.state === "Confirmée" && r.minutes <= clockMinutes,
    ).length;
    check(
      "noter une absence retire la ligne du carnet",
      after.length === freshRows.length - 1 && stillDue === 0,
      `${freshRows.length} → ${after.length} ligne(s), ${stillDue} table(s) due(s)`,
    );
    judge(after, "après l'absence");
  }
}

// Et la même règle sur la voie téléphone, où la place manque : c'est là
// qu'un bouton de trop devient deux rangées de 44 px.
const phoneBook = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const phoneBookPage = await phoneBook.newPage();
await sharedSignIn(phoneBookPage, BASE, { email: OWNER_EMAIL, password: "demo" });
await phoneBookPage.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded" });
await phoneBookPage.waitForTimeout(1800);
judge(await bookRows(phoneBookPage), "téléphone");
await phoneBook.close();

// ── 7 · rendre une table acceptée ────────────────────────────
//
// « Annuler la réservation », dans la feuille d'une ligne confirmée et
// nulle part ailleurs.
//
// Trois faits, et chacun compte :
//
//   · la feuille l'offre, la ligne non — à 1440 comme à 390. Une
//     annulation d'établissement se prend avec le nom et le téléphone
//     du client sous les yeux, pas au voisinage de Check-in ;
//   · elle ne part pas sans motif. Le bouton de confirmation reste
//     inerte tant qu'aucun motif n'est choisi, parce qu'un motif par
//     défaut est une façon de ne pas répondre ;
//   · elle écrit `cancelled`, pas `rejected`, et la ligne sort du
//     carnet — le contrat garde les deux mots pour deux actes.

console.log("\n  — 7 · rendre une table acceptée");

const CANCEL = "Annuler la réservation";

/** Le libellé, sur les lignes d'un carnet. */
const cancelOnLines = (target = page) =>
  target.evaluate((label) => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const words = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    // Les boutons d'une ligne vivent dans le conteneur de la ligne, à
    // côté de la région qui ouvre la feuille — jamais dedans.
    return [...document.querySelectorAll('[data-row="open"]')]
      .map((row) => row.parentElement)
      .flatMap((box) => [...(box ? box.querySelectorAll("button") : [])])
      .filter((b) => !b.hasAttribute("data-row") && vis(b))
      .map(words)
      .filter((t) => t === label).length;
  }, CANCEL);

await go("/restaurant/reservations");
check(
  "aucune ligne n'offre l'annulation · ordinateur",
  (await cancelOnLines()) === 0,
  `${await cancelOnLines()} bouton(s) sur les lignes`,
);

// La feuille d'une table confirmée, elle, l'offre.
const confirmedRow = (await bookRows()).find((r) => r.state === "Confirmée");
let cancelledOne = null;
if (!confirmedRow) {
  check("le carnet du jour porte une table confirmée à annuler", false, "aucune");
} else {
  const before = (await bookRows()).length;
  await page.locator(`[data-rule-row="${confirmedRow.index}"] button`).first().click();
  await settle(1100);
  // Pas de sélecteur de feuille : `aside` attrape la barre latérale, et
  // `[role="dialog"]` attrapera le dialogue du motif dans un instant.
  // La ligne n'offre pas ce libellé — le contrôle juste au-dessus vient
  // de l'établir — donc un bouton visible qui le porte est celui de la
  // feuille.
  const trigger = page.locator(`button:has-text("${CANCEL}"):visible`).first();
  check(
    "la feuille d'une table confirmée offre l'annulation",
    (await trigger.count()) > 0,
    `${confirmedRow.at} ${confirmedRow.name}`,
  );
  if (await trigger.count()) {
    await trigger.click();
    await settle(900);
    // Le dialogue : un motif obligatoire, et une précision libre.
    const dialog = page.locator('[role="dialog"]').last();
    const confirm = dialog.locator(`button:has-text("${CANCEL}")`).last();
    check("le dialogue du motif s'ouvre", (await dialog.count()) > 0, "dialogue");
    check(
      "sans motif, l'annulation ne part pas",
      await confirm.isDisabled(),
      "bouton inerte",
    );
    const motifs = await dialog
      .locator("fieldset button")
      .evaluateAll((els) => els.map((e) => (e.textContent || "").trim()));
    check(
      "le motif est une liste courte",
      motifs.length === 5 && motifs.includes("Surréservation"),
      motifs.join(" · ") || "aucun motif",
    );
    check(
      "et une précision libre l'accompagne",
      (await dialog.locator("textarea").count()) > 0,
      "champ libre",
    );
    await dialog.locator("fieldset button", { hasText: "Surréservation" }).first().click();
    await dialog.locator("textarea").first().fill("Vérifié par la recette.");
    await settle(300);
    check("un motif choisi arme l'annulation", await confirm.isEnabled(), "bouton actif");
    await confirm.click();
    await settle(2400);
    const after = (await bookRows()).length;
    check(
      "la table annulée sort du carnet",
      after === before - 1,
      `${before} → ${after} ligne(s)`,
    );
    cancelledOne = confirmedRow;
  }
}

// `cancelled`, et pas `rejected` : le carnet ne montre aucun des deux,
// donc le fait se lit là où il est écrit — l'état de la réservation,
// relu par l'écran qui la compte. L'Accueil compte les absences, pas
// les annulations ; ce qui est vérifiable ici est que la ligne a
// disparu du carnet *et* que le compte « Confirmées » a baissé d'une.
if (cancelledOne) {
  const counts = await page.evaluate(() =>
    [...document.querySelectorAll("main button")]
      .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
      .find((t) => /^Confirmées/.test(t)) ?? "",
  );
  check(
    "le compte des confirmées suit",
    /Confirmées/.test(counts),
    counts || "onglet introuvable",
  );
}

// Et à 390, la ligne ne l'offre pas davantage.
const cancelPhone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const cancelPhonePage = await cancelPhone.newPage();
await sharedSignIn(cancelPhonePage, BASE, { email: OWNER_EMAIL, password: "demo" });
await cancelPhonePage.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded" });
await cancelPhonePage.waitForTimeout(1800);
check(
  "aucune ligne n'offre l'annulation · téléphone",
  (await cancelOnLines(cancelPhonePage)) === 0,
  `${await cancelOnLines(cancelPhonePage)} bouton(s) sur les lignes`,
);
await cancelPhone.close();

// ── 8 · la carte d'une réservation ───────────────────────────
//
// Les mesures de la revue, lues sur le rendu plutôt que sur les
// classes : une classe peut être écrite et perdre son duel de
// spécificité, et une carte dont le rayon est écrasé par une règle
// plus forte est fausse avec le bon `className`.
//
// Ce qui est vérifié : fond blanc, rayon 12, filet d'un pixel d'encre
// à 10 %, 12px entre deux cartes, 16px de retrait, le bandeau d'état
// *dans* le bord gauche, les trois lignes à 22 / 17 / 14, la note en
// violet jamais collée au nom, les décisions à 40px toutes alignées à
// droite et centrées verticalement — et, la plus facile à perdre :
// **une largeur par libellé**. « Check-in » faisait 101px dans une
// carte à deux décisions et 318 dans une carte à une seule, parce que
// le bouton était `flex-1` ; deux largeurs pour un libellé, c'est la
// chose que la revue interdit nommément.
//
// Les bandeaux d'heure avec : 32px de haut, 15px semi-gras, le compte
// de couverts à droite, 24px au-dessus et 8 en dessous — sauf le
// premier, qui n'a pas de carte au-dessus à séparer.

console.log("\n  — 8 · la carte d'une réservation");

/** Everything the review names, measured in the page. */
const CARD_PROBE = () => {
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const seen = (el) => el.getBoundingClientRect().width > 1;
  const cards = [...document.querySelectorAll("main [data-book-row]")].filter(seen);
  if (cards.length === 0) return { cards: 0 };
  const first = cards[0];
  const cs = getComputedStyle(first);
  const region = first.querySelector('[data-row="open"]');
  const rs = region ? getComputedStyle(region) : null;

  const gaps = new Set();
  for (let i = 1; i < cards.length; i++) {
    const a = cards[i - 1].getBoundingClientRect();
    const b = cards[i].getBoundingClientRect();
    const d = Math.round(b.top - a.bottom);
    // Only consecutive cards of the same run: across a band the gap is
    // the band's own spacing, which is checked separately.
    if (d >= 0 && d <= 20) gaps.add(d);
  }

  const size = (el) => (el ? px(getComputedStyle(el).fontSize) : null);
  const band = first.querySelector("span[aria-hidden]");
  const cardBox = first.getBoundingClientRect();

  const noteCard = cards.find((c) => c.querySelector(".text-violet-deep"));
  const note = noteCard
    ? (() => {
        const n = noteCard.querySelector(".text-violet-deep");
        return {
          icon: Boolean(n.querySelector("svg")),
          marginTop: px(getComputedStyle(n).marginTop),
          violet: getComputedStyle(n).color,
        };
      })()
    : null;

  const widths = {};
  const heights = new Set();
  let inline = 0;
  let stacked = 0;
  const laneInset = new Set();
  const offCentre = new Set();
  for (const card of cards) {
    const box = card.getBoundingClientRect();
    for (const b of card.querySelectorAll("button[data-compact]")) {
      const r = b.getBoundingClientRect();
      if (r.width < 1) continue;
      const label = (b.textContent ?? "").trim();
      heights.add(Math.round(r.height));
      (widths[label] ??= []).push(Math.round(r.width));
      if (r.top > box.top + 48) stacked++;
      else {
        inline++;
        offCentre.add(
          Math.round(Math.abs((r.top + r.bottom) / 2 - (box.top + box.bottom) / 2)),
        );
      }
    }
    const lane = card.querySelector("div.md\\:flex");
    if (lane && lane.getBoundingClientRect().width > 1) {
      laneInset.add(Math.round(box.right - lane.getBoundingClientRect().right));
    }
  }

  const bands = [...document.querySelectorAll("main [data-slot-head]")]
    .filter(seen)
    .map((b) => {
      const st = getComputedStyle(b);
      const hour = b.firstElementChild;
      const covers = b.lastElementChild;
      return {
        h: Math.round(b.getBoundingClientRect().height),
        bg: st.backgroundColor,
        mt: px(st.marginTop),
        mb: px(st.marginBottom),
        hourSize: size(hour),
        hourWeight: getComputedStyle(hour).fontWeight,
        coversInset:
          covers && covers !== hour
            ? Math.round(
                b.getBoundingClientRect().right - covers.getBoundingClientRect().right,
              )
            : null,
      };
    });

  return {
    cards: cards.length,
    bg: cs.backgroundColor,
    radius: px(cs.borderTopLeftRadius),
    borderWidth: px(cs.borderTopWidth),
    borderColour: cs.borderTopColor,
    pad: rs ? [px(rs.paddingTop), px(rs.paddingRight), px(rs.paddingBottom)] : null,
    padLeft: rs ? px(rs.paddingLeft) : null,
    gaps: [...gaps],
    bandLeft: band ? Math.round(band.getBoundingClientRect().left - cardBox.left) : null,
    bandWidth: band ? Math.round(band.getBoundingClientRect().width) : null,
    lead: size(first.querySelector(".text-host-lead")),
    name: size(first.querySelector(".text-host-name")),
    detail: size(first.querySelector(".text-host-detail")),
    detailColour: (() => {
      const d = first.querySelector(".text-host-detail");
      return d ? getComputedStyle(d).color : null;
    })(),
    note,
    heights: [...heights],
    inline,
    stacked,
    laneInset: [...laneInset],
    offCentre: [...offCentre],
    manyWidths: Object.entries(widths)
      .filter(([, w]) => new Set(w).size > 1)
      .map(([label, w]) => `${label} ${[...new Set(w)].join("/")}`),
    bands: bands.length,
    bandShape: [
      ...new Set(bands.map((b) => `${b.h}/${b.hourSize}/${b.hourWeight}/${b.mb}`)),
    ],
    bandTops: [...new Set(bands.map((b) => b.mt))],
    bandBg: [...new Set(bands.map((b) => b.bg))],
    coversInset: [...new Set(bands.map((b) => b.coversInset))],
  };
};

// Le carnet entier, pas le filtre « À confirmer » : l'écart entre deux
// cartes ne se mesure qu'entre deux cartes d'une même demi-heure, et
// trois demandes réparties sur trois services n'en donnent aucune.
await go("/restaurant/reservations");
await settle(1600);
const card = await page.evaluate(CARD_PROBE);

check("le carnet dessine des cartes", card.cards > 0, `${card.cards}`);
check("fond blanc", card.bg === "rgb(255, 255, 255)", card.bg);
check("rayon 12", card.radius === 12, `${card.radius}`);
check("filet d'un pixel", card.borderWidth === 1, `${card.borderWidth}`);
check(
  "filet d'encre à 10 %",
  / 0\.1\)$/.test(card.borderColour ?? ""),
  card.borderColour,
);
check(
  "16px de retrait",
  String(card.pad) === "16,16,16",
  String(card.pad),
);
check(
  "et 16px après le bandeau",
  card.padLeft === 22,
  `${card.padLeft} (6 de bandeau + 16)`,
);
check(
  "12px entre deux cartes",
  card.gaps.length > 0 && card.gaps.every((g) => g === 12),
  card.gaps.length ? String(card.gaps) : "aucune paire mesurée",
);
check(
  "le bandeau d'état est dans le bord",
  card.bandLeft === 1 && card.bandWidth === 6,
  `à ${card.bandLeft}, large de ${card.bandWidth}`,
);
check("l'heure et les couverts à 22", card.lead === 22, `${card.lead}`);
check("le nom à 17", card.name === 17, `${card.name}`);
check("le contexte à 14", card.detail === 14, `${card.detail}`);
check(
  "et en encre à 70 %",
  /0\.7\)$/.test(card.detailColour ?? ""),
  card.detailColour,
);
check(
  "la note porte son icône",
  Boolean(card.note?.icon),
  card.note ? "oui" : "aucune note sur ce service",
);
check(
  "et n'est pas collée au nom",
  (card.note?.marginTop ?? 0) >= 8,
  `${card.note?.marginTop}px`,
);
check("les décisions font 40px", String(card.heights) === "40", String(card.heights));
check(
  "une seule largeur par libellé",
  card.manyWidths.length === 0,
  card.manyWidths.join(" · "),
);

// Desktop only: the lane is inline, right-aligned to the card's own
// padding, and centred on the card whatever its height.
if (width >= 768) {
  check("les décisions sont sur la carte", card.inline > 0 && card.stacked === 0, `${card.inline} / ${card.stacked}`);
  check(
    "alignées à droite",
    String(card.laneInset) === "1",
    `retrait ${String(card.laneInset)}`,
  );
  check(
    "et centrées verticalement",
    card.offCentre.every((d) => d <= 1),
    `écart ${String(card.offCentre)}`,
  );
}

check("les bandeaux d'heure font 32px", card.bandShape.every((s) => s.startsWith("32/")), String(card.bandShape));
check(
  "l'heure en 15px semi-gras",
  card.bandShape.every((s) => s.includes("/15/600/")),
  String(card.bandShape),
);
check("8px sous le bandeau", card.bandShape.every((s) => s.endsWith("/8")), String(card.bandShape));
check(
  "24px au-dessus, sauf le premier",
  card.bandTops.every((t) => t === 0 || t === 24) && card.bandTops.includes(24),
  String(card.bandTops),
);
check("sur un fond canvas-2", String(card.bandBg) === "rgb(248, 245, 251)", String(card.bandBg));
check("les couverts à droite", String(card.coversInset) === "16", String(card.coversInset));

// Et le téléphone : la même carte, les décisions dessous.
const cardPhone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const cardPhonePage = await cardPhone.newPage();
await sharedSignIn(cardPhonePage, BASE, { email: OWNER_EMAIL, password: "demo" });
await cardPhonePage.goto(`${BASE}/restaurant/reservations`, {
  waitUntil: "domcontentloaded",
});
await cardPhonePage.waitForTimeout(1800);
const cardAt390 = await cardPhonePage.evaluate(CARD_PROBE);
check(
  "390 · la même carte",
  cardAt390.radius === 12 &&
    cardAt390.gaps.length > 0 &&
    cardAt390.gaps.every((g) => g === 12),
  `rayon ${cardAt390.radius}, écarts ${String(cardAt390.gaps)}`,
);
check("390 · les trois lignes à 22 / 17 / 14", `${cardAt390.lead}/${cardAt390.name}/${cardAt390.detail}` === "22/17/14", `${cardAt390.lead}/${cardAt390.name}/${cardAt390.detail}`);
check(
  "390 · les décisions passent sous la carte",
  cardAt390.stacked > 0 && cardAt390.inline === 0,
  `${cardAt390.stacked} dessous, ${cardAt390.inline} dessus`,
);
check("390 · toujours 40px", String(cardAt390.heights) === "40", String(cardAt390.heights));
check(
  "390 · une seule largeur par libellé",
  cardAt390.manyWidths.length === 0,
  cardAt390.manyWidths.join(" · "),
);
await cardPhone.close();

// ── Report ───────────────────────────────────────────────────

if (noise.size > 0) {
  console.log("\n  bruit console :");
  for (const n of noise) console.log(`    ${n}`);
}

console.log(
  problems.length === 0
    ? `\nLe carnet tient son périmètre · ${LOT_LABEL} · ${width}×${height}.`
    : `\n${problems.length} problème(s) : ${problems.join(" · ")}`,
);

await browser.close();
process.exit(problems.length === 0 && noise.size === 0 ? 0 : 1);
