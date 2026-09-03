// Walks every event-workspace route in a real browser and reports what broke.
//
// The companion to walk.mjs, which only ever covered the thirty venue
// screens. That gap hid a real defect for two phases: the route index
// pointed at /events/evt_jazz_2026, an id that exists in no dataset, so
// both event-detail rows were 404s that nothing checked. This walk reads
// its route list from `lib/nav/routes.ts` rather than repeating it, so a
// row added there is a row walked here.
//
//   node tools/verify/events.mjs
//   W=390 H=844 node tools/verify/events.mjs
//   ACCOUNT=yassine@darzellij.ma node tools/verify/events.mjs
//
// Needs a server already running on BASE and `npm install --no-save
// playwright`. Kept out of package.json on purpose: it is a check to run
// deliberately, not a dependency to carry.

import { chromium } from "playwright";
import { ROUTES } from "../../src/lib/nav/routes.ts";

const BASE = process.env.BASE ?? "http://localhost:3210";
const W = Number(process.env.W ?? 1440);
const H = Number(process.env.H ?? 900);
const ACCOUNT = process.env.ACCOUNT ?? "mido@jazzablanca.com";

// The event workspace plus the two shared overflow sheets. Venue routes are
// walk.mjs's job; entry routes need no session.
const PATHS = ROUTES.filter(
  (r) => r.workspace === "event" || r.workspace === "shared",
).map((r) => [r.path, r.label]);

// Noise a healthy page still emits in this sandbox: the React devtools
// nag, favicon 404s, and preload warnings for fonts the CDN cannot reach.
const IGNORE = /favicon|Download the React|was preloaded using link preload|preload/i;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({ viewport: { width: W, height: H } });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.fill('input[type="email"]', ACCOUNT);
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);

let failed = 0;

for (const [path, label] of PATHS) {
  const errors = [];
  const onConsole = (m) => {
    if (m.type() === "error") errors.push(m.text());
  };
  const onPageError = (e) => errors.push(`PAGEERROR ${e.message}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1800);

  const heading =
    (await page.locator("h1, h2").first().textContent().catch(() => "")) ?? "";
  // Next's own not-found page renders this pair. A 200 that says 404 is
  // the exact failure the old walk could not see.
  const notFound = /^\s*404\s*$/.test(heading);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  page.off("console", onConsole);
  page.off("pageerror", onPageError);

  const real = errors.filter((e) => !IGNORE.test(e));
  const problems = [];
  if (response.status() >= 400) problems.push(`HTTP ${response.status()}`);
  if (notFound) problems.push("page introuvable");
  if (overflow) problems.push("débordement horizontal");
  if (real.length) problems.push(real[0].slice(0, 90));

  if (problems.length) failed += 1;
  console.log(
    `  ${problems.length ? "FAIL" : "ok  "} ${label.padEnd(22)} ${path.padEnd(30)}` +
      (problems.length ? ` · ${problems.join(" · ")}` : ` · ${heading.trim().slice(0, 40)}`),
  );
}

console.log(
  failed === 0
    ? `\n${PATHS.length}/${PATHS.length} event-side routes clean at ${W}×${H}`
    : `\n${failed} of ${PATHS.length} FAILED at ${W}×${H}`,
);

await browser.close();
process.exit(failed === 0 ? 0 : 1);
