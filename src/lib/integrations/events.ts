// App connection contract.
//
// The dashboard is not the only thing that changes a service. A diner
// books from the LYFE consumer app, cancels from a confirmation SMS, or
// leaves a review an hour after paying — and the book on the host stand
// has to reflect that without anyone refreshing.
//
// These are the events the platform sends in. They are deliberately
// narrow: an event names what happened and to which entity, never a patch
// to apply. The dashboard re-reads the overview and re-derives; that way
// a missed or duplicated event costs a redundant fetch instead of a
// screen that drifts out of sync with the book.

export type LyfeEventType =
  | "reservation.created"
  | "reservation.confirmed"
  | "reservation.cancelled"
  | "reservation.arrived"
  | "reservation.no_show"
  | "waitlist.joined"
  | "review.received"
  | "payout.settled";

export interface LyfeEvent {
  /** Stable per delivery. Use it to dedupe — retries reuse it. */
  id: string;
  type: LyfeEventType;
  /** Which restaurant the event concerns. */
  restaurantId: string;
  /** ISO 8601, when the event occurred (not when it was delivered). */
  occurredAt: string;
  /** Entity the event is about — a reservation, review or payout id. */
  subjectId: string;
  /** Where it came from, for the activity feed's actor line. */
  source: "app" | "web" | "phone" | "system";
}

const EVENT_TYPES = new Set<string>([
  "reservation.created",
  "reservation.confirmed",
  "reservation.cancelled",
  "reservation.arrived",
  "reservation.no_show",
  "waitlist.joined",
  "review.received",
  "payout.settled",
]);

/**
 * Validates an inbound payload. Webhook bodies come from the network, so
 * nothing downstream may assume a field exists — an event that fails here
 * is dropped with a 400 rather than half-applied.
 */
export function parseLyfeEvent(input: unknown): LyfeEvent | null {
  if (typeof input !== "object" || input === null) return null;
  const e = input as Record<string, unknown>;

  if (typeof e.id !== "string" || e.id.length === 0) return null;
  if (typeof e.type !== "string" || !EVENT_TYPES.has(e.type)) return null;
  if (typeof e.restaurantId !== "string" || e.restaurantId.length === 0) return null;
  if (typeof e.occurredAt !== "string" || Number.isNaN(Date.parse(e.occurredAt))) {
    return null;
  }
  if (typeof e.subjectId !== "string") return null;

  const source =
    typeof e.source === "string" &&
    ["app", "web", "phone", "system"].includes(e.source)
      ? (e.source as LyfeEvent["source"])
      : "system";

  return {
    id: e.id,
    type: e.type as LyfeEventType,
    restaurantId: e.restaurantId,
    occurredAt: e.occurredAt,
    subjectId: e.subjectId,
    source,
  };
}

/**
 * Which events should push a live update to an open dashboard. Payouts
 * and 86'd items matter, but not enough to interrupt a manager mid-rush.
 */
export function isLiveUpdate(type: LyfeEventType): boolean {
  return type !== "payout.settled";
}
