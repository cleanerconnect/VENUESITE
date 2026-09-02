"use server";

// Server actions for the editable surfaces.
//
// Two invariants hold for every action here:
//   1. The venue id comes from `requireVenueAccess`, never from the
//      payload. An action cannot be pointed at another venue.
//   2. Validation runs again server-side, whatever the client did.

import { revalidatePath } from "next/cache";
import { requireVenueAccess, type PortalRole } from "@/lib/auth/server-session";
import {
  updateVenueIdentity,
  inviteStaff,
  listStaff,
  removeStaff,
  updateStaffRole,
  LastOwnerError,
  type StaffMemberRow,
} from "@/lib/db/venue-write-store";
import {
  AvailabilityConflict,
  addClosure,
  availability,
  removeClosure,
  updateSlot,
} from "@/lib/db/venue-store";
import {
  deleteAsset,
  listAssets,
  recordAsset,
  reorderAssets,
} from "@/lib/db/asset-store";
import { storageDriver } from "@/lib/assets";
import { validateAsset, type AssetKind, type VenueAsset } from "@/lib/assets/types";
import { venueProfile } from "@/lib/db/overview-store";
import { failed, invalid, ok, type WriteResult } from "@/lib/forms/result";
import {
  email as emailRule,
  latitude,
  longitude,
  maxLength,
  phone,
  required,
  url as urlRule,
  validate,
  validateSlot,
} from "@/lib/forms/validation";
import type { VenueAvailability } from "@/lib/types/business";
import type { RestaurantProfile } from "@/lib/types/restaurant";

const RESTAURANT_PATH = "/restaurant/[[...section]]";

// ── Venue identity ───────────────────────────────────────────

export interface VenueIdentityInput {
  name: string;
  shortName: string;
  description: string;
  category: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  kind: "restaurant" | "drinks";
}

export async function saveVenueIdentity(
  input: VenueIdentityInput,
): Promise<WriteResult<RestaurantProfile>> {
  let session;
  try {
    session = await requireVenueAccess(await currentVenueId());
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  if (session.role === "staff") {
    return failed("Votre rôle ne permet pas de modifier la fiche.");
  }

  const lat = input.latitude.trim() === "" ? null : Number(input.latitude);
  const lng = input.longitude.trim() === "" ? null : Number(input.longitude);

  const errors = validate(
    { ...input, latitude: lat, longitude: lng },
    {
      name: [required("Le nom"), maxLength(120, "Le nom")],
      shortName: [required("Le nom court"), maxLength(40, "Le nom court")],
      description: [maxLength(2000, "La description")],
      city: [required("La ville")],
      contactEmail: [emailRule],
      contactPhone: [phone],
      website: [urlRule],
      latitude: [latitude],
      longitude: [longitude],
    },
  );
  if (errors.length) return invalid(errors);

  updateVenueIdentity(session.venueId, {
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    latitude: lat,
    longitude: lng,
    contactEmail: input.contactEmail.trim(),
    contactPhone: input.contactPhone.trim(),
    website: input.website.trim(),
    kind: input.kind,
  });

  revalidatePath(RESTAURANT_PATH, "page");
  const profile = venueProfile(session.venueId);
  return profile ? ok(profile) : failed("Lieu introuvable.");
}

// ── Availability ─────────────────────────────────────────────

export async function saveSlot(input: {
  slotId: string;
  opensAt: string;
  closesAt: string;
  capacity: number;
  enabled: boolean;
}): Promise<WriteResult<VenueAvailability>> {
  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role === "staff") {
      return failed("Votre rôle ne permet pas de modifier les horaires.");
    }
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }

  const errors = validateSlot(input);
  if (errors.length) return invalid(errors);

  try {
    updateSlot(venueId, input.slotId, {
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      capacity: input.capacity,
      enabled: input.enabled,
    });
  } catch (error) {
    if (error instanceof AvailabilityConflict) {
      // Availability is the one edit that changes what customers can book
      // right now, so a lost update is a double-booking.
      return failed(
        "Ce créneau a été modifié par quelqu'un d'autre. Rechargez la page avant de réessayer.",
      );
    }
    throw error;
  }

  revalidatePath(RESTAURANT_PATH, "page");
  return ok(availability(venueId));
}

export async function saveClosure(input: {
  date: string;
  reason: string;
}): Promise<WriteResult<VenueAvailability>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return invalid([{ field: "date", message: "Date invalide." }]);
  }
  addClosure(venueId, input.date, input.reason.trim());
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(availability(venueId));
}

export async function deleteClosure(
  id: string,
): Promise<WriteResult<VenueAvailability>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  removeClosure(venueId, id);
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(availability(venueId));
}

// ── Assets ───────────────────────────────────────────────────

export async function requestUpload(input: {
  kind: AssetKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<WriteResult<{ url: string; method: string; headers: Record<string, string>; objectKey: string }>> {
  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role === "staff") {
      return failed("Votre rôle ne permet pas d'ajouter des fichiers.");
    }
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }

  const problem = validateAsset(input.kind, input.contentType, input.sizeBytes);
  if (problem) {
    const { describeAssetError } = await import("@/lib/assets/types");
    return invalid([{ field: "file", message: describeAssetError(problem) }]);
  }

  const ticket = await storageDriver().createUploadTicket({
    venueId,
    ...input,
  });
  return ok({
    url: ticket.url,
    method: ticket.method,
    headers: ticket.headers,
    objectKey: ticket.objectKey,
  });
}

/** Called after the PUT succeeds; the row is what makes the file visible. */
export async function confirmUpload(input: {
  kind: AssetKind;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
}): Promise<WriteResult<VenueAsset[]>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  // The key was minted for this venue; refuse anything else.
  if (!input.objectKey.startsWith(`venues/${venueId}/`)) {
    return failed("Fichier refusé.");
  }
  recordAsset({ venueId, ...input });
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(listAssets(venueId, input.kind));
}

export async function removeAsset(
  id: string,
  kind: AssetKind,
): Promise<WriteResult<VenueAsset[]>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  const asset = deleteAsset(venueId, id);
  // Row first, object second: an orphaned object is invisible, an
  // orphaned row is a broken image.
  if (asset) await storageDriver().remove(asset.objectKey);
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(listAssets(venueId, kind));
}

export async function saveAssetOrder(
  kind: AssetKind,
  orderedIds: string[],
): Promise<WriteResult<VenueAsset[]>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  return ok(reorderAssets(venueId, kind, orderedIds));
}

// ── Staff ────────────────────────────────────────────────────

export async function saveStaffInvite(input: {
  fullName: string;
  email: string;
  role: PortalRole;
}): Promise<WriteResult<StaffMemberRow[]>> {
  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role !== "owner") {
      return failed("Seul un propriétaire peut inviter un membre.");
    }
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }

  const errors = validate(input, {
    fullName: [required("Le nom"), maxLength(80, "Le nom")],
    email: [required("L'e-mail"), emailRule],
  });
  if (errors.length) return invalid(errors);

  inviteStaff(venueId, {
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    role: input.role,
  });
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(listStaff(venueId));
}

export async function saveStaffRole(
  staffId: string,
  role: PortalRole,
): Promise<WriteResult<StaffMemberRow[]>> {
  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role !== "owner") {
      return failed("Seul un propriétaire peut changer un rôle.");
    }
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  try {
    updateStaffRole(venueId, staffId, role);
  } catch (error) {
    if (error instanceof LastOwnerError) {
      return failed("Le lieu doit garder au moins un propriétaire.");
    }
    throw error;
  }
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(listStaff(venueId));
}

export async function deleteStaff(
  staffId: string,
): Promise<WriteResult<StaffMemberRow[]>> {
  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role !== "owner") {
      return failed("Seul un propriétaire peut retirer un membre.");
    }
  } catch {
    return failed("Session expirée. Reconnectez-vous.");
  }
  try {
    removeStaff(venueId, staffId);
  } catch (error) {
    if (error instanceof LastOwnerError) {
      return failed("Le lieu doit garder au moins un propriétaire.");
    }
    throw error;
  }
  revalidatePath(RESTAURANT_PATH, "page");
  return ok(listStaff(venueId));
}

/** The session's venue. Never read from a payload. */
async function currentVenueId(): Promise<string> {
  const { resolveSession } = await import("@/lib/auth/server-session");
  const session = await resolveSession();
  if (!session) throw new Error("not_authenticated");
  return session.venueId;
}
