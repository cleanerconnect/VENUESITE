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
// from disk or from a URL: it has to be handed in.
//
// For one or two sections, `tools/figma/replay-pack.mjs` is the short
// way: it prints this file minified, with just those sections' frames
// as an object literal beside it and the `return` already written, as
// one `use_figma` call. No codec and no round trip — a capture that
// fits in the call cannot arrive half-transferred, which a base64
// literal can and did.
//
// For the whole file, or for more sections than fit in 50 000
// characters, it is two steps.
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
  // Accueil and Check-in the page still adopts at 1440 and at 390,
  // captured at 768 only: new keys, so the replay creates them and the
  // frames the prototype lives on are not touched. Their content is
  // fourteen numbers and a chart, and `accueil-frames.js` writes that.
  "accueil": ["2 · Accueil", 0],
  "check-in": ["4 · Check-in", 0],
  // The book and the six states page 09 shows beside it. It was
  // adopted at 1440 and at 390 until the replay learned to inherit a
  // reaction; now every frame of it is drawn from the capture.
  "reservations": ["3 · Réservations", 0],
  "reservations-dejeuner": ["3 · Réservations", 1],
  "reservations-jour-precedent": ["3 · Réservations", 2],
  "reservations-jour-precedent-dejeuner": ["3 · Réservations", 3],
  "reservations-jour-suivant": ["3 · Réservations", 4],
  "reservations-jour-suivant-dejeuner": ["3 · Réservations", 5],
  "ma-fiche-identite": ["5 · Ma fiche", 0],
  "ma-fiche-details": ["5 · Ma fiche", 1],
  "ma-fiche-enregistre": ["5 · Ma fiche", 2],
  "ma-fiche-horaires": ["5 · Ma fiche", 3],
  "ma-fiche-horaires-enregistre": ["5 · Ma fiche", 4],
  "ma-fiche-photos": ["5 · Ma fiche", 5],
  "ma-fiche-menu": ["5 · Ma fiche", 6],
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
 * `ma-fiche-horaires@390` and both widths of
 * `ma-fiche-horaires-enregistre` are deliberately absent: page 09 never
 * had them. They are created, and `HOME` says where.
 */
const ADOPT = {
  "connexion@1440": "128:12",
  // The book's seven frames, drawn by hand until the card. Each one is
  // claimed where it stands so its reactions can be inherited rather
  // than lost; after this run the stamps carry them.
  "reservations@1440": "128:398",
  "reservations@390": "218:1106",
  "reservations-dejeuner@1440": "202:964",
  "reservations-jour-precedent@1440": "202:574",
  "reservations-jour-precedent-dejeuner@1440": "211:12674",
  "reservations-jour-suivant@1440": "202:769",
  "reservations-jour-suivant-dejeuner@1440": "211:12869",
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
// The shelf each width lives in. 768 joined them with the responsive
// pass: a tablet in portrait is the width where the navigation used to
// take a third of the page, and the page had no frame to show it.
const DEVICE = { 1440: "Ordinateur", 768: "Tablette", 390: "Téléphone" };
const PAD = 80; // a frame's inset inside its shelf
const GAP = 120; // between two frames with no history to go on

/** The page, by name: its id survives nothing, but its name is read. */
const PAGE_MATCH = /^09 /;

/**
 * The words on a booking's decisions, which is the one family of
 * button whose presence depends on the day rather than on the screen.
 * A link on one of them falls back to the booking itself.
 */
const DECISION = /^(Accepter|Refuser|Check-in|Absent|Annuler)/;

async function replayPage09(figma, only, given) {
  const page = figma.root.children.find((p) => PAGE_MATCH.test(p.name));
  if (!page) throw new Error("page 09 absente");
  await figma.setCurrentPageAsync(page);

  // The capture, either handed in with the call or read off the page.
  // `given` is what `replay-pack.mjs` bundles: a run that only touches
  // one section needs only that section's frames, and a few sections'
  // worth of JSON fits in the call beside the code. The page's own
  // chunks remain the way to carry the whole file.
  let doc = given;
  if (!doc) {
    const count = Number(page.getSharedPluginData(NS, "chunks") || 0);
    if (!count) throw new Error("aucune donnée : stocker les morceaux d'abord");
    let raw = "";
    for (let i = 0; i < count; i++) raw += page.getSharedPluginData(NS, `data${i}`);
    doc = JSON.parse(raw);
  }

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

  // ── A link is inherited, never written ──
  //
  // This sandbox accepts `BACK`, `CLOSE` and `URL` reactions and
  // refuses every `NODE` one — not only a hand-built action, but a
  // node's own reactions read back and set again, unchanged. So a
  // redrawn button is a dead link, which is why three screens were
  // drawn by hand on this page for months rather than captured.
  //
  // The way round it is to clone the node that already carries the
  // link and move the new drawing into the clone: the look of the new,
  // the reaction of the old. `accueil-frames.js` uses the same trick
  // on two buttons; this does it for every reaction a frame holds.
  //
  // The chrome needs none of it. Those instances move across whole a
  // few lines down, and their reactions with them.

  /** Is this node inside one of the frame's `Chrome / …` instances? */
  const chromeBorne = (node, frame) => {
    for (let c = node; c && c.id !== frame.id; c = c.parent) {
      if (/^Chrome \//.test(c.name)) return true;
    }
    return false;
  };

  /**
   * Which drawn node each of the old frame's links should move onto.
   *
   * A carrier is matched by its label: the file calls the button
   * « Accepter » or « Button · Accepter » depending on which generation
   * of this page drew it, and the capture calls it « bouton ·
   * Accepter ». Two carriers of one label take the first two drawn
   * buttons that bear it, in reading order, rather than both the first.
   *
   * `lost` names a link the drawing has nowhere to put. The frame is
   * then left alone: a book whose « Accepter » has no button is a
   * capture to fix, not a reaction to drop.
   */
  const inheritance = (old, root) => {
    const pairs = [];
    const lost = [];
    const taken = {};
    const pick = (name) => {
      const at = taken[name] || 0;
      const found = root.findAll((n) => n.name === name)[at];
      if (found) taken[name] = at + 1;
      return found;
    };
    const carriers = old
      .findAll((n) => n.reactions && n.reactions.length)
      .filter((n) => !chromeBorne(n, old));
    for (const carrier of carriers) {
      // What the link was hung on to begin with. A carrier this run
      // finds is as often a clone a previous run grafted as a button
      // somebody drew by hand, and the graft renames it after the node
      // it replaced — so the name alone drifts: « Accepter » becomes
      // « bouton · Accepter » becomes nothing matchable at all, and the
      // frame stops being redrawn from the second pass on. The stamp
      // holds the first name and every pass reads that.
      const label = (carrier.getSharedPluginData(NS, "inherited") || carrier.name)
        .replace(/^(?:Button|bouton) · /, "");
      const target = pick(`bouton · ${label}`);
      if (target) {
        pairs.push({ carrier, target, label, via: "bouton" });
        continue;
      }
      // A decision the day does not offer still has somewhere honest
      // to go. « Accepter » hangs on the book's pending booking, and a
      // service with nothing pending left draws no Accepter at all —
      // Déjeuner on the 15th is five tables and all of them confirmed.
      // The sheet that button opens is the sheet a booking opens, so
      // the link moves onto the first card: one tap, same overlay, and
      // a reaction kept rather than dropped for want of a button.
      const card = DECISION.test(label) ? pick("carte") : null;
      if (card) {
        pairs.push({ carrier, target: card, label, via: "carte" });
        continue;
      }
      lost.push(carrier.name);
    }
    return { pairs, lost };
  };

  /** The clone takes the drawn button's box, its look and its children. */
  const graft = (pair) => {
    const target = pair.target;
    const clone = pair.carrier.clone();
    if (clone.type !== "FRAME") {
      throw new Error(`${pair.carrier.name} : un ${clone.type} ne peut pas porter le dessin`);
    }
    // Auto-layout would re-flow children the capture has already
    // placed, and the capture places everything absolutely.
    clone.layoutMode = "NONE";
    for (const kid of clone.children.slice()) kid.remove();
    clone.name = target.name;
    clone.resizeWithoutConstraints(
      Math.max(1, target.width),
      Math.max(1, target.height),
    );
    clone.fills = target.fills;
    clone.strokes = target.strokes;
    clone.strokeAlign = target.strokeAlign;
    // Both read `figma.mixed` on a node whose sides disagree. The
    // capture never writes one that does, and a guard is cheaper than
    // the exception.
    if (typeof target.strokeWeight === "number") clone.strokeWeight = target.strokeWeight;
    if (typeof target.cornerRadius === "number") clone.cornerRadius = target.cornerRadius;
    clone.effects = target.effects;
    clone.opacity = target.opacity;
    clone.visible = true;
    clone.clipsContent = target.clipsContent;
    for (const kid of target.children.slice()) clone.appendChild(kid);
    const parent = target.parent;
    parent.insertChild(parent.children.indexOf(target), clone);
    clone.x = target.x;
    clone.y = target.y;
    target.remove();
    // Passed along rather than overwritten, so the tenth pass still
    // knows the link came off « Accepter » and not off the card it has
    // been sitting on since the second.
    clone.setSharedPluginData(
      NS,
      "inherited",
      pair.carrier.getSharedPluginData(NS, "inherited") || pair.carrier.name,
    );
    return clone;
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
    let inner = outer.children.find(
      (s) => s.type === "SECTION" && s.name === DEVICE[width],
    );
    // A shelf for a width the page has never carried is created rather
    // than refused. It used to throw, which was right while the widths
    // were fixed at two: a missing « Téléphone » meant somebody had
    // deleted it. 768 arrives with the responsive pass, so on the first
    // run after it every section is missing one — and a replay that
    // cannot put a frame down because the shelf is new is a replay that
    // has to wait for the presentation to run first. `present-page09.js`
    // makes them the same way.
    if (!inner) {
      inner = figma.createSection();
      inner.name = DEVICE[width];
      outer.appendChild(inner);
      report.push(`étagère créée ${sectionName} · ${DEVICE[width]}`);
    }
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

    // The drawing first, and the links' landing places worked out
    // before anything is taken off the frame being replaced: a frame
    // this run cannot redraw without dropping a link is a frame this
    // run leaves exactly as it found it.
    const root = build(f.root, 0, 0);
    const plan = old ? inheritance(old, root) : { pairs: [], lost: [] };
    if (plan.lost.length) {
      root.remove();
      report.push(`conservé ${f.k} · lien sans cible : ${plan.lost.join(", ")}`);
      continue;
    }

    // The links, onto the buttons the capture drew for them. Done
    // while the old content still stands, because a clone is the only
    // way a reaction travels.
    for (const pair of plan.pairs) graft(pair);
    if (plan.pairs.length) {
      report.push(
        `hérité   ${f.k} · ` +
          plan.pairs
            .map((x) => (x.via === "carte" ? `${x.label} → la carte` : x.label))
            .join(", "),
      );
    }

    // A frame the page did not have has no chrome to inherit, so it
    // borrows a clone from a frame of the same width in the same
    // section: every phone frame of Ma fiche shows the same tab as
    // active, and every desktop frame the same sidebar item.
    //
    // Which pieces it should carry is the product's answer, not the
    // shelf's: since the responsive pass the portal shows the bottom
    // bar below 1024 and the column at and above it, so a tablet frame
    // wants the tabs and no sidebar. And a shelf that is new — every
    // « Tablette » shelf is, on the first run — has no sibling to
    // borrow from at all, so the search widens to the page.
    const wants = (name) =>
      job.width >= 1024
        ? /Sidebar|Topbar/.test(name)
        : /BottomTabs/.test(name);
    let chromeFrom = old;
    if (!chromeFrom && f.chrome === "dashboard") {
      const sources = [
        ...shelf.seq.map((item) => item.node),
        ...page.findAll((n) => n.type === "FRAME"),
      ];
      for (const node of sources) {
        if (!node || node.removed || node.type !== "FRAME") continue;
        const has = node.children.filter(
          (c) => c.type === "INSTANCE" && /^Chrome \//.test(c.name) && wants(c.name),
        );
        if (has.length) {
          chromeFrom = { children: has.map((c) => c.clone()) };
          break;
        }
      }
    }

    // ── the frame is kept, and only what is inside it changes ──
    //
    // The prototype points *at* these frames as much as out of them:
    // the sidebar's Réservations entry on five of them, Ouvrir le
    // carnet on Accueil, each day arrow on its neighbour. A
    // destination cannot be rewritten any more than a reaction can be
    // written, so a frame swapped for a new one of the same name takes
    // every link into it into the bin. Keeping the node and replacing
    // its content costs nothing and keeps all of them — and it is what
    // `accueil-frames.js` already does to the four Accueil frames.
    const pieces = (chromeFrom ? chromeFrom.children.slice() : []).filter(
      (c) => c.type === "INSTANCE" && /^Chrome \//.test(c.name) && wants(c.name),
    );
    if (old) {
      const keep = pieces.slice();
      for (const kid of old.children.slice()) {
        if (keep.indexOf(kid) < 0) kid.remove();
      }
    }

    const frame = old || figma.createFrame();
    frame.name = f.n;
    frame.resizeWithoutConstraints(job.width, Math.max(1, f.h));
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    frame.clipsContent = true;
    frame.setSharedPluginData(NS, "frame", f.k);

    {
      for (const piece of pieces) {
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
          // The bar runs the width of the screen, and a clone borrowed
          // from the phone shelf is 390 wide.
          piece.resize(job.width, ph);
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
    frame.appendChild(root);
    root.x = f.at[0] + root.x;
    root.y = f.at[1] + root.y;

    if (old) {
      // Its place on the shelf is its own, already in `seq` from step
      // 2 with the height it had: the layout pass reads that and gives
      // the new height the gaps the old one had.
      if (!shelf.seq.find((s) => s.node === frame)) {
        shelf.seq.push({ node: frame, y: frame.y, h: frame.height });
      }
      report.push(`redessiné ${f.k}`);
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
