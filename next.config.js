// The server runs on the venue's clock.
//
// Vercel runs in UTC, Casablanca is UTC+1, and the portal's whole job is
// stated in local time: which day the book is showing, whether a service
// is running now, whether a booking is in the past. Left in UTC, the
// dashboard rolled over to the next day an hour late and every service
// time was formatted an hour early.
//
// The display side is pinned separately, in `src/lib/time/zone.ts`,
// because the screen builder runs on both runtimes and they have to
// agree; this line is for the date *logic* that only runs here.
process.env.TZ = process.env.TZ || "Africa/Casablanca";

// Response headers.
//
// There were none, which on a dashboard holding guests' names, phones,
// e-mails and allergies is a gap an acceptance will find. Vercel adds
// HSTS on its own domains; the rest is ours.
//
// The Content-Security-Policy is deliberately `Report-Only`. Next's
// App Router inlines its bootstrap script and Tailwind inlines styles,
// so an enforcing policy needs per-request nonces and a streaming-safe
// `style-src` — real work, and shipping it wrong takes the portal down
// rather than leaving it merely unprotected. Report-Only collects the
// violations a strict policy would cause, so tightening it becomes a
// measurement instead of a gamble. Set `LYFE_CSP_ENFORCE=1` to serve it
// as `Content-Security-Policy` once the report is clean.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' and 'unsafe-eval' are what the framework needs
  // today; the nonce work above is what removes them.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Map tiles come from whatever provider `NEXT_PUBLIC_MAP_TILE_URL`
  // names, so images are allowed from https at large; nothing else is.
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The scanner needs the camera and Ma fiche needs the map's
    // geolocation; nothing here needs a microphone or a payment sheet.
    value: "camera=(self), geolocation=(self), microphone=(), payment=()",
  },
  {
    key:
      process.env.LYFE_CSP_ENFORCE === "1"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
    value: CSP,
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

module.exports = nextConfig;
