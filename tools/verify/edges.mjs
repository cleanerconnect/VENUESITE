// The ways a real session goes wrong.
//
//   node tools/verify/edges.mjs
//   W=390 H=844 node tools/verify/edges.mjs
//
// `journey.mjs` walks the path a partner is meant to take. This one
// walks the ones they take by accident: a mistyped password, a session
// that died while a form was open, a double tap on Continuer, a network
// that takes a second to answer, a photo straight off a camera that is
// four times the limit, an establishment with nothing in it yet.
//
// Every case here has the same pass condition: the portal says what
// happened, in French, and stays usable. A stack trace, a blank screen
// or a silent no-op is a failure.

import { chromiumOrExplain } from "./browser.mjs";
import { writeFileSync } from "node:fs";
import { LOT_LABEL, requireWrites, signIn as sharedSignIn } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// This tool writes. Against the static driver there is nothing to
// write to, so it says so and stops rather than failing.
await requireWrites(BASE, "Les cas limites d'une session");
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const EXTERNAL_MAP = /tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|\/api\/geocode/;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const phone = width <= 480;
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
});
const page = await context.newPage();

const problems = [];
const noise = new Set();
page.on("pageerror", (e) => noise.add(`pageerror @${page.url().replace(BASE, "")}: ${String(e).slice(0, 140)}`));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  const from = m.location()?.url ?? "";
  if (EXTERNAL_MAP.test(text) || EXTERNAL_MAP.test(from)) return;
  if (/favicon|preload|Download the React/i.test(text)) return;
  noise.add(`console @${page.url().replace(BASE, "")}: ${text.slice(0, 130)}`);
});

const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${String(detail).slice(0, 80)}` : ""}`);
  if (!ok) problems.push(label);
};
const text = async () => (await page.innerText("body").catch(() => "")) ?? "";
const settle = (ms = 900) => page.waitForTimeout(ms);
const go = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(1000);
};
const BROKEN = /Cette page n'a pas pu charger|Application error|Internal Server Error|Unhandled Runtime Error/i;
// The shared helper, because this account owns two venues and the
// login screen asks which one — and because a fixed sleep was long
// enough on SQLite and not on Postgres, which made « le bon mot de
// passe ouvre le portail » fail on one engine only. See `lot.mjs`.
const signIn = async (email = "yassine@darzellij.ma", password = "demo") =>
  sharedSignIn(page, BASE, { email, password, venue: "Dar Zellij" });

/** The pending request may be at dinner while the screen opens on
 *  lunch, so the « À confirmer » chip is how a decision is found at any
 *  hour of the day. */
const openPending = async () => {
  await go("/restaurant/reservations");
  const chip = page.locator('button:has-text("À confirmer"):visible').first();
  if (await chip.count()) {
    await chip.click();
    await settle(1200);
  }
};

console.log(`\nCas limites · ${LOT_LABEL} · ${width}×${height}\n`);

// ── 1. A mistyped password ──────────────────────────────────
await signIn("yassine@darzellij.ma", "pasledemo");
const refused = await text();
check("un mauvais mot de passe est refusé", page.url().includes("/login"), page.url());
check(
  "et le dit en français",
  /incorrect|ne correspond|refus|invalide|identifiants/i.test(refused),
  refused.split("\n").find((l) => /incorrect|correspond|refus|invalide/i.test(l)) ?? "",
);
check("sans page d'erreur", !BROKEN.test(refused));

// ── 2. An address with no account ───────────────────────────
await signIn("personne.inconnue@example.ma", "motdepasse1");
check("une adresse inconnue est refusée", page.url().includes("/login"));
check("sans révéler si le compte existe", !/mot de passe incorrect pour/i.test(await text()));

// ── 3. The right password still works ───────────────────────
await signIn();
check("le bon mot de passe ouvre le portail", !page.url().includes("/login"), page.url());

// ── 4. A session that died while a form was open ────────────
await go("/restaurant/ma-fiche");
const field = page.getByLabel("Nom du lieu");
const original = (await field.inputValue().catch(() => "")) ?? "";
if (original) {
  await field.fill(`${original} (session morte)`);
  await settle(400);
  // The cookies go while the form is still open — a partner who left the
  // stand for an hour, or a deploy that rotated the session.
  await context.clearCookies();
  const saveButton = page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();
  if (await saveButton.count()) {
    await saveButton.click();
    await settle(2600);
    const after = await text();
    check(
      "une session expirée est annoncée, pas plantée",
      /session|reconnect|expir/i.test(after) || page.url().includes("/login"),
      after.split("\n").find((l) => /session|expir|reconnect/i.test(l)) ?? page.url(),
    );
    check("et l'écran ne casse pas", !BROKEN.test(after));
    // And the typing survives. A message that costs the partner their
    // work is a message they read twice: once to understand it, once
    // to remember what they had written.
    const still = (await field.inputValue().catch(() => "")) ?? "";
    check(
      "et la saisie reste à l'écran",
      still.includes("(session morte)"),
      still,
    );
  } else {
    check("Ma fiche a un bouton Enregistrer", false);
  }
} else {
  check("Ma fiche a un champ Nom du lieu", false);
}

// A protected route with no session sends you to the door.
await context.clearCookies();
await go("/restaurant/reservations");
check("un écran protégé renvoie à la connexion", page.url().includes("/login"), page.url());

// ── 5. Two taps on one button ───────────────────────────────
await signIn();
await go("/restaurant/ma-fiche");
const twice = page.getByLabel("Nom du lieu");
if (await twice.count()) {
  const before = await twice.inputValue();
  await twice.fill(`${before} ·`);
  await settle(300);
  const button = page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();
  if (await button.count()) {
    // Both clicks land inside the same tick: a form that fires twice
    // writes twice, and the second write is the one that races.
    await Promise.all([button.click(), button.click().catch(() => {})]);
    await settle(3000);
    const after = await text();
    check("un double clic n'écrit pas deux fois", !BROKEN.test(after) && !/deux fois|doublon/i.test(after));
    await go("/restaurant/ma-fiche");
    const saved = await page.getByLabel("Nom du lieu").inputValue();
    check("le nom n'a pas reçu deux fois le suffixe", !saved.endsWith("· ·"), saved);
    // Put it back, so the next pass starts from the seeded name.
    await page.getByLabel("Nom du lieu").fill(before);
    await settle(300);
    const restore = page.locator('button:has-text("Enregistrer"):visible:not([disabled])').first();
    if (await restore.count()) {
      await restore.click();
      await settle(2000);
    }
  }
}

// Two taps on Accepter: the decision must be idempotent.
await openPending();
const accept = page.locator('button:has-text("Accepter"):visible').first();
if (await accept.count()) {
  await Promise.all([accept.click(), accept.click().catch(() => {})]);
  await settle(2600);
  const after = await text();
  check("un double clic sur Accepter reste propre", !BROKEN.test(after) && /Confirmée/.test(after));
} else {
  check("une demande attend une décision", false, "aucun bouton Accepter");
}

// ── 6. A network that takes its time ────────────────────────
await context.route("**/*", async (route) => {
  await new Promise((r) => setTimeout(r, 350));
  await route.continue();
});
await go("/restaurant");
check("l'Accueil s'affiche sur un réseau lent", !BROKEN.test(await text()), (await text()).slice(0, 40));
await openPending();
check("Réservations s'affiche sur un réseau lent", !BROKEN.test(await text()));
const slowAccept = page.locator('button:has-text("Accepter"):visible').first();
if (await slowAccept.count()) {
  await slowAccept.click();
  // The optimistic update is supposed to answer the finger immediately,
  // before the write comes back.
  await page.waitForTimeout(250);
  const instant = await text();
  check("la décision répond avant le réseau", /Confirmée/.test(instant));
  await settle(2500);
}
await context.unroute("**/*");

// ── 7. A photo four times the limit ─────────────────────────
// The limit is 8 MB; a phone camera makes 12 MB without trying.
const huge = `/tmp/trop-grosse-${Date.now()}.png`;
writeFileSync(huge, Buffer.alloc(12 * 1024 * 1024, 7));
await go("/restaurant/ma-fiche");
const photosTab = page
  .locator('button:has-text("Photos"):visible, [role="tab"]:has-text("Photos"):visible')
  .first();
if (await photosTab.count()) {
  await photosTab.click();
  await settle(1200);
  const input = page.locator('input[type="file"]').first();
  if (await input.count()) {
    await input.setInputFiles(huge);
    await settle(3200);
    const after = await text();
    check(
      "une photo trop lourde est refusée, et le dit",
      /trop (lourde|volumineuse|grande)|dépasse|maximum|refus/i.test(after),
      after.split("\n").find((l) => /lourde|dépasse|maximum|refus/i.test(l)) ?? "aucun message",
    );
    check("et l'écran reste utilisable", !BROKEN.test(after));
  } else {
    check("l'onglet Photos a un sélecteur de fichier", false);
  }
} else {
  check("Ma fiche a un onglet Photos", false);
}

// ── 8. The bar vocabulary ───────────────────────────────────
// Nomad Casa is a lounge in the seed: the same screens have to speak
// « personnes » where the restaurant says « couverts ».
// The switcher is a dropdown in the sidebar; setting the cookie it
// writes is the same thing without six clicks, and the assertion is
// about the vocabulary, not about the menu.
// The venue cookie is signed since the audit — an unsigned value is
// ignored, which is the whole point of signing it. So the switch goes
// through the route the switcher itself calls; `context.request` shares
// this context's cookie jar, so the signed cookie lands where the page
// will read it.
await context.request.post(`${BASE}/api/session/venue`, {
  data: { venueId: "bar_nomad_casa" },
});
await go("/restaurant");
const bar = await text();
// The establishment card lives in the sidebar, which a phone does not
// draw — the name is behind the Plus tab there. The vocabulary is what
// this case is about, so the name is only asserted where it shows.
if (!phone) {
  check("le portail ouvre le bar", /Nomad/.test(bar), bar.split("\n").find((l) => /Nomad/.test(l)) ?? "");
}
{
  check(
    "un bar parle de personnes, pas de couverts",
    /personnes/i.test(bar) && !/couverts/i.test(bar),
    bar.split("\n").find((l) => /personnes|couverts/i.test(l)) ?? "",
  );
}
await go("/restaurant/reservations");
const barBook = await text();
check("et son carnet aussi", !/couverts/i.test(barBook), barBook.split("\n").find((l) => /couverts/i.test(l)) ?? "aucun « couverts »");

await browser.close();

if (noise.size) {
  console.log(`\n${noise.size} message(s) de console :`);
  for (const line of [...noise].slice(0, 6)) console.log(`  ${line}`);
  problems.push(...[...noise].map((n) => `console: ${n.slice(0, 60)}`));
}

console.log(
  problems.length === 0
    ? `\nLes cas limites tiennent · ${LOT_LABEL} · ${width}×${height}`
    : `\n${problems.length} problème(s) · ${width}×${height}`,
);
process.exit(problems.length === 0 ? 0 : 1);
