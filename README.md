# LYFE — Portail partenaire

LYFE is Morocco's lifestyle discovery platform: people find events and
venues in the app and book them there. This repository is the **partner
portal** — the web product the other side uses, where a festival sells
its tickets and a restaurant runs its book. It is a Next.js front end,
complete and walkable, with the backend deliberately left to be built.

---

## Five minutes to a running portal

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. You need nothing else — no database, no
S3 bucket, no API key, no `.env`. The portal detects that there is no
database and serves a committed snapshot instead, so every screen
renders on a clean clone.

Sign in with any of these; the password is `demo` for all of them:

| Email | What it shows |
|---|---|
| `mido@jazzablanca.com` | Event organiser — two organisations, no venue |
| `yassine@darzellij.ma` | Both workspaces — two venues *and* an organisation |
| `rachid@darzellij.ma` | Two venues, no organisation — lands on the venue chooser |
| `sofia@nomadrooftop.ma` | One venue, manager role |
| `nouveau@lyfe.ma` | Credentials valid, nothing attached — the "no workspace" state |

They are listed on the login screen too, so nobody has to find this file
first.

**Then open [`/styleguide`](http://localhost:3000/styleguide).** It needs
no session and it is the fastest way to understand what exists: every
component in every state, every design token, every screen with a link
and a one-line description of what it does.

### Two commands worth knowing

```bash
npm run db:reset      # create and seed .data/lyfe.db — the portal switches to it
npm run db:snapshot   # re-capture the static dataset from that database
```

Running `db:reset` promotes the app from the static snapshot to a real
SQLite database: the same screens, but edits persist across restarts.
`db:snapshot` regenerates the static dataset *from* the database through
the same store functions the app reads with, so the two can never drift
in shape. Re-run it after changing the seed.

---

## The two workspaces

One portal, two products, one login. Which one a partner lands in is
resolved from their account, not from a separate URL.

**Espace événements** — festivals, promoters and venues that sell
tickets. Ticketing, audiences, promo codes, boosts, door scanning,
post-event reports, payouts. Roles: `owner`, `admin`, `scanner`.

**Espace établissement** — restaurants and bars that take bookings.
Thirty screens in ten groups: the day, the service floor, the guest base,
the app listing, growth, nightlife, payments, reporting, configuration
and the account. Roles: `owner`, `manager`, `staff`. Built against
`docs/TARGET_SPEC.md`, which is the document to read before deciding
whether something belongs.

An account holding both switches between them in the sidebar. An account
holding one is never offered the other.

### One product, two configurations

`Paramètres → Type de configuration` is `Restaurant`, `Lounge` or both.
Lounge adds the **Vie nocturne** group — guest lists, tables with a
minimum spend, promoters — renames covers to people and services to time
bands, and adds dress code and age policy to Ma fiche. Nothing else
changes: there is no per-configuration screen list anywhere in the
codebase, and there should never be one.

Both are seeded. **Dar Zellij** is a restaurant; **Nomad Rooftop** is a
lounge, and is deliberately seeded with no Lyfe Pay history, so the rule
that spend appears only where a transaction source exists can be checked
rather than taken on trust — open Lyfe Pay on each and count the tiles.

---

## Where things live

```
src/
├─ app/
│  ├─ (organizer)/        the shell: sidebar, topbar, bottom tabs, error boundary
│  │  ├─ dashboard/ events/ audiences/ …    event workspace
│  │  └─ restaurant/                        venue workspace
│  ├─ login/ splash/ contact/ styleguide/   outside the shell
│  ├─ actions/            server actions (auth, venue, check-in)
│  └─ api/                assistant (SSE), assets, webhooks, health
├─ components/
│  ├─ ui/                 the design system — props only, no data imports
│  ├─ forms/ motion/ data/    controls, animation, query states
│  ├─ dashboard/          the spec renderer and its block registry
│  └─ event/ restaurant/ …    screen-level compositions
├─ lib/
│  ├─ data/               the data seam: interfaces, drivers, static dataset
│  ├─ auth/               session, account directory, roles
│  ├─ ai/                 the assistant seam
│  ├─ restaurant/         venue screen builders (pure functions → ScreenSpec)
│  ├─ nav/                workspaces, routes, chrome commands
│  ├─ types/ copy/ charts/ utils/
└─ middleware.ts          the server-side gate
db/
├─ schema.sql             63 tables, Postgres/SQLite intersection
├─ seed.mjs               the demo dataset
└─ snapshot.mjs           captures it into src/lib/data/static/
```

### Two ideas worth ten minutes

**Most venue screens have no page file.** A screen is a pure function
`(context) => ScreenSpec`, where a `ScreenSpec` is an ordered list of
typed blocks, rendered by a block registry. Specs are plain JSON — an
action is `{ kind: "command", command: "…" }`, an icon is a string key —
so a backend could serve them unchanged. Adding a screen is a builder
plus an entry in a typed slug list; a link to a screen that does not
exist is a compile error. See `/styleguide#blocks`, which renders every
block type from a hand-written spec.

Six of the thirty are routes instead: Ma fiche, Menu, Équipe et rôles,
Check-in, Fiche client and the workspace index. Drag reordering, file
upload and a live camera are not blocks, and inventing a block type per
field would be worse than a page. A type-level exclusion keeps the
registry a total map anyway.

**A button carries a name, not a function.** Since a spec is JSON, an
action is a command *name*; the screen declares the form that name opens;
and one server action switches on the name against a list both halves
import. A button cannot dispatch a verb the server has never heard of,
and a verb with no handler says so rather than doing nothing.

**Everything reads through a repository.** `RestaurantRepository` and
`EventRepository` are the only ways a screen gets data. Three drivers sit
behind the first — static snapshot, SQLite, HTTP — chosen by one rule in
`lib/data/mode.ts`. Nothing outside `lib/data/*-repository.ts` imports
the dataset.

---

## Conventions

| Thing | Convention | Example |
|---|---|---|
| Design-system component | `components/ui/`, props only, no data imports | `SideSheet` |
| Spec block renderer | `components/dashboard/blocks/<Type>Block.tsx` | `KpiGridBlock` |
| Screen builder | `lib/<workspace>/screens.ts`, `<name>Screen(ctx)` | `overviewScreen` |
| Server action | verb first: `save*` / `remove*` / `invite*` | `saveVenueListing` |
| Store read / write | noun for a read, verb for a write | `venueProfile()` / `updateVenueListing()` |
| Domain term | `SCREAMING_SNAKE` map in `vocabulary.ts` | `RESERVATION_STATE` |
| Money in the database | integer centimes, `_cents` suffix | `price_cents` |
| Money in TypeScript | major units, `Mad` suffix | `priceMad` |
| DB column / TS field | `snake_case` / `camelCase` of the same word | `arrived_covers` / `arrivedCovers` |
| Timestamps | ISO 8601 strings, never `Date` in a spec | `at`, `occurredAt` |

Five rules that will rot quietly if nobody defends them:

1. **`components/ui/` imports nothing from `lib/data`.** If a component
   needs data, it takes a prop. This is what keeps `/styleguide` working,
   and the styleguide is what keeps the components honest.
2. **No colour literals — and this is now true, not aspirational.** A new
   colour is a token in `globals.css` and a role name. A tint is that
   token at an opacity: `bg-violet/12` in a class, or
   `color-mix(in oklab, var(--color-violet) 12%, transparent)` in a
   gradient or shadow where a class cannot reach. Never a fresh `rgba()`.
   Same discipline for font sizes (the type scale), radii (`rounded-chip`,
   not `rounded-[12px]`) and spacing (every step derives from
   `--spacing`).

   `grep -rn 'rgba([0-9]' src` returns exactly one hit — a comment in
   `Pill.tsx` recording the stray value that used to be there. If it ever
   returns two, the rule has started rotting again. Note that
   `rounded-[var(--radius-lg)]` is *not* a literal: arbitrary-value syntax
   wrapping a token is how Tailwind reaches a custom property, and it is
   fine.

   Colour holds. **Radius does not, yet.**
   `grep -rno 'rounded-\[[0-9]\+px\]' src` still returns 26 hits across
   19 files — `10px` seventeen times, `6px` four, `14px` three (the
   avatar chip in `EntityListBlock.tsx`), `34px` and `44px` once each.
   The Phase 6 sweep took out the twenty-six `rounded-[12px]` because a
   token matched them exactly; the rest are sizes the scale has no name
   for, and inventing five tokens to cover five one-off values would be
   worse than leaving them visible. Adding a *new* inline radius is still
   the thing not to do.
3. **A domain state is a term**: add it to the union *and* to the map in
   `vocabulary.ts` (label + tone + icon). The compiler enforces the pair,
   and it appears in the styleguide automatically.
4. **Money crosses the boundary once** — centimes below the store layer,
   major units above.
5. **The venue id comes from the session**, never from a payload, a query
   string or a request body.

Copy is French and lives in `lib/copy/fr.ts` when a second component
would want the same string; domain terms live in `vocabulary.ts`.

---

## Real vs mocked

Nothing below is disguised. If it says mocked, no amount of clicking
will persist it.

**Real, and works today**

- Every screen, at phone, tablet and desktop width.
- The full booking lifecycle on the venue side — confirm, refuse with a
  coded reason, check in by QR code or by name, report a no-show — with
  optimistic updates and working undo.
- Venue settings: identity, app listing, menu, opening hours, photos,
  team. Saved and persisted (to SQLite after `db:reset`).
- Login, account resolution, workspace and venue switching, sign-out.
- Venue scoping: every query and mutation carries a `venue_id` that comes
  from the session. A request for a venue you do not hold is refused.
- Asset uploads: HMAC-signed tickets, only the object key is stored.

**Mocked, and marked as such**

| Area | What actually happens |
|---|---|
| Authentication | Credentials checked against `lib/auth/accounts.ts`. No tokens, no hashing, no expiry beyond a 30-day cookie |
| Event workspace writes | Creating an event, a promo code or a boost shows a confirmation and persists nothing |
| Scanner camera | The scan loop is simulated; `getUserMedia` is detected but not read |
| SMS, email, review replies | No gateway. The action reports success |
| AI assistant | Falls back to a scripted responder unless `ANTHROPIC_API_KEY` is set |
| Storage | Local filesystem driver behind the S3 interface |

**Not built, deliberately left open** — real authentication, PostgreSQL,
S3 + CloudFront, the `/api/business/*` backend, live push to open
dashboards. Each has an interface with a working stand-in; see
`docs/HANDOFF.md` §3 for what the team builds and where it plugs in.

---

## Seeing the states nobody demos

Append `?etat=` to any route to force what a screen shows when its data
is not there:

```
/events?etat=chargement    every read stays pending
/events?etat=vide          every list comes back empty
/events?etat=erreur        every read fails
```

These states are unreachable in a healthy demo, so without a way to see
them they get built once and rot. `/styleguide#states` renders all four
side by side, permission-denied included.

---

## Documentation

| Document | What it answers |
|---|---|
| `/styleguide` | What exists — components, tokens, states, and every screen with a link |
| `docs/HANDOFF.md` | What is solid, what is open, what to build first |
| `docs/PHASE4.md` | Handoff-completion report |
| `docs/PHASE5.md` | Venue-dashboard completion report |
| `docs/PHASE6.md` | The Figma export — the file, its variables, components and frames |
| `docs/PHASE7.md` | The worked example — one venue, every screen, populated from the seed |
| `docs/INTERFACE.md` | Layout, navigation, roles, naming, responsive, copy |
| `docs/CONVERGENCE.md` | What was unified across the two workspaces, what is still duplicated |
| `docs/APP_MAPPING.md` | Every element the consumer app shows → where a partner controls it |
| `docs/INTEGRATION.md` | The three external seams — data, AI, app events |
| `docs/SCOPE_AUDIT.md` | The EP40-US1/US2 scope pass |
| `docs/PHASE2_HARDCODED_AUDIT.md` | The fixture-removal pass |

`GET /api/health` reports which side of each seam is live. Read it after
every deploy: the seams fall back to their stand-ins when unconfigured,
which is what lets a designer run the app with no credentials — and how
a misconfigured production deploy can look healthy while serving demo
data.

---

## Stack

Next.js 14 (App Router) · TypeScript, strict · Tailwind v4 with CSS-first
tokens · Motion · Radix primitives · Recharts · Zustand · `node:sqlite`
(built in — no native dependency).

Fonts are Urbanist and Fraunces via `next/font`. The type scale, colour
roles, radii, shadows and motion curves are all tokens in
`src/app/globals.css`; `/styleguide#tokens` renders them from those
variables, so the swatches cannot go stale.
