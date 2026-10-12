// The Accueil's content column, drawn into page 09's four frames.
//
// `capture-frames.mjs` owns five of the eight screens and `replay`/
// `present-page09.js` redraw them. The three dashboard screens —
// Accueil, Réservations, Check-in — are *adopted* instead: they carry
// the file's prototype reactions on the buttons inside them, and a
// recreated button is a new node, which is a dead link.
//
// This file keeps that bargain and still stops the Accueil being drawn
// by hand. It replaces one child of each Accueil frame — the content
// column, `main` on the computer and `contenu` on the phone — and
// leaves everything a reaction hangs on exactly where it is: the frame
// itself, the sidebar, the topbar and the bottom tabs (all instances,
// each with its own active item), and the greeting card with its two
// buttons. The lists that used to follow the card are deleted, and with
// them the one reaction this does lose: « Accepter » on the first row
// of « À traiter ». That is the point of the change — the Accueil has no
// rows to accept any more, and the overlay it opened is still reached
// from Réservations, where the rows are.
//
// ── How to run it ────────────────────────────────────────────────────
//
//   1. `BASE=… node tools/figma/accueil-figures.mjs` writes
//      `docs/lot1-accueil-figures.json` from the running portal.
//   2. `node tools/figma/accueil-dry-run.mjs` runs this file against a
//      stub sandbox in node, which is where a typo should be found.
//   3. Paste this file's body into `use_figma`, with the JSON inlined,
//      and finish with `return await buildAccueil(figma, FIGURES);`.
//   4. `presentPage09(figma)` afterwards, to lay the section out again
//      around frames that are now a different height.
//
// Every number, label, colour and bar position comes from the JSON.
// Nothing here knows what a reservation is.

const NS = "lyfe.page09";

// ── The four frames, and what each one's column is called ────
const FRAMES = [
  { name: "/restaurant · Accueil", lane: "desktop", column: "main" },
  { name: "/restaurant · Accueil · en attente de validation", lane: "desktop", column: "main" },
  { name: "/restaurant · Accueil · téléphone", lane: "phone", column: "contenu" },
  {
    name: "/restaurant · Accueil · en attente de validation · téléphone",
    lane: "phone",
    column: "contenu",
  },
];

/**
 * What survives in the column: the validation banner, and the greeting
 * card's wrapper. Everything else in there is the old carnet.
 */
const KEEP = /^bandeau|^accueil$|^bloc$/;

// ── The measurements, from `globals.css` and the rendered screen ──
const CARD_RADIUS = 28;
const CARD_PAD = 24;
const TILE_GAP = 16; // the grid's `gap-4`
const HEAD_GAP = 20; // `mt-5` over the value
const META_GAP = 12; // `mt-3` over the delta
const GROUP_GAP = 12; // heading to grid
const STACK = { desktop: 32, phone: 16 }; // `space-y-8` / `space-y-4`
const CHIP = 36; // the icon chip, `h-9 w-9`
const CHIP_RADIUS = 12; // `rounded-chip`
const PLOT_H = 220; // `h-[220px]`
const ARROW = 14; // the delta chip's arrow

const FAMILY = "Urbanist";
const WEIGHT = { 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold" };

const INK = { r: 0.039215, g: 0.121568, b: 0.239215 }; // #0a1f3d
const LINE = { r: 0.909803, g: 0.886274, b: 0.933333 }; // #e8e2ee
const WHITE = { r: 1, g: 1, b: 1 };
const SOFT = 0.7; // the host density's secondary: the ink at 70 %

const solid = (color, opacity = 1) => [{ type: "SOLID", color, opacity }];

// A link is inherited, never written.
//
// This sandbox accepts `BACK`, `CLOSE` and `URL` reactions and rejects
// every `NODE` one — not only a hand-built action, but a node's own
// reactions read back and set again, unchanged. So a new node cannot be
// given a destination, and the only way to put one behind something
// drawn here is to clone a node that already has it and use the clone
// as the hotspot. Which is the same fact page 09 is built around: a
// recreated button is a new node, and a new node is a dead link.

/** `rgb(47, 107, 61)` — as the browser reports a colour — to Figma's 0–1. */
function parseColour(css) {
  const m = /rgba?\(([^)]+)\)/.exec(css || "");
  if (!m) return INK;
  const parts = m[1].split(",").map((n) => parseFloat(n));
  return { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255 };
}
function parseAlpha(css) {
  const m = /rgba?\(([^)]+)\)/.exec(css || "");
  if (!m) return 1;
  const parts = m[1].split(",").map((n) => parseFloat(n));
  return parts.length > 3 ? parts[3] : 1;
}

// ── Text ─────────────────────────────────────────────────────
//
// One helper, because every string on this screen is one of six steps
// of the same scale and the differences that matter are the ones the
// call site states.

async function label(figma, spec) {
  const node = figma.createText();
  const style = WEIGHT[spec.weight] || "Medium";
  await figma.loadFontAsync({ family: FAMILY, style });
  node.fontName = { family: FAMILY, style };
  node.fontSize = spec.size;
  node.name = spec.chars;
  node.characters = spec.chars;
  if (spec.lineHeight) node.lineHeight = { unit: "PIXELS", value: spec.lineHeight };
  if (spec.tracking != null) node.letterSpacing = { unit: "PERCENT", value: spec.tracking };
  if (spec.uppercase) node.textCase = "UPPER";
  if (spec.align) node.textAlignHorizontal = spec.align;
  node.fills = solid(spec.colour || INK, spec.opacity == null ? 1 : spec.opacity);
  node.textAutoResize = "WIDTH_AND_HEIGHT";
  return node;
}

/** Path data times a scalar, for an icon drawn at a size of its own. */
function scalePath(data, k) {
  if (k === 1) return data;
  return data.replace(/-?\d*\.?\d+/g, (n) => String(Math.round(Number(n) * k * 1000) / 1000));
}

/**
 * A lucide icon, from the paths `accueil-figures.mjs` converted.
 *
 * Each path goes in its own vector, inside a frame the size of the
 * icon's box. Figma normalises `vectorPaths` to the path's own bounding
 * box and moves the offset onto `x`/`y`, so the position it works out
 * when the data is set is the position that keeps four separate strokes
 * in one drawing — and the one thing this must not do is overwrite it.
 */
function icon(figma, drawing, colour, opacity, size) {
  const box = size || drawing.size;
  const k = box / drawing.size;
  const group = figma.createFrame();
  group.name = "icône";
  group.layoutMode = "NONE";
  group.fills = [];
  group.clipsContent = false;
  group.resize(box, box);
  for (const data of drawing.paths) {
    const vector = figma.createVector();
    vector.name = "trait";
    // `NONE` rather than `NONZERO`: these are strokes, not filled shapes,
    // and a winding rule on an open path paints the area it encloses.
    vector.vectorPaths = [{ windingRule: "NONE", data: scalePath(data, k) }];
    vector.fills = [];
    vector.strokes = solid(colour, opacity == null ? 1 : opacity);
    vector.strokeWeight = drawing.strokeWeight * k;
    vector.strokeCap = "ROUND";
    vector.strokeJoin = "ROUND";
    group.appendChild(vector);
  }
  return group;
}

// ── A card ───────────────────────────────────────────────────

function card(figma, name, gap) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.itemSpacing = gap;
  frame.paddingTop = CARD_PAD;
  frame.paddingRight = CARD_PAD;
  frame.paddingBottom = CARD_PAD;
  frame.paddingLeft = CARD_PAD;
  frame.cornerRadius = CARD_RADIUS;
  frame.fills = solid(WHITE);
  frame.strokes = solid(LINE);
  frame.strokeWeight = 1;
  frame.strokeAlign = "INSIDE";
  frame.clipsContent = true;
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "FIXED";
  return frame;
}

function row(figma, name, gap, align) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "HORIZONTAL";
  frame.itemSpacing = gap;
  frame.counterAxisAlignItems = align || "MIN";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.fills = [];
  return frame;
}

function column(figma, name, gap) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "VERTICAL";
  frame.itemSpacing = gap;
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.fills = [];
  return frame;
}

const fill = (node) => {
  node.layoutSizingHorizontal = "FILL";
};

// ── A tile ───────────────────────────────────────────────────

async function tile(figma, spec, icons) {
  const frame = card(figma, `tuile · ${spec.label}`, HEAD_GAP);

  const head = row(figma, "entête", 12, "MIN");
  head.primaryAxisAlignItems = "SPACE_BETWEEN";
  frame.appendChild(head);
  fill(head);

  const eyebrow = await label(figma, {
    chars: spec.label,
    size: 13, // `.text-eyebrow` at the host density
    weight: 700,
    lineHeight: 13,
    tracking: 6,
    uppercase: true,
    colour: INK,
    opacity: SOFT,
  });
  head.appendChild(eyebrow);
  // `fitLabel` settles its width once the row has one.
  eyebrow.textAutoResize = "WIDTH_AND_HEIGHT";

  const drawing = spec.icon && icons[spec.icon];
  if (drawing) {
    const chip = figma.createFrame();
    chip.name = `pastille · ${spec.icon}`;
    chip.layoutMode = "HORIZONTAL";
    chip.primaryAxisAlignItems = "CENTER";
    chip.counterAxisAlignItems = "CENTER";
    chip.primaryAxisSizingMode = "FIXED";
    chip.counterAxisSizingMode = "FIXED";
    chip.cornerRadius = CHIP_RADIUS;
    // `bg-surface/70` over a white card: white at 70 %, which is to say
    // the glyph and nothing else. Kept because the chip is the token.
    chip.fills = solid(WHITE, 0.7);
    chip.resize(CHIP, CHIP);
    head.appendChild(chip);
    chip.appendChild(icon(figma, drawing, INK, SOFT));
    chip.layoutSizingHorizontal = "FIXED";
    chip.layoutSizingVertical = "FIXED";
  }

  const body = column(figma, "chiffre", META_GAP);
  frame.appendChild(body);
  fill(body);

  const value = await label(figma, {
    chars: spec.value,
    size: 44, // `.text-metric-lg`
    weight: 800,
    lineHeight: 44,
    tracking: -3,
    colour: INK,
  });
  body.appendChild(value);

  if (spec.delta) {
    const colour = parseColour(spec.delta.colour);
    const chip = row(figma, "écart", 6, "CENTER");
    chip.layoutWrap = "WRAP";
    body.appendChild(chip);
    fill(chip);

    const figure = row(figma, "sens", 4, "CENTER");
    chip.appendChild(figure);
    const arrow = icons[spec.delta.arrow];
    // The chip's arrow is 14, not the tile's 16.
    if (arrow) figure.appendChild(icon(figma, arrow, colour, 1, ARROW));
    figure.appendChild(
      await label(figma, {
        chars: spec.delta.figure,
        size: 13,
        weight: 600,
        lineHeight: 19,
        colour,
      }),
    );
    if (spec.delta.period) {
      chip.appendChild(
        await label(figma, {
          chars: `· ${spec.delta.period}`,
          size: 13,
          weight: 500,
          lineHeight: 19,
          colour: INK,
          opacity: SOFT,
        }),
      );
    }
  } else if (spec.hint) {
    body.appendChild(
      await label(figma, {
        chars: spec.hint,
        size: 13,
        weight: 500,
        lineHeight: 19,
        colour: INK,
        opacity: SOFT,
      }),
    );
  }

  return frame;
}

// ── A titled run of tiles ────────────────────────────────────

async function grid(figma, spec, columns, icons, door) {
  const stack = column(figma, "grille", TILE_GAP);
  const doors = [];
  for (let i = 0; i < spec.tiles.length; i += columns) {
    const line = row(figma, "ligne", TILE_GAP, "MIN");
    stack.appendChild(line);
    fill(line);
    for (let j = i; j < Math.min(i + columns, spec.tiles.length); j++) {
      const built = await tile(figma, spec.tiles[j], icons);
      // A tile with somewhere to go is put inside the hotspot rather
      // than given a reaction, because a reaction cannot be given.
      const opener = spec.tiles[j].href && door ? door(spec.tiles[j]) : null;
      if (opener) {
        line.appendChild(opener);
        fill(opener);
        opener.appendChild(built);
        fill(built);
        doors.push(opener);
      } else {
        line.appendChild(built);
        fill(built);
      }
    }
    // A short last line keeps its columns rather than stretching the
    // tiles that are there over the gap they would have filled.
    for (let j = spec.tiles.length; j < i + columns; j++) {
      const filler = figma.createFrame();
      filler.name = "vide";
      filler.fills = [];
      line.appendChild(filler);
      fill(filler);
    }
  }
  return { stack, doors, lines: stack.children.slice() };
}

/**
 * The grid gives every tile in a row the same height; auto-layout hugs
 * each one on its own, so the tallest sets the row.
 *
 * Called after the column has been laid out, not while it is being
 * built. A tile's height depends on its width — a label wraps — and a
 * line has no width until the grid, the group and the column above it
 * are all `FILL`. Measured too early, every tile was the height of a
 * three-line label and the frames came out 2535 px instead of 1700.
 */
/**
 * The label gets the width CSS would give it.
 *
 * A flex item shrinks to fit the row, but never below its min-content
 * width — the longest word — and then wraps at word boundaries. Figma
 * has neither rule: a text node set to fill wraps wherever it runs out
 * of room, so on the phone, where the tile is 122 px and the icon chip
 * takes 48 of them, « RÉSERVATIONS » came back as « RÉSERVATI ONS »
 * under an icon the browser fits beside it.
 *
 * So the width is worked out here: the natural width if it fits, the
 * room left by the chip if it does not, and never less than the widest
 * word. Measured with a hidden clone of the label itself, because only
 * the renderer knows how wide Urbanist sets a word at 13 px.
 */
function fitLabel(head) {
  const text = head.children.filter((k) => k.type === "TEXT")[0];
  if (!text) return;
  const chip = head.children.filter((k) => k !== text)[0];
  const available = head.width - (chip ? chip.width + head.itemSpacing : 0);
  text.textAutoResize = "WIDTH_AND_HEIGHT";
  const natural = text.width;
  if (natural <= available) return;
  const probe = text.clone();
  head.appendChild(probe);
  probe.visible = false;
  probe.textAutoResize = "WIDTH_AND_HEIGHT";
  let widest = 0;
  for (const word of text.characters.split(/\s+/)) {
    if (!word) continue;
    probe.characters = word;
    widest = Math.max(widest, probe.width);
  }
  probe.remove();
  text.textAutoResize = "HEIGHT";
  text.layoutSizingHorizontal = "FIXED";
  text.resize(Math.max(widest, available), text.height);
}

function evenRows(lines) {
  const inside = (node) => (node.children || []).filter((k) => /^tuile · /.test(k.name));
  const heads = (node) => {
    const out = [];
    const walk = (n) => {
      if (n.name === "entête" && (n.children || []).some((k) => k.type === "TEXT")) out.push(n);
      for (const kid of n.children || []) walk(kid);
    };
    walk(node);
    return out;
  };
  // The labels settle first: a label that wraps makes its tile taller,
  // and the row is measured off the tiles.
  for (const line of lines) for (const kid of line.children) for (const head of heads(kid)) fitLabel(head);
  for (const line of lines) {
    // Measure with everything hugging. A tile inside a door is set to
    // fill its wrapper afterwards, and a wrapper cannot hug a child
    // that fills it: left that way the door kept whatever height it
    // had, and one row of six came out 320 px tall beside rows of 181.
    for (const kid of line.children) {
      kid.layoutSizingVertical = "HUG";
      for (const tileNode of inside(kid)) tileNode.layoutSizingVertical = "HUG";
    }

    const tallest = Math.max.apply(
      null,
      line.children.map((k) => k.height),
    );
    for (const kid of line.children) {
      kid.resize(kid.width, tallest);
      kid.layoutSizingVertical = "FIXED";
      for (const tileNode of inside(kid)) tileNode.layoutSizingVertical = "FILL";
    }
  }
}

async function group(figma, spec, columns, icons, door) {
  const frame = column(figma, `rangée · ${spec.heading}`, GROUP_GAP);
  const heading = await label(figma, {
    chars: spec.heading,
    size: 24, // `.text-h2`
    weight: 700,
    lineHeight: 29,
    tracking: -2,
    colour: INK,
  });
  frame.appendChild(heading);
  heading.textAutoResize = "HEIGHT";
  fill(heading);
  const built = await grid(figma, spec, columns, icons, door);
  frame.appendChild(built.stack);
  fill(built.stack);
  return { frame, doors: built.doors, lines: built.lines };
}

// ── The chart ────────────────────────────────────────────────
//
// Drawn from the geometry recharts laid out, not from the series: the
// bars, the gridlines and the ticks are where the browser put them, in
// the same coordinate space as the SVG's viewBox.

async function chart(figma, spec, lane) {
  const frame = card(figma, `carte · ${spec.heading}`, HEAD_GAP);

  const head = column(figma, "entête", 4);
  frame.appendChild(head);
  fill(head);
  const title = await label(figma, {
    chars: spec.heading,
    size: 18, // `.text-h3`
    weight: 700,
    lineHeight: 23,
    tracking: -1,
    colour: INK,
  });
  head.appendChild(title);
  title.textAutoResize = "HEIGHT";
  fill(title);
  const sub = await label(figma, {
    chars: spec.subheading,
    size: 13,
    weight: 500,
    lineHeight: 19,
    colour: INK,
    opacity: SOFT,
  });
  head.appendChild(sub);
  sub.textAutoResize = "HEIGHT";
  fill(sub);

  const box = lane.viewBox.split(/\s+/).map(Number);
  const plot = figma.createFrame();
  plot.name = "graphique";
  plot.layoutMode = "NONE";
  plot.fills = [];
  plot.clipsContent = false;
  plot.resize(box[2], PLOT_H);
  frame.appendChild(plot);

  const at = (node, x, y) => {
    node.x = x;
    node.y = y;
  };

  for (const line of lane.grid) {
    const vector = figma.createVector();
    vector.name = "filet";
    vector.vectorPaths = [
      { windingRule: "NONE", data: `M ${line.x1} ${line.y} L ${line.x2} ${line.y}` },
    ];
    vector.fills = [];
    vector.strokes = solid(parseColour(line.stroke), parseAlpha(line.stroke));
    vector.strokeWeight = 1;
    // `strokeDasharray="3 3"`, which the browser reports as `3px, 3px`.
    vector.dashPattern = (line.dash || "3px, 3px")
      .split(",")
      .map((n) => parseFloat(n))
      .filter((n) => !isNaN(n));
    plot.appendChild(vector);
  }

  const barColour = parseColour(lane.fill);
  for (let i = 0; i < lane.bars.length; i++) {
    const bar = lane.bars[i];
    const rect = figma.createRectangle();
    rect.name = `barre · ${(lane.xTicks[i] && lane.xTicks[i].label) || i + 1}`;
    rect.resize(bar.w, bar.h);
    rect.fills = solid(barColour);
    rect.topLeftRadius = lane.radius;
    rect.topRightRadius = lane.radius;
    rect.bottomLeftRadius = 0;
    rect.bottomRightRadius = 0;
    plot.appendChild(rect);
    at(rect, bar.x, bar.y);
  }

  const tickColour = parseColour(lane.tickFill);
  for (const tick of lane.yTicks.concat(lane.xTicks)) {
    const node = await label(figma, {
      chars: tick.label,
      size: lane.tickSize,
      weight: 500,
      lineHeight: lane.tickSize + 3,
      colour: tickColour,
    });
    plot.appendChild(node);
    // An SVG tick is placed by its anchor on a baseline; a Figma text
    // node is placed by the corner of its box.
    const dx = tick.anchor === "end" ? -node.width : tick.anchor === "middle" ? -node.width / 2 : 0;
    at(node, tick.x + dx, tick.y - node.height / 2);
  }

  return frame;
}

// ── The greeting card, which stays ───────────────────────────

/** Every text node under `node`, in drawing order. */
function texts(node) {
  const out = [];
  const walk = (n) => {
    if (n.type === "TEXT") out.push(n);
    if (n.children) n.children.forEach(walk);
  };
  walk(node);
  return out;
}

function find(node, test) {
  if (test(node)) return node;
  if (!node.children) return null;
  for (const kid of node.children) {
    const hit = find(kid, test);
    if (hit) return hit;
  }
  return null;
}

function findAll(node, test) {
  const out = [];
  const walk = (n) => {
    if (test(n)) out.push(n);
    if (n.children) n.children.forEach(walk);
  };
  walk(node);
  return out;
}

/**
 * Where this frame's own buttons already point.
 *
 * Read rather than declared: the computer frames and the phone frames
 * navigate to different screens, and an id written here is an id that
 * goes stale the day somebody re-draws Réservations.
 */
function destinations(frame) {
  const out = { reservations: null, checkin: null };
  for (const node of findAll(frame, (n) => n.reactions && n.reactions.length)) {
    for (const reaction of node.reactions) {
      for (const action of reaction.actions || []) {
        if (action.type !== "NODE" || action.navigation !== "NAVIGATE") continue;
        if (/Réservations|carnet/i.test(node.name) && !out.reservations) {
          out.reservations = action.destinationId;
        }
        if (/Check-in|Arrivées/i.test(node.name) && !out.checkin) {
          out.checkin = action.destinationId;
        }
      }
    }
  }
  return out;
}

async function retellGreeting(figma, keptCard, subline) {
  // The card's sentence is the only thing on it that counts anything,
  // so it is the only thing re-written. The headline is a salutation and
  // the buttons are doors; both are the same today as yesterday.
  const lines = texts(keptCard);
  const target = lines.find((t) => /réservations? aujourd'hui|Aucune réservation/i.test(t.characters));
  if (!target || target.characters === subline) return target ? 0 : 0;
  for (const segment of target.getStyledTextSegments(["fontName"])) {
    await figma.loadFontAsync(segment.fontName);
  }
  target.characters = subline;
  target.name = subline;
  return 1;
}

/**
 * A clone of something that already goes where we want, emptied.
 *
 * `destination` is a node id; the source is whatever inside this frame
 * navigates to it — the greeting card's own button for Réservations, the
 * sidebar's entry for Check-in. The copy keeps the reaction and loses
 * everything else, so it can be wrapped round a tile or a button.
 */
function hotspot(frame, destination, name) {
  if (!destination) return null;
  const source = find(frame, (n) =>
    (n.reactions || []).some((r) =>
      (r.actions || []).some(
        (a) => a.type === "NODE" && a.navigation === "NAVIGATE" && a.destinationId === destination,
      ),
    ),
  );
  if (!source || typeof source.clone !== "function") return null;
  const copy = source.clone();
  copy.name = name;
  if (copy.children) for (const kid of copy.children.slice()) kid.remove();
  copy.layoutMode = "VERTICAL";
  copy.itemSpacing = 0;
  copy.paddingTop = 0;
  copy.paddingRight = 0;
  copy.paddingBottom = 0;
  copy.paddingLeft = 0;
  copy.primaryAxisSizingMode = "AUTO";
  copy.counterAxisSizingMode = "FIXED";
  copy.layoutWrap = "NO_WRAP";
  copy.cornerRadius = 0;
  copy.fills = [];
  copy.strokes = [];
  copy.clipsContent = false;
  return copy;
}

async function addCheckIn(figma, frame, keptCard, phoneButton, destination) {
  const actions = find(keptCard, (n) => n.name === "actions");
  if (!actions) return 0;
  if (find(actions, (n) => /Check-in/.test(n.name))) return 0;
  const button = phoneButton.clone();
  button.name = "Button · Check-in";
  // The clone arrives carrying the phone frame's destination, which on a
  // computer frame is a link to the wrong screen. Cleared, then put
  // behind a hotspot that goes to this frame's own Check-in.
  await button.setReactionsAsync([]);
  const door = hotspot(frame, destination, "porte · Check-in");
  if (door) {
    actions.appendChild(door);
    door.appendChild(button);
    door.layoutSizingHorizontal = "HUG";
    door.layoutSizingVertical = "HUG";
  } else {
    actions.appendChild(button);
  }
  return 1;
}

// ── The run ──────────────────────────────────────────────────

async function buildAccueil(figma, figures) {
  const page = figma.root.children.filter((p) => /^09 /.test(p.name))[0];
  if (!page) throw new Error("page 09 introuvable");
  await figma.setCurrentPageAsync(page);

  // The phone's outlined Check-in button is the one the computer frames
  // are missing; cloned rather than re-drawn so the two are the same
  // button and not two drawings of one.
  const phoneCheckIn = find(page, (n) => n.name === "Button · Check-in");

  const report = [];
  for (const spec of FRAMES) {
    const frame = find(page, (n) => n.type === "FRAME" && n.name === spec.name);
    if (!frame) {
      report.push({ frame: spec.name, missing: true });
      continue;
    }
    const col = find(frame, (n) => n.type === "FRAME" && n.name === spec.column);
    if (!col) {
      report.push({ frame: spec.name, missing: spec.column });
      continue;
    }
    const where = destinations(frame);

    // 1 · keep the banner and the greeting card, drop the carnet
    const kept = [];
    const dropped = [];
    for (const kid of col.children.slice()) {
      if (KEEP.test(kid.name)) kept.push(kid);
      else {
        dropped.push(kid.name);
        kid.remove();
      }
    }

    // 2 · the card's sentence, and the door it was missing
    const greetingCard = kept.filter((k) => /^accueil$|^bloc$/.test(k.name))[0];
    let retold = 0;
    let added = 0;
    if (greetingCard) {
      retold = await retellGreeting(figma, greetingCard, figures.greeting.subline);
      if (spec.lane === "desktop" && phoneCheckIn) {
        added = await addCheckIn(figma, frame, greetingCard, phoneCheckIn, where.checkin);
      }
    }

    // 3 · the figures, and the one tile that is also a door
    col.itemSpacing = STACK[spec.lane];
    const openers = [];
    for (const rowSpec of figures.rows) {
      const built = await group(
        figma,
        rowSpec,
        rowSpec.columns[spec.lane] || 2,
        figures.icons,
        (tileSpec) => hotspot(frame, where.reservations, `porte · ${tileSpec.label}`),
      );
      col.appendChild(built.frame);
      fill(built.frame);
      // Now that the row has the column's width, and not before.
      evenRows(built.lines);
      for (const opener of built.doors) openers.push(opener);
    }

    // 4 · the chart
    const lane = figures.chart.lanes[spec.lane];
    const chartCard = await chart(
      figma,
      { heading: figures.chart.heading, subheading: figures.chart.subheading },
      lane,
    );
    col.appendChild(chartCard);
    fill(chartCard);

    // 5 · the frame, and the chrome pinned to its height
    const screenHeight = reheight(frame, col, spec.lane);

    frame.setSharedPluginData(NS, "accueil", figures.capturedAt || "1");
    report.push({
      frame: spec.name,
      kept: kept.map((k) => k.name),
      dropped,
      retold,
      added,
      doors: openers.length,
      bars: lane.bars.length,
      height: screenHeight,
    });
  }

  return report;
}

/**
 * The frame is as tall as its column needs, and so is everything pinned
 * to it: the sidebar runs the full height, the bottom tabs sit on the
 * floor, and the browser or phone shell around the frame grows with it.
 */
function reheight(frame, col, lane) {
  const padding = lane === "desktop" ? 32 : 24;
  const tabs = frame.children.filter((k) => /BottomTabs/.test(k.name))[0];
  const height = Math.round(col.y + col.height + padding + (tabs ? tabs.height : 0));
  frame.resizeWithoutConstraints(frame.width, height);
  for (const kid of frame.children) {
    if (/Sidebar/.test(kid.name)) kid.resizeWithoutConstraints(kid.width, height);
    if (tabs && kid === tabs) kid.y = height - tabs.height;
  }
  const shell = frame.parent;
  if (shell && shell.type === "FRAME" && /^(Ordinateur|Téléphone) · /.test(shell.name)) {
    const chrome = shell.children.filter((k) => /^Shell \//.test(k.name))[0];
    const margin = lane === "desktop" ? frame.y : frame.y * 2;
    shell.resizeWithoutConstraints(shell.width, height + margin);
    if (chrome) {
      if (lane === "desktop") chrome.resizeWithoutConstraints(chrome.width, chrome.height);
      else chrome.resizeWithoutConstraints(chrome.width, height + margin);
    }
  }
  return height;
}
