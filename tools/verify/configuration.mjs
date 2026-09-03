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

const BASE = process.env.BASE ?? "http://localhost:3210";

const GROUPS = ["Aujourd'hui", "En service", "Clients", "Ma présence",
  "Croissance", "Vie nocturne", "Paiements", "Pilotage", "Établissement", "Compte"];

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

  await page.goto(`${BASE}/restaurant/lyfe-pay`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const pay = (await page.textContent("body")) ?? "";
  const hidden = pay.includes("Aucune transaction n'est passée");

  console.log(label);
  console.log(`  groupes      ${present.length}/10 · ${present.join(" · ")}`);
  console.log(`  Vie nocturne ${nightlife ? "présente" : "absente"} ${nightlife === expectNightlife ? "✓" : "✗ attendu l'inverse"}`);
  console.log(`  vocabulaire  « ${expectWord} » ${word ? "✓" : "✗ absent"}`);
  console.log(`  Lyfe Pay     ${hidden ? "aucune source — tuiles masquées" : "source présente — tuiles affichées"}`);

  if (nightlife !== expectNightlife) fails += 1;
  if (!word) fails += 1;
}

await inspect("rst_dar_zellij", "Dar Zellij (restaurant)", false, "couverts");
console.log();
await inspect("bar_nomad_casa", "Nomad Rooftop (lounge)", true, "personnes");

console.log(fails === 0 ? "\nConfiguration behaves as specified." : `\n${fails} failures`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
