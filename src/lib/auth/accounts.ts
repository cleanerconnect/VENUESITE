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
 *
 * That is also how this fixture obeys the Lot 1 rule without naming it.
 * Lot 1 is one account per establishment — no roles, no switcher — and
 * the fixture cannot grant a second venue because it grants none at
 * all: `resolveAccount` asks `directory()`, and under Lot 1 that seam
 * narrows every account to the one establishment it owns, whichever
 * branch answered. So `LYFE_DEMO_ACCOUNTS=1` on a database that has not
 * had `009-un-proprietaire-par-etablissement.lot1.sql` yet lands on the
 * establishment rather than on the chooser, and so does a Business
 * Service that still answers with two.
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
    // the workspace switcher and the venue switcher. Lot 2 only: the
    // Lot 1 seed writes no staff row for him, and migration 009 removes
    // the ones an older database still has, because a dashboard with
    // one owner per establishment has nothing to switch. Under Lot 1 he
    // therefore holds an organisation and no venue, and sign-in takes
    // him to the event dashboard — which is honest: that is all he
    // holds.
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
    // Lot 1's partner: one establishment, held as its owner, and no
    // organisation — so sign-in lands on Dar Zellij with nothing to
    // choose. Under Lot 2 the seed gives him a second venue and a
    // manager's role, and he becomes the account that has to pick one
    // before the portal can show it anything.
    //
    // He is the address in HANDOFF.md, and the one the chooser used to
    // catch on production: a database seeded before 5 October still
    // held his manager rows at both establishments.
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
 * Since DigiNegoce's 27 October decision this is one rule rather than
 * three: a signed-in account goes to `/choisir`, and that screen
 * decides. It redirects itself when the account holds exactly one
 * dashboard, which is the case the old rule spent most of its lines on
 * — events if you held an organisation, your venue otherwise, and an
 * account holding both silently got the first of the two.
 *
 * What is left here is the one thing the chooser cannot do: pick
 * *which* establishment, when an account holds several of the same
 * kind. That question is about venues, not about dashboards, and the
 * login form's own chooser still answers it.
 *
 * An account holding nothing now goes to `/choisir` as well, where it
 * can add something. It used to be told it had nowhere to go, which
 * was true of a portal where the only way to get a dashboard was to
 * walk /inscription from the start.
 */
export function destinationFor(account: ResolvedAccount): {
  workspace: Workspace | null;
  href: string | null;
  needsVenueChoice: boolean;
} {
  // Several establishments of the same kind is the one choice the
  // dashboard chooser cannot make for a partner: « Restaurant » is one
  // card whether you hold one table or four. Under Lot 1 this is
  // always false — `directory()` narrows an account to the
  // establishment it owns, because the lot ships no switcher to change
  // your mind with afterwards.
  if (account.venues.length > 1) {
    return { workspace: "venue", href: "/choisir", needsVenueChoice: true };
  }

  // Everything else: the chooser. It names what the account holds and
  // what it does not, and it redirects itself when there is only one
  // answer — see `skipsChooser`.
  return { workspace: "venue", href: "/choisir", needsVenueChoice: false };
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
