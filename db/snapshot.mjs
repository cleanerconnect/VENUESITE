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

// The same clock the seed was written on. The snapshot captures screen
// payloads — the greeting, the service in hand, what is « today » — so
// a capture taken at 03h17 of a dataset built for 20h30 is a static
// dataset whose Accueil says the service is over.
const { installDemoClock, toolClock } = await import(
  "../src/lib/time/demo-clock-shared.mjs"
);
installDemoClock(toolClock());

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
const ops = await import("../src/lib/db/operations-store.ts");
const audience = await import("../src/lib/db/audience-store.ts");
const { all } = await import("../src/lib/db/store.ts");

const PERIODS = ["7d", "30d", "90d", "12m"];

// Réservations can be walked day by day, so the snapshot has to hold
// more than today. The window matches the one the date picker allows —
// a week back for what just happened, a month forward to cover the
// fortnight the seed fills and leave room past it.
const BOOK_DAYS_BACK = 7;
const BOOK_DAYS_AHEAD = 30;

const isoDay = (d) => d.toISOString().slice(0, 10);

function bookWindow() {
  const days = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let i = -BOOK_DAYS_BACK; i <= BOOK_DAYS_AHEAD; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(isoDay(d));
  }
  return days;
}
const OUT = resolve("src/lib/data/static/venue-snapshot.json");

// Every user the demo can sign in as, with the venues they hold. This is
// the directory the session driver resolves against when there is no
// database.
// Awaited, all of it. The store's `all/one/run` became async when the
// Postgres engine landed beside SQLite, and this file kept calling them
// synchronously: `npm run db:snapshot` — the documented way to
// regenerate the static dataset — has failed with « all(...).map is not
// a function » ever since, which is why the committed snapshot predated
// `slot_minutes` and the static driver read « créneaux de undefined
// minutes ».
const users = await Promise.all(
  (
    await all(
      "SELECT DISTINCT user_id, full_name, email FROM staff WHERE pending = 0",
    )
  ).map(async (r) => ({
    userId: String(r.user_id),
    fullName: String(r.full_name),
    email: String(r.email),
    venues: await venue.venuesForUser(String(r.user_id)),
  })),
);

const venueIds = [...new Set(users.flatMap((u) => u.venues.map((v) => v.id)))];

const perVenue = {};
for (const id of venueIds) {
  // `overview()` takes the viewer's first name for the greeting. The
  // static driver re-derives that per request, so capture it empty.
  const customers = await venue.customers(id);
  perVenue[id] = {
    overview: await overview.overview(id, ""),
    // One entry per day in the window, captured through the same
    // function the SQLite driver calls, so a day read without a
    // database is the day the database would have given.
    dayBooks: Object.fromEntries(
      await Promise.all(
        bookWindow().map(async (date) => [date, await overview.dayBookFor(id, date)]),
      ),
    ),
    profile: await overview.venueProfile(id),
    menuItems: await overview.menuItems(id),
    availability: await venue.availability(id),
    customers,
    notifications: await venue.notifications(id),
    notificationPreferences: await venue.notificationPreferences(id),
    staff: await write.listStaff(id),
    photos: await assets.listAssets(id, "photo"),
    menuFiles: await assets.listAssets(id, "menu_file"),
    analytics: Object.fromEntries(
      await Promise.all(
        PERIODS.map(async (p) => [p, await overview.analytics(id, p)]),
      ),
    ),
    visibility: Object.fromEntries(
      await Promise.all(
        PERIODS.map(async (p) => [p, await overview.visibility(id, p)]),
      ),
    ),
    // The Phase 5 bundles. Captured through the same store functions the
    // SQLite path reads with, for the same reason as everything above:
    // the snapshot is that path's payload, so the shapes cannot drift.
    operations: {
      serviceFloor: await ops.serviceFloor(id),
      guestGraph: await ops.guestGraph(id),
      audience: await audience.audienceInsights(id),
      growth: await ops.growth(id),
      nightlife: await ops.nightlife(id),
      moneyDesk: await ops.moneyDesk(id),
      marketing: await ops.marketing(id),
      serviceConfiguration: {
        services: await ops.serviceDefinitions(id),
        pacing: await ops.pacingRules(id),
      },
      surveyConfig: await ops.surveyConfig(id),
      settings: await ops.venueSettings(id),
      subscription: await ops.subscription(id),
      supportTickets: await ops.supportTickets(id),
      spendByCustomer: await ops.spendByCustomer(id),
      // One entry per guest, so the Fiche client's Historique has the
      // same rows without a database.
      bookingsByCustomer: Object.fromEntries(
        await Promise.all(
          customers.map(async (c) => [c.id, await overview.customerBookings(id, c.id)]),
        ),
      ),
    },
  };
}

const businessAccounts = Object.fromEntries(
  (
    await Promise.all(
      users.map(async (u) => [
        u.userId,
        await venue.businessAccountForUser(u.userId),
      ]),
    )
  ).filter(([, account]) => account !== null),
);

const snapshot = {
  // Stamped so a stale snapshot is visible rather than mysterious. The
  // static driver rebases every timestamp off this on read, so a
  // six-month-old snapshot still shows a service in progress today.
  capturedAt: new Date().toISOString(),
  // The lot the capture ran under, and the lots the file can serve.
  //
  // Every slice is captured whatever `LYFE_LOT` says, on purpose: the
  // lot filters screens, not data, so one committed snapshot serves
  // both modes and a cold clone cannot land on a file that happens to
  // be missing what the other lot needs. The stamp is here so that
  // stays a decision someone made rather than a coincidence.
  capturedUnderLot: process.env.LYFE_LOT?.trim() === "2" ? 2 : 1,
  serves: [1, 2],
  users,
  businessAccounts,
  venues: perVenue,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);

const kb = (JSON.stringify(snapshot).length / 1024).toFixed(0);
console.log(`Snapshot written to ${OUT}`);
console.log(
  `  users ${users.length} · venues ${venueIds.length} · ${kb} KB · sert les lots 1 et 2`,
);
