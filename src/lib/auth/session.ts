// Session is mocked in localStorage. Real auth (NextAuth, Supabase, custom)
// drops in by replacing this file's three functions; the rest of the app
// only ever calls readSession/writeSession/clearSession.

const KEY = "lyfe.session";

export type Role = "owner" | "admin" | "scanner";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  scanner: "Scanner",
};

export interface Session {
  userId: string;
  organizerId: string;
  role: Role;
  email: string;
  expiresAt: number; // ms epoch
}

const isBrowser = () => typeof window !== "undefined";

export function readSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: Session) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
}

export function seedDemoSession(role: Role = "owner"): Session {
  const session: Session = {
    userId: "usr_mido",
    organizerId: "org_jazzablanca",
    role,
    email:
      role === "scanner"
        ? "scan@jazzablanca.com"
        : role === "admin"
          ? "admin@jazzablanca.com"
          : "mido@jazzablanca.com",
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  };
  writeSession(session);
  return session;
}

/** Demo-only role switch — preserves session identity, swaps role. */
export function switchRole(role: Role): Session | null {
  const current = readSession();
  if (!current) return null;
  const next: Session = { ...current, role };
  writeSession(next);
  return next;
}
