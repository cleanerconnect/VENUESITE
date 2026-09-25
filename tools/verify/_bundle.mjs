// Part E · what a route actually costs on the wire.
//
//   BASE=http://localhost:3230 node tools/verify/_bundle.mjs
//
// Summing the build manifest over-counts: it lists every shared chunk
// against every route that uses it, so `/restaurant/[[...section]]` came
// out at 383 KB gzipped when the browser transfers far less. This
// measures the browser instead — one cold context per route, no cache,
// counting the bytes that actually arrive.

import { chromiumOrExplain } from "./browser.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3230";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

const ROUTES = [
  ["Connexion", "/login", false],
  ["Inscription", "/inscription", false],
  ["Accueil", "/restaurant", true],
  ["Réservations", "/restaurant/reservations", true],
  ["Check-in", "/restaurant/check-in", true],
  ["Ma fiche", "/restaurant/ma-fiche", true],
  ["Disponibilités", "/restaurant/disponibilites", true],
  ["Notifications", "/restaurant/notifications", true],
];

const kb = (n) => `${(n / 1024).toFixed(0)} Ko`;
console.log(
  `${"route".padEnd(16)}${"documents".padStart(10)}${"scripts".padStart(9)}` +
    `${"styles".padStart(8)}${"images".padStart(8)}${"total".padStart(11)}${"js".padStart(10)}`,
);

let worst = 0;
for (const [label, path, needsSession] of ROUTES) {
  // A cold context per route: a warm cache measures the second visit,
  // and the number that matters is the first one.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR" });
  const page = await context.newPage();
  if (needsSession) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', "yassine@darzellij.ma");
    await page.fill('input[type="password"]', "demo");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2200);
    await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: "rst_dar_zellij" } });
  }

  const totals = { document: 0, script: 0, stylesheet: 0, image: 0, font: 0, other: 0 };
  const counts = { script: 0 };
  const onResponse = async (response) => {
    const request = response.request();
    const type = request.resourceType();
    let size = 0;
    try {
      // `encodedBodySize` is what crossed the wire, compression included.
      const sizes = await response.request().sizes();
      // Playwright reports -1 for a body it did not see cross the wire
      // (a 304, a response served from the service worker, a request
      // aborted on navigation). Counting that as -1 subtracts bytes and
      // printed a « -1 Ko » column.
      size = Math.max(0, sizes.responseBodySize ?? 0);
    } catch {
      size = 0;
    }
    const bucket = type in totals ? type : "other";
    totals[bucket] += size;
    if (bucket === "script") counts.script += 1;
  };

  const measured = await context.newPage();
  measured.on("response", (r) => { void onResponse(r); });
  // Share the signed cookies: they live on the context.
  await measured.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 60000 });
  await measured.waitForTimeout(2200);
  measured.removeAllListeners("response");

  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  worst = Math.max(worst, totals.script);
  console.log(
    `${label.padEnd(16)}${kb(totals.document).padStart(10)}${kb(totals.script).padStart(9)}` +
      `${kb(totals.stylesheet).padStart(8)}${kb(totals.image).padStart(8)}` +
      `${kb(total).padStart(11)}${String(counts.script).padStart(4)} fich.`,
  );
  await context.close();
}

await browser.close();
console.log(
  `\nLe pire script par route : ${kb(worst)} transférés. ` +
    `Seuil de l'audit : 300 Ko gzippés — ${worst > 300 * 1024 ? "DÉPASSÉ" : "tenu"}.`,
);
