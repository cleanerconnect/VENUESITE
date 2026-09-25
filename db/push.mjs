// Copies a seeded SQLite file into Postgres.
//
//   DATABASE_URL=postgres://… node db/push.mjs [path]
//   DATABASE_URL=postgres://… node db/push.mjs --if-empty [path]
//
// Two modes, and the difference matters because one of them destroys
// data. The default **empties every table first** — it is the local
// « give me the demo dataset back » command, reached through
// `npm run db:reset`. With `--if-empty` it truncates nothing: it copies
// only into a database that has no venue yet, and on a database that
// already has one it writes nothing and exits clean. That is the mode
// the Vercel build step uses, so a fresh Neon database is furnished on
// the first deploy and every later deploy leaves the partners' rows
// alone.
//
// One seed generator, two destinations. `db/seed.mjs` is two thousand
// lines of deterministic dataset and it writes SQLite; rather than keep
// a second copy of it that writes Postgres — two generators to drift
// apart — the rows are generated once and streamed across. The two
// databases then hold *identical* data, which is what makes running the
// verify tools against both a real comparison.
//
// Table order is the order `db/schema.sql` declares them, which is a
// dependency order: every foreign key points at a table already filled.

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { connect, schemaTables, jsonColumns } from "./pg.mjs";

const args = process.argv.slice(2);
const ifEmpty = args.includes("--if-empty");
const path = resolve(args.find((a) => !a.startsWith("--")) ?? ".data/lyfe.db");
if (!existsSync(path)) {
  console.error(`Aucune base SQLite à ${path}. Lancez d'abord \`npm run db:seed\`.`);
  process.exit(1);
}

const schema = readFileSync(resolve("db/schema.sql"), "utf8");
const tables = schemaTables(schema);
const jsonCols = jsonColumns(schema);

const sqlite = new DatabaseSync(path);
const client = await connect();

const BATCH = 200;
let copied = 0;
let skipped = 0;

try {
  await client.query("BEGIN");

  if (ifEmpty) {
    // The decision and the copy have to be one transaction, or two
    // builds starting together both read an empty database and both
    // insert. `venues` is locked rather than an advisory lock because
    // Neon's pooled endpoint pools by transaction: a table lock is
    // transaction-scoped and therefore actually held, and the second
    // build waits here, then finds the venue the first one wrote.
    await client.query("LOCK TABLE venues IN ACCESS EXCLUSIVE MODE");
    const { rows: venueRows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM venues",
    );
    if (venueRows[0].n > 0) {
      await client.query("ROLLBACK");
      console.log(
        `la base porte déjà ${venueRows[0].n} établissement(s) — rien copié, rien effacé`,
      );
      await client.end();
      sqlite.close();
      process.exit(0);
    }

    // No venue, but rows elsewhere: something half-seeded or hand-made
    // is in there, and inserting on top of it would either collide on a
    // primary key or leave two datasets interleaved. Say so and stop
    // rather than guess which one was wanted.
    const { rows: filled } = await client.query(
      `SELECT t FROM (${tables
        .map((t) => `SELECT '${t}' AS t, EXISTS (SELECT 1 FROM "${t}") AS filled`)
        .join(" UNION ALL ")}) s WHERE filled`,
    );
    if (filled.length > 0) {
      await client.query("ROLLBACK");
      console.error(
        "La base n'a aucun établissement mais n'est pas vide : " +
          `${filled.map((r) => r.t).join(", ")}.\n` +
          "Rien n'a été écrit. Videz-la, ou utilisez `npm run db:reset` " +
          "qui la remet à zéro explicitement.",
      );
      await client.end();
      sqlite.close();
      process.exit(1);
    }
  } else {
    // Emptied in one statement so the foreign keys never see a half-copied
    // database, and in the same transaction as the insert.
    await client.query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);
  }

  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      skipped += 1;
      continue;
    }
    const columns = Object.keys(rows[0]);
    const json = new Set(jsonCols[table] ?? []);

    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const params = [];
      const tuples = slice.map((row) => {
        const holes = columns.map((c) => {
          const value = row[c];
          // A JSON column takes the text SQLite stored, cast on the way
          // in; everything else is TEXT, INTEGER or REAL on both sides.
          params.push(typeof value === "bigint" ? Number(value) : value);
          return json.has(c) ? `$${params.length}::json` : `$${params.length}`;
        });
        return `(${holes.join(", ")})`;
      });
      await client.query(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${tuples.join(", ")}`,
        params,
      );
    }
    copied += rows.length;
    console.log(`  ${table.padEnd(28)} ${rows.length}`);
  }

  await client.query("COMMIT");
  console.log(
    `copié ${copied} lignes dans Postgres · ${tables.length - skipped} tables remplies, ${skipped} vides`,
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
  sqlite.close();
}
