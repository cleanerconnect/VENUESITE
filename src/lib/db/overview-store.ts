import "server-only";

// The service payload, assembled from SQL.
//
// This is the query that replaces `mock/restaurant.ts`. Everything the
// dashboard leads with — today's bookings, the room, the menu, reviews,
// the activity rail — is rows now.
//
// Aggregates (covers today, average ticket, occupancy, weekly revenue,
// rating) are computed here rather than stored on the venue, because a
// stored aggregate is a number that goes stale the moment a booking
// changes and nobody notices until it contradicts the list beside it.

import { differenceInMinutes, format, startOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  GuestReview,
  MenuItem,
  Reservation,
  RestaurantActivityItem,
  RestaurantOverview,
  RestaurantPayout,
  RestaurantProfile,
  Service,
  ServiceKind,
  Zone,
} from "@/lib/types/restaurant";
import { all, bool, one, run, toMad } from "./store";

const day = (d: Date) => format(d, "yyyy-MM-dd");
const pctChange = (now: number, before: number) =>
  before === 0 ? 0 : Number((((now - before) / before) * 100).toFixed(1));

// ── Venue ────────────────────────────────────────────────────

export function venueProfile(venueId: string): RestaurantProfile | null {
  const r = one("SELECT * FROM venues WHERE id = ?", venueId);
  if (!r) return null;
  return {
    id: String(r.id),
    kind: "gastronomique",
    name: String(r.name),
    description: String(r.description),
    address: String(r.address),
    latitude: r.latitude === null ? undefined : Number(r.latitude),
    longitude: r.longitude === null ? undefined : Number(r.longitude),
    priceRange: Number(r.price_range),
    tags: facets(String(r.id), "tag"),
    features: facets(String(r.id), "feature") as RestaurantProfile["features"],
    ambience: facets(String(r.id), "ambience"),
    shortName: String(r.short_name),
    initials: String(r.initials),
    city: String(r.city),
    subline: `${String(r.kind) === "drinks" ? "Bar" : "Restaurant"} · ${String(r.city)}`,
    cuisine: String(r.category),
    capacity: Number(r.capacity),
    contactEmail: String(r.contact_email),
    contactPhone: String(r.contact_phone),
    website: String(r.website),
    currency: String(r.currency),
    onboardingCompleted: bool(r.onboarding_completed as number),
  };
}

// ── Room ─────────────────────────────────────────────────────

/** Listing chips the app renders — tags, facilities, ambience. */
function facets(venueId: string, kind: string): string[] {
  return all(
    "SELECT value FROM venue_tags WHERE venue_id = ? AND kind = ? ORDER BY position",
    venueId,
    kind,
  ).map((r) => String(r.value));
}

function zones(venueId: string): Zone[] {
  return all(
    "SELECT id, name, capacity, available FROM zones WHERE venue_id = ? ORDER BY position",
    venueId,
  ).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    capacity: Number(r.capacity),
    available: bool(r.available as number),
  }));
}


// ── Services ─────────────────────────────────────────────────

function serviceRow(r: Record<string, string | number | null>): Service {
  return {
    id: String(r.id),
    kind: String(r.kind) as ServiceKind,
    label: String(r.label),
    date: String(r.date),
    opensAt: String(r.opens_at),
    closesAt: String(r.closes_at),
    state: String(r.state) as Service["state"],
    capacity: Number(r.capacity),
    bookedCovers: Number(r.booked_covers),
    arrivedCovers: Number(r.arrived_covers),
    noShowCovers: Number(r.no_show_covers),
    revenueMad: toMad(Number(r.revenue_cents)),
    slotLoad: all(
      "SELECT at, covers FROM service_slot_load WHERE service_id = ? ORDER BY at",
      String(r.id),
    ).map((s) => ({ at: String(s.at), covers: Number(s.covers) })),
  };
}

function services(venueId: string): Service[] {
  return all(
    "SELECT * FROM services WHERE venue_id = ? ORDER BY opens_at",
    venueId,
  ).map(serviceRow);
}

/**
 * The service the dashboard leads with: the one currently running, or the
 * next one due. A venue between services should see what is coming, not
 * an empty screen.
 */
function currentService(venueId: string, list: Service[]): Service | null {
  const now = Date.now();
  const live = list.find(
    (s) =>
      new Date(s.opensAt).getTime() <= now && new Date(s.closesAt).getTime() >= now,
  );
  if (live) return live;
  return (
    list.find((s) => new Date(s.opensAt).getTime() > now) ??
    list[list.length - 1] ??
    null
  );
}

// ── Bookings ─────────────────────────────────────────────────

function reservationRow(r: Record<string, string | number | null>): Reservation {
  return {
    id: String(r.id),
    serviceId: String(r.service_id ?? ""),
    guestName: String(r.guest_name),
    guestPhone: String(r.guest_phone),
    partySize: Number(r.party_size),
    at: String(r.at),
    state: String(r.state) as Reservation["state"],
    channel: String(r.channel) as Reservation["channel"],
    zoneId: (r.zone_id as string | null) ?? undefined,
    note: (r.note as string | null) ?? undefined,
    visits: Number(r.visit_count ?? 0),
    vip: Number(r.visit_count ?? 0) >= 8,
    depositMad: r.deposit_cents === null ? undefined : toMad(Number(r.deposit_cents)),
    noShowRisk: r.no_show_risk === null ? undefined : Number(r.no_show_risk),
  };
}

/** Joins the customer so a row can show visit count without a second query. */
const BOOKING_SELECT = `
  SELECT r.*, c.visit_count
    FROM reservations r
    LEFT JOIN customers c ON c.id = r.customer_id
   WHERE r.venue_id = ?`;

function upcomingReservations(venueId: string): Reservation[] {
  return all(
    `${BOOKING_SELECT} AND r.state IN ('requested','confirmed','modified','arrived')
       ORDER BY r.at`,
    venueId,
  ).map(reservationRow);
}

function waitlist(venueId: string): Reservation[] {
  return all(
    `${BOOKING_SELECT} AND r.state = 'waitlisted' ORDER BY r.at`,
    venueId,
  ).map(reservationRow);
}

// ── Menu, reviews, activity, payouts ─────────────────────────

function menuItems(venueId: string): MenuItem[] {
  return all(
    "SELECT * FROM menu_items WHERE venue_id = ? ORDER BY position",
    venueId,
  ).map((r) => {
    const id = String(r.id);
    return {
      id,
      name: String(r.name),
      description: String(r.description),
      category: String(r.category) as MenuItem["category"],
      priceMad: toMad(Number(r.price_cents)),
      signature: bool(r.signature as number),
      visible: bool(r.visible as number),
      dietary: all(
        "SELECT tag FROM menu_item_dietary WHERE item_id = ?",
        id,
      ).map((t) => String(t.tag)) as MenuItem["dietary"],
    };
  });
}

function reviews(venueId: string): GuestReview[] {
  return all(
    "SELECT * FROM reviews WHERE venue_id = ? ORDER BY at DESC LIMIT 20",
    venueId,
  ).map((r) => {
    const id = String(r.id);
    return {
      id,
      guestName: String(r.guest_name),
      rating: Number(r.rating),
      comment: String(r.comment),
      at: String(r.at),
      channel: String(r.channel) as GuestReview["channel"],
      tags: all("SELECT tag FROM review_tags WHERE review_id = ?", id).map((t) =>
        String(t.tag),
      ),
      // A reply exists but is unpublished until moderation rules land, so
      // "replied" means the venue has answered, not that it is public.
      replied:
        one("SELECT 1 AS ok FROM review_replies WHERE review_id = ?", id) !== null,
    };
  });
}

function activity(venueId: string): RestaurantActivityItem[] {
  return all(
    "SELECT * FROM activity WHERE venue_id = ? ORDER BY at DESC LIMIT 12",
    venueId,
  ).map((r) => ({
    id: String(r.id),
    type: String(r.type) as RestaurantActivityItem["type"],
    actor: String(r.actor),
    message: String(r.message),
    at: String(r.at),
    reservationId: (r.reservation_id as string | null) ?? undefined,
    needsAttention: bool(r.needs_attention as number),
  }));
}

function payouts(venueId: string): RestaurantPayout[] {
  return all(
    "SELECT * FROM payouts WHERE venue_id = ? ORDER BY scheduled_for DESC",
    venueId,
  ).map((r) => ({
    id: String(r.id),
    reference: String(r.reference),
    amountMad: toMad(Number(r.amount_cents)),
    commissionMad: toMad(Number(r.commission_cents)),
    coversSettled: Number(r.covers_settled),
    periodLabel: `${format(new Date(String(r.period_start)), "d MMM", { locale: fr })} – ${format(new Date(String(r.period_end)), "d MMMM", { locale: fr })}`,
    scheduledFor: String(r.scheduled_for),
    paidAt: (r.paid_at as string | null) ?? undefined,
    state: String(r.state) as RestaurantPayout["state"],
  }));
}

// ── Aggregates ───────────────────────────────────────────────

function daily(venueId: string, date: string) {
  return one(
    "SELECT * FROM analytics_daily WHERE venue_id = ? AND date = ?",
    venueId,
    date,
  );
}

function aggregates(venueId: string, service: Service | null) {
  const today = startOfDay(new Date());
  const todayRow = daily(venueId, day(today));
  const yesterdayRow = daily(venueId, day(subDays(today, 1)));

  const coversToday = Number(todayRow?.covers_served ?? service?.arrivedCovers ?? 0);
  const coversYesterday = Number(yesterdayRow?.covers_served ?? 0);

  const week = all(
    `SELECT date, covers_served, revenue_cents, no_shows, capacity
       FROM analytics_daily WHERE venue_id = ? AND date >= ? ORDER BY date`,
    venueId,
    day(subDays(today, 6)),
  );
  const priorWeek = all(
    `SELECT covers_served, revenue_cents, capacity
       FROM analytics_daily WHERE venue_id = ? AND date >= ? AND date < ?`,
    venueId,
    day(subDays(today, 13)),
    day(subDays(today, 6)),
  );

  const sum = (rows: typeof week, key: string) =>
    rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);

  const revenueWeek = toMad(sum(week, "revenue_cents"));
  const revenuePrior = toMad(sum(priorWeek, "revenue_cents"));
  const coversWeek = sum(week, "covers_served");
  const coversPrior = sum(priorWeek, "covers_served");
  const capacityWeek = sum(week, "capacity");
  const capacityPrior = sum(priorWeek, "capacity");

  const occupancy = capacityWeek === 0 ? 0 : (coversWeek / capacityWeek) * 100;
  const occupancyPrior =
    capacityPrior === 0 ? 0 : (coversPrior / capacityPrior) * 100;

  const ticket = coversWeek === 0 ? 0 : revenueWeek / coversWeek;
  const ticketPrior = coversPrior === 0 ? 0 : revenuePrior / coversPrior;

  const ratingRow = one(
    "SELECT AVG(rating) avg, COUNT(*) n FROM reviews WHERE venue_id = ?",
    venueId,
  );
  const ratingPrior = one(
    "SELECT AVG(rating) avg FROM reviews WHERE venue_id = ? AND at < ?",
    venueId,
    subDays(today, 30).toISOString(),
  );

  // 24 buckets of covers across today, from the current service's slot
  // load — the hourly shape the sparkline draws.
  const series24h = Array.from({ length: 24 }, (_, hour) => {
    if (!service) return 0;
    return service.slotLoad
      .filter((s) => new Date(s.at).getHours() === hour)
      .reduce((n, s) => n + s.covers, 0);
  });

  const peak = service?.slotLoad.reduce(
    (best, s) => (s.covers > (best?.covers ?? -1) ? s : best),
    service.slotLoad[0],
  );

  const noShowsToday = Number(todayRow?.no_shows ?? service?.noShowCovers ?? 0);
  const noShowsPrior = Number(yesterdayRow?.no_shows ?? 0);

  return {
    coversToday: {
      count: coversToday,
      deltaPctVsYesterday: pctChange(coversToday, coversYesterday),
      series24h,
      peakHourLabel: peak
        ? `Pic à ${format(new Date(peak.at), "HH'h'", { locale: fr })}`
        : "Aucune pointe identifiée",
    },
    averageTicket: {
      amountMad: Math.round(ticket),
      deltaPctVsLastWeek: pctChange(ticket, ticketPrior),
    },
    occupancy: {
      pct: Math.round(occupancy),
      deltaPctVsLastWeek: pctChange(occupancy, occupancyPrior),
    },
    noShows: {
      count: noShowsToday,
      deltaPctVsLastWeek: pctChange(noShowsToday, noShowsPrior),
      lostRevenueMad: Math.round(noShowsToday * ticket),
    },
    revenueWeek: {
      amountMad: Math.round(revenueWeek),
      deltaPctVsLastWeek: pctChange(revenueWeek, revenuePrior),
      series: week.map((r) => ({
        label: format(new Date(String(r.date)), "EEE", { locale: fr }),
        value: toMad(Number(r.revenue_cents)),
      })),
    },
    rating: {
      average: Number(Number(ratingRow?.avg ?? 0).toFixed(1)),
      reviewCount: Number(ratingRow?.n ?? 0),
      deltaVsLastMonth: Number(
        (Number(ratingRow?.avg ?? 0) - Number(ratingPrior?.avg ?? 0)).toFixed(1),
      ),
    },
  };
}

// ── Assembly ─────────────────────────────────────────────────

/** Bonjour / Bon après-midi / Bonsoir, from the hour the page is opened. */
function salutation(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function overview(venueId: string, viewerFirstName: string): RestaurantOverview | null {
  const restaurant = venueProfile(venueId);
  if (!restaurant) return null;

  const list = services(venueId);
  const service = currentService(venueId, list);
  const queue = waitlist(venueId);
  const agg = aggregates(venueId, service);

  const waiting = queue.reduce((n, r) => n + r.partySize, 0);
  // Remaining capacity, which is what LYFE knows — not free tables.
  const remainingCovers = service
    ? Math.max(0, service.capacity - service.bookedCovers)
    : 0;

  const nextPayout = one(
    `SELECT amount_cents, scheduled_for FROM payouts
      WHERE venue_id = ? AND state != 'paid' ORDER BY scheduled_for LIMIT 1`,
    venueId,
  );

  // Greeting copy is derived from the live numbers, never stored — a
  // stored clause would keep saying the patio is full after it emptied.
  const closesIn = service
    ? Math.max(0, differenceInMinutes(new Date(service.closesAt), new Date()))
    : 0;

  return {
    restaurant,
    greeting: {
      firstName: viewerFirstName,
      salutation: salutation(new Date()),
      clause:
        service && service.bookedCovers / Math.max(1, service.capacity) > 0.85
          ? "le service est complet."
          : "le service est lancé.",
      subline: service
        ? `${service.bookedCovers} couverts réservés, ${waiting} en liste d'attente, ${remainingCovers} encore disponibles.`
        : "Aucun service en cours.",
    },
    currentService: service ?? list[0],
    zones: zones(venueId),
    ...agg,
    nextPayout: {
      amountMad: toMad(Number(nextPayout?.amount_cents ?? 0)),
      scheduledFor: String(nextPayout?.scheduled_for ?? new Date().toISOString()),
    },
    upcomingReservations: upcomingReservations(venueId),
    waitlist: queue,
    activity: activity(venueId),
    topItems: menuItems(venueId),
    reviews: reviews(venueId),
    services: list,
    payouts: payouts(venueId),
  };
}

/** Reflects a booking's state change and appends to its history. */
export function transitionBooking(
  venueId: string,
  reservationId: string,
  to: Reservation["state"],
  actor: "venue" | "user" | "system",
  reasonCode?: string,
  note?: string,
): void {
  const current = one(
    "SELECT state FROM reservations WHERE id = ? AND venue_id = ?",
    reservationId,
    venueId,
  );
  if (!current) return;

  const at = new Date().toISOString();

  run(
    "UPDATE reservations SET state = ?, updated_at = ? WHERE id = ? AND venue_id = ?",
    to,
    at,
    reservationId,
    venueId,
  );
  run(
    `INSERT INTO reservation_status_history
       (id, reservation_id, from_state, to_state, actor, actor_id, reason_code, note, at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    `sh_${reservationId}_${Date.now().toString(36)}`,
    reservationId,
    String(current.state),
    to,
    actor,
    reasonCode ?? null,
    note ?? null,
    at,
  );
}

// ── Analytics & visibility ───────────────────────────────────

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
};

/**
 * Rolled up from `analytics_daily`, which the tracking pipeline owns.
 * Each period is compared against the equivalent window before it, so a
 * number on screen means something relative rather than in isolation.
 */
export function analytics(
  venueId: string,
  period: string,
): import("@/lib/types/business").VenueAnalytics {
  const days = PERIOD_DAYS[period] ?? 30;
  const today = startOfDay(new Date());

  const window = (from: number, to: number) =>
    all(
      `SELECT date, covers_served, revenue_cents, no_shows, capacity
         FROM analytics_daily
        WHERE venue_id = ? AND date >= ? AND date < ?
        ORDER BY date`,
      venueId,
      day(subDays(today, from)),
      day(subDays(today, to)),
    );

  const current = window(days, -1);
  const prior = window(days * 2, days);
  const sum = (rows: typeof current, key: string) =>
    rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);

  const covers = sum(current, "covers_served");
  const coversPrior = sum(prior, "covers_served");
  const revenue = toMad(sum(current, "revenue_cents"));
  const revenuePrior = toMad(sum(prior, "revenue_cents"));
  const noShows = sum(current, "no_shows");
  const noShowsPrior = sum(prior, "no_shows");
  const capacity = sum(current, "capacity");
  const capacityPrior = sum(prior, "capacity");

  const occupancy = capacity === 0 ? 0 : (covers / capacity) * 100;
  const occupancyPrior =
    capacityPrior === 0 ? 0 : (coversPrior / capacityPrior) * 100;
  const noShowRate = covers === 0 ? 0 : (noShows / covers) * 100;
  const noShowRatePrior = coversPrior === 0 ? 0 : (noShowsPrior / coversPrior) * 100;

  // Long periods are bucketed so the chart stays readable; a 365-point
  // line is a smear, not a trend.
  const buckets = days <= 30 ? current.length : 12;
  const size = Math.max(1, Math.ceil(current.length / buckets));
  const series: import("@/lib/types/business").VenueAnalytics["series"] = [];
  for (let i = 0; i < current.length; i += size) {
    const slice = current.slice(i, i + size);
    if (slice.length === 0) continue;
    series.push({
      label: format(new Date(String(slice[0].date)), days > 90 ? "MMM" : "d MMM", {
        locale: fr,
      }),
      covers: sum(slice, "covers_served"),
      revenueMad: toMad(sum(slice, "revenue_cents")),
      noShows: sum(slice, "no_shows"),
    });
  }

  return {
    venueId,
    period: period as import("@/lib/types/business").AnalyticsPeriod,
    occupancyRate: Math.round(occupancy),
    occupancyDeltaPct: pctChange(occupancy, occupancyPrior),
    estimatedRevenueMad: Math.round(revenue),
    revenueDeltaPct: pctChange(revenue, revenuePrior),
    noShowRate: Number(noShowRate.toFixed(1)),
    noShowDeltaPct: pctChange(noShowRate, noShowRatePrior),
    coversServed: covers,
    coversDeltaPct: pctChange(covers, coversPrior),
    series,
  };
}

export function visibility(
  venueId: string,
  period: string,
): import("@/lib/types/business").VisibilityMetrics {
  const days = PERIOD_DAYS[period] ?? 30;
  const today = startOfDay(new Date());

  const window = (from: number, to: number) =>
    all(
      `SELECT impressions, listing_views, bookings_made
         FROM analytics_daily
        WHERE venue_id = ? AND date >= ? AND date < ?`,
      venueId,
      day(subDays(today, from)),
      day(subDays(today, to)),
    );

  const current = window(days, -1);
  const prior = window(days * 2, days);
  const sum = (rows: typeof current, key: string) =>
    rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);

  const impressions = sum(current, "impressions");
  const views = sum(current, "listing_views");
  const bookings = sum(current, "bookings_made");

  const boost = one(
    `SELECT ends_at FROM boost_campaigns
      WHERE venue_id = ? AND status = 'active' AND ends_at > ?
      ORDER BY ends_at DESC LIMIT 1`,
    venueId,
    new Date().toISOString(),
  );

  return {
    venueId,
    period: period as import("@/lib/types/business").AnalyticsPeriod,
    impressions,
    impressionsDeltaPct: pctChange(impressions, sum(prior, "impressions")),
    listingViews: views,
    listingViewsDeltaPct: pctChange(views, sum(prior, "listing_views")),
    conversionPct: views === 0 ? 0 : Number(((bookings / views) * 100).toFixed(1)),
    reach: Math.round(impressions * 0.56),
    boostActive: boost !== null,
    boostEndsAt: boost ? String(boost.ends_at) : undefined,
  };
}
