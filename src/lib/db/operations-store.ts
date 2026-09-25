import { asSlotMinutes } from "@/lib/types/venue-operations";
import "server-only";

// Venue-scoped reads for the rest of the perimeter.
//
// Same rule as `venue-store.ts`: every function takes a venueId and
// every statement carries it in the WHERE clause. Nothing here can be
// asked for another venue's rows by omitting a filter, because there is
// no unscoped query in the file.
//
// The reads are grouped into six bundles rather than exposed one table
// at a time. A screen asks for the bundle it needs and gets a coherent
// snapshot; the alternative is a screen whose hero and list were read a
// second apart and disagree.

import type {
  Briefing,
  BriefingGuest,
  CalendarDay,
  Campaign,
  CancellationEntry,
  CancellationPolicy,
  Deposit,
  DepositPolicy,
  DepositStatus,
  Experience,
  GuestGraph,
  GuestList,
  GuestSegment,
  GuestTag,
  Growth,
  LoggedMessage,
  Marketing,
  MoneyDesk,
  Nightlife,
  Offer,
  PacingRules,
  Promoter,
  ServiceDefinition,
  ServiceFloor,
  Subscription,
  SupportTicket,
  SurveyConfig,
  TableReservation,
  TableType,
  Transaction,
  VenueConfiguration,
  VenueSettings,
  WaitlistParty,
  WaitlistSettings,
} from "@/lib/types/venue-operations";
import { all, bool, one, toMad } from "./store";

// ── Small shared helpers ─────────────────────────────────────

const text = (v: unknown): string => (v == null ? "" : String(v));
const orNull = (v: unknown): string | null => (v == null ? null : String(v));
/** "1,2,5" → [1, 2, 5]. Weekday lists are stored as text for portability. */
const weekdayList = (raw: unknown): number[] =>
  text(raw)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n >= 1 && n <= 7);

function jsonValue<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// ── 1. Service floor ─────────────────────────────────────────

export async function waitlistSettings(venueId: string): Promise<WaitlistSettings> {
  const row = await one("SELECT * FROM waitlist_settings WHERE venue_id = ?", venueId);
  // A venue with no row has never touched the door settings; the defaults
  // are the ones the schema declares, not an error.
  return {
    onlineOpen: row ? bool(row.online_open as number) : true,
    maxPartyOnline: row ? Number(row.max_party_online) : 6,
    defaultQuoteMinutes: row ? Number(row.default_quote_min) : 20,
    pausedReason: text(row?.paused_reason),
    updatedAt: text(row?.updated_at) || new Date().toISOString(),
  };
}

export async function waitlist(venueId: string): Promise<WaitlistParty[]> {
  return (await all(
    `SELECT * FROM waitlist WHERE venue_id = ? ORDER BY added_at`,
    venueId,
  )).map((r) => ({
    id: String(r.id),
    customerId: orNull(r.customer_id),
    guestName: String(r.guest_name),
    guestPhone: text(r.guest_phone),
    partySize: Number(r.party_size),
    quotedMinutes: Number(r.quoted_minutes),
    addedAt: String(r.added_at),
    notifiedAt: orNull(r.notified_at),
    seatedAt: orNull(r.seated_at),
    removedAt: orNull(r.removed_at),
    source: String(r.source) as WaitlistParty["source"],
    status: String(r.status) as WaitlistParty["status"],
    removalReason: orNull(r.removal_reason) as WaitlistParty["removalReason"],
    note: text(r.note),
    reservationId: orNull(r.reservation_id),
  }));
}

export async function shiftNotes(venueId: string, date: string) {
  return (await all(
    `SELECT * FROM shift_notes WHERE venue_id = ? AND date = ?
      ORDER BY pinned DESC, created_at DESC`,
    venueId,
    date,
  )).map((r) => ({
    id: String(r.id),
    serviceId: orNull(r.service_id),
    date: String(r.date),
    authorId: String(r.author_id),
    author: String(r.author),
    body: String(r.body),
    pinned: bool(r.pinned as number),
    createdAt: String(r.created_at),
  }));
}

/**
 * Everything the team reads before doors open, for the venue's next (or
 * current) service. Joined here rather than in the screen so the tags,
 * preferences, history and deposit state of one guest arrive together.
 */
export async function briefing(venueId: string): Promise<Briefing> {
  // The same service Accueil leads with: the one running, else the next
  // due, else the last one held. Ordering by nearest midpoint instead
  // briefed the team on a service that had already closed.
  const service = await one(
    `SELECT id, label, date FROM services
      WHERE venue_id = ?
      ORDER BY
        CASE
          WHEN datetime(opens_at) <= datetime('now')
           AND datetime(closes_at) >= datetime('now') THEN 0
          WHEN datetime(opens_at) > datetime('now') THEN 1
          ELSE 2
        END,
        ABS(julianday(opens_at) - julianday('now'))
      LIMIT 1`,
    venueId,
  );
  const date = text(service?.date) || isoDay(new Date());

  const rows = await all(
    `SELECT r.id, r.customer_id, r.guest_name, r.party_size, r.at, r.note,
            z.name AS zone_name,
            c.visit_count AS visit_count,
            (SELECT COUNT(*) FROM no_show_records n WHERE n.customer_id = r.customer_id)
              AS no_show_count,
            (SELECT d.status FROM deposits d WHERE d.reservation_id = r.id
               ORDER BY d.requested_at DESC LIMIT 1) AS deposit_status
       FROM reservations r
       LEFT JOIN zones z ON z.id = r.zone_id
       LEFT JOIN customers c ON c.id = r.customer_id
      WHERE r.venue_id = ?
        AND r.state IN ('requested','confirmed','modified','arrived')
        AND date(r.at) = ?
      ORDER BY r.at`,
    venueId,
    date,
  );

  const tagsByCustomer = await customerTagLabels(venueId);
  const prefsByCustomer = await customerPreferences(venueId);

  const guests: BriefingGuest[] = rows.map((r) => {
    const customerId = orNull(r.customer_id);
    return {
      reservationId: String(r.id),
      customerId,
      guestName: String(r.guest_name),
      partySize: Number(r.party_size),
      at: String(r.at),
      zone: orNull(r.zone_name),
      tags: customerId ? (tagsByCustomer[customerId] ?? []) : [],
      preferences: customerId ? (prefsByCustomer[customerId] ?? []) : [],
      note: orNull(r.note),
      visitCount: Number(r.visit_count ?? 0),
      noShowCount: Number(r.no_show_count ?? 0),
      depositStatus: orNull(r.deposit_status) as DepositStatus | null,
    };
  });

  return {
    serviceId: orNull(service?.id),
    serviceLabel: text(service?.label) || "Prochain service",
    date,
    covers: guests.reduce((sum, g) => sum + g.partySize, 0),
    bookings: guests.length,
    notes: await shiftNotes(venueId, date),
    guests,
  };
}

/**
 * Ninety days of load, from four weeks back — enough for the week view to
 * page backwards and the month view to show a full grid either side.
 */
export async function calendar(venueId: string): Promise<CalendarDay[]> {
  const venue = await one("SELECT capacity FROM venues WHERE id = ?", venueId);
  const baseCapacity = Number(venue?.capacity ?? 0);

  const load = new Map<string, { covers: number; bookings: number }>();
  for (const r of await all(
    `SELECT date(at) AS d, SUM(party_size) AS covers, COUNT(*) AS bookings
       FROM reservations
      WHERE venue_id = ?
        AND state IN ('requested','confirmed','modified','arrived','completed')
      GROUP BY date(at)`,
    venueId,
  )) {
    load.set(String(r.d), {
      covers: Number(r.covers ?? 0),
      bookings: Number(r.bookings ?? 0),
    });
  }

  const closures = new Map<string, string>();
  for (const r of await all("SELECT date, reason FROM closures WHERE venue_id = ?", venueId)) {
    closures.set(String(r.date), text(r.reason));
  }

  const overrides = new Map<string, { capacity: number; note: string }>();
  for (const r of await all(
    "SELECT date, capacity, note FROM capacity_overrides WHERE venue_id = ?",
    venueId,
  )) {
    overrides.set(String(r.date), {
      capacity: Number(r.capacity),
      note: text(r.note),
    });
  }

  // Markers. An offer or an experience on a day is why a manager opens it.
  // An offer marks a day only when it actually runs that day: the range
  // says which fortnight, the weekdays say which evenings inside it.
  const offerDays = (await all(
    "SELECT id, starts_on, ends_on, weekdays FROM offers WHERE venue_id = ? AND status IN ('active','scheduled')",
    venueId,
  )).map((o) => ({
    id: String(o.id),
    startsOn: String(o.starts_on),
    endsOn: String(o.ends_on),
    weekdays: new Set(
      text(o.weekdays)
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => n >= 1 && n <= 7),
    ),
  }));
  const experienceDays = new Map<string, string[]>();
  for (const r of await all(
    "SELECT id, date(starts_at) AS d FROM experiences WHERE venue_id = ? AND status <> 'brouillon'",
    venueId,
  )) {
    const key = String(r.d);
    experienceDays.set(key, [...(experienceDays.get(key) ?? []), String(r.id)]);
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 28);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 90; i += 1) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const date = isoDay(d);
    const override = overrides.get(date);
    const dayLoad = load.get(date);
    days.push({
      date,
      covers: dayLoad?.covers ?? 0,
      bookings: dayLoad?.bookings ?? 0,
      capacity: override?.capacity ?? baseCapacity,
      closed: closures.has(date),
      closureReason: closures.get(date) ?? "",
      capacityOverride: override?.capacity ?? null,
      capacityNote: override?.note ?? "",
      offerIds: offerDays
        .filter(
          (o) =>
            o.startsOn <= date &&
            date <= o.endsOn &&
            (o.weekdays.size === 0 || o.weekdays.has(((d.getDay() + 6) % 7) + 1)),
        )
        .map((o) => o.id),
      experienceIds: experienceDays.get(date) ?? [],
    });
  }
  return days;
}

export async function serviceFloor(venueId: string): Promise<ServiceFloor> {
  return {
    waitlist: await waitlist(venueId),
    waitlistSettings: await waitlistSettings(venueId),
    briefing: await briefing(venueId),
    calendar: await calendar(venueId),
  };
}

// ── 2. Availability configuration ────────────────────────────

export async function serviceDefinitions(venueId: string): Promise<ServiceDefinition[]> {
  const zonesByService = new Map<string, string[]>();
  for (const r of await all(
    `SELECT sz.service_definition_id AS sid, sz.zone_id AS zid
       FROM service_zones sz
       JOIN service_definitions sd ON sd.id = sz.service_definition_id
      WHERE sd.venue_id = ?`,
    venueId,
  )) {
    const key = String(r.sid);
    zonesByService.set(key, [...(zonesByService.get(key) ?? []), String(r.zid)]);
  }

  return (await all(
    "SELECT * FROM service_definitions WHERE venue_id = ? ORDER BY position",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    kind: String(r.kind),
    weekdays: weekdayList(r.weekdays),
    startsAt: String(r.starts_at),
    endsAt: String(r.ends_at),
    lastBookingAt: String(r.last_booking_at),
    capacityCovers: Number(r.capacity_covers),
    coversPerQuarter: Number(r.covers_per_quarter),
    slotMinutes: asSlotMinutes(r.slot_minutes),
    turnMinutesSmall: Number(r.turn_minutes_small),
    turnMinutesLarge: Number(r.turn_minutes_large),
    zoneIds: zonesByService.get(String(r.id)) ?? [],
    enabled: bool(r.enabled as number),
    version: Number(r.version),
    updatedAt: String(r.updated_at),
  }));
}

export async function pacingRules(venueId: string): Promise<PacingRules> {
  const r = await one("SELECT * FROM pacing_rules WHERE venue_id = ?", venueId);
  return {
    maxArrivalsPerQuarter: Number(r?.max_arrivals_quarter ?? 12),
    maxCoversPerService: Number(r?.max_covers_service ?? 0),
    maxPartyOnline: Number(r?.max_party_online ?? 8),
    minPartyOnline: Number(r?.min_party_online ?? 1),
    requestOnlyAbove: Number(r?.request_only_above ?? 8),
    bookingWindowDays: Number(r?.booking_window_days ?? 60),
    sameDayCutoff: text(r?.same_day_cutoff) || "18:00",
    minLeadMinutes: Number(r?.min_lead_minutes ?? 60),
    onlineBookingOpen: r ? bool(r.online_booking_open as number) : true,
    reopenAt: orNull(r?.reopen_at),
    version: Number(r?.version ?? 1),
    updatedAt: text(r?.updated_at) || new Date().toISOString(),
  };
}

// ── 3. Guest vocabulary ──────────────────────────────────────

/** Tag ids per customer. One read, so a list does not cost N queries. */
async function customerTagIds(venueId: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const r of await all(
    "SELECT customer_id, tag_id FROM customer_tags WHERE venue_id = ?",
    venueId,
  )) {
    const key = String(r.customer_id);
    (out[key] ??= []).push(String(r.tag_id));
  }
  return out;
}

/** The same, resolved to labels — what a briefing row actually prints. */
async function customerTagLabels(venueId: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const r of await all(
    `SELECT ct.customer_id AS cid, t.label AS label
       FROM customer_tags ct JOIN tags t ON t.id = ct.tag_id
      WHERE ct.venue_id = ? AND t.archived = 0
      ORDER BY t.position`,
    venueId,
  )) {
    const key = String(r.cid);
    (out[key] ??= []).push(String(r.label));
  }
  return out;
}

async function customerPreferences(venueId: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const r of await all(
    `SELECT cp.customer_id AS cid, cp.label AS label
       FROM customer_preferences cp
       JOIN customers c ON c.id = cp.customer_id
      WHERE c.venue_id = ?`,
    venueId,
  )) {
    const key = String(r.cid);
    (out[key] ??= []).push(String(r.label));
  }
  return out;
}

export async function guestGraph(venueId: string): Promise<GuestGraph> {
  const usage = new Map<string, number>();
  for (const r of await all(
    "SELECT tag_id, COUNT(*) AS n FROM customer_tags WHERE venue_id = ? GROUP BY tag_id",
    venueId,
  )) {
    usage.set(String(r.tag_id), Number(r.n));
  }

  const tags: GuestTag[] = (await all(
    "SELECT * FROM tags WHERE venue_id = ? ORDER BY position",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    label: String(r.label),
    colour: String(r.colour),
    origin: String(r.origin) as GuestTag["origin"],
    staffVisible: bool(r.staff_visible as number),
    archived: bool(r.archived as number),
    usageCount: usage.get(String(r.id)) ?? 0,
  }));

  const labels = new Map(tags.map((t) => [t.id, t.label]));

  const rules = (await all(
    "SELECT * FROM tag_rules WHERE venue_id = ?",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    tagId: String(r.tag_id),
    tagLabel: labels.get(String(r.tag_id)) ?? "",
    rule: String(r.rule) as GuestGraph["rules"][number]["rule"],
    // A spend floor is money and crosses in MAD; a visit count is not.
    threshold:
      String(r.rule) === "gros_panier"
        ? toMad(Number(r.threshold))
        : Number(r.threshold),
    windowDays: Number(r.window_days),
    enabled: bool(r.enabled as number),
  }));

  const segments: GuestSegment[] = (await all(
    "SELECT * FROM segments WHERE venue_id = ? ORDER BY name",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: text(r.description),
    criteria: jsonValue<Record<string, unknown>>(r.criteria, {}),
    memberCount: Number(r.member_count),
    updatedAt: String(r.updated_at),
  }));

  return { tags, rules, segments, tagsByCustomer: await customerTagIds(venueId) };
}

// ── 4. Growth ────────────────────────────────────────────────

export async function growth(venueId: string): Promise<Growth> {
  const attribution = new Map<string, { reservations: number; covers: number }>();
  for (const r of await all(
    `SELECT offer_id, COUNT(*) AS n, SUM(covers) AS covers
       FROM offer_redemptions WHERE venue_id = ? GROUP BY offer_id`,
    venueId,
  )) {
    attribution.set(String(r.offer_id), {
      reservations: Number(r.n ?? 0),
      covers: Number(r.covers ?? 0),
    });
  }

  const offers: Offer[] = (await all(
    "SELECT * FROM offers WHERE venue_id = ? ORDER BY starts_on DESC",
    venueId,
  )).map((r) => {
    const kind = String(r.kind) as Offer["kind"];
    const attributed = attribution.get(String(r.id));
    return {
      id: String(r.id),
      name: String(r.name),
      kind,
      // `percent` is percentage points; the other kinds are money.
      value: kind === "percent" ? Number(r.value) : toMad(Number(r.value)),
      freeItemLabel: text(r.free_item_label),
      weekdays: weekdayList(r.weekdays),
      serviceIds: jsonValue<string[]>(r.service_ids, []),
      startsOn: String(r.starts_on),
      endsOn: String(r.ends_on),
      coverCap: Number(r.cover_cap),
      minParty: Number(r.min_party),
      prepaymentRequired: bool(r.prepayment_required as number),
      channel: String(r.channel),
      status: String(r.status) as Offer["status"],
      reservationsAttributed: attributed?.reservations ?? 0,
      coversAttributed: attributed?.covers ?? 0,
    };
  });

  const addonsByExperience = new Map<string, Experience["addons"]>();
  for (const r of await all(
    `SELECT * FROM experience_addons WHERE venue_id = ? ORDER BY position`,
    venueId,
  )) {
    const key = String(r.experience_id);
    addonsByExperience.set(key, [
      ...(addonsByExperience.get(key) ?? []),
      {
        id: String(r.id),
        label: String(r.label),
        priceMad: toMad(Number(r.price_cents)),
      },
    ]);
  }

  const ticketsByExperience = new Map<string, Experience["tickets"]>();
  for (const r of await all(
    "SELECT * FROM tickets WHERE venue_id = ? ORDER BY purchased_at",
    venueId,
  )) {
    const key = String(r.experience_id);
    ticketsByExperience.set(key, [
      ...(ticketsByExperience.get(key) ?? []),
      {
        id: String(r.id),
        customerId: orNull(r.customer_id),
        guestName: String(r.guest_name),
        guestPhone: text(r.guest_phone),
        seats: Number(r.seats),
        addonIds: jsonValue<string[]>(r.addons, []),
        amountMad: toMad(Number(r.amount_cents)),
        status: String(r.status) as Experience["tickets"][number]["status"],
        qrCode: orNull(r.qr_code),
        checkedInAt: orNull(r.checked_in_at),
        purchasedAt: String(r.purchased_at),
      },
    ]);
  }

  const experiences: Experience[] = (await all(
    "SELECT * FROM experiences WHERE venue_id = ? ORDER BY starts_at DESC",
    venueId,
  )).map((r) => {
    const id = String(r.id);
    const tickets = ticketsByExperience.get(id) ?? [];
    const live = tickets.filter((t) => t.status !== "annule" && t.status !== "rembourse");
    return {
      id,
      title: String(r.title),
      description: text(r.description),
      status: String(r.status) as Experience["status"],
      startsAt: String(r.starts_at),
      endsAt: String(r.ends_at),
      recurrence: text(r.recurrence),
      capacity: Number(r.capacity),
      priceMad: toMad(Number(r.price_cents)),
      prepayPercent: Number(r.prepay_percent),
      cancellationTerms: text(r.cancellation_terms),
      addons: addonsByExperience.get(id) ?? [],
      tickets,
      seatsSold: live.reduce((sum, t) => sum + t.seats, 0),
      revenueMad: live.reduce((sum, t) => sum + t.amountMad, 0),
    };
  });

  return { offers, experiences };
}

// ── 5. Money ─────────────────────────────────────────────────

export async function moneyDesk(venueId: string): Promise<MoneyDesk> {
  const depositPolicies: DepositPolicy[] = (await all(
    "SELECT * FROM deposit_policies WHERE venue_id = ? ORDER BY position",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    appliesTo: String(r.applies_to) as DepositPolicy["appliesTo"],
    appliesValue: text(r.applies_value),
    mode: String(r.mode) as DepositPolicy["mode"],
    amountMad: toMad(Number(r.amount_cents)),
    noShowFeeMad: toMad(Number(r.no_show_fee_cents)),
    lateCancelFeeMad: toMad(Number(r.late_cancel_fee_cents)),
    graceMinutes: Number(r.grace_minutes),
    enabled: bool(r.enabled as number),
    version: Number(r.version),
  }));

  const deposits: Deposit[] = (await all(
    "SELECT * FROM deposits WHERE venue_id = ? ORDER BY requested_at DESC",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    policyId: orNull(r.policy_id),
    reservationId: orNull(r.reservation_id),
    ticketId: orNull(r.ticket_id),
    customerId: orNull(r.customer_id),
    guestName: String(r.guest_name),
    amountMad: toMad(Number(r.amount_cents)),
    status: String(r.status) as DepositStatus,
    processorRef: orNull(r.processor_ref),
    requestedAt: String(r.requested_at),
    paidAt: orNull(r.paid_at),
    settledAt: orNull(r.settled_at),
    failureReason: text(r.failure_reason),
  }));

  const c = await one("SELECT * FROM cancellation_policies WHERE venue_id = ?", venueId);
  const cancellationPolicy: CancellationPolicy = {
    freeUntilHours: Number(c?.free_until_hours ?? 24),
    lateFeeMad: toMad(Number(c?.late_fee_cents ?? 0)),
    noShowFeeMad: toMad(Number(c?.no_show_fee_cents ?? 0)),
    guestMessage: text(c?.guest_message),
    version: Number(c?.version ?? 1),
    updatedAt: text(c?.updated_at) || new Date().toISOString(),
  };

  const cancellations: CancellationEntry[] = (await all(
    "SELECT * FROM cancellation_log WHERE venue_id = ? ORDER BY at DESC",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    reservationId: orNull(r.reservation_id),
    guestName: String(r.guest_name),
    kind: String(r.kind) as CancellationEntry["kind"],
    actor: String(r.actor) as CancellationEntry["actor"],
    reason: text(r.reason),
    feeMad: toMad(Number(r.fee_cents)),
    waived: bool(r.waived as number),
    disputed: bool(r.disputed as number),
    at: String(r.at),
  }));

  const transactions: Transaction[] = (await all(
    "SELECT * FROM transactions WHERE venue_id = ? ORDER BY at DESC",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    customerId: orNull(r.customer_id),
    reservationId: orNull(r.reservation_id),
    payoutId: orNull(r.payout_id),
    amountMad: toMad(Number(r.amount_cents)),
    feeMad: toMad(Number(r.fee_cents)),
    method: String(r.method) as Transaction["method"],
    status: String(r.status) as Transaction["status"],
    processorRef: orNull(r.processor_ref),
    at: String(r.at),
  }));

  return {
    depositPolicies,
    deposits,
    cancellationPolicy,
    cancellations,
    transactions,
    // The single fact every spend tile in the portal keys off.
    hasTransactionSource: transactions.length > 0,
  };
}

/**
 * Spend per customer, from transactions alone.
 *
 * Deliberately not derived from `customers.total_spend_cents`: that
 * column is a rollup whose provenance is unclear, and the spec is
 * explicit that spend appears only where a transaction source exists.
 * A venue with no Lyfe Pay gets an empty map and every tile hides.
 */
export async function spendByCustomer(venueId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const r of await all(
    `SELECT customer_id, SUM(amount_cents) AS total
       FROM transactions
      WHERE venue_id = ? AND customer_id IS NOT NULL AND status = 'reussie'
      GROUP BY customer_id`,
    venueId,
  )) {
    out[String(r.customer_id)] = toMad(Number(r.total ?? 0));
  }
  return out;
}

// ── 6. Vie nocturne ──────────────────────────────────────────

export async function nightlife(venueId: string): Promise<Nightlife> {
  const promoterNames = new Map<string, string>();
  for (const r of await all("SELECT id, full_name FROM promoters WHERE venue_id = ?", venueId)) {
    promoterNames.set(String(r.id), String(r.full_name));
  }

  const bandsByList = new Map<string, GuestList["bands"]>();
  for (const r of await all(
    "SELECT * FROM guest_list_bands WHERE venue_id = ? ORDER BY position",
    venueId,
  )) {
    const key = String(r.guest_list_id);
    bandsByList.set(key, [
      ...(bandsByList.get(key) ?? []),
      {
        id: String(r.id),
        label: String(r.label),
        untilAt: String(r.until_at),
        priceMad: toMad(Number(r.price_cents)),
        appliesTo: text(r.applies_to),
      },
    ]);
  }

  const entriesByList = new Map<string, GuestList["entries"]>();
  for (const r of await all(
    "SELECT * FROM guest_list_entries WHERE venue_id = ? ORDER BY guest_name",
    venueId,
  )) {
    const key = String(r.guest_list_id);
    const promoterId = orNull(r.promoter_id);
    entriesByList.set(key, [
      ...(entriesByList.get(key) ?? []),
      {
        id: String(r.id),
        customerId: orNull(r.customer_id),
        guestName: String(r.guest_name),
        guestPhone: text(r.guest_phone),
        partySize: Number(r.party_size),
        source: String(r.source) as GuestList["entries"][number]["source"],
        promoterId,
        promoterName: promoterId ? (promoterNames.get(promoterId) ?? null) : null,
        qrCode: orNull(r.qr_code),
        checkedInAt: orNull(r.checked_in_at),
        checkedInCount: Number(r.checked_in_count),
        addedAt: String(r.added_at),
      },
    ]);
  }

  const guestLists: GuestList[] = (await all(
    "SELECT * FROM guest_lists WHERE venue_id = ? ORDER BY night DESC",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    night: String(r.night),
    capacity: Number(r.capacity),
    cutoffAt: String(r.cutoff_at),
    status: String(r.status) as GuestList["status"],
    bands: bandsByList.get(String(r.id)) ?? [],
    entries: entriesByList.get(String(r.id)) ?? [],
  }));

  const minimumsByType = new Map<string, TableType["minimums"]>();
  for (const r of await all(
    `SELECT * FROM table_offers WHERE venue_id = ? ORDER BY night_kind`,
    venueId,
  )) {
    const key = String(r.table_type_id);
    minimumsByType.set(key, [
      ...(minimumsByType.get(key) ?? []),
      { nightKind: String(r.night_kind), minimumMad: toMad(Number(r.minimum_cents)) },
    ]);
  }

  const tableTypes: TableType[] = (await all(
    "SELECT * FROM table_types WHERE venue_id = ? ORDER BY position",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    count: Number(r.count),
    minGuests: Number(r.min_guests),
    maxGuests: Number(r.max_guests),
    depositPercent: Number(r.deposit_percent),
    packageLabel: text(r.package),
    cancellationHours: Number(r.cancellation_hours),
    minimums: minimumsByType.get(String(r.id)) ?? [],
  }));

  const typeNames = new Map(tableTypes.map((t) => [t.id, t.name]));

  const tableReservations: TableReservation[] = (await all(
    `SELECT tr.*, d.status AS deposit_status
       FROM table_reservations tr
       LEFT JOIN deposits d ON d.id = tr.deposit_id
      WHERE tr.venue_id = ? ORDER BY tr.night DESC, tr.at`,
    venueId,
  )).map((r) => {
    const promoterId = orNull(r.promoter_id);
    return {
      id: String(r.id),
      tableTypeId: String(r.table_type_id),
      tableTypeName: typeNames.get(String(r.table_type_id)) ?? "",
      customerId: orNull(r.customer_id),
      promoterId,
      promoterName: promoterId ? (promoterNames.get(promoterId) ?? null) : null,
      guestName: String(r.guest_name),
      guestPhone: text(r.guest_phone),
      partySize: Number(r.party_size),
      night: String(r.night),
      at: String(r.at),
      minimumMad: toMad(Number(r.minimum_cents)),
      // Left null rather than coerced: an unknown spend must not read
      // as a table that spent nothing.
      reachedMad: r.reached_cents == null ? null : toMad(Number(r.reached_cents)),
      status: String(r.status) as TableReservation["status"],
      depositId: orNull(r.deposit_id),
      depositStatus: orNull(r.deposit_status) as DepositStatus | null,
    };
  });

  const hasSpend =
    Number(
      (await one("SELECT COUNT(*) AS n FROM transactions WHERE venue_id = ?", venueId))?.n ?? 0,
    ) > 0;

  const promoters: Promoter[] = (await all(
    "SELECT * FROM promoters WHERE venue_id = ? ORDER BY active DESC, full_name",
    venueId,
  )).map((r) => {
    const id = String(r.id);
    const entries = guestLists.flatMap((l) =>
      l.entries.filter((e) => e.promoterId === id),
    );
    const tables = tableReservations.filter((t) => t.promoterId === id);
    return {
      id,
      fullName: String(r.full_name),
      phone: text(r.phone),
      code: String(r.code),
      commissionPercent: Number(r.commission_percent),
      active: bool(r.active as number),
      entriesBrought: entries.length,
      guestsBrought: entries.reduce((sum, e) => sum + e.partySize, 0),
      checkedIn: entries.reduce((sum, e) => sum + e.checkedInCount, 0),
      tablesBrought: tables.length,
      // Attributed revenue needs a transaction source. Where there is
      // none, this stays null and the column hides.
      revenueAttributedMad: hasSpend
        ? tables.reduce((sum, t) => sum + (t.reachedMad ?? 0), 0)
        : null,
    };
  });

  return { guestLists, promoters, tableTypes, tableReservations };
}

// ── 7. Marketing ─────────────────────────────────────────────

export async function marketing(venueId: string): Promise<Marketing> {
  const segmentNames = new Map<string, string>();
  for (const r of await all("SELECT id, name FROM segments WHERE venue_id = ?", venueId)) {
    segmentNames.set(String(r.id), String(r.name));
  }

  const campaigns: Campaign[] = (await all(
    "SELECT * FROM campaigns WHERE venue_id = ? ORDER BY created_at DESC",
    venueId,
  )).map((r) => {
    const segmentId = orNull(r.segment_id);
    return {
      id: String(r.id),
      name: String(r.name),
      channel: String(r.channel) as Campaign["channel"],
      template: String(r.template) as Campaign["template"],
      segmentId,
      segmentName: segmentId ? (segmentNames.get(segmentId) ?? null) : null,
      subject: text(r.subject),
      body: text(r.body),
      status: String(r.status) as Campaign["status"],
      automation: text(r.automation) as Campaign["automation"],
      scheduledFor: orNull(r.scheduled_for),
      sentAt: orNull(r.sent_at),
      unitCostMad: toMad(Number(r.unit_cost_cents)),
      recipients: Number(r.recipients),
      delivered: Number(r.delivered),
      opened: Number(r.opened),
      clicked: Number(r.clicked),
      reservationsAttributed: Number(r.reservations_attributed),
      unsubscribed: Number(r.unsubscribed),
    };
  });

  const messages: LoggedMessage[] = (await all(
    "SELECT * FROM messages_log WHERE venue_id = ? ORDER BY at DESC",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    customerId: orNull(r.customer_id),
    campaignId: orNull(r.campaign_id),
    reservationId: orNull(r.reservation_id),
    channel: String(r.channel) as LoggedMessage["channel"],
    kind: String(r.kind),
    recipient: String(r.recipient),
    preview: text(r.preview),
    status: String(r.status) as LoggedMessage["status"],
    failureReason: text(r.failure_reason),
    at: String(r.at),
  }));

  const suppressions = (await all(
    "SELECT * FROM suppression_list WHERE venue_id = ? ORDER BY at DESC",
    venueId,
  )).map((r) => ({
    contact: String(r.contact),
    reason: text(r.reason),
    at: String(r.at),
  }));

  const consentRow = await one(
    `SELECT SUM(CASE WHEN opted_out_of_marketing = 0 THEN 1 ELSE 0 END) AS opted_in,
            SUM(CASE WHEN opted_out_of_marketing = 1 THEN 1 ELSE 0 END) AS opted_out
       FROM customers WHERE venue_id = ?`,
    venueId,
  );

  return {
    campaigns,
    messages,
    suppressions,
    consent: {
      optedIn: Number(consentRow?.opted_in ?? 0),
      optedOut: Number(consentRow?.opted_out ?? 0),
      suppressed: suppressions.length,
    },
  };
}

// ── 8. Reviews configuration ─────────────────────────────────

export async function surveyConfig(venueId: string): Promise<SurveyConfig> {
  const r = await one("SELECT * FROM survey_config WHERE venue_id = ?", venueId);
  return {
    enabled: r ? bool(r.enabled as number) : false,
    sendAfterHours: Number(r?.send_after_hours ?? 3),
    questions: jsonValue<string[]>(r?.questions, []),
    redirectFromRating: Number(r?.redirect_from_rating ?? 4),
    googleUrl: text(r?.google_url),
    tripadvisorUrl: text(r?.tripadvisor_url),
  };
}

// ── 9. Establishment and account ─────────────────────────────

export async function venueSettings(venueId: string): Promise<VenueSettings> {
  const r = await one("SELECT * FROM venue_settings WHERE venue_id = ?", venueId);
  return {
    // A venue with no row has not been configured; `restaurant` is the
    // conservative default because it enables nothing extra.
    configuration: (text(r?.configuration) || "restaurant") as VenueConfiguration,
    legalName: text(r?.legal_name),
    ice: text(r?.ice),
    rc: text(r?.rc),
    billingAddress: text(r?.billing_address),
    iban: text(r?.iban),
    language: text(r?.language) || "fr",
    timezone: text(r?.timezone) || "Africa/Casablanca",
    consentText: text(r?.consent_text),
    retentionMonths: Number(r?.retention_months ?? 36),
    googlePlaceUrl: text(r?.google_place_url),
    instagramHandle: text(r?.instagram_handle),
    whatsappNumber: text(r?.whatsapp_number),
    alertPhone: text(r?.alert_phone),
    alertEmail: text(r?.alert_email),
    dressCode: text(r?.dress_code),
    minimumAge: Number(r?.minimum_age ?? 0),
    apiAccessEnabled: r ? bool(r.api_access_enabled as number) : false,
  };
}

export async function subscription(venueId: string): Promise<Subscription> {
  const r = await one("SELECT * FROM subscriptions WHERE venue_id = ?", venueId);

  const invoices = (await all(
    "SELECT * FROM invoices WHERE venue_id = ? ORDER BY issued_on DESC",
    venueId,
  )).map((row) => ({
    id: String(row.id),
    reference: String(row.reference),
    amountMad: toMad(Number(row.amount_cents)),
    status: String(row.status) as Subscription["invoices"][number]["status"],
    issuedOn: String(row.issued_on),
  }));

  // Usage for the current subscription period, counted rather than stored.
  const usage = await one(
    `SELECT
       (SELECT COUNT(*) FROM reservations WHERE venue_id = ?) AS reservations,
       (SELECT COUNT(*) FROM customers    WHERE venue_id = ?) AS guests,
       (SELECT COUNT(*) FROM messages_log WHERE venue_id = ?) AS messages,
       (SELECT COUNT(*) FROM campaigns    WHERE venue_id = ?) AS campaigns`,
    venueId,
    venueId,
    venueId,
    venueId,
  );

  return {
    plan: text(r?.plan) || "annual",
    status: (text(r?.status) || "actif") as Subscription["status"],
    trialEndsAt: orNull(r?.trial_ends_at),
    renewsAt: orNull(r?.renews_at),
    priceMad: toMad(Number(r?.price_cents ?? 0)),
    paymentMethod: text(r?.payment_method),
    invoices,
    usage: {
      reservations: Number(usage?.reservations ?? 0),
      guests: Number(usage?.guests ?? 0),
      messagesSent: Number(usage?.messages ?? 0),
      campaigns: Number(usage?.campaigns ?? 0),
    },
  };
}

export async function supportTickets(venueId: string): Promise<SupportTicket[]> {
  return (await all(
    "SELECT * FROM support_tickets WHERE venue_id = ? ORDER BY created_at DESC",
    venueId,
  )).map((r) => ({
    id: String(r.id),
    reference: String(r.reference),
    category: String(r.category),
    subject: String(r.subject),
    body: text(r.body),
    status: String(r.status) as SupportTicket["status"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }));
}
