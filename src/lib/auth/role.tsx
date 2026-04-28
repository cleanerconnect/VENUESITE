"use client";

import { useEffect, useState } from "react";
import { readSession, type Role } from "./session";

// Subscribe to a custom "lyfe-session-changed" event so the demo role
// switcher can re-render every gated CTA without a full page reload.
const EVENT = "lyfe-session-changed";

export function emitSessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function useRole(): Role | null {
  // Mount-only; on the server we have no session, so we always return null
  // and let the SessionGuard's null-render handle the unauthenticated case.
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const sync = () => setRole(readSession()?.role ?? null);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return role;
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
