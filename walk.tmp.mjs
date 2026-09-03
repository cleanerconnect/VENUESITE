import { chromium } from "playwright";

const BASE = "http://localhost:3210";

const SCREENS = [
  ["", "Accueil"],
  ["/reservations", "Réservations"],
  ["/calendrier", "Calendrier"],
  ["/liste-attente", "Liste d'attente"],
  ["/check-in", "Check-in"],
  ["/briefing", "Briefing"],
  ["/clients", "Liste clients"],
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

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
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
await page.waitForURL(/restaurant|dashboard|login/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);

if (venue) {
  // Switch to the named venue through the session endpoint the switcher uses.
  const res = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: venue },
  });
  if (!res.ok()) problems.push(`venue switch failed: ${res.status()}`);
  await page.waitForTimeout(400);
}

let ok = 0;
for (const [path, label] of SCREENS) {
  const before = problems.length;
  const url = `${BASE}/restaurant${path}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  const status = response?.status() ?? 0;
  await page.waitForTimeout(450);

  const bodyText = (await page.textContent("body")) ?? "";
  const h1 = (await page.textContent("h1").catch(() => "")) ?? "";
  // Horizontal overflow is the phone-width failure that survives review.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  const issues = [];
  if (status !== 200) issues.push(`HTTP ${status}`);
  if (overflow > 2) issues.push(`overflow ${overflow}px`);
  if (/Application error|Internal Server Error/i.test(bodyText)) issues.push("error page");
  if (bodyText.trim().length < 200) issues.push("near-empty body");
  const newProblems = problems.slice(before);

  if (issues.length === 0 && newProblems.length === 0) {
    ok += 1;
    console.log(`  ok   ${label.padEnd(20)} ${path || "/"}  · ${h1.trim().slice(0, 40)}`);
  } else {
    console.log(
      `  FAIL ${label.padEnd(20)} ${path || "/"}  · ${[...issues, ...newProblems].join(" | ")}`,
    );
  }
}

console.log(`\n${ok}/${SCREENS.length} screens clean at ${width}×${height} for ${email}${venue ? ` (${venue})` : ""}`);
await browser.close();
