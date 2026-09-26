// The clock the portal runs on.
//
// Every venue in scope is Moroccan, and a service time belongs to the
// venue rather than to whoever is looking at it: « 20h30 » is half past
// eight in the dining room, on the stand and on a phone in Paris alike.
//
// This is not decoration. The screens are built by one pure builder that
// runs **twice** — once on the server for the first paint, once on the
// client for the optimistic copy — and a date formatted in the runtime's
// own zone gives two different strings when those two runtimes sit in
// different zones. Vercel runs in UTC; Casablanca is UTC+1. Left alone,
// the server rendered « 12h00 – 15h00 » under a client that rendered
// « 13h00 – 16h00 », React threw the hydration away, and a partner read
// every service time an hour early.
//
// `NEXT_PUBLIC_` so that the server and the browser read the same value
// from the same place.

import {
  DEFAULT_VENUE_TZ,
  venueInstant as readVenueInstant,
} from "./zone-shared.mjs";

export const VENUE_TIME_ZONE = process.env.NEXT_PUBLIC_VENUE_TZ ?? DEFAULT_VENUE_TZ;

/**
 * An instant from a stored value, reading a zoneless one as the venue's.
 *
 * The comment above is about *formatting* a known instant. This is the
 * other half: `2026-09-25T23:30:00` names no zone, and the language says
 * such a string is local time — so the server read it as Casablanca and
 * the browser read it as wherever the browser is, and the guest list's
 * cutoff hydrated an hour apart. Anything already carrying `Z` or an
 * offset passes through untouched; only what was ambiguous is settled,
 * and it is settled the same way on both runtimes.
 */
export function venueInstant(value: string | Date): Date {
  return readVenueInstant(value, VENUE_TIME_ZONE);
}
