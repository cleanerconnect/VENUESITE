import type { PendingVenue } from "@/lib/types/restaurant";
import type {
  VenueValidationInput,
  RescheduleBookingInput,
  BookableSlot,
} from "@/lib/types/business";
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
  type AssetAction,
  type CheckInInput,
  type NoShowInput,
  type RejectBookingInput,
  type ReservationRefInput,
  type RestaurantRepository,
  type ReviewReplyInput,
  type OnboardingDraftPatch,
  type OnboardingSignUpInput,
  type VenueListingPatch,
  type VenueProfilePatch,
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
import type {
  DayBook,
  Reservation,
  RestaurantOverview,
  RestaurantProfile,
} from "@/lib/types/restaurant";
import type { AssetKind, VenueAsset } from "@/lib/assets/types";
import type { OnboardingDraft } from "@/lib/types/onboarding";
import { defaultHours } from "@/lib/types/onboarding";
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
/**
 * Ma fiche's record and its photos, once the forms have been used.
 *
 * The snapshot is a committed capture, so a write cannot persist — but
 * it can hold for the life of the process, which is what makes the form
 * demonstrable on a machine with no database at all.
 */
const profileOverlay = new Map<string, RestaurantProfile>();
/** Onboarding drafts, and the addresses that have started one. */
const draftOverlay = new Map<string, OnboardingDraft>();
const signUps = new Map<string, string>();
const assetOverlay = new Map<string, VenueAsset[]>();
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

  async getDayBook(venueId: string, date: string): Promise<DayBook> {
    const bundle = staticVenue(venueId);
    if (!bundle) {
      throw new RepositoryError(
        `Aucun lieu ${venueId} dans le jeu de données statique.`,
        404,
        "venue_not_found",
      );
    }

    const captured = bundle.dayBooks?.[date];
    // A date outside the captured window is not an error — it is a day
    // with nothing in it, which is exactly what the screen should say.
    // Inventing services for it would claim hours this driver cannot
    // check against the definitions it holds.
    return clone(captured ?? { date, services: [], reservations: [] });
  }

  // ── Booking lifecycle ──

  async confirmReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.transition(restaurantId, reservationId, "confirmed");
  }

  async cancelReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.transition(restaurantId, reservationId, "cancelled");
  }

  /**
   * The snapshot holds a day's book, not the service definitions the
   * grid is built from, so it can offer nothing rather than offer times
   * it made up.
   */
  /**
   * The snapshot holds one day, so a cross-day search has nothing to
   * cross. It searches the day it has rather than claiming none.
   */
  async searchReservations(_venueId: string, query: string): Promise<Reservation[]> {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const digits = term.replace(/\D/g, "");
    const overview = await this.getOverview(_venueId);
    return overview.upcomingReservations.filter(
      (r) =>
        r.guestName.toLowerCase().includes(term) ||
        (digits !== "" && r.guestPhone.replace(/\D/g, "").includes(digits)),
    );
  }

  async getBookableSlots(): Promise<BookableSlot[]> {
    return [];
  }

  async rescheduleReservation(
    _input: RescheduleBookingInput,
  ): Promise<RestaurantOverview> {
    throw new RepositoryError(
      "Aucune base de données : décaler une réservation a besoin d'une base. En local : `npm run db:reset`.",
      503,
      "store_required",
    );
  }

  async rejectReservation({ restaurantId, reservationId }: RejectBookingInput) {
    // Refusal is not cancellation: the coded reason is what makes the two
    // separable downstream, and the schema keeps them as different
    // states. The snapshot has no analytics sink to put the reason in,
    // but it can at least stop collapsing the state.
    return this.transition(restaurantId, reservationId, "rejected");
  }

  async reportNoShow({ restaurantId, reservationId }: NoShowInput) {
    return this.transition(restaurantId, reservationId, "no_show");
  }

  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    const data = await this.getOverview(input.restaurantId);
    const code = input.qrCode.trim().toUpperCase();
    const rows = [...data.upcomingReservations, ...data.waitlist];
    // A code means the scanner; no code and a booking id means the host
    // tapped a name off the list.
    const method: CheckInResult["method"] = code ? "qr" : "manual";
    const match = code
      ? rows.find(
          (r) => `LYFE-${r.id}`.toUpperCase() === code || r.id.toUpperCase() === code,
        )
      : rows.find((r) => r.id === input.reservationId);

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

    // Persisted into the overlay, not left to the client's optimistic
    // copy — a check-in that lived only in one browser would let the same
    // code through twice, which is the one thing a QR must not allow.
    await this.transition(input.restaurantId, match.id, "arrived");

    return {
      ok: true,
      bookingId: match.id,
      guestName: match.guestName,
      partySize: match.partySize,
      method,
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

  // ── Onboarding ──
  //
  // A signup can be walked through on the snapshot — the draft lives in
  // this process, which is enough to demonstrate the seven steps on a
  // clone with no database. The last step is where it stops: making a
  // venue means writing rows, and the snapshot is a committed capture.
  async requestPasswordReset(_email: string) {
    return { sent: false };
  }

  async startOnboarding(input: OnboardingSignUpInput) {
    const userId = `usr_${Math.random().toString(36).slice(2, 10)}`;
    const draft: OnboardingDraft = {
      id: `onb_${Math.random().toString(36).slice(2, 10)}`,
      ownerId: userId,
      step: 2,
      venueName: "",
      venueType: "restaurant",
      cuisine: "",
      priceRange: 2,
      city: "",
      district: "",
      address: "",
      latitude: null,
      longitude: null,
      coverObjectKey: "",
      coverContentType: "",
      coverSizeBytes: 0,
      photo2ObjectKey: "",
      photo2ContentType: "",
      photo2SizeBytes: 0,
      menuObjectKey: "",
      menuContentType: "",
      menuSizeBytes: 0,
      ambience: [],
      features: [],
      hours: defaultHours(),
      submittedVenueId: null,
      updatedAt: new Date().toISOString(),
    };
    draftOverlay.set(draft.id, draft);
    signUps.set(input.email.trim().toLowerCase(), userId);
    return { userId, draft: clone(draft) };
  }

  async getOnboardingDraft(draftId: string) {
    return clone(draftOverlay.get(draftId) ?? null);
  }

  async saveOnboardingDraft(draftId: string, patch: OnboardingDraftPatch) {
    const current = draftOverlay.get(draftId);
    if (!current) {
      throw new RepositoryError("Inscription introuvable.", 404, "draft_not_found");
    }
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    draftOverlay.set(draftId, next);
    return clone(next);
  }

  /**
   * Nobody is a LYFE administrator on the frozen snapshot, so the queue
   * is empty rather than absent: /admin/validations is unreachable
   * there, and a caller that reaches this anyway gets an honest nothing.
   */
  async listPendingVenues(): Promise<PendingVenue[]> {
    return [];
  }

  async decideVenueValidation(_input: VenueValidationInput): Promise<PendingVenue[]> {
    throw new RepositoryError(
      "Aucune base de données : la validation d'un établissement a besoin d'une base. En local : `npm run db:reset`.",
      503,
      "store_required",
    );
  }

  async submitOnboarding(_draftId: string): Promise<{ venueId: string }> {
    throw new RepositoryError(
      "Aucune base de données : les six étapes se parcourent sur le jeu statique, mais créer l'établissement a besoin d'une base. En local : `npm run db:reset`. Sur un déploiement : rattachez une base Postgres (DATABASE_URL).",
      503,
      "store_required",
    );
  }

  async getVenueProfile(venueId: string) {
    const held = profileOverlay.get(venueId);
    return clone(held ?? this.bundle(venueId).profile);
  }

  async saveVenueProfile(venueId: string, patch: VenueProfilePatch) {
    const current = await this.getVenueProfile(venueId);
    if (!current) {
      throw new RepositoryError("Lieu introuvable.", 404, "venue_not_found");
    }
    const next: RestaurantProfile = {
      ...current,
      name: patch.name,
      shortName: patch.shortName,
      tagline: patch.tagline,
      description: patch.description,
      cuisine: patch.cuisine,
      category: patch.category,
      address: patch.address,
      district: patch.district,
      city: patch.city,
      latitude: patch.latitude ?? undefined,
      longitude: patch.longitude ?? undefined,
      contactEmail: patch.contactEmail,
      contactPhone: patch.contactPhone,
      website: patch.website,
      // `patch.kind` is the venue's configuration — restaurant or
      // drinks — which the subline reads and `RestaurantProfile.kind`
      // does not hold: that field is the style of cooking. Two
      // different things that share a name, so the patch's value goes
      // to the subline.
      subline: `${patch.kind === "drinks" ? "Bar" : "Restaurant"} · ${patch.city}`,
    };
    profileOverlay.set(venueId, next);
    return clone(next);
  }

  async saveVenueListing(venueId: string, patch: VenueListingPatch) {
    const current = await this.getVenueProfile(venueId);
    if (!current) {
      throw new RepositoryError("Lieu introuvable.", 404, "venue_not_found");
    }
    const next: RestaurantProfile = {
      ...current,
      priceRange: patch.priceRange,
      tags: patch.tags,
      features: patch.features as RestaurantProfile["features"],
      ambience: patch.ambience,
    };
    profileOverlay.set(venueId, next);
    return clone(next);
  }

  async listMenuItems(venueId: string) {
    return clone(this.bundle(venueId).menuItems);
  }

  async listStaff(venueId: string) {
    return clone(this.bundle(venueId).staff);
  }

  async listAssets(venueId: string, kind: AssetKind) {
    const held = assetOverlay.get(`${venueId}:${kind}`);
    if (held) return clone(held);
    const bundle = this.bundle(venueId);
    return clone(kind === "photo" ? bundle.photos : bundle.menuFiles);
  }

  async runAssetAction(venueId: string, action: AssetAction) {
    const kind =
      action.kind === "asset.remove" ? "photo" : action.assetKind;
    const key = `${venueId}:${kind}`;
    const current = await this.listAssets(venueId, kind);

    if (action.kind === "asset.record") {
      const next: VenueAsset = {
        id: `ast_${Math.random().toString(36).slice(2, 10)}`,
        venueId,
        kind: action.assetKind,
        objectKey: action.objectKey,
        contentType: action.contentType,
        sizeBytes: action.sizeBytes,
        position: current.length,
        createdAt: new Date().toISOString(),
      };
      assetOverlay.set(key, [...current, next]);
      return clone(assetOverlay.get(key)!);
    }

    if (action.kind === "asset.remove") {
      // The snapshot's two kinds are small; finding which one holds the
      // id beats making the caller say.
      for (const k of ["photo", "menu_file"] as AssetKind[]) {
        const list = await this.listAssets(venueId, k);
        if (list.some((a) => a.id === action.id)) {
          const next = list.filter((a) => a.id !== action.id);
          assetOverlay.set(`${venueId}:${k}`, next);
          return clone(next);
        }
      }
      throw new RepositoryError("Média introuvable.", 404, "asset_not_found");
    }

    const byId = new Map(current.map((a) => [a.id, a]));
    const ordered = action.orderedIds
      .map((id, index) => {
        const found = byId.get(id);
        return found ? { ...found, position: index } : null;
      })
      .filter((a): a is VenueAsset => a !== null);
    assetOverlay.set(key, ordered);
    return clone(ordered);
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
  async getAudience(venueId: string) {
    return clone(this.operations(venueId).audience);
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

  async listCustomerBookings(venueId: string, customerId: string) {
    return clone(this.operations(venueId).bookingsByCustomer?.[customerId] ?? []);
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
    if (to === "cancelled" || to === "rejected") {
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
