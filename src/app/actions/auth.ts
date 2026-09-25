"use server";

// Sign in, sign out, and choosing a venue.
//
// The session is a pair of cookies: a presence flag the middleware reads
// without touching the database, and the signed-in user's id. Neither
// carries a capability — what an account may open is resolved from the
// directory on every request, so editing a cookie gains nothing.
//
// A real backend replaces this with its own token exchange; the shape of
// what it returns is the `SignInResult` below.

import { cookies } from "next/headers";
import {
  destinationFor,
  resolveAccount,
  verifyCredentials,
  type Workspace,
} from "@/lib/auth/accounts";
import {
  PRESENCE_COOKIE,
  USER_COOKIE,
  VENUE_COOKIE,
  resolveSession,
} from "@/lib/auth/server-session";
import { COPY } from "@/lib/copy/fr";
import { allowAttempt, clearAttempts } from "@/lib/auth/rate-limit";
import { getRestaurantRepository } from "@/lib/data";
import {
  clearCookie,
  identityCookie,
  presenceCookie,
  sign,
} from "@/lib/auth/cookie";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export interface VenueChoice {
  id: string;
  name: string;
  city: string;
  kind: string;
  role: string;
  initials: string;
}

export type SignInResult =
  | { ok: true; kind: "redirect"; href: string; workspace: Workspace }
  /** More than one venue and no organisation — the partner picks. */
  | { ok: true; kind: "choose_venue"; venues: VenueChoice[] }
  /** Credentials are valid but nothing is attached to the account yet. */
  | { ok: true; kind: "no_workspace"; fullName: string }
  | { ok: false; message: string };

export async function signIn(
  email: string,
  password: string,
  // Unchecked, the session ends with the browser. A shared host stand is
  // the normal case in a restaurant, so staying signed in for a month is
  // a choice the partner makes rather than the default they discover.
  remember = true,
): Promise<SignInResult> {
  // Throttled before the password is even looked at, so a list of
  // guesses costs the same whether the address exists or not.
  const key = `signin:${email.trim().toLowerCase()}`;
  const gate = allowAttempt(key);
  if (!gate.allowed) {
    return {
      ok: false,
      message: `Trop de tentatives. Réessayez dans ${gate.retryInSeconds} secondes.`,
    };
  }

  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    // One message for both an unknown address and a wrong password: two
    // messages would turn this form into a way to find out which
    // partners have accounts.
    return { ok: false, message: COPY.auth.invalidCredentials };
  }

  const account = result.account;
  // The window is forgotten on success: a partner who mistyped twice
  // and then got it right is not one attempt from being locked out.
  clearAttempts(key);
  const jar = await cookies();
  jar.set(PRESENCE_COOKIE, "1", presenceCookie(remember));
  jar.set(USER_COOKIE, sign(account.userId), identityCookie(remember));

  const destination = destinationFor(account);

  if (destination.workspace === null) {
    return { ok: true, kind: "no_workspace", fullName: account.fullName };
  }

  if (destination.needsVenueChoice) {
    return {
      ok: true,
      kind: "choose_venue",
      venues: account.venues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        kind: v.kind,
        role: v.role,
        initials: v.initials,
      })),
    };
  }

  // A single venue is selected here rather than left to the session's
  // default, so the cookie always says what the partner actually chose.
  if (destination.workspace === "venue" && account.venues[0]) {
    jar.set(VENUE_COOKIE, sign(account.venues[0].id), identityCookie(remember));
  }

  return {
    ok: true,
    kind: "redirect",
    href: destination.href!,
    workspace: destination.workspace,
  };
}

/** Commits the venue picked on the chooser. Re-checked against access. */
export async function chooseVenue(
  venueId: string,
): Promise<{ ok: boolean; href?: string; message?: string }> {
  const session = await resolveSession();
  if (!session) return { ok: false, message: COPY.error.sessionExpired };

  // The session only ever returns venues this user holds, so matching
  // against it is the authorisation check.
  if (!session.venues.some((v) => v.id === venueId)) {
    return { ok: false, message: COPY.error.forbidden };
  }

  const jar = await cookies();
  jar.set(VENUE_COOKIE, sign(venueId), identityCookie(true));
  return { ok: true, href: "/restaurant" };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  for (const name of [PRESENCE_COOKIE, USER_COOKIE, VENUE_COOKIE]) {
    jar.set(name, "", clearCookie());
  }
}

/**
 * « Mot de passe oublié ? ».
 *
 * The answer is deliberately the same whether or not the address is on
 * file, so the form cannot be used to find out who has an account. What
 * changes is whether anything was actually asked to send a mail: a
 * deployment with no Business Service behind it has no mail service
 * either, and telling a locked-out partner that a link is on its way
 * would be a lie they wait on.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ sent: boolean; message: string }> {
  const address = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { sent: false, message: COPY.auth.forgotNeedsEmail };
  }
  // Same throttle: this endpoint takes an address and answers, which is
  // enough to script.
  const gate = allowAttempt(`reset:${address.toLowerCase()}`);
  if (!gate.allowed) {
    return {
      sent: false,
      message: `Trop de demandes. Réessayez dans ${gate.retryInSeconds} secondes.`,
    };
  }
  try {
    const { sent } = await getRestaurantRepository().requestPasswordReset(
      address,
    );
    return {
      sent,
      message: sent ? COPY.auth.forgotSent : COPY.auth.forgotNoService,
    };
  } catch {
    // A refusal from the service must not tell the caller whether the
    // address exists either, so it reads as the service being
    // unreachable rather than as a verdict on the address.
    return { sent: false, message: COPY.auth.forgotFailed };
  }
}

/** Which workspaces the signed-in account holds. Drives the switcher. */
export async function availableWorkspaces(): Promise<{
  event: boolean;
  venue: boolean;
}> {
  const session = await resolveSession();
  if (!session) return { event: false, venue: false };
  const account = await resolveAccount(session.userId);
  return {
    event: (account?.organizations.length ?? 0) > 0,
    venue: (account?.venues.length ?? 0) > 0,
  };
}
