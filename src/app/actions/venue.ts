"use server";

// Server actions for the editable surfaces.
//
// Two invariants hold for every action here:
//   1. The venue id comes from `requireVenueAccess`, never from the
//      payload. An action cannot be pointed at another venue.
//   2. Validation runs again server-side, whatever the client did.

import { revalidatePath } from "next/cache";
import { dataMode } from "@/lib/data/mode";
import { requireVenueAccess, type PortalRole } from "@/lib/auth/server-session";
import {
  updateMenuItem,
  UnknownMenuItemError,
  inviteStaff,
  listStaff,
  removeStaff,
  updateStaffRole,
  LastOwnerError,
  type StaffMemberRow,
} from "@/lib/db/venue-write-store";
import { getRestaurantRepository } from "@/lib/data";
import { RepositoryError, StaleWriteError } from "@/lib/data/repository";
import { storageDriver } from "@/lib/assets";
import { validateAsset, type AssetKind, type VenueAsset } from "@/lib/assets/types";
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
import { VENUE_FEATURE } from "@/lib/types/restaurant";
import type {
  DietaryTag,
  MenuCategory,
  RestaurantProfile,
  VenueFeature,
} from "@/lib/types/restaurant";
import { COPY } from "@/lib/copy/fr";

const RESTAURANT_PATH = "/restaurant/[[...section]]";

/**
 * These forms write to the store directly rather than through the
 * repository, so on a cold clone — which has no database — they would
 * write into an empty one and then fail with "lieu introuvable", which
 * tells the person who just pressed Save nothing they can act on.
 *
 * So they refuse first, and name the one command that fixes it. The
 * screens still render from the snapshot; it is only saving that needs
 * somewhere to save to.
 */
/**
 * The guard for what still writes SQLite directly — the menu and the
 * staff list.
 *
 * Ma fiche's own forms no longer need it: identity, the listing, the
 * opening hours and the photos go through the repository, and every
 * driver answers them — the snapshot holds the edit in a per-process
 * overlay the way it already did for a check-in. So a cold clone can
 * demonstrate the forms, and only the two surfaces that never crossed
 * the seam still say « lancez db:reset ».
 */
function requireWritableStore(): string | null {
  return dataMode() === "static"
    ? "Aucune base de données : les écrans s'affichent depuis le jeu de données statique, mais l'enregistrement a besoin d'une base. En local : `npm run db:reset`. Sur un déploiement : rattachez une base Postgres (DATABASE_URL), puis rechargez."
    : null;
}
// Ma fiche, Menu and Équipe are three routes over one form, so a write
// from any of them has to revalidate all three.
const FORM_PATHS = ["/restaurant/ma-fiche", "/restaurant/menu", "/restaurant/equipe"];
const revalidateForms = () => FORM_PATHS.forEach((p) => revalidatePath(p, "page"));

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
    return failed(COPY.error.sessionExpired);
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

  // Through the repository, not into the store: this form used to write
  // SQLite directly, so a deployment pointed at the Business Service
  // read that service and saved somewhere else entirely.
  return write(() =>
    getRestaurantRepository().saveVenueProfile(session.venueId, {
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
    }),
  );
}

/**
 * One try/catch for every write that now crosses the seam.
 *
 * A refused write is three different things to a partner — the record
 * moved, the service said no, or the network did — and each one wants
 * its own sentence rather than a generic failure.
 */
async function write<T>(run: () => Promise<T>): Promise<WriteResult<T>> {
  try {
    const value = await run();
    revalidatePath(RESTAURANT_PATH, "page");
    revalidateForms();
    return ok(value);
  } catch (error) {
    if (error instanceof StaleWriteError) return failed(COPY.error.stale);
    if (error instanceof RepositoryError) return failed(error.message);
    throw error;
  }
}

// ── Listing facets ───────────────────────────────────────────
//
// What the consumer app filters and renders as chips. Everything here
// is app-facing: change it in the portal, the listing changes.

export interface VenueListingInput {
  priceRange: number;
  tags: string[];
  features: VenueFeature[];
  ambience: string[];
}

export async function saveVenueListing(
  input: VenueListingInput,
): Promise<WriteResult<RestaurantProfile>> {
  let session;
  try {
    session = await requireVenueAccess(await currentVenueId());
  } catch {
    return failed(COPY.error.sessionExpired);
  }
  if (session.role === "staff") {
    return failed("Votre rôle ne permet pas de modifier la fiche.");
  }

  const errors = [
    ...(input.priceRange < 1 || input.priceRange > 4
      ? [{ field: "priceRange", message: "Choisissez une gamme de prix." }]
      : []),
    // A listing with thirty chips is a listing nobody reads, and the app
    // truncates. Refusing here is kinder than silently dropping the tail.
    ...(input.tags.length > 8
      ? [{ field: "tags", message: "8 mots-clés au maximum." }]
      : []),
    ...(input.ambience.length > 5
      ? [{ field: "ambience", message: "5 ambiances au maximum." }]
      : []),
    ...(input.tags.some((t) => t.length > 30)
      ? [{ field: "tags", message: "Un mot-clé fait 30 caractères au plus." }]
      : []),
    ...(input.features.some((f) => !(f in VENUE_FEATURE))
      ? [{ field: "features", message: "Équipement inconnu." }]
      : []),
  ];
  if (errors.length) return invalid(errors);

  return write(() =>
    getRestaurantRepository().saveVenueListing(session.venueId, {
      priceRange: input.priceRange,
      // Trimmed and de-duplicated here rather than in the form: the
      // client is one caller of this action, not the only one.
      tags: unique(input.tags),
      features: unique(input.features),
      ambience: unique(input.ambience),
    }),
  );
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

// ── Menu listing ─────────────────────────────────────────────

export interface MenuItemInput {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  priceMad: number;
  signature: boolean;
  visible: boolean;
  dietary: DietaryTag[];
}

export async function saveMenuItem(
  input: MenuItemInput,
): Promise<WriteResult<MenuItemInput>> {
  const unwritable = requireWritableStore();
  if (unwritable) return failed(unwritable);

  let session;
  try {
    session = await requireVenueAccess(await currentVenueId());
  } catch {
    return failed(COPY.error.sessionExpired);
  }
  if (session.role === "staff") {
    return failed("Votre rôle ne permet pas de modifier la carte.");
  }

  const errors = validate(input, {
    name: [required("Le nom du plat"), maxLength(80, "Le nom du plat")],
    description: [maxLength(280, "La description")],
  });
  if (input.priceMad < 0 || !Number.isFinite(input.priceMad)) {
    errors.push({ field: "priceMad", message: "Prix invalide." });
  }
  if (errors.length) return invalid(errors);

  try {
    updateMenuItem(session.venueId, {
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      dietary: unique(input.dietary),
    });
  } catch (error) {
    if (error instanceof UnknownMenuItemError) {
      return failed("Ce plat n'existe plus. Rechargez la page.");
    }
    throw error;
  }

  revalidatePath(RESTAURANT_PATH, "page");
  revalidateForms();
  return ok(input);
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
    return failed(COPY.error.sessionExpired);
  }

  const errors = validateSlot(input);
  if (errors.length) return invalid(errors);

  // Read, patch the one window, write the whole record. The endpoint the
  // chiffrage names is a PUT on the venue's availability — a set, not a
  // row — and availability is the one edit that changes what a guest can
  // book right now, so a lost update here is a double-booking. That is
  // what `updatedAt` on the record is for.
  const repo = getRestaurantRepository();
  return write(async () => {
    const current = await repo.getAvailability(venueId);
    return repo.updateAvailability(venueId, {
      venueId,
      slots: current.slots.map((slot) =>
        slot.id === input.slotId
          ? {
              ...slot,
              opensAt: input.opensAt,
              closesAt: input.closesAt,
              capacity: input.capacity,
              enabled: input.enabled,
            }
          : slot,
      ),
      closures: current.closures,
    });
  });
}

export async function saveClosure(input: {
  date: string;
  reason: string;
}): Promise<WriteResult<VenueAvailability>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed(COPY.error.sessionExpired);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return invalid([{ field: "date", message: "Date invalide." }]);
  }
  const repo = getRestaurantRepository();
  return write(async () => {
    const current = await repo.getAvailability(venueId);
    return repo.updateAvailability(venueId, {
      venueId,
      slots: current.slots,
      // The id is provisional: a driver inserting the row mints its own
      // and the response carries the real list back.
      closures: [
        ...current.closures,
        { id: `clo_${Date.now().toString(36)}`, date: input.date, reason: input.reason.trim() },
      ],
    });
  });
}

export async function deleteClosure(
  id: string,
): Promise<WriteResult<VenueAvailability>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed(COPY.error.sessionExpired);
  }
  const repo = getRestaurantRepository();
  return write(async () => {
    const current = await repo.getAvailability(venueId);
    return repo.updateAvailability(venueId, {
      venueId,
      slots: current.slots,
      closures: current.closures.filter((c) => c.id !== id),
    });
  });
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
    return failed(COPY.error.sessionExpired);
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
    return failed(COPY.error.sessionExpired);
  }
  // The key was minted for this venue; refuse anything else.
  if (!input.objectKey.startsWith(`venues/${venueId}/`)) {
    return failed("Fichier refusé.");
  }
  return write(() =>
    getRestaurantRepository().runAssetAction(venueId, {
      kind: "asset.record",
      assetKind: input.kind,
      objectKey: input.objectKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    }),
  );
}

export async function removeAsset(
  id: string,
  kind: AssetKind,
): Promise<WriteResult<VenueAsset[]>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed(COPY.error.sessionExpired);
  }
  // Row first, object second: an orphaned object is invisible, an
  // orphaned row is a broken image. The key is read before the row goes,
  // because afterwards nothing knows what to delete from storage.
  const repo = getRestaurantRepository();
  const doomed = (await repo.listAssets(venueId, kind)).find((a) => a.id === id);
  const result = await write(() =>
    repo.runAssetAction(venueId, { kind: "asset.remove", id }),
  );
  if (result.ok && doomed) await storageDriver().remove(doomed.objectKey);
  return result;
}

export async function saveAssetOrder(
  kind: AssetKind,
  orderedIds: string[],
): Promise<WriteResult<VenueAsset[]>> {
  const venueId = await currentVenueId();
  try {
    await requireVenueAccess(venueId);
  } catch {
    return failed(COPY.error.sessionExpired);
  }
  return write(() =>
    getRestaurantRepository().runAssetAction(venueId, {
      kind: "asset.reorder",
      assetKind: kind,
      orderedIds,
    }),
  );
}

// ── Staff ────────────────────────────────────────────────────

export async function saveStaffInvite(input: {
  fullName: string;
  email: string;
  role: PortalRole;
}): Promise<WriteResult<StaffMemberRow[]>> {
  const unwritable = requireWritableStore();
  if (unwritable) return failed(unwritable);

  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role !== "owner") {
      return failed("Seul un propriétaire peut inviter un membre.");
    }
  } catch {
    return failed(COPY.error.sessionExpired);
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
  revalidateForms();
  return ok(await listStaff(venueId));
}

export async function saveStaffRole(
  staffId: string,
  role: PortalRole,
): Promise<WriteResult<StaffMemberRow[]>> {
  const unwritable = requireWritableStore();
  if (unwritable) return failed(unwritable);

  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role !== "owner") {
      return failed("Seul un propriétaire peut changer un rôle.");
    }
  } catch {
    return failed(COPY.error.sessionExpired);
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
  revalidateForms();
  return ok(await listStaff(venueId));
}

export async function deleteStaff(
  staffId: string,
): Promise<WriteResult<StaffMemberRow[]>> {
  const unwritable = requireWritableStore();
  if (unwritable) return failed(unwritable);

  const venueId = await currentVenueId();
  try {
    const session = await requireVenueAccess(venueId);
    if (session.role !== "owner") {
      return failed("Seul un propriétaire peut retirer un membre.");
    }
  } catch {
    return failed(COPY.error.sessionExpired);
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
  revalidateForms();
  return ok(await listStaff(venueId));
}

/** The session's venue. Never read from a payload. */
async function currentVenueId(): Promise<string> {
  const { resolveSession } = await import("@/lib/auth/server-session");
  const session = await resolveSession();
  if (!session) throw new Error("not_authenticated");
  return session.venueId;
}
