// Checks the two things that make drinks a configuration rather than a
// second product, on a running portal rather than by reading the code.
//
//   1. Vie nocturne exists for a lounge and is *absent* for a
//      restaurant — not greyed, not empty.
//   2. The vocabulary follows the configuration: couverts / personnes.
//      Both halves of it. Checking only that a lounge *says* personnes
//      is what let the advisor's nudge go on counting couverts on a
//      bar's Accueil for a release: the word was there, three lines
//      below the wrong one. So the lounge's whole surface is swept for
//      the restaurant's word, screen by screen.
//
// And, while it is here, the rule the specification states twice: spend
// appears only where a transaction source exists. Nomad Rooftop is
// seeded without Lyfe Pay precisely so this can be checked.
//
//   node tools/verify/configuration.mjs

import { chromiumOrExplain } from "./browser.mjs";
import { LOT, LOT_LABEL, venuePaths } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

const GROUPS = ["Aujourd'hui", "En service", "Clients", "Ma présence",
  "Croissance", "Vie nocturne", "Paiements", "Pilotage", "Établissement", "Compte"];

// Lot 1 is the Dashboard basique of Planning V3's Prio 02 row:
// authentication, the venue's own record, and the booking work. Its
// sidebar now follows the event dashboard's — the entries listed one
// after another, a single hairline before the establishment ones, and
// no group headers at all — so under Lot 1 there is no group label left
// to count. What identifies the lot is the six entries themselves, and
// the absence of every screen it does not buy. The same six to a lounge
// as to a restaurant, since Détail Sprint row 41 puts the identical
// user story on Drinks/Cellar.
const LOT1_ITEMS = ["Accueil", "Réservations", "Check-in", "Ma fiche",
  "Disponibilités", "Notifications"];
const LOT2_ITEMS = ["Calendrier", "Liste d'attente", "Briefing",
  "Liste clients", "Tags et segments", "Audience", "Menu", "Avis",
  "Visibilité", "Offres", "Expériences", "Guest list", "Tables minimums",
  "Promoteurs", "Acomptes", "Annulations", "Lyfe Pay", "Performance",
  "Bilans", "Campagnes", "Équipe et rôles", "Paramètres", "Abonnement",
  "Support"];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', "yassine@darzellij.ma");
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

let fails = 0;

async function inspect(venueId, label, expectNightlife, expectWord) {
  // A refused switch is the failure this check exists to catch, and it
  // is silent unless asserted: the page then renders the *other* venue
  // perfectly well, and every assertion below quietly measures the
  // wrong establishment.
  const switched = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId },
  });
  if (!switched.ok()) {
    console.log(`${label}\n  ✗ bascule refusée (${switched.status()})`);
    fails += 1;
    return;
  }
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  const nav = (await page.textContent("aside")) ?? "";
  const body = (await page.textContent("body")) ?? "";
  const labels = GROUPS.filter((g) => nav.includes(g));
  const nightlife = nav.includes("Vie nocturne");
  const word = body.includes(expectWord);

  // Lyfe Pay is a Lot 2 screen. Under Lot 1 there is no money figure to
  // check the rule against, which is itself the rule: the Dashboard
  // basique of Planning V3's Prio 02 row manages bookings and reports
  // on nothing, so a dirham on any of its screens is a defect.
  let payLine;
  let payFail = false;
  if (LOT === 2) {
    await page.goto(`${BASE}/restaurant/lyfe-pay`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const pay = (await page.textContent("body")) ?? "";
    payLine = pay.includes("Aucune transaction n'est passée")
      ? "aucune source — tuiles masquées"
      : "source présente — tuiles affichées";
  } else {
    const money = [];
    for (const path of venuePaths()) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const text = (await page.textContent("body")) ?? "";
      if (/\bMAD\b|\bDH\b/.test(text)) money.push(path);
    }
    payFail = money.length > 0;
    payLine = payFail
      ? `✗ montant affiché sur ${money.join(", ")}`
      : "aucun montant sur les sept écrans ✓";
  }

  // Under Lot 1 the nightlife group is absent whatever the
  // configuration, because every screen in it belongs to Lot 2.
  const wantNightlife = LOT === 2 && expectNightlife;

  // Lot 2 still names its groups, and is counted on them — two filters
  // stacking, the lot dropping Vie nocturne and Paiements and then the
  // configuration dropping Vie nocturne again for a restaurant. Lot 1's
  // sidebar names nothing, so it is counted on its entries instead, and
  // a group header appearing there is itself the failure.
  let navLine;
  let navFail = false;
  if (LOT === 2) {
    const want = GROUPS.filter((g) => g !== "Vie nocturne" || wantNightlife);
    navFail = labels.length !== want.length;
    navLine = `groupes      ${labels.length}/${want.length} · ${
      labels.join(" · ")
    }${navFail ? ` ✗ ${want.length} attendus en ${LOT_LABEL}` : ""}`;
  } else {
    const missing = LOT1_ITEMS.filter((i) => !nav.includes(i));
    const extra = LOT2_ITEMS.filter((i) => nav.includes(i));
    navFail = missing.length > 0 || extra.length > 0 || labels.length > 0;
    navLine = navFail
      ? `entrées      ✗ ${[
          missing.length ? `manquantes : ${missing.join(", ")}` : null,
          extra.length ? `hors lot : ${extra.join(", ")}` : null,
          labels.length ? `en-têtes rendus : ${labels.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}`
      : `entrées      ${LOT1_ITEMS.length}/${LOT1_ITEMS.length} · ${
          LOT1_ITEMS.join(" · ")
        } · sans en-tête ✓`;
  }

  console.log(label);
  console.log(`  ${navLine}`);
  console.log(
    `  Vie nocturne ${nightlife ? "présente" : "absente"} ${
      nightlife === wantNightlife
        ? LOT === 2 || !expectNightlife
          ? "✓"
          : "✓ (lot 2)"
        : "✗ attendu l'inverse"
    }`,
  );
  console.log(`  vocabulaire  « ${expectWord} » ${word ? "✓" : "✗ absent"}`);
  console.log(`  Lyfe Pay     ${payLine}`);

  if (nightlife !== wantNightlife) fails += 1;
  if (!word) fails += 1;
  if (payFail) fails += 1;
  if (navFail) fails += 1;
}

/**
 * The restaurant's word for a booked head, anywhere on a lounge screen.
 *
 * `couverture` is a cover photo and `découvert` is an overdraft, so the
 * match is on the noun with word boundaries and nothing else. Every
 * screen this lot registers is swept, not just Accueil: the regression
 * this catches was in a card the advisor writes, and the next one will
 * be somewhere else.
 */
const RESTAURANT_WORD = /(?<![a-zà-ÿ])couverts?(?![a-zà-ÿ])/i;

async function vocabulary() {
  const switched = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: "bar_nomad_casa" },
  });
  if (!switched.ok()) {
    console.log(`Vocabulaire du lounge\n  ✗ bascule refusée (${switched.status()})`);
    fails += 1;
    return;
  }

  const offenders = [];
  // `venuePaths` strips the workspace prefix, so Accueil comes back as
  // the empty string. It has to be put back: without it the sweep asks
  // for the marketing home page and reports a clean bar, and Accueil is
  // the one screen the regression was actually on.
  for (const path of venuePaths()) {
    await page.goto(`${BASE}/restaurant${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const body = (await page.innerText("body").catch(() => "")) ?? "";
    const line = body.split("\n").find((l) => RESTAURANT_WORD.test(l));
    if (line) offenders.push([`/restaurant${path}`, line.trim()]);
  }

  console.log(`Vocabulaire du lounge · ${venuePaths().length} écrans balayés`);
  if (offenders.length === 0) {
    console.log("  aucun « couvert » sur un écran de bar ✓");
    return;
  }
  for (const [path, line] of offenders) {
    console.log(`  ✗ ${path}`);
    console.log(`      ${line.slice(0, 120)}`);
  }
  fails += offenders.length;
}

await inspect("rst_dar_zellij", "Dar Zellij (restaurant)", false, "couverts");
console.log();
await inspect("bar_nomad_casa", "Nomad Rooftop (lounge)", true, "personnes");
console.log();
await vocabulary();

console.log(
  fails === 0
    ? `\nConfiguration behaves as specified · ${LOT_LABEL}.`
    : `\n${fails} failures`,
);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
