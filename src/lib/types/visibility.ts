// Visibility / paid promotion layer. LYFE's third revenue stream — mirrored
// after a future REST shape so swapping mock for fetch() is mechanical.

export type BoostType =
  | "splash_welcome" // full-screen takeover
  | "feed_top" // top of events feed
  | "sponsored_card" // sponsored card in discovery flow (CPM)
  | "targeted_notification" // push notification (per delivered)
  | "geo_popup"; // geo-fenced in-app card (per impression)

export type CampaignStatus =
  | "active"
  | "scheduled"
  | "completed"
  | "paused";

export interface AudienceProfile {
  topCities: { city: string; pct: number }[];
  ageDistribution: { range: string; pct: number }[];
  interests: { name: string; pct: number }[];
}

export interface AttributedTicket {
  id: string;
  name: string;
  tierName: string;
  amountMad: number;
  at: string;
}

export interface Optimization {
  id: string;
  text: string;
  /** Action label rendered on the inline "Appliquer" button. */
  actionLabel?: string;
}

export interface ABVariant {
  id: string;
  label: string;
  impressions: number;
  conversions: number;
  /** True only after statistical significance reached (95 % CI). */
  winner: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  eventId: string;
  eventName: string;
  boostType: BoostType;
  status: CampaignStatus;
  budgetMad: number;
  spentMad: number;
  impressions: number;
  uniqueReach: number;
  /** Avg times a single user saw the boost. */
  frequency: number;
  ticketsAttributed: number;
  revenueAttributedMad: number;
  /** Cost per acquisition (MAD per ticket). */
  cpaMad: number;
  /** Return on ad spend (revenue / spend). */
  roas: number;
  startedAt: string;
  endsAt: string;
  /** 0 if completed. */
  daysRemaining: number;
  /** Sparkline series — last 24 buckets of conversions. */
  conversionsByHour: number[];
  audienceProfile: AudienceProfile;
  recentTickets: AttributedTicket[];
  optimizations: Optimization[];
  abVariants?: ABVariant[];
}

export interface AudienceSegment {
  id: string;
  name: string;
  /** Plain-language summary of the filter set. */
  description: string;
  memberCount: number;
}

export interface PortfolioStats {
  /** Spend so far this calendar month, MAD. */
  monthlySpendMad: number;
  /** Revenue attributed to boosts so far this month, MAD. */
  monthlyRevenueAttributedMad: number;
  /** Headline metric — revenue ÷ spend, portfolio-wide. */
  portfolioRoas: number;
}
