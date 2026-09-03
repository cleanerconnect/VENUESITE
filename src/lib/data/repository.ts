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
export interface RestaurantRepository extends VenueOperationsRepository {
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

// ═════════════════════════════════════════════════════════════
// Phase 5 — the rest of the venue perimeter.
//
// Reads are grouped into bundles rather than exposed one table at a
// time, for the reason stated at the top of this file: a screen renders
// a coherent snapshot, and six round trips would let a counter disagree
// with the list under it.
//
// Writes are a typed union per bundle instead of forty methods. Three
// things fall out of that and all three are wanted:
//
//   · an action is JSON, so it is already the body of one HTTP endpoint
//     per surface rather than forty routes to write and forty to secure
//   · the set of things a screen can ask for is a closed list the
//     compiler checks, mirroring the client command registry
//   · every action returns the refreshed bundle, so an optimistic client
//     reconciles against what actually happened instead of refetching
// ═════════════════════════════════════════════════════════════

import type {
  Growth,
  GuestGraph,
  Marketing,
  MoneyDesk,
  Nightlife,
  OfferStatus,
  PacingRules,
  ServiceDefinition,
  ServiceFloor,
  Subscription,
  SupportTicket,
  SurveyConfig,
  VenueSettings,
  WaitlistRemovalReason,
  WaitlistSource,
} from "@/lib/types/venue-operations";

/** Services and the rules that decide what the app offers. */
export interface ServiceConfiguration {
  services: ServiceDefinition[];
  pacing: PacingRules;
}

// ── Actions ──────────────────────────────────────────────────

export type ServiceFloorAction =
  | {
      kind: "waitlist.add";
      guestName: string;
      guestPhone: string;
      partySize: number;
      quotedMinutes: number;
      source: WaitlistSource;
    }
  /** Sends the table-ready message and starts the countdown. */
  | { kind: "waitlist.notify"; id: string }
  /** Marks arrived AND creates the booking, so the CRM sees the visit. */
  | { kind: "waitlist.seat"; id: string }
  | { kind: "waitlist.remove"; id: string; reason: WaitlistRemovalReason }
  | { kind: "waitlist.requote"; id: string; quotedMinutes: number }
  | { kind: "waitlist.convert"; id: string; at: string }
  | {
      kind: "waitlist.settings";
      onlineOpen: boolean;
      maxPartyOnline: number;
      defaultQuoteMinutes: number;
      pausedReason: string;
    }
  | { kind: "shiftNote.add"; body: string; pinned: boolean }
  | { kind: "calendar.close"; date: string; reason: string }
  | { kind: "calendar.open"; date: string }
  | { kind: "calendar.capacity"; date: string; capacity: number; note: string };

export type GuestGraphAction =
  | { kind: "tag.create"; label: string; colour: string; staffVisible: boolean }
  | {
      kind: "tag.update";
      id: string;
      label: string;
      colour: string;
      staffVisible: boolean;
    }
  | { kind: "tag.archive"; id: string }
  /** Bulk apply, from a selection in Liste clients. */
  | { kind: "tag.apply"; tagId: string; customerIds: string[] }
  | { kind: "tag.remove"; tagId: string; customerId: string }
  | { kind: "rule.update"; id: string; threshold: number; windowDays: number; enabled: boolean }
  | {
      kind: "segment.create";
      name: string;
      description: string;
      criteria: Record<string, unknown>;
      memberCount: number;
    }
  | { kind: "segment.delete"; id: string };

export interface OfferInput {
  id: string | null;
  name: string;
  kind: "percent" | "amount" | "free_item" | "set_menu";
  value: number;
  freeItemLabel: string;
  weekdays: number[];
  serviceIds: string[];
  startsOn: string;
  endsOn: string;
  coverCap: number;
  minParty: number;
  prepaymentRequired: boolean;
  status: OfferStatus;
}

export interface ExperienceInput {
  id: string | null;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  priceMad: number;
  prepayPercent: number;
  cancellationTerms: string;
  addons: { label: string; priceMad: number }[];
  status: "brouillon" | "publie" | "complet" | "termine";
}

export type GrowthAction =
  | { kind: "offer.save"; offer: OfferInput }
  | { kind: "offer.status"; id: string; status: OfferStatus }
  | { kind: "offer.duplicate"; id: string }
  | { kind: "experience.save"; experience: ExperienceInput }
  | {
      kind: "experience.status";
      id: string;
      status: "brouillon" | "publie" | "complet" | "termine";
    };

export type NightlifeAction =
  | { kind: "guestList.status"; id: string; status: "ouverte" | "fermee" }
  | {
      kind: "guestList.addEntry";
      guestListId: string;
      guestName: string;
      guestPhone: string;
      partySize: number;
      source: "app" | "promoteur" | "sur_place";
      promoterId: string | null;
    }
  /** Door check-in. Creates a customer record, per the spec. */
  | { kind: "guestList.checkIn"; entryId: string; count: number }
  | { kind: "guestList.undoCheckIn"; entryId: string }
  | {
      kind: "tableType.save";
      id: string | null;
      name: string;
      count: number;
      minGuests: number;
      maxGuests: number;
      depositPercent: number;
      packageLabel: string;
      cancellationHours: number;
    }
  | {
      kind: "tableOffer.save";
      tableTypeId: string;
      nightKind: string;
      minimumMad: number;
    }
  | { kind: "table.confirm"; id: string }
  | { kind: "table.requestDeposit"; id: string }
  | { kind: "table.markReached"; id: string; amountMad: number }
  | { kind: "table.release"; id: string }
  | {
      kind: "promoter.save";
      id: string | null;
      fullName: string;
      phone: string;
      commissionPercent: number;
    }
  | { kind: "promoter.setActive"; id: string; active: boolean };

export type MoneyAction =
  | {
      kind: "depositPolicy.save";
      id: string | null;
      name: string;
      appliesTo: "party_size" | "service" | "night" | "experience" | "table";
      appliesValue: string;
      mode: "none" | "imprint" | "per_person" | "full";
      amountMad: number;
      noShowFeeMad: number;
      lateCancelFeeMad: number;
      graceMinutes: number;
      enabled: boolean;
      /** Refused if the policy moved under the editor. */
      expectedVersion: number | null;
    }
  | { kind: "deposit.chase"; id: string }
  /**
   * Capture, release and refund move money, so they carry the key the
   * processor is idempotent on: a replayed request is refused rather
   * than charging the guest twice.
   */
  | { kind: "deposit.capture"; id: string; idempotencyKey: string }
  | { kind: "deposit.release"; id: string; idempotencyKey: string }
  | { kind: "deposit.refund"; id: string; idempotencyKey: string }
  | {
      kind: "cancellationPolicy.save";
      freeUntilHours: number;
      lateFeeMad: number;
      noShowFeeMad: number;
      guestMessage: string;
      expectedVersion: number;
    }
  | { kind: "cancellation.waive"; id: string }
  | { kind: "cancellation.dispute"; id: string; disputed: boolean }
  | { kind: "transaction.link"; id: string; reservationId: string | null };

export interface CampaignInput {
  id: string | null;
  name: string;
  channel: "email" | "sms" | "whatsapp";
  template: "offre" | "evenement" | "newsletter" | "anniversaire" | "win_back";
  segmentId: string | null;
  subject: string;
  body: string;
  scheduledFor: string | null;
  automation: "" | "bienvenue" | "remerciement" | "win_back" | "anniversaire";
}

export type MarketingAction =
  | { kind: "campaign.save"; campaign: CampaignInput }
  | {
      kind: "campaign.status";
      id: string;
      status: "brouillon" | "programmee" | "envoi" | "envoyee" | "en_pause";
    }
  | { kind: "campaign.duplicate"; id: string }
  | { kind: "campaign.test"; id: string; recipient: string }
  | { kind: "suppression.add"; contact: string; reason: string };

export type ConfigurationAction =
  | {
      kind: "service.save";
      id: string | null;
      name: string;
      kindLabel: string;
      weekdays: number[];
      startsAt: string;
      endsAt: string;
      lastBookingAt: string;
      capacityCovers: number;
      coversPerQuarter: number;
      turnMinutesSmall: number;
      turnMinutesLarge: number;
      zoneIds: string[];
      enabled: boolean;
      /** Availability is the one edit that changes what is bookable now. */
      expectedVersion: number | null;
    }
  | { kind: "service.remove"; id: string }
  | {
      kind: "pacing.save";
      maxArrivalsPerQuarter: number;
      maxCoversPerService: number;
      maxPartyOnline: number;
      minPartyOnline: number;
      requestOnlyAbove: number;
      bookingWindowDays: number;
      sameDayCutoff: string;
      minLeadMinutes: number;
      onlineBookingOpen: boolean;
      reopenAt: string | null;
      expectedVersion: number;
    };

/**
 * A write refused because the row moved under the editor. Distinct from
 * a failure: nothing is wrong, the caller simply has to look again.
 */
export class StaleWriteError extends Error {
  constructor(readonly entity: string) {
    super(`${entity} changed since it was read`);
    this.name = "StaleWriteError";
  }
}

/** The reads and writes Phase 5 added, mixed into the repository below. */
export interface VenueOperationsRepository {
  getServiceFloor(venueId: string): Promise<ServiceFloor>;
  getGuestGraph(venueId: string): Promise<GuestGraph>;
  getGrowth(venueId: string): Promise<Growth>;
  getNightlife(venueId: string): Promise<Nightlife>;
  getMoneyDesk(venueId: string): Promise<MoneyDesk>;
  getMarketing(venueId: string): Promise<Marketing>;
  getServiceConfiguration(venueId: string): Promise<ServiceConfiguration>;
  getSurveyConfig(venueId: string): Promise<SurveyConfig>;
  getVenueSettings(venueId: string): Promise<VenueSettings>;
  getSubscription(venueId: string): Promise<Subscription>;
  listSupportTickets(venueId: string): Promise<SupportTicket[]>;
  /**
   * Spend per customer id, from Lyfe Pay transactions alone. Empty where
   * the venue has no transaction source — which is the signal every
   * spend tile in the portal hides on.
   */
  getSpendByCustomer(venueId: string): Promise<Record<string, number>>;

  runServiceFloorAction(
    venueId: string,
    action: ServiceFloorAction,
  ): Promise<ServiceFloor>;
  runGuestGraphAction(venueId: string, action: GuestGraphAction): Promise<GuestGraph>;
  runGrowthAction(venueId: string, action: GrowthAction): Promise<Growth>;
  runNightlifeAction(venueId: string, action: NightlifeAction): Promise<Nightlife>;
  runMoneyAction(venueId: string, action: MoneyAction): Promise<MoneyDesk>;
  runMarketingAction(venueId: string, action: MarketingAction): Promise<Marketing>;
  runConfigurationAction(
    venueId: string,
    action: ConfigurationAction,
  ): Promise<ServiceConfiguration>;
  saveSurveyConfig(venueId: string, config: SurveyConfig): Promise<SurveyConfig>;
  saveVenueSettings(
    venueId: string,
    settings: VenueSettings,
  ): Promise<VenueSettings>;
  openSupportTicket(
    venueId: string,
    input: { category: string; subject: string; body: string },
  ): Promise<SupportTicket[]>;
  /**
   * Opens or closes a zone for booking. A zone is a booking preference,
   * never a floor layout — physical table positions are out of scope.
   */
  setZoneAvailable(
    venueId: string,
    zoneId: string,
    available: boolean,
  ): Promise<void>;
}
