import "server-only";

// The account directory.
//
// This is the credential store, standing in for the one the Business
// Service will own. It is not a demo affordance: nothing in the portal
// lists it, the login form offers no way to pick from it, and the only
// way in is an address and a password typed in full.
//
// One partner, one login. What they see afterwards depends on what the
// account holds — event organisations, venues, or both — and that is
// resolved here rather than by two separate entrances.
//
// This is the file a real backend replaces. The password literals below
// are a fixture, and a fixture is only acceptable while it cannot
// authenticate anything real — which was not true: the database
// directory fell through to them whenever `partner_accounts` had no
// matching row, so on a deployment with Neon attached (`db` mode, which
// is what production runs) `yassine@darzellij.ma` / `demo` signed in
// off a string in the bundle, and so did `validation@lyfe.ma`, the
// account that validates listings.
//
// They are now consulted in exactly two cases, and `demoAccountsUsable()`
// below is the whole rule:
//
//   · `static` — no database exists, so these are the only way in, and
//     a cold clone has to be walkable. Nothing real is behind it.
//   · `LYFE_DEMO_ACCOUNTS=1` — set on purpose, by someone who wants the
//     demo pairs live on a database.
//
// With a database and without that flag, the same addresses still work:
// `db/seed.mjs` writes them into `partner_accounts` with a salted
// scrypt hash, and `verifyPartnerPassword()` checks them there — the
// same path a partner created by `/inscription` goes through.
// `/api/health` reports which state the deployment is in.

import { directory, type DirectoryMembership } from "./directory";
import { dataMode } from "@/lib/data/mode";
import { activeLot } from "@/lib/lot";
import { PROFILES } from "./static/profiles";
import type { OrganizerProfile } from "@/lib/types/domain";

interface DemoAccount {
  userId: string;
  email: string;
  password: string;
  /** Used when the account is in neither directory. */
  fallbackName: string;
  /** Event organisations this user may act on. */
  organizations: string[];
  /**
   * Role in the event workspace. Separate from the venue role, which
   * comes from the venue directory — the two products have different
   * role vocabularies and an account can hold both.
   */
  eventRole: "owner" | "admin" | "scanner";
}

/**
 * Every account the portal can authenticate.
 *
 * Venues are not listed: they come from the venue directory, keyed by
 * user id, so the two never disagree about who may open what. Only the
 * event side needs its membership spelled out here, because there is no
 * event backend to hold it yet.
 */
const ACCOUNTS: DemoAccount[] = [
  {
    userId: "usr_mido",
    email: "mido@jazzablanca.com",
    password: "demo",
    fallbackName: "Mido Reffas",
    organizations: ["org_jazzablanca", "org_rooftop_mansour"],
    eventRole: "owner",
  },
  {
    // Two venues *and* an organisation — the account that exercises both
    // the workspace switcher and the venue switcher.
    userId: "usr_yassine",
    email: "yassine@darzellij.ma",
    password: "demo",
    fallbackName: "Yassine Alami",
    organizations: ["org_rooftop_mansour"],
    eventRole: "owner",
  },
  {
    userId: "usr_sofia",
    email: "sofia@nomadrooftop.ma",
    password: "demo",
    fallbackName: "Sofia Bennis",
    organizations: [],
    eventRole: "scanner",
  },
  {
    // Two venues, no organisation — the account that has to choose which
    // venue to open before the portal can show it anything.
    userId: "usr_rachid",
    email: "rachid@darzellij.ma",
    password: "demo",
    fallbackName: "Rachid Amrani",
    organizations: [],
    eventRole: "scanner",
  },
  {
    userId: "usr_imane",
    email: "imane@darzellij.ma",
    password: "demo",
    fallbackName: "Imane Ouali",
    organizations: [],
    eventRole: "scanner",
  },
  {
    // LYFE's own reviewer. Holds no venue and no organisation on
    // purpose: the account that validates listings must not be able to
    // act inside one. Its only screen is /admin/validations, and what
    // opens that is the `platform_admins` row, not this entry.
    userId: "usr_lyfe_admin",
    email: "validation@lyfe.ma",
    password: "demo",
    fallbackName: "Nawal Cherkaoui",
    organizations: [],
    eventRole: "scanner",
  },
  {
    // Signed up, nothing attached. The "no workspace" state ships
    // because it is what a partner sees the day before onboarding
    // completes, and it is unreachable without an account like this.
    userId: "usr_nouveau",
    email: "nouveau@lyfe.ma",
    password: "demo",
    fallbackName: "Nouveau partenaire",
    organizations: [],
    eventRole: "scanner",
  },
];

const byEmail = new Map(ACCOUNTS.map((a) => [a.email, a]));
const byId = new Map(ACCOUNTS.map((a) => [a.userId, a]));

/**
 * Whether the fixture pairs above may authenticate.
 *
 * `static` has no database, so they are the only door and there is
 * nothing real behind it. Anything else needs `LYFE_DEMO_ACCOUNTS=1`,
 * set deliberately.
 */
export function demoAccountsUsable(): boolean {
  if (dataMode() === "static") return true;
  return process.env.LYFE_DEMO_ACCOUNTS === "1";
}

/** Display name from the account list, for users with no venue. */
export function accountName(userId: string): string | null {
  return byId.get(userId)?.fallbackName ?? null;
}

/**
 * True when the id names a real account, whatever it holds.
 *
 * With a backend configured this list is not the authority — the
 * service is, and `resolveSession` asks it on the next line. Rejecting
 * an unknown id here would have fallen back to the seeded owner, which
 * is a silent identity swap rather than a failed sign-in.
 */
export function isKnownAccount(userId: string): boolean {
  if (dataMode() === "http") return userId.length > 0;
  return byId.has(userId);
}

export interface ResolvedAccount {
  userId: string;
  fullName: string;
  email: string;
  organizations: OrganizerProfile[];
  venues: DirectoryMembership[];
  /** Display name, resolved from whichever directory knows this user. */
  eventRole: "owner" | "admin" | "scanner";
}

export type Workspace = "event" | "venue";

/**
 * Everything the portal knows about a user, both workspaces at once.
 *
 * Two halves, and either one can be missing. The venue side comes from
 * the directory — the backend when one is configured — and the event
 * side from the fixture below, because there is no event backend yet.
 * An account the service knows and the fixture does not is a real
 * account holding venues and no organisation; requiring both was what
 * made a backend user unable to sign in at all.
 */
export async function resolveAccount(
  userId: string,
): Promise<ResolvedAccount | null> {
  const local = byId.get(userId);
  const fromVenues = await directory().findById(userId);
  if (!local && !fromVenues) return null;

  return {
    userId,
    fullName: fromVenues?.fullName ?? local?.fallbackName ?? userId,
    email: fromVenues?.email ?? local?.email ?? "",
    organizations: (local?.organizations ?? [])
      .map((id) => PROFILES[id])
      .filter((p): p is OrganizerProfile => Boolean(p)),
    venues: fromVenues?.venues ?? [],
    eventRole: local?.eventRole ?? "scanner",
  };
}

/**
 * Where a resolved account lands, and whether it has to choose first.
 *
 * The rule, in one place: an account holding any organisation goes to
 * the event dashboard and switches workspace from inside the portal; a
 * venue-only account goes to the venue portal, choosing between venues
 * first if it holds more than one; an account holding neither has
 * nowhere to go and gets told so.
 */
export function destinationFor(account: ResolvedAccount): {
  workspace: Workspace | null;
  href: string | null;
  needsVenueChoice: boolean;
} {
  const hasEvents = account.organizations.length > 0;
  const hasVenues = account.venues.length > 0;

  if (!hasEvents && !hasVenues) {
    return { workspace: null, href: null, needsVenueChoice: false };
  }

  // Events is the older, denser product, so it is the better default for
  // an account holding both. The switcher makes that reversible in one
  // click, which is why this does not need to be an extra screen.
  //
  // Except in Lot 1, where the deployment *is* the venue portal:
  // `Planning V3` row 39 buys the Restau & Drinks dashboard, and the
  // Events dashboard belongs to Prio 01 (row 38). The account a recette
  // signs in with — `yassine@darzellij.ma`, Dar Zellij's owner — also
  // holds `org_rooftop_mansour`, so typing the credentials from
  // HANDOFF.md landed the reviewer on `/dashboard`: a screen that is
  // not the delivery, in a lot that does not sell it. A partner who
  // holds a venue goes to their venue.
  if (hasEvents && !(activeLot() === 1 && hasVenues)) {
    return { workspace: "event", href: "/dashboard", needsVenueChoice: false };
  }

  return {
    workspace: "venue",
    href: "/restaurant",
    needsVenueChoice: account.venues.length > 1,
  };
}

export type SignInFailure = "unknown_account" | "bad_password";

/**
 * Verifies credentials and resolves what the account holds.
 *
 * The caller reports one message for both failures, so the form cannot
 * be used to enumerate which partners have accounts.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<
  { ok: true; account: ResolvedAccount } | { ok: false; reason: SignInFailure }
> {
  // A configured backend owns the credential check. The fixture pairs
  // below have no production counterpart and are never consulted then.
  const dir = directory();
  if (dir.verify) {
    const found = await dir.verify(email, password);
    if (found) {
      const resolved = await resolveAccount(found.userId);
      return resolved
        ? { ok: true, account: resolved }
        : { ok: false, reason: "unknown_account" };
    }
    // A backend is the only authority on its own accounts. A local
    // directory is not: it checks what onboarding created, and the
    // fixture partners below are just as local, so a miss falls through.
    if (dir.exclusiveVerify) return { ok: false, reason: "bad_password" };
  }

  // The fixture, and only where it cannot authenticate anything real.
  if (!demoAccountsUsable()) return { ok: false, reason: "bad_password" };

  const account = byEmail.get(email.trim().toLowerCase());
  if (!account) return { ok: false, reason: "unknown_account" };
  if (account.password !== password) return { ok: false, reason: "bad_password" };

  const resolved = await resolveAccount(account.userId);
  if (!resolved) return { ok: false, reason: "unknown_account" };
  return { ok: true, account: resolved };
}
