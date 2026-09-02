import "server-only";

// Venue-scoped writes.
//
// Every function takes the venue id the session resolved, and every
// statement carries it. A caller cannot write to another venue by passing
// a different id in a payload, because the id never comes from a payload.

import { randomUUID } from "node:crypto";
import type { PortalRole } from "@/lib/auth/server-session";
import { all, one, run, transaction } from "./store";

export interface VenueIdentityPatch {
  name: string;
  shortName: string;
  description: string;
  category: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  contactEmail: string;
  contactPhone: string;
  website: string;
  kind: "restaurant" | "drinks";
}

export function updateVenueIdentity(
  venueId: string,
  patch: VenueIdentityPatch,
): void {
  run(
    `UPDATE venues SET
       name = ?, short_name = ?, description = ?, category = ?,
       address = ?, city = ?, latitude = ?, longitude = ?,
       contact_email = ?, contact_phone = ?, website = ?, kind = ?,
       updated_at = ?
     WHERE id = ?`,
    patch.name,
    patch.shortName,
    patch.description,
    patch.category,
    patch.address,
    patch.city,
    patch.latitude,
    patch.longitude,
    patch.contactEmail,
    patch.contactPhone,
    patch.website,
    patch.kind,
    new Date().toISOString(),
    venueId,
  );
}

// ── Staff ────────────────────────────────────────────────────

export interface StaffMemberRow {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: PortalRole;
  lastActive?: string;
  pending: boolean;
}

export function listStaff(venueId: string): StaffMemberRow[] {
  return all(
    "SELECT * FROM staff WHERE venue_id = ? ORDER BY role, full_name",
    venueId,
  ).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    fullName: String(r.full_name),
    email: String(r.email),
    role: String(r.role) as PortalRole,
    lastActive: (r.last_active as string | null) ?? undefined,
    pending: r.pending === 1,
  }));
}

export function inviteStaff(
  venueId: string,
  input: { fullName: string; email: string; role: PortalRole },
): StaffMemberRow {
  const id = `stf_${randomUUID().slice(0, 8)}`;
  const userId = `usr_${randomUUID().slice(0, 8)}`;
  run(
    `INSERT INTO staff (id, venue_id, user_id, full_name, email, role, last_active, pending, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?)`,
    id,
    venueId,
    userId,
    input.fullName,
    input.email,
    input.role,
    new Date().toISOString(),
  );
  return { id, userId, ...input, pending: true };
}

export class LastOwnerError extends Error {
  constructor() {
    super("A venue must keep at least one owner");
    this.name = "LastOwnerError";
  }
}

/**
 * Changing or removing the last owner is refused.
 *
 * Without this, a venue can lock itself out of its own billing and staff
 * management with one careless edit and no way back through the portal.
 */
function assertNotLastOwner(venueId: string, staffId: string): void {
  const target = one(
    "SELECT role FROM staff WHERE id = ? AND venue_id = ?",
    staffId,
    venueId,
  );
  if (!target || target.role !== "owner") return;
  const owners = one(
    "SELECT COUNT(*) AS n FROM staff WHERE venue_id = ? AND role = 'owner'",
    venueId,
  );
  if (Number(owners?.n ?? 0) <= 1) throw new LastOwnerError();
}

export function updateStaffRole(
  venueId: string,
  staffId: string,
  role: PortalRole,
): void {
  transaction(() => {
    if (role !== "owner") assertNotLastOwner(venueId, staffId);
    run(
      "UPDATE staff SET role = ? WHERE id = ? AND venue_id = ?",
      role,
      staffId,
      venueId,
    );
  });
}

export function removeStaff(venueId: string, staffId: string): void {
  transaction(() => {
    assertNotLastOwner(venueId, staffId);
    run("DELETE FROM staff WHERE id = ? AND venue_id = ?", staffId, venueId);
  });
}
