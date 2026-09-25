import "server-only";

// Persistent store, on either engine.
//
// The brief requires the mock adapter to be backed by a persistent store
// rather than in-memory fixtures, so that its behaviour matches
// production and switching adapters is one environment variable. This is
// that store, and it now speaks to two engines through one seam:
//
//   sqlite     `node:sqlite`, a file at LYFE_DB_PATH — the local default,
//              no service to run, no native dependency
//   postgres   `pg` against DATABASE_URL — what a deployment gets when a
//              Neon database is attached, with no code change
//
// Both run **the same `db/schema.sql`**. That file was written in the
// intersection of the two dialects on purpose — TEXT, INTEGER, REAL,
// JSON, no AUTOINCREMENT, no engine-specific defaults — and it applies
// to Postgres with no translation. Verified rather than assumed:
// `db:migrate` runs it, and the verify tools then walk every screen on
// both engines.
//
// Three rules this file keeps:
//   · Money is stored in centimes and converted at the boundary. A float
//     column would eventually round a settlement wrong.
//   · Every query takes a venue_id. Scoping is a WHERE clause here, not a
//     filter in the caller — a caller that forgets is a data leak.
//   · A row looks the same whichever engine produced it. SQLite hands
//     back TEXT/INTEGER/REAL; the Postgres engine is configured to do
//     the same, so no caller has to know which one answered.

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool, PoolClient } from "pg";

export type Row = Record<string, string | number | null>;
type Param = string | number | null;

export type EngineKind = "sqlite" | "postgres";

interface Engine {
  readonly kind: EngineKind;
  all(sql: string, params: Param[]): Promise<Row[]>;
  one(sql: string, params: Param[]): Promise<Row | null>;
  run(sql: string, params: Param[]): Promise<{ changes: number }>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

/** Which engine a running instance is on. `DATABASE_URL` decides. */
export function engineKind(): EngineKind {
  return process.env.DATABASE_URL ? "postgres" : "sqlite";
}

export function sqlitePath(): string {
  return process.env.LYFE_DB_PATH ?? resolve(".data/lyfe.db");
}

// ── SQLite ───────────────────────────────────────────────────

let sqliteHandle: DatabaseSync | null = null;

function sqlite(): DatabaseSync {
  if (sqliteHandle) return sqliteHandle;
  const next = new DatabaseSync(sqlitePath());
  next.exec("PRAGMA foreign_keys = ON");
  // Idempotent: every statement is CREATE ... IF NOT EXISTS, so an
  // un-seeded checkout gets an empty but valid database rather than a
  // crash on first query.
  next.exec(readFileSync(resolve("db/schema.sql"), "utf8"));
  sqliteHandle = next;
  return sqliteHandle;
}

const sqliteEngine: Engine = {
  kind: "sqlite",
  async all(sql, params) {
    return sqlite().prepare(sql).all(...params) as Row[];
  },
  async one(sql, params) {
    return (sqlite().prepare(sql).get(...params) as Row | undefined) ?? null;
  },
  async run(sql, params) {
    const result = sqlite().prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  },
  async transaction(fn) {
    const conn = sqlite();
    conn.exec("BEGIN");
    try {
      const result = await fn();
      conn.exec("COMMIT");
      return result;
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  },
};

// ── Postgres ─────────────────────────────────────────────────

/**
 * `?` → `$1, $2, …`, skipping anything inside a string literal.
 *
 * The stores are written in SQLite's placeholder style because that is
 * the engine a contributor runs locally. Carrying both styles in 290
 * queries would be 290 chances to get one wrong; translating them in one
 * function is one chance, and every tool run covers it.
 */
export function toDollarPlaceholders(sql: string): string {
  let out = "";
  let n = 0;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      // A line comment: copied out whole, any `?` inside it included.
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop - 1;
      continue;
    }
    if (ch === "?") {
      n += 1;
      out += "$" + n;
      continue;
    }
    out += ch;
  }
  return out;
}

let pool: Pool | null = null;
const inTransaction = new AsyncLocalStorage<PoolClient>();

async function postgresPool(): Promise<Pool> {
  if (pool) return pool;
  const pg = await import("pg");
  const lib = (pg as unknown as { default?: typeof pg }).default ?? pg;

  // A row has to look the same on both engines, so the types that would
  // otherwise arrive as something else are pinned here rather than
  // unpicked in eighty callers.
  lib.types.setTypeParser(20, (v: string) => Number(v)); // int8 — COUNT(*)
  lib.types.setTypeParser(1700, (v: string) => Number(v)); // numeric — SUM/AVG
  lib.types.setTypeParser(1082, (v: string) => v); // date → the string, not a Date
  lib.types.setTypeParser(1114, (v: string) => v); // timestamp → idem
  lib.types.setTypeParser(1184, (v: string) => v); // timestamptz → idem
  lib.types.setTypeParser(114, (v: string) => v); // json → raw text, as SQLite
  lib.types.setTypeParser(3802, (v: string) => v); // jsonb → idem

  const url = process.env.DATABASE_URL ?? "";
  pool = new lib.Pool({
    connectionString: url,
    // Neon, like every hosted Postgres, terminates TLS; `pg` needs
    // telling, and the certificate is verified rather than waved
    // through. A local cluster has none, so it is left alone.
    ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(url) ? undefined : { rejectUnauthorized: true },
    // A serverless instance serves a handful of requests and dies. A
    // wide pool per instance is how a Neon project runs out of
    // connections; the pooled URL plus a small ceiling is the pair that
    // behaves.
    max: Number(process.env.DATABASE_POOL_MAX ?? 4),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

async function pgQuery(sql: string, params: Param[]): Promise<Row[]> {
  const text = toDollarPlaceholders(sql);
  const client = inTransaction.getStore();
  const result = client
    ? await client.query(text, params)
    : await (await postgresPool()).query(text, params);
  return result.rows as Row[];
}

const postgresEngine: Engine = {
  kind: "postgres",
  all: (sql, params) => pgQuery(sql, params),
  async one(sql, params) {
    const rows = await pgQuery(sql, params);
    return rows[0] ?? null;
  },
  async run(sql, params) {
    // `rowCount` is what a caller checking "did this hit a row?" means
    // by SQLite's `changes`.
    const text = toDollarPlaceholders(sql);
    const client = inTransaction.getStore();
    const result = client
      ? await client.query(text, params)
      : await (await postgresPool()).query(text, params);
    return { changes: result.rowCount ?? 0 };
  },
  async transaction(fn) {
    // One client for the whole transaction, carried in async context so
    // the store functions inside it need no argument threading.
    const client = await (await postgresPool()).connect();
    try {
      await client.query("BEGIN");
      const result = await inTransaction.run(client, fn);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  },
};

function engine(): Engine {
  return engineKind() === "postgres" ? postgresEngine : sqliteEngine;
}

// ── The four calls every store makes ─────────────────────────

export function all(sql: string, ...params: Param[]): Promise<Row[]> {
  return engine().all(sql, params);
}

export function one(sql: string, ...params: Param[]): Promise<Row | null> {
  return engine().one(sql, params);
}

export function run(sql: string, ...params: Param[]): Promise<{ changes: number }> {
  return engine().run(sql, params);
}

/** Wraps a multi-statement write so a partial failure leaves nothing behind. */
export function transaction<T>(fn: () => Promise<T> | T): Promise<T> {
  return engine().transaction(async () => fn());
}

/** Centimes → MAD, at the boundary and nowhere else. */
export const toMad = (cents: number | null | undefined): number =>
  cents == null ? 0 : Math.round(cents) / 100;

/** MAD → centimes. */
export const toCents = (mad: number): number => Math.round(mad * 100);

export const bool = (n: number | null | undefined): boolean => n === 1;

export function jsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
