// The Postgres connection the scripts share.
//
// `DATABASE_URL` is the only configuration: it is what Vercel sets when
// a Neon project is attached, and what a contributor exports to point
// the same scripts at their own database.

import pg from "pg";

export function requireUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL n'est pas défini.\n" +
        "  · en local  : export DATABASE_URL=postgres://…\n" +
        "  · sur Vercel : Storage → Create Database → Neon Postgres le définit",
    );
    process.exit(1);
  }
  return url;
}

export async function connect() {
  const url = requireUrl();
  const client = new pg.Client({
    connectionString: url,
    ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(url) ? undefined : { rejectUnauthorized: true },
  });
  await client.connect();
  return client;
}

/** The tables of `db/schema.sql`, in the order it declares them. */
export function schemaTables(sql) {
  return [...sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
}

/** The columns `db/schema.sql` declares as JSON, per table. */
export function jsonColumns(sql) {
  const out = {};
  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const [, table, body] = m;
    const cols = [...body.matchAll(/^\s{2}(\w+)\s+JSON\b/gm)].map((c) => c[1]);
    if (cols.length) out[table] = cols;
  }
  return out;
}
