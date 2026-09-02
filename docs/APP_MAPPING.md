# App → dashboard mapping

For every element the LYFE consumer app shows about a venue or an event,
this says where a partner controls it, whether that control exists today,
and where the value comes from.

Read it as the contract between the two surfaces. If the app renders
something no row here accounts for, the partner cannot change it — and a
venue that cannot fix its own listing calls support.

**Status:** ✅ editable in the portal · 🔎 read-only in the portal ·
⛔ not in the portal at all.

---

## Part 1 — Venue (restaurant / drinks)

### 1.1 Identity and how the venue appears

| App element | Portal surface | Field / source | Status |
|---|---|---|---|
| Venue name | Réglages → Identité | `venues.name` | ✅ |
| Short name (lists, nav) | Réglages → Identité | `venues.short_name` | ✅ |
| Description | Réglages → Identité | `venues.description` | ✅ |
| Category ("Marocaine contemporaine") | Réglages → Identité | `venues.category` | ✅ |
| Venue type (restaurant / bar) | Réglages → Identité | `venues.kind` | ✅ |
| Address | Réglages → Identité | `venues.address`, `.city` | ✅ |
| Map pin | Réglages → Identité | `venues.latitude`, `.longitude` | ✅ |
| Phone, e-mail, website | Réglages → Identité | `venues.contact_*`, `.website` | ✅ |
| Price band (€ – €€€€) | Réglages → **Fiche** | `venues.price_range` | ✅ *(added this pass)* |
| Search keywords | Réglages → **Fiche** | `venue_tags` kind `tag` | ✅ *(added)* |
| Facilities (terrace, Wi-Fi, PMR…) | Réglages → **Fiche** | `venue_tags` kind `feature` | ✅ *(added)* |
| Ambience chips | Réglages → **Fiche** | `venue_tags` kind `ambience` | ✅ *(added)* |
| Cover photo + gallery | Réglages → Photos | `assets` kind `photo`, ordered | ✅ |
| Menu as a file (PDF/image) | Réglages → Photos | `assets` kind `menu_file` | ✅ |
| Seating areas (terrasse, salle…) | — | `zones` | 🔎 *(seeded; no editor)* |
| Rating and review count | Aperçu, Avis | derived from `reviews` | 🔎 by design |

### 1.2 The card a diner reads before booking

| App element | Portal surface | Field / source | Status |
|---|---|---|---|
| Dish name | Réglages → **Carte** | `menu_items.name` | ✅ *(added)* |
| Dish description | Réglages → **Carte** | `menu_items.description` | ✅ *(added)* |
| Price | Réglages → **Carte** | `menu_items.price_cents` | ✅ *(added)* |
| Category (entrée / plat / …) | Réglages → **Carte** | `menu_items.category` | ✅ *(added)* |
| "Spécialité de la maison" | Réglages → **Carte** | `menu_items.signature` | ✅ *(added)* |
| Dietary chips (vegan, halal…) | Réglages → **Carte** | `menu_item_dietary` | ✅ *(added)* |
| Whether the dish is listed at all | Réglages → **Carte** | `menu_items.visible` | ✅ *(added)* |
| Adding / removing a dish | — | — | ⛔ **gap** — the editor edits existing rows only |

### 1.3 What a diner can book

| App element | Portal surface | Field / source | Status |
|---|---|---|---|
| Bookable days and hours | Disponibilités | `availability_slots` | ✅ |
| Capacity per slot | Disponibilités | `availability_slots.capacity` | ✅ |
| Slot closed / open | Disponibilités | `availability_slots.enabled` | ✅ |
| Exceptional closures | Disponibilités | `closures` | ✅ |
| Slot shown as full | app-side | derived from bookings vs capacity | 🔎 |

Availability is the one edit that changes what a customer can book *right
now*, so `availability_slots` carries a `version` column and the write
path uses optimistic concurrency: a lost update here is a double booking.

### 1.4 The booking lifecycle

The app and the portal are two ends of one state machine.

| Event | Origin | Portal surface |
|---|---|---|
| Guest requests a booking | app | Carnet → "À confirmer", nudge on Aperçu |
| Venue confirms | **portal** | `reservation.confirm` |
| Venue refuses | **portal** | `reservation.reject`, with a coded reason |
| Guest cancels | app | Carnet, activity feed |
| Guest joins the waitlist | app | Carnet → "Liste d'attente" |
| Venue promotes from the waitlist | **portal** | `waitlist.admitNext` |
| Guest arrives — QR scanned | app QR, portal validates | Check-in |
| Guest arrives — manual | **portal** | `reservation.arrive` |
| Guest never arrives | **portal** | `reservation.noShow` |

Two invariants the portal holds and must keep holding:

- **Refusal is not cancellation.** A venue refusing a request and a guest
  withdrawing one are different events with different downstream
  analytics. `rejectReservation` carries a coded `RejectionReason` so
  refusals can be aggregated; a free-text-only reason cannot be.
- **The portal validates the QR, it never mints it.** The code is issued
  app-side (EP20-US9) and resolved server-side. The portal passes the
  scanned string along and does not parse it beyond that.

### 1.5 Money

| App element | Portal surface | Source | Status |
|---|---|---|---|
| Deposit taken at booking | Carnet (row + detail) | `reservations.deposit_cents` | 🔎 |
| Payouts, commission, schedule | Versements | `payouts` | 🔎 by design |
| Loyalty points | Clients | reported, never computed here | 🔎 by design |

Loyalty is **reported, not computed**. The portal displays what the
loyalty service says; it does not derive points from covers. Two systems
computing the same balance is how a partner and a guest end up seeing
different numbers.

### 1.6 Inbound events

`POST /api/webhooks/lyfe` accepts these, and nothing else:

```
reservation.created     reservation.confirmed   reservation.cancelled
reservation.arrived     reservation.no_show     waitlist.joined
review.received         payout.settled
```

An event names *what happened and to which entity*, never a patch to
apply. The dashboard re-reads the overview and re-derives, so a missed or
duplicated delivery costs a redundant fetch rather than a screen that
drifts out of sync with the book. `id` is stable across retries — dedupe
on it.

Source is one of `app | web | phone | system`. There is no `pos`: LYFE
does not sit in the till.

---

## Part 2 — Event (organiser)

### 2.1 The listing

| App element | Portal surface | Status |
|---|---|---|
| Event name, description | Événement → Édition | ✅ |
| Cover image, gallery | Assistant de création → Média | ✅ |
| Date, doors, venue | Événement → Édition | ✅ |
| Line-up / programme | Assistant de création → Info | ✅ |
| Ticket tiers, prices, quotas | Assistant → Tarifs | ✅ |
| Tier transferability | Assistant → Tarifs | ✅ |
| Refund policy | Assistant → Remboursement | ✅ |
| Promo codes | Codes promo | ✅ |
| Listing state (draft / review / on sale) | Événements | 🔎 — moderation is LYFE's |

### 2.2 The sale

| App element | Portal surface | Status |
|---|---|---|
| Tickets sold, remaining | Événement → Ventes | 🔎 |
| Sell-through vs projection | Événement → Analyses | 🔎 |
| Sales by channel | Événement → Analyses | 🔎 |
| Buyer profile, cohorts | Audiences | 🔎 |
| Boosts and affiliates | Visibilité | ✅ (launch / stop) |

### 2.3 The door

| App element | Portal surface | Status |
|---|---|---|
| Attendee's ticket QR | Scanner | 🔎 — portal validates, never mints |
| Check-in state | Scanner, Participants | ✅ |
| Comps and invitations | Événement → Invitations | ✅ |
| Refunds | Événement → Remboursements | ✅ |

### 2.4 After

| App element | Portal surface | Status |
|---|---|---|
| Post-event report | Bilans | 🔎 generated |
| Attendee reviews | Événement → Analyses | 🔎 |
| Settlement and payout | Versements | 🔎 |

---

## Part 3 — Gaps, ranked

| # | Gap | Consequence | Effort |
|---|---|---|---|
| 1 | No add/remove for menu items | A venue with a new dish has to send it to support | Small — the write path exists, it needs an insert and a delete |
| 2 | No editor for seating areas | A venue that opens a rooftop cannot list it | Small |
| 3 | Event listing fields read fixtures | Nothing a partner edits on the event side persists | Large — see `docs/CONVERGENCE.md` §4 |
| 4 | No preview of the app listing | A partner edits blind and finds out from a customer | Medium — the data is all present; it needs a render |

Gap 4 is the one worth arguing for. Every field in Part 1 is edited in a
form and rendered somewhere else entirely. A read-only "voici votre fiche
dans l'application" panel beside the listing editor would close the loop
that currently runs through a customer complaint.
