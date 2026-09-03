# Phase 6 — Figma export

The Figma file that goes into the handover next to the running portal and
`docs/TARGET_SPEC.md`.

**File** — `LYFE Portail Partenaire`
`https://www.figma.com/design/fztoNaEvTrZrWDaLy1MEWg`
File key `fztoNaEvTrZrWDaLy1MEWg`. A new design file; the existing mobile
file was not touched.

**Status — incomplete, blocked on the Figma plan.** Foundations are built
and correct. The component library, the screen frames, the state frames
and the phone frames are not. §1 says exactly why, §5 is the remaining
plan, and §6 is what it costs to finish.

---

## 1. The two limits that stopped this

Both are properties of the Figma account, not of the work.

### Twenty MCP tool calls per month

The account (`hamid.fennice@gmail.com`, plan `Abdelhamid Fenniche's team`)
is on **Figma Starter**. From Figma's own `rate-limits-access.md`,
served by the MCP server:

> Starter — up to 20/month.

Only three tools are exempt: `add_code_connect_map`, `create_new_file`,
`whoami`. **`use_figma` is not exempt**, and `use_figma` is the only tool
that can write a variable, a component or a frame. Reading the file back
(`get_screenshot`, `get_metadata`) also counts.

Twenty calls bought Phase 0 and Phase 1. The call that would have
verified the Fondations page visually was the one refused, so **the
foundations are structurally confirmed by their return values but have
not been seen**. That is the one piece of unvalidated work in the file
and it should be eyeballed before anything is built on top of it.

The `figma-generate-library` skill, which governs this kind of build,
states the shape of the job plainly:

> **This is NEVER a one-shot task.** Building a design system requires
> 20–100+ `use_figma` calls across multiple phases.

Thirty venue screens, sixteen event screens, three entry screens, a
component library of twenty-five components with variant sets, four
state compositions and seven phone frames is at the top of that range,
not the bottom. A month's budget is one afternoon of it.

### Three pages per file

```
Error: in createPage: The Starter plan only comes with 3 pages.
```

The brief asked for eight pages. The eight divisions are therefore
delivered as **Figma Sections**, under the brief's exact names, three
pages carrying them:

| Page | Sections it carries |
|---|---|
| `A · 00 Lisez-moi + 01 Fondations + 02 Composants` | `00 Lisez-moi`, `01 Fondations`, `02 Composants` |
| `B · 03 Entrée + 04 Espace partenaire + 05 Espace organisateur` | `03 Entrée`, `04 Espace partenaire`, `05 Espace organisateur` |
| `C · 06 États + 07 Téléphone` | `06 États`, `07 Téléphone` |

Section names are searchable and appear in the layers panel, so "find a
screen from its route path" still works. On a Professional plan each
section becomes a page with one script — the sections are already named
for their destination pages, so it is a move, not a rebuild.

---

## 2. What is in the file

### Variables — 6 collections, 109 variables

Read from `src/app/globals.css`, which is what `/styleguide#tokens`
renders. Light mode only: the code defines no dark mode, and there is no
`prefers-color-scheme` block anywhere in `globals.css`.

| Collection | Mode | Count | Notes |
|---|---|---|---|
| `Primitives` | Valeur | 23 | Raw hex. `scopes = []`, so they never appear in a picker. |
| `Couleur` | Clair | 42 | Aliased to `Primitives`. Code syntax `var(--color-…)`. |
| `Espacement` | Valeur | 19 | Tailwind steps the code actually uses. |
| `Rayon` | Valeur | 6 | `var(--radius-…)`. |
| `Typographie` | Valeur | 14 | 12 sizes + 2 families. |
| `Mouvement` | Valeur | 5 | 4 durations + the one curve. |

Every variable carries an explicit `scopes` array — none is left at
`ALL_SCOPES` — and every one carries WEB code syntax.

Three deliberate departures, each for a reason in the platform rather
than in the code:

- **The five `tint-*` colours hold raw values, not aliases.** They are
  alpha variants of `violet` and `danger`, and a Figma alias carries the
  whole colour including its alpha, so there is nothing to alias to.
  Same for `chart-cursor` and `chart-reference`.
- **Elevation is three effect styles, not variables.** Figma variables
  are `COLOR | FLOAT | STRING | BOOLEAN`; there is no shadow type. The
  brief listed elevation among the variables, and this is the closest
  faithful expression.
- **`Mouvement` variables have empty scopes.** No Figma property binds a
  duration, so they are documentation. Scoping them anywhere would put
  milliseconds in a corner-radius picker.

Two naming notes for whoever extends this:

- Figma rejects `.` in a variable name, so Tailwind's half-steps read
  `espace/0-5`, `espace/1-5`, `espace/2-5`, `espace/3-5`. Each one's
  description carries its real class (`gap-1.5`, `p-1.5`, …).
- The eight type-scale steps are literal sizes inside utility classes,
  not CSS custom properties. Their code syntax is therefore the class
  (`.text-h1`), not a `var()` that does not exist. The four metric steps
  do have real properties and use `var(--text-metric-md)`.

### Styles — 16

Named exactly as the utility classes in `globals.css`, so a designer can
grep either direction.

`text-display` · `text-h1` · `text-h2` · `text-h3` · `text-body` ·
`text-mono` · `text-meta` · `text-eyebrow` · `text-metric-xl` ·
`text-metric-lg` · `text-metric-md` · `text-metric-sm` ·
`font-serif-italic`

`shadow-soft` · `shadow-lift` · `shadow-deep`

### `01 Fondations`

One specimen block per scale, in the order `/styleguide#tokens` shows
them, every swatch fill **bound to its variable** rather than filled
with a literal:

Encre et texte (5) · Accent (7) · Surfaces (4) · Teintes de carte (5) ·
Sémantique (4) · Traits (3) · Data visualisation (12) · Hors styleguide
(2) · Échelle typographique (8) · Échelle des chiffres (4 + the serif
line) · Rayons (6) · Ombres (3) · Espacement (19) · Mouvement (4).

The colour groups mirror the styleguide's own grouping. Two blocks go
beyond it, and say so on the canvas: **Data visualisation** includes
`chart-track`, `chart-cursor` and `chart-reference`, and **Hors
styleguide** holds `sand` and `sky` — all five are declared in
`globals.css` and used by the Analyses and Bilan donuts, but the
styleguide's swatch groups omit them. The code wins.

**Espacement** exists only in Figma. `/styleguide` renders no spacing
specimen because the portal has no spacing tokens to render — see
Écart 7.

---

## 3. Écarts constatés

Reproduced as found, not corrected. Each belongs in `00 Lisez-moi` under
this heading when that section is written.

1. **`Card` variant `gold-soft` is `bg-violet-soft`.** Identical in
   appearance to the `violet-soft` variant. Two names, one surface.
   `src/components/ui/Card.tsx`
2. **`ProgressBar` tone `gold` is `bg-violet`.** Identical to tone
   `violet`. `src/components/ui/ProgressBar.tsx`
3. **Gold is not only in the wordmark.** `globals.css` says "Gold lives
   only inside the wordmark SVG now", but `EmptyState`'s `DefaultMark`
   fills its inner circle with `var(--color-gold)`.
   `src/components/ui/EmptyState.tsx`
4. **`Pill` hardcodes eleven `rgba()` literals** instead of reading
   tokens, and tone `violet` uses `rgba(107,78,168,0.12)` — which is not
   `--color-violet` (`134,91,166`). It is the only place that colour
   appears. `src/components/ui/Pill.tsx`
5. **A literal `rounded-[12px]`** in `MetricTile`'s icon chip and
   `QueryError`'s icon chip, between `radius-sm` (10px) and `radius-md`
   (14px). Both bypass the radius scale.
6. **`Input`'s comment says "gold focus ring".** The ring is violet —
   `globals.css` `*:focus-visible` uses `rgba(134,91,166,0.42)`. Stale
   comment, correct code.
7. **There is no spacing token layer.** `globals.css` declares colour,
   radius, shadow, font, metric sizes and motion, but no spacing. The
   portal inherits Tailwind v4's default 4px scale, and the styleguide
   renders no spacing specimen, so this is the one scale in the Figma
   file with no counterpart on `/styleguide`.
8. **`Fraunces` at weight 500 italic has no static Figma instance.**
   `.font-serif-italic` asks for `font-weight: 500` + italic; Figma
   offers `Italic` (400) and `SemiBold Italic` (600). The text style uses
   `Italic` and its description says so. A browser interpolates the
   variable font; Figma cannot.

Items 1–5 all contradict `README.md`'s rule "No hex literals. A new
colour is a token in `globals.css` and a role name." Per the brief the
code wins and the document is wrong — none of them was changed.

---

## 4. What could not be represented, and why

Nothing was blocked by the portal. Everything below is the plan limit.

| Brief item | State |
|---|---|
| `02 Composants` — the component library | Section exists, empty |
| `03 Entrée` — 3 frames | Not started |
| `04 Espace partenaire` — 30 frames | Not started |
| `05 Espace organisateur` — 16 frames | Not started |
| `06 États` — 4 compositions | Not started |
| `07 Téléphone` — 7 frames at 390 | Not started |
| `00 Lisez-moi` | Section exists, empty. Its content is §1–§3 of this file. |
| Eight pages | Three pages + eight named sections (§1) |

Two routes in the index have no natural home among the brief's eight
sections, and a decision is owed either way:

- **`/styleguide`** is the design system itself. `01 Fondations` and
  `02 Composants` *are* its Figma expression, so a frame of it would be
  a screenshot of the thing the file already is. Recommend a note in
  `00 Lisez-moi` rather than a frame.
- **`/plus` and `/more`** are the phone overflow sheets — per
  `docs/INTERFACE.md` they only exist below `md`. They belong on
  `07 Téléphone` at 390, not among the 1440 desktop frames, even though
  the brief's phone list does not name them.

---

## 5. The remaining plan

Ordered, with the counts each step owes, so it can be picked up cold.
Task IDs continue the `P{phase}.{step}` scheme already used.

**P2 — `02 Composants`.** One component per file in
`src/components/ui` (18), `forms` (3 files → 4 components: `ChipSelect`,
`ChipInput`, `Field`, `SaveBar`), `motion` (3), `data` (1 file → 3
components: `QueryState`, `QueryError`, `PermissionDenied`). Variant
properties taken from the props, not invented:

| Component | Variant properties from code |
|---|---|
| `Button` | `variant` primary·secondary·destructive·ghost·ink × `size` sm·md·lg, booleans `iconLeft` `iconRight` `fullWidth` `disabled` |
| `Card` | `variant` ×10 (surface, ink, sand, sky, sage, rose, peach, gold-soft, violet-soft, canvas-2) × `size` sm·md·lg·hero, boolean `glow` |
| `Pill` | `tone` ×11 (live, pending, draft, past, rejected, info, violet, success, warning, danger, neutral), boolean `dot` |
| `MetricTile` | `variant` = CardVariant, `span` 1·2, booleans `icon` `meta` `footer` |
| `Input` | booleans `prefix` `suffix`, state default·focus·error, boolean `hint` |
| `Textarea` | state default·error, booleans `hint` `count` |
| `Select` | booleans `label` `hint` |
| `Switch` | `checked` × `disabled`, booleans `label` `description` |
| `ProgressBar` | `tone` gold·violet·ink·success × `size` xs·sm·md |
| `Skeleton` | `shape` line·card·circle |
| `Toast` | `tone` success·info·danger |
| `EmptyState` | booleans `description` `cta` `illustration` |
| `PageHeader` | booleans `subtitle` `badge` `eyebrow` `action` |
| `FilterTabs` / `Tabs` | boolean `count` per tab, selected state |
| `SideSheet` | `titleStyle` plain·editorial, booleans `description` `headerExtra` `footer` |
| `Dialog` | `size` md·lg, booleans `description` `footer` |

Cap the matrix per the skill's rule: `Card` at 10 × 4 is 40
combinations, over the 30 ceiling — split `size` into a separate
padding-only property or drop `hero` to a boolean. `Pill` at 11 × 2 = 22
is fine.

Icons are `lucide-react`. Import each SVG with
`figma.createNodeFromSvg` from the package source and expose one
`INSTANCE_SWAP` property — never a variant per icon.

The **third-party brand colours stay literal**, as a labelled exception,
matching the code's own comment at
`src/components/event/PromoteTab.tsx:402`:

> Third-party brand colours, deliberately literal. These are not design
> tokens and must not be themed — WhatsApp green is WhatsApp green.

WhatsApp `#25D366` · Instagram `#E1306C` · Facebook `#1877F2` ·
X `#0F0F0F`.

**P3 — screens, 1440 wide, from the running portal.** Group by the ten
venue nav groups in `src/lib/nav/workspaces.ts` and the two event ones.
Frame name = route path + French title, e.g.
`/restaurant/liste-attente · Liste d'attente`.

The six venue rows whose status is `service` need a margin note with the
`dependsOn` text **verbatim from `src/lib/nav/routes.ts`** — do not
paraphrase: `/restaurant/menu`, `/restaurant/avis`,
`/restaurant/acomptes`, `/restaurant/bilans`, `/restaurant/campagnes`,
`/restaurant/notifications`. Six event rows are `partial` and carry a
`gap` string instead: `/events/new`,
`/events/evt_jazz_2026/edit`, `/visibilite`, `/promo-codes`, `/scanner`,
`/team`.

**Lounge is a delta, not a second set.** Restaurant is the base. Add
only the three Vie nocturne screens (`/restaurant/guest-list`,
`/restaurant/tables`, `/restaurant/promoteurs`) plus one annotated frame
for the vocabulary swap (couverts→personnes, service→créneau) and the
extra Ma fiche fields. Thirty screens are not duplicated.

**P4 — `06 États`.** Four compositions, not four frames per screen, each
showing how the shared components compose: `Skeleton` family for
loading, `EmptyState` for empty, `QueryError` for error,
`PermissionDenied` for denied. Note `?etat=chargement|vide|erreur` on
the section.

**P5 — `07 Téléphone`.** 390 wide: Accueil, Réservations, Liste
d'attente, Check-in, Briefing, Guest list, Tables minimums — plus the
bottom tab bar and the raised check-in tab. `/plus` and `/more` per §4.

**P6 — completion report.** Frame inventory by section with route paths;
this file becomes that report.

---

## 6. What it costs to finish

| | Now | Needed |
|---|---|---|
| Plan | Starter | Professional or above |
| Seat | View | **Full or Dev** |
| Tool calls | 20 / month | 200 / day |
| Pages per file | 3 | unlimited |

A Full or Dev seat on Professional is the smallest change that unblocks
everything: 200 calls a day makes the remaining ~120 calls a single
session, and unlimited pages turns the eight sections into the eight
pages the brief asked for.

Note that a View seat on **Organization or Enterprise** is *worse* than
Starter for this purpose — six calls a month. The seat matters more than
the plan.

Nothing else is blocking. The portal is complete and running, the token
layer is read and expressed, the component inventory and every variant
property is enumerated in §5, and the state ledger below survives a
cold start.

---

## 7. Resuming

State ledger: `docs/phase6-figma-state.json` — file key, page and section
IDs, collection IDs, the `Écarts constatés` list, and which `P{n}.{step}`
IDs are done.

Order of operations, per the brief and non-negotiable: load the Figma
skills `figma-create-new-file`, `figma-use`, `figma-generate-library`,
`figma-generate-design` **before any Figma write**.

Then, before building on it, spend one call on
`get_screenshot` of node `11:2` — the Fondations wrapper — because it is
the only thing in the file that was written but never seen.

Two rules that shaped every decision above and should keep shaping them:

> Read from the running portal and the code, never from memory or from
> earlier phase reports. If a component or screen differs from what a
> document says, the code wins and the document is wrong.

> Every frame uses library instances and variables. If you find yourself
> drawing a rectangle with a hex fill, stop and find the component.
