// The design audit's tape measure.
//
//   BASE=http://localhost:3230 node tools/verify/_design-measure.mjs
//   W=390 H=844 node tools/verify/_design-measure.mjs
//
// Writes `scratch/design/<width>/<screen>.json` and a flat findings
// list. It measures the box model rather than the stylesheet: what a
// gap is *declared* as and what it *renders* as diverge the moment a
// margin collapses or a flex `gap` meets a child's own padding, and the
// owner sees the render.
//
// Everything here is measurement. No assertion, no exit code — the
// judgement lives in `docs/DESIGN_AUDIT.md`, where it can carry a
// reason.

import { chromiumOrExplain } from "./browser.mjs";
import { LOT_LABEL, clockLine, signIn } from "./lot.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const OUT = process.env.OUT ?? `scratch/design/${width}`;

// The eight screens of the brief, in the order it names them for the
// work — Réservations first, because it is the screen the owner is on.
const SCREENS = [
  ["reservations", "/restaurant/reservations", "Réservations"],
  ["accueil", "/restaurant", "Accueil"],
  ["check-in", "/restaurant/check-in", "Check-in"],
  ["connexion", "/login", "Connexion"],
  ["inscription", "/inscription", "Inscription"],
  ["disponibilites", "/restaurant/disponibilites", "Disponibilités"],
  ["ma-fiche", "/restaurant/ma-fiche", "Ma fiche"],
  ["notifications", "/restaurant/notifications", "Notifications"],
];

const NEEDS_SESSION = new Set([
  "reservations",
  "accueil",
  "check-in",
  "disponibilites",
  "ma-fiche",
  "notifications",
]);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({
  viewport: { width, height },
  locale: "fr-FR",
  timezoneId: "Africa/Casablanca",
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const landed = await signIn(page, BASE, { venue: "Dar Zellij" });
if (typeof landed !== "string") {
  console.error(`connexion refusée : ${landed.refused}`);
  process.exit(1);
}

// ── What runs in the page ─────────────────────────────────────
//
// One function, because a dozen round trips over CDP for the same tree
// is a dozen chances for the layout to have moved under us.
const PROBE = () => {
  const SCALE = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64];
  const px = (v) => Math.round(parseFloat(v) || 0);

  const luminance = (r, g, b) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // Tailwind v4 emits `oklab(... / .4)` for an opacity modifier, so a
  // parser that only knows `rgb()` reads a violet button as
  // transparent and then reports white text on white. Ask the browser
  // to convert instead of reimplementing a colour space.
  // Painting is the only conversion that cannot be argued with: give
  // the value to a canvas and read the pixel back. `getComputedStyle`
  // hands `oklab()` straight through, so a parser that only knows
  // `rgb()` read a violet button as transparent and then reported
  // white text on white.
  const asRgb = (() => {
    const ctx = document.createElement("canvas").getContext("2d");
    return (c) => {
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = String(c);
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } catch {
        return String(c);
      }
    };
  })();
  const parse = (c) => {
    let str = String(c);
    if (!/^rgba?\(/.test(str)) str = asRgb(str);
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,/\s]+/).filter(Boolean).map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => {
    // Flatten a translucent foreground onto its background, which is
    // what the eye gets and what the ratio has to be computed on.
    const a = fg.a;
    return {
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
      a: 1,
    };
  };
  const ratio = (a, b) => {
    const la = luminance(a.r, a.g, a.b);
    const lb = luminance(b.r, b.g, b.b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  /** The first opaque background behind an element. */
  const backdrop = (el) => {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) {
        acc = acc ? over(acc, bg) : bg;
        if (acc.a >= 1) return acc;
      }
      node = node.parentElement;
    }
    const html = parse(getComputedStyle(document.body).backgroundColor);
    const white = { r: 255, g: 255, b: 255, a: 1 };
    return acc ? over(acc, html?.a ? html : white) : html?.a ? html : white;
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    // A pixel wide and a pixel tall is how `sr-only` hides a label for
    // the screen reader while keeping it in the tree. It has no
    // typography and no rhythm — the browser's defaults apply to it
    // because nothing ever paints it — so counting its 16px/400 as a
    // step of the scale was the measurement inventing a finding.
    if (r.width <= 2 || r.height <= 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };

  const label = (el) => {
    const cls = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
    const short = cls.slice(0, 3).join(".");
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${short ? "." + short : ""}${text ? ` “${text}”` : ""}`;
  };

  // ── 1 · type ────────────────────────────────────────────────
  const type = new Map();
  const paragraphs = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    // Only nodes that render their own text, so a wrapper does not
    // count its children's size as a third step in the scale.
    const own = [...el.childNodes].some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0,
    );
    if (!own) continue;
    const s = getComputedStyle(el);
    const size = px(s.fontSize);
    const lh = s.lineHeight === "normal" ? "normal" : (parseFloat(s.lineHeight) / size).toFixed(2);
    const key = [size, s.fontWeight, lh, s.letterSpacing, s.textTransform].join("|");
    const entry = type.get(key) ?? {
      size,
      weight: Number(s.fontWeight),
      lineHeight: lh,
      letterSpacing: s.letterSpacing,
      transform: s.textTransform,
      count: 0,
      samples: [],
    };
    entry.count += 1;
    if (entry.samples.length < 3) {
      entry.samples.push((el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 44));
    }
    type.set(key, entry);

    // Line length: characters in the longest line of a wrapped block.
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length > 60) {
      const r = el.getBoundingClientRect();
      // Rough but honest: characters per line from the rendered width
      // and the text's own average character width.
      const lines = Math.max(1, Math.round(r.height / (parseFloat(s.lineHeight) || size * 1.5)));
      paragraphs.push({
        chars: text.length,
        lines,
        perLine: Math.round(text.length / lines),
        width: Math.round(r.width),
        size,
        sample: text.slice(0, 60),
      });
    }
  }

  // ── 2 · contrast ────────────────────────────────────────────
  const contrast = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0,
    );
    if (!own) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg) continue;
    const bg = backdrop(el);
    const flat = fg.a < 1 ? over(fg, bg) : fg;
    const size = px(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    // Text is judged at 4.5, large text and controls at 3 — and a
    // disabled control at 3 too, which is the floor section 4 sets for
    // it: a disabled button has to read as unavailable, and holding it
    // to body contrast would be asking it not to.
    const off = el.closest("[disabled], [aria-disabled=\"true\"]") !== null;
    const need = large || off ? 3 : 4.5;
    // Any ancestor's `opacity` fades the text and its background
    // together toward whatever is behind them.
    let fade = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const o = parseFloat(getComputedStyle(n).opacity);
      if (!Number.isNaN(o) && o < 1) fade *= o;
    }
    const seenFg = fade < 1 ? over({ ...flat, a: fade }, bg) : flat;
    const got = ratio(seenFg, bg);
    if (got < need) {
      contrast.push({
        el: label(el),
        color: s.color,
        background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        size,
        weight: Number(s.fontWeight),
        need,
        opacity: Number(fade.toFixed(2)),
        got: Number(got.toFixed(2)),
      });
    }
  }

  // ── 3 · controls ────────────────────────────────────────────
  const controls = [];
  const SEL = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"]';
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el)) continue;
    // A checkbox's target is its label. A 44px checkbox is a checkbox
    // nobody recognises, so the box stays 16 and the label carries the
    // touch minimum — and the ruler has to measure what the thumb hits,
    // not what the eye sees.
    const hit = el.closest("label") ?? el;
    const r = hit.getBoundingClientRect();
    const s = getComputedStyle(el);
    controls.push({
      el: label(el),
      role: el.getAttribute("role") ?? el.tagName.toLowerCase(),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fontSize: px(s.fontSize),
      weight: Number(s.fontWeight),
      radius: s.borderRadius,
      border: `${px(s.borderTopWidth)}px ${s.borderTopColor}`,
      bg: s.backgroundColor,
      top: Math.round(r.top),
      left: Math.round(r.left),
      disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true",
    });
  }

  // ── 4 · vertical rhythm ─────────────────────────────────────
  //
  // Bounding boxes, consecutive siblings, inside every container that
  // stacks more than one visible child. The gap is what the eye sees:
  // the distance from one box's bottom to the next box's top.
  const gaps = [];
  const containers = [...document.querySelectorAll("body *")].filter((el) => {
    if (!visible(el)) return false;
    // An SVG's internal geometry is not layout: a logo's two rects sit
    // 3px apart because that is the drawing, and reporting it as an
    // off-scale gap is the measurement lying about the design.
    if (el.closest("svg")) return false;
    const kids = [...el.children].filter(visible);
    return kids.length >= 2;
  });
  // A child taken out of the flow — an active-tab underline, a badge
  // pinned to a corner — has no gap with the sibling above it. Its
  // distance is a coordinate, not rhythm, so it leaves the walk.
  const inFlow = (el) => {
    const pos = getComputedStyle(el).position;
    return pos !== "absolute" && pos !== "fixed";
  };
  for (const el of containers) {
    const kids = [...el.children].filter((k) => visible(k) && inFlow(k));
    if (kids.length < 2) continue;
    const rects = kids.map((k) => k.getBoundingClientRect());
    // Stacked only: every child starts below the previous one's top.
    const stacked = rects.every((r, i) => i === 0 || r.top >= rects[i - 1].top);
    if (!stacked) continue;
    for (let i = 1; i < rects.length; i += 1) {
      const gap = Math.round(rects[i].top - rects[i - 1].bottom);
      if (gap < -2 || gap > 200) continue;
      gaps.push({
        container: label(el),
        from: label(kids[i - 1]),
        to: label(kids[i]),
        gap,
        onScale: SCALE.includes(Math.abs(gap)),
      });
    }
  }

  // ── 5 · layout ──────────────────────────────────────────────
  const main = document.querySelector("main") ?? document.body;
  const mainRect = main.getBoundingClientRect();
  const mainStyle = getComputedStyle(main);
  // Left edges of every visible block with a box, to count the vertical
  // lines a screen sits on.
  const edges = new Map();
  for (const el of main.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 12) continue;
    const x = Math.round(r.left);
    edges.set(x, (edges.get(x) ?? 0) + 1);
  }
  // Cards: what the Card component says is one.
  //
  // This used to guess — a rounded box with a border or a shadow, wider
  // than 200 and taller than 60 — and the guess counted a tinted block
  // and a bordered field group as cards while missing a borderless one.
  // "Twenty-seven cards on Réservations" was partly the ruler.
  const cards = [];
  for (const el of main.querySelectorAll("[data-card]")) {
    if (!visible(el)) continue;
    {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const lists = el.querySelectorAll("ul, ol, table").length;
      const fields = el.querySelectorAll("input, select, textarea").length;
      cards.push({
        el: label(el),
        variant: el.getAttribute("data-card"),
        size: el.getAttribute("data-card-size"),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: s.borderTopLeftRadius,
        padding: `${px(s.paddingTop)}/${px(s.paddingRight)}/${px(s.paddingBottom)}/${px(s.paddingLeft)}`,
        lists,
        fields,
        children: [...el.children].filter(visible).length,
      });
    }
  }

  return {
    url: location.pathname,
    scroll: { width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth },
    main: {
      width: Math.round(mainRect.width),
      maxWidth: mainStyle.maxWidth,
      padding: `${px(mainStyle.paddingTop)}/${px(mainStyle.paddingRight)}/${px(mainStyle.paddingBottom)}/${px(mainStyle.paddingLeft)}`,
      left: Math.round(mainRect.left),
    },
    type: [...type.values()].sort((a, b) => b.count - a.count),
    paragraphs: paragraphs.sort((a, b) => b.perLine - a.perLine).slice(0, 6),
    contrast,
    controls,
    gaps,
    edges: [...edges.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    cards,
    // Every visible string, with the step it is painted at.
    //
    // Figma page 09 is built from this portal rather than drawn beside
    // it, so when the scale moves the page has to move with it — and
    // the only trustworthy way to retype 2 400 Figma text layers is to
    // look each string up in what the browser actually renders. A
    // mapping guessed from « 15px probably becomes 16 » would retype
    // the hour band and the guest's name the same way.
    strings: (() => {
      const px = (v) => Math.round(parseFloat(v) || 0);
      const out = {};
      for (const el of document.querySelectorAll("body *")) {
        if (!visible(el)) continue;
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.replace(/\s+/g, " ").trim())
          .join(" ")
          .trim();
        if (!own) continue;
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight) / px(cs.fontSize);
        const rec = {
          size: px(cs.fontSize),
          weight: Number(cs.fontWeight),
          lineHeight: Number.isFinite(lh) ? Number(lh.toFixed(2)) : null,
          transform: cs.textTransform,
          tracking: cs.letterSpacing === "normal" ? 0 : Number(parseFloat(cs.letterSpacing).toFixed(2)),
        };
        // First writer wins: the same string in two places at two steps
        // is itself a finding, and silently keeping the last would hide
        // it. Collisions are counted instead.
        const prev = out[own];
        if (!prev) { out[own] = { ...rec, n: 1 }; continue; }
        prev.n += 1;
        if (prev.size !== rec.size || prev.weight !== rec.weight) prev.conflict = true;
      }
      return out;
    })(),
    words: (document.querySelector("main")?.innerText ?? "").split(/\s+/).filter(Boolean).length,
    // The forty-word rule counts what the screen says, not what it
    // holds: a day of reservations, a week of opening hours and the
    // options of a `<select>` are the owner's data, and cutting them is
    // not a copy decision. So prose only — headings, subheadings,
    // paragraphs, hints, empty states — and the two densities' lanes
    // are deduplicated, because a string rendered twice in a hidden
    // lane is still one string the owner reads once.
    prose: (() => {
      const main = document.querySelector("main");
      if (!main) return { words: 0, strings: [] };
      // Prose is what explains; a heading and a control label *name*.
      // Cutting "Capacité" off a field does not shorten a screen, it
      // breaks it — so the forty words are the subtitles, the hints,
      // the empty-state bodies and the notes, and nothing else. This is
      // the audit's restatement of section 6, written here so the
      // number in the report and the rule cannot drift apart.
      // `[data-prose]` and nothing else. Counting every `<p>` still
      // swept in the data a paragraph tag happens to hold — "4 couverts
      // · Patio" is a row's detail, not a sentence somebody wrote — so
      // the primitives that render an authored string say so, and the
      // count is of those. A screen whose number looks too low is a
      // screen with an unmarked string, which is a finding of its own.
      const SEL = "[data-prose]";
      const seen = new Set();
      for (const el of main.querySelectorAll(SEL)) {
        if (!visible(el)) continue;
        // Only its own text: a <p> wrapping a <span> of data would
        // otherwise drag the data in with it.
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.replace(/\s+/g, " ").trim())
          .join(" ")
          .trim();
        if (own.length > 1) seen.add(own);
      }
      const strings = [...seen];
      return {
        words: strings.join(" ").split(/\s+/).filter(Boolean).length,
        strings,
      };
    })(),
  };
};

const report = {};
for (const [slug, path, name] of SCREENS) {
  if (NEEDS_SESSION.has(slug)) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  } else {
    // The public screens want no session at all, or Connexion bounces.
    const fresh = await browser.newContext({
      viewport: { width, height },
      locale: "fr-FR",
      timezoneId: "Africa/Casablanca",
    });
    const p2 = await fresh.newPage();
    await p2.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await p2.waitForTimeout(1500);
    report[slug] = { name, ...(await p2.evaluate(PROBE)) };
    await fresh.close();
    console.log(`  ${name.padEnd(16)} ${report[slug].type.length} pas de type · ${report[slug].gaps.filter((g) => !g.onScale).length} écarts hors gamme · ${report[slug].contrast.length} contrastes faibles`);
    continue;
  }
  await page.waitForTimeout(1600);
  report[slug] = { name, ...(await page.evaluate(PROBE)) };
  console.log(
    `  ${name.padEnd(16)} ${report[slug].type.length} pas de type · ` +
      `${report[slug].gaps.filter((g) => !g.onScale).length} écarts hors gamme · ` +
      `${report[slug].contrast.length} contrastes faibles`,
  );
}

writeFileSync(`${OUT}/measures.json`, JSON.stringify(report, null, 2));
console.log(`\n${OUT}/measures.json · ${width}×${height} · ${LOT_LABEL} · ${clockLine()}`);
await browser.close();
