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
import { logFailure } from "@/lib/errors/reference";
import type { RejectionReason } from "@/lib/types/business";
import type { Reservation } from "@/lib/types/restaurant";

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
    const reference = logFailure("écriture de réservation", error);
    return {
      ok: false,
      message: `${COPY.form.savingFailed} ${COPY.error.reference} : ${reference}`,
    };
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

/**
 * Décaler — the booking keeps its guest and its party, and changes hour.
 *
 * The slot is validated in the driver against the venue's own service
 * definitions, not here: a time is only bookable if the venue says so,
 * and that answer lives next to the data that gives it.
 */
export async function rescheduleBooking(
  reservationId: string,
  at: string,
): Promise<BookingResult> {
  return withVenue((venueId) =>
    getRestaurantRepository().rescheduleReservation({
      restaurantId: venueId,
      reservationId,
      at,
    }),
  );
}

/**
 * The times one day can still take.
 *
 * A read behind a server action rather than a route, so it goes through
 * the same session and venue check as every write: the days a venue is
 * open are not secret, but which venue is being asked about is resolved
 * from the session and never from the caller.
 */
export async function bookableSlotsForDay(
  date: string,
): Promise<{ at: string; serviceLabel: string }[]> {
  const session = await resolveSession();
  if (!session?.venueId) return [];
  await requireVenueAccess(session.venueId);
  return getRestaurantRepository().getBookableSlots(session.venueId, date);
}

/**
 * Finds a booking across the whole book.
 *
 * Behind a server action for the same reason as the slots read: the
 * venue is resolved from the session, so a host can only ever search
 * their own establishment's bookings.
 */
export async function searchBookings(query: string): Promise<Reservation[]> {
  const session = await resolveSession();
  if (!session?.venueId) return [];
  await requireVenueAccess(session.venueId);
  return getRestaurantRepository().searchReservations(session.venueId, query);
}
