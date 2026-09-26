// One reservation, through both products.
//
//   API=http://localhost:8099 node tools/verify/handshake.mjs
//
// The dashboard and the consumer app are two codebases, two languages
// and two deployments, and the only thing that makes them one product is
// that they read and write the same Postgres. This script is the proof,
// and it is deliberately end to end rather than a pair of unit tests:
//
//   1. a partner signs up on the dashboard and creates their venue —
//      six steps, a real browser, no fixtures;
//   2. the app's API lists that venue, with the hours the partner set;
//   3. a guest books it through `POST /api/bookings/enhanced`;
//   4. the dashboard shows the request on Réservations and counts it on
//      Accueil, and the partner accepts it;
//   5. the app reads the booking back as « confirmed », and the
//      dashboard's own book says « Confirmée ».
//
// Needs: the portal on BASE with DATABASE_URL set, and the FastAPI
// backend on API with the same DATABASE_URL.

import { chromiumOrExplain } from "./browser.mjs";
import { LOT, LOT_LABEL, clockLine, requireSharedDatabase } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// Lot 1 only, and said the way `audience.mjs` says Lot 2 only.
//
// Every sentence this tool reads off the dashboard is a Lot 1 sentence:
// Accueil's « une en attente de réponse », the row's Accepter, the
// guest's phone on the line. Lot 2 draws a waiting list there instead,
// so in Lot 2 this tool reported five defects that were five pieces of
// another screen.
if (LOT !== 1) {
  console.log(
    "La poignée de main éprouve la surface du lot 1 : l'Accueil qui compte " +
      "la demande, la décision sur la ligne, le téléphone du client.",
  );
  console.log("Relancer avec LYFE_LOT=1, serveur compris.");
  process.exit(0);
}

// This tool needs both products on one database: it creates a venue in
// the portal and asks the app's API for it.
await requireSharedDatabase(
  BASE,
  "La poignée de main entre le portail et l'application",
);
const API = process.env.API ?? "http://localhost:8099";
const EXTERNAL_MAP = /tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|\/api\/geocode/;

const problems = [];

// The app's list endpoint caps `limit` at 100 — asking for 200 gets a
// 422 whose body is `{detail: [...]}`, and `.some` on that throws a
// TypeError that reads like the handshake failed. So the cap is
// respected and the shape is checked.
const restaurants = async () => {
  const response = await fetch(`${API}/api/restaurants?limit=100`);
  const body = await response.json().catch(() => null);
  if (Array.isArray(body)) return body;
  throw new Error(
    `GET /api/restaurants a répondu ${response.status} avec ` +
      `${JSON.stringify(body).slice(0, 160)} — l'application est-elle sur la même base ?`,
  );
};
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${String(detail).slice(0, 88)}` : ""}`);
  if (!ok) problems.push(label);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const from = m.location()?.url ?? "";
  if (EXTERNAL_MAP.test(m.text()) || EXTERNAL_MAP.test(from)) return;
  if (/favicon|preload/i.test(m.text())) return;
  problems.push(`console: ${m.text().slice(0, 90)}`);
});

const settle = (ms = 900) => page.waitForTimeout(ms);
const heading = async () => ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();
const bodyText = async () => (await page.innerText("body").catch(() => "")) ?? "";

console.log(
  `\nPoignée de main · tableau de bord ↔ application · ${LOT_LABEL} · ${clockLine()}\n`,
);

// ── 1. A venue, created by a partner who had no account ─────
const stamp = Date.now().toString(36);
const email = `poignee.${stamp}@lyfe-verify.ma`;
const venueName = `Riad Poignée ${stamp.slice(-4)}`;

await page.goto(`${BASE}/inscription`, { waitUntil: "domcontentloaded" });
await settle(1200);
await page.getByLabel("Votre nom").fill("Salima Benali");
await page.getByLabel("Adresse e-mail").fill(email);
await page.getByLabel("Téléphone", { exact: true }).fill("+212 6 12 34 56 78");
await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
await page.getByLabel("Confirmation du mot de passe").fill("motdepasse1");
await page.locator('button:has-text("Continuer")').first().click();
await settle(2200);
await page.getByLabel("Nom de l'établissement").fill(venueName);
await page.locator('button:has-text("Un restaurant")').click();
await page.getByLabel("Ville").selectOption("Casablanca");
await settle(400);
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
await page.getByLabel("Quartier").fill("Gauthier");
await page.getByLabel("Adresse", { exact: true }).fill("41 rue Tahar Sebti, Casablanca");
const carte = page.locator(".leaflet-container");
if (await carte.count()) {
  await carte.click({ position: { x: 150, y: 110 } });
  await settle(500);
}
await page.locator('button:has-text("Continuer")').first().click();
await settle(1600);
// Photos, then ambience and equipment: both steps say they can be
// passed, and this tool is about the booking, not the listing.
await page.locator('button:has-text("Passer cette étape")').click();
await settle(1600);
await page.locator('button:has-text("Passer cette étape")').click();
await settle(1600);
// Hours: the week the seed's default proposes, all seven days open, so
// the booking below lands inside them.
await page.locator('button:has-text("Appliquer lundi à tous les jours")').click();
await settle(500);
await page.locator('button:has-text("Continuer")').first().click();
await settle(1800);
check("l'inscription atteint le récapitulatif", (await heading()) === "C'est prêt");
await page.locator('button:has-text("Ouvrir mon tableau de bord")').click();
await page.waitForTimeout(3600);
check("le partenaire arrive sur son tableau de bord", page.url().endsWith("/restaurant"), page.url());

// ── 2. LYFE has not looked at it yet, so the app does not offer it ──
//
// A venue created by /inscription is `pending_review`. This tool used
// to jump straight to « the app lists it », which stopped being true the
// day the review landed — and nothing noticed, because the tool was not
// in the matrix. The pending state is now asserted first, then the
// review, then the listing.
const beforeReview = await restaurants();
check(
  "l'application ne liste pas un établissement que LYFE n'a pas vu",
  !beforeReview.some((v) => v.name === venueName),
  beforeReview.some((v) => v.name === venueName) ? "il est listé" : "absent, comme attendu",
);

// ── 3. LYFE validates it ────────────────────────────────────
const reviewer = await browser.newContext({ locale: "fr-FR" });
const reviewPage = await reviewer.newPage();
await reviewPage.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await reviewPage.fill('input[type="email"]', "validation@lyfe.ma");
await reviewPage.fill('input[type="password"]', "demo");
await reviewPage.click('button[type="submit"]');
await reviewPage.waitForTimeout(2600);
await reviewPage.goto(`${BASE}/admin/validations`, { waitUntil: "domcontentloaded" });
await reviewPage.waitForTimeout(1200);
const entry = reviewPage.locator("li").filter({ hasText: venueName });
check("la file de validation montre l'inscription", (await entry.count()) > 0, venueName);
if (await entry.count()) {
  await entry.first().locator('button:has-text("Valider")').click();
  await reviewPage.waitForTimeout(2200);
}
await reviewer.close();

// ── 4. The app's API sees it ────────────────────────────────
const listed = await restaurants();
const mine = listed.find((v) => v.name === venueName);
check("l'application liste l'établissement une fois validé", Boolean(mine), mine ? mine.id : "absent");
if (!mine) {
  console.log("\nInterrompu : sans l'établissement, il n'y a rien à réserver.");
  await browser.close();
  process.exit(1);
}
check("avec son adresse", String(mine.address).includes("Tahar Sebti"), mine.address);
check(
  "et les horaires posés à l'étape 5",
  Boolean(mine.opening_hours && Object.keys(mine.opening_hours).length >= 7),
  JSON.stringify(mine.opening_hours ?? {}).slice(0, 60),
);
check("le point de la carte est transmis", mine.latitude !== null, `${mine.latitude}, ${mine.longitude}`);
check(
  "la grille de créneaux du lieu arrive dans l'application",
  Array.isArray(mine.bookable_times) && mine.bookable_times.length > 0,
  `slot_minutes ${mine.slot_minutes ?? "absent"} · ${(mine.bookable_times ?? []).slice(0, 4).join(", ")}`,
);

// The venue changes its grid, and the app has to follow: « et
// l'application doit proposer ses créneaux dessus » — contrat §3.1.
await page.goto(`${BASE}/restaurant/disponibilites`, { waitUntil: "domcontentloaded" });
await settle(1500);
const grid = page.locator('select').filter({ hasText: /minutes|heure/ }).first();
if (await grid.count()) {
  await grid.selectOption("60");
  await settle(1800);
  const save = page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();
  if (await save.count()) { await save.click(); await settle(2400); }
  const afterGrid = await fetch(`${API}/api/restaurants/${mine.id}`).then((r) => r.json());
  check(
    "changer la grille à 60 minutes change ce que l'application propose",
    afterGrid.slot_minutes === 60,
    `slot_minutes ${afterGrid.slot_minutes} · ${(afterGrid.bookable_times ?? []).slice(0, 4).join(", ")}`,
  );
} else {
  check("Disponibilités propose une grille de créneaux", false);
}

// And a Ma fiche edit, which is the other direction of the same seam.
await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
await settle(1500);
const description = page.getByLabel("Description");
if (await description.count()) {
  const written = `Vérifié par la poignée de main · ${stamp}`;
  await description.fill(written);
  await settle(400);
  const save = page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();
  if (await save.count()) { await save.click(); await settle(2600); }
  const afterEdit = await fetch(`${API}/api/restaurants/${mine.id}`).then((r) => r.json());
  check(
    "une correction de Ma fiche arrive dans l'application",
    String(afterEdit.description ?? "").includes(stamp),
    String(afterEdit.description ?? "").slice(0, 70),
  );
} else {
  check("Ma fiche a un champ Description", false);
}

// ── 5. A guest books it, from the app ───────────────────────
const guest = await fetch(`${API}/api/auth/guest`, { method: "POST" }).then((r) => r.json());
check("l'application ouvre une session invité", Boolean(guest.session_token), guest.name);
const day = new Date().toISOString().slice(0, 10);
const booking = await fetch(`${API}/api/bookings/enhanced`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${guest.session_token}`,
  },
  body: JSON.stringify({
    venue_id: mine.id,
    venue_type: "restaurant",
    venue_name: venueName,
    date: day,
    time: "20:30",
    party_size: 4,
    special_requests: "Une table à l'écart, s'il vous plaît.",
    // The number the venue rings. The app used to send none, and the
    // endpoint wrote '' — so every LYFE booking reached the host with
    // nobody to call. Sent here so the regression is caught.
    guest_phone: "+212 6 77 88 99 00",
  }),
}).then((r) => r.json());
check("la réservation est créée côté application", booking.status === "pending", JSON.stringify(booking).slice(0, 90));
check("avec une référence", Boolean(booking.booking_reference), booking.booking_reference);

// ── 6. The dashboard has it, and the partner accepts ────────
await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
await settle(1600);
const home = await bodyText();
check(
  "l'Accueil compte la demande",
  /1 (réservation|demande)|en attente de réponse/i.test(home),
  home.split("\n").find((l) => /attente|demande/i.test(l)) ?? "",
);

await page.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded" });
await settle(1700);
const pendingChip = page.locator('button:has-text("À confirmer"):visible').first();
if (await pendingChip.count()) {
  await pendingChip.click();
  await settle(1300);
}
const book = await bodyText();
check("Réservations montre la demande de l'application", book.includes(guest.name), guest.name);
check("avec le nombre de couverts", /4 couverts/.test(book));
check("et la demande particulière", /à l'écart/i.test(book));

// Row 39 puts the guest's phone on the row: « le numéro de téléphone du
// client ». It arrives from the app or it arrives from nowhere.
check(
  "le téléphone du client saisi dans l'application arrive sur la ligne",
  /77\s?88\s?99\s?00/.test(book),
  book.split("\n").find((l) => /77/.test(l)) ?? "aucun numéro sur la ligne",
);
// And the source line names LYFE rather than printing a raw enum value
// the dashboard has never heard of.
check(
  "la ligne nomme LYFE comme source",
  /LYFE/.test(book),
  book.split("\n").find((l) => /LYFE/.test(l)) ?? "aucune source",
);
const accept = page.locator('button:has-text("Accepter"):visible').first();
check("la ligne propose Accepter", (await accept.count()) > 0);
if (await accept.count()) {
  await accept.click();
  await settle(2600);
  check("le tableau de bord confirme", /Confirmée/.test(await bodyText()));
}

// ── 5. Both sides agree, after a reload on each ─────────────
await page.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded" });
await settle(1700);
const reloaded = await bodyText();
check(
  "le tableau de bord tient après rechargement",
  reloaded.includes(guest.name) && /Confirmée/.test(reloaded),
);

const after = await fetch(`${API}/api/bookings/enhanced`, {
  headers: { Authorization: `Bearer ${guest.session_token}` },
}).then((r) => r.json());
const same = after.find((b) => b.id === booking.id);
check("l'application relit la même réservation", Boolean(same), same ? same.id : "absente");
check("et la lit comme confirmée", same?.status === "confirmed", same?.status);
check("avec l'horodatage de confirmation", Boolean(same?.confirmation_timestamp), same?.confirmation_timestamp ?? "");

// The app cancels it; the dashboard must see that too.
await fetch(`${API}/api/bookings/enhanced/${booking.id}/status?status=cancelled`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${guest.session_token}` },
});
await page.goto(`${BASE}/restaurant/reservations`, { waitUntil: "domcontentloaded" });
await settle(1800);
const cancelled = await bodyText();
check(
  "une annulation faite dans l'application se voit sur le tableau de bord",
  !/Confirmée[\s\S]{0,200}/.test(cancelled.split(guest.name)[1] ?? "") ||
    /Annulée|annulé/i.test(cancelled),
  cancelled.split("\n").find((l) => /Annul/i.test(l)) ?? "",
);

await browser.close();

console.log(
  problems.length === 0
    ? `\nLes deux produits partagent une réservation · ${LOT_LABEL}`
    : `\n${problems.length} problème(s)`,
);
process.exit(problems.length === 0 ? 0 : 1);
