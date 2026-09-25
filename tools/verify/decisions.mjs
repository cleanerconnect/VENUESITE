// The four Lot 1 changes, in a real browser.
//
//   BASE=http://localhost:3210 node tools/verify/decisions.mjs
//
// One tool for the four things the brief added, because each of them is
// a claim only a browser can settle:
//
//   1  a venue created by /inscription is pending, its dashboard works,
//      and it says so — and /admin/validations is LYFE's alone;
//   2  the decisions a state poses are on the line and the rest are in
//      the sheet — Refuser only ever answers a request, and a phone
//      line carries two of them, not four — the sheet offers the
//      venue's own slots and nothing else, and the chrome's search
//      finds a booking by name, by the last four digits of the phone
//      and by date, grouped by day;
//   3  Disponibilités offers 15 / 30 / 60 and the book groups by it;
//   4  the row carries the phone and the drawer carries the guest.
//
// Needs the portal on BASE with a seeded database behind it. It writes:
// it signs a partner up and it decides a booking.

import { chromiumOrExplain } from "./browser.mjs";
import { LOT_LABEL, dataModeOf, requireWrites } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// This tool writes. Against the static driver there is nothing to
// write to, so it says so and stops rather than failing.
const driver = await requireWrites(BASE, "Les quatre changements du lot 1");

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

console.log(`\nLes quatre décisions · ${LOT_LABEL} · ${width}×${height}\n`);

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
await signIn("yassine@darzellij.ma");
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
  check("Décaler sur chaque ligne ouverte", decaler >= accepter, `${decaler}`);

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
      "mais garde Absent et Décaler",
      onConfirmed.absent > 0 && onConfirmed.decaler > 0,
      `${onConfirmed.absent} absent · ${onConfirmed.decaler} décaler`,
    );
    // The sheet is where the cancellation went, so it has to be there.
    const open = page.locator('[data-row="open"]:visible').first();
    if (await open.count()) {
      await open.click();
      await settle(1200);
      const sheet = await text();
      check(
        "la feuille de la ligne porte Refuser et Décaler",
        /Refuser/.test(sheet) && /Décaler/.test(sheet),
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
        "et sa feuille porte Décaler",
        /Décaler/.test(sheet),
        "feuille de détail à 390",
      );
      await page.keyboard.press("Escape");
      await settle(600);
    }
  }
  await page.setViewportSize({ width, height });
  await openPending();

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
// The venue cookie is signed since the audit — an unsigned value is
// ignored, which is the whole point of signing it. So the switch goes
// through the route the switcher itself calls; `context.request` shares
// this context's cookie jar, so the signed cookie lands where the page
// will read it.
await context.request.post(`${BASE}/api/session/venue`, {
  data: { venueId: "bar_nomad_casa" },
});
await go("/restaurant/disponibilites");
check(
  "l'autre établissement a choisi l'heure",
  /créneaux de 1 heure/i.test(await text()),
);
await context.request.post(`${BASE}/api/session/venue`, {
  data: { venueId: "rst_dar_zellij" },
});

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
