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

export function SessionSync({
  userId,
  email,
  organizerId,
  role,
}: {
  userId: string;
  email: string;
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
    if (current && current.userId === userId) return;

    writeSession({
      userId,
      organizerId,
      role,
      email,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
  }, [userId, email, organizerId, role]);

  return null;
}
