// `present-page09.js` run in node, against a Figma that is not there.
//
//   node tools/figma/present-dry-run.mjs
//
// Same reasoning as `replay-dry-run.mjs`, and the same stub grown to
// cover what the presentation needs: components and instances, sections
// it creates itself, vectors, and the stamps it uses to recognise its
// own work on the next run. What this proves is the bookkeeping — every
// manifest reference finds a frame, nothing is laid out on top of
// anything else, the gutters are the ones the brief asks for, no
// prototype reaction is left pointing at a node that no longer exists,
// and a second run produces the same page rather than two of it.
//
// What it cannot prove is what the page looks like. That is what
// `get_screenshot` is for, afterwards.

import { readFileSync } from "node:fs";

const SRC = "tools/figma/present-page09.js";
const CAPTURE = process.env.OUT ?? "docs/lot1-figma-frames.json";

const src = readFileSync(SRC, "utf8");
const doc = JSON.parse(readFileSync(CAPTURE, "utf8"));

let counter = 0;
const node = (type) => {
  const self = {
    type,
    id: `stub:${counter++}`,
    name: "",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    children: [],
    parent: null,
    removed: false,
    fills: [],
    strokes: [],
    reactions: [],
    characters: "",
    textAutoResize: "NONE",
    vectorPaths: [],
    hyperlink: null,
    constraints: null,
    _shared: {},
    resize(w, h) {
      this.width = w;
      this.height = h;
    },
    resizeWithoutConstraints(w, h) {
      this.width = w;
      this.height = h;
    },
    appendChild(kid) {
      if (kid.parent) kid.parent.children.splice(kid.parent.children.indexOf(kid), 1);
      kid.parent = this;
      this.children.push(kid);
    },
    insertChild(i, kid) {
      if (kid.parent) kid.parent.children.splice(kid.parent.children.indexOf(kid), 1);
      kid.parent = this;
      this.children.splice(i, 0, kid);
    },
    remove() {
      this.removed = true;
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
    },
    clone() {
      const copy = node(this.type);
      copy.name = this.name;
      copy.width = this.width;
      copy.height = this.height;
      copy._shared = { ...this._shared };
      return copy;
    },
    createInstance() {
      const inst = node("INSTANCE");
      inst.name = this.name;
      inst.width = this.width;
      inst.height = this.height;
      const deep = (from, to) => {
        for (const kid of from.children) {
          const copy = node(kid.type);
          copy.name = kid.name;
          copy.characters = kid.characters;
          copy.width = kid.width;
          copy.height = kid.height;
          to.appendChild(copy);
          deep(kid, copy);
        }
      };
      deep(this, inst);
      return inst;
    },
    setSharedPluginData(ns, key, value) {
      this._shared[`${ns}/${key}`] = value;
    },
    getSharedPluginData(ns, key) {
      return this._shared[`${ns}/${key}`] ?? "";
    },
    async setReactionsAsync(r) {
      this.reactions = r;
    },
    findAll(match) {
      const out = [];
      const walk = (p) => {
        for (const kid of p.children) {
          if (!match || match(kid)) out.push(kid);
          walk(kid);
        }
      };
      walk(this);
      return out;
    },
    findOne(match) {
      return this.findAll(match)[0] ?? null;
    },
    async loadAsync() {},
  };
  return self;
};

const byId = new Map();
const register = (n) => {
  byId.set(n.id, n);
  return n;
};

// ── A file shaped like this one ──────────────────────────────
const page02 = node("PAGE");
page02.name = "02 Composants";
const page09 = node("PAGE");
page09.name = "09 Dashboard basique · Dar Zellij";

/** The dashboard chrome, as instances the redraw has to move across. */
const CHROME = {
  1440: [
    ["Chrome / Sidebar · Dashboard basique", 0, 0, 260],
    ["Chrome / Topbar", 260, 0, 1180],
  ],
  390: [["Chrome / BottomTabs · Dashboard basique", 0, -76, 390]],
};

/** The frames the capture does not own, with the prototype on them. */
const HANDMADE = [
  ["/restaurant · Accueil", 1440, 1508],
  ["/restaurant · Accueil · en attente de validation", 1440, 1612],
  ["/restaurant · Accueil · téléphone", 390, 1929],
  ["/plus · Plus · téléphone", 390, 844],
  ["/restaurant · Accueil · en attente de validation · téléphone", 390, 2049],
  ["/restaurant/reservations · Réservations", 1440, 1315],
  ["/restaurant/reservations · Réservations · Déjeuner", 1440, 1315],
  ["/restaurant/reservations · Réservations · jour précédent", 1440, 1315],
  ["/restaurant/reservations · Réservations · jour précédent · Déjeuner", 1440, 1315],
  ["/restaurant/reservations · Réservations · jour suivant", 1440, 1315],
  ["/restaurant/reservations · Réservations · jour suivant · Déjeuner", 1440, 1315],
  ["Overlay · Réservation confirmée · Nabil Cherkaoui", 1440, 900],
  ["Overlay · Décaler la réservation · Nabil Cherkaoui", 1440, 900],
  ["/restaurant/reservations · Réservations · téléphone", 390, 1730],
  ["Overlay · Réservation confirmée · Nabil Cherkaoui · téléphone", 390, 844],
  ["Overlay · Décaler la réservation · Nabil Cherkaoui · téléphone", 390, 844],
  ["/restaurant/check-in · Check-in", 1440, 1024],
  ["Overlay · Caméra · Scanner le code", 1440, 900],
  ["/restaurant/check-in · Check-in · téléphone", 390, 1345],
  ["Overlay · Caméra · Scanner le code · téléphone", 390, 844],
];

const scratch = node("SECTION");
scratch.name = "atelier";
page09.appendChild(scratch);
register(scratch);
const handmade = [];
for (const [name, width, height] of HANDMADE) {
  const frame = node("FRAME");
  frame.name = name;
  frame.width = width;
  frame.height = height;
  scratch.appendChild(frame);
  register(frame);
  handmade.push(frame);
}
// One reaction per hand-made frame, on a button inside it, so the run
// can be checked for links it broke.
for (const frame of handmade) {
  const button = node("FRAME");
  button.name = "Button";
  frame.appendChild(button);
  register(button);
  button.reactions = [
    { trigger: { type: "ON_CLICK" }, actions: [{ type: "NODE", destinationId: handmade[0].id }] },
  ];
}

// The frames a previous replay left stamped, so the redraw adopts them.
for (const f of doc.frames) {
  const width = Number(f.k.slice(f.k.lastIndexOf("@") + 1));
  const frame = node("FRAME");
  frame.name = f.n;
  frame.width = width;
  frame.height = f.h;
  frame.setSharedPluginData("lyfe.page09", "frame", f.k);
  scratch.appendChild(frame);
  register(frame);
  if (f.chrome === "dashboard") {
    for (const [cname, cx, cy, cw] of CHROME[width]) {
      const piece = node("INSTANCE");
      piece.name = cname;
      piece.x = cx;
      piece.y = cy < 0 ? f.h + cy : cy;
      piece.width = cw;
      piece.height = /Sidebar/.test(cname) ? f.h : 76;
      frame.appendChild(piece);
      register(piece);
    }
  }
}

const figma = {
  root: { children: [page02, page09] },
  currentPage: page09,
  async setCurrentPageAsync(p) {
    this.currentPage = p;
  },
  async loadFontAsync() {},
  async getNodeByIdAsync(id) {
    const found = byId.get(id);
    return found && !found.removed ? found : null;
  },
  createFrame: () => register(node("FRAME")),
  createText: () => register(node("TEXT")),
  createSection: () => register(node("SECTION")),
  createComponent: () => register(node("COMPONENT")),
  createRectangle: () => register(node("RECTANGLE")),
  createEllipse: () => register(node("ELLIPSE")),
  createVector: () => register(node("VECTOR")),
  base64Decode: () => new Uint8Array(),
};

// The capture, on the page, the way the transfer leaves it.
const rawDoc = JSON.stringify(doc);
const CH = 26000;
const pieces = Math.ceil(rawDoc.length / CH);
for (let i = 0; i < pieces; i++) {
  page09.setSharedPluginData("lyfe.page09", `data${i}`, rawDoc.slice(i * CH, (i + 1) * CH));
}
page09.setSharedPluginData("lyfe.page09", "chunks", String(pieces));

// ── Run the real file ────────────────────────────────────────
const body = src.replace(/^\/\/.*$/gm, "");
const run = new Function(
  "figma",
  `${body}\nreturn { ensureKit, presentPage09, GAP, SECTION_GAP, PAD, SCREENS };`,
);
const api = run(figma);

const made = await api.ensureKit(figma);
const first = await api.presentPage09(figma, { version: "v1" });
const second = await api.presentPage09(figma, { version: "v1" });

// ── What has to be true ──────────────────────────────────────
const problems = [];
const say = (ok, line) => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${line}`);
  if (!ok) problems.push(line);
};

console.log(`\nRépétition de la présentation · ${doc.frames.length} cadres capturés\n`);
say(made.made.length === 4, `les quatre composants sont créés · ${made.made.join(", ")}`);
say(second.missing.length === 0, `toutes les références trouvent un cadre · ${second.missing.join(" | ") || "aucune manquante"}`);
say(second.dangling === 0, `aucune réaction ne pointe dans le vide · ${second.reactions} réactions, ${second.dangling} orphelines`);
say(
  second.reactions === first.reactions && second.reactions >= handmade.length,
  `les réactions survivent aux deux passages · ${first.reactions} puis ${second.reactions}`,
);

// One page, not two: a second run must not double the sections.
const sections = page09.children.filter((n) => n.type === "SECTION" && n.name !== "atelier");
say(sections.length === api.SCREENS.length, `${sections.length} sections pour ${api.SCREENS.length} écrans`);

// Gutters, and nothing on top of anything.
let overlaps = 0;
let badGap = [];
for (const outer of sections) {
  for (const inner of outer.children.filter((n) => n.type === "SECTION")) {
    const kids = inner.children
      .filter((n) => n.getSharedPluginData("lyfe.page09", "dressed") === "1")
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i];
        const b = kids[j];
        const hit =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        if (hit) overlaps++;
      }
    }
    // Two frames side by side on one row are exactly GAP apart.
    const rows = new Map();
    for (const k of kids) {
      const row = rows.get(k.y) ?? [];
      row.push(k);
      rows.set(k.y, row);
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      for (let i = 1; i < row.length; i++) {
        const gap = row[i].x - (row[i - 1].x + row[i - 1].width);
        if (gap !== api.GAP) badGap.push(`${inner.parent.name}/${inner.name} ${gap}`);
      }
    }
  }
}
say(overlaps === 0, `aucun chevauchement · ${overlaps}`);
say(badGap.length === 0, `160 px entre deux cadres d'une rangée · ${badGap.slice(0, 4).join(", ") || "partout"}`);

const gaps = [];
for (let i = 1; i < sections.length; i++) {
  gaps.push(sections[i].x - (sections[i - 1].x + sections[i - 1].width));
}
say(
  gaps.every((g) => g === api.SECTION_GAP),
  `320 px entre deux sections · ${[...new Set(gaps)].join(", ")}`,
);

// Every frame ends up dressed, and every dressed frame is in a shelf.
const dressedCount = page09.findAll((n) => n.getSharedPluginData("lyfe.page09", "dressed") === "1").length;
say(dressedCount > 0, `${dressedCount} cadres habillés`);
const loose = page09.findAll((n) => n.type === "TEXT" && n.parent && n.parent.type === "SECTION").length;
say(loose === 0, `aucun texte libre dans une étagère · ${loose}`);

console.log(
  problems.length === 0
    ? `\nLa présentation se répète · ${second.report.length} lignes de rapport`
    : `\n${problems.length} problème(s)`,
);
for (const line of second.report.slice(-10)) console.log(`     ${line}`);
process.exit(problems.length === 0 ? 0 : 1);
