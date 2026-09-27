// Page 09, presented rather than posted.
//
// `replay-page09.js` put every captured frame back where it stood. That
// was enough while the page was a contact sheet, and it is not enough
// as a handoff: a developer opening the file met eight columns of
// screenshots, a loose line of text over each group, and nothing saying
// what a screen is for, who opens it, or where its contract lives.
//
// This file draws the same frames as a presentation. Everything below
// is generated — the shells, the headers, the captions, the gutters,
// the arrows and the cover — from the capture and from the manifest in
// this file. Nothing is placed by hand, which is the point: a screen
// that changes is re-captured and re-run, and its section comes back
// with its header, its states and its arrows still in the right places.
//
// ── How to run it ────────────────────────────────────────────────────
//
// The Figma plugin sandbox has no `fetch`, so the capture is handed in
// on the page's shared plugin data, exactly as before — see
// `tools/figma/pack-frames.mjs`. Then, in two calls:
//
//   1. `ensureKit(figma)`      builds the four components on page 02,
//                              once. Re-running it reuses them.
//   2. `presentPage09(figma)`  lays out the page.
//
// `tools/figma/present-dry-run.mjs` runs both against a stub sandbox in
// node, which is where a typo should be found.
//
// ── What it does not touch ───────────────────────────────────────────
//
// Three of the eight screens — Accueil, Réservations, Check-in — are
// not in the capture, and their frames carry the file's forty-nine
// prototype reactions on the buttons inside them. Those frames are
// *adopted*: moved into the layout the generator computes, never
// recreated. A recreated button is a new node, and a new node is a dead
// link. The five screens the capture owns are replaced as before, and
// any reaction on the frame itself travels with it.

const NS = "lyfe.page09";
const KIT = "lyfe.kit";

// ── The measurements the presentation is built on ────────────
const GAP = 160; // between two frames
const SECTION_GAP = 320; // between two sections
const PAD = 160; // a shelf's inset
const HEADER_H = 260; // the header block at the top of a section
const CAPTION_H = 64; // an annotation under a frame
const BAR_H = 44; // the browser bar over a desktop frame
const BEZEL = 16; // the phone shell around a phone frame
const COVER_W = 1440;
const COVER_H = 900;

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
const WIDTHS = [1440, 390];
const PAGE_MATCH = /^09 /;
const KIT_PAGE_MATCH = /^02 /;

// ── Colour, in the file's own terms ──────────────────────────
const INK = { r: 0.04, g: 0.07, b: 0.13 };
const INK_SOFT = { r: 0.28, g: 0.32, b: 0.4 };
const INK_MUTE = { r: 0.46, g: 0.5, b: 0.58 };
const LINE = { r: 0.87, g: 0.87, b: 0.85 };
const CANVAS = { r: 1, g: 1, b: 1 };
const CANVAS_2 = { r: 0.96, g: 0.955, b: 0.945 };
const VIOLET = { r: 0.42, g: 0.25, b: 0.54 };
const solid = (color, opacity = 1) => [{ type: "SOLID", color, opacity }];

// ── The file this presentation cites ─────────────────────────
const REPO = "https://github.com/cleanerconnect/VENUESITE/blob/main/";

/**
 * The eight sections, in the order a partner meets them.
 *
 * `rows` is what the section shows: a base frame, and the states that
 * belong beside it. A `key` is a capture key — the generator draws it.
 * A `name` is a frame the capture does not own — the generator finds it
 * on the page by that name and moves it, with its reactions.
 */
const SCREENS = [
  {
    section: "0 · Inscription",
    title: "Inscription",
    route: "/inscription",
    purpose:
      "Sept étapes pour qu'un établissement existe : qui vous êtes, ce que vous tenez, où, à quoi ça ressemble, ce qu'on y trouve, quand c'est ouvert, et le récapitulatif avant l'envoi à LYFE.",
    audience: "Le ou la propriétaire, une fois, seul·e, souvent sur un téléphone.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 2 · Inscription",
    flow: "steps",
    rows: [
      { base: { key: "inscription-1" } },
      { base: { key: "inscription-2" } },
      { base: { key: "inscription-3" } },
      { base: { key: "inscription-4" } },
      { base: { key: "inscription-5" } },
      { base: { key: "inscription-6" } },
      { base: { key: "inscription-7" } },
    ],
  },
  {
    section: "1 · Connexion",
    title: "Connexion",
    route: "/login",
    purpose:
      "Entrer dans le portail. Un seul champ de trop et un partenaire appelle : l'écran refuse en français, ne dit jamais si le compte existe, et demande l'établissement quand le compte en tient plusieurs.",
    audience: "Tout le personnel du lieu, chaque service.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 1 · Comptes et sessions",
    rows: [
      {
        base: { key: "connexion" },
        states: [
          { name: "Connexion · identifiants refusés", caption: "Identifiants refusés", phone: null },
          { name: "Sélecteur d'établissement · états", caption: "Choix de l'établissement", phone: null },
        ],
      },
    ],
  },
  {
    section: "2 · Accueil",
    title: "Accueil",
    route: "/restaurant",
    purpose:
      "Le service en cours en une page : qui arrive, ce qu'il reste à décider, et l'état de la salle. C'est l'écran qui reste ouvert sur le poste de l'accueil.",
    audience: "L'hôte ou l'hôtesse d'accueil, en continu pendant le service.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 3 · Aperçu du service",
    rows: [
      {
        base: { name: "/restaurant · Accueil", phone: "/restaurant · Accueil · téléphone" },
        states: [
          {
            name: "/restaurant · Accueil · en attente de validation",
            phone: "/restaurant · Accueil · en attente de validation · téléphone",
            caption: "En attente de validation LYFE",
          },
          { name: null, phone: "/plus · Plus · téléphone", caption: "Le hub « Plus », sur téléphone" },
        ],
      },
    ],
  },
  {
    section: "3 · Réservations",
    title: "Réservations",
    route: "/restaurant/reservations",
    purpose:
      "Le carnet. On y marche dans les jours et dans les services, on accepte, on refuse, on décale, et la recherche va chercher un nom au-delà de la journée affichée.",
    audience: "L'accueil et la direction de salle, avant et pendant le service.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 4 · Le carnet",
    flow: "book",
    rows: [
      {
        base: { name: "/restaurant/reservations · Réservations", phone: "/restaurant/reservations · Réservations · téléphone" },
        states: [
          { name: "/restaurant/reservations · Réservations · Déjeuner", phone: null, caption: "Service · Déjeuner" },
        ],
      },
      {
        base: { name: "/restaurant/reservations · Réservations · jour précédent", phone: null },
        states: [
          {
            name: "/restaurant/reservations · Réservations · jour précédent · Déjeuner",
            phone: null,
            caption: "Jour précédent · Déjeuner",
          },
        ],
      },
      {
        base: { name: "/restaurant/reservations · Réservations · jour suivant", phone: null },
        states: [
          {
            name: "/restaurant/reservations · Réservations · jour suivant · Déjeuner",
            phone: null,
            caption: "Jour suivant · Déjeuner",
          },
        ],
      },
      {
        base: {
          name: "Overlay · Réservation confirmée · Nabil Cherkaoui",
          phone: "Overlay · Réservation confirmée · Nabil Cherkaoui · téléphone",
        },
        states: [
          {
            name: "Overlay · Décaler la réservation · Nabil Cherkaoui",
            phone: "Overlay · Décaler la réservation · Nabil Cherkaoui · téléphone",
            caption: "Feuille · Décaler",
          },
        ],
      },
    ],
  },
  {
    section: "4 · Check-in",
    title: "Check-in",
    route: "/restaurant/check-in",
    purpose:
      "Marquer l'arrivée d'un client, au code ou à la main. L'écran est fait pour être utilisé debout, une main sur le téléphone.",
    audience: "L'accueil, à la porte.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 5 · Arrivées",
    rows: [
      {
        base: {
          name: "/restaurant/check-in · Check-in",
          phone: "/restaurant/check-in · Check-in · téléphone",
        },
        states: [
          {
            name: "Overlay · Caméra · Scanner le code",
            phone: "Overlay · Caméra · Scanner le code · téléphone",
            caption: "Caméra ouverte",
          },
        ],
      },
    ],
  },
  {
    section: "5 · Ma fiche",
    title: "Ma fiche",
    route: "/restaurant/ma-fiche",
    purpose:
      "Ce que l'application LYFE affiche du lieu : l'identité et la vignette, les détails et la cuisine, la semaine, les photos, la carte. Cinq onglets, une seule barre d'enregistrement.",
    audience: "La direction, quand quelque chose change — rarement, mais il faut que ça marche.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 6 · La fiche",
    rows: [
      { base: { key: "ma-fiche-identite" } },
      {
        base: { key: "ma-fiche-details" },
        states: [{ key: "ma-fiche-enregistre", caption: "Enregistré" }],
      },
      {
        base: { key: "ma-fiche-horaires" },
        states: [{ key: "ma-fiche-horaires-enregistre", caption: "Enregistré" }],
      },
      { base: { key: "ma-fiche-photos" } },
      { base: { key: "ma-fiche-menu" } },
    ],
  },
  {
    section: "6 · Disponibilités",
    title: "Disponibilités",
    route: "/restaurant/disponibilites",
    purpose:
      "Ce qu'un client peut réserver : les services de la semaine, la durée d'un créneau, et les fermetures exceptionnelles.",
    audience: "La direction, une fois par saison et à chaque jour férié.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 7 · Disponibilités",
    rows: [
      {
        base: { key: "disponibilites" },
        states: [{ key: "disponibilites-enregistre", caption: "Enregistré" }],
      },
    ],
  },
  {
    section: "7 · Notifications",
    title: "Notifications",
    route: "/restaurant/notifications",
    purpose: "Qui est prévenu de quoi, et par quel canal. Une matrice, et rien d'autre.",
    audience: "La direction, une fois à l'installation.",
    spec: "docs/LOT1_API_CONTRACT.md",
    specLabel: "Contrat Lot 1 § 8 · Notifications",
    rows: [
      {
        base: { key: "notifications" },
        states: [{ key: "notifications-enregistre", caption: "Enregistré" }],
      },
    ],
  },
];

/**
 * The node a captured key started from, for a file whose frames carry
 * no stamp yet. Read once, then the stamps take over.
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
};

// ── The kit, built once on page 02 ───────────────────────────
//
// Four components, and the page is drawn entirely out of them: a
// browser bar over every desktop frame, a device shell around every
// phone frame, a header block opening every section, and one
// annotation for every caption and every note on the page.
//
// Built by name and reused by name. Running this twice does not make a
// second set, and a designer who edits one of them edits every instance
// of it — which is the whole reason they are components and not four
// hundred rectangles.

async function loadKitFonts(figma) {
  for (const key of Object.keys(WEIGHT)) {
    try {
      await figma.loadFontAsync({ family: FAMILY, style: WEIGHT[key] });
    } catch (e) {
      // A face the file does not carry is a face nothing asks for.
    }
  }
}

function label(figma, text, size, weight, colour, x, y, width) {
  const node = figma.createText();
  node.fontName = { family: FAMILY, style: WEIGHT[weight] };
  node.characters = text;
  node.fontSize = size;
  node.fills = solid(colour);
  node.textAutoResize = "HEIGHT";
  node.x = x;
  node.y = y;
  node.resize(width, node.height);
  node.name = text.slice(0, 32);
  return node;
}

function buildBrowserBar(figma) {
  const c = figma.createComponent();
  c.name = "Shell / Navigateur";
  c.resizeWithoutConstraints(1440, BAR_H);
  c.fills = solid(CANVAS_2);
  c.strokes = solid(LINE);
  c.strokeWeight = 1;
  c.strokeAlign = "INSIDE";
  c.topLeftRadius = 12;
  c.topRightRadius = 12;
  c.clipsContent = true;
  for (let i = 0; i < 3; i++) {
    const dot = figma.createEllipse();
    dot.resize(10, 10);
    dot.x = 18 + i * 18;
    dot.y = (BAR_H - 10) / 2;
    dot.fills = solid(LINE);
    dot.constraints = { horizontal: "MIN", vertical: "CENTER" };
    c.appendChild(dot);
  }
  const pill = figma.createFrame();
  pill.name = "adresse";
  pill.resizeWithoutConstraints(1240, 26);
  pill.x = 100;
  pill.y = (BAR_H - 26) / 2;
  pill.cornerRadius = 13;
  pill.fills = solid(CANVAS);
  pill.strokes = solid(LINE);
  pill.strokeWeight = 1;
  pill.clipsContent = true;
  pill.constraints = { horizontal: "STRETCH", vertical: "CENTER" };
  const url = label(figma, "portail.lyfe.ma/", 13, 500, INK_MUTE, 14, 5, 1200);
  url.name = "url";
  url.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  pill.appendChild(url);
  c.appendChild(pill);
  return c;
}

function buildPhoneShell(figma) {
  const c = figma.createComponent();
  c.name = "Shell / Téléphone";
  c.resizeWithoutConstraints(390 + BEZEL * 2, 844 + BEZEL * 2);
  c.fills = solid(INK);
  c.cornerRadius = 48;
  c.clipsContent = false;
  const notch = figma.createFrame();
  notch.name = "encoche";
  notch.resizeWithoutConstraints(120, 22);
  notch.x = (390 + BEZEL * 2 - 120) / 2;
  notch.y = 6;
  notch.cornerRadius = 11;
  notch.fills = solid(INK);
  notch.constraints = { horizontal: "CENTER", vertical: "MIN" };
  c.appendChild(notch);
  const home = figma.createFrame();
  home.name = "barre d'accueil";
  home.resizeWithoutConstraints(120, 5);
  home.x = (390 + BEZEL * 2 - 120) / 2;
  home.y = 844 + BEZEL * 2 - 11;
  home.cornerRadius = 3;
  home.fills = solid(CANVAS, 0.5);
  home.constraints = { horizontal: "CENTER", vertical: "MAX" };
  c.appendChild(home);
  return c;
}

function buildAnnotation(figma) {
  const c = figma.createComponent();
  c.name = "Annotation";
  c.resizeWithoutConstraints(520, CAPTION_H);
  c.fills = [];
  c.clipsContent = false;
  const rule = figma.createRectangle();
  rule.name = "filet";
  rule.resize(4, CAPTION_H);
  rule.x = 0;
  rule.y = 0;
  rule.cornerRadius = 2;
  rule.fills = solid(VIOLET);
  rule.constraints = { horizontal: "MIN", vertical: "STRETCH" };
  c.appendChild(rule);
  const titre = label(figma, "État", 20, 600, INK, 20, 4, 480);
  titre.name = "titre";
  titre.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  c.appendChild(titre);
  const detail = label(figma, "", 16, 400, INK_MUTE, 20, 32, 480);
  detail.name = "détail";
  detail.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  c.appendChild(detail);
  return c;
}

function buildSectionHeader(figma) {
  const c = figma.createComponent();
  c.name = "Bloc / En-tête d'écran";
  c.resizeWithoutConstraints(1440, HEADER_H);
  c.fills = solid(CANVAS);
  c.strokes = solid(LINE);
  c.strokeWeight = 1;
  c.strokeAlign = "INSIDE";
  c.cornerRadius = 16;
  c.clipsContent = false;
  const pad = 40;
  const col = 1440 - pad * 2;
  const eyebrow = label(figma, "0 · Section", 15, 700, VIOLET, pad, pad - 4, col);
  eyebrow.name = "rubrique";
  eyebrow.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  c.appendChild(eyebrow);
  const titre = label(figma, "Écran", 40, 700, INK, pad, pad + 20, col);
  titre.name = "titre";
  titre.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  c.appendChild(titre);
  const route = label(figma, "/route", 18, 600, INK_SOFT, pad, pad + 74, col);
  route.name = "route";
  route.constraints = { horizontal: "STRETCH", vertical: "MIN" };
  c.appendChild(route);

  const third = (col - 48) / 3;
  const columns = [
    ["À quoi sert cet écran", "objet", "purpose"],
    ["Qui s'en sert", "audience", "audience"],
    ["Spécification", "spécification", "spec"],
  ];
  columns.forEach(([heading, name, kind], i) => {
    const x = pad + i * (third + 24);
    const head = label(figma, heading, 13, 700, INK_MUTE, x, pad + 118, third);
    head.name = `${name} · titre`;
    c.appendChild(head);
    const body = label(figma, "—", 16, 400, INK, x, pad + 140, third);
    body.name = name;
    if (kind === "spec") body.fills = solid(VIOLET);
    c.appendChild(body);
  });
  return c;
}

/**
 * The four components, created if the file does not carry them.
 *
 * Returns them by name. Safe to run again: it never makes a second
 * copy, and it never edits one that is already there — a designer's
 * change to the shell survives the next run of the presentation.
 */
async function ensureKit(figma) {
  const page = figma.root.children.find((p) => KIT_PAGE_MATCH.test(p.name));
  if (!page) throw new Error("page 02 absente");
  await page.loadAsync();
  await loadKitFonts(figma);

  const want = {
    "Shell / Navigateur": buildBrowserBar,
    "Shell / Téléphone": buildPhoneShell,
    Annotation: buildAnnotation,
    "Bloc / En-tête d'écran": buildSectionHeader,
  };
  const have = {};
  for (const node of page.children) {
    if (node.type === "COMPONENT" && want[node.name]) have[node.name] = node;
  }

  // Under everything already on the page, in a row of their own.
  let baseY = 0;
  for (const node of page.children) baseY = Math.max(baseY, node.y + node.height);
  baseY += 240;
  let x = 0;
  const made = [];
  for (const name of Object.keys(want)) {
    if (have[name]) continue;
    const node = want[name](figma);
    page.appendChild(node);
    node.x = x;
    node.y = baseY;
    x += node.width + 120;
    have[name] = node;
    made.push(name);
  }
  return { kit: have, made };
}

// ── Phase A · the captured frames, redrawn ───────────────────
//
// Unchanged in substance from `replay-page09.js`: a frame the capture
// owns is rebuilt from the recorded boxes, the dashboard chrome moves
// across from the frame being replaced, and the new frame is stamped
// with the key so the next run finds it without the table. What is
// gone is the layout — phase B owns every coordinate on the page now.

function painter(doc) {
  return (i) => {
    if (i == null || i < 0) return [];
    const c = doc.pal[i];
    return [{ type: "SOLID", color: { r: c[0], g: c[1], b: c[2] }, opacity: c[3] }];
  };
}

function builder(figma, paint) {
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
      // One line is left to size itself: the browser's ink box is a
      // hair narrower than Figma's layout, and a fixed width wraps
      // every label by one word.
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
  return build;
}

/**
 * Every frame on the page, by the key stamped on it.
 *
 * `findAll` is scoped to the page, so a stamp on a frame somebody
 * dragged elsewhere still finds it.
 */
function stampedFrames(page) {
  const out = {};
  for (const node of page.findAll((n) => n.type === "FRAME")) {
    const mark = node.getSharedPluginData(NS, "frame");
    if (mark && !out[mark]) out[mark] = node;
  }
  return out;
}

/** Every frame on the page by name, for the ones the capture misses. */
function namedFrames(page) {
  const out = {};
  for (const node of page.findAll((n) => n.type === "FRAME")) {
    if (!out[node.name]) out[node.name] = node;
  }
  return out;
}

async function redrawCaptured(figma, page, doc, report) {
  const paint = painter(doc);
  const build = builder(figma, paint);
  const stamped = stampedFrames(page);
  const claimed = async (id) => {
    if (stamped[id]) return stamped[id];
    const from = ADOPT[id];
    if (!from) return null;
    const node = await figma.getNodeByIdAsync(from);
    return node && node.type === "FRAME" && !node.removed ? node : null;
  };

  const drawn = {};
  for (const f of doc.frames) {
    const old = await claimed(f.k);
    const width = Number(f.k.slice(f.k.lastIndexOf("@") + 1));

    const frame = figma.createFrame();
    frame.name = f.n;
    frame.resizeWithoutConstraints(width, Math.max(1, f.h));
    frame.fills = solid(CANVAS);
    frame.clipsContent = true;
    frame.setSharedPluginData(NS, "frame", f.k);

    // The chrome is a set of components, and which item they show as
    // active is set per frame — so it moves across from the frame
    // being replaced rather than being cloned from any old sibling.
    if (old) {
      for (const piece of old.children.slice()) {
        if (piece.type !== "INSTANCE" || !/^Chrome \//.test(piece.name)) continue;
        const px = piece.x;
        const pw = piece.width;
        const ph = piece.height;
        frame.appendChild(piece);
        piece.x = px;
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

    const root = build(f.root, 0, 0);
    frame.appendChild(root);
    root.x = f.at[0] + root.x;
    root.y = f.at[1] + root.y;

    // Parked on the page for now; phase B decides where it goes. A
    // frame with no parent cannot be measured, so it is appended
    // before anything reads its height.
    page.appendChild(frame);
    if (old) {
      // A reaction on the frame itself — an overlay's « fermer », say —
      // belongs to the state, not to the drawing of it.
      if ("reactions" in old && old.reactions.length && "setReactionsAsync" in frame) {
        await frame.setReactionsAsync(old.reactions);
      }
      old.remove();
      report.push(`redessiné ${f.k}`);
    } else {
      report.push(`créé      ${f.k}`);
    }
    drawn[f.k] = frame;
  }
  return drawn;
}

// ── Phase B · the presentation ───────────────────────────────

/** A frame in its device: a browser bar over it, or a phone around it. */
function dress(figma, kit, frame, width) {
  const phone = width <= 480;
  const wrapper = figma.createFrame();
  wrapper.name = `${phone ? "Téléphone" : "Ordinateur"} · ${frame.name}`;
  wrapper.fills = [];
  wrapper.clipsContent = false;
  wrapper.setSharedPluginData(NS, "dressed", "1");

  if (phone) {
    wrapper.resizeWithoutConstraints(width + BEZEL * 2, frame.height + BEZEL * 2);
    const shell = kit["Shell / Téléphone"].createInstance();
    shell.resize(width + BEZEL * 2, frame.height + BEZEL * 2);
    shell.x = 0;
    shell.y = 0;
    wrapper.appendChild(shell);
    wrapper.appendChild(frame);
    frame.x = BEZEL;
    frame.y = BEZEL;
    frame.cornerRadius = 32;
  } else {
    wrapper.resizeWithoutConstraints(width, frame.height + BAR_H);
    const bar = kit["Shell / Navigateur"].createInstance();
    bar.resize(width, BAR_H);
    bar.x = 0;
    bar.y = 0;
    wrapper.appendChild(bar);
    wrapper.appendChild(frame);
    frame.x = 0;
    frame.y = BAR_H;
    frame.cornerRadius = 0;
  }
  return wrapper;
}

/** Takes a frame back out of last run's wrapper, and drops the wrapper. */
function undress(frame) {
  const parent = frame.parent;
  if (!parent || parent.type !== "FRAME") return frame;
  if (parent.getSharedPluginData(NS, "dressed") !== "1") return frame;
  const grand = parent.parent;
  if (!grand) return frame;
  grand.appendChild(frame);
  parent.remove();
  return frame;
}

function annotate(figma, kit, titre, detail, x, y, width) {
  const note = kit.Annotation.createInstance();
  note.resize(Math.max(200, width), CAPTION_H);
  note.x = x;
  note.y = y;
  const t = note.findOne((n) => n.type === "TEXT" && n.name === "titre");
  if (t) t.characters = titre;
  const d = note.findOne((n) => n.type === "TEXT" && n.name === "détail");
  if (d) d.characters = detail;
  return note;
}

/** A shaft and a head, because Figma Design has no connector node. */
function arrow(figma, from, to, direction) {
  const group = figma.createFrame();
  group.name = "Flèche";
  group.fills = [];
  group.clipsContent = false;
  const shaft = figma.createRectangle();
  shaft.fills = solid(VIOLET, 0.55);
  shaft.cornerRadius = 2;
  const head = figma.createVector();
  head.fills = solid(VIOLET, 0.55);
  head.strokes = [];

  if (direction === "bas") {
    const length = Math.max(24, to.y - from.y);
    group.resizeWithoutConstraints(18, length);
    group.x = from.x - 9;
    group.y = from.y;
    shaft.resize(4, Math.max(1, length - 14));
    shaft.x = 7;
    shaft.y = 0;
    head.x = 0;
    head.y = length - 14;
    head.vectorPaths = [{ windingRule: "NONZERO", data: "M 0 0 L 18 0 L 9 14 Z" }];
  } else {
    const length = Math.max(24, to.x - from.x);
    group.resizeWithoutConstraints(length, 18);
    group.x = from.x;
    group.y = from.y - 9;
    shaft.resize(Math.max(1, length - 14), 4);
    shaft.x = 0;
    shaft.y = 7;
    head.x = length - 14;
    head.y = 0;
    head.vectorPaths = [{ windingRule: "NONZERO", data: "M 0 0 L 14 9 L 0 18 Z" }];
  }
  group.appendChild(shaft);
  group.appendChild(head);
  return group;
}

function coverBoard(figma, doc, version) {
  const board = figma.createFrame();
  board.name = "Couverture · Dashboard basique";
  board.resizeWithoutConstraints(COVER_W, COVER_H);
  board.fills = solid(INK);
  board.cornerRadius = 24;
  board.clipsContent = true;
  const pad = 96;
  const col = COVER_W - pad * 2;
  const eyebrow = label(figma, "LYFE · Portail partenaire", 20, 700, { r: 0.72, g: 0.6, b: 0.86 }, pad, pad, col);
  board.appendChild(eyebrow);
  const titre = label(figma, "Dashboard basique", 96, 800, CANVAS, pad, pad + 56, col);
  board.appendChild(titre);
  const sous = label(
    figma,
    "Les huit écrans du Lot 1 : l'inscription d'un établissement, puis le service au jour le jour — accueil, carnet, arrivées — et la fiche que l'application LYFE affiche.",
    28,
    400,
    { r: 0.82, g: 0.84, b: 0.88 },
    pad,
    pad + 200,
    col - 200,
  );
  board.appendChild(sous);
  const rule = figma.createRectangle();
  rule.resize(col, 1);
  rule.x = pad;
  rule.y = COVER_H - pad - 130;
  rule.fills = solid(CANVAS, 0.18);
  board.appendChild(rule);
  const facts = [
    ["Établissement", "Dar Zellij · Marrakech"],
    ["Capture", doc.capturedAt ? String(doc.capturedAt).slice(0, 10) : "—"],
    ["Version", version],
    ["Largeurs", "1440 · 390"],
  ];
  facts.forEach(([head, body], i) => {
    const x = pad + i * ((col - 0) / 4);
    board.appendChild(label(figma, head, 14, 700, { r: 0.6, g: 0.63, b: 0.7 }, x, COVER_H - pad - 100, 260));
    board.appendChild(label(figma, body, 22, 600, CANVAS, x, COVER_H - pad - 74, 260));
  });
  return board;
}

/** The frame a manifest reference names, at one width, or null. */
function resolve(ref, width, drawn, named) {
  if (!ref) return null;
  if (ref.key) return drawn[`${ref.key}@${width}`] ?? null;
  const name = width <= 480 ? ref.phone : ref.name;
  if (!name) return null;
  return named[name] ?? null;
}

/** A section and its two device shelves, created if they are missing. */
function shelves(figma, page, name) {
  let outer = page.children.find((s) => s.type === "SECTION" && s.name === name);
  if (!outer) {
    outer = figma.createSection();
    outer.name = name;
    page.appendChild(outer);
  }
  const inner = {};
  for (const width of WIDTHS) {
    const label = DEVICE[width];
    let found = outer.children.find((s) => s.type === "SECTION" && s.name === label);
    if (!found) {
      found = figma.createSection();
      found.name = label;
      outer.appendChild(found);
    }
    inner[width] = found;
  }
  return { outer, inner };
}

/**
 * Everything the last run generated, gone.
 *
 * The frames themselves are taken back out of their wrappers first, so
 * what is deleted is only the presentation: the wrappers, the headers,
 * the annotations and the arrows. A frame is never deleted here — the
 * three sections the capture does not own carry this file's prototype,
 * and a deleted button is a dead link.
 */
function stripPresentation(page) {
  for (const frame of page.findAll((n) => n.type === "FRAME")) {
    if (frame.getSharedPluginData(NS, "frame")) undress(frame);
  }
  for (const frame of page.findAll((n) => n.type === "FRAME")) {
    const parent = frame.parent;
    if (parent && parent.type === "FRAME" && parent.getSharedPluginData(NS, "dressed") === "1") {
      undress(frame);
    }
  }
  const doomed = page.findAll(
    (n) =>
      (n.type === "FRAME" || n.type === "INSTANCE") &&
      (n.getSharedPluginData(NS, "generated") === "1" ||
        n.getSharedPluginData(NS, "dressed") === "1"),
  );
  for (const node of doomed) if (!node.removed) node.remove();
  // The loose lines of text the old page used for captions. They are
  // what « never loose text » replaces.
  for (const node of page.findAll((n) => n.type === "TEXT")) {
    const inShelf = node.parent && node.parent.type === "SECTION";
    if (inShelf) node.remove();
  }
}

/**
 * Page 09, laid out as a handoff.
 *
 * Run after `ensureKit`. Everything it draws is stamped, so running it
 * again strips the last run and rebuilds rather than stacking.
 */
async function presentPage09(figma, options = {}) {
  const version = options.version ?? "v1";
  const page = figma.root.children.find((p) => PAGE_MATCH.test(p.name));
  if (!page) throw new Error("page 09 absente");
  await page.loadAsync();
  await figma.setCurrentPageAsync(page);
  await loadKitFonts(figma);

  const kitPage = figma.root.children.find((p) => KIT_PAGE_MATCH.test(p.name));
  await kitPage.loadAsync();
  const kit = {};
  for (const node of kitPage.children) {
    if (node.type === "COMPONENT") kit[node.name] = node;
  }
  for (const name of ["Shell / Navigateur", "Shell / Téléphone", "Annotation", "Bloc / En-tête d'écran"]) {
    if (!kit[name]) throw new Error(`composant absent : ${name} — lancer ensureKit d'abord`);
  }

  const count = Number(page.getSharedPluginData(NS, "chunks") || 0);
  if (!count) throw new Error("aucune donnée : stocker les morceaux d'abord");
  let raw = "";
  for (let i = 0; i < count; i++) raw += page.getSharedPluginData(NS, `data${i}`);
  const doc = JSON.parse(raw);

  const report = [];
  stripPresentation(page);
  const drawn = await redrawCaptured(figma, page, doc, report);
  const named = namedFrames(page);

  // ── the sections, one after another ──
  let sectionX = 0;
  const missing = [];
  for (const screen of SCREENS) {
    const { outer, inner } = shelves(figma, page, screen.section);

    const header = kit["Bloc / En-tête d'écran"].createInstance();
    header.setSharedPluginData(NS, "generated", "1");
    outer.appendChild(header);
    header.x = PAD;
    header.y = PAD;
    const put = (name, value) => {
      const node = header.findOne((n) => n.type === "TEXT" && n.name === name);
      if (node) node.characters = value;
    };
    put("rubrique", screen.section);
    put("titre", screen.title);
    put("route", screen.route);
    put("objet", screen.purpose);
    put("audience", screen.audience);
    put("spécification", screen.specLabel);
    const specNode = header.findOne((n) => n.type === "TEXT" && n.name === "spécification");
    if (specNode && "hyperlink" in specNode) {
      specNode.hyperlink = { type: "URL", value: REPO + screen.spec };
    }

    let shelfY = PAD + header.height + SECTION_GAP;
    let widest = header.width;

    for (const width of WIDTHS) {
      const shelf = inner[width];
      let y = GAP;
      let shelfWide = 0;
      const anchors = [];

      for (const row of screen.rows) {
        const base = resolve(row.base, width, drawn, named);
        if (!base) {
          if (row.base && (row.base.key || (width > 480 ? row.base.name : row.base.phone))) {
            missing.push(`${screen.section} · ${width} · ${row.base.key ?? row.base.name ?? row.base.phone}`);
          }
          continue;
        }
        const cells = [{ frame: base, caption: "Écran de base", detail: screen.route }];
        for (const state of row.states ?? []) {
          const node = resolve(state, width, drawn, named);
          if (!node) continue;
          cells.push({ frame: node, caption: state.caption, detail: "" });
        }

        let x = GAP;
        let tallest = 0;
        const placed = [];
        for (const cell of cells) {
          shelf.appendChild(cell.frame);
          const wrapper = dress(figma, kit, cell.frame, width);
          shelf.appendChild(wrapper);
          wrapper.x = x;
          wrapper.y = y;
          const note = annotate(
            figma,
            kit,
            cell.caption,
            cell.detail,
            x,
            y + wrapper.height + 24,
            Math.min(wrapper.width, 640),
          );
          note.setSharedPluginData(NS, "generated", "1");
          shelf.appendChild(note);
          placed.push(wrapper);
          tallest = Math.max(tallest, wrapper.height);
          x += wrapper.width + GAP;
        }
        shelfWide = Math.max(shelfWide, x - GAP);

        // A state sits to the right of the frame it is a state of, and
        // the arrow says so.
        for (let i = 1; i < placed.length; i++) {
          const before = placed[i - 1];
          const after = placed[i];
          const link = arrow(
            figma,
            { x: before.x + before.width + 24, y: before.y + 160 },
            { x: after.x - 24, y: after.y + 160 },
            "droite",
          );
          link.setSharedPluginData(NS, "generated", "1");
          shelf.appendChild(link);
        }

        anchors.push({ x: GAP + placed[0].width / 2, top: y, bottom: y + tallest + 24 + CAPTION_H });
        y = y + tallest + 24 + CAPTION_H + GAP;
      }

      // The onboarding and the book are walked, not browsed: an arrow
      // from each row to the next says which way.
      if (screen.flow) {
        for (let i = 1; i < anchors.length; i++) {
          const link = arrow(
            figma,
            { x: anchors[i - 1].x, y: anchors[i - 1].bottom + 24 },
            { x: anchors[i].x, y: anchors[i].top - 24 },
            "bas",
          );
          link.setSharedPluginData(NS, "generated", "1");
          shelf.appendChild(link);
        }
      }

      shelf.resizeWithoutConstraints(Math.max(1, shelfWide + GAP), Math.max(1, y - GAP + GAP));
      shelf.x = PAD;
      shelf.y = shelfY;
      shelfY += shelf.height + SECTION_GAP;
      widest = Math.max(widest, shelf.width);
    }

    outer.resizeWithoutConstraints(widest + PAD * 2, shelfY - SECTION_GAP + PAD);
    outer.x = sectionX;
    outer.y = 0;
    sectionX += outer.width + SECTION_GAP;
    report.push(`${screen.section} · ${Math.round(outer.width)}×${Math.round(outer.height)}`);
  }

  // ── the cover, left of the first section ──
  let cover = page.children.find((n) => n.type === "FRAME" && /^Couverture/.test(n.name));
  if (cover) cover.remove();
  cover = coverBoard(figma, doc, version);
  cover.setSharedPluginData(NS, "generated", "1");
  page.appendChild(cover);
  cover.x = -(COVER_W + SECTION_GAP);
  cover.y = 0;

  // The old hand-made title card, which the cover replaces.
  const oldTitle = page.children.find((n) => n.type === "FRAME" && n.name === "09 · titre");
  if (oldTitle) oldTitle.remove();

  // ── what survived ──
  const reactions = [];
  for (const node of page.findAll(() => true)) {
    if (!("reactions" in node) || !node.reactions) continue;
    for (const r of node.reactions) reactions.push(r);
  }
  let dangling = 0;
  for (const r of reactions) {
    const to = r.actions && r.actions[0] && r.actions[0].destinationId;
    if (!to) continue;
    if (!(await figma.getNodeByIdAsync(to))) dangling++;
  }

  return { report, missing, reactions: reactions.length, dangling };
}

// Run with:
//
//   return await ensureKit(figma);
//   return await presentPage09(figma, { version: "v1" });
