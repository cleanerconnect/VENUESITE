// Copies a seeded SQLite file into Postgres.
//
//   DATABASE_URL=postgres://… node db/push.mjs [path]
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

const path = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? ".data/lyfe.db");
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
  // Emptied in one statement so the foreign keys never see a half-copied
  // database, and in the same transaction as the insert.
  await client.query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);

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
