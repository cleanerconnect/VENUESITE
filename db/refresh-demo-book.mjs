// Puts a fresh demo book into a database that already has one.
//
//   DATABASE_URL=postgres://… node db/refresh-demo-book.mjs [path]
//
// `db/seed.mjs` writes a book anchored to the demo clock — the Thursday
// of the week at 20h30 — and `db/push.mjs --if-empty` copies it only
// into an empty database. Both are right, and between them they leave
// one gap: the deployment that has been up for three weeks. Its venues,
// its accounts and the partners who signed up are all exactly as they
// should be, and its book is three weeks stale. Réservations opens on a
// Thursday evening that has already happened.
//
// This script is that gap and nothing else. It replaces the demo
// reservations of the two demo establishments, and it is written to be
// unable to do anything more:
//
//   · `venues`, `partner_accounts`, `staff`, `customers`, `zones`,
//     `venue_settings`, `service_definitions` — never read, never
//     written. A partner's establishment and their password are not
//     this script's business.
//   · a booking made through the portal or the app is never deleted.
//     Those ids are `res_` plus one run of base-36 (`newId` in
//     `operations-write-store.ts`); every seeded id either appears in
//     the freshly generated file or carries a second underscore
//     (`res_dz_c3_din_5`, `res_aud_cus_7_1`). The delete is the union of
//     those two sets, scoped to the two demo venues, and a runtime id
//     is in neither.
//   · it runs in one transaction, so a refusal leaves the old book in
//     place rather than half of each.
//
// The two live `services` rows go with it: their counters are summed
// from the book at the foot of `db/seed.mjs`, so a new book under the
// old counters is the contradiction that file spends four paragraphs
// avoiding.
//
// `LYFE_SKIP_DEMO_BOOK=1` turns it off for a deployment that wants its
// book left exactly where it is.

import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { connect } from "./pg.mjs";

/** The two establishments `db/seed.mjs` creates. Nothing else is touched. */
const DEMO_VENUES = ["rst_dar_zellij", "bar_nomad_casa"];
/** The live service rows the seed writes, whose counters follow the book. */
const DEMO_SERVICES = ["svc_current", "svc_nomad_current"];

const path = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? ".data/lyfe.db");
if (!existsSync(path)) {
  console.error(`Aucune base SQLite à ${path}. Lancez d'abord \`npm run db:seed\`.`);
  process.exit(1);
}

const sqlite = new DatabaseSync(path);
const client = await connect();

/** Reads one table out of the freshly seeded file, for the demo venues. */
const fresh = (table, column = "venue_id") =>
  sqlite
    .prepare(
      `SELECT * FROM ${table} WHERE ${column} IN (${DEMO_VENUES.map(() => "?").join(",")})`,
    )
    .all(...DEMO_VENUES);

/** Inserts rows into Postgres in batches, columns taken from the first. */
async function copy(table, rows) {
  if (rows.length === 0) return 0;
  const columns = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += 200) {
    const slice = rows.slice(i, i + 200);
    const params = [];
    const tuples = slice.map((row) => {
      const holes = columns.map((c) => {
        const value = row[c];
        params.push(typeof value === "bigint" ? Number(value) : value);
        return `$${params.length}`;
      });
      return `(${holes.join(", ")})`;
    });
    await client.query(
      `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${tuples.join(", ")}`,
      params,
    );
  }
  return rows.length;
}

try {
  await client.query("BEGIN");

  // Serialised against a second build of the same commit, the same way
  // `push.mjs --if-empty` is: two refreshes running at once would each
  // delete the other's inserts.
  await client.query("LOCK TABLE reservations IN ACCESS EXCLUSIVE MODE");

  const { rows: present } = await client.query(
    "SELECT id FROM venues WHERE id = ANY($1)",
    [DEMO_VENUES],
  );
  if (present.length === 0) {
    await client.query("ROLLBACK");
    console.log(
      "db:refresh-demo-book — aucun des deux établissements de démonstration " +
        "n'est en base : rien à rafraîchir.",
    );
    await client.end();
    sqlite.close();
    process.exit(0);
  }

  const bookings = fresh("reservations");
  const seededIds = bookings.map((r) => String(r.id));

  // Out with the old demo book. Two sets, and a runtime booking is in
  // neither: the ids this seed writes, and the ids an older seed wrote
  // — every one of which carries a second underscore.
  const { rowCount: removed } = await client.query(
    `DELETE FROM reservations
      WHERE venue_id = ANY($1)
        AND (id = ANY($2) OR id LIKE 'res\\_%\\_%')`,
    [DEMO_VENUES, seededIds],
  );

  // The live service rows, replaced with the book they describe. Their
  // slot load cascades with them; a reservation still pointing at one is
  // nulled by the foreign key, which is what a runtime booking left over
  // from last week's service should be.
  await client.query("DELETE FROM services WHERE id = ANY($1)", [DEMO_SERVICES]);
  const services = sqlite
    .prepare(
      `SELECT * FROM services WHERE id IN (${DEMO_SERVICES.map(() => "?").join(",")})`,
    )
    .all(...DEMO_SERVICES);
  await copy("services", services);
  const load = sqlite
    .prepare(
      `SELECT * FROM service_slot_load WHERE service_id IN (${DEMO_SERVICES.map(() => "?").join(",")})`,
    )
    .all(...DEMO_SERVICES);
  await copy("service_slot_load", load);

  // In with the new. `customer_id` and `zone_id` are nulled where the
  // target does not carry the row: a database seeded by an older
  // version of this file has the same guests and zones, but a
  // hand-pruned one need not, and a foreign key is not the place to
  // find that out.
  const { rows: customers } = await client.query(
    "SELECT id FROM customers WHERE venue_id = ANY($1)",
    [DEMO_VENUES],
  );
  const { rows: zones } = await client.query(
    "SELECT id FROM zones WHERE venue_id = ANY($1)",
    [DEMO_VENUES],
  );
  const knownCustomers = new Set(customers.map((r) => String(r.id)));
  const knownZones = new Set(zones.map((r) => String(r.id)));
  let orphaned = 0;
  for (const row of bookings) {
    if (row.customer_id && !knownCustomers.has(String(row.customer_id))) {
      row.customer_id = null;
      orphaned += 1;
    }
    if (row.zone_id && !knownZones.has(String(row.zone_id))) row.zone_id = null;
  }
  const written = await copy("reservations", bookings);

  // The status history of the new book. The old one went with its
  // bookings — the foreign key cascades — so this is an insert and not
  // a merge.
  const historyIds = new Set(seededIds);
  const history = sqlite
    .prepare("SELECT * FROM reservation_status_history")
    .all()
    .filter((r) => historyIds.has(String(r.reservation_id)));
  await copy("reservation_status_history", history);

  await client.query("COMMIT");

  const span = bookings.reduce(
    (acc, r) => {
      const d = String(r.at).slice(0, 10);
      return { from: acc.from && acc.from < d ? acc.from : d, to: acc.to > d ? acc.to : d };
    },
    { from: "", to: "" },
  );
  console.log(
    `db:refresh-demo-book — ${removed} réservation(s) de démonstration retirée(s), ` +
      `${written} écrite(s) du ${span.from} au ${span.to}` +
      (orphaned > 0 ? ` · ${orphaned} sans client connu, rattachée(s) à personne` : ""),
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(
    "db:refresh-demo-book a échoué ; l'ancien carnet est intact.\n  " +
      String(error?.message ?? error),
  );
  process.exitCode = 1;
} finally {
  await client.end();
  sqlite.close();
}
