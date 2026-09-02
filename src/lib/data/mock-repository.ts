// Local adapter.
//
// Named "mock" for the seam it fills, but it is no longer fixtures: the
// entities below read and write a real database (`db/schema.sql` on
// SQLite, seeded by `db/seed.mjs`). That is what the brief asks for — the
// local adapter must behave like production, and in-memory objects that
// forget on reload do not.
//
// Entities still served from `mock/business.ts` are marked; they are the
// remaining migration, and each is a straight port of a query that
// already has a table.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type { CheckInResult, NotificationPreferences } from "@/lib/types/business";
import { getRestaurantOverview } from "@/lib/mock/restaurant";
import * as business from "@/lib/mock/business";
import * as store from "@/lib/db/venue-store";
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

  // ── Business account ── persisted
  async getBusinessAccount() {
    // Falls back to the fixture only when the database has not been
    // seeded, so a fresh checkout still boots.
    return (
      store.businessAccountForUser(business.BUSINESS_ACCOUNT.ownerId) ??
      business.BUSINESS_ACCOUNT
    );
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
    // what the risk indicator and the no-show rate both read. Persisted,
    // so the risk on the customer profile survives a reload.
    if (reservation) {
      store.recordNoShow(business.BUSINESS_ACCOUNT.venueId, reservationId);
    }
    return data;
  }

  // ── Availability ── persisted
  async getAvailability(venueId: string) {
    return store.availability(venueId);
  }

  /**
   * Applies a slot at a time with optimistic concurrency rather than
   * replacing the set. Availability changes what customers can book right
   * now, so a blind overwrite could silently reopen a slot a colleague
   * just closed.
   */
  async updateAvailability(
    venueId: string,
    next: Parameters<typeof business.setAvailability>[0],
  ) {
    for (const slot of next.slots) {
      store.updateSlot(venueId, slot.id, {
        opensAt: slot.opensAt,
        closesAt: slot.closesAt,
        capacity: slot.capacity,
        enabled: slot.enabled,
      });
    }
    return store.availability(venueId);
  }

  // ── Analytics & visibility ──
  async getAnalytics({ period }: AnalyticsInput) {
    return business.getAnalytics(period);
  }

  async getVisibilityMetrics({ period }: AnalyticsInput) {
    return business.getVisibilityMetrics(period);
  }

  // ── CRM ── persisted
  async listCustomers(venueId: string) {
    return store.customers(venueId);
  }

  async getCustomer(venueId: string, customerId: string) {
    return store.customer(venueId, customerId);
  }

  // ── Notifications ── persisted
  async getNotifications(venueId: string) {
    return store.notifications(venueId);
  }

  async markNotificationRead(venueId: string, id: string) {
    store.markNotificationRead(venueId, id);
  }

  async getNotificationPreferences(venueId: string) {
    return store.notificationPreferences(venueId);
  }

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    return store.setNotificationPreferences(prefs);
  }
}
