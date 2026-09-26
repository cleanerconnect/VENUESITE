// `replay-page09.js` run in node, against a Figma that is not there.
//
//   node tools/figma/replay-dry-run.mjs
//
// The replay only exists inside a Figma file, and a round trip to one
// costs a tool call, a plugin sandbox and — when it half-finishes — a
// page somebody has to repair by hand. This stubs the twenty or so
// pieces of the Plugin API the replay touches, builds a page shaped the
// way page 09 is shaped, and runs the real file against it. What it
// proves is the bookkeeping: that every captured key finds a home, that
// nothing is left claimed by two frames, that the chrome instances move
// across with the right heights, and — the failure that is worth a
// whole file for — that no frame is laid out on top of another.
//
// What it cannot prove is what the frames look like. That is what
// `get_screenshot` is for, afterwards.

import { readFileSync } from "node:fs";

const SRC = "tools/figma/replay-page09.js";
const CAPTURE = process.env.OUT ?? "docs/lot1-figma-frames.json";

const src = readFileSync(SRC, "utf8");
const doc = JSON.parse(readFileSync(CAPTURE, "utf8"));

// ── The stub ─────────────────────────────────────────────────
//
// Coordinates are relative to the parent, including inside a SECTION —
// which is the one thing about Figma sections a reader of this file
// should know, because assuming otherwise put every frame 100px off.

let counter = 0;
const node = (type) => ({
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
  characters: "",
  textAutoResize: "NONE",
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
    if (kid.parent) {
      kid.parent.children.splice(kid.parent.children.indexOf(kid), 1);
    }
    kid.parent = this;
    this.children.push(kid);
  },
  insertChild(index, kid) {
    if (kid.parent) {
      kid.parent.children.splice(kid.parent.children.indexOf(kid), 1);
    }
    kid.parent = this;
    this.children.splice(index, 0, kid);
  },
  remove() {
    this.removed = true;
    if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
  },
  clone() {
    const copy = node(this.type);
    copy.name = this.name;
    copy.x = this.x;
    copy.y = this.y;
    copy.width = this.width;
    copy.height = this.height;
    copy._shared = { ...this._shared };
    if (this.parent) this.parent.appendChild(copy);
    return copy;
  },
  setSharedPluginData(ns, key, value) {
    this._shared[`${ns}/${key}`] = value;
  },
  getSharedPluginData(ns, key) {
    return this._shared[`${ns}/${key}`] ?? "";
  },
  findAll(match) {
    const out = [];
    const walk = (parent) => {
      for (const kid of parent.children) {
        if (match(kid)) out.push(kid);
        walk(kid);
      }
    };
    walk(this);
    return out;
  },
});

// ── A page shaped like page 09 ───────────────────────────────

const page = node("PAGE");
page.name = "09 Dashboard basique · Dar Zellij";
const byId = new Map();

/** The tables at the top of the replay, read out of the file itself. */
const table = (name) => {
  const head = src.indexOf(`const ${name} = {`);
  const body = src.slice(head, src.indexOf("\n};", head));
  const out = {};
  for (const [, k, v] of body.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[k] = v;
  for (const [, k, s, o] of body.matchAll(/"([^"]+)":\s*\["([^"]+)",\s*(\d+)\]/g)) {
    out[k] = [s, Number(o)];
  }
  return out;
};
const HOME = table("HOME");
const ADOPT = table("ADOPT");

// What a frame of each width carries, and where. The phone's bottom
// tabs are pinned to the foot of the frame, which is the one piece whose
// y has to move when the frame's height does.
const CHROME = {
  1440: [
    ["Chrome / Sidebar · Dashboard basique", 0, 0, 260],
    ["Chrome / Topbar", 260, 0, 1180],
  ],
  390: [["Chrome / BottomTabs · Dashboard basique", 0, -76, 390]],
};

const shelves = new Map();
const shelf = (sectionName, width) => {
  if (!shelves.has(sectionName)) {
    const outer = node("SECTION");
    outer.name = sectionName;
    outer.x = shelves.size * 2830;
    outer.y = 0;
    page.appendChild(outer);
    const desk = node("SECTION");
    desk.name = "Ordinateur";
    desk.x = 100;
    desk.y = 100;
    desk.width = 1600;
    outer.appendChild(desk);
    const phone = node("SECTION");
    phone.name = "Téléphone";
    phone.x = 1940;
    phone.y = 100;
    phone.width = 550;
    outer.appendChild(phone);
    shelves.set(sectionName, { outer, 1440: desk, 390: phone });
  }
  return shelves.get(sectionName)[width];
};

/** Stacks a frame on a shelf the way the real page stacks them. */
const place = (inner, id, name, height, width, chrome) => {
  const last = inner.children[inner.children.length - 1];
  const frame = node("FRAME");
  frame.id = id;
  frame.name = name;
  frame.x = 80;
  frame.y = last ? last.y + last.height + 120 : 80;
  frame.width = width;
  frame.height = height;
  inner.appendChild(frame);
  for (const [cname, cx, cy, cw] of chrome) {
    const piece = node("INSTANCE");
    piece.name = cname;
    piece.x = cx;
    piece.width = cw;
    piece.height = /Sidebar/.test(cname) ? height : 76;
    // A negative y in the table means « from the bottom ».
    piece.y = cy < 0 ? height + cy : cy;
    frame.appendChild(piece);
  }
  inner.height = frame.y + frame.height + 80;
  byId.set(id, frame);
  return frame;
};

/** A « États liés » caption, 72px under one frame and 28px over the next. */
const caption = (inner, text) => {
  const last = inner.children[inner.children.length - 1];
  const label = node("TEXT");
  label.name = text;
  label.characters = text;
  label.x = 80;
  label.y = last ? last.y + last.height + 72 : 80;
  label.width = inner.width - 160;
  label.height = 17;
  inner.appendChild(label);
  inner.height = label.y + label.height + 80;
  return label;
};

// Frames in the order the real page has them, so the gaps the replay
// reads are the gaps the real page would give it.
const ordered = Object.keys(ADOPT).sort((a, b) => {
  const ka = a.slice(0, a.lastIndexOf("@"));
  const kb = b.slice(0, b.lastIndexOf("@"));
  const wa = Number(a.slice(a.lastIndexOf("@") + 1));
  const wb = Number(b.slice(b.lastIndexOf("@") + 1));
  if (HOME[ka][0] !== HOME[kb][0]) return HOME[ka][0] < HOME[kb][0] ? -1 : 1;
  if (wa !== wb) return wb - wa;
  return HOME[ka][1] - HOME[kb][1];
});
for (const key of ordered) {
  const k = key.slice(0, key.lastIndexOf("@"));
  const width = Number(key.slice(key.lastIndexOf("@") + 1));
  const inner = shelf(HOME[k][0], width);
  const f = doc.frames.find((x) => x.k === key);
  // Deliberately the *old* height: the point is that the replay resizes.
  place(
    inner,
    ADOPT[key],
    `avant · ${key}`,
    f ? Math.round(f.h * 0.8) : 900,
    width,
    f && f.chrome === "dashboard" ? CHROME[width] : [],
  );
  if (/(disponibilites|notifications)$/.test(k)) caption(inner, "État lié · l'enregistrement");
}
// The captions and the hand-drawn cards the replay must not disturb.
caption(shelf("5 · Ma fiche", 1440), "États liés · les cinq onglets et l'enregistrement");
caption(shelf("5 · Ma fiche", 390), "État lié · l'enregistrement");
{
  const inner = shelf("1 · Connexion", 1440);
  caption(inner, "États liés · identifiants refusés, choix de l'établissement");
  place(inner, "hand:1", "Connexion · identifiants refusés", 438, 720, []);
  place(inner, "hand:2", "Sélecteur d'établissement · états", 363, 952, []);
}

const before = new Map();
for (const [, s] of shelves) {
  for (const width of [1440, 390]) {
    for (const kid of s[width].children) before.set(kid.id, kid.name);
  }
}

page.setSharedPluginData("lyfe.page09", "chunks", "1");
page.setSharedPluginData("lyfe.page09", "data0", JSON.stringify(doc));

const figma = {
  root: { children: [page] },
  currentPage: page,
  setCurrentPageAsync: async () => {},
  loadFontAsync: async () => {},
  getNodeByIdAsync: async (id) => byId.get(id) ?? null,
  createFrame: () => node("FRAME"),
  createText: () => node("TEXT"),
};

const replay = new Function("figma", `${src}\nreturn replayPage09;`)(figma);
const report = await replay(figma, process.env.ONLY ? process.env.ONLY.split("|") : undefined);

// ── What it found ────────────────────────────────────────────

let problems = 0;
const say = (line) => console.log(line);
say(report.filter((l) => !/^mise en page/.test(l)).join("\n"));
say("");

const claims = new Map();
for (const [name, s] of shelves) {
  for (const width of [1440, 390]) {
    const inner = s[width];
    const kids = inner.children.slice().sort((a, b) => a.y - b.y);
    say(`${name} · ${width}  ${Math.round(inner.width)}×${Math.round(inner.height)}`);
    let floor = -1;
    for (const kid of kids) {
      const mark = kid.getSharedPluginData("lyfe.page09", "frame");
      if (mark) {
        if (claims.has(mark)) {
          problems++;
          say(`  !! ${mark} revendiqué deux fois`);
        }
        claims.set(mark, kid);
      }
      const chrome = kid.children
        .filter((c) => c.type === "INSTANCE")
        .map(
          (c) =>
            `${c.name.replace(/^Chrome \/ /, "").replace(/ · Dashboard basique/, "")}` +
            ` @${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}×${Math.round(c.height)}`,
        );
      // The bottom tabs are pinned to the foot of the frame, the sidebar
      // runs its height: two relationships this is the only check of.
      for (const c of kid.children.filter((n) => n.type === "INSTANCE")) {
        const wrong =
          (/Sidebar/.test(c.name) && Math.round(c.height) !== Math.round(kid.height)) ||
          (/BottomTabs/.test(c.name) &&
            Math.round(c.y + c.height) !== Math.round(kid.height));
        if (wrong) {
          problems++;
          say(`     !! ${c.name} mal ancré dans ${Math.round(kid.height)}px`);
        }
      }
      const overlap = kid.y < floor;
      if (overlap) problems++;
      const tag = mark || (before.has(kid.id) ? "intact" : "—");
      say(
        `  y=${String(Math.round(kid.y)).padStart(6)}` +
          ` h=${String(Math.round(kid.height)).padStart(5)}` +
          ` ${kid.type === "TEXT" ? "légende" : "cadre  "}` +
          ` ${tag.padEnd(34)}` +
          ` ${chrome.join(" + ")}` +
          (overlap ? "   !! CHEVAUCHE" : ""),
      );
      if (kid.type === "FRAME" && Math.round(kid.width) !== width && !before.has(kid.id)) {
        problems++;
        say(`     !! largeur ${Math.round(kid.width)} au lieu de ${width}`);
      }
      // The recorded content has to land inside the frame it was
      // recorded from. It did not, for the two screens whose `main`
      // carries no inset: one hardcoded origin hung them 32px off the
      // right edge, and the frame clips.
      if (mark) {
        const body = kid.children.find((c) => c.type === "FRAME");
        if (body && Math.round(body.x + body.width) > Math.round(kid.width)) {
          problems++;
          say(
            `     !! le contenu dépasse de ${Math.round(body.x + body.width - kid.width)}px` +
              ` (x=${Math.round(body.x)} + ${Math.round(body.width)} > ${Math.round(kid.width)})`,
          );
        }
      }
      floor = kid.y + kid.height;
    }
    say("");
  }
}

// Every captured key the replay was asked for should be on the page once.
const asked = doc.frames
  .map((f) => f.k)
  .filter((k) => HOME[k.slice(0, k.lastIndexOf("@"))]);
for (const key of asked) {
  if (!claims.has(key)) {
    problems++;
    say(`!! ${key} n'a pas été posé`);
  }
}
// And every caption and hand-drawn card should still be there.
for (const [id, name] of before) {
  if (/^avant · /.test(name)) continue;
  const still = page.findAll((n) => n.id === id).length;
  if (!still) {
    problems++;
    say(`!! « ${name} » a disparu`);
  }
}

say(
  problems
    ? `${asked.length} cadres · ${problems} problème(s)`
    : `${asked.length} cadres posés, ${before.size - asked.length} éléments intacts, aucun chevauchement`,
);
process.exit(problems ? 1 : 0);
