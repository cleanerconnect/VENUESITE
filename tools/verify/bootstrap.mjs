// What a deployment's database holds after a build, when that database
// is not new.
//
//   DATABASE_URL=postgres://…/lyfe_boot node tools/verify/bootstrap.mjs
//
// Every other tool here reads screens. This one reads the step that
// furnishes what the screens read, in the one state nothing else
// exercises: a database that was filled weeks ago by an older seed and
// has been bootstrapped by every build since.
//
// That state broke the demo twice in one day, in two different ways, and
// both are the same shape — the first deploy writes the whole dataset,
// every deploy after it writes only part, and the part it leaves out is
// invisible until a screen needs it:
//
//   · Ma fiche → Photos showed nothing. The photo rows entered
//     `db/seed.mjs` on 26 September; the database was filled from it on
//     the 25th. `venue_assets` had never held a row and never would:
//     the only path that writes one needs an empty database.
//   · Réservations showed « Carnet vide » under a day bar naming a
//     service, with two thousand bookings in the table. The build seeds
//     through a tool, whose clock falls back to the Thursday of the
//     week; the portal's falls back to the real one. The data was
//     anchored to a day the deployment was not on.
//
// Neither is visible in a count of `reservations`, and neither would
// have failed a tool that renders screens against a *fresh* database.
// So this one builds the stale state on purpose and counts what comes
// out the other side.
//
// Six assertions, in the order a reviewer would check them by hand:
//
//   1. the photos, the vignette and the carte are there
//   2. the service definitions Disponibilités edits are there
//   3. the two live service rows are dated **today** — the day the
//      portal will ask for
//   4. today holds bookings, and the live service's own book is not
//      empty
//   5. the no-show history the Performance figures divide by is there
//   6. a booking made through the portal before the build is still
//      there afterwards
//
// It needs a Postgres database it may rewrite, and it says so before it
// touches anything. `LYFE_LOT` is honoured, so the check can be run in
// either lot.

import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { connect } from "../../db/pg.mjs";

const DEMO_VENUES = ["rst_dar_zellij", "bar_nomad_casa"];
const SEED_FILE = resolve(`.data/verify-bootstrap-${process.pid}.db`);
/** How far back the stale state is pushed: more than a week, under a month. */
const STALE_DAYS = 9;

if (!process.env.DATABASE_URL) {
  console.error(
    "tools/verify/bootstrap.mjs a besoin d'une base Postgres jetable :\n" +
      "\n  createdb lyfe_boot\n" +
      "  DATABASE_URL=postgres://localhost/lyfe_boot node tools/verify/bootstrap.mjs\n" +
      "\nElle est vidée et re-semée par ce contrôle ; ne lui donnez pas une\n" +
      "base qui porte autre chose.",
  );
  process.exit(1);
}

const LOT = process.env.LYFE_LOT?.trim() === "2" ? 2 : 1;
const run = (script, ...args) =>
  execFileSync(process.execPath, [script, ...args], {
    stdio: process.env.VERBOSE ? "inherit" : "pipe",
    env: process.env,
  });

/** `yyyy-MM-dd` for an offset in whole days from now, in the venue's zone. */
const dayAt = (offset) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const failures = [];
const lines = [];
/** Records one assertion, and keeps the first failure's own words. */
const expect = (label, got, ok, want) => {
  const passed = ok(got);
  lines.push(`  ${passed ? "ok  " : "✗   "} ${label.padEnd(44)} ${got}${passed ? "" : `   attendu ${want}`}`);
  if (!passed) failures.push(`${label} : ${got}, attendu ${want}`);
};

console.log(`db:bootstrap sur une base périmée · lot ${LOT}`);

// ── 1 · a database as a deployment's is: filled, then left behind ────
//
// Seeded by the current tree, then stripped of the rows that entered
// the seed after a long-lived database was filled, and rolled back in
// time. Deleting them is not a hypothetical: it is the state a database
// filled on 25 September is in today, reached by the only means a tool
// has of reaching it.
console.log("  · semence complète, puis mise au rebut");
run("db/seed.mjs", "--reset");

const client = await connect();
try {
  // The rows a first deploy wrote and no deploy since has: photos, the
  // vignette, the carte, the service definitions, the chips, the
  // no-show history.
  for (const table of [
    "venue_assets",
    "venue_tags",
    "service_definitions",
    "no_show_records",
  ]) {
    await client.query(`DELETE FROM ${table} WHERE venue_id = ANY($1)`, [DEMO_VENUES]);
  }

  // And the book, aged. `at` is a text column, so the shift is done in
  // SQL on the date part the screens read.
  const shift = `(CAST(substr(at, 1, 10) AS date) - ${STALE_DAYS})`;
  await client.query(
    `UPDATE reservations
        SET at = to_char(${shift}, 'YYYY-MM-DD') || substr(at, 11)
      WHERE venue_id = ANY($1)`,
    [DEMO_VENUES],
  );
  await client.query(
    `UPDATE services
        SET date = to_char(CAST(date AS date) - ${STALE_DAYS}, 'YYYY-MM-DD')
      WHERE venue_id = ANY($1)`,
    [DEMO_VENUES],
  );

  // A booking taken through the portal, the day before the build. Its
  // id is what `newId` in `operations-write-store.ts` writes: `res_`
  // and one run of base-36, no second underscore — the shape the book
  // refresh is written never to delete.
  const RUNTIME_ID = "res_zz9boot1";
  await client.query("DELETE FROM reservations WHERE id = $1", [RUNTIME_ID]);
  await client.query(
    `INSERT INTO reservations
       (id, venue_id, at, party_size, state, channel, guest_name, guest_phone, created_at, updated_at)
     VALUES ($1, $2, $3, 2, 'confirmed', 'telephone', 'Client du portail', '+212600000000', $4, $4)`,
    [RUNTIME_ID, DEMO_VENUES[0], `${dayAt(1)}T20:00:00.000Z`, new Date().toISOString()],
  );

  // ── 2 · the build step, exactly as Vercel runs it ──────────────────
  console.log("  · node db/bootstrap.mjs");
  run("db/bootstrap.mjs");

  // ── 3 · what came out ─────────────────────────────────────────────
  const scalar = async (sql, params = []) =>
    Number((await client.query(sql, params)).rows[0]?.n ?? 0);

  for (const venue of DEMO_VENUES) {
    const photos = await scalar(
      "SELECT COUNT(*)::int AS n FROM venue_assets WHERE venue_id = $1 AND kind = 'photo'",
      [venue],
    );
    // Three, not four: how many photos a venue carries is its palette's
    // business — the restaurant has four and the rooftop three — and a
    // check that hard-codes the larger one fails on the dataset rather
    // than on the bootstrap. What it is here to catch is zero.
    expect(`${venue} · photos`, photos, (n) => n >= 3, "3 ou plus");
    const logo = await scalar(
      "SELECT COUNT(*)::int AS n FROM venue_assets WHERE venue_id = $1 AND kind = 'logo'",
      [venue],
    );
    expect(`${venue} · vignette`, logo, (n) => n >= 1, "1 ou plus");
    const carte = await scalar(
      "SELECT COUNT(*)::int AS n FROM venue_assets WHERE venue_id = $1 AND kind = 'menu_file'",
      [venue],
    );
    expect(`${venue} · carte`, carte, (n) => n >= 1, "1 ou plus");
    const definitions = await scalar(
      "SELECT COUNT(*)::int AS n FROM service_definitions WHERE venue_id = $1",
      [venue],
    );
    expect(`${venue} · services définis`, definitions, (n) => n >= 2, "2 ou plus");
    const tags = await scalar(
      "SELECT COUNT(*)::int AS n FROM venue_tags WHERE venue_id = $1",
      [venue],
    );
    expect(`${venue} · chips de la fiche`, tags, (n) => n >= 1, "1 ou plus");

    // The day the portal will ask for, which is the day the data has to
    // hold: `overview-store` reads the book for `day(new Date())`, and
    // the day bar above it names the live `services` row. A deployment
    // where those two are different days shows an empty book under a
    // service that is open.
    const today = dayAt(0);
    const live = (
      await client.query(
        "SELECT date FROM services WHERE venue_id = $1 ORDER BY date DESC LIMIT 1",
        [venue],
      )
    ).rows[0]?.date;
    expect(`${venue} · service du jour daté`, String(live ?? "—"), (d) => d === today, today);

    const booked = await scalar(
      "SELECT COUNT(*)::int AS n FROM reservations WHERE venue_id = $1 AND substr(at, 1, 10) = $2",
      [venue, today],
    );
    expect(`${venue} · réservations aujourd'hui`, booked, (n) => n > 0, "1 ou plus");

    const inService = await scalar(
      `SELECT COUNT(*)::int AS n
         FROM reservations r
         JOIN services s ON s.id = r.service_id
        WHERE r.venue_id = $1 AND s.date = $2`,
      [venue, today],
    );
    expect(`${venue} · carnet du service`, inService, (n) => n > 0, "1 ou plus");

    const noShows = await scalar(
      "SELECT COUNT(*)::int AS n FROM no_show_records WHERE venue_id = $1",
      [venue],
    );
    expect(`${venue} · absences`, noShows, (n) => n > 0, "1 ou plus");
  }

  // The portal's own booking, which no refresh may touch.
  const survived = await scalar(
    "SELECT COUNT(*)::int AS n FROM reservations WHERE id = 'res_zz9boot1'",
  );
  expect("réservation prise au portail", survived, (n) => n === 1, "1");
} finally {
  await client.end();
  try {
    rmSync(SEED_FILE, { force: true });
  } catch {
    // A leftover scratch file is untidy, not fatal.
  }
}

console.log(lines.join("\n"));
if (failures.length === 0) {
  console.log(
    `\n${lines.length} contrôle(s) · le jeu de démonstration est entier après ` +
      "un bootstrap sur une base périmée",
  );
  process.exit(0);
}
console.log(`\n${failures.length} manque(s) après le bootstrap :`);
for (const f of failures) console.log(`  · ${f}`);
process.exit(1);
