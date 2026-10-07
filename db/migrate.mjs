// Applies the schema to Postgres.
//
//   DATABASE_URL=postgres://… npm run db:migrate
//
// Three things, in order.
//
// `db/schema.sql`, which both engines share, then
// `db/postgres-compat.sql`, which teaches Postgres the four SQLite date
// functions a handful of queries use. Both are idempotent — every
// statement is CREATE ... IF NOT EXISTS or CREATE OR REPLACE.
//
// Then `db/migrations/*.sql`, in filename order, which is what actually
// makes this script able to roll out a schema *change*. `CREATE TABLE IF
// NOT EXISTS` describes a table for a database that does not have one
// yet; against a database that does, it is a no-op, so a column added to
// `schema.sql` would never reach production. The migrations carry the
// `ALTER`s, and `schema_migrations` records which ones a database has
// had, so each runs exactly once.
//
// A **fresh** database is *stamped* rather than migrated: `schema.sql`
// already describes the result of every migration, so applying them on
// top would fail on the first duplicate column. The test for fresh is
// whether `venues` existed before this run.
//
// The migrations are Postgres-only, and deliberately: SQLite is always
// recreated from `schema.sql` by `npm run db:reset`, so it has no
// existing database to alter. A contributor with an old `.data/lyfe.db`
// reseeds rather than migrates.
//
// ── Migrations that belong to one lot ────────────────────────────────
//
// A file named `….lot1.sql` applies only where the lot in force is 1,
// and `….lot2.sql` only where it is 2. The lot is read the same way
// everything else reads it — `LYFE_LOT`, anything but `2` meaning 1 —
// so the rule cannot drift from `src/lib/lot`.
//
// A migration the lot does not want is **skipped without being
// stamped**, which is the whole point: a deployment running Lot 2 today
// and flipped to Lot 1 next week gets it on the next build, not never.
// The cost of that choice is its mirror image — a Lot 1 deployment
// flipped to Lot 2 keeps whatever the Lot 1 migration did, because a
// ledger entry is a fact about the database and not about the flag.
// `009` below is the only one of these so far, and reversing it is
// `npm run db:reset` on a local database or a reseed on a remote one.
//
// A data migration is also the one kind `schema.sql` does *not*
// describe, so the fresh-database branch could not simply stamp it —
// except that on a fresh database `db/seed.mjs` has already written the
// result, lot by lot. Stamping stays correct; the applicable ones are
// stamped and the rest are left for the lot that wants them.
//
// It runs as *one transaction holding one advisory lock*, because on
// Vercel this is a build step and two builds can start within the same
// second. `CREATE TABLE IF NOT EXISTS` is idempotent but not
// concurrency-safe: two sessions creating the same table at once race in
// the catalogue and one gets a duplicate-key error. The lock serialises
// them; the second session then finds every table already there and
// applies nothing. It is a *transaction*-scoped lock deliberately —
// Neon's pooled endpoint pools by transaction, so a session-scoped lock
// would not be held where it matters.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { connect, schemaTables, SCHEMA_LOCK } from "./pg.mjs";

const schema = readFileSync(resolve("db/schema.sql"), "utf8");
const compat = readFileSync(resolve("db/postgres-compat.sql"), "utf8");
/**
 * The lot in force, by the same rule as `src/lib/lot`: anything that is
 * not exactly `2` is Lot 1, a misspelt value included.
 */
const LOT = process.env.LYFE_LOT?.trim() === "2" ? 2 : 1;

/** The lot a filename claims, or null for one that belongs to both. */
const lotOf = (id) => {
  const found = /\.lot([12])\.sql$/.exec(id);
  return found ? Number(found[1]) : null;
};

/** Whether this deployment's lot wants this migration at all. */
const applies = (id) => (lotOf(id) ?? LOT) === LOT;

const all = readdirSync(resolve("db/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
const migrations = all.filter(applies);
const held = all.filter((id) => !applies(id));

const client = await connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK]);

  // Asked before the schema is applied, because applying it is what
  // would make the answer yes.
  const {
    rows: [{ existed }],
  } = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'venues'
     ) AS existed`,
  );

  await client.query(schema);
  console.log(`schéma appliqué — ${schemaTables(schema).length} tables`);
  await client.query(compat);
  console.log("fonctions de compatibilité SQLite installées");

  const { rows: seen } = await client.query("SELECT id FROM schema_migrations");
  const applied = new Set(seen.map((r) => r.id));
  const stamp = (id) =>
    client.query(
      "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)",
      [id, new Date().toISOString()],
    );

  if (!existed) {
    for (const id of migrations) if (!applied.has(id)) await stamp(id);
    console.log(
      `base neuve — ${migrations.length} migration(s) déjà décrite(s) par le schéma ou par la semence, marquée(s) comme appliquée(s)`,
    );
  } else {
    const pending = migrations.filter((id) => !applied.has(id));
    for (const id of pending) {
      try {
        await client.query(readFileSync(resolve("db/migrations", id), "utf8"));
      } catch (error) {
        // The whole thing is one transaction, so this rolls everything
        // back — and the operator needs to know *which* file, and the
        // most likely reason. The one that actually happens: somebody
        // ran the `ALTER` by hand and the ledger never learned about it.
        console.error(
          `migration refusée · ${id}\n` +
            `  ${String(error?.message ?? error)}\n` +
            "  Rien n'a été modifié : les migrations tiennent dans une " +
            "seule transaction.\n" +
            "  Si ce changement est déjà en base (appliqué à la main), " +
            "ajoutez sa ligne au registre :\n" +
            `    INSERT INTO schema_migrations (id, applied_at) VALUES ('${id}', now());`,
        );
        throw error;
      }
      await stamp(id);
      console.log(`migration appliquée · ${id}`);
    }
    if (pending.length === 0) console.log("aucune migration en attente");
  }

  // Said out loud rather than passed over in silence: a migration left
  // unstamped is one the next build will reconsider, and an operator
  // reading this log should know the ledger is deliberately incomplete.
  //
  // Only the ones still absent from the ledger. A database that already
  // ran this migration under the other lot has it, and saying it is
  // waiting would be a lie about what is in the base.
  const waiting = held.filter((id) => !applied.has(id));
  if (waiting.length) {
    console.log(
      `lot ${LOT} — ${waiting.length} migration(s) réservée(s) à l'autre ` +
        `lot, ni appliquée(s) ni inscrite(s) au registre : ${waiting.join(", ")}`,
    );
  }

  await client.query("COMMIT");

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  console.log(`la base porte ${rows[0].n} tables`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
