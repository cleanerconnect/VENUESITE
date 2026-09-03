import "server-only";

// Adapter selection.
//
// One env var decides which backend the whole workspace talks to. Keeping
// the choice here — rather than at each call site — is what makes the
// cutover a config change and the rollback a config change too.

import type { RestaurantRepository } from "./repository";
import { MockRestaurantRepository } from "./mock-repository";
import { StaticRestaurantRepository } from "./static-repository";
import { HttpRestaurantRepository } from "./http-repository";
import { dataMode } from "./mode";

let cached: RestaurantRepository | null = null;

export function getRestaurantRepository(): RestaurantRepository {
  if (cached) return cached;

  // Three drivers, one rule — see `mode.ts`. Falling through to the
  // static snapshot rather than failing is what lets a cold clone run
  // `npm run dev` and walk every screen before it has a database.
  switch (dataMode()) {
    case "http":
      cached = new HttpRestaurantRepository({
        baseUrl: process.env.LYFE_API_BASE_URL!,
        token: process.env.LYFE_API_TOKEN!,
      });
      break;
    case "db":
      cached = new MockRestaurantRepository();
      break;
    default:
      cached = new StaticRestaurantRepository();
  }

  return cached;
}

/** Test seam — lets a suite install a driver without touching callers. */
export function setRestaurantRepository(next: RestaurantRepository | null) {
  cached = next;
}

/** True when the app is talking to a real backend. Surfaced in /api/health. */
export function isLiveBackend(): boolean {
  return dataMode() === "http";
}

export * from "./repository";
export { dataMode, dataModeReason } from "./mode";
