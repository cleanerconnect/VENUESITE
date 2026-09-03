// Walks every venue screen in a real browser and reports what broke.
//
// Not a test suite — a walk. It opens each of the thirty screens the
// specification names, at a given viewport, as a given account, and
// checks the four things that actually go wrong in this codebase: a
// non-200, horizontal overflow at phone width, an error page where a
// screen should be, and anything logged to the console.
//
//   node tools/verify/walk.mjs
//   W=390 H=844 node tools/verify/walk.mjs
//   VENUE=bar_nomad_casa node tools/verify/walk.mjs
//
// Needs a server already running on BASE and `npm install --no-save
// playwright`. Kept out of package.json on purpose: it is a check to run
// deliberately, not a dependency to carry.

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3210";

const SCREENS = [
  ["", "Accueil"],
  ["/reservations", "Réservations"],
  ["/calendrier", "Calendrier"],
  ["/liste-attente", "Liste d'attente"],
  ["/check-in", "Check-in"],
  ["/briefing", "Briefing"],
  ["/clients", "Liste clients"],
  ["/clients/cus_1", "Fiche client"],
  ["/segments", "Tags et segments"],
  ["/ma-fiche", "Ma fiche"],
  ["/menu", "Menu"],
  ["/avis", "Avis"],
  ["/visibilite", "Visibilité"],
  ["/offres", "Offres"],
  ["/experiences", "Expériences"],
  ["/guest-list", "Guest list"],
  ["/tables", "Tables minimums"],
  ["/promoteurs", "Promoteurs"],
  ["/acomptes", "Acomptes"],
  ["/annulations", "Annulations"],
  ["/lyfe-pay", "Lyfe Pay"],
  ["/performance", "Performance"],
  ["/bilans", "Bilans"],
  ["/campagnes", "Campagnes"],
  ["/disponibilites", "Disponibilités"],
  ["/equipe", "Équipe et rôles"],
  ["/notifications", "Notifications"],
  ["/parametres", "Paramètres"],
  ["/abonnement", "Abonnement"],
  ["/support", "Support"],
];

const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const email = process.env.EMAIL ?? "yassine@darzellij.ma";
const venue = process.env.VENUE ?? "";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();

const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 160)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

if (venue) {
  const res = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: venue },
  });
  if (!res.ok()) problems.push(`venue switch failed: ${res.status()}`);
  await page.waitForTimeout(400);
}

let ok = 0;
for (const [path, label] of SCREENS) {
  const before = problems.length;
  const response = await page.goto(`${BASE}/restaurant${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });
  const status = response?.status() ?? 0;
  await page.waitForTimeout(450);

  const bodyText = (await page.textContent("body")) ?? "";
  const h1 = (await page.textContent("h1").catch(() => "")) ?? "";
  // The phone-width failure that survives review: the page body itself
  // scrolling sideways. Wide content must scroll inside its own box.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  const issues = [];
  if (status !== 200) issues.push(`HTTP ${status}`);
  if (overflow > 2) issues.push(`overflow ${overflow}px`);
  if (/Cette page n'a pas pu charger|Application error/i.test(bodyText)) {
    issues.push("error page");
  }
  if (bodyText.trim().length < 200) issues.push("near-empty body");
  const found = problems.slice(before);

  if (issues.length === 0 && found.length === 0) {
    ok += 1;
    console.log(`  ok   ${label.padEnd(20)} ${path || "/"}  · ${h1.trim().slice(0, 40)}`);
  } else {
    console.log(`  FAIL ${label.padEnd(20)} ${path || "/"}  · ${[...issues, ...found].join(" | ")}`);
  }
}

console.log(
  `\n${ok}/${SCREENS.length} screens clean at ${width}×${height}${venue ? ` · ${venue}` : ""}`,
);
await browser.close();
process.exit(ok === SCREENS.length ? 0 : 1);
