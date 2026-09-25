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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
