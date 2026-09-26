import "server-only";

// Onboarding, on SQLite.
//
// Two tables and one transaction. `partner_accounts` holds the person —
// created at step 1, because a password has to go somewhere and a draft
// row is not it — and `onboarding_drafts` holds the establishment's
// answers until they are worth making a venue out of.
//
// `createVenueFromDraft` is the interesting one: it is « Création de
// Venue » in full, and it writes the seven rows that make a venue
// openable rather than merely present. A venue with no service row
// renders a dashboard with no service in hand, which is a crash, not an
// empty state — so the last three inserts are not optional.

import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { all, one, run, transaction } from "./store";
import type {
  OnboardingDay,
  OnboardingDraft,
  OnboardingVenueType,
} from "@/lib/types/onboarding";
import { defaultHours } from "@/lib/types/onboarding";

// ── Accounts ─────────────────────────────────────────────────

export interface PartnerAccountRow {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
}

function hash(password: string, salt?: string): string {
  const s = salt ?? randomBytes(16).toString("hex");
  return `${s}:${scryptSync(password, s, 64).toString("hex")}`;
}

export class EmailTakenError extends Error {
  constructor() {
    super("email_taken");
    this.name = "EmailTakenError";
  }
}

/** Step 1. The account exists from here, with no venue attached. */
export async function createPartnerAccount(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<PartnerAccountRow> {
  const email = input.email.trim().toLowerCase();
  const held = await one("SELECT user_id FROM partner_accounts WHERE email = ?", email);
  if (held) throw new EmailTakenError();

  const userId = `usr_${randomUUID().slice(0, 12)}`;
  await run(
    `INSERT INTO partner_accounts (user_id, full_name, email, phone, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    userId,
    input.fullName.trim(),
    email,
    input.phone.trim(),
    hash(input.password),
    new Date().toISOString(),
  );
  return { userId, fullName: input.fullName.trim(), email, phone: input.phone.trim() };
}

export async function partnerAccounts(): Promise<PartnerAccountRow[]> {
  return (await all("SELECT user_id, full_name, email, phone FROM partner_accounts")).map(
    (r) => ({
      userId: String(r.user_id),
      fullName: String(r.full_name),
      email: String(r.email),
      phone: String(r.phone),
    }),
  );
}

export async function partnerAccount(userId: string): Promise<PartnerAccountRow | null> {
  const r = await one(
    "SELECT user_id, full_name, email, phone FROM partner_accounts WHERE user_id = ?",
    userId,
  );
  return r
    ? {
        userId: String(r.user_id),
        fullName: String(r.full_name),
        email: String(r.email),
        phone: String(r.phone),
      }
    : null;
}

/**
 * Checks a password without leaking which half was wrong.
 *
 * Constant-time compare, and the same null for an unknown address as
 * for a wrong password — the caller turns both into one sentence.
 */
export async function verifyPartnerPassword(
  email: string,
  password: string,
): Promise<PartnerAccountRow | null> {
  const r = await one(
    "SELECT user_id, full_name, email, phone, password_hash FROM partner_accounts WHERE email = ?",
    email.trim().toLowerCase(),
  );
  if (!r) return null;
  const [salt] = String(r.password_hash).split(":");
  const expected = Buffer.from(String(r.password_hash));
  const actual = Buffer.from(hash(password, salt));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return {
    userId: String(r.user_id),
    fullName: String(r.full_name),
    email: String(r.email),
    phone: String(r.phone),
  };
}

// ── Drafts ───────────────────────────────────────────────────

/** A JSON column, or an empty list. A draft never fails to open. */
function list(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function rowToDraft(r: Record<string, unknown>): OnboardingDraft {
  let hours: OnboardingDay[] = [];
  try {
    const parsed = JSON.parse(String(r.hours ?? "[]"));
    if (Array.isArray(parsed)) hours = parsed as OnboardingDay[];
  } catch {
    hours = [];
  }
  return {
    id: String(r.id),
    ownerId: String(r.owner_id),
    step: Number(r.step),
    venueName: String(r.venue_name),
    venueType: String(r.venue_type) as OnboardingVenueType,
    cuisine: String(r.cuisine ?? ""),
    priceRange: Number(r.price_range ?? 2),
    city: String(r.city),
    district: String(r.district ?? ""),
    address: String(r.address),
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
    coverObjectKey: String(r.cover_object_key),
    coverContentType: String(r.cover_content_type ?? ""),
    coverSizeBytes: Number(r.cover_size_bytes ?? 0),
    photo2ObjectKey: String(r.photo2_object_key ?? ""),
    photo2ContentType: String(r.photo2_content_type ?? ""),
    photo2SizeBytes: Number(r.photo2_size_bytes ?? 0),
    menuObjectKey: String(r.menu_object_key ?? ""),
    menuContentType: String(r.menu_content_type ?? ""),
    menuSizeBytes: Number(r.menu_size_bytes ?? 0),
    ambience: list(r.ambience),
    features: list(r.features),
    hours: hours.length ? hours : defaultHours(),
    submittedVenueId: r.submitted_venue_id ? String(r.submitted_venue_id) : null,
    updatedAt: String(r.updated_at),
  };
}

export async function createDraft(ownerId: string): Promise<OnboardingDraft> {
  const at = new Date().toISOString();
  const id = `onb_${randomUUID().slice(0, 12)}`;
  await run(
    `INSERT INTO onboarding_drafts
       (id, owner_id, step, hours, created_at, updated_at)
     VALUES (?, ?, 2, ?, ?, ?)`,
    id,
    ownerId,
    JSON.stringify(defaultHours()),
    at,
    at,
  );
  return (await draftById(id))!;
}

export async function draftById(id: string): Promise<OnboardingDraft | null> {
  const r = await one("SELECT * FROM onboarding_drafts WHERE id = ?", id);
  return r ? rowToDraft(r) : null;
}

export async function draftForOwner(ownerId: string): Promise<OnboardingDraft | null> {
  const r = await one(
    `SELECT * FROM onboarding_drafts
      WHERE owner_id = ? AND submitted_venue_id IS NULL
      ORDER BY updated_at DESC LIMIT 1`,
    ownerId,
  );
  return r ? rowToDraft(r) : null;
}

const FIELD: Record<string, string> = {
  step: "step",
  venueName: "venue_name",
  venueType: "venue_type",
  cuisine: "cuisine",
  priceRange: "price_range",
  city: "city",
  district: "district",
  address: "address",
  latitude: "latitude",
  longitude: "longitude",
  coverObjectKey: "cover_object_key",
  coverContentType: "cover_content_type",
  coverSizeBytes: "cover_size_bytes",
  photo2ObjectKey: "photo2_object_key",
  photo2ContentType: "photo2_content_type",
  photo2SizeBytes: "photo2_size_bytes",
  menuObjectKey: "menu_object_key",
  menuContentType: "menu_content_type",
  menuSizeBytes: "menu_size_bytes",
};

/** The two JSON columns, written as arrays rather than scalars. */
const JSON_FIELD: Record<string, string> = {
  ambience: "ambience",
  features: "features",
};

/** Saves whatever the step sent, and nothing else. */
export async function patchDraft(
  id: string,
  patch: Partial<Omit<OnboardingDraft, "id" | "ownerId" | "updatedAt" | "submittedVenueId">>,
): Promise<OnboardingDraft | null> {
  const current = await draftById(id);
  if (!current) return null;

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [key, column] of Object.entries(FIELD)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    args.push(
      typeof value === "string" || typeof value === "number" ? value : null,
    );
  }
  if (patch.hours) {
    sets.push("hours = ?");
    args.push(JSON.stringify(patch.hours));
  }
  for (const [key, column] of Object.entries(JSON_FIELD)) {
    const value = (patch as Record<string, unknown>)[key];
    if (!Array.isArray(value)) continue;
    sets.push(`${column} = ?`);
    args.push(JSON.stringify(value));
  }
  if (!sets.length) return current;

  sets.push("updated_at = ?");
  args.push(new Date().toISOString(), id);
  await run(`UPDATE onboarding_drafts SET ${sets.join(", ")} WHERE id = ?`, ...args);
  return await draftById(id);
}

// ── Création de Venue ────────────────────────────────────────

/** ISO weekday of a yyyy-mm-dd, 1 = Monday. */
function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "LY";

/**
 * Turns a finished draft into a venue the partner can open.
 *
 * Seven inserts, in one transaction, and each one earns its place:
 * the venue, its settings (the vocabulary every screen reads), the
 * owner's membership, the business account, the bookable windows from
 * the weekly grid, one service definition so the booking engine has a
 * pattern, and one service row for today so the dashboard has a service
 * in hand. Without the last two the new venue's Accueil has no
 * `currentService` and the screen cannot render at all.
 */
export async function createVenueFromDraft(
  id: string,
): Promise<{ venueId: string } | null> {
  const draft = await draftById(id);
  if (!draft) return null;
  if (draft.submittedVenueId) return { venueId: draft.submittedVenueId };

  const account = await partnerAccount(draft.ownerId);
  const at = new Date().toISOString();
  const today = at.slice(0, 10);
  const venueId = `${draft.venueType === "bar" ? "bar" : "rst"}_${randomUUID().slice(0, 10)}`;
  // The app lists a bar as `drinks`; the partner said « bar ».
  const kind = draft.venueType === "bar" ? "drinks" : "restaurant";
  const open = draft.hours.filter((h) => !h.closed);
  const capacity = 40;

  await transaction(async () => {
    await run(
      // `status` is spelled out rather than left to the column default:
      // a new listing waits for LYFE, and that is a product rule worth
      // reading here instead of in `db/schema.sql`.
      // Every answer the flow collected, and nothing invented. The
      // cuisine, the quarter and the price band are what steps 2 and 3
      // now ask for, and they go straight onto the listing rather than
      // waiting for the partner to open Ma fiche and type them again.
      `INSERT INTO venues
         (id, kind, name, short_name, initials, tagline, description,
          cuisine, category, address, district, city,
          latitude, longitude, contact_email, contact_phone, website, currency,
          capacity, price_range, onboarding_completed, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', '', ?, '', ?, ?, ?, ?, ?, ?, ?, '', 'MAD', ?, ?, 1,
               'pending_review', ?, ?)`,
      venueId,
      kind,
      draft.venueName,
      draft.venueName.slice(0, 40),
      initialsOf(draft.venueName),
      draft.cuisine,
      draft.address,
      draft.district,
      draft.city,
      draft.latitude,
      draft.longitude,
      account?.email ?? "",
      account?.phone ?? "",
      capacity,
      draft.priceRange,
      at,
      at,
    );

    // Step 5's two lists, as the rows the app filters on. Skipped means
    // no rows, which is exactly what an unanswered question should look
    // like — not a default the partner never chose.
    for (const [kind_, values] of [
      ["ambience", draft.ambience],
      ["feature", draft.features],
    ] as const) {
      let position = 0;
      for (const value of values) {
        await run(
          `INSERT INTO venue_tags (venue_id, kind, value, position)
           VALUES (?, ?, ?, ?)`,
          venueId,
          kind_,
          value,
          position,
        );
        position += 1;
      }
    }
    await run(
      `INSERT INTO venue_settings (venue_id, configuration, alert_email, alert_phone, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      venueId,
      kind === "drinks" ? "lounge" : "restaurant",
      account?.email ?? "",
      account?.phone ?? "",
      at,
    );
    await run(
      `INSERT INTO staff (id, venue_id, user_id, full_name, email, role, pending, created_at)
       VALUES (?, ?, ?, ?, ?, 'owner', 0, ?)`,
      `stf_${randomUUID().slice(0, 10)}`,
      venueId,
      draft.ownerId,
      account?.fullName ?? "",
      account?.email ?? "",
      at,
    );
    await run(
      `INSERT INTO business_accounts
         (business_id, venue_id, owner_id, subscription_tier, features_enabled, created_at)
       VALUES (?, ?, ?, 'annual', ?, ?)`,
      `biz_${randomUUID().slice(0, 10)}`,
      venueId,
      draft.ownerId,
      JSON.stringify(["bookings", "availability"]),
      at,
    );
    // One row per event type — the table is keyed (venue_id, event_type),
    // not a column per alert. A new venue starts told about the one
    // thing that needs an answer, and quiet about the rest.
    const alerts: [string, string[]][] = [
      ["new_booking", ["push", "email"]],
      ["cancellation", ["push"]],
      ["guest_reminder_j1", []],
      ["review", []],
      ["daily_summary", []],
    ];
    for (const [eventType, channels] of alerts) {
      await run(
        `INSERT INTO notification_preferences (venue_id, event_type, channels)
         VALUES (?, ?, ?)`,
        venueId,
        eventType,
        JSON.stringify(channels),
      );
    }

    // The photos and the carte, if step 4 was not skipped. The files
    // were uploaded under the draft's namespace and stay there: the row
    // is what makes them the venue's, and moving bytes to rename a
    // prefix would be work with no reader.
    //
    // Position is the order the app plays the carousel in, and position
    // 0 is the cover — the one the list card and the app's header use.
    const files: [string, string, string, number, number][] = [
      ["photo", draft.coverObjectKey, draft.coverContentType || "image/jpeg", draft.coverSizeBytes, 0],
      ["photo", draft.photo2ObjectKey, draft.photo2ContentType || "image/jpeg", draft.photo2SizeBytes, 1],
      ["menu_file", draft.menuObjectKey, draft.menuContentType || "application/pdf", draft.menuSizeBytes, 0],
    ];
    for (const [assetKind, objectKey, contentType, sizeBytes, position] of files) {
      if (!objectKey) continue;
      await run(
        `INSERT INTO venue_assets
           (id, venue_id, kind, object_key, content_type, size_bytes, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        `ast_${randomUUID().slice(0, 12)}`,
        venueId,
        assetKind,
        objectKey,
        contentType,
        sizeBytes,
        position,
        at,
      );
    }

    for (const day of open) {
      await run(
        `INSERT INTO availability_slots
           (id, venue_id, weekday, opens_at, closes_at, capacity, enabled, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
        `slot_${randomUUID().slice(0, 10)}`,
        venueId,
        day.weekday,
        day.opensAt,
        day.closesAt,
        capacity,
        at,
      );
    }

    const pattern = open[0] ?? { opensAt: "12:00", closesAt: "23:00" };
    const lastBooking = `${String(
      Math.max(0, Number(pattern.closesAt.slice(0, 2)) - 1),
    ).padStart(2, "0")}:${pattern.closesAt.slice(3, 5)}`;
    await run(
      `INSERT INTO service_definitions
         (id, venue_id, name, kind, weekdays, starts_at, ends_at, last_booking_at,
          capacity_covers, covers_per_quarter, turn_minutes_small, turn_minutes_large,
          enabled, position, version, updated_at)
       VALUES (?, ?, 'Service', 'diner', ?, ?, ?, ?, ?, 6, 90, 120, 1, 0, 1, ?)`,
      `svd_${randomUUID().slice(0, 10)}`,
      venueId,
      (open.length ? open : draft.hours).map((h) => h.weekday).join(","),
      pattern.opensAt,
      pattern.closesAt,
      lastBooking,
      capacity,
      at,
    );

    const todayHours =
      draft.hours.find((h) => h.weekday === isoWeekday(today) && !h.closed) ?? pattern;
    await run(
      `INSERT INTO services
         (id, venue_id, kind, label, date, opens_at, closes_at, state, capacity)
       VALUES (?, ?, 'diner', 'Service', ?, ?, ?, 'scheduled', ?)`,
      `svc_${randomUUID().slice(0, 10)}`,
      venueId,
      today,
      `${today}T${todayHours.opensAt}:00.000Z`,
      `${today}T${todayHours.closesAt}:00.000Z`,
      capacity,
    );

    await run(
      "UPDATE onboarding_drafts SET submitted_venue_id = ?, step = 7, updated_at = ? WHERE id = ?",
      venueId,
      at,
      id,
    );
  });

  return { venueId };
}
