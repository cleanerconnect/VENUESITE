// Applies the schema to Postgres.
//
//   DATABASE_URL=postgres://… npm run db:migrate
//
// Two files, in order: `db/schema.sql`, which both engines share, and
// `db/postgres-compat.sql`, which teaches Postgres the four SQLite date
// functions a handful of queries use. Both are idempotent — every
// statement is CREATE ... IF NOT EXISTS or CREATE OR REPLACE — so
// running this against an existing database is safe and is how a schema
// change is rolled out.
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, schemaTables, SCHEMA_LOCK } from "./pg.mjs";

const schema = readFileSync(resolve("db/schema.sql"), "utf8");
const compat = readFileSync(resolve("db/postgres-compat.sql"), "utf8");

const client = await connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK]);
  await client.query(schema);
  console.log(`schéma appliqué — ${schemaTables(schema).length} tables`);
  await client.query(compat);
  console.log("fonctions de compatibilité SQLite installées");
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
