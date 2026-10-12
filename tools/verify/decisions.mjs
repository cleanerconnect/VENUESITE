// What a Lot 1 booking screen does, and what it no longer does.
//
//   BASE=http://localhost:3210 node tools/verify/decisions.mjs
//
// One tool for five claims only a browser can settle:
//
//   1  a venue created by /inscription is pending, its dashboard works,
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
//      screen holding them.
//
// Three, five and most of two used to assert the opposite: they are the
// regression test for a scope that shrank, which is the kind that goes
// quietly missing otherwise.
//
// Needs the portal on BASE with a seeded database behind it. It writes:
// it signs a partner up and it decides a booking.

import { chromiumOrExplain } from "./browser.mjs";
import {
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

// Step 6 · the weekly grid, copied across.
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
  // apart. Cancelling an accepted booking is in the sheet now.
  check(
    "Refuser exactement autant de fois qu'Accepter",
    refuser === accepter,
    `${refuser} refuser · ${accepter} accepter`,
  );
  check(
    "Absent sur chaque ligne ouverte, sans attendre l'heure",
    absent >= accepter,
    `${absent}`,
  );
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
    check(
      "mais garde Absent",
      onConfirmed.absent > 0,
      `${onConfirmed.absent} absent`,
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
      check(
        "la feuille de la ligne porte Refuser, et pas Décaler",
        /Refuser/.test(sheet) && !/Décaler/.test(sheet),
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
      "à 390 une ligne confirmée propose Check-in et Absent",
      p2.checkin > 0 && p2.absent > 0,
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
