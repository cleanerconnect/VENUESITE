# Phase 6 — Figma export

The Figma file that goes into the handover next to the running portal and
`docs/TARGET_SPEC.md`.

**File** — `LYFE Portail Partenaire`
`https://www.figma.com/design/fztoNaEvTrZrWDaLy1MEWg`
File key `fztoNaEvTrZrWDaLy1MEWg`. A new design file; the existing mobile
file was not touched.

**Status — complete.** Eight pages, 131 variables, 29 components,
175 variants, 62 frames. Everything was read from the running portal on
`:3210` and from the code, never from memory or an earlier phase report.

---

## 1. Variables — 6 collections, 131 variables

Read from `src/app/globals.css`, which is what `/styleguide#tokens`
renders. **Light mode only**: the code defines no dark mode, and there is
no `prefers-color-scheme` block anywhere in `globals.css`. Inventing one
here would have invented a product decision.

| Collection | Mode | Count | Notes |
|---|---|---|---|
| `Primitives` | Valeur | 24 | Raw hex. `scopes = []`, so they never appear in a picker. |
| `Couleur` | Clair | 62 | 43 semantic, aliased to `Primitives`; 19 `opacite/*` — see below. |
| `Espacement` | Valeur | 19 | The Tailwind steps the code actually uses. |
| `Rayon` | Valeur | 7 | Includes `rayon/chip`, added when the code gained `--radius-chip`. |
| `Typographie` | Valeur | 14 | 12 sizes + 2 families. |
| `Mouvement` | Valeur | 5 | 4 durations + the one curve. |

Every variable carries an explicit `scopes` array — none is left at
`ALL_SCOPES` — and every one carries WEB code syntax.

### The `opacite/*` variables, and why they exist

A tint in this codebase is *a token at an opacity*: `bg-violet/12`,
`bg-ink/[0.04]`. The obvious Figma expression is a variable-bound fill
with a paint opacity — and it renders correctly on a main component but
**silently reverts to full opacity in every instance of it**. Confirmed
by reading back: the main reports `opacity: 0.04`, an instance of it
reports `1`, with no override recorded on the instance.

So each needed tint is a variable whose own value carries the alpha, and
its code syntax is exactly what Tailwind v4 emits:

```
opacite/violet-12  →  color-mix(in oklab, var(--color-violet) 12%, transparent)
opacite/ink-4      →  color-mix(in oklab, var(--color-ink) 4%, transparent)
```

This is the same compromise `--color-tint-*` already makes in
`globals.css`, for the same reason: an alpha variant cannot alias a
solid token, because a Figma alias carries the whole colour including its
alpha. Nineteen of them cover `Pill`'s eleven tones, the nav active row,
the inactive filter pill, the `Switch` rail, the `Toast` badges, the
`MetricTile` icon chip and the translucent topbar.

Two other deliberate departures:

- **Elevation is three effect styles, not variables.** Figma variables
  are `COLOR | FLOAT | STRING | BOOLEAN`; there is no shadow type.
- **`Mouvement` variables have empty scopes.** No Figma property binds a
  duration, so they are documentation. Scoping them anywhere would put
  milliseconds in a corner-radius picker.

Two naming notes: Figma rejects `.` in a variable name, so Tailwind's
half-steps read `espace/0-5`, `espace/1-5`, `espace/2-5`, `espace/3-5`,
each with its real class in the description. And the eight type-scale
steps are literal sizes inside utility classes rather than custom
properties, so their code syntax is the class (`.text-h1`), not a
`var()` that does not exist; the four metric steps do have real
properties and use `var(--text-metric-md)`.

### Styles — 16

Named exactly as the utility classes, so a designer can grep either
direction: `text-display` `text-h1` `text-h2` `text-h3` `text-body`
`text-mono` `text-meta` `text-eyebrow` `text-metric-xl` `text-metric-lg`
`text-metric-md` `text-metric-sm` `font-serif-italic` ·
`shadow-soft` `shadow-lift` `shadow-deep`

---

## 2. Components — 29 components, 175 variants

One per file in `components/ui`, `components/forms`, `components/motion`
and `components/data`, named exactly as the file. Variant axes are the
code's props, not an invention.

| Component | Variants | Axes, from the props |
|---|---:|---|
| `Button` | 30 | `variant` ×5, `size` ×3, `state` Default·Disabled |
| `Card` | 36 | `variant` ×9, `size` ×4 |
| `Pill` | 22 | `tone` ×11, `dot` bool |
| `MetricTile` | 18 | `variant` ×9, `span` 1·2 |
| `ProgressBar` | 9 | `tone` ×3, `size` ×3 |
| `Input` | 8 | `state` Default·Focus·Filled·Error, `hint` bool |
| `SaveBar` | 5 | `state` ×5 (`SaveState`) |
| `Field` `PageHeader` `SideSheet` `Switch` `Textarea` | 4 each | see each description |
| `Chrome / Sidebar` | 3 | `configuration` restaurant·lounge·événements |
| `Skeleton` `Toast` | 3 each | `shape` ×3 / `tone` ×3 |
| `Dialog` `EmptyState` `FilterTabs` `Select` | 2 each | |
| `AnimatedNumber` `ChartTooltip` `ChipInput` `ChipSelect` `Chrome / BottomTabs` `Chrome / Topbar` `LivePulse` `PermissionDenied` `QueryError` `Tabs` | 1 each | |

**No literal values, verified rather than asserted.** An audit of every
`SOLID` fill in the file: `04 Espace partenaire` has **3,164 bound fills
and 0 unbound**; `02 Composants` has 810 bound and exactly **4** unbound
— `WhatsApp`, `Instagram`, `Facebook`, `X`, in the frame labelled
*Exception · couleurs de marque tierces*, carrying the code's own comment
verbatim:

> Third-party brand colours, deliberately literal. These are not design
> tokens and must not be themed — WhatsApp green is WhatsApp green.

Four decisions worth knowing:

- **`hover` is not a variant.** It is a CSS pseudo-state, not a prop, so
  `Button`'s matrix stops at 30 (`variant × size × Default|Disabled`) and
  hover lives in a separate non-component reference row, *Button ·
  survol*, showing the paint the code gives each variant on hover. Adding
  it as an axis would have made 45 variants and misdescribed the API.
- **`Card` ships 36 variants**, over the 30 the `figma-generate-library`
  skill recommends. Splitting one `variant` prop across two component
  sets would have misrepresented the API; 36 is not an explosion.
- **`glow`** is a boolean on `Card`, not a variant — 72 variants for one
  gradient is not worth it. It gets a reference frame, *Card · glow*.
- **Three exports have no visual form** and are documented rather than
  drawn, in the note *Sans forme visuelle*: `Stagger` and `StaggerItem`
  (they pass Motion variants and paint nothing) and `QueryState` (a
  dispatcher — its composition is what `06 États` shows). The composed
  skeletons from `Skeleton.tsx` — `PageHeaderSkeleton`,
  `MetricTileSkeleton`, `KpiGridSkeleton`, `EntityListSkeleton`,
  `ChartSkeleton`, `FormSkeleton` — are likewise shown assembled on
  `06 États` rather than duplicated as components.

The three `Chrome / *` components are not in `components/ui`; they come
from `components/organizer/` (`Sidebar.tsx`, `Topbar.tsx`,
`BottomTabs.tsx`) and every screen frame is built from instances of them.

---

## 3. Frames — 62, by page

Eight real pages, in the brief's order. Frame name is the route path then
the French title, so a designer finds any screen by searching its path.

| Page | Frames |
|---|---|
| `00 Lisez-moi` | 1 — what the file is, how it maps to the repo, the naming rules, links to `/styleguide` and `docs/TARGET_SPEC.md` |
| `01 Fondations` | 1 board, 14 specimen blocks |
| `02 Composants` | 29 components + 3 reference frames |
| `03 Entrée` | 3 |
| `04 Espace partenaire` | 30 + 1 annotated delta, in 10 sections |
| `05 Espace organisateur` | 16, in 2 sections |
| `06 États` | 4 |
| `07 Téléphone` | 9 |

**`03 Entrée`** — `/login`, `/splash`, `/contact`. Built without the
shell, because the code puts them outside it.

**`04 Espace partenaire`** — the thirty screens, wrapped in ten Figma
sections named for the ten nav groups of `src/lib/nav/workspaces.ts`, in
its order: Aujourd'hui, En service, Clients, Ma présence, Croissance, Vie
nocturne, Paiements, Pilotage, Établissement, Compte.

The six rows whose index status is `service` carry a margin note with the
`dependsOn` text **verbatim from `src/lib/nav/routes.ts`**:
`/restaurant/menu`, `/restaurant/avis`, `/restaurant/acomptes`,
`/restaurant/bilans`, `/restaurant/campagnes`,
`/restaurant/notifications`.

**Lounge is a delta, not a second set.** Restaurant is the base. Only the
three Vie nocturne screens are drawn in the lounge configuration (marked
`[lounge]`, with the ten-group sidebar), plus one annotated frame —
*Configuration lounge · le delta, et rien de plus* — covering the group
that appears, the vocabulary swap and the two extra Ma fiche fields.
Thirty screens are not duplicated.

**`05 Espace organisateur`** — the sixteen event screens in two sections,
Organisation and Compte. The six `partial` rows carry their `gap` text
verbatim, in a differently-coloured note: `partial` is work this repo
owes, `service` is an integration nobody has connected, and conflating
them is what the third status value exists to prevent.

**`06 États`** — four compositions, not four frames per screen. Loading
shows `Skeleton` assembled into `PageHeaderSkeleton`,
`MetricTileSkeleton` ×4 and `EntityListSkeleton` ×5 rows; empty shows
`EmptyState`; error shows `QueryError` at both sizes; denied shows
`PermissionDenied`. Each carries a `?etat=` note, and the denied frame
says plainly that it is *not* a `?etat=` — it comes from the role, not
the data.

**`07 Téléphone`** — the spec's seven phone-first screens at 390
(Accueil, Réservations, Liste d'attente, Check-in, Briefing, Guest list,
Tables minimums), each with the bottom tab bar and the raised *Arrivées*
centre tab, which carries a command rather than an `href` because a host
checking a guest in should not lose their place.

---

## 4. What could not be represented, and why

Three of the 52 rows in the route index have no 1440 frame, each for a
stated reason rather than an omission:

| Row | Why |
|---|---|
| `/styleguide` | It *is* the design system. `01 Fondations` and `02 Composants` are its Figma expression; a frame of it would be a screenshot of what the file already is. Noted in `00 Lisez-moi`. |
| `/plus` | Mobile overflow only — `docs/INTERFACE.md` puts it below `md`. It has no desktop form, so it is on `07 Téléphone` at 390. |
| `/more` | Same. |

Two fidelity limits, both in Figma rather than the portal:

- **`Fraunces` at weight 500 italic has no static Figma instance.**
  `.font-serif-italic` asks for 500; Figma offers `Italic` (400) and
  `SemiBold Italic` (600). A browser interpolates the variable font,
  Figma cannot. The text style uses `Italic` and its description says so.
  This is the single reserve recorded in `00 Lisez-moi`.
- **Section bodies are titled containers, not populated tables.** Each
  screen's blocks are real `Card` instances carrying the section's real
  heading at its real height, but the rows, charts and table cells inside
  them are not redrawn cell by cell. Instances are structurally sealed in
  Figma — you cannot append into one — so populating them would have
  meant abandoning library instances for detached copies, which the brief
  forbids and which would rot the moment a component changed.

---

## 5. Écarts constatés

### Fixed in the code before this file was built

Eight were found while reading the code against the documents during the
foundations pass, and fixed at the source rather than mirrored here — see
`git log` for "Make the no-literals rule true". Briefly: `Card`'s
`gold-soft` and `ProgressBar`'s `gold` both painted another variant's
colour and are gone; `Pill`'s eleven `rgba()` tones are token classes and
its stray `rgba(107,78,168)` violet is gone; twenty-six inline
`rounded-[12px]` became `--radius-chip`; `EmptyState` stops drawing a
gold circle; `--spacing` is now a declared token with a specimen; and two
comments that were lying (`Input`'s "gold focus ring", `globals.css`'s
"gold lives only inside the wordmark") now match the code. The sweep went
wider than the audit: 33 rgba literals across 21 files, and one new token
(`--color-on-ink-cool`) for a hero glow that matched nothing.

A ninth was found in the same pass: `routes.ts` pointed at
`/events/evt_jazz_2026`, an id no dataset contains, so both event-detail
rows were 404s wearing an HTTP 200. Fixed to `evt_jzb_robbie`, and
`tools/verify/events.mjs` now walks the event side so it cannot recur.

### Found during this phase, reproduced as-is, still open

Three more surfaced while extracting the lounge configuration — after the
fixes above. The brief says to reproduce rather than improve, so the
frames show them as they are, and they are annotated on the lounge delta
frame where a designer will meet them. **None is fixed in the code.**

1. **The Accueil subtitle ignores the configuration.**
   `src/lib/db/overview-store.ts:426` hardcodes
   `"${bookedCovers} couverts réservés, …"` and never reads
   `venue_settings.configuration`. Nomad Rooftop, a lounge, therefore
   says "38 couverts réservés" on its home screen while its own KPI tiles
   say "Personnes". Visible on `/restaurant` in the lounge configuration.
2. **French agreement is wrong in the feminine plural.**
   `src/lib/restaurant/screens.ts:173` and `:620` concatenate a masculine
   participle after `vocabulary.cover.many`, yielding "Personnes arrivés"
   and "Personnes réservés" where French wants "arrivées" and
   "réservées". Visible on the Accueil and Réservations tiles in the
   lounge configuration.
3. **`Button` sizes its text off-scale.** `components/ui/Button.tsx`
   writes `text-[13px]`, `text-[14px]` and `text-[15px]` as arbitrary
   values; 15px matches no step in the type scale. The Figma `Button`
   reproduces all three and its description says so. This is a font-size
   literal, so it is the one place the README's rule is still aspirational
   rather than true.

The first two are one fix each and both are in the vocabulary seam that
`configFor()` exists to own. The third is a decision — either 15px joins
the scale as a token, or `size=lg` drops to 14px.

---

## 6. Confirmations the brief asked for

**Can a designer opening the file cold find any screen from its route
path?** Yes. Every frame is named `‹route path› · ‹French title›`, so
`/restaurant/liste-attente` finds *Liste d'attente* by search. All 30
partner screens sit in sections named for the same ten nav groups the
sidebar shows, in the same order, so the file can also be navigated the
way the product is. The three rows with no desktop frame are listed in §4
with where they went instead.

**Can any component in the file be traced to a file in the repo by
name?** Yes. Every component is named exactly as its source file —
`Button` → `components/ui/Button.tsx`, `QueryError` →
`components/data/QueryState.tsx`, `Chrome / Sidebar` →
`components/organizer/Sidebar.tsx` — and each carries a description
naming the file and explaining what its axes mean. Variant properties use
the code's prop names (`variant`, `size`, `tone`, `shape`, `state`).
Text styles and effect styles are named after their utility classes.
Variables use the token name without the `--color-` prefix, and every one
carries the exact CSS it stands for as its code syntax.

---

## 7. How this was produced

Read from the running portal, not from memory. `tools/verify/extract.mjs`
walks every route in `src/lib/nav/routes.ts` in a real browser, in both
configurations, and dumps each screen's real headings, KPI labels and
values, filter facets and actions to `docs/phase6-screens.json`. Every
piece of French copy in the file comes from there, verbatim. Re-run it
after changing a screen and the copy to update is in the diff.

```bash
node tools/verify/extract.mjs                                   # restaurant
VENUE=bar_nomad_casa OUT=lounge.json node tools/verify/extract.mjs   # lounge
```

State ledger: `docs/phase6-figma-state.json` — file key, page and section
ids, collection ids, and the open findings from §5.

Two Figma behaviours cost real time and are worth knowing before
extending this file:

- **A `use_figma` script is all-or-nothing.** A throw rolls back
  everything the script did, including work before the failing line.
- **Paint opacity does not survive instance inheritance** when the fill
  is bound to a variable. Use an `opacite/*` variable, never a paint
  opacity, for anything that will be instanced.
