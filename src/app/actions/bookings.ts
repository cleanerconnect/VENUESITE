"use server";

// The four decisions on a booking row.
//
// Accepter, refuser, signaler une absence, annuler. Each one used to
// live only in the browser: `lib/restaurant/store.ts` applied it to a
// client copy of the payload, offered an undo, and stopped there. A
// decision that survives until the next reload is not a decision, and
// two hosts on two stands could accept the same request.
//
// So each verb is a server action that goes through the repository —
// which means it lands on SQLite locally and on the Business Service
// when one is configured, without either caller knowing which. The
// client keeps its optimistic update and rolls it back if the write is
// refused; see `RestaurantScreen.tsx`.

import { revalidatePath } from "next/cache";
import { requireVenueAccess, resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { RepositoryError, StaleWriteError } from "@/lib/data/repository";
import { COPY } from "@/lib/copy/fr";
import type { RejectionReason } from "@/lib/types/business";

const RESTAURANT_PATH = "/restaurant/[[...section]]";

export interface BookingResult {
  ok: boolean;
  message?: string;
}

/**
 * Session, venue access, then the write.
 *
 * The venue comes from the session on every one of these, so a booking
 * id from another establishment is refused rather than served — the
 * repository is scoped, and the transition matches on `venue_id`.
 */
async function withVenue(
  run: (venueId: string) => Promise<unknown>,
): Promise<BookingResult> {
  const session = await resolveSession();
  if (!session) return { ok: false, message: COPY.error.sessionExpired };

  try {
    await requireVenueAccess(session.venueId);
  } catch {
    return { ok: false, message: COPY.error.forbidden };
  }

  try {
    await run(session.venueId);
    revalidatePath(RESTAURANT_PATH, "page");
    return { ok: true };
  } catch (error) {
    if (error instanceof StaleWriteError) {
      return { ok: false, message: COPY.error.stale };
    }
    if (error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    console.error("[lyfe] écriture de réservation refusée", error);
    return { ok: false, message: COPY.form.savingFailed };
  }
}

/** The request is accepted. The guest is told by the app. */
export async function confirmBooking(reservationId: string) {
  return withVenue((venueId) =>
    getRestaurantRepository().confirmReservation({
      restaurantId: venueId,
      reservationId,
    }),
  );
}

/**
 * The request is refused, with a coded motive.
 *
 * The code is what makes refusals aggregable — a free-text reason
 * cannot be counted — and it is why this is not `cancelBooking` with a
 * different label.
 */
export async function rejectBooking(
  reservationId: string,
  reason: RejectionReason,
  note?: string,
) {
  return withVenue((venueId) =>
    getRestaurantRepository().rejectReservation({
      restaurantId: venueId,
      reservationId,
      reason,
      note,
    }),
  );
}

/** The party never came. Writes per-customer history as well as the row. */
export async function reportNoShowBooking(reservationId: string) {
  return withVenue((venueId) =>
    getRestaurantRepository().reportNoShow({
      restaurantId: venueId,
      reservationId,
    }),
  );
}

/** A confirmed booking is undone — by the venue, on the guest's behalf. */
export async function cancelBooking(reservationId: string) {
  return withVenue((venueId) =>
    getRestaurantRepository().cancelReservation({
      restaurantId: venueId,
      reservationId,
    }),
  );
}
