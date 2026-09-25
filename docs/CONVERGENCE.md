# Convergence report — one portal, not two dashboards

The portal grew as two workspaces built at different times: the event
side first, the venue side after. They solved the same problems twice
and had begun to drift. This is the audit of where, what won, and what
is still open.

The rule used throughout: **where the event dashboard is the more mature
one, it is the reference.** Where the venue side had genuinely learned
something the event side had not — the spec engine, the repository seam,
the typed slug registry — that direction wins instead, and the report
says so explicitly.

---

## 1. Where they solved the same problem twice

| # | Problem | Event side | Venue side | Winner | Status |
|---|---|---|---|---|---|
| 1 | Side panel | `audiences/Drawer` | `dashboard/DetailDrawer` | **New `ui/SideSheet`** — both were the same shell pasted twice | Done |
| 2 | KPI tile | `cards/StatTile` | `kpi-grid` block's private `Tile` | **New `ui/MetricTile`** — slot-based frame both compose | Done |
| 3 | Filter row | `/events`, `/promo-codes` | `entity-list` block, settings | **New `ui/FilterTabs`** | Done |
| 4 | Page header | 9 hand-written headers | 2 hand-written headers | **New `ui/PageHeader`** | Done |
| 5 | Chart appearance | 4 recharts wrappers | 2 recharts wrappers | **New `lib/charts/theme.ts` + `ui/ChartTooltip`** | Done |
| 6 | Value formats | `MAD`/`COUNT` in `screens.ts` | same literals in `operations.ts`, `crm.ts` | **New `lib/dashboard/formats.ts`** | Done |
| 7 | Chrome commands | inline `if` chain in `Topbar` | inline `if` chain in `BottomTabs` | **New `lib/nav/chrome-commands.ts`** | Done |
| 8 | Loading state | none | none | **New `ui/Skeleton`** + `loading.tsx` | Done (venue routes) |
| 9 | Error state | none | none | **New `(organizer)/error.tsx`** | Done |
| 10 | Door duty | `ScannerModal`, raised centre tab | nothing — the slot was empty | **Venue side gains `CheckInSheet`**, same raised-tab pattern | Done |
| 11 | Data source | fixtures in `lib/mock/*` | SQLite via the repository seam | **Venue side** — the repository seam | **Open** (see §4) |
| 12 | Screen definition | hand-written JSX pages | `ScreenSpec` builders + renderer | **Venue side** — the spec engine | **Open by design** (see §4) |

### 1 · Side panel

Two files carried a byte-for-byte copy of the same Radix dialog: right
panel above `md`, bottom sheet below, 460px, `x: "8%"` entry, backdrop
blur. They had already drifted — `/audiences` used a serif title and a
sticky `canvas-2` footer, the spec drawer a sans H2 and a plain one.

`ui/SideSheet` is the surviving shell. It owns the surface, the motion
and the three dismiss affordances and nothing else; `titleStyle`
preserves the editorial title where `/audiences` wanted it. `DetailDrawer`
shrank to wiring, and the part that renders a `DetailSpec` moved to
`dashboard/DetailBody` so it can appear inline, in print, or in the
styleguide without dragging a drawer along. `audiences/Drawer` stays as a
deprecated alias so its four call sites did not all have to move in the
same commit.

### 2 · KPI tile

`StatTile` took `(value, delta, hint)`; the block's `Tile` took a spec.
Both drew the same card. They had drifted on the icon chip (`h-9 w-9`
with and without `shrink-0`) and on whether the hint could sit beside a
sparkline.

`ui/MetricTile` is the frame. It is deliberately **slot-based, not
data-shaped**: it knows about a label, an icon, a value, a meta line and
a footer, and nothing about `Metric`, `Delta` or any spec type. That is
what keeps the spec vocabulary from leaking into the design system, and
what lets the styleguide render it with literal children.

### 3 · Filter row

Four implementations of the count-badged row with the sliding violet
underline; three of them character-identical, one (`/promo-codes`) with
`py-3` instead of `py-3.5` for no stated reason. One `ui/FilterTabs`,
controlled, with a required `layoutId` so two rows on one page cannot
fight over the shared-layout animation.

It is deliberately **not** merged with `ui/Tabs`. `Tabs` owns its panels
and is for moving between views; `FilterTabs` renders no content and only
narrows a list. Collapsing them would have produced a component with two
modes and one confusing API.

### 4 · Page header

Eleven headers, three values for the gap under the title, two opinions on
whether the right-hand action aligns to the title or the subtext, and one
page that had lost the subtitle colour entirely. Nine moved to
`ui/PageHeader`.

Two did not, and should not: the `/dashboard` greeting hero and the
`/visibilite/[id]` campaign header are different compositions — a dark
editorial opener and a badge-and-breadcrumb cluster — not the same header
styled differently. Forcing them through one component would have meant
four escape-hatch props.

### 5 · Charts

Six chart implementations, each declaring its own axis grey (three
different values), grid dash (two patterns), tick size and floating
tooltip div (two paddings, two title treatments). `lib/charts/theme.ts`
now holds the grid, axis, cursor and series props; `ui/ChartTooltip` is
the one tooltip shell.

This removed the largest cluster of hex literals in the codebase. See §2.

### 7 · Chrome commands

A nav entry names a command rather than carrying a handler, so
`workspaces.ts` stays plain data. Both the topbar and the bottom tabs
kept their own inline `if (command === …)` chain to resolve those names,
and they had diverged on the fallback: the topbar opened the assistant
for anything it did not recognise, the tabs did nothing.
`lib/nav/chrome-commands.ts` is now the one resolver, and an unknown
command warns rather than opening something arbitrary.

### 8–9 · Loading and error

Neither workspace had either. Every route rendered nothing until its data
arrived — which on a phone mid-service reads as a broken app — and a
repository throw reached the raw Next error page.

`ui/Skeleton` ships shape-matched placeholders for the four layouts the
portal actually loads into (header, KPI grid, entity list, form) plus a
chart. Shape-matched matters: a skeleton that does not match what follows
causes a jump on load, which is worse than a spinner. `LoadingRegion`
carries the screen-reader announcement so the shapes themselves stay
`aria-hidden`.

`(organizer)/error.tsx` catches the typed `RepositoryError` and shows one
honest sentence plus a retry, instead of a blank dashboard a partner would
read as "no bookings today". The digest is shown deliberately: it is the
only handle a partner can give support, and it leaks nothing.

---

## 2. Tokens

Before: 63 hex literals, 15 inline `fontSize` values, and a scatter of
one-off `rgba()` calls across components.

After: **every colour in the app resolves to a token.** Added to
`globals.css`:

- `--color-series-1..6` — the chart palette, named by role and ordered so
  adjacent series stay distinguishable at 2px stroke.
- `--color-chart-axis / -grid / -track / -cursor / -projection / -reference`.
- `--color-on-ink`, `--color-on-ink-mute`, `--color-violet-on-ink` — the
  on-dark counterparts. Text on `surface-ink` needs its own values; the
  light-surface tokens do not survive there, which is why those three
  literals had appeared inline in the first place.
- `--text-metric-sm|md|lg|xl` and the matching utility classes, replacing
  the inline `fontSize: 44` / `fontSize: 36` on every large figure.
- `--ease-out-expo` and `--duration-instant|fast|base|slow`. One curve,
  four steps; a transition picks a step rather than inventing a number.

Four literals remain, all in `PromoteTab`: WhatsApp, Instagram, Facebook
and X brand colours, hoisted into a named constant with a comment saying
they are third-party brand values and must not be themed. That is the
correct answer, not a gap — WhatsApp green is WhatsApp green.

---

## 3. Scope correction

The venue workspace had grown features LYFE does not deliver. A partner
seeing a feature we do not ship is worse than not showing it, so these
were removed rather than stubbed:

| Removed | Where it lived |
|---|---|
| Floor plan | `floor-plan` block, `FloorPlanBlock`, `dining_tables` table, `DiningTable`/`TableState`, the "salle" screen, table assignment on reservations |
| Food costing | `MenuItem.foodCostMad`, `itemMargin()`, `averageMargin()` |
| Kitchen state | `item_86` activity type, `menu.item_86` integration event |
| Service-system metrics | `Service.walkInCovers`, `Service.avgTurnMinutes` |

And one concept was **reframed rather than deleted**, because the
underlying event is real and app-facing: `seated` → `arrived` across the
reservation lifecycle, the DB check constraint, the badge vocabulary and
the integration events. `Service.seatedCovers` → `arrivedCovers`. The
store's `seatReservation`/`clearTable` became `markArrived`;
`seatNextWaiting` became `admitNextWaiting`, which promotes the head of
the waitlist to a confirmed booking against remaining service capacity.
The venue checks a guest in. It does not seat them.

Zones survived for the same reason: a guest asking for the terrace when
they book is an app-facing preference, not a floor layout. Reservation
rows and details now show the requested area instead of a table code.

Four things the app shows that the portal could not edit were added —
price band, search keywords, facilities, ambience — plus a menu listing
editor. See `docs/APP_MAPPING.md`.

---

## 4. Still open

**11 · The event workspace still reads fixtures.** Twelve modules under
`src/lib/mock/*` and 22 components import them directly. Phase 2 moved
the venue workspace behind the repository seam and onto a real database;
the event side never went through that pass. Every component in
`ui/`, `forms/`, `dashboard/` and `restaurant/` is now free of data-layer
imports — the remaining 22 are all in `event/`, `cards/`, `audiences/`,
`promoCodes/`, `visibility/` and `organizer/`. The two under `settings/`
are `import type` only.

This is the largest remaining convergence gap and the one with the most
leverage: the seam already exists, so the work is moving each fixture
module behind a repository method and deleting it, exactly as
`mock-repository.ts` did for the venue side.

**12 · Two ways of defining a screen.** The venue workspace is a spec
engine — pure builders returning a `ScreenSpec`, rendered by a block
registry, serialisable as JSON so specs could arrive from a backend. The
event workspace is hand-written JSX pages.

This one is listed as open **but is not obviously wrong to leave**. The
spec engine pays for itself where screens are numerous, similar and
data-shaped, which describes the venue workspace exactly. The event
detail page is one deep, bespoke, seven-tab screen; expressing it as
blocks would mean inventing block types with one call site each. The
recommendation is to converge the *primitives* (done) and let the two
composition strategies coexist, revisiting only if the event side grows
a second screen of the same shape.

**Copy.** 501 French literals remain inline across 81 files, almost all
one-off headings in event workspace pages. See `docs/HANDOFF.md` §5 for
the rule on which ones move.

**Loading states** exist on the venue routes, which are the only async
ones today. Every event route becomes async the moment a real backend is
behind it; the skeletons are built and the pattern is documented, but the
`loading.tsx` files for those routes are not written yet.
