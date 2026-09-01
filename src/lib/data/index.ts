import "server-only";

// Adapter selection.
//
// One env var decides which backend the whole workspace talks to. Keeping
// the choice here — rather than at each call site — is what makes the
// cutover a config change and the rollback a config change too.

import type { RestaurantRepository } from "./repository";
import { MockRestaurantRepository } from "./mock-repository";
import { HttpRestaurantRepository } from "./http-repository";

let cached: RestaurantRepository | null = null;

export function getRestaurantRepository(): RestaurantRepository {
  if (cached) return cached;

  const baseUrl = process.env.LYFE_API_BASE_URL;
  const token = process.env.LYFE_API_TOKEN;

  // Falling back to the mock when the backend isn't configured keeps the
  // demo runnable for design review and for anyone without credentials.
  // It is deliberately silent in production only because the absence of
  // the vars is itself the signal — see docs/INTEGRATION.md.
  cached =
    baseUrl && token
      ? new HttpRestaurantRepository({ baseUrl, token })
      : new MockRestaurantRepository();

  return cached;
}

/** True when the app is talking to a real backend. Surfaced in /api/health. */
export function isLiveBackend(): boolean {
  return Boolean(process.env.LYFE_API_BASE_URL && process.env.LYFE_API_TOKEN);
}

export * from "./repository";
