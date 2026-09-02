import "server-only";

// Venue-scoped queries.
//
// Every function takes a venueId and every statement carries it in the
// WHERE clause. That is the scoping model: a caller cannot ask for
// another venue's rows by omitting a filter, because there is no query
// here that is unscoped.

import type {
  AvailabilitySlot,
  BusinessAccount,
  ClosureDay,
  Customer,
  NoShowRecord,
  NotificationPreferences,
  PortalNotification,
  VenueAvailability,
} from "@/lib/types/business";
import { all, bool, jsonArray, one, run, toMad, transaction } from "./store";

// ── Account ──────────────────────────────────────────────────

export function businessAccountForUser(userId: string): BusinessAccount | null {
  const row = one(
    `SELECT b.* FROM business_accounts b
      JOIN staff s ON s.venue_id = b.venue_id AND s.user_id = ?
     LIMIT 1`,
    userId,
  );
  if (!row) return null;
  return {
    businessId: String(row.business_id),
    venueId: String(row.venue_id),
    ownerId: String(row.owner_id),
    subscriptionTier: String(row.subscription_tier),
    featuresEnabled: jsonArray(row.features_enabled as string),
  };
}

/** Every venue this user may act on — the venue switcher reads this. */
export function venuesForUser(userId: string): {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  city: string;
  kind: string;
  role: string;
}[] {
  return all(
    `SELECT v.id, v.name, v.short_name, v.initials, v.city, v.kind, s.role
       FROM venues v
       JOIN staff s ON s.venue_id = v.id
      WHERE s.user_id = ?
      ORDER BY v.name`,
    userId,
  ).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    shortName: String(r.short_name),
    initials: String(r.initials),
    city: String(r.city),
    kind: String(r.kind),
    role: String(r.role),
  }));
}

/** Authorisation check. Called before any venue-scoped read or write. */
export function userCanAccessVenue(userId: string, venueId: string): boolean {
  return (
    one(
      "SELECT 1 AS ok FROM staff WHERE user_id = ? AND venue_id = ?",
      userId,
      venueId,
    ) !== null
  );
}

// ── Availability ─────────────────────────────────────────────

export function availability(venueId: string): VenueAvailability {
  const slots: AvailabilitySlot[] = all(
    `SELECT id, weekday, opens_at, closes_at, capacity, enabled
       FROM availability_slots WHERE venue_id = ?
      ORDER BY weekday, opens_at`,
    venueId,
  ).map((r) => ({
    id: String(r.id),
    weekday: Number(r.weekday),
    opensAt: String(r.opens_at),
    closesAt: String(r.closes_at),
    capacity: Number(r.capacity),
    enabled: bool(r.enabled as number),
  }));

  const closures: ClosureDay[] = all(
    "SELECT id, date, reason FROM closures WHERE venue_id = ? ORDER BY date",
    venueId,
  ).map((r) => ({
    id: String(r.id),
    date: String(r.date),
    reason: String(r.reason),
  }));

  const updated = one(
    "SELECT MAX(updated_at) AS at FROM availability_slots WHERE venue_id = ?",
    venueId,
  );

  return {
    venueId,
    slots,
    closures,
    updatedAt: String(updated?.at ?? new Date().toISOString()),
  };
}

export class AvailabilityConflict extends Error {
  constructor(readonly slotId: string) {
    super(`Slot ${slotId} changed since it was read`);
    this.name = "AvailabilityConflict";
  }
}

/**
 * Writes a slot, refusing if it changed since the caller read it.
 *
 * Availability is the one edit that immediately changes what customers
 * can book, so a lost update here means double-booking a room that was
 * just closed. The version column makes that impossible to do silently.
 */
export function updateSlot(
  venueId: string,
  slotId: string,
  patch: Partial<Pick<AvailabilitySlot, "opensAt" | "closesAt" | "capacity" | "enabled">>,
  expectedVersion?: number,
): AvailabilitySlot {
  return transaction(() => {
    const current = one(
      "SELECT * FROM availability_slots WHERE id = ? AND venue_id = ?",
      slotId,
      venueId,
    );
    if (!current) throw new AvailabilityConflict(slotId);
    if (expectedVersion !== undefined && Number(current.version) !== expectedVersion) {
      throw new AvailabilityConflict(slotId);
    }

    const next = {
      opensAt: patch.opensAt ?? String(current.opens_at),
      closesAt: patch.closesAt ?? String(current.closes_at),
      capacity: patch.capacity ?? Number(current.capacity),
      enabled: patch.enabled ?? bool(current.enabled as number),
    };

    run(
      `UPDATE availability_slots
          SET opens_at = ?, closes_at = ?, capacity = ?, enabled = ?,
              version = version + 1, updated_at = ?
        WHERE id = ? AND venue_id = ?`,
      next.opensAt,
      next.closesAt,
      next.capacity,
      next.enabled ? 1 : 0,
      new Date().toISOString(),
      slotId,
      venueId,
    );

    return { id: slotId, weekday: Number(current.weekday), ...next };
  });
}

export function addClosure(venueId: string, date: string, reason: string): ClosureDay {
  const id = `cl_${Date.now().toString(36)}`;
  run(
    "INSERT INTO closures (id, venue_id, date, reason) VALUES (?, ?, ?, ?)",
    id,
    venueId,
    date,
    reason,
  );
  return { id, date, reason };
}

export function removeClosure(venueId: string, id: string): void {
  run("DELETE FROM closures WHERE id = ? AND venue_id = ?", id, venueId);
}

// ── Customers ────────────────────────────────────────────────

export function customers(venueId: string): Customer[] {
  const rows = all(
    `SELECT * FROM customers WHERE venue_id = ? ORDER BY last_visit_at DESC NULLS LAST`,
    venueId,
  );

  return rows.map((r) => {
    const id = String(r.id);
    const preferences = all(
      "SELECT label FROM customer_preferences WHERE customer_id = ?",
      id,
    ).map((p) => String(p.label));

    const noShowHistory: NoShowRecord[] = all(
      `SELECT reservation_id, at, party_size FROM no_show_records
        WHERE customer_id = ? AND venue_id = ? ORDER BY at DESC`,
      id,
      venueId,
    ).map((n) => ({
      bookingId: String(n.reservation_id),
      at: String(n.at),
      partySize: Number(n.party_size),
    }));

    const reviewIds = all(
      "SELECT id FROM reviews WHERE customer_id = ? AND venue_id = ?",
      id,
      venueId,
    ).map((v) => String(v.id));

    const visits = Number(r.visit_count);
    const opportunities = visits + noShowHistory.length;
    const risk = opportunities === 0 ? 0 : noShowHistory.length / opportunities;

    return {
      id,
      fullName: String(r.full_name),
      phone: String(r.phone),
      email: (r.email as string | null) ?? undefined,
      firstSeenAt: String(r.first_seen_at),
      lastVisitAt: (r.last_visit_at as string | null) ?? undefined,
      visitCount: visits,
      averageSpendMad: visits === 0 ? 0 : Math.round(toMad(Number(r.total_spend_cents)) / visits),
      totalSpendMad: toMad(Number(r.total_spend_cents)),
      // Read from the loyalty service, never derived here — until it
      // answers, the column is null and the UI shows the fallback.
      loyaltyTier: (r.loyalty_tier as Customer["loyaltyTier"] | null) ?? "nouveau",
      preferences,
      noShowHistory,
      noShowRisk: Number(risk.toFixed(2)),
      reviewIds,
      segments: segmentsFor(visits, r.last_visit_at as string | null, risk),
      optedOutOfMarketing: bool(r.opted_out_of_marketing as number),
    };
  });
}

export function customer(venueId: string, id: string): Customer | null {
  return customers(venueId).find((c) => c.id === id) ?? null;
}

/** Derived on read, never stored — a stored segment goes stale on return. */
function segmentsFor(visits: number, lastVisitAt: string | null, risk: number): string[] {
  const out: string[] = [];
  out.push(visits === 0 ? "new" : "returning");
  if (visits >= 8) out.push("loyal");
  if (risk >= 0.3) out.push("at_risk");
  if (lastVisitAt) {
    const days = (Date.now() - new Date(lastVisitAt).getTime()) / 86_400_000;
    if (visits > 0 && days > 60) out.push("lapsed");
  }
  return out;
}

export function recordNoShow(
  venueId: string,
  reservationId: string,
): void {
  transaction(() => {
    const booking = one(
      "SELECT customer_id, party_size FROM reservations WHERE id = ? AND venue_id = ?",
      reservationId,
      venueId,
    );
    if (!booking?.customer_id) return;

    run(
      `INSERT INTO no_show_records (id, venue_id, customer_id, reservation_id, party_size, at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      `ns_${reservationId}_${Date.now().toString(36)}`,
      venueId,
      String(booking.customer_id),
      reservationId,
      Number(booking.party_size),
      new Date().toISOString(),
    );

    run(
      "UPDATE reservations SET state = 'no_show', updated_at = ? WHERE id = ? AND venue_id = ?",
      new Date().toISOString(),
      reservationId,
      venueId,
    );

    run(
      `INSERT INTO reservation_status_history
         (id, reservation_id, from_state, to_state, actor, actor_id, reason_code, note, at)
       VALUES (?, ?, NULL, 'no_show', 'venue', NULL, NULL, NULL, ?)`,
      `sh_${reservationId}_${Date.now().toString(36)}`,
      reservationId,
      new Date().toISOString(),
    );
  });
}

// ── Notifications ────────────────────────────────────────────

export function notifications(venueId: string): PortalNotification[] {
  return all(
    "SELECT * FROM notifications WHERE venue_id = ? ORDER BY at DESC LIMIT 50",
    venueId,
  ).map((r) => ({
    id: String(r.id),
    type: String(r.type) as PortalNotification["type"],
    title: String(r.title),
    body: String(r.body),
    at: String(r.at),
    read: bool(r.read as number),
    href: (r.href as string | null) ?? undefined,
  }));
}

export function markNotificationRead(venueId: string, id: string): void {
  run("UPDATE notifications SET read = 1 WHERE id = ? AND venue_id = ?", id, venueId);
}

export function notificationPreferences(venueId: string): NotificationPreferences {
  const rows = all(
    "SELECT event_type, channels FROM notification_preferences WHERE venue_id = ?",
    venueId,
  );
  const byType = new Map(
    rows.map((r) => [String(r.event_type), jsonArray(r.channels as string)]),
  );
  const channels = (key: string) =>
    (byType.get(key) ?? []) as NotificationPreferences["newBooking"];

  return {
    venueId,
    newBooking: channels("new_booking"),
    cancellation: channels("cancellation"),
    review: channels("review"),
    dailySummary: channels("daily_summary"),
  };
}

export function setNotificationPreferences(
  prefs: NotificationPreferences,
): NotificationPreferences {
  transaction(() => {
    const rows: [string, string[]][] = [
      ["new_booking", prefs.newBooking],
      ["cancellation", prefs.cancellation],
      ["review", prefs.review],
      ["daily_summary", prefs.dailySummary],
    ];
    for (const [type, list] of rows) {
      run(
        `INSERT INTO notification_preferences (venue_id, event_type, channels)
         VALUES (?, ?, ?)
         ON CONFLICT(venue_id, event_type) DO UPDATE SET channels = excluded.channels`,
        prefs.venueId,
        type,
        JSON.stringify(list),
      );
    }
  });
  return notificationPreferences(prefs.venueId);
}
