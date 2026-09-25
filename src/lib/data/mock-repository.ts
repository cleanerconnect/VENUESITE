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

import type { DayBook, RestaurantOverview } from "@/lib/types/restaurant";
import type { CheckInResult, NotificationPreferences } from "@/lib/types/business";
import * as store from "@/lib/db/venue-store";
import * as onboarding from "@/lib/db/onboarding-store";
import {
  listStaff as listStaffRows,
  updateVenueIdentity,
  updateVenueListing,
} from "@/lib/db/venue-write-store";
import {
  deleteAsset,
  listAssets as listAssetRows,
  recordAsset,
  reorderAssets,
} from "@/lib/db/asset-store";
import type { AssetKind } from "@/lib/assets/types";
import {
  analytics as analyticsFromStore,
  customerBookings,
  menuItems,
  venueProfile,
  overview as overviewFromStore,
  transitionBooking,
  visibility as visibilityFromStore,
  dayBookFor as dayBookFromStore,
} from "@/lib/db/overview-store";
import {
  EmailTaken,
  RepositoryError,
} from "./repository";
import type {
  AnalyticsInput,
  AssetAction,
  CheckInInput,
  NoShowInput,
  OnboardingDraftPatch,
  OnboardingSignUpInput,
  RejectBookingInput,
  ReservationRefInput,
  RestaurantRepository,
  ReviewReplyInput,
  VenueListingPatch,
  VenueProfilePatch,
} from "./repository";

import * as ops from "@/lib/db/operations-store";
import { audienceInsights } from "@/lib/db/audience-store";
import { emptyAudience } from "@/lib/types/venue-operations";
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
    const data = await overviewFromStore(venueId, "");
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

  async getDayBook(venueId: string, date: string): Promise<DayBook> {
    return dayBookFromStore(venueId, date);
  }

  async confirmReservation({ restaurantId, reservationId }: ReservationRefInput) {
    // These three used to return the overview and write nothing, which
    // made accepting a booking a thing that survived until the next
    // reload. The transition is appended to the booking's history the
    // same way a check-in is.
    transitionBooking(restaurantId, reservationId, "confirmed", "venue");
    return this.getOverview(restaurantId);
  }

  async cancelReservation({ restaurantId, reservationId }: ReservationRefInput) {
    transitionBooking(restaurantId, reservationId, "cancelled", "venue");
    return this.getOverview(restaurantId);
  }

  async sendReminder(_input: ReservationRefInput) {
    // No SMS gateway in the demo.
  }

  async replyToReview(_input: ReviewReplyInput) {
    // No review platform in the demo.
  }

  // ── Business account ── persisted
  async getBusinessAccount() {
    const account = await store.businessAccountForUser(
      process.env.LYFE_DEMO_USER_ID ?? "usr_yassine",
    );
    if (!account) {
      throw new RepositoryError("Aucun compte partenaire.", 404, "no_account");
    }
    return account;
  }

  // ── Booking lifecycle ──
  async rejectReservation(input: RejectBookingInput) {
    // `rejected`, not `cancelled`: the schema keeps them apart, and the
    // coded reason is what makes a refusal aggregable. It is carried into
    // the status history so quality analytics has a column to read.
    transitionBooking(
      input.restaurantId,
      input.reservationId,
      "rejected",
      "venue",
      input.reason,
      input.note,
    );
    return this.getOverview(input.restaurantId);
  }

  /**
   * Resolves a code against the live book. Codes are `LYFE-<id>` in the
   * demo; the real QR is opaque and resolved server-side, which is why the
   * portal never parses it beyond passing it along.
   *
   * With no code and a booking id, this is the host tapping a name off
   * the list instead of scanning — the same destination, and the same
   * `method` distinction the result carries.
   */
  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    const { qrCode, reservationId } = input;
    const data = await this.getOverview(input.restaurantId);
    const code = qrCode.trim().toUpperCase();
    const rows = [...data.upcomingReservations, ...data.waitlist];
    const method: CheckInResult["method"] = code ? "qr" : "manual";
    const match = code
      ? rows.find(
          (r) => `LYFE-${r.id}`.toUpperCase() === code || r.id.toUpperCase() === code,
        )
      : rows.find((r) => r.id === reservationId);

    if (!match) return { ok: false, method, error: "unknown_code" };
    if (match.state === "arrived") {
      return { ok: false, method, error: "already_used" };
    }
    if (
      match.state === "cancelled" ||
      match.state === "rejected" ||
      match.state === "no_show"
    ) {
      return { ok: false, method, error: "expired" };
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
      method,
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

  // ── Onboarding ──
  async startOnboarding(input: OnboardingSignUpInput) {
    try {
      const account = await onboarding.createPartnerAccount(input);
      return {
        userId: account.userId,
        draft: await onboarding.createDraft(account.userId),
      };
    } catch (error) {
      if (error instanceof onboarding.EmailTakenError) throw new EmailTaken();
      throw error;
    }
  }

  async getOnboardingDraft(draftId: string) {
    return onboarding.draftById(draftId);
  }

  async saveOnboardingDraft(draftId: string, patch: OnboardingDraftPatch) {
    const next = await onboarding.patchDraft(draftId, patch);
    if (!next) {
      throw new RepositoryError("Inscription introuvable.", 404, "draft_not_found");
    }
    return next;
  }

  async submitOnboarding(draftId: string) {
    const made = await onboarding.createVenueFromDraft(draftId);
    if (!made) {
      throw new RepositoryError("Inscription introuvable.", 404, "draft_not_found");
    }
    return made;
  }

  // ── Ma fiche's writes ──
  //
  // The server action used to call these stores itself. Going through
  // the repository is what lets the same form write to a backend.
  async saveVenueProfile(venueId: string, patch: VenueProfilePatch) {
    await updateVenueIdentity(venueId, patch);
    const profile = await venueProfile(venueId);
    if (!profile) {
      throw new RepositoryError("Lieu introuvable.", 404, "venue_not_found");
    }
    return profile;
  }

  async saveVenueListing(venueId: string, patch: VenueListingPatch) {
    await updateVenueListing(venueId, patch);
    const profile = await venueProfile(venueId);
    if (!profile) {
      throw new RepositoryError("Lieu introuvable.", 404, "venue_not_found");
    }
    return profile;
  }

  async runAssetAction(venueId: string, action: AssetAction) {
    switch (action.kind) {
      case "asset.record":
        recordAsset({
          venueId,
          kind: action.assetKind,
          objectKey: action.objectKey,
          contentType: action.contentType,
          sizeBytes: action.sizeBytes,
        });
        return listAssetRows(venueId, action.assetKind);
      case "asset.remove": {
        const removed = await deleteAsset(venueId, action.id);
        if (!removed) {
          throw new RepositoryError("Média introuvable.", 404, "asset_not_found");
        }
        return listAssetRows(venueId, removed.kind);
      }
      case "asset.reorder":
        reorderAssets(venueId, action.assetKind, action.orderedIds);
        return listAssetRows(venueId, action.assetKind);
    }
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
    const current = await store.availability(venueId);

    for (const slot of next.slots) {
      store.updateSlot(venueId, slot.id, {
        opensAt: slot.opensAt,
        closesAt: slot.closesAt,
        capacity: slot.capacity,
        enabled: slot.enabled,
      });
    }

    // Closures are a set, not a list of rows to patch: the whole-object
    // write is the contract, so reconcile it. This used to write the
    // slots and silently drop every closure change, which made
    // « Fermer une journée » a button that did nothing through the seam.
    const keep = new Set(next.closures.map((c) => c.id));
    for (const gone of current.closures.filter((c) => !keep.has(c.id))) {
      store.removeClosure(venueId, gone.id);
    }
    const known = new Set(current.closures.map((c) => c.id));
    for (const added of next.closures.filter((c) => !known.has(c.id))) {
      store.addClosure(venueId, added.date, added.reason);
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
  async getAudience(venueId: string) {
    return (await audienceInsights(venueId)) ?? emptyAudience(venueId);
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
      services: await ops.serviceDefinitions(venueId),
      pacing: await ops.pacingRules(venueId),
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

  async listCustomerBookings(venueId: string, customerId: string) {
    return customerBookings(venueId, customerId);
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
    await opsWrite.applyConfigurationAction(venueId, action);
    return {
      services: await ops.serviceDefinitions(venueId),
      pacing: await ops.pacingRules(venueId),
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
  async setZoneAvailable(venueId: string, zoneId: string, available: boolean) {
    opsWrite.setZoneAvailable(venueId, zoneId, available);
  }
}
