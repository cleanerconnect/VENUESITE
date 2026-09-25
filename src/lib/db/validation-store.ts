import "server-only";

// LYFE's review of a listing.
//
// Two reads and one write, and none of them is venue-scoped — which is
// why they are here rather than in `venue-store.ts`. Every other store
// function in this repository takes a venue id resolved from the
// session; these take a *platform admin* id and answer about venues the
// caller does not own. That is a different authorisation rule and it
// deserves a different file.

import type { PendingVenue, VenueStatus } from "@/lib/types/restaurant";
import { all, one, run } from "./store";

/** Whether this user works for LYFE. The gate behind /admin/validations. */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const row = await one("SELECT user_id FROM platform_admins WHERE user_id = ?", userId);
  return row !== null;
}

export async function platformAdminName(userId: string): Promise<string | null> {
  const row = await one("SELECT full_name FROM platform_admins WHERE user_id = ?", userId);
  return row ? String(row.full_name) : null;
}

/**
 * Venues waiting for a decision, oldest first.
 *
 * Oldest first because this is a queue and a partner who signed up on
 * Monday should not wait behind one who signed up on Thursday.
 */
export async function pendingVenues(): Promise<PendingVenue[]> {
  const rows = await all(
    `SELECT v.id, v.name, v.kind, v.city, v.address, v.contact_email, v.contact_phone,
            v.created_at,
            (SELECT COUNT(*) FROM venue_assets a
              WHERE a.venue_id = v.id AND a.kind = 'photo') AS photos,
            (SELECT COUNT(DISTINCT s.weekday) FROM availability_slots s
              WHERE s.venue_id = v.id) AS open_days,
            (SELECT p.full_name FROM partner_accounts p
              JOIN business_accounts b ON b.owner_id = p.user_id
              WHERE b.venue_id = v.id) AS owner_name
       FROM venues v
      WHERE v.status = 'pending_review'
      ORDER BY v.created_at ASC`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    kind: String(r.kind),
    city: String(r.city),
    address: String(r.address),
    contactEmail: String(r.contact_email),
    contactPhone: String(r.contact_phone),
    ownerName: r.owner_name ? String(r.owner_name) : "—",
    createdAt: String(r.created_at),
    hasPhoto: Number(r.photos) > 0,
    openDays: Number(r.open_days),
  }));
}

/**
 * Records LYFE's decision.
 *
 * The reason is kept only for a refusal: a validated listing with a
 * stored reason would be a sentence nobody ever chose, waiting to be
 * shown by accident.
 */
export async function setVenueStatus(
  venueId: string,
  status: VenueStatus,
  reason: string,
): Promise<boolean> {
  const at = new Date().toISOString();
  const result = await run(
    `UPDATE venues
        SET status = ?, status_reason = ?, status_changed_at = ?, updated_at = ?
      WHERE id = ?`,
    status,
    status === "rejected" ? reason.trim() : "",
    at,
    at,
    venueId,
  );
  return result.changes > 0;
}
