import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Webhook signature verification.
//
// A webhook endpoint is a public URL that mutates what a restaurant sees
// on the pass. Without verification anyone who learns the URL can cancel
// a table. This checks an HMAC over the raw body — raw, because
// re-serialising JSON changes bytes and breaks the signature.
//
// The timestamp check closes the replay window: a captured
// "reservation.cancelled" is worthless five minutes later.

const TOLERANCE_SECONDS = 300;

export interface VerifyResult {
  ok: boolean;
  reason?: "missing" | "malformed" | "stale" | "mismatch";
}

export function verifySignature({
  rawBody,
  header,
  secret,
  now = Date.now(),
}: {
  rawBody: string;
  /** `t=<unix seconds>,v1=<hex hmac>` */
  header: string | null;
  secret: string;
  now?: number;
}): VerifyResult {
  if (!header) return { ok: false, reason: "missing" };

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    }),
  );

  const timestamp = Number(parts.t);
  const provided = parts.v1;
  if (!Number.isFinite(timestamp) || !provided) {
    return { ok: false, reason: "malformed" };
  }

  if (Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  // Length check first: timingSafeEqual throws on a length mismatch, and
  // that throw would itself be a timing signal.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "mismatch" };
  }

  return { ok: true };
}
