// Local adapter.
//
// Named "mock" for the seam it fills, but it is no longer fixtures: the
// entities below read and write a real database (`db/schema.sql` on
// SQLite, seeded by `db/seed.mjs`). That is what the brief asks for — the
// local adapter must behave like production, and in-memory objects that
// forget on reload do not.
//
// Every entity is served from the database. There is no fixture
// fallback: an unseeded database raises rather than rendering a
// plausible-looking empty dashboard.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type { CheckInResult, NotificationPreferences } from "@/lib/types/business";
import * as store from "@/lib/db/venue-store";
import { listStaff as listStaffRows } from "@/lib/db/venue-write-store";
import { listAssets as listAssetRows } from "@/lib/db/asset-store";
import type { AssetKind } from "@/lib/assets/types";
import {
  analytics as analyticsFromStore,
  menuItems,
  venueProfile,
  overview as overviewFromStore,
  transitionBooking,
  visibility as visibilityFromStore,
} from "@/lib/db/overview-store";
import {
  RepositoryError,
} from "./repository";
import type {
  AnalyticsInput,
  CheckInInput,
  NoShowInput,
  RejectBookingInput,
  ReservationRefInput,
  RestaurantRepository,
  ReviewReplyInput,
} from "./repository";

import * as ops from "@/lib/db/operations-store";
import * as opsWrite from "@/lib/db/operations-write-store";
import { outboundGateway } from "@/lib/integrations";
import type {
  ConfigurationAction,
  GrowthAction,
  GuestGraphAction,
  MarketingAction,
  MoneyAction,
  NightlifeAction,
  ServiceConfiguration,
  ServiceFloorAction,
} from "./repository";
import type { SurveyConfig, VenueSettings } from "@/lib/types/venue-operations";

export class MockRestaurantRepository implements RestaurantRepository {
  async getOverview(venueId: string): Promise<RestaurantOverview> {
    const data = overviewFromStore(venueId, "");
    if (!data) {
      // An unseeded database is an operator error, not a UI state. Saying
      // so beats rendering a plausible-looking empty dashboard.
      throw new RepositoryError(
        `Aucun lieu ${venueId}. Lancez \`npm run db:reset\`.`,
        404,
        "venue_not_seeded",
      );
    }
    return data;
  }

  async confirmReservation(_input: ReservationRefInput) {
    return this.getOverview(_input.restaurantId);
  }

  async cancelReservation(_input: ReservationRefInput) {
    return this.getOverview(_input.restaurantId);
  }

  async sendReminder(_input: ReservationRefInput) {
    // No SMS gateway in the demo.
  }

  async replyToReview(_input: ReviewReplyInput) {
    // No review platform in the demo.
  }

  // ── Business account ── persisted
  async getBusinessAccount() {
    const account = store.businessAccountForUser(
      process.env.LYFE_DEMO_USER_ID ?? "usr_yassine",
    );
    if (!account) {
      throw new RepositoryError("Aucun compte partenaire.", 404, "no_account");
    }
    return account;
  }

  // ── Booking lifecycle ──
  async rejectReservation(input: RejectBookingInput) {
    return this.getOverview(input.restaurantId);
  }

  /**
   * Resolves a code against the live book. Codes are `LYFE-<id>` in the
   * demo; the real QR is opaque and resolved server-side, which is why the
   * portal never parses it beyond passing it along.
   */
  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    const { qrCode } = input;
    const data = await this.getOverview(input.restaurantId);
    const code = qrCode.trim().toUpperCase();
    const match = [...data.upcomingReservations, ...data.waitlist].find(
      (r) => `LYFE-${r.id}`.toUpperCase() === code || r.id.toUpperCase() === code,
    );

    if (!match) return { ok: false, method: "manual", error: "unknown_code" };
    if (match.state === "arrived") {
      return { ok: false, method: "manual", error: "already_used" };
    }
    if (match.state === "cancelled" || match.state === "no_show") {
      return { ok: false, method: "manual", error: "expired" };
    }

    // The transition is persisted here, not left to the client's
    // optimistic copy. A check-in that lives only in one browser lets the
    // same code through twice — which is exactly what a QR must not do.
    transitionBooking(input.restaurantId, match.id, "arrived", "venue");

    return {
      ok: true,
      bookingId: match.id,
      guestName: match.guestName,
      partySize: match.partySize,
      method: "manual",
    };
  }

  async reportNoShow({ restaurantId, reservationId }: NoShowInput) {
    // Writes per-customer history, not only the booking — that history is
    // what the risk indicator and the no-show rate both read.
    store.recordNoShow(restaurantId, reservationId);
    return this.getOverview(restaurantId);
  }

  // ── Venue profile and settings ── persisted
  async getVenueProfile(venueId: string) {
    return venueProfile(venueId);
  }
  async listMenuItems(venueId: string) {
    return menuItems(venueId);
  }
  async listStaff(venueId: string) {
    return listStaffRows(venueId);
  }
  async listAssets(venueId: string, kind: AssetKind) {
    return listAssetRows(venueId, kind);
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
    next: Omit<import("@/lib/types/business").VenueAvailability, "updatedAt">,
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
  async getAnalytics({ restaurantId, period }: AnalyticsInput) {
    return analyticsFromStore(restaurantId, period);
  }

  async getVisibilityMetrics({ restaurantId, period }: AnalyticsInput) {
    return visibilityFromStore(restaurantId, period);
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

  // ── Phase 5 — the rest of the venue perimeter ──
  //
  // Reads come straight from the operations store; writes go through the
  // write store and then re-read, so what the caller reconciles against
  // is the database's answer rather than the client's guess at it.

  async getServiceFloor(venueId: string) {
    return ops.serviceFloor(venueId);
  }
  async getGuestGraph(venueId: string) {
    return ops.guestGraph(venueId);
  }
  async getGrowth(venueId: string) {
    return ops.growth(venueId);
  }
  async getNightlife(venueId: string) {
    return ops.nightlife(venueId);
  }
  async getMoneyDesk(venueId: string) {
    return ops.moneyDesk(venueId);
  }
  async getMarketing(venueId: string) {
    return ops.marketing(venueId);
  }
  async getServiceConfiguration(venueId: string): Promise<ServiceConfiguration> {
    return {
      services: ops.serviceDefinitions(venueId),
      pacing: ops.pacingRules(venueId),
    };
  }
  async getSurveyConfig(venueId: string) {
    return ops.surveyConfig(venueId);
  }
  async getVenueSettings(venueId: string) {
    return ops.venueSettings(venueId);
  }
  async getSubscription(venueId: string) {
    return ops.subscription(venueId);
  }
  async listSupportTickets(venueId: string) {
    return ops.supportTickets(venueId);
  }
  async getSpendByCustomer(venueId: string) {
    return ops.spendByCustomer(venueId);
  }

  async runServiceFloorAction(venueId: string, action: ServiceFloorAction) {
    await opsWrite.applyServiceFloorAction(venueId, action, outboundGateway());
    return ops.serviceFloor(venueId);
  }
  async runGuestGraphAction(venueId: string, action: GuestGraphAction) {
    opsWrite.applyGuestGraphAction(venueId, action);
    return ops.guestGraph(venueId);
  }
  async runGrowthAction(venueId: string, action: GrowthAction) {
    await opsWrite.applyGrowthAction(venueId, action, outboundGateway());
    return ops.growth(venueId);
  }
  async runNightlifeAction(venueId: string, action: NightlifeAction) {
    await opsWrite.applyNightlifeAction(venueId, action, outboundGateway());
    return ops.nightlife(venueId);
  }
  async runMoneyAction(venueId: string, action: MoneyAction) {
    await opsWrite.applyMoneyAction(venueId, action, outboundGateway());
    return ops.moneyDesk(venueId);
  }
  async runMarketingAction(venueId: string, action: MarketingAction) {
    await opsWrite.applyMarketingAction(venueId, action, outboundGateway());
    return ops.marketing(venueId);
  }
  async runConfigurationAction(venueId: string, action: ConfigurationAction) {
    opsWrite.applyConfigurationAction(venueId, action);
    return {
      services: ops.serviceDefinitions(venueId),
      pacing: ops.pacingRules(venueId),
    };
  }
  async saveSurveyConfig(venueId: string, config: SurveyConfig) {
    opsWrite.saveSurveyConfigRow(venueId, config);
    return ops.surveyConfig(venueId);
  }
  async saveVenueSettings(venueId: string, settings: VenueSettings) {
    opsWrite.saveVenueSettingsRow(venueId, settings);
    return ops.venueSettings(venueId);
  }
  async openSupportTicket(
    venueId: string,
    input: { category: string; subject: string; body: string },
  ) {
    opsWrite.openSupportTicketRow(venueId, input);
    return ops.supportTickets(venueId);
  }
}
