"use server";

// Onboarding — « Création de Venue », Planning V3 sprint Prio 02.
//
// Two flows since DigiNegoce's 27 October decision, and the only state
// the browser holds is which draft it is filling. Everything else lives
// on the seam: the account from step 1, the answers after every step.
// Closing the tab loses nothing, and signing back in later reopens the
// flow where it stopped.
//
// Who may write a draft is answered differently in each flow, and
// `draftFor` below is where the two meet. On `/inscription` there is no
// session yet, so the draft id is a capability in an httpOnly cookie —
// whoever holds it can edit that signup, unlike the session's presence
// cookie, which carries nothing. In the venue flow the partner is
// signed in, so the id travels from the client and the session is the
// authority: a draft that belongs to somebody else is refused.

import { identityCookie, presenceCookie, sign } from "@/lib/auth/cookie";
import { resolveSession } from "@/lib/auth/server-session";
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
import {
  VENUE_LAST_STEP,
  isManagementMode,
  isOnboardingCity,
} from "@/lib/types/onboarding";
import {
  isCuisineId,
  SPECIALTIES_MAX,
  VENUE_AMBIENCE,
  VENUE_FEATURE,
} from "@/lib/types/restaurant";
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
  passwordConfirm?: string;
}): Promise<OnboardingResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (fullName.length < 2) {
    return { ok: false, field: "fullName", message: "Indiquez votre nom." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, field: "email", message: "Cette adresse e-mail n'est pas valide." };
  }
  // The number is asked for rather than optional: `Détail Sprint `
  // row 39 lists « téléphone » among the details the account is made
  // from, and the verification code that row describes goes « à mon
  // mail ou à mon whatsapp ». Nine digits is the loosest rule that
  // still refuses a typo — a Moroccan mobile is ten with the leading
  // zero, nine without, and a partner may write it either way or with
  // +212.
  const phone = input.phone.trim();
  if (phone.replace(/\D/g, "").length < 9) {
    return {
      ok: false,
      field: "phone",
      message: "Indiquez un numéro de téléphone joignable.",
    };
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
  // Typed twice, because row 39 asks for « Mot de passe et confirmation
  // de mot de passe » — and because the only way out of a mistyped
  // password on this screen is a reset link.
  if (
    input.passwordConfirm !== undefined &&
    input.passwordConfirm !== input.password
  ) {
    return {
      ok: false,
      field: "passwordConfirm",
      message: "Les deux mots de passe ne sont pas identiques.",
    };
  }

  try {
    const { draft } = await getRestaurantRepository().startOnboarding({
      fullName,
      email,
      phone,
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

// ── The draft a write is for ─────────────────────────────────

/**
 * Resolves the draft id, and says who vouches for it.
 *
 * With a `draftId` — the venue flow — the session is the authority: the
 * draft has to belong to whoever is signed in, and nothing is taken on
 * the client's word but the id itself. Without one — `/inscription`,
 * where there is no session yet — the cookie is.
 *
 * The venue flow does not write the cookie at all, and it cannot: its
 * draft is opened by a *page*, and a server component may not set one
 * (« Cookies can only be modified in a Server Action or Route
 * Handler »). Passing the id is not a weakening — a signed-in caller
 * checked against the session is a stronger door than a capability that
 * has been sitting in a browser for thirty days.
 */
async function draftFor(
  draftId?: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (draftId) {
    const session = await resolveSession();
    if (!session) return { ok: false, message: "Reconnectez-vous." };
    const draft = await getRestaurantRepository().getOnboardingDraft(draftId);
    if (!draft || draft.ownerId !== session.userId) {
      return { ok: false, message: "Reprenez la création depuis le début." };
    }
    return { ok: true, id: draft.id };
  }
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!id) return { ok: false, message: "Reprenez l'inscription depuis le début." };
  return { ok: true, id };
}

// ── Steps 2 to 6 ─────────────────────────────────────────────

export async function saveOnboardingStep(
  patch: OnboardingDraftPatch,
  draftId?: string,
): Promise<OnboardingResult> {
  const held = await draftFor(draftId);
  if (!held.ok) return { ok: false, message: held.message };
  const id = held.id;
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
  // The same rule, one field over. Every closed list on a step is
  // closed here as well, and the two free-text answers are bounded:
  // this is the only door onto the draft, so it is the only place the
  // promise those controls make can be kept.
  if (patch.priceRange !== undefined && ![1, 2, 3, 4].includes(patch.priceRange)) {
    return { ok: false, field: "priceRange", message: "Choisissez une fourchette de prix." };
  }
  // Not a length any more: a closed list of ten. Empty is allowed —
  // the step lets a partner move on without answering — and anything
  // else has to be one the app's filter row actually offers.
  if (patch.cuisine !== undefined && patch.cuisine !== "" && !isCuisineId(patch.cuisine)) {
    return { ok: false, field: "cuisine", message: "Choisissez un type de cuisine." };
  }
  if (patch.specialties !== undefined && patch.specialties.length > SPECIALTIES_MAX) {
    return {
      ok: false,
      field: "specialties",
      message: `${SPECIALTIES_MAX} caractères au maximum.`,
    };
  }
  if (patch.district !== undefined && patch.district.length > 80) {
    return { ok: false, field: "district", message: "80 caractères au maximum." };
  }
  if (patch.ambience !== undefined) {
    if (patch.ambience.length > 5) {
      return { ok: false, field: "ambience", message: "5 ambiances au maximum." };
    }
    if (patch.ambience.some((a) => !(a in VENUE_AMBIENCE))) {
      return { ok: false, field: "ambience", message: "Ambiance inconnue." };
    }
  }
  if (patch.features !== undefined && patch.features.some((f) => !(f in VENUE_FEATURE))) {
    return { ok: false, field: "features", message: "Équipement inconnu." };
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
 * Step 4 · a ticket for one of the three files it can take.
 *
 * Two photos and the carte. Minted against the draft rather than a
 * venue, because there is no venue yet: the file is written under the
 * draft's own namespace and the asset rows that point at the files are
 * created with the venue at the last step.
 *
 * `slot` decides the rules the file is held to, not just where it
 * lands: a carte may be a PDF and a photo may not, and the ceiling on a
 * carte is 20 Mo against a photo's 8.
 */
export type DraftUploadSlot = "cover" | "photo2" | "menu" | "thumbnail";

export async function requestDraftUpload(
  input: {
    slot: DraftUploadSlot;
    filename: string;
    contentType: string;
    sizeBytes: number;
  },
  draftId?: string,
): Promise<
  | { ok: true; url: string; method: string; headers: Record<string, string>; objectKey: string }
  | { ok: false; message: string }
> {
  const held = await draftFor(draftId);
  if (!held.ok) return { ok: false, message: held.message };
  const id = held.id;

  const kind =
    input.slot === "menu" ? "menu_file" : input.slot === "thumbnail" ? "logo" : "photo";
  const invalid = validateAsset(kind, input.contentType, input.sizeBytes);
  if (invalid) return { ok: false, message: describeAssetError(invalid) };

  const ticket = await storageDriver().createUploadTicket({
    venueId: id,
    kind,
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

// ── The account's confirmation ───────────────────────────────

/**
 * Signs the partner in on the account step 1 created, and sends them
 * to the chooser.
 *
 * The session used to be written at the *end* of a seven-step road, on
 * the reasoning that an account with no venue would land on a shell
 * with an empty sidebar. The 27 October split answers that differently:
 * an account with no venue is a normal state now — it lands on
 * `/choisir`, and the dashboard it picks has an empty-state card of its
 * own. So the session is written as soon as there is an account to
 * write it for, which is also the only way the venue flow behind
 * `/restaurant/etablissement/nouveau` can be reached at all.
 */
export async function finishAccountCreation(): Promise<
  { ok: true; href: string } | { ok: false; message: string }
> {
  const jar = await cookies();
  const id = jar.get(DRAFT_COOKIE)?.value;
  if (!id) return { ok: false, message: "Reprenez l'inscription depuis le début." };

  const draft = await getRestaurantRepository().getOnboardingDraft(id);
  if (!draft) return { ok: false, message: "Reprenez l'inscription depuis le début." };

  jar.set(PRESENCE_COOKIE, "1", presenceCookie(true));
  jar.set(USER_COOKIE, sign(draft.ownerId), identityCookie(true));
  // No venue cookie: there is no venue. `resolveSession` resolves an
  // empty `venues` list to an empty `venueId`, which is what the
  // chooser and the empty dashboard both read.
  return { ok: true, href: "/choisir" };
}

// ── The venue flow, inside the dashboard ─────────────────────

/**
 * The draft the creation flow fills, for whoever is signed in.
 *
 * Resolved from the session rather than from a cookie the browser
 * carries: by this point the partner *is* somebody, and asking the
 * session who is cheaper and safer than trusting a capability cookie
 * that has been sitting in their browser for thirty days. The cookie
 * is still written, because `saveOnboardingStep` and
 * `requestDraftUpload` below are shared with the account flow and both
 * read it.
 *
 * A partner who stopped halfway gets the draft they left. Two drafts
 * for one account is two half-built establishments and no way to tell
 * which one they meant.
 */
export async function openVenueDraft(): Promise<
  { ok: true; draft: OnboardingDraft } | { ok: false; message: string }
> {
  const session = await resolveSession();
  if (!session) return { ok: false, message: "Reconnectez-vous." };
  try {
    const draft = await getRestaurantRepository().startVenueDraft(session.userId);
    // No cookie. This runs in a page's render, where setting one throws
    // — and the flow does not need it: it hands the id back to each
    // write, which checks it against the session (`draftFor`).
    return { ok: true, draft };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/**
 * Creates the establishment from the draft, and opens it.
 *
 * The same write the seven-step road used to do at its last step, minus
 * the sign-in: whoever presses this is already signed in — that is what
 * changed on 27 October — so all that is left is the venue cookie,
 * which says which of the account's establishments the dashboard is
 * acting on.
 */
export async function createVenueFromFlow(
  draftId: string,
): Promise<{ ok: true; href: string } | { ok: false; message: string }> {
  const session = await resolveSession();
  if (!session) return { ok: false, message: "Reconnectez-vous." };
  // The session is the authority on whose draft this is, which is what
  // `draftFor` checks — the client sends an id, not a claim.
  const held = await draftFor(draftId);
  if (!held.ok) return { ok: false, message: held.message };

  const repo = getRestaurantRepository();
  try {
    const draft = await repo.getOnboardingDraft(held.id);
    if (!draft) return { ok: false, message: "Reprenez la création depuis le début." };
    // The three answers the app cannot list a venue without. Everything
    // else on the six steps is optional, and this is where that promise
    // is kept or broken.
    if (!draft.venueName.trim() || !draft.city.trim() || !draft.address.trim()) {
      return {
        ok: false,
        message: "Il manque le nom, la ville ou l'adresse de l'établissement.",
      };
    }

    const { venueId } = await repo.submitOnboarding(held.id);
    await repo.saveOnboardingDraft(held.id, { step: VENUE_LAST_STEP });

    // Same rules as the sign-in action: signed, httpOnly, secure in
    // production. The venue cookie is the new fact — it is this
    // establishment the dashboard now acts on — and the other two are
    // written again rather than assumed, which costs nothing and keeps
    // one code path for the partner whose session is a few minutes old.
    const jar = await cookies();
    jar.set(PRESENCE_COOKIE, "1", presenceCookie(true));
    jar.set(USER_COOKIE, sign(draft.ownerId), identityCookie(true));
    jar.set(VENUE_COOKIE, sign(venueId), identityCookie(true));
    // The account flow's cookie, if this partner still carries one: the
    // draft behind it is the one just spent.
    jar.delete(DRAFT_COOKIE);

    return { ok: true, href: "/restaurant" };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
