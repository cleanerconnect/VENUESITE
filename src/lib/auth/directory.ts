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
  listAccounts(): DirectoryAccount[];
  findByEmail(email: string): DirectoryAccount | null;
  findById(userId: string): DirectoryAccount | null;
  canAccessVenue(userId: string, venueId: string): boolean;
}

class StaticDirectory implements Directory {
  listAccounts() {
    return staticUsers();
  }
  findByEmail(email: string) {
    return staticUserByEmail(email);
  }
  findById(userId: string) {
    return staticUser(userId);
  }
  canAccessVenue(userId: string, venueId: string) {
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

  listAccounts(): DirectoryAccount[] {
    return this.rows()
      .all("SELECT DISTINCT user_id, full_name, email FROM staff WHERE pending = 0")
      .map((r) => ({
        userId: String(r.user_id),
        fullName: String(r.full_name),
        email: String(r.email),
        venues: this.store().venuesForUser(String(r.user_id)),
      }));
  }

  findByEmail(email: string) {
    const needle = email.trim().toLowerCase();
    return (
      this.listAccounts().find((a) => a.email.toLowerCase() === needle) ?? null
    );
  }

  findById(userId: string) {
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

  canAccessVenue(userId: string, venueId: string) {
    return this.store().userCanAccessVenue(userId, venueId);
  }
}

let cached: Directory | null = null;

export function directory(): Directory {
  if (cached) return cached;
  // `http` uses the database directory too: when a real backend exists it
  // replaces this module wholesale, and until then the seeded database is
  // the closer approximation of it.
  cached = dataMode() === "static" ? new StaticDirectory() : new DatabaseDirectory();
  return cached;
}

/** Test seam — install a directory without touching callers. */
export function setDirectory(next: Directory | null) {
  cached = next;
}

export type { DirectoryUser };
