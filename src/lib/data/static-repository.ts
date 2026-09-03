import "server-only";

// The no-infrastructure driver.
//
// Implements the same `RestaurantRepository` as the SQLite and HTTP
// adapters, against the snapshot in `static/venue-snapshot.json`. This is
// what makes `npm run dev` work on a laptop with no database, no bucket
// and no backend — which is the state an external team clones into.
//
// Writes are held in a per-process overlay rather than dropped. A demo
// where confirming a booking silently does nothing is worse than no demo
// at all: the reviewer concludes the button is broken. They do not
// survive a restart, and that is the honest trade — persistence is what
// the SQLite driver is for.

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
import {
  staticBusinessAccount,
  staticVenue,
} from "./static/venue-data";
import type { RestaurantOverview, Reservation } from "@/lib/types/restaurant";
import type { AssetKind } from "@/lib/assets/types";
import type {
  CheckInResult,
  NotificationPreferences,
  VenueAvailability,
} from "@/lib/types/business";

/** Per-process edits layered over the snapshot, keyed by venue. */
const overlay = new Map<string, RestaurantOverview>();
const availabilityOverlay = new Map<string, VenueAvailability>();
const prefsOverlay = new Map<string, NotificationPreferences>();
const readNotifications = new Set<string>();

export class StaticRestaurantRepository implements RestaurantRepository {
  async getOverview(venueId: string): Promise<RestaurantOverview> {
    const held = overlay.get(venueId);
    if (held) return clone(held);

    const bundle = staticVenue(venueId);
    if (!bundle) {
      // Unknown venue is a caller error, not an empty screen. Saying so
      // beats rendering a plausible-looking dashboard for a venue that
      // does not exist.
      throw new RepositoryError(
        `Aucun lieu ${venueId} dans le jeu de données statique.`,
        404,
        "venue_not_found",
      );
    }
    return clone(bundle.overview);
  }

  // ── Booking lifecycle ──

  async confirmReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.transition(restaurantId, reservationId, "confirmed");
  }

  async cancelReservation({ restaurantId, reservationId }: ReservationRefInput) {
    return this.transition(restaurantId, reservationId, "cancelled");
  }

  async rejectReservation({ restaurantId, reservationId }: RejectBookingInput) {
    // Refusal is not cancellation — the coded reason is what makes them
    // separable downstream — but both leave the book the same way, and
    // the static driver has no analytics sink to tell them apart in.
    return this.transition(restaurantId, reservationId, "cancelled");
  }

  async reportNoShow({ restaurantId, reservationId }: NoShowInput) {
    return this.transition(restaurantId, reservationId, "no_show");
  }

  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    const data = await this.getOverview(input.restaurantId);
    const code = input.qrCode.trim().toUpperCase();
    const match = [...data.upcomingReservations, ...data.waitlist].find(
      (r) => `LYFE-${r.id}`.toUpperCase() === code || r.id.toUpperCase() === code,
    );

    if (!match) return { ok: false, method: "manual", error: "unknown_code" };
    if (match.state === "arrived") {
      return { ok: false, method: "manual", error: "already_used" };
    }
    if (match.state === "cancelled" || match.state === "no_show") {
      return { ok: false, method: "manual", error: "expired" };
    }

    // Persisted into the overlay, not left to the client's optimistic
    // copy — a check-in that lived only in one browser would let the same
    // code through twice, which is the one thing a QR must not allow.
    await this.transition(input.restaurantId, match.id, "arrived");

    return {
      ok: true,
      bookingId: match.id,
      guestName: match.guestName,
      partySize: match.partySize,
      method: "manual",
    };
  }

  async sendReminder(_input: ReservationRefInput) {
    // No SMS gateway without a backend.
  }

  async replyToReview(_input: ReviewReplyInput) {
    // No review platform without a backend.
  }

  // ── Business account ──

  async getBusinessAccount() {
    const account = staticBusinessAccount(
      process.env.LYFE_DEMO_USER_ID ?? "usr_yassine",
    );
    if (!account) {
      throw new RepositoryError("Aucun compte partenaire.", 404, "no_account");
    }
    return account;
  }

  // ── Venue profile and settings ──

  async getVenueProfile(venueId: string) {
    return clone(this.bundle(venueId).profile);
  }

  async listMenuItems(venueId: string) {
    return clone(this.bundle(venueId).menuItems);
  }

  async listStaff(venueId: string) {
    return clone(this.bundle(venueId).staff);
  }

  async listAssets(venueId: string, kind: AssetKind) {
    const bundle = this.bundle(venueId);
    return clone(kind === "photo" ? bundle.photos : bundle.menuFiles);
  }

  // ── Availability ──

  async getAvailability(venueId: string) {
    const held = availabilityOverlay.get(venueId);
    if (held) return clone(held);
    return clone(this.bundle(venueId).availability);
  }

  async updateAvailability(
    venueId: string,
    availability: Omit<VenueAvailability, "updatedAt">,
  ) {
    const next: VenueAvailability = {
      ...availability,
      updatedAt: new Date().toISOString(),
    };
    availabilityOverlay.set(venueId, next);
    return clone(next);
  }

  // ── Analytics ──

  async getAnalytics({ restaurantId, period }: AnalyticsInput) {
    const bundle = this.bundle(restaurantId);
    const found = bundle.analytics[period] ?? bundle.analytics["30d"];
    if (!found) {
      throw new RepositoryError("Période inconnue.", 404, "unknown_period");
    }
    return clone(found);
  }

  async getVisibilityMetrics({ restaurantId, period }: AnalyticsInput) {
    const bundle = this.bundle(restaurantId);
    const found = bundle.visibility[period] ?? bundle.visibility["30d"];
    if (!found) {
      throw new RepositoryError("Période inconnue.", 404, "unknown_period");
    }
    return clone(found);
  }

  // ── Customers ──

  async listCustomers(venueId: string) {
    return clone(this.bundle(venueId).customers);
  }

  async getCustomer(venueId: string, customerId: string) {
    return (
      clone(this.bundle(venueId).customers.find((c) => c.id === customerId)) ??
      null
    );
  }

  // ── Notifications ──

  async getNotifications(venueId: string) {
    return this.bundle(venueId).notifications.map((n) =>
      readNotifications.has(`${venueId}:${n.id}`) ? { ...n, read: true } : clone(n),
    );
  }

  async markNotificationRead(venueId: string, id: string) {
    readNotifications.add(`${venueId}:${id}`);
  }

  async getNotificationPreferences(venueId: string) {
    return clone(
      prefsOverlay.get(venueId) ?? this.bundle(venueId).notificationPreferences,
    );
  }

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    prefsOverlay.set(prefs.venueId, prefs);
    return clone(prefs);
  }

  // ── Internals ──

  private bundle(venueId: string) {
    const found = staticVenue(venueId);
    if (!found) {
      throw new RepositoryError(
        `Aucun lieu ${venueId} dans le jeu de données statique.`,
        404,
        "venue_not_found",
      );
    }
    return found;
  }

  /**
   * Applies a state change and keeps the derived figures honest — a
   * reservation that moves to `arrived` has to raise arrived covers, or
   * the hero ring and the book disagree on the same screen.
   */
  private async transition(
    venueId: string,
    reservationId: string,
    to: Reservation["state"],
  ): Promise<RestaurantOverview> {
    const current = await this.getOverview(venueId);
    const target =
      current.upcomingReservations.find((r) => r.id === reservationId) ??
      current.waitlist.find((r) => r.id === reservationId);
    if (!target || target.state === to) return current;

    const wasBooked =
      target.state === "confirmed" || target.state === "requested";
    target.state = to;

    if (to === "arrived") {
      current.currentService.arrivedCovers += target.partySize;
      current.waitlist = current.waitlist.filter((r) => r.id !== reservationId);
    }
    if (to === "confirmed") {
      current.waitlist = current.waitlist.filter((r) => r.id !== reservationId);
      current.currentService.bookedCovers += target.partySize;
    }
    if (to === "cancelled") {
      current.upcomingReservations = current.upcomingReservations.filter(
        (r) => r.id !== reservationId,
      );
      current.waitlist = current.waitlist.filter((r) => r.id !== reservationId);
      if (wasBooked) {
        current.currentService.bookedCovers = Math.max(
          0,
          current.currentService.bookedCovers - target.partySize,
        );
      }
    }
    if (to === "no_show") {
      current.upcomingReservations = current.upcomingReservations.filter(
        (r) => r.id !== reservationId,
      );
      current.currentService.noShowCovers += target.partySize;
      current.noShows.count += 1;
      current.noShows.lostRevenueMad +=
        target.partySize * current.averageTicket.amountMad;
    }

    overlay.set(venueId, current);
    return clone(current);
  }
}

/**
 * Every read hands back a copy. The snapshot is module state shared by
 * every request in the process; handing out a reference would let one
 * request's mutation leak into the next one's render.
 */
function clone<T>(value: T): T {
  return value === undefined ? value : (structuredClone(value) as T);
}
