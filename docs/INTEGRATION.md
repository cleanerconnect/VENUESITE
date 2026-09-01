# Integration guide

How to take this app from mocks to production. Written for the dev team
picking it up, not for the people who built it.

Three seams carry everything: **data**, **AI**, **app connections**. Each
is an interface with two implementations — a mock that ships today and a
real one selected by an environment variable. Integration is filling in
the real side of each seam. No screen, block or component changes.

```
                    ┌──────────────────────────────────────┐
   screens/blocks   │  pure functions of RestaurantOverview │  ← never touched
                    └──────────────────┬───────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
  ┌─────▼──────┐               ┌───────▼──────┐              ┌────────▼───────┐
  │  DATA seam │               │   AI seam    │              │  APP seam      │
  │ Repository │               │  AiAdvisor   │              │  webhooks      │
  ├────────────┤               ├──────────────┤              ├────────────────┤
  │ Mock ← now │               │ Mock ← now   │              │ verified ← now │
  │ Http ← you │               │ Claude ← you │              │ live push ← you│
  └────────────┘               └──────────────┘              └────────────────┘
```

Check which side is live at any time:

```bash
curl -s localhost:3000/api/health
# {"status":"ok","adapters":{"data":"mock","ai":"mock"}}
```

**Read that after every deploy.** Both seams fall back to mocks when
unconfigured — that is what lets a designer run the app with no
credentials, and it is also how a misconfigured production deploy looks
healthy while serving demo data.

---

## Order of work

1. **Data seam** — the app shows real bookings. Everything else is
   cosmetic until this lands.
2. **App connections** — bookings from the consumer app reach the pass.
3. **Live updates** — an open dashboard reacts without a refresh (the one
   genuinely unfinished piece; see below).
4. **AI seam** — last, because it is the only part that is optional. The
   workspace is fully usable with the mock advisor.

---

## 1. Data seam

**Interface:** `src/lib/data/repository.ts`
**Implementations:** `mock-repository.ts` (now) · `http-repository.ts` (yours)
**Selection:** `src/lib/data/index.ts`, on `LYFE_API_BASE_URL` + `LYFE_API_TOKEN`

The HTTP adapter is written and typed. It expects these endpoints:

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/restaurants/{id}/overview` | `RestaurantOverview` |
| `POST` | `/restaurants/{id}/reservations/{rid}/seat` | `RestaurantOverview` |
| `POST` | `/restaurants/{id}/reservations/{rid}/confirm` | `RestaurantOverview` |
| `POST` | `/restaurants/{id}/reservations/{rid}/cancel` | `RestaurantOverview` |
| `POST` | `/restaurants/{id}/tables/{tid}/clear` | `RestaurantOverview` |
| `POST` | `/restaurants/{id}/reservations/{rid}/remind` | `204` |
| `POST` | `/restaurants/{id}/reviews/{rid}/reply` | `204` |

Auth is `Authorization: Bearer ${LYFE_API_TOKEN}`.

**Two contract decisions worth keeping.** Reads are one call per screen,
not one per entity — the dashboard renders a coherent snapshot, and six
round trips would let the hero card disagree with the floor plan.
Mutations return the full payload rather than `204`, so the client can
reconcile its optimistic copy against what actually happened instead of
firing a second fetch and living with a window where the two disagree.

**The response shape is `RestaurantOverview`** (`src/lib/types/restaurant.ts`),
verbatim. If your backend returns something else, map it in one place —
add a `mapOverview()` inside `http-repository.ts`. Do not spread the
mapping across the app; the whole point of the seam is that exactly one
file knows the wire format.

**Verify:**

```bash
LYFE_API_BASE_URL=https://api.lyfe.ma/v1 LYFE_API_TOKEN=… npm run start
curl -s localhost:3000/api/health   # expect "data":"http"
```

### Optimistic writes

`src/lib/restaurant/store.ts` applies mutations to a client-side copy of
the payload immediately and keeps the previous copy for undo. The screens
are pure functions of that payload, so one mutation repaints the floor
plan, the KPIs, the hero ring and the activity feed together.

To make writes hit the backend, call the repository from the store's
mutations and reconcile with the returned payload — roll back to the undo
snapshot on rejection. The snapshot mechanism is already there; that is
what it is for.

---

## 2. AI seam

**Interface:** `src/lib/ai/advisor.ts`
**Schemas:** `src/lib/ai/schemas.ts` — *these are the contract*
**Implementations:** `mock-advisor.ts` (now) · `claude-advisor.ts` (written, needs a key)
**Selection:** `src/lib/ai/index.ts`

Four capabilities, all returning **validated structured data**, never free
text a component has to parse:

| Capability | Feeds | Effort |
| --- | --- | --- |
| `serviceNudge` | the violet-soft suggestion card | `high` |
| `noShowRisk` | risk badges + the SMS-reminder prompt | `low` |
| `reviewDigest` | sentiment clusters on `/restaurant/avis` | `medium` |
| `anomalies` | flagged rows in the activity rail | `medium` |
| `assistant` | the ⌘J assistant, streamed | `medium` |

Implementation notes, since these are the choices a reviewer will query:

- **Model `claude-opus-5`, adaptive thinking, effort tuned per call.**
  Scoring a short list of reservations against explicit features is not
  the same problem as reading a whole service and deciding what a manager
  should do next.
- **Structured outputs via `messages.parse()` + Zod.** The response is
  constrained to the schema, so a nudge either validates or throws at the
  boundary — it never reaches a card half-formed.
- **The system prompt is frozen and cached.** Caching is a prefix match:
  it is the same bytes every request, sits before the breakpoint, and the
  per-service payload goes after it. Putting a timestamp in that prompt
  would silently cost the entire discount — if `usage.cache_read_input_tokens`
  is ever zero across repeated calls, that is the first thing to check.
- **Failures degrade, they do not throw.** A structured call that fails
  returns `null` and the card is dropped. A dashboard whose floor plan
  won't render because the advice model timed out is a worse product than
  one that quietly shows one less card.
- **Low-confidence advice is suppressed** (`confidence < 0.5`). A card
  that is usually noise trains the team to ignore the one that mattered.

**Enable:**

```bash
ANTHROPIC_API_KEY=sk-ant-… npm run start
curl -s localhost:3000/api/health   # expect "ai":"claude"
```

The SDK also accepts `ANTHROPIC_AUTH_TOKEN` or an `ant auth login`
profile. With either of those, set `LYFE_AI_ENABLED=true` so the app knows
to use the real advisor.

**Kill switch:** `LYFE_AI_ENABLED=false` falls back to the mock advisor
without a redeploy. Use it when a provider degrades or a bill spikes — the
workspace stays fully usable.

**Cost shape.** The nudge runs once per dashboard render, which is the
hot path — it is the one to watch. The digest and anomaly calls are cheap
per-screen. The frozen cached prefix carries most of the input tokens, so
the marginal cost of a render is roughly the service context plus the
output. If spend needs tuning, lower `effort` on the nudge before
reaching for a smaller model.

**Streaming assistant:** `POST /api/assistant` → Server-Sent Events,
`data: {"text":"…"}` frames, terminated by `data: [DONE]`. The key, the
system prompt and the model choice all stay server-side; the browser only
knows how to append text deltas. The client falls back to the local
canned responder if the endpoint fails, so the assistant never renders an
empty bubble.

---

## 3. App connections

**Contract:** `src/lib/integrations/events.ts`
**Verification:** `src/lib/integrations/signature.ts`
**Endpoint:** `POST /api/webhooks/lyfe`

A diner books in the consumer app; this is how the table reaches the pass.

| Event | Meaning |
| --- | --- |
| `reservation.created` / `.confirmed` / `.cancelled` | booking lifecycle |
| `reservation.seated` / `.no_show` | service outcome |
| `waitlist.joined` | walk-in queued |
| `table.freed` | floor change from the POS |
| `review.received` | new guest review |
| `menu.item_86` | kitchen marked a dish out |
| `payout.settled` | settlement closed |

**Events name what happened, never a patch to apply.** The handler
re-reads the overview and re-derives, so a missed or duplicated delivery
costs a redundant fetch instead of a floor plan that has drifted out of
sync with the book. Keep that property if you extend the contract.

**Signature scheme.** Header `lyfe-signature: t=<unix>,v1=<hex>`, where
the HMAC-SHA256 is over `` `${t}.${rawBody}` `` with `LYFE_WEBHOOK_SECRET`.
Computed over the **raw** body — re-serialising the JSON changes bytes and
breaks the signature. Timestamps outside ±300s are rejected, which closes
the replay window: a captured `reservation.cancelled` is worthless five
minutes later.

Without `LYFE_WEBHOOK_SECRET` the endpoint returns **503, not 200**.
A public URL that mutates what a restaurant sees on the pass must refuse
unverified writes; being down is the safer failure.

**Verify:**

```bash
BODY='{"id":"evt_1","type":"reservation.created","restaurantId":"rst_dar_zellij","occurredAt":"2026-09-01T12:00:00Z","subjectId":"res_9","source":"app"}'
TS=$(date +%s)
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$LYFE_WEBHOOK_SECRET" -hex | sed 's/.*= //')
curl -s -X POST localhost:3000/api/webhooks/lyfe \
  -H "lyfe-signature: t=$TS,v1=$SIG" -H 'Content-Type: application/json' -d "$BODY"
# {"status":"accepted","eventId":"evt_1"}
```

Verified behaviour: missing / bad / stale signature → `401`; valid →
`accepted`; same id again → `duplicate`; unknown type → `unsupported_event`.

### Live updates — the unfinished piece

`revalidatePath` makes the **next navigation** fresh. It does **not** push
to a dashboard that is already open: the route is `force-dynamic`, so
there is no full-route cache to bust, and a manager staring at the pass
sees nothing until they navigate.

Closing this needs a live channel. Two workable shapes:

- **SSE from this app** — add `GET /api/restaurant/stream`, have the
  webhook publish to it, and have `RestaurantScreen` re-hydrate the store
  on each event. Least new infrastructure; needs a shared bus if you run
  more than one instance.
- **Hosted pub/sub** (Pusher, Ably, Supabase Realtime) — the webhook
  publishes, the client subscribes. More robust across instances, one more
  vendor.

Either way the client should **re-fetch and re-derive**, not patch — the
same rule as the webhook contract, for the same reason.

### Also not built

- **Dedupe is in-process** (`Map` in the webhook route). Fine for a single
  instance; back it with Redis before scaling out or a retry storm will
  double-apply across instances.
- **Push notifications and deep links** into the consumer app. The nav
  hrefs are already generated by `restaurantHref(slug)`, so deep-link
  targets are enumerable from `src/lib/restaurant/slugs.ts`.

---

## Environment

Copy `.env.example` to `.env.local`. Every var is optional; unset means
mock.

| Variable | Seam | Effect when unset |
| --- | --- | --- |
| `LYFE_API_BASE_URL` | data | mock data (needs `LYFE_API_TOKEN` too) |
| `LYFE_API_TOKEN` | data | mock data |
| `ANTHROPIC_API_KEY` | AI | mock advisor |
| `LYFE_AI_ENABLED` | AI | `true` forces on with non-key credentials; `false` is the kill switch |
| `LYFE_WEBHOOK_SECRET` | app | webhook returns 503 |

---

## Where things live

```
src/lib/data/          data seam — repository, mock, HTTP, selection
src/lib/ai/            AI seam — advisor, schemas, mock, Claude, selection
src/lib/integrations/  app seam — event contract, signature verification
src/app/api/           assistant (SSE) · webhooks/lyfe · health

src/lib/types/restaurant.ts   the wire shape — the contract with the backend
src/lib/restaurant/slugs.ts   the one list of screens; links are type-checked
src/lib/restaurant/screens.ts payload → ScreenSpec, one builder per screen
src/lib/dashboard/            the spec vocabulary and renderer
```

The screen builders are **pure functions** of the payload. That is what
makes the AI and data seams swappable without touching a component, and
what lets the client re-derive a whole screen from its optimistic copy
after a mutation. Keep them pure.

## Known caveat

`notFound()` renders the 404 page but responds `200`, because the
`(organizer)` shell is a client component and the response has already
begun streaming by the time the nested server component throws. Pre-existing
app behaviour — `/events/[id]` does the same. If the status code matters
for monitoring or crawlers, validate the slug in `middleware.ts` (the list
is dependency-free in `src/lib/restaurant/slugs.ts`, importable from the
edge runtime).
