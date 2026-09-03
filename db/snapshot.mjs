// Snapshot the seeded database into the static dataset.
//
// The portal has to run on a laptop with no database. That means two
// sources of demo data — the SQLite one and a static one — and two
// sources of demo data is normally how they drift apart.
//
// So the static one is not written by hand: it is captured from the
// seeded database through the very same store functions the app reads
// with. The shapes cannot diverge, because the snapshot *is* the app's
// payload, serialised. Regenerate after changing the seed or a store:
//
//   npm run db:reset && npm run db:snapshot
//
// Run through `tsx` so it can import the TypeScript store modules.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

process.env.LYFE_DB_PATH ??= resolve(".data/lyfe.db");

// The store modules are marked `server-only`, which throws outside a
// React server context. This is a build script, not a client — stub the
// guard before anything imports it.
const { createRequire } = await import("node:module");
const require_ = createRequire(resolve("package.json"));
require_.cache[require_.resolve("server-only")] = {
  id: "server-only",
  exports: {},
  loaded: true,
};

const overview = await import("../src/lib/db/overview-store.ts");
const venue = await import("../src/lib/db/venue-store.ts");
const write = await import("../src/lib/db/venue-write-store.ts");
const assets = await import("../src/lib/db/asset-store.ts");
const { all } = await import("../src/lib/db/store.ts");

const PERIODS = ["7d", "30d", "90d", "12m"];
const OUT = resolve("src/lib/data/static/venue-snapshot.json");

// Every user the demo can sign in as, with the venues they hold. This is
// the directory the session driver resolves against when there is no
// database.
const users = all(
  "SELECT DISTINCT user_id, full_name, email FROM staff WHERE pending = 0",
).map((r) => ({
  userId: String(r.user_id),
  fullName: String(r.full_name),
  email: String(r.email),
  venues: venue.venuesForUser(String(r.user_id)),
}));

const venueIds = [...new Set(users.flatMap((u) => u.venues.map((v) => v.id)))];

const perVenue = {};
for (const id of venueIds) {
  // `overview()` takes the viewer's first name for the greeting. The
  // static driver re-derives that per request, so capture it empty.
  perVenue[id] = {
    overview: overview.overview(id, ""),
    profile: overview.venueProfile(id),
    menuItems: overview.menuItems(id),
    availability: venue.availability(id),
    customers: venue.customers(id),
    notifications: venue.notifications(id),
    notificationPreferences: venue.notificationPreferences(id),
    staff: write.listStaff(id),
    photos: assets.listAssets(id, "photo"),
    menuFiles: assets.listAssets(id, "menu_file"),
    analytics: Object.fromEntries(
      PERIODS.map((p) => [p, overview.analytics(id, p)]),
    ),
    visibility: Object.fromEntries(
      PERIODS.map((p) => [p, overview.visibility(id, p)]),
    ),
  };
}

const businessAccounts = Object.fromEntries(
  users
    .map((u) => [u.userId, venue.businessAccountForUser(u.userId)])
    .filter(([, account]) => account !== null),
);

const snapshot = {
  // Stamped so a stale snapshot is visible rather than mysterious. The
  // static driver rebases every timestamp off this on read, so a
  // six-month-old snapshot still shows a service in progress today.
  capturedAt: new Date().toISOString(),
  users,
  businessAccounts,
  venues: perVenue,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);

const kb = (JSON.stringify(snapshot).length / 1024).toFixed(0);
console.log(`Snapshot written to ${OUT}`);
console.log(`  users ${users.length} · venues ${venueIds.length} · ${kb} KB`);
