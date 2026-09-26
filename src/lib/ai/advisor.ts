// The AI seam.
//
// Four capabilities, one interface. The mock implements it with the
// static copy the demo ships; the Claude adapter implements it with real
// inference. Screens depend on the interface, so turning the AI on is an
// env var — and turning it off, when a provider is down or a bill spikes,
// is the same env var.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type { VenueConfig } from "@/lib/venue/config";
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
 *
 * And every method takes the venue's configuration, because every method
 * writes a sentence the partner reads. The advisor was the one place in
 * the portal that wrote « couverts » whatever the venue was, so a lounge
 * opened Accueil to a card counting covers in a room that has none. The
 * vocabulary is not advice; it is how the advice is said, which is why
 * it is a second argument rather than a field of the payload.
 */
export interface AiAdvisor {
  /** Advice for the service in progress. Null suppresses the card. */
  serviceNudge(
    data: RestaurantOverview,
    config: VenueConfig,
  ): Promise<ServiceNudge | null>;
  noShowRisk(data: RestaurantOverview, config: VenueConfig): Promise<NoShowRisk>;
  reviewDigest(data: RestaurantOverview, config: VenueConfig): Promise<ReviewDigest>;
  anomalies(data: RestaurantOverview, config: VenueConfig): Promise<ServiceAnomaly>;
  /**
   * Conversational assistant. Yields text deltas so the existing typing
   * UI works unchanged against a real model.
   */
  assistant(
    prompt: string,
    data: RestaurantOverview,
    config: VenueConfig,
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}
