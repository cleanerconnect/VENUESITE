// Mock adapter — the behaviour the app ships with today.
//
// Mutations are no-ops that echo the current payload back: the client
// already applied them optimistically, and the demo has no server to
// disagree. That is exactly the contract the HTTP adapter honours with a
// real write behind it, which is why swapping them changes nothing above.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type { CheckInResult, NotificationPreferences } from "@/lib/types/business";
import { getRestaurantOverview } from "@/lib/mock/restaurant";
import * as business from "@/lib/mock/business";
import type {
  AnalyticsInput,
  CheckInInput,
  NoShowInput,
  RejectBookingInput,
  ReservationRefInput,
  RestaurantRepository,
  ReviewReplyInput,
  SeatReservationInput,
  TableRefInput,
} from "./repository";

export class MockRestaurantRepository implements RestaurantRepository {
  async getOverview(): Promise<RestaurantOverview> {
    return getRestaurantOverview();
  }

  async seatReservation(_input: SeatReservationInput) {
    return getRestaurantOverview();
  }

  async confirmReservation(_input: ReservationRefInput) {
    return getRestaurantOverview();
  }

  async cancelReservation(_input: ReservationRefInput) {
    return getRestaurantOverview();
  }

  async clearTable(_input: TableRefInput) {
    return getRestaurantOverview();
  }

  async sendReminder(_input: ReservationRefInput) {
    // No SMS gateway in the demo.
  }

  async replyToReview(_input: ReviewReplyInput) {
    // No review platform in the demo.
  }

  // ── Business account ──
  async getBusinessAccount() {
    return business.BUSINESS_ACCOUNT;
  }

  // ── Booking lifecycle ──
  async rejectReservation(_input: RejectBookingInput) {
    return getRestaurantOverview();
  }

  /**
   * Resolves a code against the live book. Codes are `LYFE-<id>` in the
   * demo; the real QR is opaque and resolved server-side, which is why the
   * portal never parses it beyond passing it along.
   */
  async checkIn({ qrCode }: CheckInInput): Promise<CheckInResult> {
    const data = getRestaurantOverview();
    const code = qrCode.trim().toUpperCase();
    const match = [...data.upcomingReservations, ...data.waitlist].find(
      (r) => `LYFE-${r.id}`.toUpperCase() === code || r.id.toUpperCase() === code,
    );

    if (!match) return { ok: false, method: "manual", error: "unknown_code" };
    if (match.state === "seated") {
      return { ok: false, method: "manual", error: "already_used" };
    }

    return {
      ok: true,
      bookingId: match.id,
      guestName: match.guestName,
      partySize: match.partySize,
      method: "manual",
    };
  }

  async reportNoShow({ reservationId }: NoShowInput) {
    const data = getRestaurantOverview();
    const reservation = [...data.upcomingReservations, ...data.waitlist].find(
      (r) => r.id === reservationId,
    );
    // Writes per-customer history, not only the booking — that history is
    // what the risk indicator and the no-show rate both read.
    if (reservation) business.recordNoShow(reservation);
    return data;
  }

  // ── Availability ──
  async getAvailability() {
    return business.getAvailability();
  }

  async updateAvailability(
    _venueId: string,
    availability: Parameters<typeof business.setAvailability>[0],
  ) {
    return business.setAvailability(availability);
  }

  // ── Analytics & visibility ──
  async getAnalytics({ period }: AnalyticsInput) {
    return business.getAnalytics(period);
  }

  async getVisibilityMetrics({ period }: AnalyticsInput) {
    return business.getVisibilityMetrics(period);
  }

  // ── CRM ──
  async listCustomers() {
    return business.listCustomers();
  }

  async getCustomer(_venueId: string, customerId: string) {
    return business.getCustomer(customerId);
  }

  // ── Notifications ──
  async getNotifications() {
    return business.listNotifications();
  }

  async markNotificationRead(_venueId: string, id: string) {
    business.markNotificationRead(id);
  }

  async getNotificationPreferences() {
    return business.getNotificationPreferences();
  }

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    return business.setNotificationPreferences(prefs);
  }
}
