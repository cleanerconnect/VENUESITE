// The event workspace's static driver.
//
// Wraps the dataset in `lib/data/static/*`. This is the only module in
// the app allowed to import those files — everything else goes through
// `EventRepository`, which is the point of the seam.
//
// No `server-only` marker, unlike the venue drivers: the event screens
// are client components, so this runs in the browser. That is safe
// because the dataset it reads is public demo content with no secrets
// and no credentials. An HTTP driver replacing it keeps the token
// server-side and this class disappears.

import type { EventRepository } from "./event-repository";
import { EventRepositoryError } from "./event-repository";

import {
  getAllEvents,
  getAttendees,
  getEventById,
  getRefundRequests,
  getRevenueSeries,
  getScanLog,
} from "./static/events";
import { getAnalysesByEventId } from "./static/analyses";
import { getBilanByEventId, hasBilan } from "./static/bilan";
import { getRegieByEventId } from "./static/regie";
import { getInvitationsByEventId } from "./static/comps";
import { getOrganizerOverview } from "./static/organizer";
import { PROFILES, getProfile } from "./static/profiles";
import { getAudiencesByProfileId, getBuyerById } from "./static/audiences";
import {
  getAudienceSegments,
  getBoostFormats,
  getCampaignById,
  getCampaignHistory,
  getCampaigns,
  getPortfolioStats,
} from "./static/visibility";
import {
  getPromoCodeDetail,
  getPromoCodes,
  getPromoCodesAggregate,
} from "./static/promoCodes";
import { getInvoices, getPayouts } from "./static/finance";
import { getAuditLog, getTeam } from "./static/team";
import { getInsightOfTheDay, getInsightsForSurface } from "./static/insights";
import type { InsightSurface } from "@/lib/types/analytics";

export class StaticEventRepository implements EventRepository {
  // ── Events ──
  async listEvents() {
    return getAllEvents();
  }
  async getEvent(id: string) {
    return getEventById(id) ?? null;
  }
  async getRevenueSeries() {
    return getRevenueSeries();
  }
  async listAttendees(_eventId: string) {
    return getAttendees();
  }
  async listRefundRequests(_eventId: string) {
    return getRefundRequests();
  }
  async getScanLog(_eventId: string) {
    return getScanLog();
  }

  // ── Per-event detail ──
  async getAnalyses(eventId: string) {
    return getAnalysesByEventId(eventId) ?? null;
  }
  async getBilan(eventId: string) {
    // The static bilan generator derives from the event list, which the
    // repository already owns — so callers no longer have to fetch the
    // list first just to ask for one report.
    return getBilanByEventId(eventId, getAllEvents()) ?? null;
  }
  async listBilanEventIds() {
    return getAllEvents().filter(hasBilan).map((e) => e.id);
  }

  async getRecentBilans(limit: number) {
    const all = getAllEvents();
    return all
      .filter(hasBilan)
      .sort((a, b) => (a.endsAt < b.endsAt ? 1 : -1))
      .slice(0, limit)
      .map((event) => ({ event, bilan: getBilanByEventId(event.id, all) }))
      .filter(
        (r): r is { event: (typeof all)[number]; bilan: NonNullable<typeof r.bilan> } =>
          Boolean(r.bilan),
      );
  }

  async getRegie(eventId: string) {
    return getRegieByEventId(eventId) ?? null;
  }
  async getInvitations(eventId: string) {
    return getInvitationsByEventId(eventId) ?? null;
  }

  // ── Organisation ──
  async getOverview() {
    return getOrganizerOverview();
  }
  async getProfile(profileId: string) {
    return getProfile(profileId) ?? null;
  }
  async listProfiles() {
    return Object.values(PROFILES);
  }

  // ── Audiences ──
  async getAudiences(profileId: string) {
    return getAudiencesByProfileId(profileId);
  }
  async getBuyer(buyerId: string) {
    return getBuyerById(buyerId) ?? null;
  }

  // ── Visibility ──
  async listCampaigns() {
    return getCampaigns();
  }
  async getCampaign(id: string) {
    return getCampaignById(id) ?? null;
  }
  async listAudienceSegments() {
    return getAudienceSegments();
  }
  async getPortfolioStats() {
    return getPortfolioStats();
  }
  async getCampaignHistory() {
    return getCampaignHistory();
  }
  async listBoostFormats() {
    return getBoostFormats();
  }

  // ── Promo codes ──
  async listPromoCodes() {
    return getPromoCodes();
  }
  async getPromoCodeDetail(id: string) {
    return getPromoCodeDetail(id) ?? null;
  }
  async getPromoCodesAggregate() {
    return getPromoCodesAggregate();
  }

  // ── Finance ──
  async listPayouts() {
    return getPayouts();
  }
  async listInvoices() {
    return getInvoices();
  }

  // ── Team ──
  async listTeam() {
    return getTeam();
  }
  async getAuditLog() {
    return getAuditLog();
  }

  // ── Insights ──
  async getInsightOfTheDay() {
    return getInsightOfTheDay();
  }
  async getInsightsForSurface(surface: InsightSurface) {
    return getInsightsForSurface(surface);
  }
}

/**
 * A driver that fails every read, for exercising the error state.
 * Selected by the demo state switch — see `lib/data/demo-state.ts`.
 * Without it, "what does a failed load look like?" is unanswerable
 * without breaking something on purpose.
 */
export class FailingEventRepository implements EventRepository {
  private fail(): never {
    throw new EventRepositoryError(
      "Le service est momentanément indisponible.",
      503,
      "upstream_unavailable",
    );
  }
  listEvents = this.fail;
  getEvent = this.fail;
  getRevenueSeries = this.fail;
  listAttendees = this.fail;
  listRefundRequests = this.fail;
  getScanLog = this.fail;
  getAnalyses = this.fail;
  getBilan = this.fail;
  listBilanEventIds = this.fail;
  getRecentBilans = this.fail;
  getRegie = this.fail;
  getInvitations = this.fail;
  getOverview = this.fail;
  getProfile = this.fail;
  listProfiles = this.fail;
  getAudiences = this.fail;
  getBuyer = this.fail;
  listCampaigns = this.fail;
  getCampaign = this.fail;
  listAudienceSegments = this.fail;
  getPortfolioStats = this.fail;
  getCampaignHistory = this.fail;
  listBoostFormats = this.fail;
  listPromoCodes = this.fail;
  getPromoCodeDetail = this.fail;
  getPromoCodesAggregate = this.fail;
  listPayouts = this.fail;
  listInvoices = this.fail;
  listTeam = this.fail;
  getAuditLog = this.fail;
  getInsightOfTheDay = this.fail;
  getInsightsForSurface = this.fail;
}

/** A driver that returns nothing, for exercising the empty state. */
export class EmptyEventRepository extends StaticEventRepository {
  async listEvents() {
    return [];
  }
  async listAttendees() {
    return [];
  }
  async listRefundRequests() {
    return [];
  }
  async listCampaigns() {
    return [];
  }
  async listPromoCodes() {
    return [];
  }
  async listPayouts() {
    return [];
  }
  async listInvoices() {
    return [];
  }
  async listTeam() {
    return [];
  }
  async getAuditLog() {
    return [];
  }
  async listBilanEventIds() {
    return [];
  }
  async getRecentBilans() {
    return [];
  }
  async getScanLog() {
    return [];
  }
  async getInsightsForSurface() {
    return [];
  }
}
