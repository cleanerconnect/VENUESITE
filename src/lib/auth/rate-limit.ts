import "server-only";

// A throttle on the sign-in path.
//
// There was none: fifty POSTs to the session endpoint in 0.3 s were all
// answered, which is an invitation to try a password list against
// seven addresses that are written in the handover documentation.
//
// A fixed window in module memory, and the honest limits of that:
//
//   · On Vercel each instance counts on its own, so N instances allow
//     N × the limit. It still turns a burst from one caller into a
//     refusal, which is what a script does.
//   · A restart forgets everything.
//
// So this is the floor, not the ceiling. A deployment open to the
// internet also rate-limits at the edge (Vercel's WAF, or a rule in
// front of the Business Service), and the Business Service throttles
// `POST /api/business/auth/session` itself — it is the only party that
// sees every attempt. `docs/LOT1_API_CONTRACT.md` §5.1 says so.
//
// Keyed on the address rather than the IP: a host stand and a whole
// riad share one NAT address, and locking out a venue because a
// neighbour mistyped their password is worse than the attack.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Attempts allowed per key, per window. */
const LIMIT = Number(process.env.LYFE_SIGNIN_LIMIT ?? 10);
const WINDOW_MS = 60_000;

/**
 * Counts one attempt and says whether it is allowed.
 *
 * `retryInSeconds` is what the message tells the caller, so the number
 * they read is the number they wait.
 */
export function allowAttempt(
  key: string,
  // Sign-in takes the default. An authenticated action that a tool
  // legitimately calls a few times per run — switching venue — passes a
  // higher one: the ceiling is there to stop a script, not to break a
  // verification pass.
  limit: number = LIMIT,
): {
  allowed: boolean;
  retryInSeconds: number;
} {
  const now = Date.now();
  // Cheap sweep: without it a password list against a thousand
  // addresses leaves a thousand entries behind for ever.
  if (windows.size > 5_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }

  const held = windows.get(key);
  if (!held || held.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryInSeconds: 0 };
  }
  held.count += 1;
  if (held.count > limit) {
    return {
      allowed: false,
      retryInSeconds: Math.max(1, Math.ceil((held.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryInSeconds: 0 };
}

/** Forgets a key. Called after a sign-in that worked. */
export function clearAttempts(key: string): void {
  windows.delete(key);
}
