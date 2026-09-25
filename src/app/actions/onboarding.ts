"use server";

// Onboarding — « Création de Venue », Planning V3 sprint Prio 02.
//
// Six steps, and the only state the browser holds is which draft it is
// filling. Everything else lives on the seam: the account from step 1,
// the answers after every step. Closing the tab loses nothing, and
// signing back in later reopens the flow where it stopped.
//
// The draft id is in an httpOnly cookie because it is a capability —
// whoever holds it can edit that signup — unlike the session's presence
// cookie, which carries nothing.

import { cookies } from "next/headers";
import { getRestaurantRepository } from "@/lib/data";
import {
  EmailTaken,
  RepositoryError,
  type OnboardingDraftPatch,
} from "@/lib/data/repository";
import { storageDriver } from "@/lib/assets";
import { describeAssetError, validateAsset } from "@/lib/assets/types";
import type { OnboardingDraft } from "@/lib/types/onboarding";
import { ONBOARDING_LAST_STEP, isOnboardingCity } from "@/lib/types/onboarding";
import { PRESENCE_COOKIE, USER_COOKIE, VENUE_COOKIE } from "@/lib/auth/server-session";

const DRAFT_COOKIE = "lyfe.inscription";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type OnboardingResult =
  | { ok: true; draft: OnboardingDraft }
  | { ok: false; message: string; field?: string };

/** What the flow reopens on, or null for a first visit. */
export async function currentDraft(): Promise<OnboardingDraft | null> {
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!id) return null;
  try {
    return await getRestaurantRepository().getOnboardingDraft(id);
  } catch {
    // A draft the service no longer knows is a fresh start, not an
    // error screen: the partner has nothing to fix.
    return null;
  }
}

// ── Step 1 · Vous ────────────────────────────────────────────

export async function signUpPartner(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<OnboardingResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (fullName.length < 2) {
    return { ok: false, field: "fullName", message: "Indiquez votre nom." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, field: "email", message: "Cette adresse e-mail n'est pas valide." };
  }
  // Eight characters, and that is the whole rule. A password policy with
  // four clauses is a password on a sticky note under the stand.
  if (input.password.length < 8) {
    return {
      ok: false,
      field: "password",
      message: "Huit caractères au minimum.",
    };
  }

  try {
    const { draft } = await getRestaurantRepository().startOnboarding({
      fullName,
      email,
      phone: input.phone.trim(),
      password: input.password,
    });
    const jar = await cookies();
    jar.set(DRAFT_COOKIE, draft.id, {
      path: "/",
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      httpOnly: true,
    });
    return { ok: true, draft };
  } catch (error) {
    if (error instanceof EmailTaken) {
      return {
        ok: false,
        field: "email",
        message: "Cette adresse a déjà un compte. Connectez-vous.",
      };
    }
    if (error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

// ── Steps 2 to 5 ─────────────────────────────────────────────

export async function saveOnboardingStep(
  patch: OnboardingDraftPatch,
): Promise<OnboardingResult> {
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!id) {
    return { ok: false, message: "Reprenez l'inscription depuis le début." };
  }
  // The city is a closed list on the screen, so it is a closed list
  // here too: a select is a suggestion to anything that is not the
  // browser, and this value is what the app groups venues by.
  if (patch.city !== undefined && patch.city !== "" && !isOnboardingCity(patch.city)) {
    return {
      ok: false,
      field: "city",
      message: "Choisissez une ville dans la liste.",
    };
  }
  try {
    const draft = await getRestaurantRepository().saveOnboardingDraft(id, patch);
    return { ok: true, draft };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/**
 * Step 4 · a ticket for the cover photo.
 *
 * Minted against the draft rather than a venue, because there is no
 * venue yet: the file is written under the draft's own namespace and the
 * asset row that points at it is created with the venue at step 6.
 */
export async function requestCoverUpload(input: {
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<
  | { ok: true; url: string; method: string; headers: Record<string, string>; objectKey: string }
  | { ok: false; message: string }
> {
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!id) return { ok: false, message: "Reprenez l'inscription depuis le début." };

  const invalid = validateAsset("photo", input.contentType, input.sizeBytes);
  if (invalid) return { ok: false, message: describeAssetError(invalid) };

  const ticket = await storageDriver().createUploadTicket({
    venueId: id,
    kind: "photo",
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  return {
    ok: true,
    url: ticket.url,
    method: ticket.method,
    headers: ticket.headers,
    objectKey: ticket.objectKey,
  };
}

// ── Step 6 · C'est prêt ──────────────────────────────────────

/**
 * Makes the venue, then signs the partner in on it.
 *
 * The session is written here and nowhere earlier: an account with no
 * venue signed into the portal would land on a shell with an empty
 * sidebar, which is a worse answer than the flow it was still in.
 */
export async function finishOnboarding(): Promise<
  { ok: true; href: string } | { ok: false; message: string }
> {
  const jar = await cookies();
  const id = jar.get(DRAFT_COOKIE)?.value;
  if (!id) return { ok: false, message: "Reprenez l'inscription depuis le début." };

  const repo = getRestaurantRepository();
  try {
    const draft = await repo.getOnboardingDraft(id);
    if (!draft) return { ok: false, message: "Reprenez l'inscription depuis le début." };
    // The three answers the app cannot list a venue without. Everything
    // else on the six steps is optional, and this is where that promise
    // is kept or broken.
    if (!draft.venueName.trim() || !draft.city.trim() || !draft.address.trim()) {
      return {
        ok: false,
        message: "Il manque le nom, la ville ou l'adresse de l'établissement.",
      };
    }

    const { venueId } = await repo.submitOnboarding(id);
    await repo.saveOnboardingDraft(id, { step: ONBOARDING_LAST_STEP });

    const options = { path: "/", maxAge: THIRTY_DAYS, sameSite: "lax" as const };
    jar.set(PRESENCE_COOKIE, "1", { ...options, httpOnly: false });
    jar.set(USER_COOKIE, draft.ownerId, { ...options, httpOnly: false });
    jar.set(VENUE_COOKIE, venueId, { ...options, httpOnly: false });
    jar.delete(DRAFT_COOKIE);

    return { ok: true, href: "/restaurant" };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
