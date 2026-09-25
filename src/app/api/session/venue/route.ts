import { NextRequest } from "next/server";
import { directory } from "@/lib/auth/directory";
import { resolveSession, VENUE_COOKIE } from "@/lib/auth/server-session";
import { sign, THIRTY_DAYS } from "@/lib/auth/cookie";
import { allowAttempt } from "@/lib/auth/rate-limit";

// Venue switch.
//
// Writes the active venue onto the session cookie — but only after
// checking the user actually holds it. The check is here rather than in
// the client because a client-side check is a suggestion.
//
// The check goes through the directory, not the SQLite store. Reaching
// past the seam meant a cold clone — where there is no database — got an
// empty membership table and refused every switch with a 403, so the
// second venue was unreachable on exactly the setup an external team
// clones into. Same failure mode as the layout in Phase 4, same fix.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await resolveSession();
  if (!session) {
    return Response.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Authenticated, but still worth a ceiling: this route is the one a
  // script can hammer to enumerate venue ids against a stolen session.
  const gate = allowAttempt(`venue:${session.userId}`, 30);
  if (!gate.allowed) {
    return Response.json(
      { error: "too_many_requests", retryInSeconds: gate.retryInSeconds },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { venueId?: string } | null;
  const venueId = body?.venueId;
  if (!venueId) {
    return Response.json({ error: "venue_required" }, { status: 400 });
  }
  if (!(await directory().canAccessVenue(session.userId, venueId))) {
    // Deliberately not 404: the caller is authenticated and asking for
    // something they may not have. Saying "forbidden" leaks nothing they
    // could not already infer from their own venue list.
    return Response.json({ error: "venue_forbidden" }, { status: 403 });
  }

  const response = Response.json({ ok: true, venueId });
  response.headers.append(
    "Set-Cookie",
    // Signed, HttpOnly and Secure like every other write of this
    // cookie. Hand-rolled here because the route returns a Response
    // rather than using the cookie jar; the flags are the same set
    // `identityCookie()` produces, and `cookie.ts` says why each one.
    [
      `${VENUE_COOKIE}=${sign(venueId)}`,
      "Path=/",
      `Max-Age=${THIRTY_DAYS}`,
      "SameSite=Lax",
      "HttpOnly",
      ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
    ].join("; "),
  );
  return response;
}
