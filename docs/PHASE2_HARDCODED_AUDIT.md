# Phase 2 — hardcoded data audit

Inventory taken before any change, per the brief. Scope of the count is
**domain data**: values a venue sees on screen, or would reasonably want
to change. UI chrome copy (button labels, section headings, nav labels) is
not counted — a venue does not edit the word "Réservations".

## Headline

**Every piece of domain data in the running app is an object literal.**
There is no database, no ORM and no object-storage client in the project:

```
$ grep -E '"(pg|postgres|prisma|drizzle|better-sqlite3|kysely|@aws-sdk)' package.json
  → no match
```

`src/lib/mock/` is 5,438 lines of fixtures across 18 modules. Nothing in
the app survives a page reload except the demo session and the client-side
optimistic overlay, which is discarded on navigation.

## A. Restaurant / Drinks perimeter — the Phase 2 target

| Entity | Where | Lines | Notes |
|---|---|---|---|
| Venue identity | `mock/restaurant.ts` `RESTAURANT` | 33–48 | name, city, cuisine, capacity, contact, website, currency |
| Zones | `mock/restaurant.ts` | 91 | 3 zones with capacities |
| Services + slot load | `mock/restaurant.ts` | 126–192 | opening/closing, capacity, covers, revenue, turn time |
| Tables | `mock/restaurant.ts` | 194 | 13 tables, seats, state, bill |
| Reservations | `mock/restaurant.ts` | 210 | 5 bookings, names, phones, notes, deposits |
| Waitlist | `mock/restaurant.ts` | 290 | 2 parties |
| Menu items | `mock/restaurant.ts` | 317 | 6 dishes with **prices and food costs** |
| Reviews | `mock/restaurant.ts` | 326 | 4 reviews with ratings and verbatim |
| Activity feed | `mock/restaurant.ts` | 333 | 10 entries |
| Payouts | `mock/restaurant.ts` | 346 | 3 settlements with amounts |
| Business account | `mock/business.ts` `BUSINESS_ACCOUNT` | 32 | business_id, venue_id, owner_id, tier, features |
| **Opening hours** | `mock/business.ts` `WEEKDAY_SLOTS` | 50 | 14 weekly slots with capacities |
| Closures | `mock/business.ts` | 67 | 1 closure |
| **Customers** | `mock/business.ts` `HISTORY` | 94 | 12 customers: names, phones, emails, visits, spend, preferences, no-show counts |
| Notifications | `mock/business.ts` | 292 | 3 notifications |
| Notification prefs | `mock/business.ts` | 332 | per-event channels |
| Analytics series | `mock/business.ts` `getAnalytics` | 229 | **computed from a hardcoded shape**, not measured |
| Visibility metrics | `mock/business.ts` | 274 | impressions, views, reach, conversion |
| Staff | — | — | **absent for venues**; `mock/team.ts` is event-scoped |
| Venue photos / menu files | — | — | **absent entirely**; no asset model exists |

## B. Domain literals leaking outside `mock/`

These are worse than fixtures, because they bind application code to one
venue:

| Location | Literal | Impact |
|---|---|---|
| `app/(organizer)/restaurant/[[...section]]/page.tsx` | `RESTAURANT.id` × 6 | **The route imports the venue constant.** Every query is scoped to one hardcoded venue — this is the scoping hole the brief names |
| `lib/mock/business.ts:26` | `import { RESTAURANT }` | business data keyed off the venue fixture |
| `lib/nav/workspaces.ts` | `RESTAURANT` entity card | sidebar identity is a compile-time constant |
| `lib/auth/session.ts:30` | `DEFAULT_ORG_ID = "org_jazzablanca"` | session defaults to a specific org |
| `lib/mock/users.ts:35` | `DEFAULT_USER_ID = "usr_mido"` | identity defaults to a specific person |
| `app/(organizer)/bilans/page.tsx:30` | `profile.id !== "org_jazzablanca"` | **business logic branching on a venue id** |
| `lib/mock/audiences.ts:435` | `profileId === "org_jazzablanca"` | same |
| `components/wizard/StepInfo.tsx:100` | venue dropdown | 4 venue names and cities hardcoded in a form |
| `components/wizard/PhonePreview.tsx:15` | venue→city map | same data, second copy |
| `components/organizer/ScannerModal.tsx:30` | scan log with codes and staff names | fixture inside a component |
| `components/event/InvitationsTab.tsx:118` | "Sur l'édition Jazzablanca…" | venue name in body copy |
| `components/wizard/StepMedia.tsx:15` | full venue description paragraph | |

## C. Assets

No asset model exists. `coverUrl` on events is a literal path
(`/covers/past.jpg`); the restaurant perimeter has **no photo field at
all**. There is no upload path, no presigned-URL flow, no object key
storage — the brief's S3/CloudFront requirement starts from zero.

## D. Auth and scoping

`lib/auth/session.ts` is a `localStorage` blob plus a presence cookie for
the middleware. There is no server-side session, no `business_accounts`
lookup, and **no venue scoping of any kind** — the venue id is a compile-
time import, so "a user editing a URL to reach another venue's data" is
not currently preventable because there is only one venue and no check.

## E. What is already clean

Worth stating so the remaining work is not overestimated:

- **Screen definitions** are pure functions of a payload — no fixture
  reaches a component. Swapping the data source changes nothing above the
  repository.
- **The repository seam** exists with both adapters and a total interface,
  so every method the brief needs already has a signature.
- **The `/api/business/*` contract** is typed end to end.
- **Identity in the chrome** (user name, org name) already resolves from a
  lookup rather than markup.

---

## Consequence for Phase 2

Three of the brief's pillars cannot be completed inside this repository,
and saying so up front is more useful than a partial gesture at them:

1. **PostgreSQL behind the Business Service** is a separate microservice.
   This repo can define the schema and talk to it; it cannot host it.
2. **S3 + CloudFront** requires a bucket, a distribution and IAM. The
   portal side (presigned-URL request, object-key storage, upload UI) is
   buildable here; the infrastructure is not.
3. **Real authentication** needs the Business Service's session endpoint.

What *is* fully deliverable here, and is where the work goes:

- A **persistent local store** backing the mock adapter, so behaviour
  matches production and nothing is an in-memory fixture — the brief asks
  for exactly this.
- The **SQL schema** the Business Service should own, as a real migration
  rather than a description.
- **Venue scoping threaded through the session** so no route imports a
  venue constant.
- **Editable surfaces** writing through the repository with validation,
  optimistic update and rollback.
