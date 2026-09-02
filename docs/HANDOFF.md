# Handoff summary

What a development team receives, what it can rely on, and what it has to
build. Written to be read before the code, not after.

Companion documents:
`docs/INTERFACE.md` (how the UI is put together) ·
`docs/CONVERGENCE.md` (what was unified and what is still duplicated) ·
`docs/APP_MAPPING.md` (app element → portal control) ·
`docs/INTEGRATION.md` (the API and AI seams) ·
`docs/SCOPE_AUDIT.md` and `docs/PHASE2_HARDCODED_AUDIT.md` (earlier passes).

---

## 1. Start here

```bash
npm install
npm run db:reset     # creates and seeds .data/lyfe.db
npm run dev
```

Then open **`/styleguide`**. It needs no session and no seeded database
— every specimen renders from literal props — and it is the fastest way
to see what exists before reading a line of code.

---

## 2. What is solid

**The design system.** One `SideSheet`, one `MetricTile`, one
`FilterTabs`, one `PageHeader`, one chart theme, one tooltip, one set of
loading skeletons. Every colour in the app resolves to a token in
`globals.css`; the only literals left are four third-party brand colours,
labelled as such. `components/ui/` imports nothing from the data layer,
which is what makes the styleguide possible and what keeps the
components portable.

**The spec engine.** The venue workspace's ten screens are pure functions
returning JSON-serialisable `ScreenSpec` values, painted by a block
registry. Adding a screen is a builder plus an entry in a typed slug
list; the registry is a total map over that list, so a missing screen or
a dead link is a compile error rather than a 404 in production.

**The data seam.** `RestaurantRepository` is the single interface every
read and write in the venue workspace goes through. `MockRestaurantRepository`
implements it against a real SQLite database (`db/schema.sql`, 28 tables,
seeded by `db/seed.mjs`); `HttpRestaurantRepository` implements it against
`/api/business/*`. Integration is: fill in the HTTP adapter, flip
`LYFE_REPOSITORY=http`, delete nothing.

**Venue scoping.** Every query and every mutation carries `venue_id` in
its WHERE clause, and that id comes from the resolved session, never from
a payload. Verified: a request for a venue the user does not hold returns
403; a forged cookie falls back to the user's own venue; an
unauthenticated request redirects to `/login`. `updateMenuItem` aimed at
another venue's dish updates zero rows and raises.

**Optimistic writes with real rollback.** `useOptimisticForm` applies an
edit immediately, rolls it back if the server refuses, and shows which of
those happened. `useRestaurantStore` snapshots before every mutation so
the toast's "Annuler" is real, not decorative.

**Asset uploads.** HMAC-signed tickets, a swappable storage driver, and
only the object key is stored — never a URL. Verified: a forged key is
403, oversized is 403, expired is 410, wrong type is 422, path traversal
is 404 with no leak.

---

## 3. What is deliberately not built

These are **open, not worked around**. Nothing in the codebase pretends
they exist.

| Item | Current state | What the team builds |
|---|---|---|
| **Real authentication** | A demo session driver behind a `SessionDriver` interface, plus a presence cookie for the middleware | Implement `SessionDriver` against the Business Service. `resolveSession()` already re-checks venue access on every request |
| **PostgreSQL** | SQLite via `node:sqlite`, on the Postgres/SQLite intersection of SQL | Point the store at Postgres. The schema is written to port; no SQLite-only syntax |
| **S3 + CloudFront** | A local filesystem driver behind a `StorageDriver` interface | Implement the driver with presigned PUT and CloudFront reads. The portal must never see a raw credential — that constraint is already structural, since it only ever handles object keys |
| **The `/api/business/*` backend** | `HttpRestaurantRepository` is written against it and unused | Stand the service up; flip the env var |
| **Live push** | Webhooks land and revalidate | Fan out to open dashboards; dedupe across instances on the event `id` |

---

## 4. What is a gap, ranked

| # | Gap | Consequence | Size |
|---|---|---|---|
| 1 | Event workspace still reads fixtures (`lib/mock/*`, 12 modules, 22 components) | Nothing a partner edits on the event side persists | Large, but the seam already exists — repeat the venue-side pass |
| 2 | No add/remove for menu items | A venue with a new dish has to call support | Small |
| 3 | No editor for seating areas | A venue that opens a rooftop cannot list it | Small |
| 4 | No preview of the app listing | A partner edits blind, finds out from a customer | Medium; all the data is present |
| 5 | 501 French literals inline across 81 files | A copy change means a code change | Medium, mechanical |
| 6 | `loading.tsx` only on the venue routes | Event routes will flash empty once they are async | Small; skeletons are built |

Gap 1 is the one to do first. Gap 4 is the one worth arguing for: every
listing field is edited in one place and rendered somewhere else
entirely, and closing that loop currently runs through a customer
complaint.

---

## 5. Rules to keep

Six things that will rot quietly if nobody defends them.

1. **`components/ui/` imports nothing from `lib/db`, `lib/data` or
   `lib/mock`.** If a component needs data, it takes a prop. This is
   what keeps `/styleguide` working, and the styleguide is what keeps
   the components honest.
2. **No hex literals.** A new colour is a token in `globals.css` and a
   role name, not a value at a call site. Same for `fontSize` — use the
   metric scale.
3. **A domain state is a term.** Add it to the union, add it to the map
   in `vocabulary.ts` (label + tone + icon), and it appears in the
   styleguide automatically. The compiler enforces the pairing.
4. **Money is centimes in the database and major units above the store.**
   Converted once, in the store.
5. **The venue id comes from the session.** Never from a payload, a
   query string, or a request body. Every new query carries it.
6. **A copy string moves to `lib/copy/fr.ts` when a second component
   would want it.** A one-off heading stays where it reads.

---

## 6. Scope, once more

The venue workspace shows what LYFE delivers and nothing else. No kitchen
management, no stock, no food costing, no suppliers, no POS, no staff
scheduling, no table service. Those were removed in this pass, including
their nav entries, their database tables and their placeholder screens —
not hidden behind a flag.

One concept was reframed rather than deleted: a guest arriving is real
and app-facing, so `seated` became `arrived` everywhere, and the store
now checks a guest in instead of assigning them a table. Seating *areas*
survived, because asking for the terrace when you book is a booking
preference the app offers, not a floor layout.

If a feature request arrives that would reintroduce any of the removed
set, the question to ask first is whether LYFE ships it. A partner seeing
a feature we do not deliver is worse than not showing it.
