// The data seam.
//
// Everything the restaurant workspace reads or writes goes through this
// interface. The mock implements it today; the HTTP adapter implements it
// against the real backend. Nothing above this line knows which is in
// play, so integration is: fill in the HTTP adapter, flip an env var,
// delete nothing.
//
// Reads are one call per screen payload rather than one per entity. That
// is deliberate — the dashboard renders a coherent snapshot, and six
// round trips would let the hero disagree with the floor plan.

import type { RestaurantOverview } from "@/lib/types/restaurant";

export interface SeatReservationInput {
  restaurantId: string;
  reservationId: string;
  /** Omit to let the backend pick the first table that fits. */
  tableId?: string;
}

export interface ReservationRefInput {
  restaurantId: string;
  reservationId: string;
}

export interface TableRefInput {
  restaurantId: string;
  tableId: string;
}

export interface ReviewReplyInput {
  restaurantId: string;
  reviewId: string;
  message: string;
}

/**
 * Mutations return the authoritative payload so the client can reconcile
 * its optimistic copy against what actually happened. A void return would
 * force a second fetch and leave a window where the two disagree.
 */
export interface RestaurantRepository {
  getOverview(restaurantId: string): Promise<RestaurantOverview>;

  seatReservation(input: SeatReservationInput): Promise<RestaurantOverview>;
  confirmReservation(input: ReservationRefInput): Promise<RestaurantOverview>;
  cancelReservation(input: ReservationRefInput): Promise<RestaurantOverview>;
  clearTable(input: TableRefInput): Promise<RestaurantOverview>;

  sendReminder(input: ReservationRefInput): Promise<void>;
  replyToReview(input: ReviewReplyInput): Promise<void>;
}

/** Thrown by adapters so callers can distinguish "rejected" from "offline". */
export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
