// LYFE domain types, shape mirrors the eventual REST/GraphQL responses
// so swapping mock for fetch() requires no component changes.

// Organizer profile — the entity that signs in. `type` drives whether
// the venue-specific subsections (Détails du lieu) render. Festivals
// don't have one fixed venue; promoters book multiple. Venues do.
export type OrganizerType = "festival" | "venue" | "promoter";

export interface OrganizerProfile {
  id: string;
  type: OrganizerType;
  /** Display name on the public page and in the chrome. */
  name: string;
  shortName: string;
  /** Used in the sidebar avatar tile (max 2 chars). */
  initials: string;
  city: string;
  /** One-line subhead under the org switcher card. */
  subline: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  bio: string;
  socials: {
    instagram?: string;
    facebook?: string;
    x?: string;
    linkedin?: string;
    tiktok?: string;
  };
  /** Default venue id when type === "venue". */
  primaryVenueId?: string;
}

// Event lifecycle is a discriminated union — the shape carries the
// per-state metadata that the kebab actions, status pill, and various
// flow gates need. `EventState` is the bare-string discriminator used
// by filter UIs.
export type EventState =
  | "draft"
  | "in_review"
  | "rejected"
  | "on_sale"
  | "live"
  | "past"
  | "settled"
  | "cancelled";

export type LifecycleStatus =
  | { state: "draft"; lastSavedAt: string }
  | { state: "in_review"; submittedAt: string; slaDeadline: string }
  | {
      state: "rejected";
      rejectedAt: string;
      reason: string;
      rejectedFields: string[];
    }
  | { state: "on_sale"; saleStartAt: string; saleEndAt: string }
  | { state: "live"; eventStartAt: string; eventEndAt: string }
  | { state: "past"; endedAt: string }
  | { state: "settled"; settledAt: string; payoutRef: string }
  | { state: "cancelled"; cancelledAt: string; refundsTriggered: boolean };

/** @deprecated. Kept as alias of EventState for incremental migration. */
export type EventStatus = EventState;
export type CardOrigin = "moroccan" | "international";
export type AgePolicy = "all" | "18+" | "21+";
export type Category =
  | "concert"
  | "club_night"
  | "festival"
  | "workshop"
  | "comedy"
  | "sports"
  | "other";

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  ice?: string;
  rc?: string;
}

export interface Tier {
  id: string;
  name: string;
  faceValueMad: number;
  quantity: number;
  sold: number;
  saleStart: string;
  saleEnd: string;
  maxPerOrder: number;
  transferable: boolean;
}

/**
 * Lightweight signal LYFE surfaces on the events list as a violet-soft
 * pill on the row. Click deep-links to the relevant tab on the event
 * detail (Analyses for forecast deviations, Bilan for review clusters
 * once the event is past).
 */
export type AnalyticsSignalKind = "forecast_deviation" | "review_cluster";

export interface AnalyticsSignal {
  kind: AnalyticsSignalKind;
  /** Single-line summary surfaced in the events list pill. */
  summary: string;
}

export interface LyfeEvent {
  id: string;
  name: string;
  description: string;
  category: Category;
  venue: Venue;
  startsAt: string;
  endsAt: string;
  agePolicy: AgePolicy;
  dressCode?: string;
  tiers: Tier[];
  refundPolicy: "auto" | "manual";
  coverUrl: string;
  /** Full lifecycle status with per-state metadata. */
  status: LifecycleStatus;
  createdAt: string;
  pageViews: number;
  peakHour?: string;
  /**
   * Series identifier shared across editions. Drives the Bilan tab's
   * "édition précédente" comparisons — events with the same
   * `parentEventSeriesId` are matched as priors. Undefined for
   * first-time events on the platform.
   */
  parentEventSeriesId?: string;
  /**
   * Inline insight LYFE has surfaced on this event. Renders as a
   * violet-soft pill on the events list row. Undefined for events
   * with no current signal.
   */
  analyticsSignal?: AnalyticsSignal;
}

export interface ActivityItem {
  id: string;
  type:
    | "purchase"
    | "transfer"
    | "refund"
    | "scan"
    | "moderation"
    | "boost"
    | "anomaly";
  message: string;
  actor: string;
  eventId?: string;
  /** When type === "boost", links the row to /visibilite/{campaignId}. */
  campaignId?: string;
  /**
   * Anomaly variant flavor — drives the icon and the row's tinted
   * background. "spike" = positive surprise (gold-soft), "cluster" =
   * worth investigating (warning-tinted), "geo" = geographic concentration.
   */
  anomalyKind?: "spike" | "cluster" | "geo";
  at: string;
}

export interface OverviewData {
  organizer: {
    firstName: string;
    venueName: string;
    /** Greeting subtitle copy, varies by org type (festival vs venue). */
    greetingSubline: string;
    /** Italic clause inside the H1 (Fraunces violet-deep). */
    greetingClause: string;
  };
  /**
   * Headline event card, either "live tonight" or "in preparation, J-N
   * away". The discriminant is `mode`.
   */
  headline:
    | {
        mode: "live";
        eventName: string;
        eventStartsAt: string;
        soldTickets: number;
        capacity: number;
        revenueMad: number;
      }
    | {
        mode: "preparing";
        eventName: string;
        dateRangeLabel: string;
        daysUntil: number;
        phaseCurrent: number;
        phaseTotal: number;
        /** 0·1 share of phase progression, drives the ring. */
        phaseProgress: number;
        /** Pass-style stats shown beneath the ring. */
        salesPhaseLabel: string;
        salesPhaseValue: number;
        consolidatedRevenueLabel: string;
        consolidatedRevenueMad: number;
        /** AI close-out projection, rendered as the hero's forecast strip. */
        forecast?: {
          finalSellThroughPct: number;
          /** Pre-formatted, e.g. "22,8M MAD". */
          finalRevenueLabel: string;
          confidenceLabel: "haute" | "moyenne" | "faible";
          confidenceMarginPct: number;
        };
      };
  ticketsToday: {
    count: number;
    deltaPctVsYesterday: number;
    series24h: number[];
  };
  revenueWeek: {
    amountMad: number;
    deltaPctVsLastWeek: number;
  };
  upcomingEventsCount: number;
  nextPayout: {
    amountMad: number;
    scheduledFor: string;
  };
  upcomingEvents: LyfeEvent[];
  activity: ActivityItem[];
}

// === Event detail ===

export interface Attendee {
  id: string;
  name: string;
  phone: string;
  email: string;
  tierId: string;
  tierName: string;
  purchaseDate: string;
  qrStatus: "unused" | "scanned" | "transferred";
  scannedAt?: string;
  transferredTo?: string;
  originalBuyer?: string;
}

export interface RefundRequest {
  id: string;
  buyerName: string;
  tierName: string;
  amountMad: number;
  requestedAt: string;
  reason: string;
  status: "pending" | "approved" | "denied" | "auto_approved";
  resolvedAt?: string;
  slaExpiresAt: string;
}

export interface RevenuePoint {
  day: string;
  amount: number;
}

export interface ScanLog {
  id: string;
  code: string;
  staff: string;
  at: string;
  attendeeName: string;
}

// === Settlements ===

export interface Payout {
  id: string;
  amountMad: number;
  scheduledFor: string;
  paidAt?: string;
  status: "scheduled" | "processing" | "paid";
  reference: string;
  eventNames: string[];
  ticketCount: number;
  statementUrl: string;
}

export interface Invoice {
  id: string;
  number: string;
  issuedAt: string;
  amountMad: number;
  description: string;
  pdfUrl: string;
}

// === Team ===

export type TeamRole = "owner" | "admin" | "scanner";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastActive: string;
  pending?: boolean;
  eventScopeId?: string;
}

export type AuditAction =
  | "invited_member"
  | "removed_member"
  | "changed_role"
  | "approved_refund"
  | "denied_refund"
  | "cancelled_event"
  | "changed_payout_account"
  | "submitted_event"
  | "edited_settings";

export interface AuditEntry {
  id: string;
  actor: { name: string; email: string };
  action: AuditAction;
  /** Human-readable summary, varies by action ("Reda Bennani", "Pass Jour Carré Or, 1 200 MAD"…). */
  targetSummary: string;
  timestamp: string;
}

// === Wizard ===

export interface DraftTier {
  id: string;
  name: string;
  faceValueMad: number;
  quantity: number;
  saleStart: string;
  saleEnd: string;
  maxPerOrder: number;
  transferable: boolean;
}

export interface DraftEvent {
  name: string;
  description: string;
  category: Category;
  venueId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  agePolicy: AgePolicy;
  dressCode: string;
  tiers: DraftTier[];
  refundPolicy: "auto" | "manual";
  coverName: string | null;
  galleryNames: string[];
  artists: { id: string; name: string; role: string }[];
  partnerLogos: string[];
}
