# LYFE — Espace Organisateur

A production-grade web dashboard for event organizers using **LYFE**, Morocco's
lifestyle discovery platform. Currently shipping the **Overview** screen as a
proof-of-concept for the visual direction; the remaining six screens are
stubs pending direction validation.

## Status

| Screen | State |
| --- | --- |
| `/dashboard` (Overview) | ✅ Built fully — hero greeting, dark Tonight card with capacity ring + AI nudge, bento KPI grid, events list, live activity feed |
| `/events` | ⏳ Empty-state stub |
| `/events/new` (5-step wizard) | ⏳ Empty-state stub |
| `/events/[id]` | ⏳ Empty-state stub |
| `/settlements` | ⏳ Empty-state stub |
| `/team` | ⏳ Empty-state stub |
| `/settings` | ⏳ Empty-state stub |

## Run

```bash
npm install
npm run dev
```

Boots at `http://localhost:3000`, redirects to `/dashboard`.

## Stack

- **Next.js 14** App Router with TypeScript strict mode and `src/` layout
- **Tailwind v4** — CSS-first config via `@theme` in `globals.css`
- **Motion** (formerly Framer Motion) — page-mount stagger, `layoutId`
  active-pill in sidebar, animated numbers, capacity-ring stroke fill
- **Radix UI** primitives — Dialog, Tabs, etc. (visuals 100% custom)
- **Recharts** — used in later screens for tier charts
- **Lucide React** — only icon library, stroke 1.6
- **Urbanist + Fraunces** via `next/font/google` — Urbanist for UI,
  Fraunces italic for editorial moments only

## Design tokens

All in `src/app/globals.css` under `@theme`:

- Brand: `--color-ink` `#0A1F3D`, `--color-gold` `#C9A64C`,
  `--color-canvas` `#FAF7F0`
- Surfaces: white `surface`, dark `surface-ink`, tinted `tint-{sand,sky,sage,rose,peach}`,
  `gold-soft` for the highlight tint, `canvas-2` for sidebar
- Status: `success`, `warning`, `danger`, `info` — pill use only
- Radii: `xs 6` / `sm 10` / `md 14` / `lg 20` / `xl 28` / `pill`
- Shadows: `soft` / `lift` / `deep` — earned, never default

Every numeric class uses tabular figures via `.num` (font-feature-settings
`tnum`, `lnum`, `ss01`).

## Folder structure

```
src/
  app/
    layout.tsx                  # Root: fonts, metadata
    page.tsx                    # Redirect to /dashboard
    globals.css                 # Tailwind v4 + @theme tokens
    (organizer)/
      layout.tsx                # Sidebar + Topbar + BottomTabs shell
      dashboard/page.tsx        # Overview — fully built
      events/...                # Stubs
      settlements/page.tsx
      team/page.tsx
      settings/page.tsx
  components/
    ui/                          # Card, Button, Pill, Input, ProgressBar, EmptyState
    motion/                      # Stagger, AnimatedNumber, LivePulse
    organizer/                   # Sidebar, Topbar, BottomTabs, Brand
    cards/                       # HeroTonight, StatTile, CapacityRing,
                                 # Sparkline, UpcomingEventRow, ActivityFeedItem
  lib/
    types/domain.ts              # Mirrors eventual API shape
    mock/organizer.ts            # getOrganizerOverview() — typed factory
    utils/{cn,format,motion}.ts
```

## What's wired

- **Cinematic page mount** — hero block → bento grid → events + activity
  feed, staggered with 40ms between children, 8px y-fade. Replays only on
  first paint of `/dashboard`, not on subsequent navigations.
- **Animated numbers** — KPI tiles count up from 0 on view.
- **Live pulse** — gold dot loops on the Tonight hero, on activity items
  newer than 60s, and on the activity feed header.
- **Sidebar `layoutId` pill** — the gold-soft active-state slides between
  nav items when you click around.
- **Capacity ring** — animated SVG stroke fill (1.4s, 220ms delay).
- **Sparkline** — animated path-length draw + last-point dot.
- **Hero card glow** — exact recipe from brief: gold radial top-right +
  cool blue radial bottom-right, both low-alpha on dark navy.
- **AI nudge** — a quiet first-class panel inside the Tonight card with a
  predicted peak-hour insight.

## What's mocked but typed for handoff

`getOrganizerOverview()` in `src/lib/mock/organizer.ts` returns
`OverviewData` (see `src/lib/types/domain.ts`). Every field on the page
flows from this shape — when the real API arrives, swap mock for `fetch()`
without touching components.

## Next step

Direction validation. After review, the other six screens build out in the
same visual language (My Events, Event Detail with tabs, Create Event
wizard with autosave + drag-and-drop tiers + live phone preview,
Settlements, Team, Settings).
