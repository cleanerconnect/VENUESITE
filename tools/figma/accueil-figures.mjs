// The Accueil's figures, recorded for Figma.
//
// Page 09's three dashboard frames — Accueil, Réservations, Check-in —
// are *adopted* rather than captured: they carry the file's prototype
// reactions on the buttons inside them, and a recreated button is a new
// node, which is a dead link. `tools/figma/capture-frames.mjs` therefore
// does not own them, and `present-page09.js` moves them without
// redrawing them.
//
// That held while the Accueil was a greeting card over three lists a
// designer had drawn by hand. It is now two rows of tiles and a bar
// chart, all of it counted off `reservations` — fourteen numbers and
// thirty bars that nobody should be transcribing into Figma by eye.
//
// So: this reads them out of the running portal, and
// `tools/figma/accueil-frames.js` draws them into the four Accueil
// frames, replacing the content column and leaving the frame, the
// chrome instances and the greeting card's buttons — the nodes the
// reactions hang on — exactly where they are.
//
//   BASE=http://localhost:3300 node tools/figma/accueil-figures.mjs
//
// Writes `docs/lot1-accueil-figures.json`. Run it against a portal on
// the same `LYFE_DEMO_CLOCK` as the capture, or the frames will carry a
// different day from the frames beside them.
//
// What it records, per tile: the label, the value as the screen prints
// it, the delta with its direction and its period, the hint if the tile
// shows one, and the lucide icon as Figma vector paths. For the chart it
// records the geometry recharts actually laid out — bars, gridlines and
// tick positions — rather than recomputing a bar chart from the series:
// the bars in the file are then the bars on the screen, to the pixel.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromiumOrExplain } from "../verify/browser.mjs";
import { signIn, ownerOf } from "../verify/lot.mjs";
import { shapeToPath, render } from "./svg-to-figma.mjs";

const BASE = process.env.BASE ?? "http://localhost:3210";
const OUT = process.env.OUT ?? "docs/lot1-accueil-figures.json";
const VENUE = process.env.VENUE ?? "rst_dar_zellij";
const EMAIL = process.env.EMAIL ?? ownerOf(VENUE);

// The tile icon is drawn at 16 px from a 24-unit lucide viewBox.
const ICON = 16;

const chromium = await chromiumOrExplain();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

/**
 * Everything the four frames need, read from one lane.
 *
 * Runs in the page. Keep it self-contained — it is serialised into the
 * browser, so it cannot close over anything in this file.
 */
const READ = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  // Both lanes are in the DOM at every width and the CSS hides one, so
  // every lookup here is « the visible one » rather than the first.
  const vis = (sel, root = document) => [...root.querySelectorAll(sel)].filter(visible);

  const card = (el) => el && el.closest("[data-card]");

  // ── the greeting ──
  const h1 = vis("h1")[0];
  const greetCard = card(h1);
  const emphasis = greetCard && greetCard.querySelector(".font-serif-italic");
  const greeting = {
    title: txt(h1),
    emphasis: txt(emphasis),
    subline: txt(greetCard && greetCard.querySelector("p")),
    actions: [...(greetCard ? greetCard.querySelectorAll("a") : [])].map((a) => ({
      label: txt(a),
      href: a.getAttribute("href"),
      // The filled button is the one painted in ink; the other is the
      // outlined twin beside it.
      primary: /bg-\[?var\(--color-ink|bg-ink|bg-surface-ink/.test(a.firstElementChild?.className ?? "")
        || getComputedStyle(a.firstElementChild ?? a).backgroundColor === "rgb(10, 31, 61)",
      icon: a.querySelector("svg.lucide")?.getAttribute("class") ?? null,
    })),
  };

  // ── the rows of tiles ──
  // A row is a heading and the grid under it; the grid's column count is
  // read off the rendered template rather than guessed from a class.
  const rows = [];
  for (const grid of vis("div.grid")) {
    if (!grid.querySelector(".text-eyebrow")) continue;
    // The heading belongs to the `group` block that wraps the grid; walk
    // up until a level has one, because the grid's own parent may be an
    // intermediate the renderer adds.
    let group = grid.parentElement;
    while (group && !group.querySelector("h2")) group = group.parentElement;
    const heading = txt(group && group.querySelector("h2"));
    const tiles = [];
    for (const eyebrow of grid.querySelectorAll(".text-eyebrow")) {
      const tile = card(eyebrow);
      if (!tile) continue;
      const delta = tile.querySelector(".text-meta.font-semibold, span.num.font-semibold")
        ?? [...tile.querySelectorAll("span")].find((s) => /vs /.test(s.textContent ?? ""));
      const period = delta && [...delta.querySelectorAll("span")].find((s) => /^·/.test(s.textContent.trim()));
      const figure = delta && delta.querySelector("span.inline-flex");
      const colour = delta ? getComputedStyle(delta).color : null;
      const link = tile.closest("a");
      const hintEl = !delta && [...tile.querySelectorAll("span.text-meta")].find((s) => visible(s));
      tiles.push({
        label: txt(eyebrow),
        value: txt(tile.querySelector("span.num")),
        icon: tile.querySelector("svg.lucide")?.getAttribute("class") ?? null,
        delta: delta
          ? {
              figure: txt(figure).replace(/\s*·.*$/, "").trim(),
              period: txt(period) ? txt(period).replace(/^·\s*/, "") : null,
              colour,
              // The arrow the chip draws: up, down or the flat dash.
              arrow: delta.querySelector("svg.lucide")?.getAttribute("class") ?? null,
            }
          : null,
        hint: hintEl ? txt(hintEl) : null,
        href: link ? link.getAttribute("href") : null,
      });
    }
    const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    rows.push({ heading, columns, tiles });
  }

  // ── the chart, as recharts laid it out ──
  const svg = vis(".recharts-surface")[0];
  const num = (el, a) => Number(el.getAttribute(a));
  const chartCard = card(svg);
  const bars = [...(svg ? svg.querySelectorAll(".recharts-bar-rectangle path") : [])].map((p) => {
    const b = p.getBoundingClientRect();
    const box = p.getBBox();
    return { x: box.x, y: box.y, w: box.width, h: box.height, screen: b.width };
  });
  const chart = svg
    ? {
        heading: txt(chartCard.querySelector("h2")),
        subheading: txt(chartCard.querySelector("p")),
        viewBox: svg.getAttribute("viewBox"),
        bars,
        radius: (() => {
          // The bar's rounded top, read off the first arc in its path.
          const d = svg.querySelector(".recharts-bar-rectangle path")?.getAttribute("d") ?? "";
          const m = /A\s*([\d.]+)/.exec(d);
          return m ? Number(m[1]) : 0;
        })(),
        fill: getComputedStyle(svg.querySelector(".recharts-bar-rectangle path")).fill,
        grid: [...svg.querySelectorAll(".recharts-cartesian-grid-horizontal line")].map((l) => ({
          x1: num(l, "x1"),
          x2: num(l, "x2"),
          y: num(l, "y1"),
          dash: getComputedStyle(l).strokeDasharray,
          stroke: getComputedStyle(l).stroke,
        })),
        yTicks: [...svg.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value")].map(
          (t) => ({ label: txt(t), x: num(t, "x"), y: num(t, "y"), anchor: t.getAttribute("text-anchor") }),
        ),
        xTicks: [...svg.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick-value")].map(
          (t) => ({ label: txt(t), x: num(t, "x"), y: num(t, "y"), anchor: t.getAttribute("text-anchor") }),
        ),
        tickSize: (() => {
          const t = svg.querySelector(".recharts-xAxis .recharts-cartesian-axis-tick-value tspan");
          return t ? Number(getComputedStyle(t).fontSize.replace("px", "")) : 11;
        })(),
        tickFill: (() => {
          const t = svg.querySelector(".recharts-xAxis .recharts-cartesian-axis-tick-value");
          return t ? getComputedStyle(t).fill : null;
        })(),
      }
    : null;

  // ── the icons, as the screen draws them ──
  const icons = {};
  for (const el of vis("[data-card]")) {
    for (const s of el.querySelectorAll("svg.lucide")) {
      const name = /lucide-([a-z-]+)/.exec(s.getAttribute("class") ?? "")?.[1];
      if (!name || icons[name]) continue;
      icons[name] = {
        viewBox: s.getAttribute("viewBox"),
        strokeWidth: Number(s.getAttribute("stroke-width")) || 2,
        shapes: [...s.children].map((c) => {
          const o = { tag: c.tagName };
          for (const a of ["d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points"]) {
            const v = c.getAttribute(a);
            if (v != null) o[a] = v;
          }
          return o;
        }),
      };
    }
  }

  return { greeting, rows, chart, icons };
};

const lanes = {};
let icons = {};
for (const [width, height] of [
  [1440, 1200],
  [390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
  });
  const page = await context.newPage();
  await signIn(page, BASE, { email: EMAIL, password: "demo" });
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  // The chart only exists once its container has been measured, so wait
  // for a bar rather than for a timeout.
  await page
    .waitForFunction(() => document.querySelectorAll(".recharts-bar-rectangle").length > 0, undefined, {
      timeout: 15000,
      polling: 200,
    })
    .catch(() => {
      throw new Error(
        "Le graphique n'a dessiné aucune barre : le portail rend un ResponsiveContainer vide.\n" +
          "Voir l'override `react-is` dans package.json — sans lui recharts ne reconnaît pas\n" +
          "les éléments du React 19 embarqué de Next, et tous les graphiques sont des boîtes vides.",
      );
    });
  // Every tile's number counts up from zero — `metric.animate` — so a
  // read taken as soon as the chart exists catches the tiles mid-flight.
  // The first run of this tool recorded « 21 réservations » and « 58 % »
  // on their way to 35 and 97. Wait for two identical readings.
  await page.waitForFunction(
    () => {
      const now = [...document.querySelectorAll("span.num")].map((s) => s.textContent).join("|");
      const settled = window.__lyfeLast === now;
      window.__lyfeLast = now;
      return settled && now.length > 0;
    },
    undefined,
    { timeout: 20000, polling: 400 },
  );
  const read = await page.evaluate(READ);
  icons = { ...read.icons, ...icons };
  lanes[String(width)] = { greeting: read.greeting, rows: read.rows, chart: read.chart };
  await context.close();
}
await browser.close();

// The two lanes carry the same words and the same numbers — only the
// column counts and the chart's geometry differ — so the figures are
// written once and the lane-specific parts beside them.
const desktop = lanes["1440"];
const phone = lanes["390"];

const iconName = (cls) => (cls ? /lucide-([a-z-]+)/.exec(cls)?.[1] ?? null : null);
const tidy = (tiles) =>
  tiles.map((t) => ({
    label: t.label,
    value: t.value,
    icon: iconName(t.icon),
    delta: t.delta
      ? {
          figure: t.delta.figure,
          period: t.delta.period,
          colour: t.delta.colour,
          arrow: iconName(t.delta.arrow),
        }
      : null,
    hint: t.hint,
    href: t.href,
  }));

const payload = {
  capturedAt: new Date().toISOString(),
  clock: process.env.LYFE_DEMO_CLOCK ?? null,
  base: BASE,
  venue: VENUE,
  account: EMAIL,
  greeting: {
    ...desktop.greeting,
    actions: desktop.greeting.actions.map((a) => ({ ...a, icon: iconName(a.icon) })),
  },
  rows: desktop.rows.map((row, i) => ({
    heading: row.heading,
    columns: { desktop: row.columns, phone: phone.rows[i]?.columns ?? 2 },
    tiles: tidy(row.tiles),
  })),
  chart: {
    heading: desktop.chart.heading,
    subheading: desktop.chart.subheading,
    lanes: { desktop: desktop.chart, phone: phone.chart },
  },
  icons: Object.fromEntries(
    Object.entries(icons).map(([name, icon]) => {
      const [, , vw] = icon.viewBox.split(/\s+/).map(Number);
      const scale = ICON / vw;
      return [
        name,
        {
          size: ICON,
          strokeWeight: Math.round(icon.strokeWidth * scale * 100) / 100,
          paths: icon.shapes.map((s) => render(shapeToPath(s), scale)),
        },
      ];
    }),
  ),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(payload, null, 1)}\n`);

const tiles = payload.rows.reduce((n, r) => n + r.tiles.length, 0);
console.log(
  `${OUT} · ${payload.rows.length} rangées · ${tiles} tuiles · ` +
    `${payload.chart.lanes.desktop.bars.length} barres · ${Object.keys(payload.icons).length} icônes`,
);
for (const row of payload.rows) {
  console.log(`  ${row.heading}`);
  for (const t of row.tiles) {
    console.log(
      `    ${t.label.padEnd(28)} ${String(t.value).padStart(7)}  ` +
        `${t.delta ? `${t.delta.figure} ${t.delta.period}` : t.hint ?? ""}`,
    );
  }
}
