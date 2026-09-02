"use server";

// Check-in.
//
// The QR is minted app-side (EP20-US9) and resolved here. The portal
// passes the scanned string along and never parses it — an opaque code
// the client cannot interpret is the point, not an inconvenience.

import { requireVenueAccess, resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { transitionBooking } from "@/lib/db/overview-store";
import { COPY } from "@/lib/copy/fr";
import { revalidatePath } from "next/cache";
import type { CheckInResult } from "@/lib/types/business";

const RESTAURANT_PATH = "/restaurant/[[...section]]";

export async function checkInByCode(code: string): Promise<CheckInResult> {
  const session = await resolveSession();
  if (!session) return { ok: false, method: "manual", error: "wrong_venue" };

  // The venue comes from the session, so a code cannot be redeemed
  // against a venue the user does not hold.
  await requireVenueAccess(session.venueId);

  const trimmed = code.trim();
  if (trimmed.length < 4) {
    return { ok: false, method: "manual", error: "unknown_code" };
  }

  return getRestaurantRepository().checkIn({
    restaurantId: session.venueId,
    qrCode: trimmed,
  });
}

/**
 * The manual path: a host taps a name off the list instead of scanning.
 * Same destination as `checkInByCode`, same venue scoping — the id is
 * validated against the session's venue by the transition itself, which
 * matches on `venue_id` and does nothing for a row it does not own.
 */
export async function markGuestArrived(
  reservationId: string,
): Promise<{ ok: boolean; message?: string }> {
  const session = await resolveSession();
  if (!session) return { ok: false, message: COPY.error.sessionExpired };

  try {
    await requireVenueAccess(session.venueId);
  } catch {
    return { ok: false, message: COPY.error.forbidden };
  }

  transitionBooking(session.venueId, reservationId, "arrived", "venue");
  revalidatePath(RESTAURANT_PATH, "page");
  return { ok: true };
}
