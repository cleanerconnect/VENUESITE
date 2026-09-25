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
  DayBook,
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
import { isVenueStatus } from "@/lib/types/restaurant";
import { asSlotMinutes } from "@/lib/types/venue-operations";
import type { VenueConfiguration } from "@/lib/types/venue-operations";
import { configFor, coverAgreement, covers } from "@/lib/venue/config";
import { all, bool, one, run, toMad } from "./store";

const day = (d: Date) => format(d, "yyyy-MM-dd");
const pctChange = (now: number, before: number) =>
  before === 0 ? 0 : Number((((now - before) / before) * 100).toFixed(1));

// ── Venue ────────────────────────────────────────────────────

export async function venueProfile(venueId: string): Promise<RestaurantProfile | null> {
  const r = await one("SELECT * FROM venues WHERE id = ?", venueId);
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
    tags: await facets(String(r.id), "tag"),
    features: (await facets(String(r.id), "feature")) as RestaurantProfile["features"],
    ambience: await facets(String(r.id), "ambience"),
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
    status: isVenueStatus(r.status) ? r.status : "pending_review",
    statusReason: String(r.status_reason ?? ""),
    statusChangedAt: r.status_changed_at ? String(r.status_changed_at) : undefined,
  };
}

// ── Room ─────────────────────────────────────────────────────

/** Listing chips the app renders — tags, facilities, ambience. */
async function facets(venueId: string, kind: string): Promise<string[]> {
  return (await all(
    "SELECT value FROM venue_tags WHERE venue_id = ? AND kind = ? ORDER BY position",
    venueId,
    kind,
  )).map((r) => String(r.value));
}

async function zones(venueId: string): Promise<Zone[]> {
  return (await all(
    "SELECT id, name, capacity, available FROM zones WHERE venue_id = ? ORDER BY position",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    capacity: Number(r.capacity),
    available: bool(r.available as number),
  }));
}


// ── Services ─────────────────────────────────────────────────

async function serviceRow(r: Record<string, string | number | null>): Promise<Service> {
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
    // The grid lives on the *definition*, and `services` carries no
    // foreign key to one — a day's service row predates the definitions
    // table. Matched on the venue and the name the two share, which is
    // what the seed and the onboarding both write; a service with no
    // definition behind it falls back to the half hour both products
    // assumed before the field existed.
    slotMinutes: asSlotMinutes(
      (
        await one(
          `SELECT slot_minutes FROM service_definitions
            WHERE venue_id = ? AND name = ? LIMIT 1`,
          String(r.venue_id),
          String(r.label),
        )
      )?.slot_minutes,
    ),
    slotLoad: (await all(
      "SELECT at, covers FROM service_slot_load WHERE service_id = ? ORDER BY at",
      String(r.id),
    )).map((s) => ({ at: String(s.at), covers: Number(s.covers) })),
  };
}

async function services(venueId: string): Promise<Service[]> {
  return Promise.all(
    (
      await all("SELECT * FROM services WHERE venue_id = ? ORDER BY opens_at", venueId)
    ).map(serviceRow),
  );
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

/**
 * The services that run on a given date.
 *
 * `services` holds the live row for today and nothing else — it is the
 * service in hand, written by the seed and reconciled against the book.
 * Any other day has to be derived from `service_definitions`, which is
 * what they are for: the weekly pattern the venue declared on
 * Disponibilités. Deriving means tomorrow's book is read against the
 * same hours a partner can see and edit, rather than against a row
 * nobody wrote.
 */
async function servicesOn(
  venueId: string,
  date: string,
  book: Reservation[],
): Promise<Service[]> {
  // The live row is one service — the one running now — and a venue that
  // serves lunch and dinner runs two. Réservations offers the day's
  // services as tabs, so the day has to answer with all of them: the
  // live row where it exists, because only it carries the booking
  // engine's counters, and the definitions for the rest.
  const live = (await services(venueId)).filter((s) => s.date === date);
  const liveByKind = new Map(live.map((s) => [s.kind + s.opensAt.slice(11, 16), s]));

  // ISO weekday, 1 = Monday, to match `service_definitions.weekdays`.
  const weekday = ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) + 1;

  const derived = (await all(
    "SELECT * FROM service_definitions WHERE venue_id = ? AND enabled = 1 ORDER BY position",
    venueId,
  ))
    .filter((r) =>
      String(r.weekdays)
        .split(",")
        .map((n) => Number(n.trim()))
        .includes(weekday),
    )
    .map((r) => {
      const opensAt = new Date(`${date}T${String(r.starts_at)}:00`);
      const closesAt = new Date(`${date}T${String(r.ends_at)}:00`);
      // A service declared 21:00–02:00 closes the next morning.
      if (closesAt.getTime() <= opensAt.getTime()) {
        closesAt.setDate(closesAt.getDate() + 1);
      }

      const held = book.filter((b) => {
        const at = new Date(b.at).getTime();
        return at >= opensAt.getTime() && at <= closesAt.getTime();
      });
      const covered = (states: Reservation["state"][]) =>
        held
          .filter((b) => states.includes(b.state))
          .reduce((n, b) => n + b.partySize, 0);

      // Where the booking engine already wrote this sitting, that row
      // wins: its counters are measured, not counted off the book.
      const already = liveByKind.get(String(r.kind) + String(r.starts_at));
      if (already) return already;

      return {
        // Synthetic, and never written back: it names the definition and
        // the date it was resolved for, so two days of the same service
        // are not the same service.
        id: `${String(r.id)}@${date}`,
        kind: String(r.kind) as ServiceKind,
        label: String(r.name),
        date,
        opensAt: opensAt.toISOString(),
        closesAt: closesAt.toISOString(),
        state: (closesAt.getTime() < Date.now() ? "closed" : "upcoming") as Service["state"],
        capacity: Number(r.capacity_covers),
        slotMinutes: asSlotMinutes(r.slot_minutes),
        bookedCovers: covered(["confirmed", "arrived"]),
        arrivedCovers: covered(["arrived"]),
        noShowCovers: covered(["no_show"]),
        // No takings on a day that has not happened, and none recorded
        // for one that has: revenue is a Lot 2 reading with its own
        // source, and inventing one here would put a figure on the
        // screen that no table backs.
        revenueMad: 0,
        // For the live service the curve comes from the booking engine.
        // A day with no engine row has one source for it — the book
        // itself, which for a day still ahead is the whole of the load.
        slotLoad: slotLoadFrom(held),
      } satisfies Service;
    });

  return derived.length > 0 ? derived : live;
}

/** Half-hour buckets, so a derived curve lands on the same grid. */
function slotLoadFrom(book: Reservation[]): { at: string; covers: number }[] {
  const buckets = new Map<string, number>();
  for (const b of book) {
    if (b.state !== "confirmed" && b.state !== "arrived") continue;
    const at = new Date(b.at);
    at.setMinutes(at.getMinutes() < 30 ? 0 : 30, 0, 0);
    const key = at.toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + b.partySize);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([at, covers]) => ({ at, covers }));
}

/**
 * Réservations for a chosen day.
 *
 * Separate from `overview` rather than a parameter on it: the overview is
 * the venue as it stands right now — the greeting, the queue, the
 * activity rail — and none of that means anything for a date three days
 * out. What a day has is a book and the services that run it.
 */
export async function dayBookFor(venueId: string, date: string): Promise<DayBook> {
  const reservations = await upcomingReservations(venueId, date);
  return {
    date,
    services: await servicesOn(venueId, date, reservations),
    reservations,
  };
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

/**
 * The book for one day.
 *
 * Scoped to a date rather than open-ended: Réservations calls itself the
 * working list "for a chosen day", Accueil reads the same array for the
 * service in hand, and an unscoped query put every future booking the
 * venue holds into both.
 */
async function upcomingReservations(venueId: string, date: string): Promise<Reservation[]> {
  return (await all(
    `${BOOKING_SELECT} AND r.state IN ('requested','confirmed','modified','arrived')
       AND date(r.at) = ?
       ORDER BY r.at`,
    venueId,
    date,
  )).map(reservationRow);
}

/**
 * The queue at the door, read from `waitlist`.
 *
 * There is one queue, and this is the table that models it — with the
 * promised delay, the notification and the door's own statuses. Reading
 * `reservations` in state `waitlisted` instead gave the dashboard a
 * second, shorter queue than Liste d'attente showed, for the same
 * guests, on two screens a manager reads within one minute of each
 * other.
 */
/**
 * Every booking a customer ever made at this venue, newest first.
 *
 * The Fiche client's Historique had no source: the page handed the
 * builder the live carnet, which by definition holds no past visit, so a
 * guest with six visits read "Aucune visite" directly under the tile
 * counting them.
 */
export async function customerBookings(venueId: string, customerId: string): Promise<Reservation[]> {
  return (await all(
    `${BOOKING_SELECT} AND r.customer_id = ? ORDER BY r.at DESC`,
    venueId,
    customerId,
  )).map(reservationRow);
}

async function waitlist(venueId: string): Promise<Reservation[]> {
  return (await all(
    `SELECT w.*, c.visit_count
       FROM waitlist w
       LEFT JOIN customers c ON c.id = w.customer_id
      WHERE w.venue_id = ? AND w.status IN ('waiting', 'notified')
      ORDER BY w.added_at`,
    venueId,
  )).map((r) => ({
    id: String(r.id),
    serviceId: "",
    guestName: String(r.guest_name),
    guestPhone: String(r.guest_phone),
    partySize: Number(r.party_size),
    at: String(r.added_at),
    state: "waitlisted" as const,
    channel: (r.source === "app" ? "lyfe" : "walk_in") as Reservation["channel"],
    visits: Number(r.visit_count ?? 0),
    vip: Number(r.visit_count ?? 0) >= 8,
  }));
}

// ── Menu, reviews, activity, payouts ─────────────────────────

/** Also the settings editor's source — the app listing and the form
 *  read the same rows, so what a partner edits is what a diner sees. */
export async function menuItems(venueId: string): Promise<MenuItem[]> {
  // One query per row for the dietary tags, so the row builder is async
  // and the list is gathered rather than mapped.
  const rows = (await all(
    "SELECT * FROM menu_items WHERE venue_id = ? ORDER BY position",
    venueId,
  )).map(async (r) => {
    const id = String(r.id);
    return {
      id,
      name: String(r.name),
      description: String(r.description),
      category: String(r.category) as MenuItem["category"],
      priceMad: toMad(Number(r.price_cents)),
      signature: bool(r.signature as number),
      visible: bool(r.visible as number),
      dietary: (await all(
        "SELECT tag FROM menu_item_dietary WHERE item_id = ?",
        id,
      )).map((t) => String(t.tag)) as MenuItem["dietary"],
    };
  });
  return Promise.all(rows);
}

async function reviews(venueId: string): Promise<GuestReview[]> {
  const rows = (await all(
    "SELECT * FROM reviews WHERE venue_id = ? ORDER BY at DESC LIMIT 20",
    venueId,
  )).map(async (r) => {
    const id = String(r.id);
    return {
      id,
      guestName: String(r.guest_name),
      rating: Number(r.rating),
      comment: String(r.comment),
      at: String(r.at),
      channel: String(r.channel) as GuestReview["channel"],
      tags: (await all("SELECT tag FROM review_tags WHERE review_id = ?", id)).map((t) =>
        String(t.tag),
      ),
      // A reply exists but is unpublished until moderation rules land, so
      // "replied" means the venue has answered, not that it is public.
      replied:
        (await one("SELECT 1 AS ok FROM review_replies WHERE review_id = ?", id)) !== null,
    };
  });
  return Promise.all(rows);
}

async function activity(venueId: string): Promise<RestaurantActivityItem[]> {
  return (await all(
    "SELECT * FROM activity WHERE venue_id = ? ORDER BY at DESC LIMIT 12",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    type: String(r.type) as RestaurantActivityItem["type"],
    actor: String(r.actor),
    message: String(r.message),
    at: String(r.at),
    reservationId: (r.reservation_id as string | null) ?? undefined,
    needsAttention: bool(r.needs_attention as number),
  }));
}

async function payouts(venueId: string): Promise<RestaurantPayout[]> {
  return (await all(
    "SELECT * FROM payouts WHERE venue_id = ? ORDER BY scheduled_for DESC",
    venueId,
  )).map((r) => ({
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

async function daily(venueId: string, date: string) {
  return await one(
    "SELECT * FROM analytics_daily WHERE venue_id = ? AND date = ?",
    venueId,
    date,
  );
}

async function aggregates(venueId: string, service: Service | null) {
  const today = startOfDay(new Date());
  const todayRow = await daily(venueId, day(today));
  const yesterdayRow = await daily(venueId, day(subDays(today, 1)));

  const coversToday = Number(todayRow?.covers_served ?? service?.arrivedCovers ?? 0);
  const coversYesterday = Number(yesterdayRow?.covers_served ?? 0);

  const week = await all(
    `SELECT date, covers_served, revenue_cents, no_shows, capacity
       FROM analytics_daily WHERE venue_id = ? AND date >= ? ORDER BY date`,
    venueId,
    day(subDays(today, 6)),
  );
  const priorWeek = await all(
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

  const ratingRow = await one(
    "SELECT AVG(rating) avg, COUNT(*) n FROM reviews WHERE venue_id = ?",
    venueId,
  );
  // AVG over an empty set is NULL, and coercing that to zero turned "no
  // month to compare with" into a jump of the whole average.
  const ratingPrior = await one(
    "SELECT AVG(rating) avg, COUNT(*) n FROM reviews WHERE venue_id = ? AND at < ?",
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

  // The service's own count, because that is what the dashboard labels
  // it and what `no-show` writes increment. The daily rollup is a whole
  // day across every service and disagreed with the hero footnote beside
  // it; it stays the fallback for a venue with no service in hand.
  const noShowsService = Number(service?.noShowCovers ?? todayRow?.no_shows ?? 0);

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
      count: noShowsService,
      lostRevenueMad: Math.round(noShowsService * ticket),
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
      deltaVsLastMonth:
        Number(ratingPrior?.n ?? 0) === 0
          ? null
          : Number(
              (Number(ratingRow?.avg ?? 0) - Number(ratingPrior?.avg ?? 0)).toFixed(1),
            ),
    },
  };
}

// ── Assembly ─────────────────────────────────────────────────

/**
 * The configuration this venue is running, straight from its settings row.
 *
 * Read here rather than imported from `operations-store` so the overview
 * query keeps its one dependency direction (SQL in, payload out). A venue
 * with no settings row is a restaurant, matching `venueSettings()`.
 */
async function configuration(venueId: string): Promise<VenueConfiguration> {
  const r = await one(
    "SELECT configuration FROM venue_settings WHERE venue_id = ?",
    venueId,
  );
  return (String(r?.configuration ?? "") || "restaurant") as VenueConfiguration;
}

/** Bonjour / Bon après-midi / Bonsoir, from the hour the page is opened. */
function salutation(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export async function overview(venueId: string, viewerFirstName: string): Promise<RestaurantOverview | null> {
  const restaurant = await venueProfile(venueId);
  if (!restaurant) return null;

  const list = await services(venueId);
  const service = await currentService(venueId, list);
  const queue = await waitlist(venueId);
  const agg = await aggregates(venueId, service);

  // The greeting speaks the venue's vocabulary: a lounge books people,
  // not covers, and the participle has to agree with whichever it is.
  const vocabulary = configFor(await configuration(venueId));

  const waiting = queue.reduce((n, r) => n + r.partySize, 0);
  // Remaining capacity, which is what LYFE knows — not free tables.
  const remainingCovers = service
    ? Math.max(0, service.capacity - service.bookedCovers)
    : 0;

  const nextPayout = await one(
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
      // Rendered inline after the title, which ends in a full stop —
      // "Bon après-midi, Yassine." — so the clause is a sentence of its
      // own and starts like one.
      clause:
        service && service.bookedCovers / Math.max(1, service.capacity) > 0.85
          ? "Le service est complet."
          : "Le service est lancé.",
      subline: service
        ? `${covers(vocabulary, service.bookedCovers)} ${coverAgreement(
            vocabulary,
            "réservé",
          )}, ${waiting} en liste d'attente, ${remainingCovers} encore disponibles.`
        : "Aucun service en cours.",
    },
    currentService: service ?? list[0],
    zones: await zones(venueId),
    ...agg,
    nextPayout: {
      amountMad: toMad(Number(nextPayout?.amount_cents ?? 0)),
      scheduledFor: String(nextPayout?.scheduled_for ?? new Date().toISOString()),
    },
    upcomingReservations: await upcomingReservations(venueId, day(new Date())),
    waitlist: queue,
    activity: await activity(venueId),
    topItems: await menuItems(venueId),
    reviews: await reviews(venueId),
    services: list,
    payouts: await payouts(venueId),
  };
}

/** Reflects a booking's state change and appends to its history. */
export async function transitionBooking(
  venueId: string,
  reservationId: string,
  to: Reservation["state"],
  actor: "venue" | "user" | "system",
  reasonCode?: string,
  note?: string,
): Promise<void> {
  const current = await one(
    "SELECT state FROM reservations WHERE id = ? AND venue_id = ?",
    reservationId,
    venueId,
  );
  if (!current) return;

  const at = new Date().toISOString();

  await run(
    "UPDATE reservations SET state = ?, updated_at = ? WHERE id = ? AND venue_id = ?",
    to,
    at,
    reservationId,
    venueId,
  );
  await run(
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
export async function analytics(
  venueId: string,
  period: string,
): Promise<import("@/lib/types/business").VenueAnalytics> {
  const days = PERIOD_DAYS[period] ?? 30;
  const today = startOfDay(new Date());

  const window = async (from: number, to: number) =>
    await all(
      `SELECT date, covers_served, revenue_cents, no_shows, capacity
         FROM analytics_daily
        WHERE venue_id = ? AND date >= ? AND date < ?
        ORDER BY date`,
      venueId,
      day(subDays(today, from)),
      day(subDays(today, to)),
    );

  const current = await window(days, -1);
  const prior = await window(days * 2, days);
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

export async function visibility(
  venueId: string,
  period: string,
): Promise<import("@/lib/types/business").VisibilityMetrics> {
  const days = PERIOD_DAYS[period] ?? 30;
  const today = startOfDay(new Date());

  const window = async (from: number, to: number) =>
    await all(
      `SELECT impressions, listing_views, bookings_made
         FROM analytics_daily
        WHERE venue_id = ? AND date >= ? AND date < ?`,
      venueId,
      day(subDays(today, from)),
      day(subDays(today, to)),
    );

  const current = await window(days, -1);
  const prior = await window(days * 2, days);
  const sum = (rows: typeof current, key: string) =>
    rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);

  const impressions = sum(current, "impressions");
  const views = sum(current, "listing_views");
  const bookings = sum(current, "bookings_made");

  const boost = await one(
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
