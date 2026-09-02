// Business Service domain.
//
// The partner portal authenticates against the Business Service, not the
// consumer app's auth. These types mirror `business_accounts` and the
// `/api/business/*` contract so the repository layer has something exact
// to implement against.
//
// Restaurants and Drinks venues share this entire perimeter — the
// difference is configuration (see lib/venue/config.ts), not a second
// set of types.

export type VenueKind = "restaurant" | "drinks";

/**
 * `business_accounts`: business_id, venue_id, owner_id, subscription_tier,
 * features_enabled.
 *
 * `subscriptionTier` is carried because the column exists, NOT because the
 * product has tiers — LYFE sells one annual subscription. Nothing in this
 * codebase gates on its value; feature gating goes through
 * `featuresEnabled` so a commercial change is a data change. See the audit
 * note in docs/SCOPE_AUDIT.md.
 */
export interface BusinessAccount {
  businessId: string;
  venueId: string;
  ownerId: string;
  subscriptionTier: string;
  featuresEnabled: string[];
}

// ── Bookings ─────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "arrived"
  | "completed"
  | "no_show"
  | "cancelled"
  | "waitlisted";

/**
 * Why a venue refused a booking. Captured on rejection so it can feed
 * quality analytics later — a free-text-only reason cannot be aggregated.
 */
export type RejectionReason =
  | "fully_booked"
  | "party_too_large"
  | "outside_service"
  | "venue_closed"
  | "duplicate"
  | "other";

export const REJECTION_REASONS: Record<RejectionReason, string> = {
  fully_booked: "Complet sur ce créneau",
  party_too_large: "Groupe trop nombreux",
  outside_service: "Hors service",
  venue_closed: "Fermeture exceptionnelle",
  duplicate: "Doublon",
  other: "Autre",
};

export type CheckInMethod = "qr" | "manual";

export interface CheckInResult {
  ok: boolean;
  bookingId?: string;
  guestName?: string;
  partySize?: number;
  method: CheckInMethod;
  /** Populated when ok is false: unknown code, already used, wrong venue. */
  error?: "unknown_code" | "already_used" | "wrong_venue" | "expired";
}

// ── Availability ─────────────────────────────────────────────

/** One bookable window on one weekday, with the covers it can turn. */
export interface AvailabilitySlot {
  id: string;
  /** 1 = Monday … 7 = Sunday, ISO weekday. */
  weekday: number;
  opensAt: string;
  closesAt: string;
  /** Covers bookable in this window. */
  capacity: number;
  enabled: boolean;
}

/** A one-off closure that overrides the weekly pattern. */
export interface ClosureDay {
  id: string;
  date: string;
  reason: string;
}

export interface VenueAvailability {
  venueId: string;
  slots: AvailabilitySlot[];
  closures: ClosureDay[];
  /** Guard against a bad edit silently taking the venue off the app. */
  updatedAt: string;
}

// ── CRM ──────────────────────────────────────────────────────

export type LoyaltyTier = "nouveau" | "regulier" | "fidele" | "ambassadeur";

export const LOYALTY_TIER: Record<LoyaltyTier, { label: string; minVisits: number }> = {
  nouveau: { label: "Nouveau", minVisits: 0 },
  regulier: { label: "Régulier", minVisits: 3 },
  fidele: { label: "Fidèle", minVisits: 8 },
  ambassadeur: { label: "Ambassadeur", minVisits: 15 },
};

export interface NoShowRecord {
  bookingId: string;
  at: string;
  partySize: number;
}

/**
 * A customer record. Never entered by hand — every confirmed booking
 * creates or enriches one, which is why there is no create endpoint.
 */
export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  firstSeenAt: string;
  lastVisitAt?: string;
  visitCount: number;
  /** Average spend per visit, MAD. */
  averageSpendMad: number;
  totalSpendMad: number;
  loyaltyTier: LoyaltyTier;
  /** Allergies, seating, occasion — carried forward onto each booking. */
  preferences: string[];
  /** Persisted per customer, not only on the booking it happened on. */
  noShowHistory: NoShowRecord[];
  /** 0·1, derived from no-shows against completed visits. */
  noShowRisk: number;
  reviewIds: string[];
  segments: string[];
  optedOutOfMarketing: boolean;
}

export type CustomerSegment =
  | "all"
  | "new"
  | "returning"
  | "loyal"
  | "at_risk"
  | "lapsed";

export const CUSTOMER_SEGMENT: Record<CustomerSegment, string> = {
  all: "Tous",
  new: "Nouveaux",
  returning: "Revenus",
  loyal: "Fidèles",
  at_risk: "À risque",
  lapsed: "Perdus de vue",
};

// ── Analytics ────────────────────────────────────────────────

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "12m";

export const ANALYTICS_PERIOD: Record<AnalyticsPeriod, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
  "12m": "12 derniers mois",
};

export interface VenueAnalytics {
  venueId: string;
  period: AnalyticsPeriod;
  /** 0·100. */
  occupancyRate: number;
  occupancyDeltaPct: number;
  estimatedRevenueMad: number;
  revenueDeltaPct: number;
  /** 0·100 — share of bookings the customer never showed for. */
  noShowRate: number;
  noShowDeltaPct: number;
  coversServed: number;
  coversDeltaPct: number;
  series: { label: string; covers: number; revenueMad: number; noShows: number }[];
}

// ── Visibility ───────────────────────────────────────────────

export interface VisibilityMetrics {
  venueId: string;
  period: AnalyticsPeriod;
  impressions: number;
  impressionsDeltaPct: number;
  listingViews: number;
  listingViewsDeltaPct: number;
  /** Views that became a booking request. */
  conversionPct: number;
  reach: number;
  /** True while a paid boost is running. */
  boostActive: boolean;
  boostEndsAt?: string;
}

// ── Notifications ────────────────────────────────────────────

export type NotificationChannel = "push" | "email";

export interface NotificationPreferences {
  venueId: string;
  newBooking: NotificationChannel[];
  cancellation: NotificationChannel[];
  review: NotificationChannel[];
  dailySummary: NotificationChannel[];
}

export interface PortalNotification {
  id: string;
  type: "booking_request" | "cancellation" | "review" | "system";
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** Where acting on it takes you. */
  href?: string;
}
