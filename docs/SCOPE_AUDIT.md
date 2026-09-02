# Scope audit — Partner Dashboard (EP40-US1 / EP40-US2)

Audit of `lyfe-organizer-dashboard` (repo `cleanerconnect/VENUESITE`)
against the Restaurant/Drinks partner dashboard scope. Every item below
was checked against the code, not against the backlog.

**States:** Present · Partial · Missing (state *before* this pass), then
what changed.

---

## Two findings that change the brief's assumptions

**1. There is no subscription-tier logic in the code — none.** The brief
asks to flag Free/Premium/Enterprise gating so it can be reconciled
against the single annual subscription LYFE actually sells. A full search
found no such gating anywhere. The only "tier" in the codebase is
`tierName` — event *ticket price* tiers (Pass Jour, Carré Or), an
unrelated concept — and `LockedAudiences`, which gates on a booking-count
threshold, not a plan.

So there is nothing to reconcile in code. The mismatch lives in the
chiffrage document only. To keep it that way, `business_accounts.subscription_tier`
is carried in the type because the column exists, but **nothing reads its
value**; feature access goes through `features_enabled`. A commercial
change stays a data change.

**2. Auth against the Business Service does not exist yet.** The portal
authenticates against a demo `localStorage` session with a presence
cookie for the middleware. No `/api/business/*` call, no
`business_accounts`, no venue scoping. This is the single largest gap and
it sits underneath every other item — the endpoints are now defined and
typed, but nothing authenticates.

---

## 1. Reservation operations

| # | Item | Before | Now | Where |
|---|---|---|---|---|
| 1.1 | View today's reservations | **Partial** — day list with search/sort/filter tabs existed, but read the mock service payload, not `GET /api/business/bookings` | **Present** (portal side) | `/restaurant/reservations` · `lib/restaurant/screens.ts` |
| 1.2 | Accept / refuse | **Partial** — confirm and cancel existed; no refuse-with-reason, and refusal was conflated with cancellation | **Present** | `RejectBookingDialog.tsx` · `PUT /api/business/bookings/{id}/reject` |
| 1.3 | Attendance by QR scan | **Missing** — a scanner exists but is event-only (`ScannerModal`) and scans event tickets | **Missing** | contract defined: `checkIn()` · `POST …/check-in` |
| 1.4 | Report a no-show | **Missing** — `no_show` existed as a state and an activity type, with no action to set it and no per-customer history | **Present** | row action · `reportNoShow()` writes customer history |
| 1.5 | Edit availability | **Missing** | **Partial** — open/close a slot and remove a closure work; editing a slot's times or capacity needs a form block | `/restaurant/disponibilites` |
| 1.6 | New-reservation notifications | **Missing** | **Partial** — payloads, preferences and endpoints defined and mocked; no bell UI, no delivery | `types/business.ts` · `mock/business.ts` |

**Real-time push back to the consumer app (1.2)** is **Missing** and is
the highest-value remaining item. The webhook receiver exists and is
signature-verified, but nothing pushes *out*, and nothing updates an
already-open dashboard. See `docs/INTEGRATION.md` § Live updates.

## 2. Analytics

| # | Item | Before | Now | Where |
|---|---|---|---|---|
| 2.1 | Venue analytics | **Partial** — occupancy and revenue existed as single-service KPI tiles; no no-show *rate*, no period selection, no endpoint | **Present** | `/restaurant/analytique` · `GET /api/business/analytics` |
| 2.2 | Reports | **Missing** | **Missing** | — |
| 2.3 | Settings | **Partial** — an eight-section settings page exists, written for event organisers; venue details render only for venue-type profiles | **Partial** | `/settings` |

**Charting library.** The chiffrage names Chart.js. The codebase uses
**Recharts**, already wired into the event dashboard and now the
restaurant one. Swapping it would be a rewrite of every chart for no
functional gain — flagged for the chiffrage rather than acted on.

## 3. Visibility and reputation

| # | Item | Before | Now | Where |
|---|---|---|---|---|
| 3.1 | Boost listing | **Partial** — a full boost wizard exists for events; nothing for venues | **Present** (basic) | `/restaurant/visibilite` — start/stop; the event wizard's targeting depth is not ported |
| 3.2 | Reply to reviews | **Partial** — reviews render with an unanswered count; the reply action only toasts | **Partial** | `/restaurant/avis` — no compose UI, no moderation flag |
| 3.3 | Audience / visibility metrics | **Missing** for venues (a rich `/audiences` exists for events) | **Present** | `/restaurant/visibilite` |
| 3.4 | Support channel | **Partial** — `/support` exists but is the event participant inbox and is not in the restaurant nav | **Partial** | `/support` |

## 4. CRM

| # | Item | Before | Now | Where |
|---|---|---|---|---|
| 4.1 | Customer base | **Missing** | **Present** | `/restaurant/clients` — six derived segments, search, five sorts, CSV export |
| 4.2 | Detailed customer profile | **Missing** | **Present** | `lib/restaurant/crm.ts` → detail drawer |

The profile carries every field the brief lists: identity and contact,
visit count and last visit, average spend, recurring preferences,
reviews left, loyalty tier, and no-show history with a risk indicator.
It opens from the customer list and from a booking — both call
`customerDetail()`, so the two cannot drift apart.

The base is **folded from booking history**, not listed. That is the
brief's rule in code: there is deliberately no create endpoint, because a
venue never enters a customer by hand.

## 5. Access management

| # | Item | Before | Now | Where |
|---|---|---|---|---|
| 5.1 | Team and roles | **Partial** — a team page with owner/admin/scanner roles, invite and audit log exists, but is event-scoped and not venue-scoped; the `scanner` role is an event-door concept | **Partial** | `/team` |

Roles gate the UI correctly today (`RoleGate`, `allow` on nav items and
CTAs). What is missing is venue scoping — a member belongs to an
organizer, not to a `venue_id` — and a role vocabulary that fits a
restaurant floor rather than a festival gate.

---

## Not completed, and why

| Item | Reason |
|---|---|
| QR check-in (1.3) | Needs browser camera capture plus a manual-code fallback. The camera pattern exists in `ScannerModal` but is bound to event tickets; the contract (`checkIn()`) is defined and the mock resolves codes, so this is UI work on a settled interface. |
| Notification delivery (1.6) | Payloads, preferences and endpoints are defined and mocked. The bell UI and actual push/email delivery are not built. |
| Availability time/capacity editing (1.5) | The spec engine has no form block. Adding one is the right fix — a generic `form` block would also serve settings — rather than a bespoke editor that breaks the pattern. |
| Reports (2.2) | Not started. |
| Review reply compose + moderation flag (3.2) | Moderation rules are pending on the LYFE side, per the brief. The compose UI is not built; the publish step should stay behind a flag until the rules land. |
| Venue-scoped team and roles (5.1) | Requires `business_accounts` auth to exist first — scoping a member to a venue is meaningless until the session carries a `venue_id`. |
| Real-time push to the consumer app | Needs a live channel; documented in `docs/INTEGRATION.md`. |
| Business Service auth | The portal still runs the demo session. Every endpoint above is typed and implemented on both adapters, but nothing authenticates against `/api/business/*` yet. |

## Restaurant / Drinks

The brief requires one base with two configurations. `lib/venue/config.ts`
holds the difference — vocabulary (`couverts` vs `personnes`, `service`
vs `créneau`, `Carte` vs `Carte des boissons`) and default turn time. The
screen list, the blocks and the components are shared. A Drinks venue is
a config value, not a build.

**Not yet done:** the screen builders still read the restaurant
vocabulary directly rather than through `venueConfig()`. The config exists
and is correct; threading it through is mechanical and untouched by this
pass.
