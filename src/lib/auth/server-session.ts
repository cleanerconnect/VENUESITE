import "server-only";

// Server-side session.
//
// A driver interface in front of whatever actually authenticates. Today
// that is the demo driver below; tomorrow it is the Business Service's
// login. Callers only ever see `resolveSession()`, so swapping the driver
// is a one-line change in `sessionDriver()` and nothing above moves.
//
// The important property is not the driver — it is that **venue scoping
// is resolved here, server side**. A route asks the session which venue
// it may read; it never takes a venue id from the URL or a request body,
// and it never imports a venue constant.

import { cookies } from "next/headers";
import { directory } from "./directory";
import { isKnownAccount } from "./accounts";

export type PortalRole = "owner" | "manager" | "staff";

export interface PortalSession {
  userId: string;
  /** Display name for the chrome. */
  firstName: string;
  fullName: string;
  /** The venue this session is currently acting on. */
  venueId: string;
  email: string;
  role: PortalRole;
  /** Every venue the user may act on — the switcher reads this. */
  venues: { id: string; name: string; shortName: string; initials: string; city: string; kind: string; role: string }[];
}

export interface SessionDriver {
  /** The signed-in user, or null. Must not trust request-supplied ids. */
  currentUserId(): Promise<string | null>;
}

/**
 * Demo driver. Reads the presence cookie the middleware already checks
 * and resolves it to the seeded owner.
 *
 * OPEN: replace with the Business Service login. Everything above this
 * line stays as it is — that is the point of the interface.
 */
class DemoSessionDriver implements SessionDriver {
  async currentUserId(): Promise<string | null> {
    const jar = await cookies();
    if (jar.get(PRESENCE_COOKIE)?.value !== "1") return null;

    // Who signed in. The login screen writes this; it is an identifier,
    // never a capability — every venue this user may open is resolved
    // from the directory, not from anything the cookie carries.
    //
    // Validated against the account list rather than the venue
    // directory: an account that holds no venue is still a real account,
    // and falling back to the default user for it would silently sign
    // someone in as a different person.
    const claimed = jar.get(USER_COOKIE)?.value;
    if (claimed && isKnownAccount(claimed)) return claimed;

    return process.env.LYFE_DEMO_USER_ID ?? DEFAULT_USER_ID;
  }
}

export const PRESENCE_COOKIE = "lyfe.session.present";
export const USER_COOKIE = "lyfe.user";
export const DEFAULT_USER_ID = "usr_yassine";

let driver: SessionDriver | null = null;

export function sessionDriver(): SessionDriver {
  driver ??= new DemoSessionDriver();
  return driver;
}

/** Test seam — lets a suite install a driver without touching callers. */
export function setSessionDriver(next: SessionDriver | null) {
  driver = next;
}

const COOKIE_VENUE = "lyfe.venue";

/**
 * Resolves the session and the venue it may act on.
 *
 * The active venue can come from a cookie (the switcher writes it), but
 * it is **always re-checked against the user's access** before it is
 * returned. A user editing that cookie to another venue's id gets their
 * own default venue back, not the other venue's data.
 */
export async function resolveSession(): Promise<PortalSession | null> {
  const userId = await sessionDriver().currentUserId();
  if (!userId) return null;

  const account = directory().findById(userId);
  const venues = account?.venues ?? [];

  const jar = await cookies();
  const requested = jar.get(COOKIE_VENUE)?.value;
  const venueId =
    requested && directory().canAccessVenue(userId, requested)
      ? requested
      : (venues[0]?.id ?? "");

  const membership = venues.find((v) => v.id === venueId) ?? venues[0];
  const fullName = account?.fullName ?? userId;

  return {
    userId,
    firstName: fullName.split(" ")[0],
    fullName,
    email: account?.email ?? "",
    venueId,
    role: (membership?.role as PortalRole) ?? "staff",
    venues,
  };
}

/** Assert access or throw. Every venue-scoped mutation calls this. */
export async function requireVenueAccess(venueId: string): Promise<PortalSession> {
  const session = await resolveSession();
  if (!session) throw new Error("not_authenticated");
  if (!directory().canAccessVenue(session.userId, venueId)) {
    throw new Error("venue_forbidden");
  }
  return session;
}

export const VENUE_COOKIE = COOKIE_VENUE;
