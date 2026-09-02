// The shape every write returns.
//
// A form needs three things from a server action: did it work, which
// fields are wrong, and what the row looks like now. Returning a thrown
// error instead would lose the field mapping, and returning void would
// force a refetch to find out what was actually saved.

import type { FieldError } from "./validation";

export type WriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldError[]; message?: string };

export const ok = <T>(data: T): WriteResult<T> => ({ ok: true, data });

export const invalid = <T>(
  errors: FieldError[],
  message?: string,
): WriteResult<T> => ({ ok: false, errors, message });

export const failed = <T>(message: string): WriteResult<T> => ({
  ok: false,
  errors: [],
  message,
});
