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

import { chromiumOrExplain } from "./browser.mjs";
import { LOT, LOT_LABEL, ownerOf, signIn, venueScreens } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";

// Derived from the route index and filtered by lot, so a screen this
// build does not register is not walked and not counted as missing.
const SCREENS = venueScreens();

// Six viewports, in one run.
//
// It walked one width at a time and the matrix ran it twice, at 1440
// and at 390 — which is a phone and a desktop, and nothing in between.
// The two tablet widths are where the portal actually broke: at 768 the
// navigation column appeared and left 508px of page beside it, and
// nobody saw that because nothing ever opened the portal at 768.
//
// `W` and `H` still take one number each, so `W=390 H=844` is the same
// run it always was. Given a list — `W=390,768 H=844,1024` — it walks
// each pair. With neither, it walks all six: the two phones, the tablet
// in both orientations, and the two desktops.
const SIX = [
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
];
const numbers = (name) =>
  (process.env[name] ?? "")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
const askedWidths = numbers("W");
const askedHeights = numbers("H");
const VIEWPORTS = askedWidths.length
  ? askedWidths.map((w, i) => [
      w,
      askedHeights[i] ?? askedHeights[0] ?? SIX.find(([sw]) => sw === w)?.[1] ?? 900,
    ])
  : SIX;
// Unset by default: each establishment is opened by the account that
// holds it, which under Lot 1 is a different person per venue and under
// Lot 2 is Yassine for both. `EMAIL=` pins one account for every venue.
const email = process.env.EMAIL ?? null;
// Both venues by default, because they are not the same product.
// `Détail Sprint` row 41 puts the same user story on Drinks/Cellar, so a
// lounge renders these seven screens too — and it books créneaux rather
// than services, which is a different vocabulary through every builder.
// Walking only the restaurant let a lounge-only crash on Accueil sit
// behind a clean 6/6 for as long as nobody passed VENUE by hand.
const venues = process.env.VENUE
  ? [process.env.VENUE]
  : ["rst_dar_zellij", "bar_nomad_casa"];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

const problems = [];
// The map draws OpenStreetMap tiles and geocodes through Nominatim.
// Neither is reachable from a sandboxed runner, and a tile that fails to
// load is not this portal's defect — the component renders and stays
// usable without them. Anything else on the console still fails the run.
const EXTERNAL_MAP = /tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|\/api\/geocode/;
/** A fresh context per viewport, with its own console listeners. */
async function openPage(width, height) {
  // `locale` because a native date input formats its own value from the
  // browser's locale, not from the page: without it a French portal
  // captures `09/25/2026` next to a day it spells "vendredi 25 septembre".
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "fr-FR",
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // A failed resource logs its message here and its URL in `location()`;
    // a tile server refused by the runner's proxy says only
    // « ERR_TUNNEL_CONNECTION_FAILED » in the text, so both are checked.
    const from = m.location()?.url ?? "";
    if (EXTERNAL_MAP.test(text) || EXTERNAL_MAP.test(from)) return;
    problems.push(`console: ${text.slice(0, 160)}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  return { context, page };
}

let ok = 0;
let expected = 0;
const perViewport = [];

for (const [width, height] of VIEWPORTS) {
const { context, page } = await openPage(width, height);
const okBefore = ok;
const expectedBefore = expected;
console.log(`\n──── ${width}×${height} ────`);

for (const venue of venues) {
  // Signed in per establishment rather than once, because Lot 1 holds
  // one owner account per venue — there is no switcher to switch with,
  // and `POST /api/session/venue` is refused for a venue the account
  // does not hold. Lot 2 signs the same account in twice, which costs
  // two seconds and keeps one code path.
  const who = email ?? ownerOf(venue);
  await signIn(page, BASE, { email: who });
  const res = await page.request.post(`${BASE}/api/session/venue`, {
    data: { venueId: venue },
  });
  if (!res.ok()) problems.push(`venue switch failed: ${res.status()}`);
  await page.waitForTimeout(400);
  console.log(`\n${venue} · ${who}`);

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

    // A chart that drew nothing. `ResponsiveContainer` renders its box
    // first and fills it once it has measured a width, so an empty box
    // on a screen that asks for a chart is a chart that never mounted —
    // which is how every chart in the portal came to be a blank 220px
    // rectangle without a single screen failing a check. Only visible
    // containers count: both lanes are in the DOM at every width and
    // the hidden one is legitimately 0×0, so it has nothing to draw.
    const blank = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll(".recharts-responsive-container")].filter(
            (c) => c.getBoundingClientRect().width > 0 && c.children.length === 0,
          ).length,
      );
    let blankCharts = await blank();
    if (blankCharts > 0) {
      // Give the container its measuring tick before calling it empty.
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll(".recharts-responsive-container")].every(
              (c) => c.getBoundingClientRect().width === 0 || c.children.length > 0,
            ),
          undefined,
          { timeout: 2500, polling: 200 },
        )
        .catch(() => {});
      blankCharts = await blank();
    }

    const issues = [];
    if (status !== 200) issues.push(`HTTP ${status}`);
    if (overflow > 2) issues.push(`overflow ${overflow}px`);
    if (blankCharts) issues.push(`${blankCharts} graphique(s) vide(s)`);
    if (/Cette page n'a pas pu charger|Application error/i.test(bodyText)) {
      issues.push("error page");
    }
    if (bodyText.trim().length < 200) issues.push("near-empty body");
    const found = problems.slice(before);

    expected += 1;
    if (issues.length === 0 && found.length === 0) {
      ok += 1;
      console.log(`  ok   ${label.padEnd(20)} ${path || "/"}  · ${h1.trim().slice(0, 40)}`);
    } else {
      console.log(`  FAIL ${label.padEnd(20)} ${path || "/"}  · ${[...issues, ...found].join(" | ")}`);
    }
  }
}

perViewport.push(
  `${String(width).padStart(4)}×${String(height).padEnd(4)} ${ok - okBefore}/${expected - expectedBefore}`,
);
await context.close();
}

console.log(`\n${ok}/${expected} screens clean · ${LOT_LABEL} · ${venues.join(", ")}`);
for (const line of perViewport) console.log(`  ${line}`);
await browser.close();
process.exit(ok === expected ? 0 : 1);
