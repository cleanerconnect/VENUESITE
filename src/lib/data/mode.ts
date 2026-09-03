import "server-only";

// Which data source the portal is talking to.
//
// One rule, resolved once, so nothing downstream has to guess:
//
//   http    a real backend is configured (LYFE_API_BASE_URL + TOKEN)
//   db      a seeded SQLite file exists at LYFE_DB_PATH (or .data/lyfe.db)
//   static  neither — serve the committed snapshot
//
// `LYFE_DATA` overrides the rule for all three, which is how the
// styleguide and a cold clone force the static path even on a machine
// that happens to have a database lying around.
//
// The fallback order matters for the handover: a developer who clones
// this repo and runs `npm run dev` has no database, so they land on
// `static` and every route renders. Running `npm run db:reset` promotes
// them to `db` and the same screens become editable and persistent.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type DataMode = "http" | "db" | "static";

export function dbPath(): string {
  return process.env.LYFE_DB_PATH ?? resolve(".data/lyfe.db");
}

export function dataMode(): DataMode {
  const forced = process.env.LYFE_DATA;
  if (forced === "static" || forced === "db" || forced === "http") return forced;

  if (process.env.LYFE_API_BASE_URL && process.env.LYFE_API_TOKEN) return "http";
  if (existsSync(dbPath())) return "db";
  return "static";
}

/** Human-readable reason, for /api/health and the dev banner. */
export function dataModeReason(): string {
  if (process.env.LYFE_DATA) return `forcé par LYFE_DATA=${process.env.LYFE_DATA}`;
  switch (dataMode()) {
    case "http":
      return "backend configuré (LYFE_API_BASE_URL)";
    case "db":
      return `base SQLite présente (${dbPath()})`;
    default:
      return "aucune base — jeu de données statique";
  }
}
