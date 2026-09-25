import "server-only";

// Persistent local store.
//
// The brief requires the mock adapter to be backed by a persistent store
// rather than in-memory fixtures, so that its behaviour matches
// production and switching adapters is one environment variable. This is
// that store: the same `db/schema.sql` the Business Service owns, run
// against SQLite through Node's built-in driver — no native dependency,
// no extra service to run locally.
//
// Two rules this file keeps:
//   · Money is stored in centimes and converted at the boundary. A float
//     column would eventually round a settlement wrong.
//   · Every query takes a venue_id. Scoping is a WHERE clause here, not a
//     filter in the caller — a caller that forgets is a data leak.

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let handle: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (handle) return handle;

  const path = process.env.LYFE_DB_PATH ?? resolve(".data/lyfe.db");
  const next = new DatabaseSync(path);
  next.exec("PRAGMA foreign_keys = ON");
  // Idempotent: every statement is CREATE ... IF NOT EXISTS, so an
  // un-seeded checkout gets an empty but valid database rather than a
  // crash on first query.
  next.exec(readFileSync(resolve("db/schema.sql"), "utf8"));
  handle = next;
  return handle;
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

type Row = Record<string, string | number | null>;

export function all(sql: string, ...params: (string | number | null)[]): Row[] {
  return db().prepare(sql).all(...params) as Row[];
}

export function one(sql: string, ...params: (string | number | null)[]): Row | null {
  return (db().prepare(sql).get(...params) as Row | undefined) ?? null;
}

export function run(sql: string, ...params: (string | number | null)[]) {
  return db().prepare(sql).run(...params);
}

/** Wraps a multi-statement write so a partial failure leaves nothing behind. */
export function transaction<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const result = fn();
    conn.exec("COMMIT");
    return result;
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
