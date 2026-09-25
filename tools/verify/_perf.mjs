// Part D-2 / D-9 · time to interactive, and the browser matrix.
//
//   BASE=http://localhost:3230 node tools/verify/_perf.mjs
//
// Measures the four Lot 1 screens the brief names, at 1440 and at 390
// on a throttled connection, and then runs axe-core and a keyboard
// traversal over the whole surface.

import { playwrightOrExplain } from "./browser.mjs";
import { readFileSync } from "node:fs";

const { chromium, devices } = await playwrightOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3230";
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

// Fast 3G, as the brief asks: 1.6 Mbps down, 750 kbps up, 150 ms RTT.
const FAST_3G = { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 };

const SCREENS = [
  ["Accueil", "/restaurant"],
  ["Réservations", "/restaurant/reservations"],
  ["Check-in", "/restaurant/check-in"],
  ["Recherche", "/restaurant/reservations?q=Charge"],
];

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "yassine@darzellij.ma");
  await page.fill('input[type="password"]', "demo");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);
  await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: "rst_dar_zellij" } });
}

async function measure(label, profile, throttle) {
  const context = await browser.newContext({ ...profile, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const page = await context.newPage();
  await signIn(page);
  if (throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, ...throttle });
  }
  console.log(`\n── ${label} ──`);
  for (const [name, path] of SCREENS) {
    const started = Date.now();
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Interactive, not merely painted: the first control the host would
    // press has to be there and enabled.
    const control = page.locator("button:visible, a:visible").first();
    await control.waitFor({ state: "visible", timeout: 60000 });
    const ms = Date.now() - started;
    const rows = await page.locator("h4, [data-row]").count();
    console.log(`  ${name.padEnd(14)} ${String(ms).padStart(6)} ms   ${rows} lignes   ${ms > 3000 ? "✗ > 3 s" : "ok"}`);
  }
  await context.close();
}

await measure("1440 × 1000 · sans bridage", { viewport: { width: 1440, height: 1000 } }, null);
await measure("1440 × 1000 · Fast 3G", { viewport: { width: 1440, height: 1000 } }, FAST_3G);
await measure("390 × 844 · sans bridage", { viewport: { width: 390, height: 844 } }, null);
await measure("390 × 844 · Fast 3G", { viewport: { width: 390, height: 844 } }, FAST_3G);

// ── Device profiles ──
for (const name of ["iPhone 14", "Pixel 7"]) {
  const profile = devices[name];
  if (!profile) { console.log(`\n${name} : profil absent de cette version de Playwright`); continue; }
  // The engine is Chromium either way — a real WebKit or Gecko run needs
  // browsers this container does not have, and saying so is the honest
  // answer rather than pretending the profile is the engine.
  const context = await browser.newContext({ ...profile, locale: "fr-FR" });
  const page = await context.newPage();
  await signIn(page);
  let problems = 0;
  page.on("pageerror", () => { problems += 1; });
  console.log(`\n── ${name} (${profile.viewport.width}×${profile.viewport.height}, moteur Chromium) ──`);
  for (const [label, path] of SCREENS) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`  ${label.padEnd(14)} débordement ${overflow}px ${overflow > 2 ? "✗" : "ok"}`);
  }
  console.log(`  erreurs de page : ${problems}`);
  await context.close();
}

// ── axe-core ──
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR" });
  const page = await context.newPage();
  await signIn(page);
  console.log("\n── axe-core ──");
  let critical = 0;
  let serious = 0;
  for (const [label, path] of [...SCREENS,
      ["Ma fiche", "/restaurant/ma-fiche"],
      ["Disponibilités", "/restaurant/disponibilites"],
      ["Notifications", "/restaurant/notifications"],
      ["Connexion", "/login"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await page.addScriptTag({ content: AXE });
    const result = await page.evaluate(async () =>
      await window.axe.run(document, { resultTypes: ["violations"] }));
    const c = result.violations.filter((v) => v.impact === "critical");
    const s = result.violations.filter((v) => v.impact === "serious");
    critical += c.length; serious += s.length;
    console.log(`  ${label.padEnd(14)} critique ${c.length}  sérieux ${s.length}`);
    for (const v of [...c, ...s]) {
      console.log(`      ${v.impact} · ${v.id} · ${v.nodes.length} noeud(s) · ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) {
        console.log(`         cible : ${JSON.stringify(node.target)}`);
        console.log(`         html  : ${String(node.html).replace(/\s+/g, " ").slice(0, 200)}`);
        for (const check of [...(node.any ?? []), ...(node.all ?? [])]) {
          if (check.message) console.log(`         → ${check.message}`);
        }
      }
    }
  }
  console.log(`  total : ${critical} critique(s), ${serious} sérieux`);
  await context.close();
}

// ── Keyboard only ──
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR" });
  const page = await context.newPage();
  await signIn(page);
  console.log("\n── Au clavier seul ──");
  for (const [label, path] of [...SCREENS,
      ["Ma fiche", "/restaurant/ma-fiche"],
      ["Disponibilités", "/restaurant/disponibilites"],
      ["Notifications", "/restaurant/notifications"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const seen = new Set();
    let visibleFocus = 0;
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const ring = style.outlineStyle !== "none" && style.outlineWidth !== "0px";
        const shadow = style.boxShadow !== "none";
        return {
          key: `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 24)}`,
          focusable: true,
          ring: ring || shadow,
        };
      });
      if (!info) continue;
      seen.add(info.key);
      if (info.ring) visibleFocus += 1;
    }
    console.log(`  ${label.padEnd(14)} ${seen.size} cibles atteintes, ${visibleFocus}/40 avec un anneau visible`);
  }
  await context.close();
}

await browser.close();
console.log("\nPERF_DONE");
