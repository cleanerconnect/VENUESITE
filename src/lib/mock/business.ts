// Business Service mock.
//
// Everything here is *derived*, not hand-written, and that is the point:
// the CRM rule in the brief is that a venue never enters a customer
// manually — every confirmed booking creates or enriches a record. So the
// mock builds its customer base by folding the booking history, which
// both demonstrates the rule and keeps the demo honest when the booking
// data changes.

import { addDays, format, startOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  AnalyticsPeriod,
  BusinessAccount,
  Customer,
  LoyaltyTier,
  NoShowRecord,
  NotificationPreferences,
  PortalNotification,
  VenueAnalytics,
  VenueAvailability,
  VisibilityMetrics,
} from "@/lib/types/business";
import { LOYALTY_TIER } from "@/lib/types/business";
import type { Reservation } from "@/lib/types/restaurant";
import { getRestaurantOverview, RESTAURANT } from "./restaurant";

/**
 * The signed-in partner's account. `subscriptionTier` carries the column's
 * value; nothing gates on it — feature access reads `featuresEnabled`.
 */
export const BUSINESS_ACCOUNT: BusinessAccount = {
  businessId: "biz_dar_zellij",
  venueId: RESTAURANT.id,
  ownerId: "usr_yassine",
  subscriptionTier: "annual",
  featuresEnabled: [
    "bookings",
    "availability",
    "analytics",
    "crm",
    "reviews",
    "visibility",
    "team",
  ],
};

// ── Availability ─────────────────────────────────────────────

const WEEKDAY_SLOTS: { weekday: number; opensAt: string; closesAt: string; capacity: number; enabled: boolean }[] = [
  { weekday: 1, opensAt: "12:00", closesAt: "15:00", capacity: 60, enabled: true },
  { weekday: 1, opensAt: "19:00", closesAt: "23:30", capacity: 120, enabled: true },
  { weekday: 2, opensAt: "12:00", closesAt: "15:00", capacity: 60, enabled: true },
  { weekday: 2, opensAt: "19:00", closesAt: "23:30", capacity: 120, enabled: true },
  { weekday: 3, opensAt: "12:00", closesAt: "15:00", capacity: 60, enabled: true },
  { weekday: 3, opensAt: "19:00", closesAt: "23:30", capacity: 120, enabled: true },
  { weekday: 4, opensAt: "12:00", closesAt: "15:00", capacity: 60, enabled: true },
  { weekday: 4, opensAt: "19:00", closesAt: "23:30", capacity: 120, enabled: true },
  { weekday: 5, opensAt: "12:00", closesAt: "15:30", capacity: 72, enabled: true },
  { weekday: 5, opensAt: "19:00", closesAt: "00:30", capacity: 120, enabled: true },
  { weekday: 6, opensAt: "12:00", closesAt: "15:30", capacity: 72, enabled: true },
  { weekday: 6, opensAt: "19:00", closesAt: "00:30", capacity: 120, enabled: true },
  { weekday: 7, opensAt: "12:00", closesAt: "16:00", capacity: 92, enabled: true },
  { weekday: 7, opensAt: "19:00", closesAt: "23:00", capacity: 100, enabled: false },
];

let availability: VenueAvailability = {
  venueId: RESTAURANT.id,
  slots: WEEKDAY_SLOTS.map((s, i) => ({ id: `slot_${i}`, ...s })),
  closures: [
    {
      id: "cl_1",
      date: format(addDays(new Date(), 12), "yyyy-MM-dd"),
      reason: "Privatisation",
    },
  ],
  updatedAt: new Date().toISOString(),
};

export function getAvailability(): VenueAvailability {
  return availability;
}

export function setAvailability(
  next: Omit<VenueAvailability, "updatedAt">,
): VenueAvailability {
  availability = { ...next, updatedAt: new Date().toISOString() };
  return availability;
}

// ── CRM, folded from bookings ────────────────────────────────

/** Extra booking history, so the fold has more than one service to chew on. */
const HISTORY: { name: string; phone: string; email?: string; visits: number; lastDaysAgo: number; avgSpend: number; prefs: string[]; noShows: number }[] = [
  { name: "Salma Bennani", phone: "+212 661 20 44 18", email: "salma.bennani@gmail.com", visits: 6, lastDaysAgo: 21, avgSpend: 780, prefs: ["Sans porc", "Table au patio"], noShows: 0 },
  { name: "Hind Tazi", phone: "+212 660 15 62 40", email: "h.tazi@outlook.com", visits: 9, lastDaysAgo: 9, avgSpend: 1120, prefs: ["Allergie fruits de mer", "Anniversaire en mai"], noShows: 0 },
  { name: "Groupe Karam", phone: "+212 662 88 10 03", visits: 2, lastDaysAgo: 48, avgSpend: 1640, prefs: ["Sans gluten (2 couverts)"], noShows: 1 },
  { name: "Yasmine El Alaoui", phone: "+212 663 41 77 92", email: "yasmine.ea@gmail.com", visits: 1, lastDaysAgo: 74, avgSpend: 620, prefs: [], noShows: 2 },
  { name: "Nabil Cherkaoui", phone: "+212 665 09 33 71", visits: 0, lastDaysAgo: 0, avgSpend: 0, prefs: ["Table près de la fontaine"], noShows: 0 },
  { name: "Omar Idrissi", phone: "+212 667 74 21 08", visits: 0, lastDaysAgo: 0, avgSpend: 0, prefs: [], noShows: 0 },
  { name: "Famille Berrada", phone: "+212 668 30 90 55", visits: 3, lastDaysAgo: 33, avgSpend: 940, prefs: ["Chaise haute"], noShows: 0 },
  { name: "Leïla Mansouri", phone: "+212 664 51 12 87", email: "leila.m@gmail.com", visits: 14, lastDaysAgo: 4, avgSpend: 890, prefs: ["Végétarienne", "Terrasse"], noShows: 0 },
  { name: "Thomas Renaud", phone: "+33 6 12 44 90 21", email: "t.renaud@free.fr", visits: 2, lastDaysAgo: 5, avgSpend: 1310, prefs: [], noShows: 0 },
  { name: "Karim Hakimi", phone: "+212 669 22 41 06", visits: 4, lastDaysAgo: 60, avgSpend: 700, prefs: ["Table calme"], noShows: 1 },
  { name: "Amina Bouzid", phone: "+212 661 88 03 45", email: "amina.bouzid@gmail.com", visits: 11, lastDaysAgo: 16, avgSpend: 830, prefs: ["Sans alcool"], noShows: 0 },
  { name: "Sofia Lahlou", phone: "+212 666 70 15 29", visits: 5, lastDaysAgo: 27, avgSpend: 760, prefs: [], noShows: 3 },
];

function loyaltyFor(visits: number): LoyaltyTier {
  const tiers: LoyaltyTier[] = ["ambassadeur", "fidele", "regulier", "nouveau"];
  return tiers.find((t) => visits >= LOYALTY_TIER[t].minVisits) ?? "nouveau";
}

/**
 * Segments are derived, never stored. A customer's segment is a reading of
 * their visit history at this moment — storing it would let it go stale
 * the first time they come back.
 */
function segmentsFor(visits: number, lastDaysAgo: number, risk: number): string[] {
  const out: string[] = [];
  if (visits === 0) out.push("new");
  else out.push("returning");
  if (visits >= LOYALTY_TIER.fidele.minVisits) out.push("loyal");
  if (risk >= 0.3) out.push("at_risk");
  if (visits > 0 && lastDaysAgo > 60) out.push("lapsed");
  return out;
}

function buildCustomers(): Customer[] {
  const now = Date.now();
  const reviews = getRestaurantOverview().reviews;

  return HISTORY.map((h, i) => {
    const noShowHistory: NoShowRecord[] = Array.from(
      { length: h.noShows },
      (_, n) => ({
        bookingId: `bk_hist_${i}_${n}`,
        at: subDays(new Date(now), 20 * (n + 1) + i).toISOString(),
        partySize: 2 + (n % 3),
      }),
    );

    // Risk is no-shows against everything they were expected at — a guest
    // with one miss in fifteen visits is not the same as one in two.
    const opportunities = h.visits + h.noShows;
    const risk = opportunities === 0 ? 0 : h.noShows / opportunities;

    return {
      id: `cus_${i + 1}`,
      fullName: h.name,
      phone: h.phone,
      email: h.email,
      firstSeenAt: subDays(new Date(now), 90 + i * 11).toISOString(),
      lastVisitAt:
        h.visits > 0
          ? subDays(new Date(now), h.lastDaysAgo).toISOString()
          : undefined,
      visitCount: h.visits,
      averageSpendMad: h.avgSpend,
      totalSpendMad: h.avgSpend * h.visits,
      loyaltyTier: loyaltyFor(h.visits),
      preferences: h.prefs,
      noShowHistory,
      noShowRisk: Number(risk.toFixed(2)),
      reviewIds: reviews
        .filter((r) => h.name.startsWith(r.guestName.split(" ")[0]))
        .map((r) => r.id),
      segments: segmentsFor(h.visits, h.lastDaysAgo, risk),
      optedOutOfMarketing: i % 7 === 0,
    };
  });
}

let customers: Customer[] | null = null;

export function listCustomers(): Customer[] {
  customers ??= buildCustomers();
  return customers;
}

export function getCustomer(id: string): Customer | null {
  return listCustomers().find((c) => c.id === id) ?? null;
}

/** Matches a live booking to its customer record by phone, then by name. */
export function customerForReservation(r: Reservation): Customer | null {
  const all = listCustomers();
  return (
    all.find((c) => c.phone === r.guestPhone) ??
    all.find((c) => c.fullName === r.guestName) ??
    null
  );
}

/** Records a no-show against the customer, not only the booking. */
export function recordNoShow(reservation: Reservation): void {
  const customer = customerForReservation(reservation);
  if (!customer) return;
  customer.noShowHistory = [
    {
      bookingId: reservation.id,
      at: new Date().toISOString(),
      partySize: reservation.partySize,
    },
    ...customer.noShowHistory,
  ];
  const opportunities = customer.visitCount + customer.noShowHistory.length;
  customer.noShowRisk = Number(
    (customer.noShowHistory.length / Math.max(1, opportunities)).toFixed(2),
  );
  customer.segments = segmentsFor(
    customer.visitCount,
    customer.lastVisitAt
      ? Math.round((Date.now() - new Date(customer.lastVisitAt).getTime()) / 86_400_000)
      : 0,
    customer.noShowRisk,
  );
}

// ── Analytics ────────────────────────────────────────────────

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

export function getAnalytics(period: AnalyticsPeriod): VenueAnalytics {
  const days = PERIOD_DAYS[period];
  const buckets = period === "12m" ? 12 : period === "90d" ? 12 : days;
  const step = days / buckets;
  const today = startOfDay(new Date());

  const series = Array.from({ length: buckets }, (_, i) => {
    const at = subDays(today, Math.round((buckets - 1 - i) * step));
    // A weekly rhythm with a slow upward drift — enough shape to read.
    const weekend = [5, 6, 0].includes(at.getDay());
    const base = weekend ? 118 : 74;
    const drift = 1 + i / (buckets * 6);
    const covers = Math.round(base * drift + ((i * 13) % 17) - 8);
    return {
      label:
        period === "12m"
          ? format(at, "MMM", { locale: fr })
          : format(at, "d MMM", { locale: fr }),
      covers,
      revenueMad: Math.round(covers * 737),
      noShows: Math.max(0, Math.round(covers * 0.045) - (i % 3)),
    };
  });

  const covers = series.reduce((n, p) => n + p.covers, 0);
  const revenue = series.reduce((n, p) => n + p.revenueMad, 0);
  const noShows = series.reduce((n, p) => n + p.noShows, 0);
  const capacity = 120 * 2 * buckets;

  return {
    venueId: RESTAURANT.id,
    period,
    occupancyRate: Math.round((covers / Math.max(1, capacity)) * 100),
    occupancyDeltaPct: 6.1,
    estimatedRevenueMad: revenue,
    revenueDeltaPct: 9.2,
    noShowRate: Number(((noShows / Math.max(1, covers)) * 100).toFixed(1)),
    noShowDeltaPct: -2.4,
    coversServed: covers,
    coversDeltaPct: 7.8,
    series,
  };
}

export function getVisibilityMetrics(period: AnalyticsPeriod): VisibilityMetrics {
  const scale = PERIOD_DAYS[period] / 30;
  const views = Math.round(4_820 * scale);
  return {
    venueId: RESTAURANT.id,
    period,
    impressions: Math.round(38_400 * scale),
    impressionsDeltaPct: 11.3,
    listingViews: views,
    listingViewsDeltaPct: 8.7,
    conversionPct: 6.4,
    reach: Math.round(21_600 * scale),
    boostActive: true,
    boostEndsAt: addDays(new Date(), 4).toISOString(),
  };
}

// ── Notifications ────────────────────────────────────────────

let notifications: PortalNotification[] = [
  {
    id: "ntf_1",
    type: "booking_request",
    title: "Nouvelle demande de réservation",
    body: "Nabil Cherkaoui · 2 personnes · à confirmer",
    at: new Date(Date.now() - 4 * 60_000).toISOString(),
    read: false,
    href: "/restaurant/reservations",
  },
  {
    id: "ntf_2",
    type: "cancellation",
    title: "Réservation annulée",
    body: "Sofia Lahlou a annulé sa table de 2",
    at: new Date(Date.now() - 47 * 60_000).toISOString(),
    read: false,
    href: "/restaurant/reservations",
  },
  {
    id: "ntf_3",
    type: "review",
    title: "Nouvel avis · 5 étoiles",
    body: "Leïla M. — « Le patio au coucher du soleil, rien à redire. »",
    at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    read: true,
    href: "/restaurant/avis",
  },
];

export function listNotifications(): PortalNotification[] {
  return notifications;
}

export function markNotificationRead(id: string): void {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
}

let preferences: NotificationPreferences = {
  venueId: RESTAURANT.id,
  newBooking: ["push", "email"],
  cancellation: ["push"],
  review: ["email"],
  dailySummary: ["email"],
};

export function getNotificationPreferences(): NotificationPreferences {
  return preferences;
}

export function setNotificationPreferences(
  next: NotificationPreferences,
): NotificationPreferences {
  preferences = next;
  return preferences;
}
