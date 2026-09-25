import { NextRequest, NextResponse } from "next/server";

// Demo-grade gate. Reads the `lyfe.session.present` cookie that
// `lib/auth/session.ts` mirrors alongside the localStorage session. If
// it's missing on a protected path, we 307 to /login server-side before
// SSR — so curl-ing /dashboard returns the login redirect, not the bare
// dashboard HTML. Real auth (Auth.js/Clerk) replaces this whole file in
// the DigiNegoce handoff; the cookie is presence-only, no secrets.

const COOKIE = "lyfe.session.present";

const PUBLIC_PATHS = new Set([
  "/",
  "/splash",
  "/login",
  // Signing up happens before there is a session to gate on. The flow's
  // own draft cookie is what carries it from step to step.
  "/inscription",
  "/contact",
  // The styleguide holds no venue data — it renders from literal props —
  // so it stays reachable without a session. That is the point: a
  // developer integrating the portal can open it before auth exists.
  "/styleguide",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const hasSession = req.cookies.get(COOKIE)?.value === "1";
  if (hasSession) return NextResponse.next();

  // A server action is not a page, and redirecting one is how a partner
  // whose session died watched « Enregistrement… » spin for ever: the
  // action's fetch followed the 307 to /login, came back with an HTML
  // page instead of a result, and the form never heard either way —
  // silently losing what they had typed.
  //
  // So actions are let through. Each one asserts its own session —
  // `requireVenueAccess` on every venue-scoped write — and returns
  // « Votre session a expiré » as a *result*, which the form shows and
  // which leaves the typed values on screen to retry after signing in.
  if (req.method === "POST" && req.headers.has("next-action")) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

// Skip Next internals, API routes, and static assets — anything else
// flows through middleware so we catch every protected page.
export const config = {
  matcher: ["/((?!_next/|api/|favicon\\.svg|.*\\.(?:png|jpe?g|svg|webp|ico|js|css|woff2?|ttf)$).*)"],
};
