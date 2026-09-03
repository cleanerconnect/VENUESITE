# Handoff summary

What a development team receives, what it can rely on, and what it has to
build. Written to be read before the code, not after.

Phase 4 (handoff completion) is reported in `docs/PHASE4.md`; Phase 5
(completing the venue dashboard) in `docs/PHASE5.md`; Phase 6 (the Figma
export) in `docs/PHASE6.md` — which is **incomplete**, blocked on the
Figma plan's twenty-tool-calls-per-month limit rather than on anything in
this repository. Read its §6 before picking it up. The screen-by-screen
target the venue side is built against is `docs/TARGET_SPEC.md`, and it is
the document to read first if you are deciding whether something belongs.

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
npm run dev          # runs on the committed static dataset — no database needed
```

Optionally, `npm run db:reset` seeds `.data/lyfe.db` and the portal
switches to it, so edits persist across restarts. `GET /api/health` says
which of the three data drivers is live.

Then open **`/styleguide`**. It needs no session and no seeded database
— every specimen renders from literal props — and it is the fastest way
to see what exists before reading a line of code. Its "Écrans" section
is the route index: every screen the portal ships, linked, with what each
is for, who may open it, and — where something is missing — whether that
is work this repo owes or a service nobody has connected yet.

---

## 2. What is solid

**The design system.** One `SideSheet`, one `MetricTile`, one
`FilterTabs`, one `PageHeader`, one chart theme, one tooltip, one set of
loading skeletons. Every colour in the app resolves to a token in
`globals.css`; the only literals left are four third-party brand colours,
labelled as such. `components/ui/` imports nothing from the data layer,
which is what makes the styleguide possible and what keeps the
components portable.

**The spec engine.** Twenty-four of the venue workspace's thirty screens
are pure functions returning JSON-serialisable `ScreenSpec` values,
painted by a block registry. Adding a screen is a builder plus an entry
in a typed slug list; the registry is a total map over that list, so a
missing screen or a dead link is a compile error rather than a 404 in
production.

The other six are routes rather than specs — Ma fiche, Menu, Équipe et
rôles, Check-in, Fiche client and the workspace's own detail pages. Drag
reordering, file upload and a live camera are not blocks, and inventing a
block type per field would have been worse than a page. A type-level
exclusion keeps the registry total anyway.

**Writes are a closed list too.** A spec is JSON, so a button carries a
command *name*; the screen carries the form that name opens, and one
server action switches on the name against a list both halves import.
A button cannot dispatch a verb the server has never heard of, and a
verb with no handler says so rather than doing nothing.

**The data seam.** `RestaurantRepository` is the single interface every
read and write in the venue workspace goes through. `MockRestaurantRepository`
implements it against a real SQLite database (`db/schema.sql`, 63 tables,
seeded by `db/seed.mjs`); `HttpRestaurantRepository` implements it against
`/api/business/*`; `StaticRestaurantRepository` implements it against a
snapshot captured from the seeded database through those same store
functions, which is what lets a cold clone render everything with no
infrastructure at all. Integration is: fill in the HTTP adapter, set
`LYFE_API_BASE_URL` and `LYFE_API_TOKEN`, delete nothing.

Reads arrive as bundles rather than one table at a time, because a screen
renders one coherent snapshot and six round trips would let a counter
disagree with the list beneath it. Writes are a typed union per bundle:
one HTTP endpoint per surface instead of forty routes to write and forty
to secure.

**The app contract, both directions.** `lib/integrations/events.ts` is
what the platform sends in; `lib/integrations/outbound.ts` is what the
portal sends out. Every guest-affecting action — confirm, refuse, table
ready, seated, deposit requested, table confirmed, guest-list check-in —
emits the consumer-app notification *and* the tracking event through one
helper, so "both are emitted" is a property of the code rather than a
rule somebody has to remember. With no gateway configured the emissions
are recorded and the console says once that nothing is being sent, which
is better than succeeding silently.

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
| 1 | ~~Event workspace reads fixtures directly~~ — **done in Phase 4.** What remains is the *write* path: there is no `EventRepository` mutation surface, because there is no event backend to shape one against | Creating an event, promo code or boost persists nothing | Large. The venue side is the worked example to copy |
| 2 | No add/remove for menu items | A venue with a new dish has to call support | Small |
| 3 | ~~No editor for seating areas~~ — **done in Phase 5.** Zones open and close from Ma fiche, and the write reaches the app immediately | — | — |
| 4 | ~~No preview of the app listing~~ — **done in Phase 5.** Ma fiche renders the listing from the same values the form edits | — | — |
| 5 | ~500 French literals inline, almost all one-off headings | A copy change means a code change | Medium, mechanical |
| 6 | ~~`loading.tsx` only on venue routes~~ — **done in Phase 4.** Every route has loading, empty, error and denied states | — | — |

Gap 1 is the one to do first: the venue side is now a complete worked
example of a repository seam with three drivers, a typed action union and
a snapshot generator, and the event side needs the same treatment for
writes.

Beyond those, six venue routes are marked **service à brancher** rather
than partial. Nothing is missing from the portal on them; what is missing
is Payzone, a message gateway, a review platform or a PDF extractor. The
distinction matters because "partial" told the last reader to go looking
for a bug that was not there.

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
7. **Spend, revenue and average ticket appear only where a transaction
   source exists.** Where none does, the tile is *absent* — not zero, not
   estimated. `MoneyDesk.hasTransactionSource` is the single fact every
   money tile in the portal keys off, and Nomad Rooftop is seeded without
   Lyfe Pay precisely so the rule can be checked rather than asserted.
8. **Drinks is a configuration, not a second product.** It enables the
   Vie nocturne group, renames covers to people, adds table types as
   inventory and adds dress code and age policy. There is no
   per-configuration screen list anywhere in the codebase, and there
   should never be one.

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
