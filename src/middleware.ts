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
  "/contact",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const hasSession = req.cookies.get(COOKIE)?.value === "1";
  if (hasSession) return NextResponse.next();

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
