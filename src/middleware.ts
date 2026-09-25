import { NextRequest, NextResponse } from "next/server";

// The first gate, and only the first.
//
// It reads `lyfe.session.present`, a cookie that carries no identity
// and is not trusted for anything: a request without it is redirected
// to /login before SSR, so curl-ing a venue screen returns the login
// redirect rather than the bare HTML. That is all this file decides.
//
// *Who* you are is decided elsewhere, and after this: `lyfe.user` and
// `lyfe.venue` are HMAC-signed and HttpOnly (`lib/auth/cookie.ts`),
// `resolveSession()` verifies the signature on every request, and every
// venue-scoped write re-checks the membership through the directory.
// Editing `document.cookie` therefore gets a visitor as far as a
// redirect loop, not into someone else's book — which was not true
// before: the identity cookies used to be readable, writable and
// unsigned.
//
// The presence cookie stays deliberately dumb, because the alternative
// is verifying a signature in middleware on every asset request for a
// gate whose only job is to avoid rendering a page nobody will see.

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
