// Data MAX for Events — types for the Analyses tab, the Bilan tab, the
// /audiences route, and the customer profile sheet. Mirrored on the
// eventual REST shape so swapping mock for fetch() is mechanical.

import type { AudienceSegment } from "./visibility";

// === Analyses tab ===

/**
 * Confidence pill copy. Mapped from `confidenceMarginPct` via
 * {@link confidenceLabelFor} so the data layer carries the rendered text.
 *  - <  ±5 %   → "Confiance élevée"
 *  - 5-10 %    → "Confiance moyenne"
 *  - >  10 %   → "Confiance limitée"
 */
export type ConfidenceLabel =
  | "Confiance élevée"
  | "Confiance moyenne"
  | "Confiance limitée";

export function confidenceLabelFor(marginPct: number): ConfidenceLabel {
  if (marginPct < 5) return "Confiance élevée";
  if (marginPct <= 10) return "Confiance moyenne";
  return "Confiance limitée";
}

/**
 * One bucket on the sell-through chart. The actual line stops where
 * `actualPct` becomes undefined (today). The projected line runs the
 * full curve all the way to the forecast's predicted final.
 */
export interface SellThroughPoint {
  /** Day index from sale start (0 = first day on sale). */
  day: number;
  /** Short label for the x-axis tick, e.g. "J-67", "J-30", "Jour J". */
  label: string;
  /** Actual cumulative sell-through %, undefined for points beyond today. */
  actualPct?: number;
  /** Projected target trajectory %, full curve. Hardcoded per event — converges on the forecast. */
  projectedPct: number;
}

export interface EventForecast {
  /** Predicted final sell-through %. */
  finalSellThroughPct: number;
  /** Predicted final revenue, MAD. */
  finalRevenueMad: number;
  /** Pre-formatted final revenue, e.g. "5,1M MAD". */
  finalRevenueLabel: string;
  /** ± margin around the prediction, %. */
  confidenceMarginPct: number;
  /** Copy mapped from {@link confidenceMarginPct}. Surfaced as a violet-soft pill. */
  confidenceLabel: ConfidenceLabel;
}

export type ChannelKey = "organic" | "boost" | "partner" | "direct";

export interface ChannelSlice {
  key: ChannelKey;
  label: string;
  /** CSS custom-property name the donut/legend should read. Section 2
   *  defines the actual values; Section 1 just documents the contract. */
  colorVar: string;
  tickets: number;
  revenueMad: number;
  /** Share of total tickets, %. */
  pct: number;
}

/** Channel → (label, colorVar). Used by both the Analyses donut and
 *  the Bilan channels block. The colors match the brief:
 *  organic = violet, boost = violet-deep, partner = sand, direct = sky. */
export const CHANNEL_PRESENTATION: Record<
  ChannelKey,
  { label: string; colorVar: string }
> = {
  organic: { label: "Organique", colorVar: "var(--color-violet)" },
  boost: { label: "Boost", colorVar: "var(--color-violet-deep)" },
  partner: { label: "Partenaires", colorVar: "var(--color-sand)" },
  direct: { label: "Direct", colorVar: "var(--color-sky)" },
};

export interface AnalysesData {
  /** Full curve from sale start to event day. */
  sellThrough: SellThroughPoint[];
  forecast: EventForecast;
  /** Channel breakdown of attributed tickets / revenue. */
  channels: ChannelSlice[];
}

// === Reviews ===

export type ReviewLanguage = "fr" | "en" | "ar_latin";

export interface ReviewItem {
  id: string;
  buyerName: string;
  /** 1-5. */
  rating: number;
  text: string;
  language: ReviewLanguage;
  at: string;
}

export interface ReviewTag {
  /** Cluster name, e.g. "Acoustique Stage 21". */
  name: string;
  /** Number of reviews mentioning this cluster. */
  count: number;
}

export interface ReviewSummary {
  /** 0-5. */
  averageRating: number;
  reviewCount: number;
  /** Counts per star, index 0 = 1★, … index 4 = 5★. */
  distribution: [number, number, number, number, number];
  /** Most-mentioned positive clusters, surfaced in Bilan. */
  positiveTags: ReviewTag[];
  /** Most-mentioned improvement clusters. */
  improvementTags: ReviewTag[];
}

// === Bilan tab ===

export interface PreviousEditionStat {
  /** Metric label, e.g. "Sell-through". */
  label: string;
  /** Pre-formatted value for the current edition. */
  currentValue: string;
  /** Pre-formatted value for the prior edition. */
  priorValue: string;
  /** Pre-formatted delta, e.g. "+8 pts" or "−1,2 %". */
  deltaLabel: string;
  /** Whether the delta reads as favorable (drives color tone). */
  favorable: boolean;
}

export interface PreviousEdition {
  /** Reference to the prior LyfeEvent.id. */
  priorEventId: string;
  /** Display label, e.g. "Pré-vente fidèles, édition 2024". */
  editionLabel: string;
  /** ISO date when the prior edition ended. */
  endedAt: string;
  comparisons: PreviousEditionStat[];
}

export interface BilanData {
  /** Stable identifier — matches LyfeEvent.id. */
  eventId: string;
  /** Headline KPIs for the post-event recap. */
  finalSellThroughPct: number;
  finalRevenueMad: number;
  totalAttendees: number;
  /** Scan-rate at the door, % of valid tickets actually scanned. */
  scanRatePct: number;
  refundRatePct: number;
  /** Pre-formatted financial line (post-fees, post-refunds). */
  netRevenueLabel: string;
  channels: ChannelSlice[];
  reviewSummary: ReviewSummary;
  reviews: ReviewItem[];
  /** Empty array for first-time editions. */
  previousEditions: PreviousEdition[];
}

// === /audiences ===

export interface AudienceCategory {
  name: string;
  description: string;
}

export interface AudiencesEmptyState {
  /** Confirmed reservations the account has accumulated so far. */
  currentBookings: number;
  /** Threshold at which segments unlock. */
  unlockThreshold: number;
  /** Category previews shown while audiences are still locked. */
  upcomingCategories: AudienceCategory[];
}

/**
 * Customer profile shown in the side sheet. Tags drive segment matching
 * for the boost-prefill flow — see `primaryTag`.
 */
export interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  /** Free-form tags, e.g. ["festivaliers réguliers", "casablanca", "carré or"]. */
  tags: string[];
  /** Tag used to pick the boost-wizard segment when launching from the sheet. */
  primaryTag: string;
  /** Audience segment id that pairs with `primaryTag`. */
  primarySegmentId: string;
  totalEventsAttended: number;
  totalSpentMad: number;
  /** Tier derived from spend + attendance. */
  lifetimeTier: "casual" | "regular" | "vip";
  firstSeenAt: string;
  lastSeenAt: string;
  /** Optional internal note — visible only to the organizer team. */
  notes?: string;
}

/**
 * Audiences route data. Discriminated by `state`:
 *  - "ready"  → segments + sample buyers (mature account)
 *  - "locked" → empty-state copy + progress to unlock (new account)
 */
export type AudiencesData =
  | {
      state: "ready";
      /** Total unique buyers across all events. */
      totalBuyers: number;
      segments: AudienceSegment[];
      /** Buyers surfaced in the audiences route's "à découvrir" rail. */
      sampleBuyers: BuyerProfile[];
    }
  | {
      state: "locked";
      emptyState: AudiencesEmptyState;
    };

// === Insights ===

/**
 * Insight surface — the place in the UI where the body renders. Drives
 * how the insight engine selects (e.g. of_the_day rotates by hour, the
 * analyses_* surfaces resolve per event).
 */
export type InsightSurface =
  | "of_the_day"
  | "analyses_phase"
  | "analyses_pace"
  | "analyses_funnel"
  | "analyses_reviews"
  | "audiences";

export interface Insight {
  id: string;
  surface: InsightSurface;
  /** When set, the insight is scoped to a specific event. */
  eventId?: string;
  body: string;
  /** Optional emphasised number / phrase rendered in the violet headline. */
  accent?: string;
  cta?: { label: string; href: string };
}
