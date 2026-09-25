// The AI seam.
//
// Four capabilities, one interface. The mock implements it with the
// static copy the demo ships; the Claude adapter implements it with real
// inference. Screens depend on the interface, so turning the AI on is an
// env var — and turning it off, when a provider is down or a bill spikes,
// is the same env var.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type {
  NoShowRisk,
  ReviewDigest,
  ServiceAnomaly,
  ServiceNudge,
} from "./schemas";

/**
 * Every method takes the overview payload rather than narrow arguments.
 * The advice is about the service as a whole — a nudge that knows the
 * covers but not the waitlist gives worse advice than no nudge.
 */
export interface AiAdvisor {
  /** Advice for the service in progress. Null suppresses the card. */
  serviceNudge(data: RestaurantOverview): Promise<ServiceNudge | null>;
  noShowRisk(data: RestaurantOverview): Promise<NoShowRisk>;
  reviewDigest(data: RestaurantOverview): Promise<ReviewDigest>;
  anomalies(data: RestaurantOverview): Promise<ServiceAnomaly>;
  /**
   * Conversational assistant. Yields text deltas so the existing typing
   * UI works unchanged against a real model.
   */
  assistant(
    prompt: string,
    data: RestaurantOverview,
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}
