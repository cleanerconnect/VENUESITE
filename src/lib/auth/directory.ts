import "server-only";

// The account directory.
//
// Who exists, what they may open, and what they are called. Split out of
// `server-session.ts` because the session used to reach straight into
// SQLite for it — which meant the whole portal shell 500'd on a machine
// with no database, event routes included.
//
// Two implementations behind one interface, chosen by the same rule as
// the data layer (`lib/data/mode`). A real backend replaces this with a
// lookup against the Business Service; nothing above the interface moves.

import { dataMode } from "@/lib/data/mode";
import {
  staticUser,
  staticUserByEmail,
  staticUsers,
  type DirectoryUser,
} from "@/lib/data/static/venue-data";

export interface DirectoryMembership {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  city: string;
  kind: string;
  role: string;
}

export interface DirectoryAccount {
  userId: string;
  fullName: string;
  email: string;
  venues: DirectoryMembership[];
}

export interface Directory {
  /** Every account the demo can sign in as. Empty for a real backend. */
  listAccounts(): Promise<DirectoryAccount[]>;
  findByEmail(email: string): Promise<DirectoryAccount | null>;
  findById(userId: string): Promise<DirectoryAccount | null>;
  canAccessVenue(userId: string, venueId: string): Promise<boolean>;
  /**
   * Checks an address and a password against the backend.
   *
   * Present only on the HTTP branch. The local branches have no
   * credential to check against — the pairs live in `accounts.ts`, a
   * fixture with no production counterpart — so `verifyCredentials`
   * keeps its own path for them and defers to this one when a backend
   * is configured. Null for a wrong pair, and it never says which half
   * was wrong.
   */
  verify?(email: string, password: string): Promise<DirectoryAccount | null>;
}

class StaticDirectory implements Directory {
  async listAccounts() {
    return staticUsers();
  }
  async findByEmail(email: string) {
    return staticUserByEmail(email);
  }
  async findById(userId: string) {
    return staticUser(userId);
  }
  async canAccessVenue(userId: string, venueId: string) {
    return Boolean(
      staticUser(userId)?.venues.some((v) => v.id === venueId),
    );
  }
}

class DatabaseDirectory implements Directory {
  // Imported lazily: pulling `venue-store` at module scope would open
  // SQLite for anyone who merely imports this file, which is the exact
  // coupling this split exists to remove.
  private store() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/lib/db/venue-store") as typeof import("@/lib/db/venue-store");
  }
  private rows() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/lib/db/store") as typeof import("@/lib/db/store");
  }

  async listAccounts(): Promise<DirectoryAccount[]> {
    return this.rows()
      .all("SELECT DISTINCT user_id, full_name, email FROM staff WHERE pending = 0")
      .map((r) => ({
        userId: String(r.user_id),
        fullName: String(r.full_name),
        email: String(r.email),
        venues: this.store().venuesForUser(String(r.user_id)),
      }));
  }

  async findByEmail(email: string) {
    const needle = email.trim().toLowerCase();
    const accounts = await this.listAccounts();
    return accounts.find((a) => a.email.toLowerCase() === needle) ?? null;
  }

  async findById(userId: string) {
    const row = this.rows().one(
      "SELECT user_id, full_name, email FROM staff WHERE user_id = ? LIMIT 1",
      userId,
    );
    if (!row) return null;
    return {
      userId,
      fullName: String(row.full_name),
      email: String(row.email),
      venues: this.store().venuesForUser(userId),
    };
  }

  async canAccessVenue(userId: string, venueId: string) {
    return this.store().userCanAccessVenue(userId, venueId);
  }
}

/**
 * The account directory, resolved from the Business Service.
 *
 * This is the branch that was missing, and its absence was the largest
 * gap in the Lot 1 handover: with a backend configured, the portal read
 * *its* bookings and still resolved who you were — and which
 * establishments you could open, and with what role — from a local
 * SQLite file. Signing in therefore needed a seeded database even in
 * `http` mode, and venue scoping was local authority over remote data.
 *
 * One endpoint answers all of it: the session. `POST` exchanges an
 * address and a password for the account, `GET` reads the account behind
 * a known user id. Scoping and roles fall out of the `venues` it
 * carries, so there is nothing else to keep in step.
 */
class HttpDirectory implements Directory {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  /**
   * `resolveSession` runs on every request, and it wants the account
   * every time. A short memo keeps one navigation from becoming five
   * round trips without holding a stale role for longer than a blink —
   * five seconds is far under any plausible role change, and a sign-out
   * clears the cookie rather than waiting for this.
   */
  private static readonly TTL_MS = 5_000;
  private static cache = new Map<
    string,
    { at: number; account: DirectoryAccount | null }
  >();

  async listAccounts(): Promise<DirectoryAccount[]> {
    // A real backend does not enumerate its accounts to the portal, and
    // nothing in the portal asks it to: the sign-in form takes an
    // address typed in full.
    return [];
  }

  async findByEmail(email: string): Promise<DirectoryAccount | null> {
    return this.session({ email });
  }

  async findById(userId: string): Promise<DirectoryAccount | null> {
    const held = HttpDirectory.cache.get(userId);
    if (held && Date.now() - held.at < HttpDirectory.TTL_MS) return held.account;
    const account = await this.session({ userId });
    HttpDirectory.cache.set(userId, { at: Date.now(), account });
    return account;
  }

  async canAccessVenue(userId: string, venueId: string): Promise<boolean> {
    const account = await this.findById(userId);
    return Boolean(account?.venues.some((v) => v.id === venueId));
  }

  async verify(email: string, password: string): Promise<DirectoryAccount | null> {
    const account = await this.session({ email, password });
    if (account) {
      HttpDirectory.cache.set(account.userId, { at: Date.now(), account });
    }
    return account;
  }

  /**
   * `GET` to read, `POST` to exchange credentials. Anything other than
   * a 2xx is "no account": a 401 and a 404 are the same answer to the
   * sign-in form, which is what stops it being used to find out which
   * partners have accounts.
   */
  private async session(input: {
    email?: string;
    password?: string;
    userId?: string;
  }): Promise<DirectoryAccount | null> {
    const path = "/api/business/auth/session";
    const query = input.userId
      ? `?user_id=${encodeURIComponent(input.userId)}`
      : input.password
        ? ""
        : `?email=${encodeURIComponent(input.email ?? "")}`;

    try {
      const response = await fetch(`${this.baseUrl}${path}${query}`, {
        method: input.password ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: input.password
          ? JSON.stringify({ email: input.email, password: input.password })
          : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return null;
      return readAccount(await response.json());
    } catch {
      // A directory that throws takes the whole shell down with it —
      // the layout resolves the session before it renders anything. A
      // signed-out portal is a worse outcome than a 500 only if the
      // outage is imaginary, so this returns null and the middleware
      // sends the partner back to Connexion.
      return null;
    }
  }
}

/**
 * The wire shape, narrowed.
 *
 * Written out field by field rather than cast: a backend that renames
 * one of these should fail here, in the one place that knows the format,
 * rather than three screens later as a missing establishment name.
 */
function readAccount(body: unknown): DirectoryAccount | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  const userId = typeof row.userId === "string" ? row.userId : null;
  if (!userId) return null;

  const venues = Array.isArray(row.venues) ? row.venues : [];
  return {
    userId,
    fullName: typeof row.fullName === "string" ? row.fullName : userId,
    email: typeof row.email === "string" ? row.email : "",
    venues: venues.flatMap((raw): DirectoryMembership[] => {
      if (!raw || typeof raw !== "object") return [];
      const v = raw as Record<string, unknown>;
      if (typeof v.id !== "string") return [];
      const name = typeof v.name === "string" ? v.name : v.id;
      return [
        {
          id: v.id,
          name,
          shortName: typeof v.shortName === "string" ? v.shortName : name,
          initials:
            typeof v.initials === "string"
              ? v.initials
              : name.slice(0, 2).toUpperCase(),
          city: typeof v.city === "string" ? v.city : "",
          kind: typeof v.kind === "string" ? v.kind : "restaurant",
          role: typeof v.role === "string" ? v.role : "staff",
        },
      ];
    }),
  };
}

let cached: Directory | null = null;

export function directory(): Directory {
  if (cached) return cached;
  // Same rule as the data layer, and now with the same three branches:
  // a configured backend answers for the accounts as well as the
  // bookings. `http` used to fall through to the database directory,
  // which is why signing in needed a SQLite file even when every screen
  // was reading a service.
  if (dataMode() === "http") {
    cached = new HttpDirectory(
      process.env.LYFE_API_BASE_URL!,
      process.env.LYFE_API_TOKEN!,
    );
  } else if (dataMode() === "static") {
    cached = new StaticDirectory();
  } else {
    cached = new DatabaseDirectory();
  }
  return cached;
}

/** Test seam — install a directory without touching callers. */
export function setDirectory(next: Directory | null) {
  cached = next;
}

export type { DirectoryUser };
