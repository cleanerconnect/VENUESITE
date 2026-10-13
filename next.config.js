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
// The demo assets have to reach the deployment that serves them.
//
// `/api/assets/[...key]` reads bytes off the filesystem, under
// `.data/assets` — the local driver that stands in for S3 until there
// is a bucket. The build writes them: `db/bootstrap.mjs` runs
// `db/seed.mjs` before `next build`, and the seed writes a PNG per
// photo, a vignette and a carte as it writes the rows that name them.
//
// Nothing referenced that directory from code, so Next's output tracing
// did not see it, and the function was bundled without a single byte of
// it. On Vercel every asset the route was asked for resolved to a path
// that is not in the bundle: Ma fiche → Photos drew its frames and the
// route answered 404 for all of them. The rows were there — this is the
// other half of the same empty screen, and a count of `venue_assets`
// cannot see it.
//
// Declaring it here is what puts the files in the function. It is a
// build-output concern and not a code one, which is exactly why no
// import could have expressed it.
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/assets/[...key]": [".data/assets/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

module.exports = nextConfig;
