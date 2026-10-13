// The demo venues' fixture rows that a database is *missing*.
//
//   DATABASE_URL=postgres://… node db/refresh-demo-fixtures.mjs [path]
//
// `db/push.mjs --if-empty` copies the whole dataset into an empty
// database, and `db/refresh-demo-book.mjs` keeps the book of a database
// that already has one. Between them they leave a gap that widens with
// every release, and it is not a small one.
//
// The seed grows. The photos of the two demo establishments landed in it
// on 26 September; the first database was filled from it on the 25th.
// Nothing has written a `venue_assets` row into that database since,
// because the only path that writes one is the path for an empty
// database and that database has not been empty for three weeks. The
// symptom is not an empty table, it is a screen that reads as broken:
// Ma fiche → Photos, on a venue with a carte and a vignette and nine
// photos in the dataset, showing none of them.
//
// This script is that gap. For the two demo establishments it copies
// the rows the fresh seed holds and the database does not, table by
// table, and it is written to be unable to do anything else:
//
//   · **insert, never update.** Every statement is `ON CONFLICT DO
//     NOTHING`. A row already there keeps every value it has, which is
//     what makes this safe to run on a database a reviewer has been
//     editing: a renamed service, a redrawn zone, a description typed
//     into Ma fiche are all rows that exist, so none of them is
//     touched.
//   · **the two demo establishments only.** Every read is scoped to
//     `DEMO_VENUES`, directly or through a parent row that is. A
//     partner who signed up through /inscription has their own venue
//     id: nothing here names it, so nothing here writes to it.
//   · **no deletes.** A photo a reviewer removed comes back on the next
//     deploy, because the dataset is the demo's contract and « the
//     fiche has photos » is part of it. Nothing else returns.
//   · **one transaction**, so a refusal leaves the database exactly as
//     it was rather than half furnished.
//
// It runs **before** the book refresh, and the order is load-bearing:
// `reservations` carries `customer_id` and `zone_id`, and the book
// refresh nulls the ones its target does not hold. Guests and rooms
// first, and the book that arrives next keeps its names.
//
// `LYFE_SKIP_DEMO_FIXTURES=1` turns it off.

import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { connect } from "./pg.mjs";

/** The two establishments `db/seed.mjs` creates. Nothing else is read. */
const DEMO_VENUES = ["rst_dar_zellij", "bar_nomad_casa"];

/**
 * What gets converged, in the order the foreign keys want.
 *
 * `scope` is how a table's rows are found to belong to a demo venue:
 * its own `venue_id`, or the parent row that has one. A table is in
 * this list when it is **fixture data** — written by the seed,
 * describing the establishment rather than its trade — and when its
 * primary key is deterministic, so that inserting it twice is a
 * no-op rather than a duplicate.
 *
 * What is deliberately *not* here: `venues`, `staff`,
 * `partner_accounts`, `business_accounts` (a partner's identity and
 * their password are nobody's fixture), `reservations` and
 * `reservation_status_history` (the book, which `refresh-demo-book.mjs`
 * owns), and every Lot 2 table the seed fills for a screen Lot 1 does
 * not sell.
 */
const FIXTURES = [
  // The rooms, first: zones are named by services and by bookings.
  { table: "zones", scope: { column: "venue_id" } },
  // The guests, before the book that arrives after this script.
  { table: "customers", scope: { column: "venue_id" } },
  {
    table: "customer_preferences",
    scope: { parent: "customers", key: "customer_id" },
  },
  // « Cuisine marocaine contemporaine », « Rooftop » — the words Ma
  // fiche lists and the app filters on.
  { table: "venue_tags", scope: { column: "venue_id" } },
  // The photos, the vignette and the carte. The reason this file
  // exists.
  { table: "venue_assets", scope: { column: "venue_id" } },
  // What Disponibilités edits and Réservations groups the book by. A
  // database without these rows opens Réservations with no service to
  // name and no way to tell a closed house from a missing one.
  { table: "service_definitions", scope: { column: "venue_id" } },
  {
    table: "service_zones",
    scope: { parent: "service_definitions", key: "service_definition_id" },
  },
  { table: "pacing_rules", scope: { column: "venue_id" } },
  { table: "availability_slots", scope: { column: "venue_id" } },
  // The carte, as items rather than as a file.
  { table: "menu_categories", scope: { column: "venue_id" } },
  { table: "menu_items", scope: { column: "venue_id" } },
  { table: "menu_item_dietary", scope: { parent: "menu_items", key: "item_id" } },
  // The venue's own settings and the notification matrix: one row and
  // one row per event, both of which a screen divides by.
  { table: "venue_settings", scope: { column: "venue_id" } },
  { table: "notification_preferences", scope: { column: "venue_id" } },
];

const path = resolve(
  process.argv.slice(2).find((a) => !a.startsWith("--")) ?? ".data/lyfe.db",
);
if (!existsSync(path)) {
  console.error(`Aucune base SQLite à ${path}. Lancez d'abord \`npm run db:seed\`.`);
  process.exit(1);
}

const sqlite = new DatabaseSync(path);
const client = await connect();

const holes = DEMO_VENUES.map(() => "?").join(",");

/** The fresh rows of one table that belong to the demo venues. */
function fresh({ table, scope }) {
  const where = scope.column
    ? `${scope.column} IN (${holes})`
    : `${scope.key} IN (SELECT id FROM ${scope.parent} WHERE venue_id IN (${holes}))`;
  return sqlite.prepare(`SELECT * FROM ${table} WHERE ${where}`).all(...DEMO_VENUES);
}

/**
 * Inserts the rows a table does not already hold, in batches.
 *
 * `ON CONFLICT DO NOTHING` with no target, so it covers whichever key
 * the table declares — `id`, `(venue_id, kind, value)`,
 * `(item_id, tag)` — without this file keeping a second copy of the
 * schema's mind about it.
 */
async function insertMissing(table, rows) {
  if (rows.length === 0) return 0;
  const columns = Object.keys(rows[0]);
  let written = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const slice = rows.slice(i, i + 200);
    const params = [];
    const tuples = slice.map((row) => {
      const cells = columns.map((c) => {
        const value = row[c];
        params.push(typeof value === "bigint" ? Number(value) : value);
        return `$${params.length}`;
      });
      return `(${cells.join(", ")})`;
    });
    const { rowCount } = await client.query(
      `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")})
       VALUES ${tuples.join(", ")}
       ON CONFLICT DO NOTHING`,
      params,
    );
    written += rowCount ?? 0;
  }
  return written;
}

try {
  await client.query("BEGIN");

  const { rows: present } = await client.query(
    "SELECT id FROM venues WHERE id = ANY($1)",
    [DEMO_VENUES],
  );
  if (present.length === 0) {
    await client.query("ROLLBACK");
    console.log(
      "db:refresh-demo-fixtures — aucun des deux établissements de " +
        "démonstration n'est en base : rien à compléter.",
    );
    await client.end();
    sqlite.close();
    process.exit(0);
  }

  const filled = [];
  let total = 0;
  for (const fixture of FIXTURES) {
    const written = await insertMissing(fixture.table, fresh(fixture));
    total += written;
    if (written > 0) filled.push(`${fixture.table} ${written}`);
  }

  await client.query("COMMIT");

  console.log(
    total === 0
      ? "db:refresh-demo-fixtures — rien à compléter, le jeu de démonstration est entier"
      : `db:refresh-demo-fixtures — ${total} ligne(s) de démonstration ajoutée(s) · ${filled.join(" · ")}`,
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(
    "db:refresh-demo-fixtures a échoué ; la base est intacte.\n  " +
      String(error?.message ?? error),
  );
  process.exitCode = 1;
} finally {
  await client.end();
  sqlite.close();
}
