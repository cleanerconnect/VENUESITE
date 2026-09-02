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
