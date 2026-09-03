// App notification contract — the outbound half.
//
// `events.ts` is what the platform sends *in*. This is what the portal
// sends *out*, and the spec is unambiguous about why it has to exist:
// every guest-affecting action emits the consumer-app notification and
// the tracking event, "so the app and the dashboard never disagree on a
// reservation's state".
//
// Same discipline as the inbound half. An emission names what happened
// and to whom; it is never a patch for the app to apply, and it is never
// the source of truth. If a delivery is lost the guest misses a message,
// which is bad — but no state drifts, which would be worse.
//
// Two sinks, one call site. `notifyGuest` is a message a person reads;
// `track` is an analytics fact nobody reads. Keeping them separate means
// a venue that turns a message off does not also turn off its numbers.

import type { MessageChannel } from "@/lib/types/venue-operations";

/**
 * Every guest-affecting action the portal can take. One name per thing
 * that changes what a guest expects to happen — which is the test for
 * whether something belongs on this list.
 */
export type GuestEventKind =
  | "reservation.confirmed"
  | "reservation.refused"
  | "reservation.modified"
  | "reservation.cancelled"
  | "reservation.no_show"
  | "reservation.checked_in"
  | "waitlist.notified"
  | "waitlist.seated"
  | "offer.applied"
  | "experience.booked"
  | "deposit.requested"
  | "deposit.captured"
  | "deposit.refunded"
  | "table.confirmed"
  | "guestlist.checked_in"
  | "campaign.sent";

export interface GuestEvent {
  venueId: string;
  kind: GuestEventKind;
  /** The reservation, ticket, entry or table the event is about. */
  subjectId: string;
  customerId: string | null;
  /** Phone, email or app user id — whatever the channel addresses. */
  recipient: string;
  channel: MessageChannel;
  /** One line, as the guest will see it. Stored in the message log. */
  preview: string;
  at: string;
}

/** An analytics fact. Properties are flat so the pipeline needs no schema. */
export interface TrackingEvent {
  venueId: string;
  name: string;
  subjectId: string;
  at: string;
  properties: Record<string, string | number | boolean>;
}

export interface OutboundGateway {
  /** Push to the app, plus the channel message, plus the log row. */
  notifyGuest(event: GuestEvent): Promise<void>;
  track(event: TrackingEvent): Promise<void>;
}

/**
 * The tracking name for a guest event, so the two sinks cannot drift
 * apart by one call site spelling it differently.
 */
export function trackingNameFor(kind: GuestEventKind): string {
  return `venue.${kind.replace(".", "_")}`;
}

/**
 * Emits both halves for one action. Callers use this rather than the
 * gateway directly, which is what makes "every action emits both" a
 * property of the code instead of a rule people remember.
 */
export async function emitGuestEvent(
  gateway: OutboundGateway,
  event: GuestEvent,
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  await gateway.notifyGuest(event);
  await gateway.track({
    venueId: event.venueId,
    name: trackingNameFor(event.kind),
    subjectId: event.subjectId,
    at: event.at,
    properties: { channel: event.channel, ...properties },
  });
}

/**
 * Drops everything, and says so once.
 *
 * Selected when no delivery target is configured — a cold clone with no
 * backend. Silently succeeding would be worse: a developer would
 * conclude messages are being sent.
 */
export class NoopOutboundGateway implements OutboundGateway {
  private warned = false;

  private warn() {
    if (this.warned) return;
    this.warned = true;
    console.info(
      "[lyfe] Aucune passerelle de notification configurée : les messages invités sont journalisés, pas envoyés.",
    );
  }

  async notifyGuest(_event: GuestEvent) {
    this.warn();
  }
  async track(_event: TrackingEvent) {
    this.warn();
  }
}

/**
 * Keeps the last emissions in memory, newest first.
 *
 * This is what the demo runs on, and it is deliberately visible: the
 * message log surfaces what an action would have sent, so a reviewer can
 * check the rule holds without a Twilio account.
 */
export class RecordingOutboundGateway implements OutboundGateway {
  readonly guestEvents: GuestEvent[] = [];
  readonly trackingEvents: TrackingEvent[] = [];

  async notifyGuest(event: GuestEvent) {
    this.guestEvents.unshift(event);
    this.guestEvents.length = Math.min(this.guestEvents.length, 200);
  }
  async track(event: TrackingEvent) {
    this.trackingEvents.unshift(event);
    this.trackingEvents.length = Math.min(this.trackingEvents.length, 200);
  }
}
