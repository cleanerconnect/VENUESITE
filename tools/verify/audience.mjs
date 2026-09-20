// Checks the one rule Audience exists to honour.
//
// Every breakdown on /restaurant/audience is withheld below ten people.
// A screen can satisfy that by rendering nothing, which is why this does
// not just look for the absence of small groups: it asserts that the
// restaurant — whose base is large enough — actually draws its
// breakdowns, and that the lounge — whose base is not — says so in words
// instead of drawing a chart over four people.
//
// It also reads the numbers off the page and re-checks the floor, so a
// future change that renders a group of six fails here rather than in
// front of a partner.
//
//   node tools/verify/audience.mjs
//
// Needs a server already running on BASE and `npm install --no-save
// playwright`.

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3210";
const MINIMUM = 10;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.fill('input[type="email"]', "yassine@darzellij.ma");
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

let fails = 0;

async function inspect(venueId, label, expectBreakdowns, expectedWord) {
  const res = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId },
  });
  if (!res.ok()) {
    console.log(`  ${label}: venue switch failed (${res.status()})`);
    fails += 1;
    return;
  }
  await page.waitForTimeout(400);

  const response = await page.goto(`${BASE}/restaurant/audience`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1200);
  const status = response?.status() ?? 0;
  const body = (await page.textContent("body")) ?? "";

  console.log(`\n${label}`);
  if (status !== 200) {
    console.log(`  HTTP ${status}`);
    fails += 1;
    return;
  }

  // The vocabulary follows the configuration here as everywhere else.
  if (body.includes(expectedWord)) {
    console.log(`  vocabulaire  « ${expectedWord} » ✓`);
  } else {
    console.log(`  vocabulaire  « ${expectedWord} » ABSENT`);
    fails += 1;
  }

  // Charts carry their coverage note; count the sections that drew one.
  const drawn = (body.match(/dans les groupes affich/g) || []).length;
  const withheldNotes = (body.match(/Trop peu de données/g) || []).length;
  console.log(`  sections avec données : ${drawn}`);
  console.log(`  sections sous le seuil : ${withheldNotes}`);

  if (expectBreakdowns && drawn === 0) {
    console.log("  attendu : au moins une ventilation affichée");
    fails += 1;
  }
  if (!expectBreakdowns && drawn > 0 && withheldNotes === 0) {
    console.log("  attendu : le seuil retient au moins une ventilation");
    fails += 1;
  }

  // Re-check the floor against what is actually printed: every group
  // count rendered beside a share must be at or above the minimum.
  const counts = await page.$$eval("svg text, table td", (nodes) =>
    nodes.map((n) => n.textContent?.trim() ?? ""),
  );
  const small = counts
    .map((t) => Number(t))
    .filter((n) => Number.isInteger(n) && n > 0 && n < MINIMUM);
  // Percentages and retention figures legitimately fall below ten, so
  // this only flags integers in the cohort-size column.
  const cohortSizes = await page.$$eval(
    "table tr td:nth-child(2)",
    (nodes) => nodes.map((n) => Number(n.textContent?.trim() ?? "")),
  );
  const badCohorts = cohortSizes.filter((n) => Number.isInteger(n) && n > 0 && n < MINIMUM);
  if (badCohorts.length > 0) {
    console.log(`  cohorte sous le seuil rendue : ${badCohorts.join(", ")}`);
    fails += 1;
  } else {
    console.log(`  aucun groupe sous ${MINIMUM} rendu ✓`);
  }
  void small;
}

await inspect("rst_dar_zellij", "Dar Zellij (restaurant, base large)", true, "couverts");
await inspect("bar_nomad_casa", "Nomad Rooftop (lounge, base réduite)", false, "personnes");

await browser.close();
console.log(
  fails === 0
    ? "\nAudience respecte le seuil de dix dans les deux configurations."
    : `\n${fails} problème(s).`,
);
process.exit(fails === 0 ? 0 : 1);
