"use server";

// Check-in.
//
// The QR is minted app-side (EP20-US9) and resolved here. The portal
// passes the scanned string along and never parses it — an opaque code
// the client cannot interpret is the point, not an inconvenience.

import { requireVenueAccess, resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
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
 *
 * Same destination as `checkInByCode`, and now the same road: it goes
 * through the repository rather than reaching into the SQLite store, so
 * a deployment pointed at the Business Service validates the arrival
 * there instead of writing a local database nobody reads. The venue
 * still comes from the session, so an id from another establishment is
 * refused rather than served.
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

  // No code: the booking id carries the call, and the result says
  // `manual` rather than `qr` so the two paths stay distinguishable in
  // whatever the service logs.
  const result = await getRestaurantRepository().checkIn({
    restaurantId: session.venueId,
    reservationId,
    qrCode: "",
  });

  if (!result.ok) {
    return { ok: false, message: CHECK_IN_REFUSAL[result.error ?? "unknown_code"] };
  }

  revalidatePath(RESTAURANT_PATH, "page");
  return { ok: true };
}

/** What each refusal means to a host standing at the door. */
const CHECK_IN_REFUSAL: Record<
  NonNullable<CheckInResult["error"]>,
  string
> = {
  unknown_code: "Cette réservation n'est pas dans le carnet du jour.",
  already_used: "Cette table est déjà enregistrée comme arrivée.",
  wrong_venue: COPY.error.forbidden,
  expired: "Cette réservation n'est plus active.",
};
