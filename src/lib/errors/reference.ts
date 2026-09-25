import "server-only";

import { randomBytes } from "node:crypto";

// A reference a partner can quote.
//
// A render error already carries one: Next stamps a `digest` on it, the
// error boundary prints it and the same string is in the platform log.
// A failed *write* had nothing — the toast said « Une erreur est
// survenue » and the log line said which command failed, with no way to
// tie the two together. A partner who rings LYFE at 21h because
// « Accepter » refused could not be answered without guessing which of
// the evening's log lines was theirs.
//
// Eight hex characters: short enough to read over a phone in a noisy
// room, long enough that an evening's failures do not collide.

/**
 * Logs the failure with a fresh reference and returns it.
 *
 * The reference is the only thing that reaches the browser. The error
 * itself is logged and never rendered: a stack trace in a toast tells a
 * partner nothing and tells anyone watching the screen too much.
 */
export function logFailure(scope: string, error: unknown): string {
  const reference = randomBytes(4).toString("hex");
  console.error(`[lyfe] ${scope} a échoué · réf ${reference}`, error);
  return reference;
}
