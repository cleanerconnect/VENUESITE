# LYFE — Espace Organisateur

BETA web dashboard for event organizers using **LYFE**, Morocco's lifestyle
discovery platform. All 7 screens shipping in the bento / Rondesignlab-inspired
direction. Visual layer + interactions complete; mock data is shaped exactly
like the eventual API responses so backend wiring is a search-and-replace
later.

> **Auth status — demo only.** A `DemoSessionDriver` sits behind the
> `SessionDriver` interface, mirrored to a presence cookie that lets
> `middleware.ts` short-circuit protected routes server-side. Real auth
> is deliberately left open — see `docs/HANDOFF.md` §3.

## Run

```bash
npm install
npm run dev
```

Boots at `http://localhost:3000`, redirects to `/dashboard`.

## All 12 routes

| Path | What it is |
| --- | --- |
| `/dashboard` | Hero greeting + dark Tonight card with capacity ring + bento KPI grid (sand → white → white → sage) + AI nudge sub-card + upcoming events list + live activity feed |
| `/events` | List with search, sort, sliding gold-underline filter tabs, status pills, rejected-row inline expansion |
| `/events/new` | 5-step wizard with autosave, drag-and-drop tier reordering, live phone-frame preview on step 5, optimistic submit toast |
| `/events/[id]` | Header banner with gradient cover + serif title + key-stats strip; 5 tabs: Sales · Attendees · Refunds · Scanner · Promote |
| `/scanner` | Mobile-first picker with dark hero for tonight's live event |
| `/settlements` | Dark hero next-payout (Fraunces money headline) + history table + LYFE commission invoices |
| `/team` | Members + role pills + audit log + invite dialog with role cards |
| `/settings` | Vertical tab nav with 7 sections; payout section locked behind password+OTP gate |
| `/more` | Mobile-only sheet for Team / Settings / Logout |

## Espace Restaurant — spec-driven

The restaurant workspace follows the organizer dashboard's UX exactly —
same bento, same dark hero, same violet-soft nudge, same activity rail —
but none of it is written as JSX. Every screen is a **`ScreenSpec`**: an
ordered list of typed blocks carrying their own copy, tones, icons,
spans and CTAs. A renderer walks the list and paints it.

```
src/lib/dashboard/
  spec.ts        # block vocabulary — the serializable screen description
  icons.ts       # string key → Lucide component (specs carry keys, not JSX)
  value.ts       # ValueFormat → display text (MAD, %, ratings, countdowns)
  traverse.ts    # depth-first walk over nested blocks
src/components/dashboard/
  DashboardRenderer.tsx   # spec → pixels, desktop + phone lanes
  commands.tsx            # command name → handler (a spec can't ship a fn)
  primitives.tsx          # Metric, Delta, Badge, Action, Icon bridges
  blocks/                 # Greeting, Hero, Nudge, KpiGrid, EntityList,
                          # Feed, Table, Chart
src/lib/restaurant/
  vocabulary.ts  # every domain enum → label + tone + glyph, once
  screens.ts     # overview payload → ScreenSpec, per screen
src/lib/types/restaurant.ts
src/lib/mock/restaurant.ts
```

**Blocks:** `greeting` · `hero` · `nudge` · `kpi-grid` · `entity-list` ·
`floor-plan` · `slot-grid` · `feed` · `table` · `chart` · `split` ·
`group`. The last two compose the others, so a bento column with a rail
is a value, not a layout component.

`entity-list` also carries optional filter tabs, a search field and sort
options — all declarative. A tab names a facet and the values it accepts;
rows carry `facets`, `sortKeys` and `keywords`. Counts derive from the
rows, so a tab can never disagree with the list under it.

### Actions land

The client owns an optimistic copy of the overview payload, and screens
are pure functions of it — so an action changes the *data* and every
surface reading that data moves in one render. Seating a party turns the
table on the plan, drops the free-seat count, raises seated covers in the
hero ring, flips the reservation row to EN SALLE and pushes a line onto
the activity feed, together. Each mutation snapshots the prior payload,
which is what lets the toast offer a real undo.

`src/lib/restaurant/store.ts` holds that copy. In production the same
mutation fires the API call and reconciles or rolls back on the response;
the shape is already right for it.

### Nothing can drift

`src/lib/restaurant/slugs.ts` is the one list of screens. The registry is
typed as a total map over it (a missing builder is a compile error), and
every internal link — nav items, row hrefs, KPI targets — is built by
`restaurantHref(slug)`, so a link to a screen that doesn't exist is a
type error rather than a 404 someone finds later.

### What "not hardcoded" buys

- **No screen-specific JSX.** `RESTAURANT_SCREENS` maps a slug to a
  builder; one route file (`/restaurant/[[...section]]`) serves all of
  them. Adding a screen is adding a builder — no page, no nav edit.
- **The layout is payload.** A `ScreenSpec` survives `JSON.stringify`, so
  each builder's body can become `fetch('/api/screens/…')` and the UI is
  server-driven with zero component change.
- **Data decides the screen.** A quiet Tuesday and a full Saturday render
  genuinely different dashboards — different hero mode, tiles, nudge —
  because the spec differs, not because a component branched.
- **One place per fact.** A reservation state's label, tone and icon live
  in `vocabulary.ts`; a metric's formatting travels with the metric. No
  component spells out "EN SALLE" or decides that a no-show is red.
- **Closed action surface.** Buttons carry a command *name* resolved
  through a registry, so a spec — including one off the wire — can only
  trigger verbs the client already defines.
- **Identity is asked for, not asserted.** The user card reads the signed-in
  person from the session and the organisation from the active workspace,
  so the restaurant workspace stops claiming a festival.
- **Lanes are declared.** A block or a KPI tile says whether it belongs to
  the desktop lane, the phone lane or both — the phone lane never has to
  know that "the payout tile" is the one it drops.
- **The chrome too.** `src/lib/nav/workspaces.ts` holds sidebar groups,
  phone tabs, the Plus hub, topbar copy and the primary CTA per
  workspace. Sidebar / BottomTabs / Topbar / MobilePlusMenu read from it
  and resolve the active workspace from the pathname; the identity card
  doubles as the workspace switcher. The organizer navigation moved there
  verbatim — nothing about the event UI changed.

### Restaurant routes

| Path | What it is |
| --- | --- |
| `/restaurant` | Greeting + dark service hero with occupancy ring + AI nudge + bento KPIs + service-load curve + next arrivals + live service feed + weekly revenue chart |
| `/restaurant/reservations` | Booking KPIs, service-load curve, and one filterable book (tabs · search · sort) |
| `/restaurant/salle` | Floor KPIs + a zoned table map: state colour, turn-progress edge, party and running bill; tiles open a detail sheet |
| `/restaurant/services` | Upcoming sittings with fill progress |
| `/restaurant/menu` | Plate performance table with derived margins |
| `/restaurant/avis` | Rating KPIs + reviews with sentiment badges |
| `/restaurant/versements` | Next-payout hero + settlement history |

### Demo clock

`src/lib/mock/restaurant.ts` anchors to `Date.now()` rather than a frozen
date, and rebuilds the payload each minute. Every timestamp is an offset,
the current sitting's *kind* is derived from the hour, and copy that names
a slot or a weekday is generated — so the service always reads as live
whenever the demo is opened, instead of decaying into "il y a 4 mois".

### Known caveat

`notFound()` renders the 404 page but responds `200`, because the
`(organizer)` shell is a client component and the response has already
begun streaming by the time the nested server component throws. This is
pre-existing app behaviour — `/events/[id]` does the same — not specific
to the restaurant routes.

## Handing off to the dev team

Start with **`docs/HANDOFF.md`**, then open **`/styleguide`** — it needs
no session and no seeded database, and it shows every component in every
state.

| Document | What it answers |
|---|---|
| `docs/HANDOFF.md` | What is solid, what is open, what to build first |
| `docs/INTERFACE.md` | Layout, navigation, roles, naming, responsive, copy |
| `docs/CONVERGENCE.md` | What was unified across the two workspaces, what is still duplicated |
| `docs/APP_MAPPING.md` | Every app element → where a partner controls it |
| `docs/INTEGRATION.md` | The three external seams |
| `docs/SCOPE_AUDIT.md` | The EP40-US1/US2 scope pass |
| `docs/PHASE2_HARDCODED_AUDIT.md` | The fixture-removal pass |

**`docs/INTEGRATION.md`** is the map. Three seams carry every external
dependency — data, AI, app connections — each an interface with a mock
that ships today and a real implementation selected by an environment
variable. Integration is filling in the real side; no screen, block or
component changes.

```
src/lib/data/          repository · mock · HTTP · selection
src/lib/ai/            advisor · Zod schemas · mock · Claude · selection
src/lib/integrations/  event contract · HMAC verification
src/app/api/           assistant (SSE) · webhooks/lyfe · health
```

`GET /api/health` reports which side of each seam is live. Read it after
every deploy: both seams fall back to mocks when unconfigured, which is
what lets a designer run the app with no credentials — and how a
misconfigured production deploy can look healthy while serving demo data.

## Stack

- **Next.js 14** App Router, src/ layout, TypeScript strict mode
- **Tailwind v4** CSS-first config — all tokens in `@theme` block
- **Motion** (formerly Framer Motion) — page-mount stagger, sidebar
  `layoutId` pill, animated counters, capacity-ring stroke fill, sparkline
  path-length draw, sliding tab indicators, optimistic-UI slide-outs,
  drag-and-drop tier reorder via `Reorder.Group`
- **Radix UI** primitives — Dialog, Tabs, Switch, Toast, Accordion (visuals
  100% custom)
- **Recharts** — area chart with custom tooltip + gold gradient
- **Lucide** icons only, stroke 1.6
- **Urbanist + Fraunces** via `next/font/google` — Fraunces for editorial
  moments only (greeting clause, money headlines, tier names in preview)

## Design tokens

All under `@theme` in `src/app/globals.css`:

- Brand: `--color-ink` `#0A1F3D`, `--color-gold` `#C9A64C`,
  `--color-canvas` `#FAF7F0`
- Surfaces: white `surface`, dark `surface-ink`, two-tone canvas
  (`canvas`/`canvas-2`), tinted (`tint-{sand,sky,sage,rose,peach}`,
  `gold-soft`)
- Status: `success`, `warning`, `danger`, `info` — pill use only
- Radii: `xs 6` / `sm 10` / `md 14` / `lg 20` / `xl 28` / `pill`
- Shadows: `soft` / `lift` / `deep` — earned, never default
- Type scale: `display` 56, `h1` 36, `h2` 24, `h3` 18, `body` 14, `meta` 12,
  `eyebrow` 11 (uppercase tracked), `mono` 13 (tabular)

Numeric class `.num` enables tabular figures + ss01 globally.

## Folder structure

```
src/
  app/
    layout.tsx                    # Root: fonts, ToastProvider
    page.tsx                       # Redirect to /dashboard
    globals.css                    # Tailwind v4 + @theme tokens + utilities
    (organizer)/
      layout.tsx                   # Sidebar + Topbar + BottomTabs shell
      dashboard/page.tsx
      events/page.tsx
      events/new/page.tsx
      events/[id]/page.tsx
      settlements/page.tsx
      team/page.tsx
      settings/page.tsx
      scanner/page.tsx
      more/page.tsx
  components/
    ui/                            # Card, Button, Pill, Input, Textarea,
                                   # Select, Switch, ProgressBar, EmptyState,
                                   # Tabs, Dialog, Toast
    motion/                         # Stagger, AnimatedNumber, LivePulse
    organizer/                      # Sidebar, Topbar, BottomTabs, Brand
    cards/                          # HeroTonight, AINudgeCard, StatTile,
                                   # CapacityRing, Sparkline,
                                   # UpcomingEventRow, ActivityFeedItem
    event/                          # SalesTab, AttendeesTab, RefundsTab,
                                   # ScannerTab, PromoteTab, RevenueChart
    wizard/                         # WizardLayout, StepInfo, StepTiers,
                                   # StepRefund, StepMedia, StepReview,
                                   # PhonePreview
  lib/
    types/domain.ts                # Mirrors eventual API shape
    mock/{organizer,events,finance,team}.ts
    utils/{cn,format,motion}.ts
```

## Direction-review corrections (applied before screens 5–10)

1. **Mixed-typography H1** — italic clause now in `gold-deep` for the
   editorial gesture, sans lead preserved for personalisation punch.
2. **AI nudge** — pulled out of the dark Tonight card into its own
   `gold-soft` sub-card directly beneath. Live status and forward-looking
   suggestions don't share a surface.
3. **Bento grid** — `sky` pulled back to `surface`. Final pattern is
   sand → white → white → sage so the tints bookend money/emotion with
   calm functional whites in the middle.
4. **Sidebar groups** — labels removed, replaced with a 1px `line-soft`
   divider. Items are obvious enough.

## What's wired (motion + interactivity)

- Cinematic page-mount stagger on `/dashboard` (8px y-fade, 40ms between
  children)
- Sidebar `layoutId` pill that slides between active items
- Animated number count-ups on KPI tiles, capacity ring, scan counter,
  next-payout hero
- Sparkline path-length draw + last-point dot
- Capacity ring stroke fill (1.4s, 220ms delay)
- Smooth Recharts area chart with custom gold-accent tooltip
- Sliding gold-underline indicator on tabs (sales/attendees/refunds/
  scanner/promote and on My Events filter pills)
- `Reorder.Group` drag-and-drop on tier cards in Step 2 of the wizard
- Live phone-frame preview on Step 5 — updates as the draft changes
- Optimistic Approve / Deny on refund queue with toast undo
- Optimistic team invite + remove with toast undo
- Camera dialog on Scanner tab with sweeping gold scan line
- Backdrop-blur sticky topbar; 72px scanner FAB (raised gold) on mobile
- Autosave loop on the wizard with rotating-icon "Enregistrement…" status

## What's mocked but typed for handoff

`getOrganizerOverview()`, `getAllEvents()`, `getEventById()`,
`getRevenueSeries()`, `getAttendees()`, `getRefundRequests()`,
`getScanLog()`, `getPayouts()`, `getInvoices()`, `getTeam()`,
`getAuditLog()` all return typed shapes from `src/lib/types/domain.ts`.
Backend swap is search-and-replace.

## Mobile

- Phone is the primary surface. 80% of organiser usage will be on a phone.
- `BottomTabs` with raised gold Scanner FAB (44px circle, 8px above bar
  top edge) — door-day usage.
- Scanner tab on mobile gets a fullscreen-style camera dialog with corner
  brackets and a sweeping gold line.
- Sidebar collapses; Topbar drops the search pill but keeps notifications
  + messages.
- Phone-frame preview on Step 5 stacks below the recap on small screens.
