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

/**
 * Phase performance row — one entry per pricing phase / tier on the
 * Analyses tab. Status drives the pill color (saturated / on-track /
 * lagging) and the narrative copy alongside.
 */
export type PhaseStatus = "saturated" | "on_track" | "lagging" | "upcoming";

export interface PhaseStat {
  /** Stable id, matches LyfeEvent.tiers[].id when derived from a tier. */
  id: string;
  label: string;
  /** Sale window start, ISO. */
  startedAt: string;
  /** Sale window end, ISO. */
  endsAt: string;
  sold: number;
  quantity: number;
  /** 0-100. */
  fillPct: number;
  /** Pre-formatted MAD revenue. */
  revenueLabel: string;
  revenueMad: number;
  status: PhaseStatus;
  /** Short narrative line for the row, e.g. "Saturée en 11 jours". */
  note: string;
}

export interface FunnelStep {
  key: "visits" | "cart" | "payment" | "completed";
  label: string;
  count: number;
  /** Conversion vs the previous step, %. Undefined for "visits". */
  stepConversionPct?: number;
}

export interface FunnelData {
  steps: FunnelStep[];
  /** Final visit-to-purchase conversion, %. */
  overallConversionPct: number;
  /** vs platform median, percentage points. Negative = below median. */
  vsPlatformPts: number;
}

/**
 * Recommendation surfaced in the side rail. Each row is an
 * actionable next step the organizer can take (lift a boost, adjust
 * pricing, message a segment).
 */
export type RecommendationTone = "violet" | "warning" | "success";

export interface Recommendation {
  id: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  tone: RecommendationTone;
}

export interface AnalysesData {
  /** Full curve from sale start to event day. */
  sellThrough: SellThroughPoint[];
  forecast: EventForecast;
  /** Channel breakdown of attributed tickets / revenue. */
  channels: ChannelSlice[];
  /** Per-phase / per-tier sell-through. */
  phases: PhaseStat[];
  /** Visit → cart → payment → completed counts. Empty steps array
   *  signals "no funnel data yet" (event in modération). */
  funnel: FunnelData | null;
  /** Aggregated reviews from this event's series. Null when no reviews
   *  exist yet (first-time event in modération). */
  reviewSummary: ReviewSummary | null;
  /** Optional next-step recommendations, rendered in the side rail. */
  recommendations: Recommendation[];
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
  /** Numeric net revenue (post-fees, post-refunds), MAD. Used by the
   *  /bilans aggregate hero. */
  netRevenueMad: number;
  /** Pre-formatted financial line (post-fees, post-refunds). */
  netRevenueLabel: string;
  channels: ChannelSlice[];
  reviewSummary: ReviewSummary;
  reviews: ReviewItem[];
  /** Empty array for first-time editions. */
  previousEditions: PreviousEdition[];
  /** Italic AI takeaway in the financial hero — single paragraph. */
  aiTakeaway: string;
  /** Three operational metrics with vs historical + platform deltas. */
  operationalStats: OperationalStat[];
  /** Three AI prose insights surfaced in "Ce qui a marché". */
  whatWorked: string[];
  /** 2-3 honest observations surfaced in "Ce qui a moins marché". */
  whatDidntWork: string[];
  /** Five actionable bullets surfaced in "Recommandations". */
  recommendations: string[];
}

/**
 * One row in the operational performance section of the Bilan. Each
 * stat carries both a historical comparison (vs same series last year)
 * and a platform benchmark (vs LYFE-wide median). Pre-formatted strings
 * keep render-side logic dumb.
 */
export interface OperationalStat {
  label: string;
  /** Pre-formatted headline number, e.g. "96,4 %". */
  value: string;
  /** e.g. "−1,7 pt vs édition 2024" */
  vsHistoricalLabel: string;
  /** Whether the historical delta reads as favorable. */
  vsHistoricalFavorable: boolean;
  /** e.g. "+8 pts vs médiane plateforme" */
  vsPlatformLabel: string;
  /** Whether the platform delta reads as favorable. */
  vsPlatformFavorable: boolean;
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
 * Hero numbers shown at the top of /audiences in Fraunces display
 * size. All pre-formatted to keep render-side logic dumb.
 */
export interface AudiencesHeroStats {
  totalBuyersLabel: string;
  totalBuyers: number;
  activeSegments: number;
  /** LTV of the active customer base, pre-formatted (e.g. "1 245 MAD"). */
  ltvLabel: string;
  ltvMad: number;
}

/**
 * One city dot on the Morocco choropleth. Coordinates are normalized
 * 0-100 against a 100×140 viewbox so the SVG can scale freely.
 */
export interface GeoPoint {
  city: string;
  /** Share of total buyers from this city, %. */
  share: number;
  ticketCount: number;
  /** SVG x in the 0-100 viewbox space. */
  x: number;
  /** SVG y in the 0-140 viewbox space. */
  y: number;
}

export interface CohortPoint {
  /** 0 = first event after acquisition. */
  index: number;
  label: string;
  retentionPct: number;
}

export interface Cohort {
  id: string;
  /** e.g. "Acquis · Édition 2023". */
  label: string;
  startedAtIso: string;
  initialBuyers: number;
  points: CohortPoint[];
}

export interface TopClient {
  /** Anonymized initials shown in the table, e.g. "Y. B." */
  initials: string;
  /** Full name — present in the data layer but the table renders
   *  initials in CNDP-compliant mode. */
  fullName: string;
  city: string;
  segment: string;
  eventsAttended: number;
  totalSpentMad: number;
  ltvLabel: string;
  lifetimeTier: "casual" | "regular" | "vip";
}

export interface BenchmarkRow {
  metric: string;
  yourValue: string;
  platformMedian: string;
  deltaLabel: string;
  favorable: boolean;
}

/**
 * Per-segment detail used by the side panel that opens when a segment
 * card is clicked. Pairs with AudienceSegment by id.
 */
export interface AudienceSegmentDetail {
  segmentId: string;
  averageSpendLabel: string;
  conversionLiftLabel: string;
  topCity: string;
  topInterest: string;
  insights: string[];
}

/**
 * Audiences route data. Discriminated by `state`:
 *  - "ready"  → segments + sample buyers + geo + cohorts + top clients
 *               + benchmarks (mature account)
 *  - "locked" → empty-state copy + progress to unlock (new account)
 */
export type AudiencesData =
  | {
      state: "ready";
      heroStats: AudiencesHeroStats;
      /** 6 segments in the click-to-side-panel grid. */
      segments: AudienceSegment[];
      /** Per-segment narrative detail keyed by segment id. */
      segmentDetails: Record<string, AudienceSegmentDetail>;
      /** Buyers surfaced in the audiences route's "à découvrir" rail. */
      sampleBuyers: BuyerProfile[];
      /** Morocco choropleth points. */
      geo: GeoPoint[];
      /** Last 3-4 acquisition cohorts. */
      cohorts: Cohort[];
      /** Top 10 clients by lifetime spend. */
      topClients: TopClient[];
      /** Performance vs platform median, 4-6 rows. */
      benchmarks: BenchmarkRow[];
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
