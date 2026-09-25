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
const migrations = readdirSync(resolve("db/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

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
      `base neuve — ${migrations.length} migration(s) déjà décrite(s) par le schéma, marquée(s) comme appliquée(s)`,
    );
  } else {
    const pending = migrations.filter((id) => !applied.has(id));
    for (const id of pending) {
      await client.query(readFileSync(resolve("db/migrations", id), "utf8"));
      await stamp(id);
      console.log(`migration appliquée · ${id}`);
    }
    if (pending.length === 0) console.log("aucune migration en attente");
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
