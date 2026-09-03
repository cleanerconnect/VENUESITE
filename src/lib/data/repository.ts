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
// round trips would let the hero disagree with the reservation list.

import type {
  MenuItem,
  RestaurantOverview,
  RestaurantProfile,
} from "@/lib/types/restaurant";
import type { AssetKind, VenueAsset } from "@/lib/assets/types";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import type {
  AnalyticsPeriod,
  BusinessAccount,
  CheckInResult,
  Customer,
  NotificationPreferences,
  PortalNotification,
  RejectionReason,
  VenueAnalytics,
  VenueAvailability,
  VisibilityMetrics,
} from "@/lib/types/business";

export interface ReservationRefInput {
  restaurantId: string;
  reservationId: string;
}

export interface ReviewReplyInput {
  restaurantId: string;
  reviewId: string;
  message: string;
}

export interface RejectBookingInput {
  restaurantId: string;
  reservationId: string;
  /** Coded so rejections can be aggregated for quality analytics. */
  reason: RejectionReason;
  note?: string;
}

export interface CheckInInput {
  restaurantId: string;
  reservationId?: string;
  /** The code scanned from the app's QR, or typed into the fallback. */
  qrCode: string;
}

export interface NoShowInput {
  restaurantId: string;
  reservationId: string;
}

export interface AnalyticsInput {
  restaurantId: string;
  period: AnalyticsPeriod;
}

/**
 * Mutations return the authoritative payload so the client can reconcile
 * its optimistic copy against what actually happened. A void return would
 * force a second fetch and leave a window where the two disagree.
 */
export interface RestaurantRepository {
  getOverview(restaurantId: string): Promise<RestaurantOverview>;

  confirmReservation(input: ReservationRefInput): Promise<RestaurantOverview>;
  cancelReservation(input: ReservationRefInput): Promise<RestaurantOverview>;

  sendReminder(input: ReservationRefInput): Promise<void>;
  replyToReview(input: ReviewReplyInput): Promise<void>;

  // ── Business account ──
  /** The signed-in partner's account row. Drives feature gating. */
  getBusinessAccount(): Promise<BusinessAccount>;

  // ── Booking lifecycle ──
  /**
   * Rejection carries a coded reason. Separate from `cancelReservation`
   * because a venue refusing a request and a guest cancelling are
   * different events with different downstream analytics.
   */
  rejectReservation(input: RejectBookingInput): Promise<RestaurantOverview>;
  /**
   * Marks the guest arrived. `qrCode` comes from the app-side QR
   * (EP20-US9) or from the manual fallback — the server cannot tell the
   * difference and should not need to.
   */
  checkIn(input: CheckInInput): Promise<CheckInResult>;
  /**
   * Flags a no-show. Writes per-customer history as well as the booking,
   * because the rate feeds analytics and the risk indicator feeds the
   * customer profile.
   */
  reportNoShow(input: NoShowInput): Promise<RestaurantOverview>;

  // ── Venue profile and settings ──
  //
  // The settings route used to read these straight from the SQLite
  // store, which meant it was the one screen that still required a
  // database. They belong on the seam like everything else.
  getVenueProfile(venueId: string): Promise<RestaurantProfile | null>;
  listMenuItems(venueId: string): Promise<MenuItem[]>;
  listStaff(venueId: string): Promise<StaffMemberRow[]>;
  listAssets(venueId: string, kind: AssetKind): Promise<VenueAsset[]>;

  // ── Availability ──
  getAvailability(venueId: string): Promise<VenueAvailability>;
  /** Propagates immediately to what the consumer app shows as bookable. */
  updateAvailability(
    venueId: string,
    availability: Omit<VenueAvailability, "updatedAt">,
  ): Promise<VenueAvailability>;

  // ── Analytics & visibility ──
  getAnalytics(input: AnalyticsInput): Promise<VenueAnalytics>;
  getVisibilityMetrics(input: AnalyticsInput): Promise<VisibilityMetrics>;

  // ── CRM ──
  /** Auto-populated from bookings; there is deliberately no create. */
  listCustomers(restaurantId: string): Promise<Customer[]>;
  getCustomer(restaurantId: string, customerId: string): Promise<Customer | null>;

  // ── Notifications ──
  getNotifications(restaurantId: string): Promise<PortalNotification[]>;
  markNotificationRead(restaurantId: string, id: string): Promise<void>;
  getNotificationPreferences(venueId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(
    prefs: NotificationPreferences,
  ): Promise<NotificationPreferences>;
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
