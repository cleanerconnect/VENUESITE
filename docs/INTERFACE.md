# Interface document

How the portal is put together, for someone who has to extend it without
having watched it get built. Six sections: layout, navigation, roles,
naming, responsive behaviour, copy.

The live counterpart to this file is **`/styleguide`**. This document
says why; that route shows what. When they disagree, the route is right.

---

## 1. Layout

One shell, two workspaces inside it.

```
app/
├─ (organizer)/          ← the shell: sidebar, topbar, bottom tabs
│  ├─ layout.tsx            resolves the session and the active workspace
│  ├─ error.tsx             one boundary for every route in the group
│  ├─ dashboard/ events/ audiences/ …      event workspace
│  └─ restaurant/                          venue workspace
│     ├─ [[...section]]/    every spec screen, one route
│     ├─ reglages/          the write surface
│     └─ loading.tsx
├─ login/ splash/ contact/ styleguide/     outside the shell
└─ api/                    assistant, assets, webhooks, session
```

**Page anatomy**, in order, every route:

1. `PageHeader` — title, one line of subtext, at most one right-hand action.
2. The screen's own content, in a `space-y-5 md:space-y-7` stack.
3. `SaveBar`, sticky at the bottom, on any route that writes.

**Card is the unit of composition.** Content sits in a `Card`, not on the
canvas. Ten variants, but the discipline is: `surface` by default,
**one** `ink` card per screen at most, tints (`sand`, `sky`, `sage`,
`rose`, `peach`) to group KPI tiles, and `violet-soft` reserved for
assistant output. A violet-soft card that is not the assistant speaking
trains partners to ignore the one that is.

**Shadows are earned.** `shadow-soft` on hover for something clickable,
`shadow-deep` on a floating surface. A resting card has a hairline
border and no shadow.

### The spec engine

The venue workspace does not have a file per screen. A screen is a pure
function `(context) => ScreenSpec`, where a `ScreenSpec` is an ordered
list of typed blocks, and `DashboardRenderer` walks a block registry to
paint it.

```ts
export function overviewScreen(data: RestaurantOverview): ScreenSpec {
  return {
    slug: "",
    title: "Aperçu",
    blocks: [greeting(data), hero(data), kpis(data), book(data)],
    mobileBlocks: [ /* a different order, when the phone needs one */ ],
  };
}
```

Three consequences worth knowing before you extend it:

- **Specs are JSON.** Nothing in a spec is a function or a component
  reference; an action is `{ kind: "command", command: "…" }`, an icon is
  a string key. A backend could serve these unchanged.
- **Blocks declare their own lane.** `surface: "mobile" | "desktop"`
  on a block — or on an individual KPI tile — is how the phone layout
  drops what it should drop. No component ever asks "am I on a phone
  and am I the payout tile".
- **Filtering is data.** A filter tab names a facet and the values it
  accepts; rows carry `facets`. Counts are derived, never passed in, so
  a count cannot disagree with its list.

Every block type is rendered from a hand-written spec at
`/styleguide#blocks`.

---

## 2. Navigation model

`src/lib/nav/workspaces.ts` is the only place navigation is declared. A
workspace owns its sidebar groups, phone tabs, topbar and identity card;
the chrome resolves the active workspace from the pathname and paints it.
Adding a third product is a new entry in that file, not a fork of four
components.

| Surface | Desktop | Phone |
|---|---|---|
| Primary nav | Left sidebar, grouped, collapsible | Bottom tabs, 4 + one raised centre |
| Overflow | — | `/plus` sheet |
| Search + quick action | Topbar | Topbar, condensed |
| Workspace switch | Identity card, top of the sidebar | `/plus` |

**Venue links are compile-checked.** `RESTAURANT_SLUGS` is a typed list;
the screen registry is a total map over it and `restaurantHref(slug)`
takes only a member. A link to a screen that does not exist is a type
error, and a slug added without a screen fails the build. Use it —
do not write `/restaurant/…` by hand.

**Settings is a route, not a spec screen.** Forms are not blocks, and
pretending they were would mean inventing a block type per field. The
spec engine owns the read surfaces; `restaurant/reglages` owns the write
surfaces. `RESTAURANT_SETTINGS_PATH` is exported so the nav still has one
source.

---

## 3. Roles

Two role vocabularies exist, deliberately, because they answer different
questions.

| Type | Values | Question |
|---|---|---|
| `Role` (`lib/auth/session`) | `owner` · `admin` · `scanner` | What may this person do in the **event** workspace? |
| `PortalRole` (`lib/auth/server-session`) | `owner` · `manager` · `staff` | What may this person do to this **venue**? |

Gating is declarative in both. A nav item, a block, or a spec action
carries `allow: [...]`; anything without one is visible to everyone.
Server actions re-check independently — `saveVenueIdentity` refuses a
`staff` role on the server, whatever the client rendered.

The rule for a new capability: **decide the role at the spec or the nav
entry, enforce it again in the server action.** Never only in a
component, and never only on the server if it means rendering a control
that will be refused.

---

## 4. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Component file | `PascalCase.tsx`, one export named for the file | `MetricTile.tsx` |
| Design-system component | `components/ui/` — props only, no data imports | `SideSheet` |
| Spec block renderer | `components/dashboard/blocks/<Type>Block.tsx` | `KpiGridBlock` |
| Screen builder | `lib/<workspace>/screens.ts`, `<name>Screen(ctx)` | `overviewScreen` |
| Server action | `lib/`-free verb, `save*` / `remove*` / `invite*` | `saveVenueListing` |
| Store read | `lib/db/*-store.ts`, noun for a read | `venueProfile()` |
| Store write | same file, verb for a write | `updateVenueListing()` |
| Domain term map | `SCREAMING_SNAKE` record in `vocabulary.ts` | `RESERVATION_STATE` |
| Money in the DB | integer centimes, column suffix `_cents` | `price_cents` |
| Money in TypeScript | major units, field suffix `Mad` | `priceMad` |
| Timestamps | ISO 8601 strings, never `Date` in a spec | `at`, `occurredAt` |
| DB column | `snake_case` | `arrived_covers` |
| TypeScript field | `camelCase` of the same word | `arrivedCovers` |

Two rules that are load-bearing rather than cosmetic:

- **Money crosses the boundary once.** Centimes in the database, major
  units above the store layer, converted in exactly one place per store.
  A float MAD in a column is a rounding bug waiting for a payout run.
- **A component in `ui/` may not import from `lib/db`, `lib/data` or
  `lib/mock`.** That constraint is what makes `/styleguide` possible.
  If a `ui/` component needs data, it takes it as a prop.

---

## 5. Responsive behaviour

Three widths, one breakpoint that matters.

| | Phone (`< md`) | Tablet (`md`) | Desktop (`lg+`) |
|---|---|---|---|
| Nav | Bottom tabs | Bottom tabs | Sidebar |
| KPI grid | 1 column | 2 | 3–4, per `columns` |
| Side panel | Bottom sheet | Right drawer | Right drawer, 460px |
| Tables | Columns marked `hideOnMobile` drop | Full | Full |
| Split block | Rail stacks under main | Stacked | Side by side |

`md` (768px) carries almost all of it. `sm` is used for chip and swatch
grids; `lg` for the sidebar and the widest KPI step. There is effectively
one `xl` usage — do not add more without a reason.

**Three flows must work one-handed on a phone**, and are built that way:

1. **The day view** — `mobileBlocks` reorders the overview so the service
   hero and the next arrivals sit above the fold, and the payout tile
   drops out via `surface: "desktop"`.
2. **Check-in** — the topbar quick action is a thumb-reachable dark pill,
   and the scan sheet opens from the bottom.
3. **Accept / refuse** — the actions are on the row itself and in the
   bottom sheet, both within thumb reach. Neither requires the kebab.

Anything wide — a table, a chart, a filter row — scrolls inside its own
`overflow-x-auto` container. The page body never scrolls horizontally.

---

## 6. Copy

French, `src/lib/copy/fr.ts` for anything reusable, and
`lib/restaurant/vocabulary.ts` for domain terms, where a term is a
label, a tone and an icon together so a state cannot be styled two ways
on two screens.

The conventions, restated from the module because they are the part that
keeps a dictionary from just relocating the inconsistency:

- **Vouvoiement.** "Vos réservations", never "tes réservations".
- **Infinitive on buttons** ("Enregistrer"), **past participle on
  confirmations** ("Enregistré").
- **No exclamation marks.** A partner mid-service is not being cheered on.
- **Numbers inside the sentence**: "3 demandes en attente", not
  "Demandes en attente (3)".
- **Errors say what happened, then what to do**, in one sentence. Never
  a bare "Une erreur est survenue".
- **French typography**: an espace insécable before `: ? !` and inside
  `« … »`, written as `&#8239;` rather than a plain space.

What stays inline: a heading that exists once and reads as part of that
screen's argument. Moving those to a dictionary makes both files harder
to read. The test is whether a second component would ever want the same
string.
