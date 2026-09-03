import "server-only";

// HTTP adapter — the Business Service.
//
// Paths follow the `/api/business/*` contract from the scope brief, with
// `LYFE_API_BASE_URL` pointing at the service root. Every method maps to
// exactly one documented endpoint; if the service returns a different
// shape, map it in this file and nowhere else.
//
// server-only: this holds the API token. Importing it from a client
// component is a build error rather than a leaked credential.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type {
  BusinessAccount,
  CheckInResult,
  Customer,
  NotificationPreferences,
  PortalNotification,
  VenueAnalytics,
  VenueAvailability,
  VisibilityMetrics,
} from "@/lib/types/business";
import {
  RepositoryError,
  type AnalyticsInput,
  type CheckInInput,
  type NoShowInput,
  type RejectBookingInput,
  type ReservationRefInput,
  type RestaurantRepository,
  type ReviewReplyInput,
} from "./repository";
import type { MenuItem, RestaurantProfile } from "@/lib/types/restaurant";
import type { AssetKind, VenueAsset } from "@/lib/assets/types";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import type {
  ConfigurationAction,
  GrowthAction,
  GuestGraphAction,
  MarketingAction,
  MoneyAction,
  NightlifeAction,
  ServiceConfiguration,
  ServiceFloorAction,
} from "./repository";
import type {
  Growth,
  GuestGraph,
  Marketing,
  MoneyDesk,
  Nightlife,
  ServiceFloor,
  Subscription,
  SupportTicket,
  SurveyConfig,
  VenueSettings,
} from "@/lib/types/venue-operations";

export interface HttpRepositoryConfig {
  baseUrl: string;
  token: string;
  /** Per-request timeout. The dashboard is read on a phone mid-service. */
  timeoutMs?: number;
}

export class HttpRestaurantRepository implements RestaurantRepository {
  constructor(private readonly config: HttpRepositoryConfig) {}

  // ── Account ──
  getBusinessAccount() {
    return this.request<BusinessAccount>("GET", "/api/business/account");
  }

  // ── Reads ──
  getOverview(venueId: string) {
    return this.request<RestaurantOverview>(
      "GET",
      `/api/business/overview?venue_id=${encodeURIComponent(venueId)}`,
    );
  }

  // ── Booking lifecycle ──
  confirmReservation({ reservationId }: ReservationRefInput) {
    return this.request<RestaurantOverview>(
      "PUT",
      `/api/business/bookings/${reservationId}/confirm`,
    );
  }

  rejectReservation({ reservationId, reason, note }: RejectBookingInput) {
    return this.request<RestaurantOverview>(
      "PUT",
      `/api/business/bookings/${reservationId}/reject`,
      { reason, note },
    );
  }

  cancelReservation({ reservationId }: ReservationRefInput) {
    return this.request<RestaurantOverview>(
      "PUT",
      `/api/business/bookings/${reservationId}/cancel`,
    );
  }

  checkIn({ reservationId, qrCode }: CheckInInput) {
    // The booking id is optional: a scanned code identifies the booking on
    // its own, which is the whole point of scanning it.
    const path = reservationId
      ? `/api/business/bookings/${reservationId}/check-in`
      : "/api/business/bookings/check-in";
    return this.request<CheckInResult>("POST", path, { qr_code: qrCode });
  }

  reportNoShow({ reservationId }: NoShowInput) {
    return this.request<RestaurantOverview>(
      "POST",
      `/api/business/bookings/${reservationId}/no-show`,
    );
  }

  async sendReminder({ reservationId }: ReservationRefInput) {
    await this.request<void>(
      "POST",
      `/api/business/bookings/${reservationId}/remind`,
    );
  }

  // ── Venue profile and settings ──
  getVenueProfile(venueId: string) {
    return this.request<RestaurantProfile | null>(
      "GET",
      `/api/business/venues/${venueId}`,
    );
  }

  listMenuItems(venueId: string) {
    return this.request<MenuItem[]>(
      "GET",
      `/api/business/venues/${venueId}/menu`,
    );
  }

  listStaff(venueId: string) {
    return this.request<StaffMemberRow[]>(
      "GET",
      `/api/business/venues/${venueId}/staff`,
    );
  }

  listAssets(venueId: string, kind: AssetKind) {
    return this.request<VenueAsset[]>(
      "GET",
      `/api/business/venues/${venueId}/assets?kind=${encodeURIComponent(kind)}`,
    );
  }

  // ── Availability ──
  getAvailability(venueId: string) {
    return this.request<VenueAvailability>(
      "GET",
      `/api/business/venues/${venueId}/availability`,
    );
  }

  updateAvailability(
    venueId: string,
    availability: Omit<VenueAvailability, "updatedAt">,
  ) {
    return this.request<VenueAvailability>(
      "PUT",
      `/api/business/venues/${venueId}/availability`,
      availability,
    );
  }

  // ── Analytics & visibility ──
  getAnalytics({ restaurantId, period }: AnalyticsInput) {
    return this.request<VenueAnalytics>(
      "GET",
      `/api/business/analytics?venue_id=${encodeURIComponent(restaurantId)}&period=${period}`,
    );
  }

  getVisibilityMetrics({ restaurantId, period }: AnalyticsInput) {
    return this.request<VisibilityMetrics>(
      "GET",
      `/api/business/visibility?venue_id=${encodeURIComponent(restaurantId)}&period=${period}`,
    );
  }

  // ── CRM ──
  listCustomers(venueId: string) {
    return this.request<Customer[]>(
      "GET",
      `/api/business/customers?venue_id=${encodeURIComponent(venueId)}`,
    );
  }

  async getCustomer(venueId: string, customerId: string) {
    return this.request<Customer | null>(
      "GET",
      `/api/business/customers/${customerId}?venue_id=${encodeURIComponent(venueId)}`,
    );
  }

  async replyToReview({ reviewId, message }: ReviewReplyInput) {
    await this.request<void>("POST", `/api/business/reviews/${reviewId}/reply`, {
      message,
    });
  }

  // ── Notifications ──
  getNotifications(venueId: string) {
    return this.request<PortalNotification[]>(
      "GET",
      `/api/business/notifications?venue_id=${encodeURIComponent(venueId)}`,
    );
  }

  async markNotificationRead(_venueId: string, id: string) {
    await this.request<void>("PUT", `/api/business/notifications/${id}/read`);
  }

  getNotificationPreferences(venueId: string) {
    return this.request<NotificationPreferences>(
      "GET",
      `/api/business/venues/${venueId}/notification-preferences`,
    );
  }

  updateNotificationPreferences(prefs: NotificationPreferences) {
    return this.request<NotificationPreferences>(
      "PUT",
      `/api/business/venues/${prefs.venueId}/notification-preferences`,
      prefs,
    );
  }

  // ── Phase 5 — the rest of the venue perimeter ──
  //
  // One GET per bundle and one POST per surface, because an action is
  // already JSON: forty verbs travel through seven endpoints instead of
  // forty routes to write, secure and version. The action's `kind` is
  // what the service switches on, exactly as the local drivers do.

  getServiceFloor(venueId: string) {
    return this.request<ServiceFloor>("GET", this.scoped("/service-floor", venueId));
  }
  getGuestGraph(venueId: string) {
    return this.request<GuestGraph>("GET", this.scoped("/guests/graph", venueId));
  }
  getGrowth(venueId: string) {
    return this.request<Growth>("GET", this.scoped("/growth", venueId));
  }
  getNightlife(venueId: string) {
    return this.request<Nightlife>("GET", this.scoped("/nightlife", venueId));
  }
  getMoneyDesk(venueId: string) {
    return this.request<MoneyDesk>("GET", this.scoped("/payments", venueId));
  }
  getMarketing(venueId: string) {
    return this.request<Marketing>("GET", this.scoped("/marketing", venueId));
  }
  getServiceConfiguration(venueId: string) {
    return this.request<ServiceConfiguration>(
      "GET",
      this.scoped("/services/configuration", venueId),
    );
  }
  getSurveyConfig(venueId: string) {
    return this.request<SurveyConfig>("GET", this.scoped("/reviews/survey", venueId));
  }
  getVenueSettings(venueId: string) {
    return this.request<VenueSettings>("GET", this.scoped("/settings", venueId));
  }
  getSubscription(venueId: string) {
    return this.request<Subscription>("GET", this.scoped("/subscription", venueId));
  }
  listSupportTickets(venueId: string) {
    return this.request<SupportTicket[]>("GET", this.scoped("/support/tickets", venueId));
  }
  getSpendByCustomer(venueId: string) {
    return this.request<Record<string, number>>(
      "GET",
      this.scoped("/payments/spend-by-customer", venueId),
    );
  }

  runServiceFloorAction(venueId: string, action: ServiceFloorAction) {
    return this.request<ServiceFloor>("POST", this.scoped("/service-floor", venueId), action);
  }
  runGuestGraphAction(venueId: string, action: GuestGraphAction) {
    return this.request<GuestGraph>("POST", this.scoped("/guests/graph", venueId), action);
  }
  runGrowthAction(venueId: string, action: GrowthAction) {
    return this.request<Growth>("POST", this.scoped("/growth", venueId), action);
  }
  runNightlifeAction(venueId: string, action: NightlifeAction) {
    return this.request<Nightlife>("POST", this.scoped("/nightlife", venueId), action);
  }
  runMoneyAction(venueId: string, action: MoneyAction) {
    return this.request<MoneyDesk>("POST", this.scoped("/payments", venueId), action);
  }
  runMarketingAction(venueId: string, action: MarketingAction) {
    return this.request<Marketing>("POST", this.scoped("/marketing", venueId), action);
  }
  runConfigurationAction(venueId: string, action: ConfigurationAction) {
    return this.request<ServiceConfiguration>(
      "POST",
      this.scoped("/services/configuration", venueId),
      action,
    );
  }
  saveSurveyConfig(venueId: string, config: SurveyConfig) {
    return this.request<SurveyConfig>(
      "PUT",
      this.scoped("/reviews/survey", venueId),
      config,
    );
  }
  saveVenueSettings(venueId: string, settings: VenueSettings) {
    return this.request<VenueSettings>("PUT", this.scoped("/settings", venueId), settings);
  }
  openSupportTicket(
    venueId: string,
    input: { category: string; subject: string; body: string },
  ) {
    return this.request<SupportTicket[]>(
      "POST",
      this.scoped("/support/tickets", venueId),
      input,
    );
  }

  async setZoneAvailable(venueId: string, zoneId: string, available: boolean) {
    await this.request<void>("PUT", this.scoped(`/zones/${zoneId}`, venueId), {
      available,
    });
  }

  /**
   * The venue is a query parameter, not a path segment, and it is only
   * ever a hint: the service resolves scope from the token. A caller
   * that sent someone else's id would be refused, not served.
   */
  private scoped(path: string, venueId: string) {
    return `/api/business${path}?venue_id=${encodeURIComponent(venueId)}`;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 8_000,
    );

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        // The dashboard is a live view of a service in progress. Any
        // caching here would show a manager a floor plan from five
        // minutes ago, which is worse than a slow one.
        cache: "no-store",
      });

      if (!response.ok) {
        const detail = await safeJson(response);
        throw new RepositoryError(
          detail?.message ?? `${method} ${path} failed`,
          response.status,
          detail?.code,
        );
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new RepositoryError(`${method} ${path} timed out`, 504);
      }
      throw new RepositoryError(
        error instanceof Error ? error.message : "Network error",
        0,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeJson(
  response: Response,
): Promise<{ message?: string; code?: string } | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
