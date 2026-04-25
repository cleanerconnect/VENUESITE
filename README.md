# LYFE — Tableau de bord organisateur

Self-serve organizer dashboard for LYFE, Morocco's lifestyle discovery
platform. Used by venues, promoters and event creators (Model A) to publish
events, track sales in real time, manage refunds, scan tickets at the door
and receive payouts.

This repo is the **mockup/UI build**. All data is mocked, shaped exactly like
the eventual API responses so the team at DigiNegoce can swap mock for real
fetches without touching components.

## Run locally

```bash
npm install
npm run dev
```

App boots at http://localhost:3000 — root path redirects to `/dashboard`.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS, custom design tokens (no shadcn, no UI kit)
- Zero runtime data dependencies — everything in `lib/mockData.ts`

## Routes

| Path | Screen |
| --- | --- |
| `/dashboard` | Overview — stats, upcoming events, live activity |
| `/events` | My Events — searchable / filterable list |
| `/events/new` | Create Event — 5-step wizard |
| `/events/[id]` | Event Detail — Sales / Attendees / Refunds / Scanner / Promote |
| `/scanner` | Mobile shortcut to today's scanner |
| `/settlements` | Next payout, history, LYFE commission invoices |
| `/team` | Members, invites, audit log |
| `/settings` | Profile, venue, payout (RIB), notifications, language, danger zone |
| `/more` | Mobile-only sheet for Team / Settings / Logout |

## Where the business logic lives

- **Fee structure** — `lib/format.ts` `computeFee()`. Single source of truth for
  the visible service fee (5.8% on Moroccan cards, 7.0% international).
  Organizer always keeps 100% of the face value.
- **Refund policy choice** — `components/wizard/StepRefund.tsx`. The cancel-
  the-event-yourself rule is hardcoded as policy text.
- **Settlement D+3** — surfaced via `formatCountdown()` in
  `app/settlements/page.tsx`.
- **Ticket transfer** — represented in `Attendee.qrStatus` and shown on the
  attendees table (original buyer + current holder).

## Design tokens

Configured in `tailwind.config.ts` and `app/globals.css`:

- `ink` `#0A1F3D`, `gold` `#C9A64C`, `bg` `#FAF7F0`, `surface` `#FFFFFF`
- `success` / `warning` / `error` / `info` semantic colors
- Fraunces (serif) for headings, Inter for body, `font-feature-settings: tnum`
  on every numeric class
- Borders 1px `#E0DAC7`, subtle `0 1px 2px rgba(0,0,0,0.04)` shadow on cards
- No `rounded-2xl`, no gradients, no emoji

## Responsive

- Desktop (≥1280px) — left sidebar (240px) + main content
- Tablet — same sidebar (collapsible target — left as TODO)
- Mobile (<768px) — bottom tab bar + top app bar; "Plus" sheet for
  Team / Settings / Logout

## What's wired vs. mock

- ✅ All routes render with realistic data
- ✅ Wizard auto-saves snapshot every 5s (toasts "Brouillon enregistré")
- ✅ Refund Approve / Deny is optimistic (state flips before any imagined
  network round-trip)
- ✅ Activity feed has the polling hook ready for a real WebSocket subscription
- ⏳ Real auth, real backend, real WebSocket, real QR camera — out of scope

## Backend wiring map

When a real API arrives, search-and-replace is roughly:

| Mock import | Real call (REST) |
| --- | --- |
| `events`, `getEventById` | `GET /organizer/events`, `GET /events/{id}` |
| `attendees` | `GET /events/{id}/attendees?cursor=...` |
| `refundRequests` | `GET /events/{id}/refunds` + PATCH on approve/deny |
| `payouts`, `invoices` | `GET /organizer/payouts`, `GET /organizer/invoices` |
| `team`, `auditLog` | `GET /organizer/team`, `GET /organizer/audit` |
| `activity` | WebSocket `wss://api.lyfe.ma/ws/organizer/{id}/activity` |

Component props already match these shapes — see `lib/types.ts`.

## Out of scope (per brief)

- Model B distribution features, partner inventory sync
- Rewards catalog management (LYFE admin side)
- Marketing automation, A/B testing on event pages
- Multi-language event pages (organizer dashboard is French-first)
