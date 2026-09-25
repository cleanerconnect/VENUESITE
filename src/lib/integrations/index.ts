import "server-only";

// Which outbound gateway the portal is talking to.
//
// Same shape as the data-mode rule in `lib/data/mode.ts`, and for the
// same reason: the choice belongs in one place, so the cutover is a
// config change and so is the rollback.
//
//   http       a delivery service is configured (LYFE_NOTIFY_URL)
//   recording  otherwise — emissions are kept in memory and shown in the
//              message log, so the rule "every action emits" is visible
//              in a demo with no Twilio account behind it
//
// Nothing here invents a message body. The preview a guest event carries
// is what the portal would send; approving and templating it is the
// platform's job, not the dashboard's.

import {
  RecordingOutboundGateway,
  type GuestEvent,
  type OutboundGateway,
  type TrackingEvent,
} from "./outbound";

/**
 * Posts to the platform's delivery endpoint.
 *
 * Failures are swallowed after being logged: a table-ready message that
 * does not send is bad, but a check-in that throws because of it is
 * worse — the guest is standing at the door either way.
 */
class HttpOutboundGateway implements OutboundGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async post(path: string, body: unknown) {
    try {
      await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error(`[lyfe] ${path} a échoué`, error);
    }
  }

  async notifyGuest(event: GuestEvent) {
    await this.post("/notifications", event);
  }
  async track(event: TrackingEvent) {
    await this.post("/events", event);
  }
}

let cached: OutboundGateway | null = null;

export function outboundGateway(): OutboundGateway {
  if (cached) return cached;
  const url = process.env.LYFE_NOTIFY_URL;
  const token = process.env.LYFE_NOTIFY_TOKEN;
  cached =
    url && token
      ? new HttpOutboundGateway(url, token)
      : new RecordingOutboundGateway();
  return cached;
}

/** Test seam, mirroring `setRestaurantRepository`. */
export function setOutboundGateway(next: OutboundGateway | null) {
  cached = next;
}

export * from "./outbound";
export * from "./events";
