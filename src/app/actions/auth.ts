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
): Promise<SignInResult> {
  const result = verifyCredentials(email, password);

  if (!result.ok) {
    // One message for both an unknown address and a wrong password: two
    // messages would turn this form into a way to find out which
    // partners have accounts.
    return { ok: false, message: COPY.auth.invalidCredentials };
  }

  const account = result.account;
  const jar = await cookies();
  const options = {
    path: "/",
    maxAge: THIRTY_DAYS,
    sameSite: "lax" as const,
    httpOnly: false,
  };

  jar.set(PRESENCE_COOKIE, "1", options);
  jar.set(USER_COOKIE, account.userId, options);

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
    jar.set(VENUE_COOKIE, account.venues[0].id, options);
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
  jar.set(VENUE_COOKIE, venueId, {
    path: "/",
    maxAge: THIRTY_DAYS,
    sameSite: "lax",
  });
  return { ok: true, href: "/restaurant" };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  for (const name of [PRESENCE_COOKIE, USER_COOKIE, VENUE_COOKIE]) {
    jar.set(name, "", { path: "/", maxAge: 0 });
  }
}

/** Which workspaces the signed-in account holds. Drives the switcher. */
export async function availableWorkspaces(): Promise<{
  event: boolean;
  venue: boolean;
}> {
  const session = await resolveSession();
  if (!session) return { event: false, venue: false };
  const account = resolveAccount(session.userId);
  return {
    event: (account?.organizations.length ?? 0) > 0,
    venue: (account?.venues.length ?? 0) > 0,
  };
}
