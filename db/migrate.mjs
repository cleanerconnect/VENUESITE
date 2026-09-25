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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, schemaTables } from "./pg.mjs";

const schema = readFileSync(resolve("db/schema.sql"), "utf8");
const compat = readFileSync(resolve("db/postgres-compat.sql"), "utf8");

const client = await connect();
try {
  await client.query(schema);
  console.log(`schéma appliqué — ${schemaTables(schema).length} tables`);
  await client.query(compat);
  console.log("fonctions de compatibilité SQLite installées");

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  console.log(`la base porte ${rows[0].n} tables`);
} finally {
  await client.end();
}
