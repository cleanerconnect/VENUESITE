// The book, line by line, in the order the screen shows them.
//
//   BASE=… W=1440 node tools/verify/_book-rows.mjs > scratch/design/book.json
//
// `extract.mjs` records a screen's rows for the Figma export, but it
// reads every `h4` in the block — and the spec renders the book twice,
// once per surface, with the lane this width does not use hidden. The
// order that comes back is therefore neither lane's. A Figma frame is
// built in the order the eye reads, so this dumps the visible lane in
// document order, with each line's parts named as the component names
// them: the lead, the guest, the state, the context, the note.

import { chromiumOrExplain } from "./browser.mjs";
import { signIn } from "./lot.mjs";

const chromium = await chromiumOrExplain();
const BASE = process.env.BASE ?? "http://localhost:3230";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const PATH = process.env.PATH_ ?? "/restaurant/reservations";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
  reducedMotion: "reduce",
});
const page = await context.newPage();
const landed = await signIn(page, BASE, { venue: "Dar Zellij" });
if (typeof landed !== "string") throw new Error(landed.refused);
await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1600);

const rows = await page.evaluate(() => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const out = [];
  for (const el of document.querySelectorAll("main [data-book-row]")) {
    const r = el.getBoundingClientRect();
    if (r.height <= 1) continue;
    const leads = [...el.querySelectorAll('[class*="text-host-lead"]')]
      .map((x) => clean(x.textContent))
      .filter((t) => t && t !== "·");
    const stateEl = [...el.querySelectorAll("span")].find(
      (x) =>
        /text-(success|warning|danger|ink-soft)\b/.test(x.className || "") &&
        /font-semibold/.test(x.className || ""),
    );
    const tone = stateEl
      ? (/text-(success|warning|danger|ink-soft)\b/.exec(stateEl.className) || [])[1]
      : null;
    out.push({
      time: leads[0] ?? null,
      party: leads[1] ?? null,
      name: clean(el.querySelector("h4")?.textContent),
      state: clean(stateEl?.textContent) || null,
      tone,
      detail: clean(el.querySelector('[class*="text-host-detail"]')?.textContent) || null,
      note: clean(el.querySelector('[class*="border-violet"] span')?.textContent) || null,
      actions: [...el.querySelectorAll("button")]
        .map((b) => clean(b.textContent))
        .filter((t) => t && t.length < 20),
      height: Math.round(r.height),
    });
  }
  return out;
});
console.log(JSON.stringify(rows, null, 1));
await browser.close();
