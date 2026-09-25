import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3212";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
const page = await ctx.newPage();
const lines = [];
page.on("console", (m) => { const t = m.text(); if (/hydrat|did not match|Warning/i.test(t)) lines.push(`[${m.type()}] ${t.slice(0, 700)}`); });
page.on("pageerror", (e) => lines.push(`[pageerror] ${String(e).slice(0, 700)}`));
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator('input[type="email"]').first().fill("yassine@darzellij.ma");
await page.locator('input[type="password"]').first().fill("demo");
await page.locator('button:has-text("Se connecter")').first().click();
await page.waitForTimeout(6000);
for (const path of ["/restaurant", "/restaurant/reservations", "/restaurant/check-in"]) {
  lines.push(`--- ${path}`);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
}
await browser.close();
console.log(lines.join("\n\n"));
