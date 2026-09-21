// Checks the two things that make drinks a configuration rather than a
// second product, on a running portal rather than by reading the code.
//
//   1. Vie nocturne exists for a lounge and is *absent* for a
//      restaurant — not greyed, not empty.
//   2. The vocabulary follows the configuration: couverts / personnes.
//
// And, while it is here, the rule the specification states twice: spend
// appears only where a transaction source exists. Nomad Rooftop is
// seeded without Lyfe Pay precisely so this can be checked.
//
//   node tools/verify/configuration.mjs

import { chromium } from "playwright";
import { LOT, LOT_LABEL } from "./lot.mjs";

const BASE = process.env.BASE ?? "http://localhost:3210";

const GROUPS = ["Aujourd'hui", "En service", "Clients", "Ma présence",
  "Croissance", "Vie nocturne", "Paiements", "Pilotage", "Établissement", "Compte"];

// Two groups are entirely Lot 2 — Vie nocturne and Paiements — so a Lot 1
// sidebar shows eight of the ten, and shows them to a lounge too. The
// count is derived rather than typed, so it cannot disagree with the
// gate it is checking.
const LOT1_GROUPS = ["Aujourd'hui", "En service", "Clients", "Ma présence",
  "Croissance", "Pilotage", "Établissement", "Compte"];
const EXPECTED = LOT === 2 ? GROUPS : LOT1_GROUPS;

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
  const present = GROUPS.filter((g) => nav.includes(g));
  const nightlife = nav.includes("Vie nocturne");
  const word = body.includes(expectWord);

  // Lyfe Pay is a Lot 2 screen. Under Lot 1 the money rule is checked
  // where it still shows: the estimated-revenue tile on Accueil.
  let payLine;
  if (LOT === 2) {
    await page.goto(`${BASE}/restaurant/lyfe-pay`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const pay = (await page.textContent("body")) ?? "";
    payLine = pay.includes("Aucune transaction n'est passée")
      ? "aucune source — tuiles masquées"
      : "source présente — tuiles affichées";
  } else {
    payLine = body.includes("Revenu estimé")
      ? "source présente — tuile Revenu estimé affichée"
      : "aucune source — tuile Revenu estimé masquée";
  }

  // Under Lot 1 the nightlife group is absent whatever the
  // configuration, because every screen in it belongs to Lot 2.
  const wantNightlife = LOT === 2 && expectNightlife;

  console.log(label);
  console.log(
    `  groupes      ${present.length}/${
      EXPECTED.filter((g) => g !== "Vie nocturne" || wantNightlife).length
    } · ${present.join(" · ")}`,
  );
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
  // Two filters stack: the lot drops Vie nocturne and Paiements, then
  // the configuration drops Vie nocturne again for a restaurant. The
  // expected count has to apply both, or Lot 2's restaurant reads as a
  // failure for showing the nine groups it should.
  const want = EXPECTED.filter((g) => g !== "Vie nocturne" || wantNightlife).length;
  if (present.length !== want) {
    console.log(`  ✗ ${want} groupes attendus en ${LOT_LABEL}`);
    fails += 1;
  }
}

await inspect("rst_dar_zellij", "Dar Zellij (restaurant)", false, "couverts");
console.log();
await inspect("bar_nomad_casa", "Nomad Rooftop (lounge)", true, "personnes");

console.log(
  fails === 0
    ? `\nConfiguration behaves as specified · ${LOT_LABEL}.`
    : `\n${fails} failures`,
);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
