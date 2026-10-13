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
  // What a graft reads off the drawn button and writes onto the clone.
  effects: [],
  opacity: 1,
  visible: true,
  clipsContent: false,
  strokeAlign: "INSIDE",
  strokeWeight: 0,
  cornerRadius: 0,
  layoutMode: "NONE",
  reactions: [],
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
    // The whole point of a clone in this file: a reaction cannot be
    // written, so it is copied with the node that already holds it.
    copy.reactions = this.reactions.map((r) => ({
      trigger: { ...r.trigger },
      actions: (r.actions || []).map((a) => ({ ...a })),
    }));
    if (this.parent) this.parent.appendChild(copy);
    return copy;
  },
  // Figma refuses this for every NODE action, and the replay must never
  // reach for it. A future edit that does fails here rather than in the
  // file.
  async setReactionsAsync(reactions) {
    for (const r of reactions || []) {
      for (const a of r.actions || []) {
        if (a.type === "NODE") {
          throw new Error("Reaction was invalid (NODE actions cannot be written)");
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

/** One ON_CLICK that navigates, the only shape this page uses. */
const reaction = (destinationId) => ({
  trigger: { type: "ON_CLICK" },
  actions: [{ type: "NODE", navigation: "NAVIGATE", destinationId }],
});

/**
 * The prototype as the file actually carries it on the book's frames —
 * which node holds which link, read out of the file once and written
 * down here so this can rehearse what a redraw does to them.
 *
 * It is the half of page 09 that cannot be rebuilt: a reaction is not
 * writable from a plugin, so one that is dropped is drawn again by
 * hand or not at all. Two properties matter and neither is obvious.
 *
 * Out of the frame: every link on a button inside the content has to
 * come back on the button the capture drew in its place.
 *
 * *Into* the frame: six of these destinations are the book's own
 * frames, and a seventh — the landing one — is where every sidebar on
 * the page points. A redraw that swaps a frame for a new one of the
 * same name keeps none of those, which is why the replay keeps the
 * node and changes what is inside it.
 */
const OVERLAY = "overlay · réservation confirmée";
const LINKS = {
  "reservations@1440": [
    ["Jour précédent", ADOPT["reservations-jour-precedent@1440"]],
    ["Jour suivant", ADOPT["reservations-jour-suivant@1440"]],
    ["Déjeuner", ADOPT["reservations-dejeuner@1440"]],
    ["Accepter", OVERLAY],
  ],
  "reservations@390": [["Button · Accepter", `${OVERLAY} · téléphone`]],
  "reservations-dejeuner@1440": [
    ["Jour précédent", ADOPT["reservations-jour-precedent-dejeuner@1440"]],
    ["Jour suivant", ADOPT["reservations-jour-suivant-dejeuner@1440"]],
    ["Dîner", ADOPT["reservations@1440"]],
    ["Accepter", OVERLAY],
  ],
  "reservations-jour-precedent@1440": [
    ["Jour suivant", ADOPT["reservations@1440"]],
    ["Déjeuner", ADOPT["reservations-jour-precedent-dejeuner@1440"]],
    ["Accepter", OVERLAY],
  ],
  "reservations-jour-precedent-dejeuner@1440": [
    ["Jour suivant", ADOPT["reservations-dejeuner@1440"]],
    ["Dîner", ADOPT["reservations-jour-precedent@1440"]],
    ["Accepter", OVERLAY],
  ],
  "reservations-jour-suivant@1440": [
    ["Jour précédent", ADOPT["reservations@1440"]],
    ["Déjeuner", ADOPT["reservations-jour-suivant-dejeuner@1440"]],
    ["Accepter", OVERLAY],
  ],
  "reservations-jour-suivant-dejeuner@1440": [
    ["Jour précédent", ADOPT["reservations-dejeuner@1440"]],
    ["Dîner", ADOPT["reservations-jour-suivant@1440"]],
    ["Accepter", OVERLAY],
  ],
};

// What a frame of each width carries, and where. The phone's bottom
// tabs are pinned to the foot of the frame, which is the one piece whose
// y has to move when the frame's height does.
const CHROME = {
  1440: [
    ["Chrome / Sidebar · Dashboard basique", 0, 0, 260],
    ["Chrome / Topbar", 260, 0, 1180],
  ],
  768: [["Chrome / BottomTabs · Dashboard basique", 0, -76, 768]],
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
    const tablet = node("SECTION");
    tablet.name = "Tablette";
    tablet.x = 1940;
    tablet.y = 100;
    tablet.width = 928;
    outer.appendChild(tablet);
    const phone = node("SECTION");
    phone.name = "Téléphone";
    phone.x = 3100;
    phone.y = 100;
    phone.width = 550;
    outer.appendChild(phone);
    shelves.set(sectionName, { outer, 1440: desk, 768: tablet, 390: phone });
  }
  return shelves.get(sectionName)[width];
};

/** Stacks a frame on a shelf the way the real page stacks them. */
const place = (inner, id, name, height, width, chrome, links = []) => {
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
    // The navigation's own links, on a child of the instance. Every
    // sidebar and every bottom bar on the page points at the book's
    // landing frame, which makes them the test of whether a redraw
    // keeps the frames links point *at*.
    const entry = node("FRAME");
    entry.name = /Sidebar/.test(cname) ? "entrée · Réservations · actif" : "onglet · Arrivées";
    entry.width = 236;
    entry.height = 40;
    entry.reactions = [reaction(ADOPT["reservations@1440"])];
    piece.appendChild(entry);
    frame.appendChild(piece);
  }
  // And the content's own, on the buttons the capture will draw over.
  if (links.length) {
    const main = node("FRAME");
    main.name = "main";
    main.x = 292;
    main.y = 120;
    main.width = Math.max(1, width - 300);
    main.height = Math.max(1, height - 200);
    frame.appendChild(main);
    for (const [cname, dest] of links) {
      const hot = node("FRAME");
      hot.name = cname;
      hot.width = 103;
      hot.height = 36;
      hot.reactions = [reaction(dest)];
      main.appendChild(hot);
    }
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

// The eight sections, built before anything is placed.
//
// `ADOPT` only names the frames the capture adopted, so the three
// screens the page draws by hand — Accueil, Réservations, Check-in —
// used to have no section in this stub at all. They have captured
// frames at 768 since the responsive pass, and a section that is not
// there is the one thing `shelfFor` still refuses.
for (const name of [
  "0 · Inscription",
  "1 · Connexion",
  "2 · Accueil",
  "3 · Réservations",
  "4 · Check-in",
  "5 · Ma fiche",
  "6 · Disponibilités",
  "7 · Notifications",
]) {
  shelf(name, 1440);
}

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
    LINKS[key] ?? [],
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
  for (const width of [1440, 768, 390]) {
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
const only = process.env.ONLY ? process.env.ONLY.split("|") : undefined;

// ── The prototype, counted before and after ──
//
// A reaction cannot be written here, only inherited, so the honest
// question about a redraw is not « did it draw » but « did the links
// come through ». Three things are asked of each pass: that every
// destination the page pointed at is still pointed at by something,
// that nothing points at a node the run removed, and that every link
// the content carried sits on a node the capture drew.

const everything = () => [page, ...page.findAll(() => true)];
const census = () => {
  const out = [];
  for (const n of everything()) {
    for (const r of n.reactions || []) {
      for (const a of r.actions || []) out.push(String(a.destinationId));
    }
  }
  return out.sort();
};
const dangling = () => {
  const bad = [];
  for (const n of everything()) {
    for (const r of n.reactions || []) {
      for (const a of r.actions || []) {
        const to = byId.get(String(a.destinationId));
        // A destination the stub does not model — an overlay, another
        // screen — is not something this can judge.
        if (to && to.removed) bad.push(`${n.name} → ${a.destinationId}`);
      }
    }
  }
  return bad;
};
/** Where the content's links sit, frame by frame, by the holder's name. */
const holders = () => {
  const out = {};
  for (const frame of page.findAll((n) => n.type === "FRAME")) {
    const mark = frame.getSharedPluginData("lyfe.page09", "frame");
    if (!mark || !LINKS[mark]) continue;
    out[mark] = frame
      .findAll((n) => n.reactions && n.reactions.length)
      .filter((n) => {
        for (let c = n; c && c !== frame; c = c.parent) {
          if (/^Chrome \//.test(c.name)) return false;
        }
        return true;
      })
      .map((n) => n.name)
      .sort();
  }
  return out;
};

const linksBefore = census();
const report = await replay(figma, only);

// ── What it found ────────────────────────────────────────────

let problems = 0;
const say = (line) => console.log(line);
say(report.filter((l) => !/^mise en page/.test(l)).join("\n"));
say("");

// ── the prototype, after ──
const linksAfter = census();
const missing = [];
{
  const left = linksAfter.slice();
  for (const dest of linksBefore) {
    const at = left.indexOf(dest);
    if (at < 0) missing.push(dest);
    else left.splice(at, 1);
  }
}
if (missing.length) {
  problems++;
  say(`!! ${missing.length} lien(s) perdu(s) : ${[...new Set(missing)].join(", ")}`);
}
const orphans = dangling();
if (orphans.length) {
  problems++;
  say(`!! ${orphans.length} réaction(s) dans le vide : ${orphans.slice(0, 6).join(", ")}`);
}
const where = holders();
for (const key of Object.keys(LINKS)) {
  const seats = where[key];
  if (!seats) {
    problems++;
    say(`!! ${key} ne porte plus aucun lien de contenu`);
    continue;
  }
  if (seats.length !== LINKS[key].length) {
    problems++;
    say(`!! ${key} porte ${seats.length} lien(s) de contenu pour ${LINKS[key].length}`);
  }
  const wrong = seats.filter((n) => !/^bouton · /.test(n) && n !== "carte");
  if (wrong.length) {
    problems++;
    say(`!! ${key} : lien resté sur ${wrong.join(", ")} au lieu d'un nœud dessiné`);
  }
}
say(
  `réactions · ${linksBefore.length} avant, ${linksAfter.length} après` +
    `, ${orphans.length} orpheline(s)`,
);
for (const key of Object.keys(LINKS)) {
  if (where[key]) say(`  ${key.padEnd(44)} ${where[key].join(" · ")}`);
}
say("");

const claims = new Map();
for (const [name, s] of shelves) {
  for (const width of [1440, 768, 390]) {
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

// ── a second pass, which is the one a real file always gets ──
//
// The first pass inherits from the frames somebody drew by hand. The
// second inherits from the clones the first pass made, which is the
// case that runs for ever after — and the one where a mistake shows up
// as a link that slowly walks off its button.
const drewFirst = report
  .filter((l) => /^(redessiné|créé) /.test(l))
  .map((l) => l.split(/\s+/)[1])
  .sort();
const secondReport = await replay(figma, only);
const drewTwice = secondReport
  .filter((l) => /^(redessiné|créé) /.test(l))
  .map((l) => l.split(/\s+/)[1])
  .sort();
// A frame drawn once and refused the next time is the failure mode of
// a matcher that reads the node's name: the graft renames the clone
// after the button it replaced, so the second pass looks for a label
// that has grown a prefix. It shows up nowhere else — the links are
// all still there, on the right nodes, because nothing moved.
const refused = drewFirst.filter((k) => drewTwice.indexOf(k) < 0);
if (refused.length) {
  problems++;
  say(`!! second passage : ${refused.length} cadre(s) plus redessiné(s) : ${refused.join(", ")}`);
}
const linksTwice = census();
if (linksTwice.length !== linksAfter.length) {
  problems++;
  say(`!! second passage : ${linksTwice.length} liens contre ${linksAfter.length}`);
}
const orphansTwice = dangling();
if (orphansTwice.length) {
  problems++;
  say(`!! second passage : ${orphansTwice.length} réaction(s) dans le vide`);
}
const whereTwice = holders();
for (const key of Object.keys(LINKS)) {
  const a = (where[key] || []).join(" · ");
  const b = (whereTwice[key] || []).join(" · ");
  if (a !== b) {
    problems++;
    say(`!! second passage : ${key} · « ${a} » devient « ${b} »`);
  }
}
say(`second passage · ${linksTwice.length} liens, ${orphansTwice.length} orpheline(s) · ${
  secondReport.filter((l) => /^redessiné/.test(l)).length
} cadres redessinés`);

// ── and a link with nowhere to go ──
//
// The rule the replay promises: a frame it cannot redraw without
// dropping a link is a frame it does not touch. Worth a pass of its
// own, because the alternative — a frame redrawn and a link quietly
// gone — looks exactly like success in every other check here.
const guinea = claims.get("reservations@1440");
if (!guinea) {
  problems++;
  say("!! reservations@1440 n'est pas sur la page : le cas du lien sans cible n'a pas pu être joué");
} else {
  const bogus = node("FRAME");
  bogus.name = "Décaler";
  bogus.reactions = [reaction("une feuille qui n'existe plus")];
  const host = guinea.findAll((n) => n.name === "main")[0] || guinea;
  host.appendChild(bogus);
  const contentBefore = guinea.children.map((c) => c.id).join(",");
  const thirdReport = await replay(figma, ["3 · Réservations"]);
  const kept = thirdReport.find((l) => /^conservé reservations@1440/.test(l));
  if (!kept) {
    problems++;
    say("!! un lien sans cible n'a pas empêché le redessin");
  } else if (guinea.children.map((c) => c.id).join(",") !== contentBefore) {
    problems++;
    say("!! le cadre conservé a tout de même changé");
  } else if (!bogus.reactions.length || bogus.removed) {
    problems++;
    say("!! le lien sans cible a disparu quand même");
  }
  say(`lien sans cible · ${kept ? kept.replace(/^conservé /, "") : "non détecté"}`);
}
say("");

say(
  problems
    ? `${asked.length} cadres · ${problems} problème(s)`
    : `${asked.length} cadres posés, ${linksAfter.length} réactions intactes sur deux passages, aucun chevauchement`,
);
process.exit(problems ? 1 : 0);
