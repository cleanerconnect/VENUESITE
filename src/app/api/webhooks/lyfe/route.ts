import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { parseLyfeEvent, isLiveUpdate } from "@/lib/integrations/events";
import { verifySignature } from "@/lib/integrations/signature";
import { RESTAURANT_BASE } from "@/lib/restaurant/slugs";

// Inbound events from the LYFE platform.
//
// A diner books in the consumer app; this is how the table shows up on
// the pass. The handler does three things and no more: verify, dedupe,
// invalidate. It does not patch state — the dashboard re-reads the
// overview and re-derives, so a duplicate delivery is a wasted fetch
// rather than a double-booked table.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * In-process dedupe. Sufficient for a single instance; a multi-instance
 * deploy should back this with Redis — see docs/INTEGRATION.md.
 */
const seen = new Map<string, number>();
const DEDUPE_TTL_MS = 10 * 60_000;

export async function POST(request: NextRequest) {
  const secret = process.env.LYFE_WEBHOOK_SECRET;
  if (!secret) {
    // Refusing is the safe failure. An unverified endpoint that mutates
    // what a restaurant sees is worse than one that is down.
    console.error("[webhook] LYFE_WEBHOOK_SECRET is not set");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  // Raw body: re-serialising would change the bytes the HMAC covers.
  const rawBody = await request.text();
  const verdict = verifySignature({
    rawBody,
    header: request.headers.get("lyfe-signature"),
    secret,
  });

  if (!verdict.ok) {
    return Response.json(
      { error: "invalid_signature", reason: verdict.reason },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const event = parseLyfeEvent(payload);
  if (!event) {
    return Response.json({ error: "unsupported_event" }, { status: 400 });
  }

  // 200 on a duplicate, not an error — retries are the sender behaving
  // correctly, and a non-2xx would make it retry harder.
  if (isDuplicate(event.id)) {
    return Response.json({ status: "duplicate" });
  }

  if (isLiveUpdate(event.type)) {
    // Invalidates the route so the *next* navigation is fresh. Every
    // restaurant screen derives from one payload, so this refreshes the
    // floor plan, the book and the feed together — they cannot end up
    // showing different moments.
    //
    // It does NOT push to a dashboard that is already open: the route is
    // `force-dynamic`, so there is no full-route cache to bust, and a
    // manager staring at the pass sees nothing until they navigate.
    // Closing that gap needs a live channel (SSE from this app, or a
    // hosted pub/sub) — see docs/INTEGRATION.md § Live updates. Until
    // then this endpoint is correct but not yet sufficient.
    revalidatePath(`${RESTAURANT_BASE}/[[...section]]`, "page");
  }

  return Response.json({ status: "accepted", eventId: event.id });
}

function isDuplicate(id: string): boolean {
  const now = Date.now();
  for (const [key, at] of seen) {
    if (now - at > DEDUPE_TTL_MS) seen.delete(key);
  }
  if (seen.has(id)) return true;
  seen.set(id, now);
  return false;
}
