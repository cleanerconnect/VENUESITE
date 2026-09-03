// The event workspace's data seam.
//
// Counterpart to `RestaurantRepository`. Everything the event side reads
// goes through this interface, so both halves of the portal get their
// data the same way — which is the property that was missing when the
// event components imported the static dataset directly.
//
// Reads are async even where the static driver answers instantly. That
// is deliberate: the call sites have to be shaped for a real backend
// now, or migrating them later means touching every screen again.
//
// Unlike the venue side, these are not venue-scoped: an organiser's
// scope is their organisation, resolved server-side the same way. Where
// a method takes an id it is an entity id within that scope, never an
// authorisation claim.

import type {
  Attendee,
  LyfeEvent,
  RefundRequest,
  RevenuePoint,
  ScanLog,
} from "@/lib/types/domain";
import type {
  AnalysesData,
  AudiencesData,
  BilanData,
  BuyerProfile,
  Insight,
  InsightSurface,
} from "@/lib/types/analytics";
import type { RegieData } from "@/lib/types/regie";
import type {
  Campaign,
  AudienceSegment,
  PortfolioStats,
} from "@/lib/types/visibility";
// These two still live beside the dataset that produces them. Moving
// them into `lib/types` is a tidy-up the external team can make; leaving
// them here keeps this commit to one concern.
import type {
  CampaignHistoryRow,
  BoostFormat,
} from "@/lib/data/static/visibility";
import type {
  PromoCode,
  PromoCodeDetail,
  PromoCodesAggregate,
} from "@/lib/types/promoCodes";
import type { InvitationsData } from "@/lib/types/comps";
import type {
  AuditEntry,
  Invoice,
  OrganizerProfile,
  OverviewData,
  Payout,
  TeamMember,
} from "@/lib/types/domain";

export interface EventRepository {
  // ── Events ──
  listEvents(): Promise<LyfeEvent[]>;
  getEvent(id: string): Promise<LyfeEvent | null>;
  getRevenueSeries(): Promise<RevenuePoint[]>;
  listAttendees(eventId: string): Promise<Attendee[]>;
  listRefundRequests(eventId: string): Promise<RefundRequest[]>;
  getScanLog(eventId: string): Promise<ScanLog[]>;

  // ── Per-event detail ──
  getAnalyses(eventId: string): Promise<AnalysesData | null>;
  getBilan(eventId: string): Promise<BilanData | null>;
  /** Ids of the events that have a post-event report. Drives filters. */
  listBilanEventIds(): Promise<string[]>;
  /** The most recent reports, newest first — the strip on /events. */
  getRecentBilans(limit: number): Promise<{ event: LyfeEvent; bilan: BilanData }[]>;
  getRegie(eventId: string): Promise<RegieData | null>;
  getInvitations(eventId: string): Promise<InvitationsData | null>;

  // ── Organisation ──
  getOverview(): Promise<OverviewData>;
  getProfile(profileId: string): Promise<OrganizerProfile | null>;
  listProfiles(): Promise<OrganizerProfile[]>;

  // ── Audiences ──
  getAudiences(profileId: string): Promise<AudiencesData>;
  getBuyer(buyerId: string): Promise<BuyerProfile | null>;

  // ── Visibility ──
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  listAudienceSegments(): Promise<AudienceSegment[]>;
  getPortfolioStats(): Promise<PortfolioStats>;
  getCampaignHistory(): Promise<CampaignHistoryRow[]>;
  listBoostFormats(): Promise<BoostFormat[]>;

  // ── Promo codes ──
  listPromoCodes(): Promise<PromoCode[]>;
  getPromoCodeDetail(id: string): Promise<PromoCodeDetail | null>;
  getPromoCodesAggregate(): Promise<PromoCodesAggregate>;

  // ── Finance ──
  listPayouts(): Promise<Payout[]>;
  listInvoices(): Promise<Invoice[]>;

  // ── Team ──
  listTeam(): Promise<TeamMember[]>;
  getAuditLog(): Promise<AuditEntry[]>;

  // ── Insights ──
  getInsightOfTheDay(): Promise<Insight>;
  getInsightsForSurface(surface: InsightSurface): Promise<Insight[]>;
}

/** Thrown for anything the caller could act on. Mirrors RepositoryError. */
export class EventRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "EventRepositoryError";
  }
}
