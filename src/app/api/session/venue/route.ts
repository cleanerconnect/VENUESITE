import { NextRequest } from "next/server";
import { userCanAccessVenue } from "@/lib/db/venue-store";
import { resolveSession, VENUE_COOKIE } from "@/lib/auth/server-session";

// Venue switch.
//
// Writes the active venue onto the session cookie — but only after
// checking the user actually holds it. The check is here rather than in
// the client because a client-side check is a suggestion.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await resolveSession();
  if (!session) {
    return Response.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { venueId?: string } | null;
  const venueId = body?.venueId;
  if (!venueId) {
    return Response.json({ error: "venue_required" }, { status: 400 });
  }
  if (!userCanAccessVenue(session.userId, venueId)) {
    // Deliberately not 404: the caller is authenticated and asking for
    // something they may not have. Saying "forbidden" leaks nothing they
    // could not already infer from their own venue list.
    return Response.json({ error: "venue_forbidden" }, { status: 403 });
  }

  const response = Response.json({ ok: true, venueId });
  response.headers.append(
    "Set-Cookie",
    `${VENUE_COOKIE}=${venueId}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`,
  );
  return response;
}
