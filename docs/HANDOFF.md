# Handover — LYFE Portail Partenaire

The single entry point. Read this before the code; everything else is
linked from here.

---

## 1. What DigiNegoce wires: Lot 1

The portal ships in **two lots**, and only the first is being wired.

**Lot 1 is the dashboard DigiNegoce connects to the Business Service** —
the screens priced on **row 39 of ChiffrageV3.0** and confirmed in the
**September scope email**. Eighteen screens, listed below. This is the
product a partner is sold, and the only scope against which "is it
finished?" is a fair question.

**Lot 2 is the rest of the venue dashboard.** Fourteen further screens,
designed, built and rendered in this repository — but handed over as
**front-end and design only, for a later phase**. Nothing in Lot 2 is
being connected now, nothing in Lot 2 should be demonstrated as
available, and no Lot 1 screen links into one.

The split is a setting, not a branch. `LYFE_LOT` decides which product a
running instance is, and it **defaults to 1**:

```bash
npm run dev                 # Lot 1 — the contracted dashboard
LYFE_LOT=2 npm run dev      # Lot 2 — everything this repo renders
```

At `LYFE_LOT=1` the fourteen Lot 2 routes are not registered — they 404,
the way they would in a build that never had them — their nav entries do
not render, and the sidebar shows only the groups holding Lot 1 screens.
`GET /api/health` reports the lot in force. The field lives on every row
of the route index (`lib/nav/routes.ts`), which is what the styleguide
table, the navigation and the capture tools all read.

### The eighteen Lot 1 screens

| # | Screen | Route | What Lot 1 buys |
|---:|---|---|---|
| 1 | Connexion | `/login` | The one entry point: resolve the account to its venue. |
| 2 | Accueil | `/restaurant` | Today's reservations, the attention queue, and three numbers — taux de remplissage, revenu estimé, taux de no-show. |
| 3 | Réservations | `/restaurant/reservations` | The day's book: view, accepter, refuser with a coded reason, check-in, no-show. |
| 4 | Check-in | `/restaurant/check-in` | Validate a booking at the door, by code or by name. |
| 5 | Disponibilités | `/restaurant/disponibilites` | Services, capacity, pacing and the booking window — what the app is allowed to offer. |
| 6 | Performance | `/restaurant/performance` | The same three numbers over a chosen period, and nothing else. |
| 7 | Visibilité | `/restaurant/visibilite` | The boost, and the boost only. |
| 8 | Avis | `/restaurant/avis` | Reviews and replies. |
| 9 | Liste clients | `/restaurant/clients` | The guest base, filtered and exportable. |
| 10 | Fiche client | `/restaurant/clients/:id` | Identity, visits, preferences, no-show history, reviews. |
| 11 | Équipe et rôles | `/restaurant/equipe` | Who can open what. |
| 12 | Notifications | `/restaurant/notifications` | One team alert — a new booking — and one guest message — the confirmation. |
| 13 | Paramètres | `/restaurant/parametres` | Legal entity, bank details, language, privacy. |
| 14 | Abonnement | `/restaurant/abonnement` | One annual plan, its invoices, and what it has been used for. |
| 15 | Support | `/restaurant/support` | Guides and a ticket. |
| 16 | Bilans | `/restaurant/bilans` | The period in two minutes, from Performance's figures. |
| 17 | Ma fiche | `/restaurant/ma-fiche` | The listing a guest sees. |
| 18 | Menu | `/restaurant/menu` | The card, as the app displays it. |

### The fourteen Lot 2 screens

Calendrier · Liste d'attente · Briefing · Tags et segments · Audience ·
Offres · Expériences · Guest list · Tables minimums · Promoteurs ·
Acomptes · Annulations · Lyfe Pay · Campagnes.

Front-end and design are complete for all fourteen and are the deliverable
for them. `docs/PHASE7.md` is the worked example of the whole dashboard,
both lots, and `08 Exemple complet · Dar Zellij` in Figma is its design;
`09 Lot 1 · Dar Zellij` is the Lot 1 product on its own.

**Where the two sources are.** Row 39 of ChiffrageV3.0 and the September
scope email are the contract for the list above; they are held by LYFE
and DigiNegoce, not in this repository. The screen list, the per-screen
feature set and the wording of this section were given by LYFE against
those two documents — treat them, not this file, as authoritative if
they ever disagree.

---

## 2. What this is

The partner portal for **LYFE**, Morocco's lifestyle discovery platform.
Two workspaces behind one login:

- **Espace partenaire** — the venue side: eighteen screens in Lot 1,
  thirty-one across both lots, from tonight's service to the monthly
  payout. The worked example for everything else.
- **Espace organisateur** — the event side: sixteen screens for a
  promoter selling tickets. Outside the lot split, and unchanged by it.
  Reads are real; writes have no backend to shape them against yet
  (§12, gap 1).

It is a **front end with a seam**, not a product with a database. Every
read and write goes through one interface with three drivers, so
connecting the real Business Service is filling in the HTTP adapter and
setting two environment variables — not a rewrite. What ships today runs
on a committed snapshot, which is why a cold clone renders every screen
before anyone stands a service up.

Scope is deliberate and narrow: the portal shows what LYFE delivers and
nothing else. No kitchen management, no stock, no POS, no staff
scheduling. See §14.

---

## 3. Run it cold

No database, no services, no credentials:

```bash
npm install
npm run dev          # http://localhost:3000 → /dashboard
```

That serves the committed static dataset. Sign in with any demo account
on `/login` — the password is `demo`; `yassine@darzellij.ma` is the owner
of both venues and the account every capture and check uses.

Optionally promote to a real database, after which edits persist across
restarts:

```bash
npm run db:reset     # seeds .data/lyfe.db from db/schema.sql + db/seed.mjs
npm run db:snapshot  # re-captures the static dataset from that database
```

`GET /api/health` says which of the three drivers is live. The rule is in
`lib/data/mode.ts`: `http` when `LYFE_API_BASE_URL` and `LYFE_API_TOKEN`
are set, else `db` when a seeded SQLite file exists, else `static`.
`LYFE_DATA` forces any of the three.

**Two venues are seeded on purpose.** Dar Zellij is a restaurant in
Marrakech with Lyfe Pay history; Nomad Rooftop is a lounge in Casablanca
with none. The pair is what makes three rules checkable rather than
asserted: the configuration switch, the money-tile rule (§12.7) and the
minimum group size on Audience.

### Before you trust a change, walk it

Five browser checks are committed under `tools/verify/`, kept out of
`package.json` deliberately — they need a running server and a browser
binary, and a check that pretends to be a unit test is a check that gets
skipped in CI and then deleted.

```bash
npm install --no-save playwright          # once
npm run build && npx next start -p 3210   # in one terminal

node tools/verify/walk.mjs            # the venue screens this lot registers (W/H/VENUE overridable)
node tools/verify/events.mjs          # the 19 event + shared routes
node tools/verify/states.mjs          # ?etat= forceable on every venue route in the lot
node tools/verify/configuration.mjs   # restaurant vs lounge behaves as specified
node tools/verify/audience.mjs        # the minimum group of ten, both configurations
node tools/verify/extract.mjs         # records what every route renders (asserts nothing)
```

**Set `LYFE_LOT` on the server and on the tool, or the run is
meaningless.** The tools derive their screen list from the route index
and filter it by the same variable the build filters routes with; set it
on one side only and the tool asks for screens the server does not
register, then calls the 404s failures.

```bash
LYFE_LOT=1 npx next start -p 3210     # 17 venue screens
LYFE_LOT=1 node tools/verify/walk.mjs

LYFE_LOT=2 npx next start -p 3210     # 31
LYFE_LOT=2 node tools/verify/walk.mjs
```

Both modes pass. Under Lot 1 `audience.mjs` reports that its screen is
not registered and exits clean rather than failing on a 404 it asked for
itself, and `configuration.mjs` expects eight sidebar groups rather than
ten — Vie nocturne and Paiements are entirely Lot 2, so a lounge does not
see Vie nocturne either.

Run them against a **production build**, not `npm run dev`. Three of them
fill the login form before React has hydrated in dev, and the submit gate
never opens; the symptom is a timeout on a disabled button.

`extract.mjs` is the odd one out: it asserts nothing, it *records*. At
its default depth it writes the route outline; at `DEPTH=full` it writes
every table cell, list row, metric, chart geometry and form value, with
`SHOTS=` capturing reference PNGs. That file is what the Figma export is
built from, which is why Phase 7 found four content-losing bugs in it — a
screen that reads as prose in the JSON is a screen the extractor is not
seeing properly.

One trap, because it has now cost time twice: if a stale `next start`
still holds `:3210`, the new one fails to bind with `EADDRINUSE` and
every check silently measures the *old* build. Kill by PID
(`pkill -9 -f next-server`) and confirm the port is free before
rebuilding.

---

## 4. The styleguide

Open **`/styleguide`**. It needs no session and no seeded database —
every specimen renders from literal props — and it is the fastest way to
see what exists before reading a line of code.

Seven sections, in this order:

| Section | What it holds |
|---|---|
| `Tokens` | colours, typography, radii, shadows, motion — read from the CSS variables, so editing `globals.css` edits this page |
| `Contrôles` | what you click and what you fill, in every state: empty, filled, in error, disabled |
| `Surfaces` | cards, pills, headers, tiles, drawers, empty states and loading skeletons |
| `Blocs d'écran` | every block the spec engine can paint, rendered from a hand-written spec by the same renderer the app uses |
| `États` | loading, empty, failed and access-denied — each forceable on any route from its URL |
| `Vocabulaire` | every domain term with its label, tone and icon, generated from the same tables the app reads |
| `Écrans` | **the route index** — see §6 |

It is also the enforcement mechanism for the rule that keeps the
components portable: `components/ui/` imports nothing from the data
layer, so if the styleguide renders, that rule still holds.

---

## 5. The Figma file, and how its pages map to the repo

**`LYFE Portail Partenaire`** —
<https://www.figma.com/design/fztoNaEvTrZrWDaLy1MEWg>

The file is not a mockup of the portal; it is generated *from* it. Every
French string, number and status pill on pages `04` and `08` came out of
the running portal through `tools/verify/extract.mjs`, never typed. Read
`00 Lisez-moi` in the file first — it states the naming rules the pages
follow.

| Figma page | Mirrors | Built from |
|---|---|---|
| `00 Lisez-moi` | this document and `docs/TARGET_SPEC.md` | — |
| `01 Fondations` | `src/app/globals.css` | the token block, 1:1 |
| `02 Composants` | `src/components/ui/` | 29 components, 175 variants; a component is named for its file |
| `03 Entrée` | `/login`, `/splash`, `/contact` | built without the shell, as the code renders them |
| `04 Espace partenaire` | the 31 venue screens | structure, in ten Sections named for the ten nav groups of `src/lib/nav/workspaces.ts`. Every screen frame carries its lot in the frame name — `[lot 1]` or `[lot 2]`, 17 and 14 |
| `05 Espace organisateur` | the 16 event screens | structure, in two Sections |
| `06 États` | `loading` / empty / error / denied | four compositions, not four frames per screen |
| `07 Téléphone` | the seven phone-first screens at 390 | plus two phone surfaces |
| `08 Exemple complet · Dar Zellij` | every screen of both lots, populated | `docs/phase7-dar-zellij.json` and the 67 PNGs in `docs/phase7-reference/` |
| `09 Lot 1 · Dar Zellij` | the eighteen Lot 1 screens, cut to the contracted feature set | `docs/lot1-dar-zellij.json` and the 39 PNGs in `docs/lot1-reference/`, both captured at `LYFE_LOT=1` |

Two rules the file keeps, and a designer extending it should keep too:
the library on `02 Composants` is the source for components, and `08` is
the **only** page where detaching from it is allowed — because a Figma
instance cannot be given rows.

`09` keeps that rule. Its eighteen frames are clones of `08`'s, cut to
the contracted feature set, and their sidebars are swapped to a second
library component — `Chrome / Sidebar · Lot 1`, holding the eight Lot 1
groups — rather than detached. The lot changes which screens exist, and
which screens exist is exactly what that component draws, so it earns a
component of its own.

Page and component ids, the variable collections and the verification
record live in `docs/phase6-figma-state.json`.

---

## 6. The spec

**`docs/TARGET_SPEC.md`** is the screen-by-screen target the venue side is
built against, and the document to read first when deciding whether
something belongs. Ten sections, one per nav group, each screen with its
purpose, its sections, its actions, what it reads and what it writes.

The relationship is enforced, not aspirational: `src/lib/restaurant/slugs.ts`
is the canonical screen list, the builder registry is a total map over it,
and `restaurantHref` builds every nav link from it — so a screen in the
spec with no builder is a compile error, and a nav link to a screen that
does not exist cannot be written.

---

## 7. The route index

`src/lib/nav/routes.ts` is the one list of what the portal ships — 53
rows: 31 venue, 16 event, 3 entry, 3 shared. The styleguide's `Écrans`
section renders it, linked, with roles, status and lot.

**Every row carries a `lot`.** 39 rows are lot 1 — the seventeen venue
screens of §1 plus the entry flow, the styleguide and the whole event
workspace, none of which the split touches — and 14 are lot 2, the venue
screens a Lot 1 deployment does not register. The gate reads this field,
so the table the styleguide prints and the routes the router serves
cannot disagree. Three statuses:

- **`built`** (41) — complete.
- **`partial`** (6) — work *this repo* owes: `/events/new`,
  `/events/:id/edit`, `/visibilite`, `/promo-codes`, `/scanner`,
  `/team`. All six are the event side's missing write path (§11, gap 1).
- **`service`** (6) — nothing is missing from the portal; a third party
  is not connected. Each row carries its dependency verbatim, so nobody
  goes looking for a bug that is not there.

| Route | What waits, and on what |
|---|---|
| `/restaurant/menu` | Assisted PDF-to-articles import awaits an **extraction service**. The PDF upload itself works — the file card is published on the listing. |
| `/restaurant/avis` | Public replies and redirection to Google or Tripadvisor await **those platforms being connected**. The survey, the links and the redirect threshold all save. |
| `/restaurant/acomptes` | **Payzone** is not connected, and the specification leaves the direction of the flow open: the venue collects directly, or LYFE collects and remits. Both paths use the same idempotency key, so the choice does not change this screen. |
| `/restaurant/bilans` | PDF export goes through the browser's own print, which renders correctly. A server-side render awaits a **composition service**. |
| `/restaurant/campagnes` | No **send gateway** is connected. Messages are logged with their cost and recipient, and the console says once that nothing is being sent. |
| `/restaurant/notifications` | Channels, schedules and templates all save. Delivery awaits LYFE's **Twilio or Infobip** account. |

The distinction between `partial` and `service` is the point of the
third status: "partial" once told a reader to go hunting for a bug that
was not there.

---

## 8. The schema is the Business Service contract

`db/schema.sql` — **65 tables**. It is not an implementation detail of
the demo; it is the specification of what the Business Service must
store. It is written on the Postgres/SQLite intersection precisely so it
ports without translation, and `db/seed.mjs` fills it with a dataset the
whole portal renders from.

**A counter is never typed beside its rows.** `services.booked_covers`,
`arrived_covers`, `no_show_covers`, `revenue_cents` and every
`service_slot_load` bar are `UPDATE`d from the reservations at the end of
the seed, and a customer's `visit_count` has one completed booking behind
each visit. Four frames used to contradict themselves because those
columns were written by hand; a Business Service that maintains them owes
the same discipline. `docs/PHASE7.md` §9 has the detail.

Four properties the specification names, and where they live:

- **Every row is venue-scoped.** Every table carries `venue_id`, every
  store function scopes by it in the `WHERE` clause, and that id comes
  from the resolved session — never from a payload. `platform_benchmarks`
  is the one deliberate exception: a row there is an anonymised cohort,
  not a venue, which is why it carries none.
- **Versioned writes.** `service_definitions`, `pacing_rules`,
  `deposit_policies` and `cancellation_policies` carry a `version`. A
  write that read an older value is refused, not merged — a lost update
  there is a double-booked room or money taken under a rule nobody chose.
- **Idempotent money.** `deposits.idempotency_key` is unique. Capture,
  release and refund all send it; a replayed request finds the key spent
  and stops.
- **Spend has exactly one source.** `transactions`. `MoneyDesk.hasTransactionSource`
  is the single fact every money tile keys off, and where it is false the
  tile is *absent* — not zero, not estimated.

Reads cross the seam as **bundles**, not one table at a time: a screen
renders one coherent snapshot, and six round trips would let a counter
disagree with the list beneath it. `SCREEN_NEEDS` declares which bundles
each screen wants. Writes are a **typed union per bundle**, so each
surface is one endpoint rather than forty routes to write and forty to
secure, and every action returns the refreshed bundle.

---

## 9. The four documents

The phase record — what was built, what was found, and what was left
open. Read in order, they are the history of the repository:

| Document | What it covers |
|---|---|
| `docs/PHASE4.md` | Handoff completion: the event side off fixtures, every route given its four states |
| `docs/PHASE5.md` | Completing the venue dashboard: 28 tables to 63, the seam, the app contract in both directions, drinks as a configuration |
| `docs/PHASE6.md` | The Figma export: variables, components, frames, and §5 — the écarts found by reading the code against the documents, all now closed |
| `docs/PHASE7.md` | The worked example: one venue, every screen, populated from the seed; §6 — six observations, four of them defects still open here; §9 — the coherence pass, frame by frame |

Four reference documents sit beside them:
`docs/INTERFACE.md` (how the UI is put together) ·
`docs/CONVERGENCE.md` (what was unified, what is still duplicated) ·
`docs/APP_MAPPING.md` (app element → portal control) ·
`docs/INTEGRATION.md` (the API and AI seams).

`docs/SCOPE_AUDIT.md` and `docs/PHASE2_HARDCODED_AUDIT.md` are earlier
passes, kept for provenance.

**Start with `docs/TARGET_SPEC.md` if you are deciding whether something
belongs; with `docs/PHASE7.md` §6 if you are looking for the next bug to
fix.**

---

## 10. What is solid

**The design system.** One `SideSheet`, one `MetricTile`, one
`FilterTabs`, one `PageHeader`, one chart theme, one tooltip, one set of
loading skeletons. Every colour in the app resolves to a token in
`globals.css`; the only literals left are four third-party brand colours,
labelled as such. `components/ui/` imports nothing from the data layer,
which is what makes the styleguide possible and what keeps the
components portable.

**The spec engine.** Twenty-six of the venue workspace's thirty-one
screens are pure functions returning JSON-serialisable `ScreenSpec` values,
painted by a block registry. Adding a screen is a builder plus an entry
in a typed slug list; the registry is a total map over that list, so a
missing screen or a dead link is a compile error rather than a 404 in
production.

The other five are routes rather than specs — Ma fiche, Menu, Équipe et
rôles, Check-in and Fiche client. Drag reordering, file upload and a live
camera are not blocks, and inventing a block type per field would have
been worse than a page. A type-level exclusion keeps the registry total
anyway.

**Writes are a closed list too.** A spec is JSON, so a button carries a
command *name*; the screen carries the form that name opens, and one
server action switches on the name against a list both halves import.
A button cannot dispatch a verb the server has never heard of, and a
verb with no handler says so rather than doing nothing.

**The data seam.** `RestaurantRepository` is the single interface every
read and write in the venue workspace goes through. `MockRestaurantRepository`
implements it against a real SQLite database (`db/schema.sql`, 65 tables,
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

## 11. What is deliberately not built

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

## 12. What is a gap, ranked

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

## 13. Rules to keep

Eight things that will rot quietly if nobody defends them.

1. **`components/ui/` imports nothing from `lib/db`, `lib/data` or
   `lib/mock`.** If a component needs data, it takes a prop. This is
   what keeps `/styleguide` working, and the styleguide is what keeps
   the components honest.
2. **No colour literals, and the rule currently holds.** A new colour is
   a token in `globals.css` and a role name, not a value at a call site.
   A tint is that token at an opacity — `bg-violet/12` in a class,
   `color-mix(in oklab, var(--color-violet) 12%, transparent)` in a
   gradient or shadow — never a hand-written `rgba()`. Same for
   `fontSize` (the metric scale), radii (`rounded-chip`) and spacing
   (everything derives from `--spacing`).

   This was aspirational until the Phase 6 audit, which found the rule
   broken in thirty-four places: `Pill`'s eleven tones written as rgba
   (one of them a violet in the palette nowhere else), twenty-six inline
   `rounded-[12px]`, four gold hero glows the token comment claimed did
   not exist, and two variants painting a second variant's colour.
   `grep -rn 'rgba([0-9]' src --include='*.ts' --include='*.tsx'` returns
   one hit — a comment in `Pill.tsx` recording the stray value. Two hits
   means it has started rotting again. Scope it to the code: unscoped it
   also counts `globals.css`, where eighteen `rgba()` values are the
   token *definitions* and so are the rule being kept, not broken.

   Colour holds; radius is only half done, and the sentence above should
   not be read as claiming otherwise.
   `grep -rno 'rounded-\[[0-9]\+px\]' src` returns 26 hits across 19
   files — `10px` ×17, `6px` ×4, `14px` ×3, `34px` and `44px` once each.
   Phase 6 removed the `rounded-[12px]` because `--radius-chip` matched
   them exactly; these are sizes the scale has no name for. Phase 7 hit
   one of them head-on: the avatar chip's `rounded-[14px]` has no token,
   so the Figma avatars bind `rayon/chip` and sit 2px rounder than the
   portal. Either give the remaining five values names, or accept them —
   but do not add a sixth.
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

## 14. Scope, once more

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
