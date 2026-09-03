import "server-only";

// The demo account directory.
//
// One partner, one login. What they see afterwards depends on what the
// account holds — event organisations, venues, or both — and that is
// resolved here rather than by two separate entrances.
//
// This is the file a real backend replaces. Credentials are literals in
// a demo dataset with no production counterpart, which is the only
// reason that is acceptable; the check is isolated in one function so
// swapping it for a hash comparison is a one-line change.

import { directory, type DirectoryMembership } from "./directory";
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
  /** Shown on the login screen's account picker. Omit to hide it there. */
  demo?: { label: string; description: string };
}

/**
 * Every account the demo can sign in as.
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
    demo: {
      label: "Organisateur d'événements",
      description: "Jazzablanca · deux organisations, aucun lieu",
    },
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
    demo: {
      label: "Les deux espaces",
      description: "Deux lieux et une organisation",
    },
  },
  {
    userId: "usr_sofia",
    email: "sofia@nomadrooftop.ma",
    password: "demo",
    fallbackName: "Sofia Bennis",
    organizations: [],
    eventRole: "scanner",
    demo: {
      label: "Partenaire lieu",
      description: "Nomad Rooftop · gérante, un seul lieu",
    },
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
    demo: {
      label: "Plusieurs lieux",
      description: "Gérant de deux lieux · doit choisir",
    },
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
    // Signed up, nothing attached. The "no workspace" state ships
    // because it is what a partner sees the day before onboarding
    // completes, and it is unreachable without an account like this.
    userId: "usr_nouveau",
    email: "nouveau@lyfe.ma",
    password: "demo",
    fallbackName: "Nouveau partenaire",
    organizations: [],
    eventRole: "scanner",
    demo: {
      label: "Compte sans espace",
      description: "Inscrit, rien encore rattaché",
    },
  },
];

const byEmail = new Map(ACCOUNTS.map((a) => [a.email, a]));
const byId = new Map(ACCOUNTS.map((a) => [a.userId, a]));

/** Display name from the account list, for users with no venue. */
export function accountName(userId: string): string | null {
  return byId.get(userId)?.fallbackName ?? null;
}

/** True when the id names a real account, whatever it holds. */
export function isKnownAccount(userId: string): boolean {
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

/** Everything the portal knows about a user, both workspaces at once. */
export function resolveAccount(userId: string): ResolvedAccount | null {
  const account = byId.get(userId);
  if (!account) return null;

  const fromVenues = directory().findById(userId);

  return {
    userId,
    fullName: fromVenues?.fullName ?? account.fallbackName,
    email: account.email,
    organizations: account.organizations
      .map((id) => PROFILES[id])
      .filter((p): p is OrganizerProfile => Boolean(p)),
    venues: fromVenues?.venues ?? [],
    eventRole: account.eventRole,
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
  if (hasEvents) {
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
export function verifyCredentials(
  email: string,
  password: string,
): { ok: true; account: ResolvedAccount } | { ok: false; reason: SignInFailure } {
  const account = byEmail.get(email.trim().toLowerCase());
  if (!account) return { ok: false, reason: "unknown_account" };
  if (account.password !== password) return { ok: false, reason: "bad_password" };

  const resolved = resolveAccount(account.userId);
  if (!resolved) return { ok: false, reason: "unknown_account" };
  return { ok: true, account: resolved };
}

/** The accounts offered on the login screen, for walking the states. */
export function demoAccounts() {
  return ACCOUNTS.filter((a) => a.demo).map((a) => ({
    email: a.email,
    password: a.password,
    label: a.demo!.label,
    description: a.demo!.description,
  }));
}
