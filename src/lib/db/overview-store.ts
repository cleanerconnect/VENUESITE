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
import { StaleWriteError } from "@/lib/data/repository";
import { asSlotMinutes } from "@/lib/types/venue-operations";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { VENUE_TIME_ZONE } from "@/lib/time/zone";
import type { VenueConfiguration } from "@/lib/types/venue-operations";
import { configFor, coverAgreement, covers } from "@/lib/venue/config";
import { all, bool, one, run, toMad, transaction } from "./store";

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
    guestEmail: (r.guest_email as string | null) ?? undefined,
    guestBirthYear:
      r.birth_year === null || r.birth_year === undefined
        ? undefined
        : Number(r.birth_year),
    note: (r.note as string | null) ?? undefined,
    visits: Number(r.visit_count ?? 0),
    vip: Number(r.visit_count ?? 0) >= 8,
    depositMad: r.deposit_cents === null ? undefined : toMad(Number(r.deposit_cents)),
    noShowRisk: r.no_show_risk === null ? undefined : Number(r.no_show_risk),
  };
}

/**
 * Joins the customer so a row can show visit count without a second query.
 *
 * And the two facts the drawer shows that the booking itself does not
 * hold: the address and the birth year live on the guest, not on the
 * table they booked.
 */
const BOOKING_SELECT = `
  SELECT r.*, c.visit_count, c.email AS guest_email, c.birth_year
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
    `SELECT w.*, c.visit_count, c.email AS guest_email, c.birth_year
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
  return transaction(async () => {
    const current = await one(
      "SELECT state FROM reservations WHERE id = ? AND venue_id = ?",
      reservationId,
      venueId,
    );
    if (!current) return;

    const from = String(current.state);
    // Already there. Two taps on Accepter, or a retried action after a
    // dropped connection, must not write a second history row saying
    // the booking moved from `confirmed` to `confirmed`.
    if (from === to) return;

    const at = new Date().toISOString();

    // Compare-and-set on the state this transaction read.
    //
    // This was a read, then an unconditional write, outside any
    // transaction. Two hosts at one stand — one tapping Accepter, the
    // other Absent — both read `requested`, both wrote, and the book
    // ended on whichever landed last while the history recorded two
    // departures from the same state. The guest was told twice, and the
    // two messages disagreed.
    //
    // Now the loser writes nothing and hears about it: `StaleWriteError`
    // is the class the actions already translate into « a changé
    // entre-temps. Rechargez la page. »
    const { changes } = await run(
      "UPDATE reservations SET state = ?, updated_at = ? WHERE id = ? AND venue_id = ? AND state = ?",
      to,
      at,
      reservationId,
      venueId,
      from,
    );
    if (changes === 0) throw new StaleWriteError("La réservation");

    await run(
      `INSERT INTO reservation_status_history
         (id, reservation_id, from_state, to_state, actor, actor_id, reason_code, note, at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      // The id carried only the reservation and the millisecond, so two
      // transitions inside the same millisecond collided on the primary
      // key. A short random suffix costs nothing and cannot.
      `sh_${reservationId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      reservationId,
      from,
      to,
      actor,
      reasonCode ?? null,
      note ?? null,
      at,
    );
  });
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

// ── What the venue can still offer ───────────────────────────

/**
 * The times a booking can be moved to on one day.
 *
 * Built from the venue's own service definitions — the weekdays each
 * service runs, its opening time, the last booking it accepts and the
 * grid it seats on — so « within the venue's slots » is the venue's
 * answer and not a guess. A closure on that date empties the list
 * rather than offering times behind a locked door.
 *
 * Returns ISO instants, because the sheet shows them and the write
 * stores them: a bare "20:30" would be re-interpreted by whichever
 * clock read it next, which is the bug the venue timezone already cost
 * us once.
 */
export async function bookableSlots(
  venueId: string,
  date: string,
): Promise<{ at: string; serviceLabel: string }[]> {
  const closed = await one(
    "SELECT id FROM closures WHERE venue_id = ? AND date = ?",
    venueId,
    date,
  );
  if (closed) return [];

  // ISO weekday: 1 Monday … 7 Sunday, which is what `weekdays` stores.
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const weekday = day === 0 ? 7 : day;

  const services = await all(
    `SELECT name, weekdays, starts_at, last_booking_at, slot_minutes
       FROM service_definitions
      WHERE venue_id = ? AND enabled = 1
      ORDER BY starts_at`,
    venueId,
  );

  const out: { at: string; serviceLabel: string }[] = [];
  for (const s of services) {
    const days = String(s.weekdays)
      .split(",")
      .map((d) => Number(d.trim()));
    if (!days.includes(weekday)) continue;

    const step = asSlotMinutes(s.slot_minutes);
    const start = minutesOf(String(s.starts_at));
    // A service that closes after midnight — a bar's « Nuit » runs to
    // 02:00 — has a last booking earlier in the clock than its start.
    // The window is still real, so it is measured forward rather than
    // discarded.
    const last =
      minutesOf(String(s.last_booking_at)) < start
        ? minutesOf(String(s.last_booking_at)) + 24 * 60
        : minutesOf(String(s.last_booking_at));

    for (let m = start; m <= last; m += step) {
      const at = fromZonedTime(
        `${date} ${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}:00`,
        VENUE_TIME_ZONE,
      );
      // Past midnight belongs to the next calendar day, which is what
      // the guest was told and what the book has to file it under.
      if (m >= 24 * 60) at.setDate(at.getDate() + 1);
      out.push({ at: at.toISOString(), serviceLabel: String(s.name) });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Moves a booking, and tells the guest.
 *
 * **The state does not change**, and that is deliberate. The schema has
 * a `modified` state and it was tempting to write it, but moving a
 * booking answers a question about *when*, not about *whether*: a
 * request that is moved is still a request waiting for the venue's
 * answer, and an accepted booking that is moved is still accepted. A
 * reschedule that silently accepted a pending request would be the venue
 * agreeing to a table it had not agreed to.
 *
 * The history entry therefore records the same state on both sides, with
 * the old time in the note — because « décalée » with no before is an
 * audit trail that cannot answer the only question anyone asks of it.
 *
 * The message is logged in `messages_log` like every other outbound: a
 * notification the portal claims to have sent and cannot show is not a
 * notification.
 */
export async function rescheduleBooking(
  venueId: string,
  reservationId: string,
  at: string,
): Promise<{ moved: boolean; reason?: "not_found" | "settled" | "changed" }> {
  const current = await one(
    `SELECT r.state, r.at, r.guest_name, r.guest_phone, r.customer_id, c.email
       FROM reservations r
       LEFT JOIN customers c ON c.id = r.customer_id
      WHERE r.id = ? AND r.venue_id = ?`,
    reservationId,
    venueId,
  );
  if (!current) return { moved: false, reason: "not_found" };
  // A party already seated, gone, or refused is not moved: the time on
  // it is a record of what happened, not a plan.
  const settled = ["arrived", "completed", "no_show", "cancelled", "rejected"];
  if (settled.includes(String(current.state))) {
    return { moved: false, reason: "settled" };
  }

  const now = new Date().toISOString();
  const wasAt = String(current.at);

  let moved = true;
  await transaction(async () => {
    // Conditional on the hour this transaction read, like every other
    // write on a booking. Two hosts moving the same table to two
    // different times both used to succeed — the book kept whichever
    // landed last, and the guest received two messages naming two
    // hours. The loser now writes nothing and says so.
    const { changes } = await run(
      `UPDATE reservations SET at = ?, updated_at = ?
        WHERE id = ? AND venue_id = ? AND at = ? AND state = ?`,
      at,
      now,
      reservationId,
      venueId,
      wasAt,
      String(current.state),
    );
    if (changes === 0) {
      moved = false;
      return;
    }
    await run(
      `INSERT INTO reservation_status_history
         (id, reservation_id, from_state, to_state, actor, actor_id, reason_code, note, at)
       VALUES (?, ?, ?, ?, 'venue', NULL, 'rescheduled', ?, ?)`,
      `sh_${reservationId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      reservationId,
      String(current.state),
      String(current.state),
      `de ${wasAt} à ${at}`,
      now,
    );
    const email = current.email ? String(current.email) : "";
    await run(
      `INSERT INTO messages_log
         (id, venue_id, customer_id, reservation_id, channel, kind, recipient,
          preview, status, failure_reason, at)
       VALUES (?, ?, ?, ?, ?, 'reservation_decalee', ?, ?, 'envoye', '', ?)`,
      `ml_${reservationId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      venueId,
      current.customer_id ?? null,
      reservationId,
      email ? "email" : "sms",
      email || String(current.guest_phone),
      `Votre réservation est décalée à ${formatInTimeZone(
        new Date(at),
        VENUE_TIME_ZONE,
        "HH'h'mm 'le' d MMMM",
      )}.`,
      now,
    );
  });

  // `changed` rather than `settled`: nothing is wrong with the booking,
  // somebody else moved it first.
  return moved ? { moved: true } : { moved: false, reason: "changed" };
}

// ── Finding a booking ────────────────────────────────────────

/**
 * Finds a booking anywhere in the venue's book.
 *
 * The chrome's search box used to filter the rows already on screen,
 * which answers « where is Bennani in tonight's service » and nothing
 * else. The question a host actually asks is « where is Bennani », and
 * the answer is often on another day — so this looks across the whole
 * book and the caller groups what comes back by day.
 *
 * Three ways in, because they are the three things a host has in hand:
 *
 *  · **a name**, matched case-insensitively anywhere in it;
 *  · **a phone number**, matched on digits only, which is what makes
 *    « 4418 » find `+212 661 20 44 18` — the last four digits are how a
 *    guest reads their own number back over the phone, and the spaces in
 *    the stored form are why a plain LIKE never found them;
 *  · **a date**, when the query parses as one.
 *
 * Capped, and deliberately: a host searching « a » wants the box to stop
 * being useful, not to wait for four hundred rows.
 */
export async function searchReservations(
  venueId: string,
  query: string,
): Promise<Reservation[]> {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];

  const digits = term.replace(/\D/g, "");
  const date = parseQueryDate(term);

  const rows = await all(
    `SELECT r.*, c.visit_count, c.email AS guest_email, c.birth_year
       FROM reservations r
       LEFT JOIN customers c ON c.id = r.customer_id
      WHERE r.venue_id = ?
        AND (
          lower(r.guest_name) LIKE ?
          OR (? <> '' AND replace(replace(replace(replace(r.guest_phone, ' ', ''), '-', ''), '+', ''), '.', '') LIKE ?)
          OR (? <> '' AND substr(r.at, 1, 10) = ?)
        )
      ORDER BY r.at DESC
      LIMIT 60`,
    venueId,
    `%${term}%`,
    digits,
    `%${digits}%`,
    date ?? "",
    date ?? "",
  );
  return rows.map(reservationRow);
}

/**
 * A date in a search box, in the two shapes people type it.
 *
 * `2026-09-25` because that is what a machine wrote, and `25/09` or
 * `25/09/2026` because that is what a person writes. A bare `25` is
 * deliberately not a date: it is far more often a party size or part of
 * a phone number, and guessing wrong empties the results.
 */
function parseQueryDate(term: string): string | null {
  const iso = term.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = term.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const [, d, m, y] = slash;
    const year = y
      ? y.length === 2
        ? 2000 + Number(y)
        : Number(y)
      : new Date().getFullYear();
    return `${year}-${pad(Number(m))}-${pad(Number(d))}`;
  }
  return null;
}
