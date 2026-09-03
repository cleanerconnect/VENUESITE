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
  AudienceSegment,
  BoostFormat,
  Campaign,
  CampaignHistoryRow,
  PortfolioStats,
} from "@/lib/types/visibility";
import type {
  PromoCode,
  PromoCodeDetail,
  PromoCodesAggregate,
} from "@/lib/types/promoCodes";
import type { InvitationsData } from "@/lib/types/comps";
import type {
  AuditEntry,
  Invoice,
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
  /**
   * Redeems a ticket code at the door.
   *
   * The code is opaque to the portal — it is minted app-side and
   * resolved here. Redemption is recorded by the resolver, not by the
   * client, because a check-in that lived only in one browser would let
   * the same ticket through twice.
   */
  scanTicket(eventId: string, code: string): Promise<TicketScanResult>;

  // ── Per-event detail ──
  getAnalyses(eventId: string): Promise<AnalysesData | null>;
  /** Ids of events with a full analyses pack. Drives the detail tabs. */
  listAnalysesEventIds(): Promise<string[]>;
  getBilan(eventId: string): Promise<BilanData | null>;
  /** Ids of the events that have a post-event report. Drives filters. */
  listBilanEventIds(): Promise<string[]>;
  /** The most recent reports, newest first — the strip on /events. */
  getRecentBilans(limit: number): Promise<{ event: LyfeEvent; bilan: BilanData }[]>;
  getRegie(eventId: string): Promise<RegieData | null>;
  getInvitations(eventId: string): Promise<InvitationsData | null>;

  // ── Organisation ──
  getOverview(): Promise<OverviewData>;

  // ── Audiences ──
  getAudiences(profileId: string): Promise<AudiencesData>;
  getBuyer(buyerId: string): Promise<BuyerProfile | null>;
  listSampleBuyers(): Promise<BuyerProfile[]>;

  // ── Visibility ──
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  listAudienceSegments(): Promise<AudienceSegment[]>;
  getPortfolioStats(): Promise<PortfolioStats>;
  getCampaignHistory(): Promise<CampaignHistoryRow[]>;
  listBoostFormats(): Promise<BoostFormat[]>;
  /**
   * Active paid campaigns per event id. One read for a whole list, so a
   * row does not have to fetch its own badge — rows take facts as props.
   */
  countActiveBoostsByEvent(): Promise<Record<string, number>>;

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
  getInsightsForSurface(surface: InsightSurface, eventId?: string): Promise<Insight[]>;
}

export interface TicketScanResult {
  ok: boolean;
  attendee?: Attendee;
  /** Populated when ok is false. */
  error?: "unknown_code" | "already_used" | "refunded";
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
