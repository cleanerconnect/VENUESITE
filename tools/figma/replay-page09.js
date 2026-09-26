// Page 09, drawn from `docs/lot1-figma-frames.json`.
//
// This is the other half of `capture-frames.mjs`, and it runs inside
// Figma rather than in node: the capture records what the browser
// painted, this replays it into the file. It lived only in a chat
// transcript until now, which is why the page could be re-captured but
// not re-drawn without somebody writing this again from memory.
//
// ── How to run it ────────────────────────────────────────────────────
//
// The Figma plugin sandbox has no `fetch`, so the JSON cannot be read
// from disk or from a URL: it has to be handed in. Two steps.
//
// 1. Store the file on page 09's shared plugin data, in chunks of
//    about 26 000 characters:
//
//      const page = figma.root.children.find((p) => /^09 /.test(p.name));
//      page.setSharedPluginData("lyfe.page09", "data0", "…");
//      … data1, data2 …
//      page.setSharedPluginData("lyfe.page09", "chunks", "8");
//
//    Handed over raw, that is 223 000 characters of escaped string
//    literal to type. `tools/figma/pack-frames.mjs` prints the same
//    bytes as 52 000 characters of base64 and carries the twenty-line
//    decoder to undo it — `figma.base64Decode` for the base64,
//    `unpack` for the rest — so the transfer is one call rather than
//    eight.
//
// 2. Paste this file's body into `use_figma` and finish with
//    `return await replayPage09(figma, ["5 · Ma fiche"]);`, a group of
//    sections at a time. `use_figma` resets the current page at the
//    start of every call, which is why `replayPage09` switches to page
//    09 itself rather than trusting `figma.currentPage`.
//
// `tools/figma/replay-dry-run.mjs` runs this same file against a stub
// sandbox in node, which is where a typo should be found.
//
// ── What it rebuilds, and what it leaves alone ───────────────────────
//
// Every frame whose key the capture owns, and nothing else. A frame is
// claimed by the key stamped on it — `getSharedPluginData("lyfe.page09",
// "frame")` — and is replaced where it stands. On the first run nothing
// is stamped yet, so `ADOPT` says which node each key starts from;
// after that the stamps carry it, and `ADOPT` is only a fallback for a
// key whose frame somebody deleted.
//
// Anything the capture does not own keeps its content and its place in
// the order: the state cards of Connexion, the selector states, the
// « États liés » captions. A replaced frame is rarely the height it
// was, so each shelf is laid out again from the top with the gaps it
// already had — which is the only way a taller « Horaires » does not
// end up printed over « Photos », and the only way a caption stays 72px
// under the frame above it and 28px over the frame it names.
//
// The dashboard chrome is not redrawn. Each frame's `Chrome / …`
// instances move across from the frame being replaced, because two of
// the three are variant sets and which item they show as active is set
// per frame: a clone of some other screen's instance would give every
// screen the same active item. A desktop frame carries the sidebar and
// the topbar, a phone frame carries the bottom tabs, and the replay
// re-pins each to the height the new frame has.

const NS = "lyfe.page09";

/** Which section each captured key belongs in, and in what order. */
const HOME = {
  "connexion": ["1 · Connexion", 0],
  "ma-fiche-identite": ["5 · Ma fiche", 0],
  "ma-fiche-details": ["5 · Ma fiche", 1],
  "ma-fiche-enregistre": ["5 · Ma fiche", 2],
  "ma-fiche-horaires": ["5 · Ma fiche", 3],
  "ma-fiche-photos": ["5 · Ma fiche", 4],
  "ma-fiche-menu": ["5 · Ma fiche", 5],
  "disponibilites": ["6 · Disponibilités", 0],
  "disponibilites-enregistre": ["6 · Disponibilités", 1],
  "notifications": ["7 · Notifications", 0],
  "notifications-enregistre": ["7 · Notifications", 1],
  "inscription-1": ["0 · Inscription", 0],
  "inscription-2": ["0 · Inscription", 1],
  "inscription-3": ["0 · Inscription", 2],
  "inscription-4": ["0 · Inscription", 3],
  "inscription-5": ["0 · Inscription", 4],
  "inscription-6": ["0 · Inscription", 5],
  "inscription-7": ["0 · Inscription", 6],
};

/**
 * The node each key started from, for a file whose frames carry no
 * stamp yet. Read once, then the stamps take over — an id here is the
 * id of a frame this script has since deleted.
 *
 * `ma-fiche-horaires@390` is deliberately absent: page 09 never had it.
 * It is created, and `HOME` says where.
 */
const ADOPT = {
  "connexion@1440": "128:12",
  "ma-fiche-identite@1440": "316:1179",
  "ma-fiche-details@1440": "328:819",
  "ma-fiche-enregistre@1440": "326:1395",
  "ma-fiche-horaires@1440": "211:757",
  "ma-fiche-photos@1440": "316:1449",
  "ma-fiche-menu@1440": "316:1663",
  "disponibilites@1440": "128:13706",
  "disponibilites-enregistre@1440": "204:711",
  "notifications@1440": "128:13838",
  "notifications-enregistre@1440": "204:983",
  "inscription-1@1440": "317:1887",
  "inscription-2@1440": "318:1887",
  "inscription-3@1440": "318:2000",
  "inscription-4@1440": "317:1983",
  "inscription-5@1440": "319:1887",
  "inscription-6@1440": "320:1887",
  "inscription-7@1440": "319:2031",
  "connexion@390": "216:1072",
  "ma-fiche-identite@390": "322:1467",
  "ma-fiche-details@390": "322:1705",
  "ma-fiche-enregistre@390": "326:1668",
  "ma-fiche-photos@390": "321:1665",
  "ma-fiche-menu@390": "320:2044",
  "disponibilites@390": "219:1294",
  "disponibilites-enregistre@390": "221:1456",
  "notifications@390": "219:1545",
  "notifications-enregistre@390": "221:1677",
  "inscription-1@390": "323:2095",
  "inscription-2@390": "323:2178",
  "inscription-3@390": "323:2278",
  "inscription-4@390": "324:2095",
  "inscription-5@390": "324:2178",
  "inscription-6@390": "325:2095",
  "inscription-7@390": "325:2239",
};

// Urbanist, because the file's UI type is Urbanist. Fraunces is the
// display face, set on the page by hand; nothing here writes it.
const FAMILY = "Urbanist";
const WEIGHT = {
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
};
const ALIGN = ["LEFT", "CENTER", "RIGHT", "JUSTIFIED"];
const DEVICE = { 1440: "Ordinateur", 390: "Téléphone" };
const PAD = 80; // a frame's inset inside its shelf
const GAP = 120; // between two frames with no history to go on

/** The page, by name: its id survives nothing, but its name is read. */
const PAGE_MATCH = /^09 /;

async function replayPage09(figma, only) {
  const page = figma.root.children.find((p) => PAGE_MATCH.test(p.name));
  if (!page) throw new Error("page 09 absente");
  await figma.setCurrentPageAsync(page);

  const count = Number(page.getSharedPluginData(NS, "chunks") || 0);
  if (!count) throw new Error("aucune donnée : stocker les morceaux d'abord");
  let raw = "";
  for (let i = 0; i < count; i++) raw += page.getSharedPluginData(NS, `data${i}`);
  const doc = JSON.parse(raw);

  for (const key of Object.keys(WEIGHT)) {
    try {
      await figma.loadFontAsync({ family: FAMILY, style: WEIGHT[key] });
    } catch (e) {
      // A face the file does not carry is a face nothing asks for.
    }
  }

  const paint = (i) => {
    if (i == null || i < 0) return [];
    const colour = doc.pal[i];
    return [
      {
        type: "SOLID",
        color: { r: colour[0], g: colour[1], b: colour[2] },
        opacity: colour[3],
      },
    ];
  };

  // A node's coordinates in the capture are relative to the recorded
  // element's origin, the same origin at every depth — so a child's
  // position inside its parent is the difference of the two.
  const build = (tuple, ox, oy) => {
    if (tuple[0] === "t") {
      const text = tuple[1];
      const size = tuple[6];
      const node = figma.createText();
      node.fontName = { family: FAMILY, style: WEIGHT[tuple[7]] || "Medium" };
      node.characters = text;
      node.fontSize = size;
      node.fills = paint(tuple[8]);
      node.textAlignHorizontal = ALIGN[tuple[9]] || "LEFT";
      // One line is left to size itself: the browser's ink box is a hair
      // narrower than Figma's layout, and a fixed width wraps every
      // label by one word. Anything taller than one line keeps its
      // measured width, plus the two pixels of that difference.
      if (tuple[5] <= Math.round(size * 1.7)) {
        node.textAutoResize = "WIDTH_AND_HEIGHT";
      } else {
        node.textAutoResize = "HEIGHT";
        node.resize(Math.max(1, tuple[4] + 2), Math.max(1, tuple[5]));
      }
      node.x = tuple[2] - ox;
      node.y = tuple[3] - oy;
      node.name = text.slice(0, 40);
      return node;
    }
    const x = tuple[2];
    const y = tuple[3];
    const node = figma.createFrame();
    node.name = tuple[1];
    node.resizeWithoutConstraints(Math.max(1, tuple[4]), Math.max(1, tuple[5]));
    node.x = x - ox;
    node.y = y - oy;
    node.fills = paint(tuple[6]);
    node.strokes = paint(tuple[7]);
    node.strokeAlign = "INSIDE";
    node.strokeWeight = tuple[8] || 0;
    node.cornerRadius = tuple[9] || 0;
    node.clipsContent = false;
    for (const kid of tuple[10] || []) node.appendChild(build(kid, x, y));
    return node;
  };

  // ── Where each frame lives ──
  //
  // Sections one deep: « 5 · Ma fiche » holds « Ordinateur » and
  // « Téléphone », and the frames hang off those. A child of a section
  // is positioned relative to it, so every coordinate below is local.
  const sections = page.children.filter((n) => n.type === "SECTION");
  const shelfFor = (sectionName, width) => {
    const outer = sections.find((s) => s.name === sectionName);
    if (!outer) throw new Error(`section absente : ${sectionName}`);
    const inner = outer.children.find(
      (s) => s.type === "SECTION" && s.name === DEVICE[width],
    );
    if (!inner) throw new Error(`${sectionName} · ${DEVICE[width]} absent`);
    return { outer, inner };
  };

  // Stamped first, adopted second. `findAll` is scoped to the page, so a
  // stamp on a frame somebody dragged elsewhere still finds it.
  const stamped = {};
  for (const node of page.findAll((n) => n.type === "FRAME")) {
    const mark = node.getSharedPluginData(NS, "frame");
    if (mark && !stamped[mark]) stamped[mark] = node;
  }
  const claimed = async (id) => {
    if (stamped[id]) return stamped[id];
    const from = ADOPT[id];
    if (!from) return null;
    const node = await figma.getNodeByIdAsync(from);
    return node && node.type === "FRAME" && !node.removed ? node : null;
  };

  // ── 1 · what this run covers ──
  const report = [];
  const jobs = [];
  for (const f of doc.frames) {
    const cut = f.k.lastIndexOf("@");
    const key = f.k.slice(0, cut);
    const width = Number(f.k.slice(cut + 1));
    const home = HOME[key];
    if (!home) {
      report.push(`ignoré   ${f.k}`);
      continue;
    }
    if (only && only.indexOf(home[0]) < 0) continue;
    jobs.push({ f, key, width, section: home[0], order: home[1] });
  }

  // ── 2 · the shelves as they stand, before anything moves ──
  //
  // The gaps are read here and reapplied at the end, so the page keeps
  // the spacing a designer gave it even though every height changed.
  const shelves = {};
  for (const job of jobs) {
    const id = `${job.section}@${job.width}`;
    if (shelves[id]) continue;
    const found = shelfFor(job.section, job.width);
    shelves[id] = {
      outer: found.outer,
      inner: found.inner,
      seq: found.inner.children
        .slice()
        .sort((a, b) => a.y - b.y)
        .map((n) => ({ node: n, y: n.y, h: n.height })),
      born: [],
    };
  }

  // ── 3 · frame by frame ──
  for (const job of jobs) {
    const f = job.f;
    const shelf = shelves[`${job.section}@${job.width}`];
    const old = await claimed(f.k);

    const frame = figma.createFrame();
    frame.name = f.n;
    frame.resizeWithoutConstraints(job.width, Math.max(1, f.h));
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    frame.clipsContent = true;
    frame.setSharedPluginData(NS, "frame", f.k);

    // A frame the page did not have has no chrome to inherit, so it
    // borrows a clone from a frame of the same width in the same
    // section: every phone frame of Ma fiche shows the same tab as
    // active, and every desktop frame the same sidebar item.
    let chromeFrom = old;
    if (!chromeFrom && f.chrome === "dashboard") {
      for (const item of shelf.seq) {
        const node = item.node;
        if (node.removed || node.type !== "FRAME") continue;
        const has = node.children.filter(
          (c) => c.type === "INSTANCE" && /^Chrome \//.test(c.name),
        );
        if (has.length) {
          chromeFrom = { children: has.map((c) => c.clone()) };
          break;
        }
      }
    }

    if (chromeFrom) {
      for (const piece of chromeFrom.children.slice()) {
        if (piece.type !== "INSTANCE") continue;
        if (!/^Chrome \//.test(piece.name)) continue;
        const px = piece.x;
        const pw = piece.width;
        const ph = piece.height;
        frame.appendChild(piece);
        piece.x = px;
        // Three pieces, three relationships with the frame's height. The
        // sidebar runs the whole of it; the bottom tabs are pinned to the
        // foot of it, the way the phone shell fixes them to the window;
        // the topbar is 72px at the top and cares about neither.
        if (/Sidebar/.test(piece.name)) {
          piece.y = 0;
          piece.resize(pw, Math.max(1, f.h));
        } else if (/BottomTabs/.test(piece.name)) {
          piece.y = Math.max(0, f.h - ph);
          piece.resize(pw, ph);
        } else {
          piece.y = 0;
          piece.resize(pw, ph);
        }
      }
    }

    // `at` is where the recorded element sits in the viewport, and the
    // root tuple already carries its own offset inside that element —
    // the 32px the dashboard insets `main`'s content by. So the two are
    // added. Assigning `at` instead threw the inset away, which was
    // invisible while `at` was hardcoded at 292 and the inset was 32,
    // because 260 + 32 is 292; it was wrong for the two screens whose
    // `main` has no inset, and they hung 32px off the frame.
    const root = build(f.root, 0, 0);
    frame.appendChild(root);
    root.x = f.at[0] + root.x;
    root.y = f.at[1] + root.y;

    if (old) {
      const parent = old.parent;
      parent.insertChild(parent.children.indexOf(old), frame);
      frame.x = old.x;
      frame.y = old.y;
      const slot = shelf.seq.find((s) => s.node === old);
      if (slot) slot.node = frame;
      else shelf.seq.push({ node: frame, y: old.y, h: old.height });
      old.remove();
      report.push(`remplacé ${f.k}`);
    } else {
      shelf.inner.appendChild(frame);
      frame.x = PAD;
      frame.y = 0;
      shelf.born.push({ node: frame, order: job.order });
      report.push(`créé     ${f.k}`);
    }
  }

  // ── 4 · laid out again, with the gaps the shelf already had ──
  const orderOf = (node) => {
    const mark = node.getSharedPluginData(NS, "frame");
    if (!mark) return null;
    const home = HOME[mark.slice(0, mark.lastIndexOf("@"))];
    return home ? home[1] : null;
  };
  for (const id of Object.keys(shelves)) {
    const shelf = shelves[id];
    const seq = shelf.seq.filter((s) => !s.node.removed);

    // A new frame is slotted behind the owned frame it should follow
    // rather than appended. `y: null` says « no history »: the gap
    // either side is the default rather than one measured against a
    // frame that is no longer its neighbour.
    for (const baby of shelf.born.slice().sort((a, b) => a.order - b.order)) {
      let at = 0;
      for (let i = 0; i < seq.length; i++) {
        const o = orderOf(seq[i].node);
        if (o != null && o < baby.order) at = i + 1;
      }
      seq.splice(at, 0, { node: baby.node, y: null, h: baby.node.height });
    }

    let y = seq.length && seq[0].y != null ? seq[0].y : PAD;
    let wide = 0;
    for (let i = 0; i < seq.length; i++) {
      const item = seq[i];
      if (i > 0) {
        const before = seq[i - 1];
        const gap =
          item.y == null || before.y == null
            ? GAP
            : Math.max(0, item.y - (before.y + before.h));
        y += gap;
      }
      item.node.y = y;
      if (item.node.type === "FRAME") item.node.x = PAD;
      y += item.node.height;
      wide = Math.max(wide, item.node.width);
    }
    shelf.inner.resizeWithoutConstraints(
      Math.max(1, wide + PAD * 2),
      Math.max(1, y + PAD),
    );

    // And the section around the two shelves.
    let right = 0;
    let bottom = 0;
    for (const s of shelf.outer.children) {
      if (s.type !== "SECTION") continue;
      right = Math.max(right, s.x + s.width);
      bottom = Math.max(bottom, s.y + s.height);
    }
    shelf.outer.resizeWithoutConstraints(
      Math.max(1, right + 100),
      Math.max(1, bottom + 100),
    );
    report.push(
      `mise en page ${id} · ${seq.length} éléments · ${Math.round(shelf.inner.width)}×${Math.round(shelf.inner.height)}`,
    );
  }

  return report;
}

// Run with, a group of sections at a time:
//
//   return await replayPage09(figma, ["0 · Inscription"]);
//   return await replayPage09(figma, ["5 · Ma fiche"]);
//   return await replayPage09(figma, ["1 · Connexion", "6 · Disponibilités", "7 · Notifications"]);
