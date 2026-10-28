"use client";

// Mirrors the server session into the client's view of it.
//
// The cookies the login screen writes are the source of truth, and the
// layout resolves them server-side. But the event workspace's chrome
// reads a client session (`lib/auth/session`) for the current role and
// active organisation, both of which are switchable in the demo.
//
// Rather than keeping two independent sessions — which is how the
// portal ended up able to be "signed in" on the server and signed out
// on the client at the same time — this writes the server's answer into
// the client mirror on mount. The mirror is downstream, never upstream.
//
// When a real backend lands, the client session goes away entirely and
// the chrome reads role and organisation from the server payload.

import { useEffect } from "react";
import { readSession, writeSession, type Role } from "@/lib/auth/session";

/**
 * How much a role grants, so a stale mirror can be told from a
 * deliberate one.
 *
 * The demo's sidebar lets a reviewer drop to a narrower role, and that
 * choice has to survive a navigation. A *wider* role on the server is
 * the opposite case: the mirror has fallen behind.
 */
const GRANTS: Record<Role, number> = { scanner: 0, admin: 1, owner: 2 };

export function SessionSync({
  userId,
  email,
  fullName,
  organizerId,
  role,
}: {
  userId: string;
  email: string;
  /** The person's name, as the server session holds it. */
  fullName: string;
  /** First organisation the account holds, or "" for a venue-only account. */
  organizerId: string;
  role: Role;
}) {
  useEffect(() => {
    const current = readSession();

    // Only rewrite when the identity actually changed. The demo lets a
    // reviewer switch role and organisation from the sidebar, and
    // clobbering that on every navigation would make those controls
    // look broken.
    // ... but a mirror written before the name existed is refreshed,
    // or the chrome keeps naming whoever the fixture table defaults to.
    // ... and so is one the server has since widened. That is not
    // hypothetical: since the 27 October split a partner signs in with
    // no establishment, where the layout can only publish « scanner » —
    // and the mirror written then outlived the venue they created a
    // minute later, so every role-gated control on their own brand-new
    // dashboard was drawn disabled. A narrower role in the mirror is a
    // reviewer's choice and stands; a wider one on the server means the
    // mirror is behind.
    const behind = current ? GRANTS[current.role] < GRANTS[role] : false;
    if (current && current.userId === userId && current.fullName && !behind) {
      return;
    }

    writeSession({
      userId,
      organizerId,
      role,
      email,
      fullName,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
  }, [userId, email, fullName, organizerId, role]);

  return null;
}
