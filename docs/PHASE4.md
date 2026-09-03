# Phase 4 — Handoff completion report

The measure this phase was held to: *someone who has never seen this
repo can clone it, run one command, walk every screen of both dashboards
in every state, and understand the system without asking a question.*

The verdict is at the bottom. It is a qualified yes, and the
qualifications are named.

---

## 1. The entry flow

`lyfemaroc.org` → Org button → `/login`. That was previously a screen
that dropped into the event dashboard with a demo session, so the part
of the journey the external team most needs to reproduce did not exist.

**One form for every partner.** No separate event and venue entrances.
Where a partner lands is resolved from what their account holds, in one
place — `lib/auth/accounts.ts`:

- any organisation → the event dashboard, workspace switcher available
- venues only → the venue portal, choosing first when there is more than one
- neither → told so plainly

### The six states, and how to reach each

| State | How to see it |
|---|---|
| Idle | `/login` |
| Submitting | the button reports it and the form locks for the round trip |
| Invalid credentials | any account with a wrong password |
| Single workspace | `mido@jazzablanca.com` (events) · `sofia@nomadrooftop.ma` (one venue) |
| Multiple venues | `rachid@darzellij.ma` → chooser, then the portal opens on what was picked |
| No workspace | `nouveau@lyfe.ma` — credentials valid, nothing attached |
| Expired session | `/login?expired=1`, where the layout redirects when the cookie resolves to nothing |

Password is `demo` throughout, and the accounts are listed on the login
screen so nobody has to find the README first.

An unknown address and a wrong password return the same message. Two
messages would turn the form into a way to enumerate which partners have
accounts.

### Four defects the work exposed

1. **Three gates that could disagree.** The middleware read a cookie,
   the layout read the session, and `SessionGuard` read localStorage. A
   cookie-based login would have left the client bouncing to `/login`
   while the server considered it signed in. The localStorage gate is
   gone; the client session is now a mirror written *from* the server
   session, never the reverse.
2. **Sign-out only cleared the client.** The server cookies survived, so
   the next navigation walked straight back in.
3. **The workspace switcher offered both workspaces unconditionally** —
   an event-only organiser was one click from a venue portal holding no
   venue of theirs. A both-holder had no way back from the venue side at
   all.
4. **The session validated the signed-in id against the venue
   directory**, so an account with no venue silently resolved to the
   default user — signing in as someone else.

A second venue (Nomad Rooftop) was added to the seed so three things
stop being theoretical: the venue switcher has somewhere to switch to,
the multiple-venues state has a real account behind it, and venue
scoping can be demonstrated with two venues rather than asserted against
one.

---

## 2. Every screen renders without infrastructure

**Confirmed on a fresh clone.** The verification, run end to end:

```
git clone <repo> && cd <clone>
npm install
npx next build        ✓ compiled successfully
npx next start
```

No `.env`, no database, no bucket, no API key.

```
GET /api/health
{"status":"ok","adapters":{"data":"static",
 "dataReason":"aucune base — jeu de données statique","ai":"mock"},
 "snapshotCapturedAt":"2026-09-03T09:47:54.452Z"}
```

Then, in a real browser, signed in as an account holding both
workspaces: **32 of 32 routes returned 200, with no console errors and
no page errors.** Running `npm run db:reset` promotes the same clone to
SQLite (`"data":"db"`) and the same 32 routes pass again.

### What had to change

The starting position was worse than the brief assumed. With no
`.data/lyfe.db`, *every route in the workspace shell 500'd* — event
routes included — because the group layout resolves the session and the
session reached straight into SQLite.

- **`lib/data/mode.ts`** picks one of three drivers by a single rule: a
  configured backend, else a seeded SQLite file, else the committed
  snapshot. A cold clone lands on static; `db:reset` promotes it.
- **The static venue dataset is not hand-written.** `npm run db:snapshot`
  captures it from the seeded database *through the same store functions
  the app reads with*, so the two payloads cannot drift in shape.
  Instants are rebased on read, so a months-old snapshot still shows a
  service in progress today.
- **`lib/auth/directory.ts`** splits "who exists and what may they open"
  out of the session, with a static and a database implementation. That
  is what unblocked the shell.
- **`StaticRestaurantRepository`** implements the full interface. Writes
  land in a per-process overlay rather than being dropped — a demo where
  confirming a booking silently does nothing reads as broken.

### The event workspace on the same seam

It read its dataset by direct import from **35 call sites** across 12
modules, which is why it had no seam to put a loading or error state
behind. Now:

- `EventRepository` — 31 async reads, the counterpart to
  `RestaurantRepository`.
- `useEventQuery` on the client returns a four-state `Query<T>`;
  server components await the repository and pass payloads down.
- Row components take their facts as props. A row was firing its own
  campaign lookup per render; the list now reads
  `countActiveBoostsByEvent()` once.

Nothing outside the two driver files imports the dataset. (One
exception, deliberate: `/api/health` reads the snapshot's capture date to
report it.)

### Five bugs the migration exposed

- `/events/[id]` and `/visibilite/[id]` called `notFound()` whenever the
  lookup returned nothing — which, once reads became async, is every
  first paint.
- `/events/new?duplicateFrom=` seeded `useState` from the source event,
  so an async source would never have reached the draft.
- `/restaurant/reglages` read the SQLite store and raw SQL directly. It
  was the one screen that still required a database.
- `AttendeesTab` shadowed its own search state with the query variable.
- Pull-to-refresh on `/events` slept 700 ms and claimed it had
  refreshed. It now re-runs the read.

---

## 3. State coverage

Swept every route against three forced states — `?etat=chargement`,
`?etat=vide`, `?etat=erreur` — and filled what was missing.

That switch is itself a deliverable. These states are unreachable in a
healthy demo, so without a way to see them they get built once and rot,
and an external team reproducing the portal has to know what a failed
load looks like.

**Loading.** `/audiences` rendered a bare `<div className="min-h-[60vh]" />`,
so a failed load looked exactly like an empty page. Five event-detail
tabs and the edit form branched on `!data`, which became true *during
loading* the moment the reads went async — a loading tab claimed there
was nothing to show, and the edit form said "Événement introuvable" for
an event that exists. `/scanner` had no state at all; its states now
live on the dark full-screen surface, because a white error card blinds
a host in a dark venue.

**Empty.** The dashboard's upcoming list and activity feed rendered
empty containers. Added there, on `/team`, and on `/visibilite`.

**Permission denied** — the class the brief named that had no coverage
anywhere. Scanner hitting `/events/new` or an event edit form was
redirected to the list, which flashed the page and gave no reason. Both
now render `PermissionDenied`, which names the role that would grant
access: "ask your owner" is actionable, "access denied" is not.

Three identity bugs surfaced, all from the session falling back to the
venue directory for an account holding no venue: the dashboard greeted
"Bonsoir, usr_mido"; an event owner resolved to the venue role `staff`
and lost seven of ten sidebar entries; the sidebar labelled an event
owner "Équipe" and named their venue while they were on the event side.

---

## 4. Styleguide inventory

`/styleguide` — no session required — now has seven sections:

| Section | Contents |
|---|---|
| Tokens | Colours, type scale, metric scale, radii, shadows, motion — read from the CSS custom properties, so the swatches cannot go stale |
| Contrôles | Button, Input, Textarea, Select, Switch, ChipSelect, ChipInput, Field, SaveBar — each in every state |
| Surfaces | Card, Pill, PageHeader, MetricTile, ProgressBar, Tabs, FilterTabs, EmptyState, Dialog, SideSheet, Toast, Skeleton, AnimatedNumber, LivePulse, Sparkline, CapacityRing, ChartTooltip |
| Blocs d'écran | Every block type in the spec vocabulary, rendered from a hand-written `ScreenSpec` through the app's own renderer |
| **États** | Loading, empty, failed, permission-denied, plus links that force each on real routes |
| Vocabulaire | Domain terms and the full icon set, generated from the maps the app reads |
| **Écrans** | All 33 screens with a link, a one-line purpose, the role, and complete/partial — with the gap named where it is partial |

Everything in `components/ui`, `components/forms`, `components/motion`
and `components/data` has a specimen. Screen-level compositions — the
event detail tabs, the wizards — are listed in the route index with
links rather than inlined: they are compositions of the library, not
members of it.

Intentional literals are labelled. The four third-party brand colours
(WhatsApp, Instagram, Facebook, X) sit in a named constant with a
comment saying they must not be themed.

---

## 5. Dead ends

Walked both dashboards as a user. Six things led nowhere; all removed
rather than disabled, because a control that explains why it does
nothing is still a control that does nothing.

| Removed | What it was |
|---|---|
| `/support` | An entire route whose content was a "bientôt disponible" badge, reachable from the sidebar and the mobile menu |
| "Affiliés" tab on `/visibilite` | A single locked panel; a tab strip with one real tab is not a tab strip |
| Payout-advance card on `/settlements` | A product advertised with a disabled CTA |
| Payzone step in onboarding | A wizard step whose only control was disabled — five steps became four |
| "Envoyer un message" in the segment panel | A disabled button under a description of a Twilio integration that does not exist |
| Magic-link tab and `/login/forgot` | Neither had a backend; `/login/forgot` was never a route |

Two things that read as dead ends but were not, corrected rather than
removed: `/audiences` headlined "Audiences en construction", which says
the feature is unbuilt when in fact the account has not reached the
booking threshold; and the phone preview's "Réserver" was a real
`<button disabled>` that a screen reader announced as a broken button on
this page, now an `aria-hidden` div.

Also removed: `_v.js`, a screenshot script committed by accident in an
earlier phase.

**Verification.** All 21 sidebar entries across both workspaces clicked:
every one resolves 200 to a screen with a real heading. Every `href` in
the codebase resolves to an existing route. No TODO or FIXME markers, no
lorem text, no broken images, no console errors on any route.

---

## 6. Responsive

Walked all 26 in-shell routes at **390px**, **768px** and **1440px**,
measuring document width against viewport on each.

**Two defects found and fixed.**

`/settings` pushed the whole page sideways at tablet width — 1137px of
document in a 768px viewport. Its section nav is a scrolling row below
`lg`, and the row's `overflow-x-auto` was doing nothing because its grid
parent lacked `min-w-0`.

`/restaurant/reservations` — the carnet, where accepting and refusing
happens — had no phone lane, so it opened on four stacked KPI tiles and
a host had to scroll roughly a thousand pixels to reach a booking they
could act on.

**The three one-handed flows, measured at 390×844:**

| Flow | Result |
|---|---|
| Day view | Bottom tabs at y=779; hero and next arrivals above the fold |
| Check-in | Raised centre tab at y=768 opens the sheet; five "Arrivé" buttons between y=499 and y=785 |
| Accept / refuse | Filter to "À confirmer", row at y=341 with no scrolling, six actions at y=470–650 |

After the fixes: **no horizontal overflow on any route at any of the
three widths.**

---

## 7. Still incomplete

Stated plainly, not smoothed over. Seven of 33 screens are marked
`partial` in the route index, each with its gap named there and in the
README's real-vs-mocked table.

**Event workspace writes do not persist.** Creating an event, a promo
code or a boost shows a confirmation and stores nothing. The read path
is fully behind `EventRepository`; the write path is not — there is no
`EventRepository` mutation surface at all, because there is no event
backend to define its shape against. This is the largest remaining gap
and the one a backend team will hit first.

**No HTTP driver for the event side.** `HttpRestaurantRepository` exists
and is written against `/api/business/*`; its event counterpart does
not, for the same reason. A stub that silently returned nothing would be
worse than its honest absence.

**Authentication is not real.** Credentials are compared against a
literal list. No hashing, no tokens, no expiry beyond a 30-day cookie.
The `SessionDriver` interface and the account directory are the two
places a real implementation lands.

**PostgreSQL, S3 + CloudFront, live push** remain as they were: each has
an interface with a working stand-in, listed in `docs/HANDOFF.md` §3.

**The scanner camera is not wired.** `getUserMedia` is detected but not
read; the scan loop is simulated.

**Copy is only partly centralised.** Reusable strings, every error and
every toast live in `lib/copy/fr.ts`; roughly 500 one-off headings
remain inline in event-workspace pages. The rule for deciding which
move is in the module.

**One thing worth flagging as a judgement call.** Phase 2 established
that seed data was acceptable *only* as a database seed script, never as
committed data. Phase 4 requires the portal to run with no database.
These pull against each other. The resolution: the static dataset is a
driver behind the repository seam, selected by one rule, and it is
*generated* from the seed rather than written by hand. No component
imports it. If that trade is wrong, the fix is to delete
`static-repository.ts` and the snapshot — nothing else depends on them.

---

## Can a developer clone this, run it, and walk everything?

**Yes for running and walking it. Verified, not asserted:** a fresh
clone, `npm install`, `npx next build`, `npx next start` — 32 of 32
routes return 200 with no console or page errors, with no database, no
bucket, no key and no `.env`. Every state of every screen is reachable,
including the ones that need a forced switch to see. Every nav item
leads somewhere real.

**Yes for understanding it, with one caveat.** `/styleguide` answers
"what exists" without reading code; the README answers "how do I run it"
and "what is real"; `docs/INTERFACE.md` answers "how is it put
together". The caveat is honest rather than structural: this is a large
front end — 114 components, two workspaces, a spec engine — and a
developer will read code before they are productive in it. The documents
get them to the right file, not past it.

**The one place the answer is no:** a developer cannot see how a write
reaches a backend on the event side, because no such path exists to
look at. The venue side is the worked example — repository interface,
three drivers, server actions, optimistic client with rollback — and the
event side should be built to match it. Until then, "how do I persist a
new event?" is a question this repository cannot answer by itself, and
that is the first thing the external team will need to decide.
