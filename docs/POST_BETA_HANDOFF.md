# POST_BETA_HANDOFF

This is the spec for DigiNegoce's first sprint after the LYFE Espace
Organisateur BETA ships. Everything here was deliberately deferred —
the BETA build prioritises a polished, demo-ready surface for investors
and the Jazzablanca pilot. None of these items block BETA, but they're
the obvious next investments before a wider organiser rollout.

Source for this list: the codebase audit on
`claude/codebase-audit-mOMdw` and the ship-blocker triage that followed.

---

## 1. Real authentication

**Status:** demo-only. Sessions live in `localStorage` and are mirrored
to a presence cookie that `middleware.ts` reads to short-circuit
unauthenticated requests server-side. There are no real credentials,
no token verification, no rotation, no password reset flow.

**Replace:**

- `src/middleware.ts`
- `src/lib/auth/session.ts` (`readSession` / `writeSession` /
  `clearSession` / `seedDemoSession` / `switchRole` / `switchProfile`)
- `src/lib/auth/role.tsx` (`useRole`, `useProfile`, `RoleGate`)
- `src/components/auth/SessionGuard.tsx` (likely deletable once
  middleware enforces server-side)
- `src/app/login/page.tsx` (real magic-link / password handler)
- `src/app/login/forgot/page.tsx` (real reset flow, currently
  routes to a `mailto:`)
- `src/app/splash/page.tsx` (drops the `?demo=1&role=…` deep-link;
  add a real "switch profile" UI in `/settings`)

**Pick one:**

- **Auth.js (NextAuth v5).** Best fit if LYFE keeps Postgres + Prisma.
  Magic-link via Resend or Postmark, password via Credentials provider
  for the legacy organiser accounts.
- **Clerk.** Faster to ship if MFA, organisations, and invites are
  on the roadmap (Clerk handles all three out of the box and the
  organisation primitive maps cleanly to LYFE's `OrganizerProfile`).

Either way, role and organiser-id stay in the JWT/session, and the
existing `RoleGate` API keeps working with a thin adapter.

## 2. Outstanding security advisories on Next 14.2

`npm audit` reports 1 high severity vulnerability against
`next@14.2.35`. The fix lands in 15.5.x; we deliberately did not take
the upgrade in BETA (the 14 → 15 jump touches Suspense boundaries and
async dynamic-route params).

| Advisory | Severity | Fix |
| --- | --- | --- |
| GHSA-9g9p-9gw9-jx7f — Image Optimizer DoS | moderate | `>=15.5.10` |
| GHSA-h25m-26qc-wcjf — RSC HTTP deserialization DoS | high | `>=15.0.8` |
| GHSA-ggv3-7p47-pfv8 — Rewrites HTTP smuggling | moderate | `>=15.5.13` |
| GHSA-3x4c-7xq6-9pq8 — `next/image` cache growth | moderate | `>=15.5.14` |
| GHSA-q4gf-8mx6-v5v3 — Server Components DoS | high | `>=15.5.15` |

`postcss` was bumped to `^8.5.10` via an `overrides` field — the only
CVE that had a 14-line fix.

**Action:** upgrade to `next@15.5.x` (not 16.x) as the first
post-BETA commit. Migration items: tightened `useSearchParams` /
`Suspense` rules, async `params` and `searchParams` in dynamic
routes, `experimental.dynamicIO`. Run `npx @next/codemod@latest
upgrade` first, then sweep manually.

## 3. Test infrastructure

There are zero tests in the BETA build. We optimised for visual
finish over a regression net; that doesn't survive a wider rollout.

**Recommended stack:**

- **Vitest** for unit / module tests. Pairs well with the
  Tailwind v4 + TS toolchain. Target the type-aware code first:
  `lib/event/actions.ts`, `lib/utils/format.ts`, the mock seed
  generators, and any future `lib/api/` layer that replaces the
  mocks.
- **Playwright** for end-to-end. Cover the demo deep-links
  (`/splash?demo=1&role=…`), the wizard happy-path, the refund
  approve/deny optimistic flow, the role-gated CTAs (Owner sees
  "Créer un événement", Scanner doesn't), and the door-day Régie
  workflow.
- **React Testing Library** for component tests where the visual
  contract matters — `Tabs`, `Dialog`, `Toast`, `RoleGate`.

**First milestones:**

1. Vitest config + first 5 unit tests (format helpers, action
   resolver).
2. Playwright config + 1 smoke test that boots demo session and
   asserts the dashboard renders.
3. Wire both into the CI workflow below.

## 4. CI configuration

No CI today. Vercel handles preview deploys, but nothing gates
merges on green.

**Recommended:** GitHub Actions workflow at
`.github/workflows/ci.yml` running on every push and PR:

```yaml
- npm ci
- npm run lint        # next lint, currently zero violations
- npx tsc --noEmit    # strict-mode type check
- npm run build       # next build
- npx playwright test # once tests exist
- npx vitest run      # once tests exist
```

Cache `node_modules` and `.next/cache` between runs. Block PR merges
behind a passing workflow once the repo has more than the BETA
maintainer touching it.

## 5. File-splitting candidates

Six files cross the size threshold where audit-by-eye starts to
struggle. Order is by line count.

| File | LOC | Notes |
| --- | --- | --- |
| `src/components/event/RegieTab.tsx` | 761 | Door-day operations console: scan log, manual entry, comp issuance, no-show tracking. Split into `RegieScanLog`, `RegieManualEntry`, `RegieCompPanel`, `RegieKpis`. |
| `src/components/visibility/BoostWizard.tsx` | 677 | Multi-step boost-creation flow. Mirror the `wizard/` pattern — extract per-step components into `visibility/boost/Step*.tsx`. |
| `src/components/promoCodes/CreatePromoCodeDialog.tsx` | 603 | Big dialog with discount math + tier targeting. Pull the validation + math into `lib/promoCodes/` and the form into ~3 sub-components. |
| `src/components/organizer/Sidebar.tsx` | 442 | Holds desktop sidebar, mobile drawer, and the org-switcher card. Extract the org-switcher and the mobile drawer into siblings. |
| `src/components/event/PromoteTab.tsx` | 429 | Share kit (URL, QR, poster, social copy) + boost CTA. Split share kit from boost CTA. |
| `src/components/organizer/ScannerModal.tsx` | 425 | Camera mode + manual code mode + recent scans + comp issuance. Split per mode. |

These are deliberate during BETA — investor demos benefit from
self-contained components — but they'll resist contribution velocity
once the team grows.

## 6. Index-as-key residual cleanup

Six call-sites still use the loop index as a React `key`. Most iterate
static arrays so the bug surface is small, but they should be cleaned
up alongside the file-splitting above. Replace the index with a
stable id from the underlying mock data.

- `src/components/event/PromoteTab.tsx:424`
- `src/components/event/RegieTab.tsx:232`
- `src/components/event/BilanTab.tsx:190`
- `src/components/event/BilanTab.tsx:218`
- `src/components/event/BilanTab.tsx:246`
- `src/components/audiences/SegmentDetailPanel.tsx:107`
- `src/components/wizard/StepMedia.tsx:133`
- `src/components/wizard/StepMedia.tsx:263`

## 7. Known small debts

Not blockers, but easy to forget:

- The dashboard's `NOW = new Date("2026-04-25T19:30:00+01:00")` in
  `(organizer)/dashboard/page.tsx`, `cards/ActivityFeedItem.tsx`,
  and `cards/MobileUpcomingEventsRow.tsx` is a deliberate demo
  freeze. Replace with `Date.now()` once real event data flows.
- `lib/mock/*` should be replaced wholesale by `lib/api/*` calls.
  The types in `lib/types/domain.ts` mirror the eventual API
  shape; the swap is search-and-replace at the function level
  (`getOrganizerOverview()`, `getAllEvents()`, …).
- ESLint config is `next/core-web-vitals` with
  `react/no-unescaped-entities` disabled (French content, mostly
  apostrophes). Reconsider if the project ships English-language
  copy.
- No Prettier today. If the team grows, add it with the default
  config.
