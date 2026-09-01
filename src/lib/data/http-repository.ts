import "server-only";

// HTTP adapter — the one the dev team points at the real backend.
//
// This is written against the contract in docs/INTEGRATION.md, not
// against a guess: every method maps to exactly one documented endpoint,
// and the response shape is `RestaurantOverview` verbatim. If the backend
// returns something else, the fix belongs in `mapOverview` below and
// nowhere else in the app.
//
// server-only: this holds the API token. Importing it from a client
// component is a build error rather than a leaked credential.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import {
  RepositoryError,
  type ReservationRefInput,
  type RestaurantRepository,
  type ReviewReplyInput,
  type SeatReservationInput,
  type TableRefInput,
} from "./repository";

export interface HttpRepositoryConfig {
  baseUrl: string;
  token: string;
  /** Per-request timeout. The dashboard is read on a phone mid-service. */
  timeoutMs?: number;
}

export class HttpRestaurantRepository implements RestaurantRepository {
  constructor(private readonly config: HttpRepositoryConfig) {}

  getOverview(restaurantId: string) {
    return this.request<RestaurantOverview>(
      "GET",
      `/restaurants/${restaurantId}/overview`,
    );
  }

  seatReservation({ restaurantId, reservationId, tableId }: SeatReservationInput) {
    return this.request<RestaurantOverview>(
      "POST",
      `/restaurants/${restaurantId}/reservations/${reservationId}/seat`,
      { tableId },
    );
  }

  confirmReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.request<RestaurantOverview>(
      "POST",
      `/restaurants/${restaurantId}/reservations/${reservationId}/confirm`,
    );
  }

  cancelReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.request<RestaurantOverview>(
      "POST",
      `/restaurants/${restaurantId}/reservations/${reservationId}/cancel`,
    );
  }

  clearTable({ restaurantId, tableId }: TableRefInput) {
    return this.request<RestaurantOverview>(
      "POST",
      `/restaurants/${restaurantId}/tables/${tableId}/clear`,
    );
  }

  async sendReminder({ restaurantId, reservationId }: ReservationRefInput) {
    await this.request<void>(
      "POST",
      `/restaurants/${restaurantId}/reservations/${reservationId}/remind`,
    );
  }

  async replyToReview({ restaurantId, reviewId, message }: ReviewReplyInput) {
    await this.request<void>(
      "POST",
      `/restaurants/${restaurantId}/reviews/${reviewId}/reply`,
      { message },
    );
  }

  private async request<T>(
    method: "GET" | "POST",
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
