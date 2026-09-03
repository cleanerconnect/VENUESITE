# Phase 5 — Completing the venue dashboard

The venue side of the portal was ten screens against a specification
that asks for thirty. This phase closed that, against
`docs/TARGET_SPEC.md`, which is now committed in the repository and is
the document to read before deciding whether something belongs.

The verdict is at the bottom, with what it is qualified by.

---

## 1. What the thirty screens are, and where each lives

Ten navigation groups, in the specification's order. Every one is
reachable from the sidebar, and the sidebar is generated from the same
slug list the router resolves against — so a nav entry pointing at a
404 is a compile error, not a support ticket.

| Group | Screens |
|---|---|
| Aujourd'hui | Accueil · Réservations · Calendrier |
| En service | Liste d'attente · Check-in · Briefing |
| Clients | Liste clients · Fiche client · Tags et segments |
| Ma présence | Ma fiche · Menu · Avis |
| Croissance | Visibilité · Offres · Expériences |
| **Vie nocturne** | Guest list · Tables minimums · Promoteurs |
| Paiements | Acomptes · Annulations · Lyfe Pay |
| Pilotage | Performance · Bilans · Campagnes |
| Établissement | Disponibilités · Équipe et rôles · Notifications |
| Compte | Paramètres · Abonnement · Support |

Twenty-four are spec screens: pure functions from a data bundle to a
JSON-serialisable `ScreenSpec`, painted by the block registry. Six are
routes — Ma fiche, Menu, Équipe et rôles, Check-in, Fiche client, and
the workspace index itself. Drag reordering, file upload and a live
camera are not blocks, and inventing a block type per field would have
been worse than a page. A type-level exclusion (`SpecSlug =
Exclude<RestaurantSlug, FormRouteSlug>`) keeps the registry a total map
anyway, so a missing builder is still a compile error.

### Two screens were retired rather than built

The specification has no **Services** screen: services are configured in
Disponibilités and read in Calendrier, and a third place to look at them
would have been a third place for them to disagree. **Versements** is
folded into Lyfe Pay, where the money it settles comes from. Both lost
their routes, their nav entries and their builders — not a flag, not a
redirect.

---

## 2. The schema is still the specification of the Business Service

`db/schema.sql` went from 28 tables to 63. Every new one carries
`venue_id`, every store function scopes by it in the WHERE clause, and
both write paths — SQL and the static reducers — apply the same action.

Three properties the specification names explicitly, and where they live:

**Versioned writes.** `service_definitions`, `pacing_rules`,
`deposit_policies` and `cancellation_policies` carry a `version`. A write
that read an older value is refused, not merged. This is the edit that
changes what a guest can book right now, or whether they are charged; a
lost update there is a double-booked room or money taken under a rule
nobody chose.

**Idempotent money.** `deposits.idempotency_key` is unique. Capture,
release and refund send it; a replayed request finds the key spent and
stops. The processor is idempotent on the same key, so the row and the
charge agree.

**Spend has exactly one source.** `transactions` is it.
`MoneyDesk.hasTransactionSource` is the single fact every money tile in
the portal keys off, and where it is false the tile is *absent* — not
zero, not estimated. Nomad Rooftop is seeded with no Lyfe Pay history
precisely so this can be checked rather than asserted: open
`/restaurant/lyfe-pay` on Dar Zellij and on Nomad and count the tiles.

---

## 3. The seam

Reads arrive as six bundles — service floor, guest graph, growth,
nightlife, money, marketing — plus the configuration and account slices.
Not one method per table: a screen renders one coherent snapshot, and
six round trips would let a counter disagree with the list beneath it.
`SCREEN_NEEDS` declares which bundles each slug wants, so rendering the
guest list does not cost a customer list and two analytics queries.

Writes are a typed union per bundle rather than forty methods. Three
things fall out of that, and all three were wanted:

- an action is JSON, so it is already the body of **one endpoint per
  surface** rather than forty routes to write and forty to secure;
- the set of things a screen can ask for is a **closed list the compiler
  checks**, mirroring the client command registry;
- every action returns the **refreshed bundle**, so an optimistic client
  reconciles against what happened instead of refetching.

All three drivers implement it. SQLite writes SQL; the static snapshot
applies pure reducers; HTTP posts to seven endpoints. The static path
exists because a demo where pressing *Installer* does nothing is worse
than no demo — the reviewer concludes the button is broken rather than
that the database is absent.

### Writes reach the server through one action

A spec is JSON, so a button cannot carry an `onClick`. It carries a
command *name*; the screen carries the form that name opens
(`lib/restaurant/forms.ts`, attached per screen to the commands it
actually references); and `app/actions/screen-command.ts` switches on the
name against a list both halves import. A button cannot dispatch a verb
the server has never heard of, and a verb with no handler says so rather
than doing nothing.

---

## 4. The app contract, in both directions

The inbound half already existed. The outbound half did not, and the
specification requires it: *every guest-affecting action emits the
consumer-app notification and the tracking event, so the app and the
dashboard never disagree on a reservation's state.*

`lib/integrations/outbound.ts` is that half. One helper emits both, so
"both are emitted" is a property of the code rather than a rule somebody
has to remember, and the write store calls it inside the same function
that writes the row.

Emitting for: waitlist notified, waitlist seated, waitlist converted,
experience published to its ticket holders, deposit requested, chased,
captured and refunded, table confirmed, guest-list entry checked in, and
campaign sent. Each also writes a `messages_log` row, so what would have
been sent is visible in Notifications and on the guest's own record.

With no gateway configured the emissions are recorded in memory and the
console says once that nothing is being sent. Succeeding silently would
have been worse.

**Two of them create a customer record**, as the specification asks:
seating a waitlist party and checking in a guest-list entry both go
through one `upsertCustomer`, matched on phone within the venue, so a
walk-in who comes back every Friday stays one guest.

---

## 5. Drinks is a configuration, not a second product

`venue_settings.configuration` is `restaurant`, `lounge` or `both`, and
it is deliberately not `venues.kind` — kind is what the consumer app
lists the place as, and a restaurant with a rooftop bar is listed as a
restaurant while running guest lists every Friday.

What it changes: the **Vie nocturne group exists or does not** — not
greyed, not empty, absent; covers become people; services become time
bands; walk-in becomes *entrée porte*; table types appear as inventory;
dress code and age policy appear on Ma fiche. Nothing else. There is no
per-configuration screen list anywhere in the codebase, and there should
never be one.

Resolved once, in the workspace layout, and published to the chrome —
the sidebar, the mobile drawer and the Plus sheet all read the same
value rather than each guessing.

To see both: sign in as `yassine@darzellij.ma` (password `demo`, as
everywhere) and switch venues in the top bar. **Dar Zellij** is
`restaurant`; **Nomad Rooftop** is `lounge`. The sidebar gains a group,
the counts change word, and nothing else moves.

---

## 6. The scanner is real

Carried over from Phase 4 and finished before this phase started.
`useQrScanner` runs the native `BarcodeDetector` where it exists and
dynamically imports `jsqr` where it does not, so the 250 KB decoder only
downloads on the devices that need it. Both door surfaces use one
viewfinder component.

Verified in a real browser with a real QR code painted into a fake
camera stream: the event door decoded it and the counter moved 348 → 349;
replaying the same code was refused three times running; the venue
check-in decoded the same code and correctly refused it as not a
reservation of that venue. The `INTÉGRÉ` badge confirmed the bundled
decoder ran, since headless Chromium exposes no `BarcodeDetector`.

The handover contains no simulated scan.

---

## 7. Every state, forceable, on every screen

`?etat=chargement|vide|erreur` already worked on the event side, where
every read goes through a client hook. The venue side renders on the
server, so it needed a different mechanism: `demoRepository()` wraps the
repository per request — failing every read, or emptying every bundle —
and `chargement` paints the same skeleton the route's own `loading.tsx`
renders.

The same component serves the forced state and the real one, which is
the point: what a reviewer forces cannot drift from what a partner sees.

Only a `RepositoryError` becomes the error screen. `notFound()` and
`redirect()` throw as well, and swallowing those would have turned a
deliberate 404 into a misleading "something went wrong".

---

## 8. What was verified, and how

A production build, served, walked by Playwright against real Chromium.
Every screen checked for HTTP status, horizontal overflow, an error page,
a near-empty body, console errors and uncaught exceptions.

The three checks are committed under `tools/verify/`, so this is
repeatable rather than a claim:

```bash
npm install --no-save playwright             # once
npm run build && npx next start -p 3210      # in one terminal

node tools/verify/walk.mjs                   # thirty screens, desktop
W=390 H=844 node tools/verify/walk.mjs       # thirty screens, phone
VENUE=bar_nomad_casa node tools/verify/walk.mjs
node tools/verify/states.mjs                 # ?etat= on all thirty
node tools/verify/configuration.mjs          # the Vie nocturne gate
```

`BASE` points them at another port, which is how the cold-clone pass
below was run: clone the branch somewhere else, `npm install`, build and
start it with no `.data/` directory, and point the same three checks at
it. Watch for one thing when doing this — one stale `next start` holding
the port while a second fails to bind serves an old build whose chunks no
longer exist, and the symptom (a login form that does nothing) looks
nothing like the cause.

They are deliberately not in `package.json`: they need a running server
and a browser binary, and a check that pretends to be a unit test is a
check that gets skipped in CI and then deleted.

| Pass | Result |
|---|---|
| Dar Zellij (restaurant) · 1440×900 | 30/30 clean |
| Dar Zellij (restaurant) · 390×844 | 30/30 clean |
| Nomad Rooftop (lounge) · 1440×900 | 30/30 clean |
| Nomad Rooftop (lounge) · 390×844 | 30/30 clean |
| `?etat=` on all thirty routes | three states each, all forceable |
| Configuration gate | Vie nocturne absent for the restaurant, present for the lounge; vocabulary follows |

And then again on a genuinely cold clone — the branch checked out
somewhere else, built and started with no `.data/` directory, so
`/api/health` reports `"data":"static"`:

| Cold-clone pass | Result |
|---|---|
| Restaurant · 1440×900 | 30/30 clean |
| Lounge · 390×844 | 30/30 clean |
| `?etat=` on all thirty routes | three states each, all forceable |
| Configuration gate | as above |

No horizontal overflow at phone width on any screen — the calendar grid
and the wide tables scroll inside their own containers, which is the rule
the page body must never break.

Three real bugs were found this way and fixed rather than worked around.

A date helper threw on an ISO instant where it expected a calendar day,
so Abonnement crashed on its own invoice list.

`demo-state.ts` was marked `"use client"`, which turned `parseDemoState`
into a client reference a server component could not call. Worth naming
because the symptom looked like a broken screen rather than a misplaced
directive.

And the third only the cold-clone pass could find: the venue-switch
endpoint checked membership against the SQLite store rather than the
directory. With no database that table is empty, so every switch was
refused with a 403 and the second venue was unreachable — on exactly the
setup an external team clones into. It is the same failure mode as the
layout in Phase 4 and it took the same fix, which is an argument for
running the cold pass every time rather than once.

The check that missed it now asserts the switch succeeded. A refused
switch is silent otherwise: the page renders the *other* venue perfectly
well, and every assertion after it quietly measures the wrong
establishment.

---

## 9. What is not finished, precisely

The route index now distinguishes three states rather than two.
"Partial" was covering two different things — work this repo still owes,
and work no front-end code can do because a service is not connected —
and conflating them told the last reader to go looking for a bug that was
not there.

**No venue route is `partial`.** Six are `service à brancher`, with the
dependency named on the row:

| Screen | What is missing |
|---|---|
| Menu | A PDF extraction service for the assisted import. Uploading the PDF works; it is published on the listing |
| Avis | The review platforms, for public replies and the Google/Tripadvisor redirection. The survey, the links and the threshold all save |
| Acomptes | Payzone — and the specification itself leaves open whether the establishment collects directly or LYFE collects and pays out. Both paths use the same idempotency key, so the choice does not change this screen |
| Bilans | A server-side PDF composer. Browser printing renders correctly today |
| Campagnes | A message gateway. Messages are logged with their cost and recipient, and the console says they are not sent |
| Notifications | The same gateway. Channels, timings and templates all save |

Two things are open by design and were not invented:

- **Loyalty tiers are read, never derived.** The screens display what the
  loyalty service says and compute nothing.
- **The event workspace still has no write seam.** Its reads went through
  a repository in Phase 4; creating an event or a promo code still
  persists nothing. The venue side is now a complete worked example of
  what that should look like.

---

## 10. The verdict

**Can a developer who has never seen this repo clone it, run it, and walk
all thirty screens in both configurations?** Yes.

```bash
npm install
npm run dev
```

No database, no bucket, no backend, no environment file. The committed
snapshot renders every screen, and its timestamps are rebased on read —
including calendar dates, by whole days, so a six-month-old snapshot
still shows tonight's guest list tonight rather than an empty diary.
`npm run db:reset` promotes the same screens to a real SQLite database
where the writes persist.

**Is anything left that would need to be redrawn for the Figma export?**
Nothing found in this pass. Every screen renders its four states, every
button reaches something, no venue route is partial, and the two
configurations differ by one navigation group and a vocabulary — which
is a difference the export should show once, not thirty times.

The honest qualification: six screens will look complete and behave as
records rather than actions until a service is connected behind them.
That is visible in the route index, on the row, with the service named.
It is the right thing for the export to draw — the screen is what the
partner sees either way.
