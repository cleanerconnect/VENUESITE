// The Postgres connection the scripts share.
//
// `DATABASE_URL` is the only configuration: it is what Vercel sets when
// a Neon project is attached, and what a contributor exports to point
// the same scripts at their own database.

import pg from "pg";

/**
 * The advisory lock `db/migrate.mjs` holds while it applies the schema.
 *
 * An arbitrary constant; it only has to be the same number in every
 * process that applies the schema, so that two concurrent builds take
 * it in turn instead of racing in the system catalogue.
 */
export const SCHEMA_LOCK = 847_12026;

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

/** One place for the SSL rule, now that two callers need a client. */
function clientFor(url, extra) {
  return new pg.Client({
    connectionString: url,
    ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(url) ? undefined : { rejectUnauthorized: true },
    ...extra,
  });
}

export async function connect() {
  const client = clientFor(requireUrl());
  await client.connect();
  return client;
}

/**
 * Whether this process can reach the database at all, writing nothing.
 *
 * `DATABASE_URL` being set and the database answering are two different
 * facts, and a build has different business with each: a URL nobody can
 * connect to means the schema was **not** touched, while a database that
 * answers and then refuses a statement means it may have been.
 * `db/bootstrap.mjs` asks this before it applies anything, so it can
 * tell those two apart structurally instead of reading them off one exit
 * code.
 *
 * **It retries, and that is the point.** Neon suspends an idle endpoint
 * and wakes it on the first connection, so the first build after a quiet
 * hour is the one that pays — and `pg` has no connect timeout of its
 * own, so a build either hangs on it or dies on whatever the wake
 * returns. Each attempt is bounded and the gaps double, which is what
 * turns a cold start into four seconds of waiting rather than a red
 * deployment.
 *
 * Only connection failures are retried. A database that answers is
 * reachable even when it then says no — that answer belongs to the
 * caller, not to this probe.
 */
export async function reachable({ attempts = 4, timeoutMs = 8_000 } = {}) {
  const url = requireUrl();
  let why = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const client = clientFor(url, { connectionTimeoutMillis: timeoutMs });
    try {
      await client.connect();
      await client.query("SELECT 1");
      return { ok: true, attempts: attempt };
    } catch (error) {
      why = error?.message ?? String(error);
      if (attempt < attempts) {
        const waitMs = 1_000 * 2 ** (attempt - 1);
        console.log(
          `  base injoignable (${why}) — nouvelle tentative dans ${waitMs / 1000} s ` +
            `(${attempt}/${attempts - 1})`,
        );
        await new Promise((done) => setTimeout(done, waitMs));
      }
    } finally {
      // `end()` on a client that never connected rejects; nothing here
      // depends on the close, so it is allowed to fail quietly.
      await client.end().catch(() => {});
    }
  }
  return { ok: false, why, attempts };
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
