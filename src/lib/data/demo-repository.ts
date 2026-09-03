import "server-only";

// The demo state switch, on the venue side.
//
// `?etat=` already forced loading, empty and error on the event
// workspace, where every read goes through a client hook. The venue
// workspace renders server-side, so the same affordance has to be a
// different mechanism: a wrapper around the repository, selected per
// request and never persisted.
//
// It matters for the same reason as before. An external team has to be
// able to *see* what a failed load and an empty day look like; those
// states are unreachable in a healthy demo, so without a way to force
// them they get built once, never looked at, and rot.
//
// Two rules keep this a demo affordance rather than a feature flag:
// it is read from the URL only, and it can only ever make a read
// fail or come back empty — it can never invent data.

import type { RestaurantRepository } from "./repository";
import { RepositoryError } from "./repository";
import type { DemoState } from "./demo-state";

/**
 * Every read fails; every write is refused.
 *
 * A Proxy rather than a hand-written class: the interface has fifty-odd
 * methods and a class would have to be extended every time one is added,
 * which is exactly how a demo driver falls behind the real one.
 */
function failing(): RestaurantRepository {
  return new Proxy({} as RestaurantRepository, {
    get() {
      return async () => {
        throw new RepositoryError(
          "Le service est momentanément indisponible.",
          503,
          "upstream_unavailable",
        );
      };
    },
  });
}

/** Empty arrays, zeroed bundles — a venue that exists and has done nothing. */
function empty(base: RestaurantRepository): RestaurantRepository {
  const now = new Date().toISOString();

  const overrides: Partial<Record<keyof RestaurantRepository, unknown>> = {
    listCustomers: async () => [],
    listMenuItems: async () => [],
    listStaff: async () => [],
    listAssets: async () => [],
    getNotifications: async () => [],
    listSupportTickets: async () => [],
    getSpendByCustomer: async () => ({}),
    getServiceFloor: async () => ({
      waitlist: [],
      waitlistSettings: {
        onlineOpen: true,
        maxPartyOnline: 6,
        defaultQuoteMinutes: 20,
        pausedReason: "",
        updatedAt: now,
      },
      briefing: {
        serviceId: null,
        serviceLabel: "Prochain service",
        date: now.slice(0, 10),
        covers: 0,
        bookings: 0,
        guests: [],
        notes: [],
      },
      calendar: [],
    }),
    getGuestGraph: async () => ({
      tags: [],
      rules: [],
      segments: [],
      tagsByCustomer: {},
    }),
    getGrowth: async () => ({ offers: [], experiences: [] }),
    getNightlife: async () => ({
      guestLists: [],
      promoters: [],
      tableTypes: [],
      tableReservations: [],
    }),
    getMoneyDesk: async () => ({
      depositPolicies: [],
      deposits: [],
      cancellationPolicy: {
        freeUntilHours: 24,
        lateFeeMad: 0,
        noShowFeeMad: 0,
        guestMessage: "",
        version: 1,
        updatedAt: now,
      },
      cancellations: [],
      transactions: [],
      // A brand-new venue has no transaction source either, which is
      // the honest reading and exercises the hidden-tile rule for free.
      hasTransactionSource: false,
    }),
    getMarketing: async () => ({
      campaigns: [],
      messages: [],
      suppressions: [],
      consent: { optedIn: 0, optedOut: 0, suppressed: 0 },
    }),
    getServiceConfiguration: async () => ({
      services: [],
      pacing: {
        maxArrivalsPerQuarter: 12,
        maxCoversPerService: 0,
        maxPartyOnline: 8,
        minPartyOnline: 1,
        requestOnlyAbove: 8,
        bookingWindowDays: 60,
        sameDayCutoff: "18:00",
        minLeadMinutes: 60,
        onlineBookingOpen: true,
        reopenAt: null,
        version: 1,
        updatedAt: now,
      },
    }),
    getOverview: async (venueId: string) => {
      const base_ = await base.getOverview(venueId);
      return {
        ...base_,
        upcomingReservations: [],
        waitlist: [],
        reviews: [],
        activity: [],
        payouts: [],
        currentService: {
          ...base_.currentService,
          bookedCovers: 0,
          arrivedCovers: 0,
          noShowCovers: 0,
          revenueMad: 0,
          slotLoad: [],
        },
        coversToday: { ...base_.coversToday, count: 0, series24h: [] },
        noShows: { ...base_.noShows, count: 0, lostRevenueMad: 0 },
        nudge: undefined,
      };
    },
    getAvailability: async (venueId: string) => ({
      venueId,
      slots: [],
      closures: [],
      updatedAt: now,
    }),
  };

  return new Proxy(base, {
    get(target, prop, receiver) {
      const override = overrides[prop as keyof RestaurantRepository];
      if (override) return override;
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * The repository a request should use, given `?etat=`.
 *
 * `chargement` is handled by the route rather than here: a server render
 * cannot "stay pending", so the route paints its own skeleton instead.
 */
export function demoRepository(
  base: RestaurantRepository,
  state: DemoState | null,
): RestaurantRepository {
  if (state === "erreur") return failing();
  if (state === "vide") return empty(base);
  return base;
}
