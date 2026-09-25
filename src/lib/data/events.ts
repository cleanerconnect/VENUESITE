// Event repository selection.
//
// Counterpart to `getRestaurantRepository()` in `./index`, kept in its
// own module because the event screens are client components and
// `./index` is `server-only`.
//
// Client components should not call this directly — use `useEventQuery`,
// which adds the loading, empty and error states every screen needs.
// Server components call it and await.

import type { EventRepository } from "./event-repository";
import { StaticEventRepository } from "./static-event-repository";

let cached: EventRepository | null = null;

export function getEventRepository(): EventRepository {
  // No HTTP driver yet: the event backend does not exist, and a stub
  // that silently returned nothing would be worse than the honest
  // static one. See docs/HANDOFF.md for what the team builds here.
  cached ??= new StaticEventRepository();
  return cached;
}

/** Test seam — install a driver without touching callers. */
export function setEventRepository(next: EventRepository | null) {
  cached = next;
}
