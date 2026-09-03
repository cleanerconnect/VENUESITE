import "server-only";

// The no-infrastructure driver.
//
// Implements the same `RestaurantRepository` as the SQLite and HTTP
// adapters, against the snapshot in `static/venue-snapshot.json`. This is
// what makes `npm run dev` work on a laptop with no database, no bucket
// and no backend — which is the state an external team clones into.
//
// Writes are held in a per-process overlay rather than dropped. A demo
// where confirming a booking silently does nothing is worse than no demo
// at all: the reviewer concludes the button is broken. They do not
// survive a restart, and that is the honest trade — persistence is what
// the SQLite driver is for.

import {
  RepositoryError,
  type AnalyticsInput,
  type CheckInInput,
  type NoShowInput,
  type RejectBookingInput,
  type ReservationRefInput,
  type RestaurantRepository,
  type ReviewReplyInput,
} from "./repository";
import {
  staticBusinessAccount,
  staticOperations,
  staticVenue,
  type OperationsBundle,
} from "./static/venue-data";
import * as reduce from "./static-operations";
import { outboundGateway } from "@/lib/integrations";
import { emitGuestEvent } from "@/lib/integrations/outbound";
import type {
  ConfigurationAction,
  GrowthAction,
  GuestGraphAction,
  MarketingAction,
  MoneyAction,
  NightlifeAction,
  ServiceFloorAction,
} from "./repository";
import type { SurveyConfig, VenueSettings } from "@/lib/types/venue-operations";
import type { RestaurantOverview, Reservation } from "@/lib/types/restaurant";
import type { AssetKind } from "@/lib/assets/types";
import type {
  CheckInResult,
  Customer,
  NotificationPreferences,
  VenueAvailability,
} from "@/lib/types/business";

/** Per-process edits layered over the snapshot, keyed by venue. */
const overlay = new Map<string, RestaurantOverview>();
const availabilityOverlay = new Map<string, VenueAvailability>();
const prefsOverlay = new Map<string, NotificationPreferences>();
/** The Phase 5 bundles, per venue, once anything has been written to them. */
const operationsOverlay = new Map<string, OperationsBundle>();
/**
 * The guest base, once the door has added to it. Kept beside the
 * overview overlay rather than inside it because customers are a bundle
 * of their own — the overview carries a service, not a CRM.
 */
const customersOverlay = new Map<string, Customer[]>();
const readNotifications = new Set<string>();

export class StaticRestaurantRepository implements RestaurantRepository {
  async getOverview(venueId: string): Promise<RestaurantOverview> {
    const held = overlay.get(venueId);
    if (held) return clone(held);

    const bundle = staticVenue(venueId);
    if (!bundle) {
      // Unknown venue is a caller error, not an empty screen. Saying so
      // beats rendering a plausible-looking dashboard for a venue that
      // does not exist.
      throw new RepositoryError(
        `Aucun lieu ${venueId} dans le jeu de données statique.`,
        404,
        "venue_not_found",
      );
    }
    return clone(bundle.overview);
  }

  // ── Booking lifecycle ──

  async confirmReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.transition(restaurantId, reservationId, "confirmed");
  }

  async cancelReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.transition(restaurantId, reservationId, "cancelled");
  }

  async rejectReservation({ restaurantId, reservationId }: RejectBookingInput) {
    // Refusal is not cancellation — the coded reason is what makes them
    // separable downstream — but both leave the book the same way, and
    // the static driver has no analytics sink to tell them apart in.
    return this.transition(restaurantId, reservationId, "cancelled");
  }

  async reportNoShow({ restaurantId, reservationId }: NoShowInput) {
    return this.transition(restaurantId, reservationId, "no_show");
  }

  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    const data = await this.getOverview(input.restaurantId);
    const code = input.qrCode.trim().toUpperCase();
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

    // Persisted into the overlay, not left to the client's optimistic
    // copy — a check-in that lived only in one browser would let the same
    // code through twice, which is the one thing a QR must not allow.
    await this.transition(input.restaurantId, match.id, "arrived");

    return {
      ok: true,
      bookingId: match.id,
      guestName: match.guestName,
      partySize: match.partySize,
      method: "manual",
    };
  }

  async sendReminder(_input: ReservationRefInput) {
    // No SMS gateway without a backend.
  }

  async replyToReview(_input: ReviewReplyInput) {
    // No review platform without a backend.
  }

  // ── Business account ──

  async getBusinessAccount() {
    const account = staticBusinessAccount(
      process.env.LYFE_DEMO_USER_ID ?? "usr_yassine",
    );
    if (!account) {
      throw new RepositoryError("Aucun compte partenaire.", 404, "no_account");
    }
    return account;
  }

  // ── Venue profile and settings ──

  async getVenueProfile(venueId: string) {
    return clone(this.bundle(venueId).profile);
  }

  async listMenuItems(venueId: string) {
    return clone(this.bundle(venueId).menuItems);
  }

  async listStaff(venueId: string) {
    return clone(this.bundle(venueId).staff);
  }

  async listAssets(venueId: string, kind: AssetKind) {
    const bundle = this.bundle(venueId);
    return clone(kind === "photo" ? bundle.photos : bundle.menuFiles);
  }

  // ── Availability ──

  async getAvailability(venueId: string) {
    const held = availabilityOverlay.get(venueId);
    if (held) return clone(held);
    return clone(this.bundle(venueId).availability);
  }

  async updateAvailability(
    venueId: string,
    availability: Omit<VenueAvailability, "updatedAt">,
  ) {
    const next: VenueAvailability = {
      ...availability,
      updatedAt: new Date().toISOString(),
    };
    availabilityOverlay.set(venueId, next);
    return clone(next);
  }

  // ── Analytics ──

  async getAnalytics({ restaurantId, period }: AnalyticsInput) {
    const bundle = this.bundle(restaurantId);
    const found = bundle.analytics[period] ?? bundle.analytics["30d"];
    if (!found) {
      throw new RepositoryError("Période inconnue.", 404, "unknown_period");
    }
    return clone(found);
  }

  async getVisibilityMetrics({ restaurantId, period }: AnalyticsInput) {
    const bundle = this.bundle(restaurantId);
    const found = bundle.visibility[period] ?? bundle.visibility["30d"];
    if (!found) {
      throw new RepositoryError("Période inconnue.", 404, "unknown_period");
    }
    return clone(found);
  }

  // ── Customers ──

  async listCustomers(venueId: string) {
    return clone(this.customers(venueId));
  }

  async getCustomer(venueId: string, customerId: string) {
    return clone(this.customers(venueId).find((c) => c.id === customerId)) ?? null;
  }

  // ── Notifications ──

  async getNotifications(venueId: string) {
    return this.bundle(venueId).notifications.map((n) =>
      readNotifications.has(`${venueId}:${n.id}`) ? { ...n, read: true } : clone(n),
    );
  }

  async markNotificationRead(venueId: string, id: string) {
    readNotifications.add(`${venueId}:${id}`);
  }

  async getNotificationPreferences(venueId: string) {
    return clone(
      prefsOverlay.get(venueId) ?? this.bundle(venueId).notificationPreferences,
    );
  }

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    prefsOverlay.set(prefs.venueId, prefs);
    return clone(prefs);
  }

  // ── Phase 5 — the rest of the venue perimeter ──
  //
  // Reads come from the snapshot, overlaid with anything written this
  // process. Writes go through the reducers in `static-operations.ts`,
  // which apply the same action the SQL path applies — so a reviewer
  // pressing Installer with no database sees the same thing happen.

  async getServiceFloor(venueId: string) {
    return clone(this.operations(venueId).serviceFloor);
  }
  async getGuestGraph(venueId: string) {
    return clone(this.operations(venueId).guestGraph);
  }
  async getGrowth(venueId: string) {
    return clone(this.operations(venueId).growth);
  }
  async getNightlife(venueId: string) {
    return clone(this.operations(venueId).nightlife);
  }
  async getMoneyDesk(venueId: string) {
    return clone(this.operations(venueId).moneyDesk);
  }
  async getMarketing(venueId: string) {
    return clone(this.operations(venueId).marketing);
  }
  async getServiceConfiguration(venueId: string) {
    return clone(this.operations(venueId).serviceConfiguration);
  }
  async getSurveyConfig(venueId: string) {
    return clone(this.operations(venueId).surveyConfig);
  }
  async getVenueSettings(venueId: string) {
    return clone(this.operations(venueId).settings);
  }
  async getSubscription(venueId: string) {
    return clone(this.operations(venueId).subscription);
  }
  async listSupportTickets(venueId: string) {
    return clone(this.operations(venueId).supportTickets);
  }
  async getSpendByCustomer(venueId: string) {
    return clone(this.operations(venueId).spendByCustomer);
  }

  async runServiceFloorAction(venueId: string, action: ServiceFloorAction) {
    const bundle = this.operations(venueId);
    const result = reduce.applyServiceFloor(bundle.serviceFloor, action);
    let marketing = bundle.marketing;

    if (result.guestEvent) {
      marketing = await reduce.emitAndLog(
        outboundGateway(),
        venueId,
        marketing,
        result.guestEvent,
        result.eventProperties,
      );
    }
    // Seating a walk-in has to leave a guest behind, or the CRM is blind
    // to a visit that plainly happened.
    if (result.createdCustomer) {
      this.addCustomer(venueId, result.createdCustomer);
    }

    this.writeOperations(venueId, {
      ...bundle,
      serviceFloor: result.floor,
      marketing,
    });
    return clone(result.floor);
  }

  async runGuestGraphAction(venueId: string, action: GuestGraphAction) {
    const bundle = this.operations(venueId);
    const guestGraph = reduce.applyGuestGraph(bundle.guestGraph, action);
    this.writeOperations(venueId, { ...bundle, guestGraph });
    return clone(guestGraph);
  }

  async runGrowthAction(venueId: string, action: GrowthAction) {
    const bundle = this.operations(venueId);
    const result = reduce.applyGrowth(bundle.growth, action);
    let marketing = bundle.marketing;
    for (const { event, properties } of result.guestEvents ?? []) {
      marketing = await reduce.emitAndLog(
        outboundGateway(),
        venueId,
        marketing,
        event,
        properties,
      );
    }
    this.writeOperations(venueId, { ...bundle, growth: result.growth, marketing });
    return clone(result.growth);
  }

  async runNightlifeAction(venueId: string, action: NightlifeAction) {
    const bundle = this.operations(venueId);
    const result = reduce.applyNightlife(bundle.nightlife, action);
    let marketing = bundle.marketing;
    if (result.guestEvent) {
      marketing = await reduce.emitAndLog(
        outboundGateway(),
        venueId,
        marketing,
        result.guestEvent,
        result.eventProperties,
      );
    }
    if (result.createdCustomer) this.addCustomer(venueId, result.createdCustomer);

    this.writeOperations(venueId, {
      ...bundle,
      nightlife: result.nightlife,
      marketing,
      moneyDesk: result.createdDeposit
        ? {
            ...bundle.moneyDesk,
            deposits: [result.createdDeposit, ...bundle.moneyDesk.deposits],
          }
        : bundle.moneyDesk,
    });
    return clone(result.nightlife);
  }

  async runMoneyAction(venueId: string, action: MoneyAction) {
    const bundle = this.operations(venueId);
    const result = reduce.applyMoney(bundle.moneyDesk, action);
    let marketing = bundle.marketing;
    if (result.guestEvent) {
      marketing = await reduce.emitAndLog(
        outboundGateway(),
        venueId,
        marketing,
        result.guestEvent,
        result.eventProperties,
      );
    }
    this.writeOperations(venueId, { ...bundle, moneyDesk: result.money, marketing });
    return clone(result.money);
  }

  async runMarketingAction(venueId: string, action: MarketingAction) {
    const bundle = this.operations(venueId);
    const result = reduce.applyMarketing(bundle.marketing, action);
    let marketing = result.marketing;
    if (result.guestEvent) {
      await emitGuestEvent(
        outboundGateway(),
        { venueId, ...result.guestEvent },
        result.eventProperties,
      );
    }
    this.writeOperations(venueId, { ...bundle, marketing });
    return clone(marketing);
  }

  async runConfigurationAction(venueId: string, action: ConfigurationAction) {
    const bundle = this.operations(venueId);
    const serviceConfiguration = reduce.applyConfiguration(
      bundle.serviceConfiguration,
      action,
    );
    this.writeOperations(venueId, { ...bundle, serviceConfiguration });
    return clone(serviceConfiguration);
  }

  async saveSurveyConfig(venueId: string, config: SurveyConfig) {
    const bundle = this.operations(venueId);
    this.writeOperations(venueId, { ...bundle, surveyConfig: config });
    return clone(config);
  }

  async saveVenueSettings(venueId: string, settings: VenueSettings) {
    const bundle = this.operations(venueId);
    this.writeOperations(venueId, { ...bundle, settings });
    return clone(settings);
  }

  async openSupportTicket(
    venueId: string,
    input: { category: string; subject: string; body: string },
  ) {
    const bundle = this.operations(venueId);
    const at = new Date().toISOString();
    const supportTickets = [
      {
        id: `sup_${Date.now().toString(36)}`,
        reference: `SUP-${5000 + bundle.supportTickets.length}`,
        category: input.category,
        subject: input.subject.trim(),
        body: input.body.trim(),
        status: "ouvert" as const,
        createdAt: at,
        updatedAt: at,
      },
      ...bundle.supportTickets,
    ];
    this.writeOperations(venueId, { ...bundle, supportTickets });
    return clone(supportTickets);
  }

  async setZoneAvailable(venueId: string, zoneId: string, available: boolean) {
    const current = await this.getOverview(venueId);
    current.zones = current.zones.map((z) =>
      z.id === zoneId ? { ...z, available } : z,
    );
    overlay.set(venueId, current);
  }

  // ── Internals ──

  /** The Phase 5 bundles, snapshot or overlay. */
  private operations(venueId: string): OperationsBundle {
    const held = operationsOverlay.get(venueId);
    if (held) return held;
    const found = staticOperations(venueId);
    if (!found) {
      throw new RepositoryError(
        `Aucun lieu ${venueId} dans le jeu de données statique.`,
        404,
        "venue_not_found",
      );
    }
    return found;
  }

  private writeOperations(venueId: string, next: OperationsBundle) {
    operationsOverlay.set(venueId, next);
  }

  /**
   * Adds a guest the door just met.
   *
   * Both waitlist seating and guest-list check-in land here, because the
   * spec requires both to leave a customer record. Matched on phone
   * within the venue, so a regular walk-in stays one guest rather than
   * becoming a new row every Friday.
   */
  private addCustomer(venueId: string, guest: { name: string; phone: string }) {
    const current = this.customers(venueId);
    const at = new Date().toISOString();
    const existing = guest.phone
      ? current.find((c) => c.phone === guest.phone)
      : undefined;

    customersOverlay.set(
      venueId,
      existing
        ? current.map((c) =>
            c.id === existing.id
              ? { ...c, visitCount: c.visitCount + 1, lastVisitAt: at }
              : c,
          )
        : [
            {
              id: `cus_${Date.now().toString(36)}`,
              fullName: guest.name,
              phone: guest.phone,
              firstSeenAt: at,
              lastVisitAt: at,
              visitCount: 1,
              // No transaction source for a guest met at the door, so
              // no spend. Zero here means "nothing known", and every
              // spend tile keys off the transaction bundle, not this.
              averageSpendMad: 0,
              totalSpendMad: 0,
              // Read from the loyalty service, never derived here. A
              // guest met at the door starts on the entry tier.
              loyaltyTier: "nouveau",
              preferences: [],
              noShowHistory: [],
              noShowRisk: 0,
              reviewIds: [],
              segments: ["new"],
              optedOutOfMarketing: false,
            },
            ...current,
          ],
    );
  }

  /** The guest base: snapshot, or the overlay once the door has written. */
  private customers(venueId: string): Customer[] {
    return customersOverlay.get(venueId) ?? this.bundle(venueId).customers;
  }

  private bundle(venueId: string) {
    const found = staticVenue(venueId);
    if (!found) {
      throw new RepositoryError(
        `Aucun lieu ${venueId} dans le jeu de données statique.`,
        404,
        "venue_not_found",
      );
    }
    return found;
  }

  /**
   * Applies a state change and keeps the derived figures honest — a
   * reservation that moves to `arrived` has to raise arrived covers, or
   * the hero ring and the book disagree on the same screen.
   */
  private async transition(
    venueId: string,
    reservationId: string,
    to: Reservation["state"],
  ): Promise<RestaurantOverview> {
    const current = await this.getOverview(venueId);
    const target =
      current.upcomingReservations.find((r) => r.id === reservationId) ??
      current.waitlist.find((r) => r.id === reservationId);
    if (!target || target.state === to) return current;

    const wasBooked =
      target.state === "confirmed" || target.state === "requested";
    target.state = to;

    if (to === "arrived") {
      current.currentService.arrivedCovers += target.partySize;
      current.waitlist = current.waitlist.filter((r) => r.id !== reservationId);
    }
    if (to === "confirmed") {
      current.waitlist = current.waitlist.filter((r) => r.id !== reservationId);
      current.currentService.bookedCovers += target.partySize;
    }
    if (to === "cancelled") {
      current.upcomingReservations = current.upcomingReservations.filter(
        (r) => r.id !== reservationId,
      );
      current.waitlist = current.waitlist.filter((r) => r.id !== reservationId);
      if (wasBooked) {
        current.currentService.bookedCovers = Math.max(
          0,
          current.currentService.bookedCovers - target.partySize,
        );
      }
    }
    if (to === "no_show") {
      current.upcomingReservations = current.upcomingReservations.filter(
        (r) => r.id !== reservationId,
      );
      current.currentService.noShowCovers += target.partySize;
      current.noShows.count += 1;
      current.noShows.lostRevenueMad +=
        target.partySize * current.averageTicket.amountMad;
    }

    overlay.set(venueId, current);
    return clone(current);
  }
}

/**
 * Every read hands back a copy. The snapshot is module state shared by
 * every request in the process; handing out a reference would let one
 * request's mutation leak into the next one's render.
 */
function clone<T>(value: T): T {
  return value === undefined ? value : (structuredClone(value) as T);
}
