// Walks the three password screens and reports what broke.
//
//   node tools/verify/password.mjs
//   W=390 H=844 node tools/verify/password.mjs
//   SHOTS=docs/lot2-reference node tools/verify/password.mjs
//
// `Détail Sprint ` ligne 53 — « En tant qu'organisateur, je dois
// pouvoir récupérer mon mot de passe ou le changer en cas d'oubli pour
// organisateur ». Two verbs, three screens: the link under Connexion
// opens `/mot-de-passe-oublie`, the mail lands on `/reinitialiser`, and
// Réglages carries « Changer mon mot de passe » for someone who still
// knows theirs.
//
// What this tool is actually for. Three of these assertions are about
// what the screens must *not* say, and they are the reason it exists:
//
//   1  the confirmation never reveals whether the address is on file —
//      one sentence for a known address and an unknown one, or the form
//      is an annuaire of LYFE's partners
//   2  the portal never claims a mail was sent by a driver that has no
//      mail service; on `db` and `static` it says so and offers « Nous
//      contacter »
//   3  « Changer mon mot de passe » never reports a change a driver did
//      not make
//
// The first two were the defect this screen was built out of: the old
// link answered « un lien de réinitialisation vient d'être envoyé » on
// every instance, including the ones with nothing to send it with.
//
// Against the mock Business Service (`LYFE_DATA=http`) the round trip
// is real and the tool checks it end to end: it changes a password and
// signs in with the new one, which is the only way to tell a change
// that was applied from one that was reported.
//
// On `db` that last assertion is behind `APPLY=1`, and the reason is in
// the seed rather than in the driver — see « The applied change » below.
// Nothing else in this tool writes.

import { chromiumOrExplain } from "./browser.mjs";
import { mkdirSync } from "node:fs";
import { LOT_LABEL, clockLine, dataModeOf, signIn } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const shots = process.env.SHOTS;
const tag = width <= 480 ? "390" : "1440";
if (shots) mkdirSync(shots, { recursive: true });

// Three drivers, two different answers, and the tool asserts the one
// the driver in hand owes.
//
//   · a mail service exists only on `http` — `db` and `static` have
//     nothing to send a link with, and say so
//   · a reset *token* likewise: a driver that minted no link must not
//     accept a token, or it would be accepting one it invented
//   · changing a password one already knows is real on `db` too —
//     `db/seed.mjs` writes the demonstration partners into
//     `partner_accounts` with a salted hash, so there is something to
//     replace. Only `static` has nothing: the snapshot is a capture.
const mode = await dataModeOf(BASE);
const hasMail = mode === "http";
const canChange = mode !== "static";

// Whose account the walk uses.
//
// The organiser, because ligne 53 is their user story — except on the
// mock Business Service, which answers the *Lot 1* contract and whose
// snapshot therefore holds venue partners and no organiser at all. The
// three screens are shared by both sides, so the walk signs in with
// whichever account the driver in hand actually knows; asking the mock
// for `mido@jazzablanca.com` would have been testing the snapshot's
// contents rather than the screens.
const ACCOUNT =
  process.env.ACCOUNT ?? (mode === "http" ? "rachid@darzellij.ma" : "mido@jazzablanca.com");

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width, height } });

const problems = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  if (/favicon|preload|Download the React/i.test(text)) return;
  problems.push(`console: ${text.slice(0, 140)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

// Typing before React has hydrated fills the DOM without telling
// React, so the submit stays disabled and the click lands on nothing —
// the fault `lot.mjs`'s own sign-in documents. Both forms here disable
// their button until every field is filled, so the button enabling *is*
// the signal: re-type until it answers, then click.
const press = async (scope, values) => {
  const fields = page.locator(`${scope} input:visible`);
  const submit = page.locator(`${scope} button[type="submit"]`).first();
  for (let tries = 0; tries < 30; tries++) {
    for (const [i, value] of values.entries()) {
      await fields.nth(i).fill("");
      await fields.nth(i).fill(value);
    }
    await page.waitForTimeout(250);
    if (!(await submit.isDisabled())) break;
  }
  await submit.click();
  await page.waitForTimeout(2000);
};

const oneLine = (text) => text.replace(/\s+/g, " ").trim().slice(0, 120);

const shot = async (name) => {
  if (!shots) return;
  await page.screenshot({
    path: `${shots}/password-${name}@${tag}.png`,
    fullPage: true,
  });
};

const body = () => page.innerText("body");

console.log(
  `\nMot de passe · ${LOT_LABEL} · pilote ${mode} · ${width}×${height} · ${clockLine()}\n`,
);

// ── 1. The link under Connexion opens the screen ──
//
// It used to answer in place. A button that calls the seam and prints a
// sentence over the form is not the screen ligne 53 buys, and the
// difference is visible from here: the link has an `href`.
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
const typed = "deja.tape@lyfe-verify.ma";
await page.locator('input[type="email"]').first().fill(typed);
await page.waitForTimeout(300);
const link = page.locator('a[href^="/mot-de-passe-oublie"]');
check("Connexion ouvre l'écran plutôt que de répondre sur place", (await link.count()) > 0);
if (await link.count()) {
  // The address already typed travels, so it is not retyped on the
  // screen whose only field it is.
  const href = (await link.first().getAttribute("href")) ?? "";
  check("l'adresse déjà saisie voyage dans le lien", href.includes(encodeURIComponent(typed)), href);
  await link.first().click();
  await page.waitForTimeout(1200);
}
check("l'écran est /mot-de-passe-oublie", page.url().includes("/mot-de-passe-oublie"), page.url());
const prefilled = await page.locator('input[type="email"]').first().inputValue();
check("le champ est prérempli", prefilled === typed, prefilled);
await shot("1-oublie");

// ── 2. The confirmation says nothing about the account ──
const ask = async (address) => {
  await page.locator('input[type="email"]').first().fill(address);
  await page.waitForTimeout(200);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1800);
  return (await page.locator('[role="status"]').first().textContent()) ?? "";
};

const known = (await ask(ACCOUNT)).trim();
check("une adresse connue reçoit une réponse", known.length > 20, known.slice(0, 60));
const unknown = (await ask(`inconnu.${Date.now().toString(36)}@lyfe-verify.ma`)).trim();
check(
  "la même phrase pour une adresse connue et une inconnue",
  known === unknown,
  known === unknown ? "" : `« ${known.slice(0, 40)} » ≠ « ${unknown.slice(0, 40)} »`,
);
check(
  "la réponse ne nomme ni le compte ni l'adresse",
  !known.includes(ACCOUNT) && !/inconnu|introuvable|aucun compte/i.test(known),
  known.slice(0, 80),
);
// The sentence depends on the driver, and that is the whole point: no
// instance claims to have sent a mail it had no way of sending.
check(
  hasMail
    ? "avec un service, la réponse annonce le lien"
    : "sans service, la réponse le dit et renvoie vers « Nous contacter »",
  hasMail
    ? /lien de réinitialisation/i.test(known)
    : /n'est pas reliée au service/i.test(known) &&
        (await page.locator('a[href="/contact"]').count()) > 0,
  known.slice(0, 80),
);
await shot("2-confirmation");

// ── 3. `/reinitialiser` — two fields, and the token it does not read ──
await page.goto(`${BASE}/reinitialiser`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const boxes = page.locator('input[type="password"]:visible');
check("deux champs : le nouveau et sa confirmation", (await boxes.count()) === 2, String(await boxes.count()));
check(
  "un lien sans jeton le dit avant de faire remplir",
  /lien est incomplet/i.test(await body()),
);
await shot("3-reinitialiser-sans-jeton");

// The two rules the screen owns, checked with a token present so the
// refusal is the form's and not the link's.
await page.goto(`${BASE}/reinitialiser?jeton=${process.env.MOCK_RESET_TOKEN ?? "jeton-demo"}`, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(1200);
// The refusal is read from the notice the panel draws, not from the
// page's text: « Huit caractères au minimum » is also the hint printed
// under the field at rest, so the whole-page test would pass before
// anything had been submitted.
const resetNotice = async () =>
  ((await page.locator('[role="status"]').last().innerText().catch(() => "")) ?? "").trim();
const fillReset = async (a, b) => {
  await press("form", [a, b]);
  return await resetNotice();
};
check(
  "huit caractères au minimum",
  /Huit caractères au minimum/.test(await fillReset("court", "court")),
);
check(
  "les deux saisies doivent être identiques",
  /ne sont pas identiques/.test(await fillReset("motdepasse1", "motdepasse2")),
);

const NEW_PASSWORD = "verification-2026";
const after = await fillReset(NEW_PASSWORD, NEW_PASSWORD);
if (hasMail) {
  check(
    "le mot de passe est enregistré",
    (await page.locator("[data-reset-done]").count()) === 1 &&
      /Mot de passe enregistré/.test(after),
    oneLine(after),
  );
  check(
    "l'écran ne connecte pas de lui-même",
    page.url().includes("/reinitialiser"),
    page.url(),
  );
} else {
  check(
    "sans service, l'écran refuse plutôt que de prétendre",
    /n'est pas reliée au service/.test(after),
    oneLine(after),
  );
}
await shot("4-reinitialiser");

// ── 4. Réglages → « Changer mon mot de passe » ──
//
// Signed in with whichever password is current: the reset above moved
// it on the `http` driver and could not on the others.
//
// The card is on the organiser's Réglages and does not read the
// organiser's profile — it reads the session — so a venue partner on
// the `http` driver reaches the same three fields.
const current = hasMail ? NEW_PASSWORD : "demo";
const session = await signIn(page, BASE, { email: ACCOUNT, password: current });
// Said plainly, because the one thing that leaves this account on
// another password is an earlier `APPLY=1` run of this very tool, and
// « la carte est absente » would be a misleading way to report it.
check(
  "la session s'ouvre",
  typeof session === "string" && !session.includes("/login"),
  JSON.stringify(session),
);
await page.waitForTimeout(1500);
await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
const card = page.locator("[data-change-password]");
check("Réglages porte la carte", (await card.count()) > 0);
if ((await card.count()) === 0) {
  console.log("\n  la carte est absente : le reste de la section ne peut pas être vérifié\n");
} else {
  await card.first().scrollIntoViewIfNeeded();
  const three = card.locator('input[type="password"]:visible');
  check("trois champs : l'actuel, le nouveau, sa confirmation", (await three.count()) === 3, String(await three.count()));
  await shot("5-reglages");

  // Returns both: a refusal is drawn inside the card, a confirmation
  // is a toast outside it.
  const change = async (a, b, c) => {
    await press("[data-change-password]", [a, b, c]);
    return {
      card: await page.locator("[data-change-password]").innerText(),
      page: await body(),
    };
  };

  // The hint under « Nouveau mot de passe » carries the same sentence,
  // so the refusal is read from the notice the card draws rather than
  // from the card's text as a whole.
  const notice = () => page.locator('[data-change-password] [role="status"]');
  await press("[data-change-password]", [current, "court", "court"]);
  check(
    "huit caractères au minimum",
    /Huit caractères au minimum/.test((await notice().innerText().catch(() => "")) ?? ""),
  );
  await press("[data-change-password]", [current, "motdepasse1", "motdepasse2"]);
  check(
    "les deux nouvelles saisies doivent être identiques",
    /ne sont pas identiques/.test((await notice().innerText().catch(() => "")) ?? ""),
  );

  // A wrong current password is refused, and it is the field the
  // screen points at — not the two new ones, which are fine.
  const wrong = await change("ce-nest-pas-le-bon", "motdepasse-neuf", "motdepasse-neuf");
  if (canChange) {
    check(
      "un mot de passe actuel faux est refusé",
      /actuel est incorrect/.test(wrong.card),
      oneLine(wrong.card),
    );
  }

  // ── The applied change, and why it is opt-in on a database ──
  //
  // `APPLY=1` changes the password for real and proves it by signing in
  // with the new one, which is the only assertion that tells a change
  // apart from a claim. It is not the default on `db`, and the reason is
  // the seed: the demonstration partners' password is « demo », four
  // characters, under the eight-character floor these screens enforce —
  // so the tool can change it and cannot change it back. Every later
  // tool in the walk signs in with it, and a suite whose second tool
  // reports « E-mail ou mot de passe incorrect » on every screen, with
  // nothing saying why, is worse than one assertion deferred.
  //
  // On the mock Business Service it runs by default: that double's
  // passwords live in its process and die with it, so there is nothing
  // to put back.
  //
  //   APPLY=1 node tools/verify/password.mjs   # then npm run db:reset
  const apply = process.env.APPLY === "1" || mode === "http";
  if (!canChange) {
    const changed = await change(current, "verification-retour-2026", "verification-retour-2026");
    check(
      "sans service, la carte refuse plutôt que de prétendre",
      /n'est pas reliée au service/.test(changed.card),
      oneLine(changed.card),
    );
  } else if (!apply) {
    console.log(
      "  —    le changement appliqué n'est pas tenté : il laisserait le compte sur un" +
        " mot de passe que « demo » ne peut pas reprendre (APPLY=1, puis npm run db:reset)",
    );
  } else {
    const CHANGED = "verification-retour-2026";
    const changed = await change(current, CHANGED, CHANGED);
    check("le changement est confirmé", /Mot de passe changé/.test(changed.page), oneLine(changed.card));

    await page.context().clearCookies();
    const landed = await signIn(page, BASE, { email: ACCOUNT, password: CHANGED });
    check(
      "le nouveau mot de passe ouvre la session",
      typeof landed === "string" && !landed.includes("/login"),
      JSON.stringify(landed),
    );
    await page.context().clearCookies();
    const refused = await signIn(page, BASE, { email: ACCOUNT, password: current });
    check(
      "l'ancien ne l'ouvre plus",
      typeof refused !== "string" || refused.includes("/login"),
      JSON.stringify(refused),
    );
    if (mode !== "http") {
      console.log(
        `  —    le compte ${ACCOUNT} est resté sur « ${CHANGED} » : npm run db:reset avant la suite`,
      );
    }
  }
}

await browser.close();

console.log(
  `\n${problems.length === 0 ? "Les trois écrans tiennent." : `${problems.length} problème(s) :`}`,
);
for (const p of problems) console.log(`  · ${p}`);
console.log("");
process.exit(problems.length === 0 ? 0 : 1);
