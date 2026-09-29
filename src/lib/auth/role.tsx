"use client";

import { useEffect, useState } from "react";
import { readSession, type Role } from "./session";
import { useWorkspaceAccess } from "./workspace-access";
import { initialsOf, knownUser } from "@/lib/auth/static/users";
import type { AppUser } from "@/lib/auth/static/users";
import {
  DEFAULT_PROFILE_ID,
  PROFILES,
  getProfile,
} from "@/lib/auth/static/profiles";
import type { OrganizerProfile } from "@/lib/types/domain";

// Subscribe to a custom "lyfe-session-changed" event so the demo role
// switcher can re-render every gated CTA without a full page reload.
const EVENT = "lyfe-session-changed";

export function emitSessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function useRole(): Role | null {
  // Seeded from the server, not from null.
  //
  // The localStorage mirror only exists after the browser has run, so
  // this hook used to start at null in both renders and correct itself
  // on mount. Agreeing on null is not the same as being right: on a
  // slow connection the correction lands while React is still
  // hydrating, and a nav that grows mid-hydration is a tree React
  // throws away — the intermittent `#418`. The portal layout resolves
  // the role from the session cookie and publishes it, so the first
  // client render can be the same render the server sent.
  //
  // Outside the portal there is no provider and the seed is null, which
  // is the old behaviour and the right one: the sign-in screen has no
  // viewer.
  const seeded = useWorkspaceAccess().role;
  const [role, setRole] = useState<Role | null>(seeded);

  useEffect(() => {
    // The mirror wins once it exists; the server's answer stands until
    // then, so a browser with no mirror yet does not lose the nav.
    const sync = () => setRole(readSession()?.role ?? seeded);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [seeded]);

  return role;
}

// Active organizer profile, derived from session.organizerId. Returns
// null until the client-side mount resolves so SSR doesn't render a
// stale chrome (Sidebar org card) before the real profile is known.
//
// Null also when the account holds no organisation at all. The layout
// writes an empty `organizerId` for a partner who only has
// establishments, and `??` does not catch an empty string — so the
// fallback fired and a restaurant partner's phone « Plus » screen
// announced « Jazzablanca Festival · Casablanca » as their active
// profile. An account with no organisation has no organizer profile,
// and every caller already draws nothing rather than guessing.
export function useProfile(): OrganizerProfile | null {
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);

  useEffect(() => {
    const sync = () => {
      const session = readSession();
      const id = session?.organizerId?.trim() ?? DEFAULT_PROFILE_ID;
      if (!id) {
        setProfile(null);
        return;
      }
      setProfile(getProfile(id) ?? PROFILES[DEFAULT_PROFILE_ID]);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return profile;
}

// The signed-in person. Null until the client mount resolves, same
// contract as useProfile — the chrome renders a skeleton rather than
// someone else's name.
//
// The session mirror carries the name the server resolved, and it is
// read first. `lib/auth/static/users` holds two people — Mido and
// Yassine — and `getUser` used to fall back to the first of them, so
// the sidebar and the phone's « Plus » screen greeted every other
// partner as Mido Reffas. A name nobody can supply is null here, and
// null draws nothing.
export function useUser(): AppUser | null {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const sync = () => {
      const session = readSession();
      if (!session) {
        setUser(null);
        return;
      }
      const name = session.fullName?.trim();
      if (name) {
        setUser({
          id: session.userId,
          name,
          initials: initialsOf(name),
          email: session.email,
        });
        return;
      }
      setUser(knownUser(session.userId));
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}

// Wrap any element that should only render for a subset of roles. Default
// allows owner + admin (the two roles that can edit the org). Scanner
// sees only what they need to scan tickets.
export function RoleGate({
  allow = ["owner", "admin"],
  fallback = null,
  children,
}: {
  allow?: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const role = useRole();
  // While the role hasn't synced yet (initial mount), render nothing to
  // avoid a flash of a CTA that's about to disappear for the Scanner role.
  if (role === null) return null;
  if (!allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
