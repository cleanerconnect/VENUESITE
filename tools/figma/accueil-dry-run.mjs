// `accueil-frames.js` run in node, against a Figma that is not there.
//
//   node tools/figma/accueil-dry-run.mjs
//
// Same reasoning as `present-dry-run.mjs`: the builder is pasted into
// `use_figma` and its mistakes land on a real file, so the bookkeeping
// is proved here first. The stub is a plain object graph with no layout
// engine — every box is one pixel — which is enough for what can
// actually go wrong: a frame or a column the builder cannot find, the
// greeting card deleted with the lists, a tile that is not a door, a
// second Check-in button on the second run, a reaction left pointing at
// a node that has been removed.
//
// What it cannot prove is what the frames look like. That is what
// `get_screenshot` is for, afterwards.

import { readFileSync } from "node:fs";

// `SRC` takes the bundle `accueil-pack.mjs` produces as well as the
// source, so the bytes that will actually be pasted into `use_figma` can
// be put through the same assertions as the file they came from.
const SRC = process.env.SRC ?? "tools/figma/accueil-frames.js";
const BUNDLED = !!process.env.BUNDLED;
const FIGURES = process.env.FIGURES ?? "docs/lot1-accueil-figures.json";

const src = readFileSync(SRC, "utf8");
const figures = JSON.parse(readFileSync(FIGURES, "utf8"));

let counter = 0;
const node = (type, name = "") => {
  const self = {
    type,
    id: `stub:${counter++}`,
    name,
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
    vectorPaths: [],
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
    remove() {
      this.removed = true;
      for (const kid of this.children) kid.removed = true;
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
    },
    clone() {
      const copy = node(this.type, this.name);
      copy.width = this.width;
      copy.height = this.height;
      copy.reactions = this.reactions.map((r) => ({ ...r }));
      for (const kid of this.children) copy.appendChild(kid.clone());
      return copy;
    },
    getStyledTextSegments() {
      return [{ fontName: { family: "Urbanist", style: "Medium" } }];
    },
    async setReactionsAsync(reactions) {
      // The sandbox the builder actually runs in refuses every NODE
      // action — a hand-built one, and a node's own reactions read back
      // and set again unchanged — while accepting BACK, CLOSE, URL and
      // the empty list. So the stub refuses them too: a builder that
      // tries to write a link fails here rather than halfway through a
      // real file, which is how the first run of this one was found.
      for (const r of reactions) {
        for (const a of r.actions || []) {
          if (a.type === "NODE") {
            throw new Error("Reaction at index 0 was invalid (NODE actions cannot be written)");
          }
        }
      }
      this.reactions = reactions;
    },
    setSharedPluginData(ns, key, value) {
      this._shared[`${ns}/${key}`] = value;
    },
    getSharedPluginData(ns, key) {
      return this._shared[`${ns}/${key}`] ?? "";
    },
  };
  return self;
};

const all = [];
const make = (type, name) => {
  const n = node(type, name);
  all.push(n);
  return n;
};

/** A button with the reaction the real file has on it. */
const button = (name, destination) => {
  const b = make("FRAME", name);
  b.reactions = [
    {
      trigger: { type: "ON_CLICK" },
      actions: [{ type: "NODE", destinationId: destination, navigation: "NAVIGATE" }],
    },
  ];
  return b;
};

/** One Accueil frame, shaped the way page 09 has it. */
const accueil = ({ name, lane, banner, reservations, checkin, withCheckIn }) => {
  const shell = make("FRAME", `${lane === "desktop" ? "Ordinateur" : "Téléphone"} · ${name}`);
  shell.resize(lane === "desktop" ? 1440 : 422, 1500);
  const chrome = make("INSTANCE", lane === "desktop" ? "Shell / Navigateur" : "Shell / Téléphone");
  shell.appendChild(chrome);

  const frame = make("FRAME", name);
  frame.resize(lane === "desktop" ? 1440 : 390, 1456);
  frame.y = lane === "desktop" ? 44 : 16;
  shell.appendChild(frame);

  if (lane === "desktop") {
    const side = make("INSTANCE", "Chrome / Sidebar · Dashboard basique");
    side.appendChild(button("entrée · Réservations", reservations));
    side.appendChild(button("entrée · Check-in", checkin));
    frame.appendChild(side);
    frame.appendChild(make("INSTANCE", "Chrome / Topbar"));
  }

  const col = make("FRAME", lane === "desktop" ? "main" : "contenu");
  col.y = lane === "desktop" ? 104 : 72;
  frame.appendChild(col);

  if (banner) col.appendChild(make("FRAME", "bandeau · LYFE vérifie votre établissement"));

  const cardName = lane === "desktop" ? "accueil" : "bloc";
  const card = make("FRAME", cardName);
  const sentence = make("TEXT", "sous-titre");
  sentence.characters = "26 réservations aujourd'hui, rien en attente de réponse, 21 déjà arrivées.";
  card.appendChild(sentence);
  const actions = make("FRAME", "actions");
  actions.appendChild(button("Button · Ouvrir le carnet", reservations));
  if (withCheckIn) actions.appendChild(button("Button · Check-in", checkin));
  card.appendChild(actions);
  col.appendChild(card);

  // The three lists that have to go, and the reaction that goes with them.
  for (const list of ["À traiter", "Prochaines arrivées", "Arrivés"]) {
    const group = make("FRAME", list);
    if (list === "À traiter") group.appendChild(button("Accepter", "overlay"));
    col.appendChild(group);
  }

  if (lane !== "desktop") {
    frame.appendChild(make("FRAME", "entête"));
    frame.appendChild(make("FRAME", "filet"));
    const tabs = make("INSTANCE", "Chrome / BottomTabs · Dashboard basique");
    tabs.resize(390, 76);
    tabs.appendChild(button("onglet · Réservations", reservations));
    tabs.appendChild(button("onglet · Arrivées", checkin));
    frame.appendChild(tabs);
  }

  return { shell, frame, col };
};

const page09 = make("PAGE", "09 Dashboard basique · Dar Zellij");
page09.children = [];
const frames = {
  desktop: accueil({
    name: "/restaurant · Accueil",
    lane: "desktop",
    reservations: "resa-1440",
    checkin: "checkin-1440",
  }),
  desktopPending: accueil({
    name: "/restaurant · Accueil · en attente de validation",
    lane: "desktop",
    banner: true,
    reservations: "resa-1440",
    checkin: "checkin-1440",
  }),
  phone: accueil({
    name: "/restaurant · Accueil · téléphone",
    lane: "phone",
    reservations: "resa-390",
    checkin: "checkin-390",
    withCheckIn: true,
  }),
  phonePending: accueil({
    name: "/restaurant · Accueil · en attente de validation · téléphone",
    lane: "phone",
    banner: true,
    reservations: "resa-390",
    checkin: "checkin-390",
    withCheckIn: true,
  }),
};
for (const key of Object.keys(frames)) page09.appendChild(frames[key].shell);

const figma = {
  root: { children: [make("PAGE", "02 Composants"), page09] },
  currentPage: page09,
  async setCurrentPageAsync(p) {
    this.currentPage = p;
  },
  async loadFontAsync() {},
  createFrame: () => make("FRAME"),
  createText: () => make("TEXT"),
  createVector: () => make("VECTOR"),
  createRectangle: () => make("RECTANGLE"),
};

// ── Run the real file ────────────────────────────────────────
const body = src.replace(/^\/\/.*$/gm, "");
const run = new Function(
  "figma",
  BUNDLED ? `${body}\nreturn A;` : `${body}\nreturn { buildAccueil, FRAMES, KEEP };`,
);
const api = run(figma);

const first = await api.buildAccueil(figma, figures);
const second = await api.buildAccueil(figma, figures);

// ── What has to be true ──────────────────────────────────────
const problems = [];
const must = (ok, why) => {
  if (!ok) problems.push(why);
};

const tiles = figures.rows.reduce((n, r) => n + r.tiles.length, 0);
const doors = figures.rows.reduce((n, r) => n + r.tiles.filter((t) => t.href).length, 0);
const bars = figures.chart.lanes.desktop.bars.length;

must(first.length === 4, `quatre cadres attendus, ${first.length} traités`);
for (const line of first) {
  must(!line.missing, `${line.frame} : ${line.missing} introuvable`);
  if (line.missing) continue;
  must(
    line.dropped.length === 3,
    `${line.frame} : ${line.dropped.length} listes retirées au lieu de trois`,
  );
  must(
    line.kept.some((n) => /^accueil$|^bloc$/.test(n)),
    `${line.frame} : la carte d'accueil a été retirée`,
  );
  must(line.retold === 1, `${line.frame} : la phrase de la carte n'a pas été réécrite`);
  must(line.doors === doors, `${line.frame} : ${line.doors} tuile(s)-porte au lieu de ${doors}`);
  must(line.bars === bars, `${line.frame} : ${line.bars} barres au lieu de ${bars}`);
}
// The banner belongs to the two « en attente » frames and to no others.
const banners = first.filter((l) => l.kept && l.kept.some((n) => /^bandeau/.test(n)));
must(banners.length === 2, `${banners.length} bandeau(x) conservé(s) au lieu de deux`);
// The computer frames gain the button the phone frames already had.
must(
  first.filter((l) => l.added === 1).length === 2,
  "les deux cadres ordinateur devraient gagner un bouton Check-in",
);

// A second run must not double anything: the lists are already gone, the
// button is already there, and the column is rebuilt rather than added to
// — so what the second pass removes is exactly what the first pass drew,
// one group per row and the chart.
const redrawn = figures.rows.length + 1;
for (const line of second) {
  must(
    line.dropped.length === redrawn,
    `${line.frame} : second passage, ${line.dropped.length} retraits au lieu de ${redrawn}`,
  );
  must(line.added === 0, `${line.frame} : second passage, un bouton Check-in de plus`);
  must(line.doors === doors, `${line.frame} : second passage, ${line.doors} tuile(s)-porte`);
}
for (const key of Object.keys(frames)) {
  const col = frames[key].col;
  const sections = col.children.filter((k) => /^rangée · /.test(k.name));
  must(sections.length === figures.rows.length, `${key} : ${sections.length} rangées`);
  const charts = col.children.filter((k) => /^carte · /.test(k.name));
  must(charts.length === 1, `${key} : ${charts.length} graphique(s)`);
  const count = (node, test) => {
    let n = test(node) ? 1 : 0;
    for (const kid of node.children || []) n += count(kid, test);
    return n;
  };
  const built = count(col, (n) => /^tuile · /.test(n.name));
  must(built === tiles, `${key} : ${built} tuiles dessinées au lieu de ${tiles}`);
  // The door is a clone of something that already navigates, wrapped
  // round the tile — and it must have brought its reaction with it.
  const openers = col.children.length
    ? [...Array(1)].flatMap(() => {
        const found = [];
        const walk = (n) => {
          // `porte · Check-in` is the greeting button's hotspot, not a tile's.
          if (/^porte · /.test(n.name) && n.name !== "porte · Check-in") found.push(n);
          for (const kid of n.children || []) walk(kid);
        };
        walk(col);
        return found;
      })
    : [];
  must(
    openers.length === doors,
    `${key} : ${openers.length} tuile(s)-porte au lieu de ${doors}`,
  );
  for (const opener of openers) {
    const navigates = opener.reactions.some((r) =>
      (r.actions || []).some((a) => a.type === "NODE" && a.navigation === "NAVIGATE"),
    );
    must(navigates, `${key} : ${opener.name} n'a pas gardé sa réaction`);
    must(
      count(opener, (n) => /^tuile · /.test(n.name)) === 1,
      `${key} : ${opener.name} n'entoure pas une tuile`,
    );
  }
  const cards = col.children.filter((k) => /^accueil$|^bloc$/.test(k.name));
  const checkIns = cards.reduce((n, c) => n + count(c, (k) => /Button · Check-in/.test(k.name)), 0);
  must(checkIns === 1, `${key} : ${checkIns} bouton(s) Check-in`);
  // And on a computer frame it must be behind a hotspot that goes to
  // the computer's Check-in, not the phone's.
  if (/desktop/i.test(key) || key.startsWith("desktop")) {
    const gate = cards.flatMap((c) => {
      const found = [];
      const walk = (n) => {
        if (/^porte · Check-in$/.test(n.name)) found.push(n);
        for (const kid of n.children || []) walk(kid);
      };
      walk(c);
      return found;
    })[0];
    must(!!gate, `${key} : le bouton Check-in n'est pas derrière une porte`);
    if (gate) {
      const to = gate.reactions[0].actions[0].destinationId;
      must(to === "checkin-1440", `${key} : la porte Check-in mène à ${to}`);
      const inner = count(gate, (n) => n.reactions && n.reactions.length);
      must(inner === 1, `${key} : ${inner} réaction(s) sous la porte Check-in`);
    }
  }
}

// No reaction may point at a node this run removed.
const live = new Set(all.filter((n) => !n.removed).map((n) => n.id));
let dangling = 0;
for (const n of all) {
  if (n.removed || !n.reactions) continue;
  for (const r of n.reactions) {
    for (const a of r.actions || []) {
      if (a.type !== "NODE" || !a.destinationId) continue;
      if (a.destinationId.startsWith("stub:") && !live.has(a.destinationId)) dangling += 1;
    }
  }
}
must(dangling === 0, `${dangling} réaction(s) pointant vers un nœud retiré`);

if (problems.length) {
  console.log(`✗ ${problems.length} problème(s)`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log(
  `ok · 4 cadres · ${figures.rows.length} rangées × ${tiles} tuiles · ${bars} barres · ` +
    `${doors} porte par cadre · deux passages identiques · aucune réaction orpheline`,
);
