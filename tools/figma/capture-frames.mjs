// What page 09 is drawn from.
//
//   BASE=http://localhost:3230 node tools/figma/capture-frames.mjs
//
// Page 09 of the Figma file is the seven Lot 1 screens. The five
// sections a partner types into — Connexion, Ma fiche, Disponibilités,
// Notifications and l'inscription — are not drawn by hand: every frame
// in them is this capture, replayed by `replay-page09.js`. The tree
// below is the *rendered* one — the boxes the browser actually painted,
// with their measured geometry, their fills and their type — so a frame
// in Figma cannot claim a field the screen does not have, and a field
// added to the screen reaches the frame by re-running one command.
//
// What it does not capture is the dashboard chrome: the sidebar and the
// topbar are Figma components on that page, placed as instances, and
// redrawing them per frame would be forty copies of one thing to keep in
// step. `chrome: "dashboard"` says « put the two instances here ».
//
// Output: `docs/lot1-figma-frames.json`.

import { chromiumOrExplain } from "../verify/browser.mjs";
import { clockLine, signIn } from "../verify/lot.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const chromium = await chromiumOrExplain();
const BASE = process.env.BASE ?? "http://localhost:3210";
const OUT = process.env.OUT ?? "docs/lot1-figma-frames.json";

/**
 * The frames this tool owns.
 *
 * `tab` clicks a FilterTabs button before the shot; `steps` walks the
 * onboarding. Everything else is a plain navigation.
 */
const FRAMES = [
  { key: "ma-fiche-identite", path: "/restaurant/ma-fiche", name: "Ma fiche", session: true },
  { key: "ma-fiche-details", path: "/restaurant/ma-fiche", name: "Ma fiche · Détails", session: true, tab: "Détails" },
  { key: "ma-fiche-horaires", path: "/restaurant/ma-fiche", name: "Ma fiche · Horaires", session: true, tab: "Horaires" },
  { key: "ma-fiche-photos", path: "/restaurant/ma-fiche", name: "Ma fiche · Photos", session: true, tab: "Photos" },
  { key: "ma-fiche-menu", path: "/restaurant/ma-fiche", name: "Ma fiche · Menu", session: true, tab: "Menu" },
  // The saved state, which page 09 has always carried beside the form:
  // a partner needs to know what « it worked » looks like. The edit is
  // a trailing space on the description, which the action trims — so
  // the frame shows the same words it showed before, and the bar shows
  // « Enregistré ».
  {
    key: "ma-fiche-enregistre",
    path: "/restaurant/ma-fiche",
    name: "Ma fiche · Détails · Enregistré",
    session: true,
    tab: "Détails",
    save: true,
  },
  // « Ma fiche · Horaires · Enregistré » is deliberately not here.
  //
  // It cannot be captured truthfully yet. Closing a service and pressing
  // Enregistrer writes `enabled = 0` to the database and then re-renders
  // the switch back on, so the screen shows one thing and the booking
  // rules another; a frame of that state would be a frame of a bug,
  // taken at whichever side of it the timing landed on. It made the same
  // screen disagree with itself across the two widths three captures
  // running. The frame comes back with the fix.
  // The other two editable screens of the lot. They were drawn by hand
  // on page 09 from a PNG, which is why a change to the field pattern
  // reached Ma fiche's frames by re-running one command and reached
  // theirs by somebody redrawing them. Every field the partner types
  // into now comes from the portal.
  { key: "disponibilites", path: "/restaurant/disponibilites", name: "Disponibilités", session: true },
  {
    key: "disponibilites-enregistre",
    path: "/restaurant/disponibilites",
    name: "Disponibilités · Enregistré",
    session: true,
    saveSpec: true,
  },
  { key: "notifications", path: "/restaurant/notifications", name: "Notifications", session: true },
  {
    key: "notifications-enregistre",
    path: "/restaurant/notifications",
    name: "Notifications · Enregistré",
    session: true,
    saveSpec: true,
  },
];

/**
 * Connexion, which has no session and no shell.
 *
 * Captured on its own because everything else here is signed in: the
 * sign-in screen is the one frame whose whole point is not being.
 */
const CONNEXION = { key: "connexion", path: "/login", name: "Connexion" };

/** The seven onboarding steps, walked once and shot on each. */
const ONBOARDING = [
  { key: "inscription-1", name: "Étape 1 · Vous" },
  { key: "inscription-2", name: "Étape 2 · Votre établissement" },
  { key: "inscription-3", name: "Étape 3 · Adresse" },
  { key: "inscription-4", name: "Étape 4 · Photos" },
  { key: "inscription-5", name: "Étape 5 · Ambiance et équipements" },
  { key: "inscription-6", name: "Étape 6 · Horaires" },
  { key: "inscription-7", name: "Étape 7 · C'est prêt" },
];

// ── The recorder ─────────────────────────────────────────────
//
// Runs in the page. Walks the DOM and keeps what was painted:
//
//   · nothing hidden, nothing of zero size, nothing `aria-hidden`;
//   · an element with a background, a border or a radius becomes a box;
//   · an element with neither becomes a group only when it holds more
//     than one thing — otherwise its child is lifted, because a frame
//     that wraps exactly one frame is a frame nobody asked for;
//   · a run of text becomes a text node with its size, weight, colour
//     and alignment, so the Figma layer can be bound to the page's own
//     text style rather than styled by hand.
const RECORD = String(function record(rootSelector, excludeSelectors) {
  const root = document.querySelector(rootSelector);
  if (!root) return null;
  const skip = excludeSelectors.length
    ? [...document.querySelectorAll(excludeSelectors.join(","))]
    : [];

  // Colour, through a canvas rather than a regular expression.
  //
  // Tailwind v4 writes an opacity modifier as `oklab(… / .4)`, and a
  // regular expression that only knows `rgb()` reads that as « no
  // colour ». Every switch that was off came back transparent, which is
  // a frame that says the venue has no Wi-Fi rather than one that says
  // the switch is off. The browser already knows how to resolve any
  // colour syntax it accepts; this asks it.
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const ink = probe.getContext("2d", { willReadFrequently: true });
  const seen = new Map();
  const rgb = (value) => {
    if (!value) return null;
    if (seen.has(value)) return seen.get(value);
    let out = null;
    try {
      ink.clearRect(0, 0, 1, 1);
      ink.fillStyle = "#000";
      ink.fillStyle = value;
      ink.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ink.getImageData(0, 0, 1, 1).data;
      out = a === 0 ? null : { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
    } catch {
      out = null;
    }
    seen.set(value, out);
    return out;
  };

  const base = root.getBoundingClientRect();
  const ox = base.left + window.scrollX;
  const oy = base.top + window.scrollY;
  const round = (n) => Math.round(n * 100) / 100;

  /** A name a designer can read, from whatever the DOM offers. */
  const nameOf = (el, text) => {
    const tag = el.tagName.toLowerCase();
    const label = el.getAttribute("aria-label");
    if (el.hasAttribute("data-book-row")) return "ligne";
    if (el.hasAttribute("data-card")) return "bloc";
    if (el.getAttribute("role") === "switch") return `interrupteur${label ? ` · ${label}` : ""}`;
    if (el.getAttribute("role") === "radio") return `choix${label ? ` · ${label}` : ""}`;
    if (el.getAttribute("role") === "tab" || /onglet/.test(el.className)) return "onglet";
    if (tag === "label") {
      const l = el.querySelector("span, div");
      return `champ · ${(l?.textContent ?? label ?? "").trim().slice(0, 40)}`;
    }
    if (tag === "input" || tag === "textarea" || tag === "select") return "boite";
    if (tag === "button" || tag === "a") return `bouton · ${(text || label || "").trim().slice(0, 32)}`;
    if (tag === "img") return "image";
    if (tag === "fieldset") return "groupe";
    if (tag === "main") return "main";
    if (tag === "h1" || tag === "h2" || tag === "h3") return (text || tag).slice(0, 40);
    return tag === "div" ? "groupe" : tag;
  };

  /** Joins adjacent text runs that share a line and a style, in place. */
  function merge(kids) {
    for (let i = kids.length - 2; i >= 0; i--) {
      const a = kids[i];
      const b = kids[i + 1];
      if (a.t !== "text" || b.t !== "text") continue;
      if (a.s !== b.s || a.fw !== b.fw || a.al !== b.al) continue;
      if (JSON.stringify(a.c) !== JSON.stringify(b.c)) continue;
      if (Math.abs(a.y - b.y) > 2) continue;
      const gap = b.x - (a.x + a.w);
      if (gap < -2 || gap > 12) continue;
      const space = a.sp?.[1] || b.sp?.[0] || gap > 2 ? " " : "";
      a.v = `${a.v}${space}${b.v}`;
      a.sp = [a.sp?.[0] ?? 0, b.sp?.[1] ?? 0];
      a.w = round(b.x + b.w - a.x);
      a.h = Math.max(a.h, b.h);
      kids.splice(i + 1, 1);
    }
  }

  function walk(el) {
    if (skip.some((s) => s === el || s.contains(el))) return null;
    if (el.getAttribute("aria-hidden") === "true") return null;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    // sr-only: a 1px clipped box carries text nobody sees.
    if (r.width <= 2 && r.height <= 2) return null;

    const box = {
      x: round(r.left + window.scrollX - ox),
      y: round(r.top + window.scrollY - oy),
      w: round(r.width),
      h: round(r.height),
    };

    const kids = [];
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const raw = node.textContent.replace(/\s+/g, " ");
        const v = raw.trim();
        if (!v) continue;
        // Measure the run itself, not its parent: a label and its hint
        // share a parent and sit on different lines.
        const range = document.createRange();
        range.selectNode(node);
        const tr = range.getBoundingClientRect();
        range.detach?.();
        if (tr.width < 1 || tr.height < 1) continue;
        kids.push({
          t: "text",
          v,
          // Whether the run had a space against its neighbour. « carte.pdf »
          // and « · » are two nodes with one space between them, and the
          // merge below has no other way to know it was there.
          sp: [raw.startsWith(" ") ? 1 : 0, raw.endsWith(" ") ? 1 : 0],
          x: round(tr.left + window.scrollX - ox),
          y: round(tr.top + window.scrollY - oy),
          w: round(tr.width),
          h: round(tr.height),
          s: Math.round(parseFloat(cs.fontSize)),
          fw: Number(cs.fontWeight) || 400,
          lh: cs.lineHeight === "normal" ? null : round(parseFloat(cs.lineHeight)),
          c: rgb(cs.color),
          al: cs.textAlign === "start" ? "left" : cs.textAlign,
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (el.tagName === "SELECT") continue;
        const child = walk(node);
        if (child) kids.push(child);
      }
    }

    // A field paints its own value, which is not a child text node. A
    // `<select>` paints the *label* of the chosen option, and its
    // options are children the browser does not lay out — so without
    // this the Ville field came back as an empty box.
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
      const chosen =
        el.tagName === "SELECT"
          ? (el.selectedOptions?.[0]?.textContent ?? "").trim()
          : "";
      const v = chosen || (el.value ?? "").trim() || (el.placeholder ?? "").trim();
      if (v) {
        const pad = parseFloat(cs.paddingLeft) || 0;
        const top = parseFloat(cs.paddingTop) || 0;
        kids.push({
          t: "text",
          v,
          sp: [0, 0],
          x: round(box.x + pad),
          y: round(box.y + top),
          w: round(r.width - pad * 2),
          h: Math.round(parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4),
          s: Math.round(parseFloat(cs.fontSize)),
          fw: Number(cs.fontWeight) || 400,
          lh: null,
          c: rgb(cs.color),
          al: "left",
        });
      }
    }

    const fill = rgb(cs.backgroundColor);
    const strokeColor = rgb(cs.borderTopColor);
    const strokeWidth = parseFloat(cs.borderTopWidth) || 0;
    const radius = Math.round(parseFloat(cs.borderTopLeftRadius) || 0);
    const painted = Boolean(fill) || (strokeWidth > 0 && Boolean(strokeColor)) || radius > 0;

    // Sibling runs on one line, in one style, are one sentence: the DOM
    // splits « carte.pdf · 1 Ko » into four text nodes because three of
    // them are in spans, and four layers is three more than a designer
    // wants to move.
    merge(kids);

    if (!kids.length && !painted) return null;
    // A transparent wrapper around one thing is not a layer.
    if (!painted && kids.length === 1) return kids[0];

    const text = kids.find((k) => k.t === "text")?.v ?? "";
    return {
      n: nameOf(el, text),
      ...box,
      ...(fill ? { fill } : {}),
      ...(painted && strokeWidth > 0 && strokeColor
        ? { stroke: strokeColor, sw: round(strokeWidth) }
        : {}),
      ...(radius ? { r: radius } : {}),
      kids,
    };
  }

  const tree = walk(root);
  return {
    tree,
    x: round(ox),
    y: round(oy),
    w: round(base.width),
    h: round(base.height),
    page: Math.round(document.documentElement.scrollHeight),
  };
});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

const capture = async (page, selector, exclude = []) => {
  // To the bottom first. A sticky Enregistrer bar is measured where it
  // currently sits, and at the top of a long form that is on top of the
  // card below it — an overlap the page never actually shows a reader
  // who has scrolled that far. At the bottom it rests in its own place.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  return page.evaluate(
    ([sel, ex, fn]) => new Function(`return (${fn})`)()(sel, ex),
    [selector, exclude, RECORD],
  );
};

const frames = [];

for (const width of [1440, 390]) {
  const phone = width === 390;
  const context = await browser.newContext({
    viewport: { width, height: phone ? 844 : 900 },
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  // ── Ma fiche, tab by tab ──
  const landed = await signIn(page, BASE, { venue: "Dar Zellij" });
  if (typeof landed !== "string") throw new Error(landed.refused);

  for (const frame of FRAMES) {
    await page.goto(`${BASE}${frame.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    if (frame.tab) {
      await page.locator(`button:text-is("${frame.tab}")`).first().click();
      await page.waitForTimeout(1200);
    }
    if (frame.saveSpec) {
      // A spec screen stages its edits in a draft store and the bar
      // counts them, so one switch is one « modification non
      // enregistrée » — which is the state this frame is for.
      await page.locator('button[role="switch"]').first().click();
      await page.waitForTimeout(400);
      await page.locator('button:has-text("Enregistrer")').first().click();
      await page.waitForTimeout(800);
    }
    if (frame.save) {
      // A chip, not a text field: toggling one is dirty the instant it
      // is pressed, and the value that comes back is the value that was
      // sent — where a trailing space in a text field is trimmed by the
      // action, so the form lands back on « À jour » with nothing saved.
      await page
        .locator('fieldset:has(> legend:text-is("Ambiance")) button[role="switch"]')
        .nth(4)
        .click();
      await page.waitForTimeout(300);
      await page.locator('button:has-text("Enregistrer")').first().click();
      // « Enregistré » is held for 2.4 s and then fades — `SaveBar` and
      // `useOptimisticForm` both say so. The frame has to be taken while
      // it is up.
      await page.waitForTimeout(800);
    }
    const shot = await capture(page, "main", ["aside"]);
    frames.push({
      key: `${frame.key}@${width}`,
      name: `${frame.path} · ${frame.name}${phone ? " · téléphone" : ""}`,
      width,
      chrome: "dashboard",
      // Measured, not assumed. Two of these screens give `main` the
      // full width beside the sidebar and two inset it by 32, so a
      // single hardcoded origin put one pair of frames 32px past the
      // right edge of the frame they sit in.
      at: { x: Math.round(shot.x), y: Math.round(shot.y) },
      root: shot.tree,
      height: Math.max(phone ? 844 : 900, Math.round(shot.h) + (phone ? 88 : 120)),
    });
    console.log(`  ${frame.key.padEnd(22)} ${width}px · ${Math.round(shot.h)}px de contenu`);
  }

  await context.close();

  // ── The onboarding, walked ──
  //
  // Its own context: /inscription belongs to somebody who has no
  // account yet, and a signed-in tab is sent to the dashboard instead.
  const guest = await browser.newContext({
    viewport: { width, height: phone ? 844 : 900 },
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const guestPage = await guest.newPage();

  // Connexion, before the onboarding spends the draft.
  await guestPage.goto(`${BASE}${CONNEXION.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await guestPage.waitForTimeout(1500);
  {
    const shot = await capture(guestPage, "main", []);
    frames.push({
      key: `${CONNEXION.key}@${width}`,
      name: `${CONNEXION.path} · ${CONNEXION.name}${phone ? " · téléphone" : ""}`,
      width,
      chrome: "none",
      at: { x: Math.round(shot.x), y: Math.round(shot.y) },
      root: shot.tree,
      height: Math.max(phone ? 844 : 900, Math.round(shot.y + shot.h) + 48),
    });
    console.log(`  ${CONNEXION.key.padEnd(22)} ${width}px · ${Math.round(shot.h)}px de contenu`);
  }

  await walkOnboarding(guestPage, width, phone);
  await guest.close();
}

/**
 * One pass through the seven steps, shot on each.
 *
 * A fresh account per width, because a draft is spent once it has made
 * its venue and a second width would reopen somebody else's answers.
 */
async function walkOnboarding(page, width, phone) {
  const stamp = `${Date.now().toString(36)}${width}`;
  const shot = async (step) => {
    // The density wrapper, which is the flow's own column: `body > div`
    // also matches the toast viewport, which is a zero-height div.
    const taken = await capture(page, '[data-density="host"]', []);
    frames.push({
      key: `${ONBOARDING[step - 1].key}@${width}`,
      name: `/inscription · ${ONBOARDING[step - 1].name}${phone ? " · téléphone" : ""}`,
      width,
      chrome: "none",
      at: { x: Math.round(taken.x), y: Math.round(taken.y) },
      root: taken.tree,
      height: Math.max(phone ? 844 : 900, Math.round(taken.y + taken.h) + 48),
    });
    console.log(`  inscription ${step}/7${" ".repeat(11)} ${width}px · ${Math.round(taken.h)}px`);
  };
  const next = async (label = "Continuer") => {
    await page.locator(`button:has-text("${label}")`).first().click();
    await page.waitForTimeout(1600);
  };

  await page.goto(`${BASE}/inscription`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByLabel("Votre nom").fill("Yassine Alami");
  await page.getByLabel("Adresse e-mail").fill(`figma+${stamp}@lyfe.ma`);
  await page.getByLabel("Téléphone", { exact: true }).fill("+212 6 61 22 33 44");
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
  await page.getByLabel("Confirmation du mot de passe").fill("motdepasse1");
  await shot(1);
  await next();

  await page.getByLabel("Nom de l'établissement").fill("Le Petit Riad");
  await page.getByLabel("Type de cuisine").fill("Cuisine marocaine de saison, grillades au feu de bois");
  await page
    .locator('[role="radiogroup"][aria-label="Fourchette de prix"] [role="radio"]')
    .nth(2)
    .click();
  await page.getByLabel("Ville").selectOption("Marrakech");
  await page.waitForTimeout(400);
  await shot(2);
  await next();

  await page.getByLabel("Quartier").fill("Médina");
  await page.getByLabel("Adresse", { exact: true }).fill("45 rue de la Kasbah, Médina");
  const map = page.locator(".leaflet-container");
  if (await map.count()) {
    await map.click({ position: { x: 140, y: 110 } });
    await page.waitForTimeout(600);
  }
  await shot(3);
  await next();

  await shot(4);
  await next();

  const chips = page.locator('fieldset:has(> legend:text-is("Ambiance")) button[role="switch"]');
  for (const i of [0, 2, 3]) {
    await chips.nth(i).click();
    await page.waitForTimeout(150);
  }
  const rows = page.locator('label:has([role="switch"])');
  for (const i of [0, 1, 3]) {
    await rows.nth(i).locator('[role="switch"]').click();
    await page.waitForTimeout(150);
  }
  await shot(5);
  await next();

  await page.locator('button:has-text("Appliquer lundi à tous les jours")').click();
  await page.waitForTimeout(500);
  await shot(6);
  await next();

  await shot(7);
}

await browser.close();

// ── Written small, on purpose ────────────────────────────────
//
// The tree above is the honest shape, and it is four times the size it
// needs to be: every node repeats the same nine keys, and every colour
// repeats the same six floats. This file is read by a Figma plugin
// script that has to be *typed out* to reach the file, so its size is
// not a storage question — it is whether the page can be rebuilt at all.
//
// Two tuples and a palette:
//
//   ["g", nom, x, y, w, h, fond, trait, épaisseur, rayon, [enfants]]
//   ["t", texte, x, y, w, h, corps, graisse, couleur, alignement]
//
// Indices point into `pal`, `-1` means none, and geometry is rounded to
// the pixel — a tenth of a pixel is not a thing a frame can show.

const palette = [];
const paletteIndex = (c) => {
  if (!c) return -1;
  const key = `${c.r},${c.g},${c.b},${c.a}`;
  let i = palette.findIndex((p) => p.k === key);
  if (i < 0) i = palette.push({ k: key, v: [c.r, c.g, c.b, c.a] }) - 1;
  return i;
};
const px = (n) => Math.round(n);
const ALIGN = ["left", "center", "right", "justify"];

function pack(node) {
  if (!node) return null;
  if (node.t === "text") {
    return [
      "t",
      node.v,
      px(node.x),
      px(node.y),
      px(node.w),
      px(node.h),
      node.s,
      node.fw,
      paletteIndex(node.c),
      Math.max(0, ALIGN.indexOf(node.al ?? "left")),
    ];
  }
  return [
    "g",
    node.n,
    px(node.x),
    px(node.y),
    px(node.w),
    px(node.h),
    paletteIndex(node.fill),
    paletteIndex(node.stroke),
    node.sw ? Math.max(1, Math.round(node.sw)) : 0,
    // `border-radius: 9999px` is how CSS says « pill ». Figma refuses a
    // radius larger than the shape, so it is capped here rather than in
    // the plugin, where the cap would have to be rediscovered.
    Math.min(node.r ?? 0, Math.floor(Math.min(px(node.w), px(node.h)) / 2)),
    (node.kids ?? []).map(pack).filter(Boolean),
  ];
}

const packed = frames.map((f) => ({
  k: f.key,
  n: f.name,
  w: f.width,
  h: Math.round(f.height),
  chrome: f.chrome,
  at: [Math.round(f.at.x), Math.round(f.at.y)],
  root: pack(f.root),
}));

mkdirSync("docs", { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      base: BASE,
      clock: clockLine(),
      pal: palette.map((p) => p.v),
      frames: packed,
    },
    null,
    0,
  )}\n`,
);
console.log(`\n${OUT} · ${frames.length} cadres · ${clockLine()}`);
