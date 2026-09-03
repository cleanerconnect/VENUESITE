// Dumps the real rendered content of every route as JSON, so the Figma
// export can carry the portal's French copy verbatim instead of copy
// invented at the keyboard. Output: docs/phase6-screens.json
//
//   node tools/verify/extract.mjs
//   VENUE=bar_nomad_casa OUT=lounge.json node tools/verify/extract.mjs
//
// Needs a server on BASE and `npm install --no-save playwright`.

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { ROUTES } from "../../src/lib/nav/routes.ts";

const BASE = process.env.BASE ?? "http://localhost:3210";
const OUT = process.env.OUT ?? "docs/phase6-screens.json";
const VENUE = process.env.VENUE ?? "";
const W = Number(process.env.W ?? 1440);
const H = Number(process.env.H ?? 900);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({ viewport: { width: W, height: H } });
const page = await context.newPage();

async function login(email) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "demo");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3800);
}

// Reads the visible structure of <main>: headings in order, metric tiles,
// pills, buttons, table headers and the first rows of any list.
const OUTLINE = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const root = document.querySelector("main") || document.body;
  const seen = new Set();

  const tiles = [...root.querySelectorAll("div,section")]
    .filter((n) => {
      const eb = n.querySelector(":scope > div > .text-eyebrow, :scope > .text-eyebrow");
      const val = n.querySelector('[class*="text-metric"]');
      return eb && val && !seen.has(n);
    })
    .slice(0, 12)
    .map((n) => {
      seen.add(n);
      return {
        label: clean(n.querySelector(".text-eyebrow")?.textContent),
        value: clean(n.querySelector('[class*="text-metric"]')?.textContent),
      };
    })
    .filter((t) => t.label && t.value);
  const uniqueTiles = [];
  for (const t of tiles) {
    if (!uniqueTiles.some((u) => u.label === t.label)) uniqueTiles.push(t);
  }

  const headings = [...root.querySelectorAll("h1,h2,h3")]
    .map((n) => ({ level: n.tagName.toLowerCase(), text: clean(n.textContent) }))
    .filter((h) => h.text)
    .slice(0, 24);

  const subtitle = clean(
    root.querySelector("h1")?.parentElement?.parentElement
      ?.querySelector("p, .text-body")?.textContent,
  );

  const pills = [...new Set(
    [...root.querySelectorAll('span[class*="rounded-full"]')]
      .map((n) => clean(n.textContent)).filter((t) => t && t.length < 28),
  )].slice(0, 16);

  const buttons = [...new Set(
    [...root.querySelectorAll("button, a[role=button]")]
      .map((n) => clean(n.textContent)).filter((t) => t && t.length < 34),
  )].slice(0, 14);

  const tables = [...root.querySelectorAll("table")].slice(0, 2).map((t) => ({
    head: [...t.querySelectorAll("thead th")].map((n) => clean(n.textContent)),
    rows: [...t.querySelectorAll("tbody tr")].slice(0, 6)
      .map((r) => [...r.querySelectorAll("td")].map((n) => clean(n.textContent))),
  }));

  return { headings, subtitle, tiles: uniqueTiles, pills, buttons, tables };
};

const NAV = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const aside = document.querySelector("aside");
  if (!aside) return null;
  return {
    groups: [...aside.querySelectorAll("nav > div")]
      .map((d) => ({
        label: clean(d.querySelector(":scope > p")?.textContent),
        items: [...d.querySelectorAll("a")].map((a) => ({
          label: clean(a.textContent),
          href: a.getAttribute("href"),
        })),
      }))
      .filter((g) => g.label && g.items.length),
  };
};

const result = { base: BASE, venue: VENUE, viewport: { W, H }, screens: {}, nav: null };

// Venue routes need the venue account; event routes the organiser one.
await login("yassine@darzellij.ma");
if (VENUE) {
  await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: VENUE } });
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

const VENUE_ROUTES = ROUTES.filter((r) => r.workspace === "venue");
const EVENT_ROUTES = ROUTES.filter((r) => r.workspace === "event" || r.workspace === "shared");
const ENTRY_ROUTES = ROUTES.filter((r) => r.workspace === "entry");

async function grab(list, label) {
  for (const r of list) {
    try {
      await page.goto(`${BASE}${r.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      result.screens[r.path] = {
        label: r.label,
        purpose: r.purpose,
        status: r.status,
        gap: r.gap ?? null,
        dependsOn: r.dependsOn ?? null,
        roles: r.roles ?? null,
        workspace: r.workspace,
        ...(await page.evaluate(OUTLINE)),
      };
      if (!result.nav) result.nav = await page.evaluate(NAV);
      console.log(`  ok   ${label} ${r.path}`);
    } catch (e) {
      console.log(`  FAIL ${label} ${r.path} — ${e.message.slice(0, 70)}`);
      result.screens[r.path] = { label: r.label, error: e.message.slice(0, 200) };
    }
  }
}

await grab(VENUE_ROUTES, "venue");
await grab(EVENT_ROUTES, "event");

// Entry routes have no session.
await context.clearCookies();
await grab(ENTRY_ROUTES, "entry");

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nwrote ${OUT} — ${Object.keys(result.screens).length} screens`);
await browser.close();
