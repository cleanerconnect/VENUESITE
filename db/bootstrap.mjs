// The build step: make the database the deployment is about to read
// ready, without ever destroying what is in it.
//
//   node db/bootstrap.mjs          # what Vercel runs before `next build`
//   npm run db:bootstrap           # the same thing, by hand
//
// Three outcomes, and it says which one happened:
//
//   · no `DATABASE_URL`  — nothing to do. The portal falls back to
//     SQLite or to the frozen snapshot, which is the documented
//     behaviour of a deployment with no database attached.
//   · an empty database — the schema is applied and the demo dataset is
//     copied in, so the first deploy on a fresh Neon project lands on
//     Dar Zellij rather than on an empty portal.
//   · a database with a venue in it — the schema is applied (it is
//     idempotent, and this is how a schema change reaches production)
//     and **nothing else is written**, with one exception below. No
//     truncate, ever.
//
// The exception: a database with venues and an **empty**
// `partner_accounts` gets the fixture accounts written into it. That
// state is not hypothetical and it is not recoverable from the outside:
// a deployment first seeded before audit item E-01 was fixed has venues,
// so this script has always said « rien à semer » — and E-01 took the
// literals in `src/lib/auth/accounts.ts` out of the `db` path at the
// same time, so the credential table stayed empty and *nobody could
// sign in*, which is what happened to the demo. A credential table with
// no rows means no door, which is never a state anybody chose.
//
// It cannot lock anyone out or overwrite anything: one account in the
// table is enough for the step to do nothing at all, so a database with
// a real partner in it is never touched. `LYFE_SKIP_DEMO_ACCOUNTS=1`
// turns it off for a deployment that genuinely wants venues and no way
// in.
//
// The destructive command stays where a person has to type it:
// `npm run db:reset` empties every table and re-copies the demo data,
// and it is for a local database.
//
// `LYFE_SKIP_DB_BOOTSTRAP=1` skips the whole step. It exists for the one
// bad afternoon where the database is unreachable and you need to ship a
// front-end fix anyway: the build succeeds, and the schema is applied by
// the next deploy.

import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { connect } from "./pg.mjs";
import {
  DEMO_ACCOUNTS,
  PLATFORM_ADMIN,
  hashPassword,
  seedPassword,
} from "./demo-accounts.mjs";

// Per process, not a fixed name.
//
// It was `.data/bootstrap.db`, and the generator writes a SQLite file
// before copying it into Postgres — so two bootstraps running at once in
// one working directory opened the same file and both died on « attempt
// to write a readonly database » / « disk I/O error », leaving the
// database empty. The Postgres side was already safe (`push.mjs
// --if-empty` holds `LOCK TABLE venues IN ACCESS EXCLUSIVE MODE`, so
// only one of them can insert); the shared scratch file was what
// defeated it.
const SEED_FILE = resolve(`.data/bootstrap-${process.pid}.db`);

/**
 * Runs one of the sibling scripts, and stops the build with *its* exit
 * code if it fails.
 *
 * `execFileSync` throws, and an uncaught throw here buries the child's
 * message — which is in French and says exactly what to do — under a
 * Node stack trace. In a build log the last line is the one that gets
 * read, so the child's message has to be it.
 */
const run = (script, ...args) => {
  try {
    execFileSync(process.execPath, [script, ...args], { stdio: "inherit" });
  } catch (error) {
    // The child's own message is above this line; this one says which
    // step failed, because a build log read from the bottom otherwise
    // ends on a Node stack trace with no context.
    console.error(
      `db:bootstrap — ${script} a échoué. Le schéma n'a pas été modifié ` +
        "par cette étape ; relancez le déploiement, ou posez " +
        "LYFE_SKIP_DB_BOOTSTRAP=1 pour livrer le front-end sans toucher " +
        "à la base.",
    );
    process.exit(typeof error.status === "number" ? error.status : 1);
  }
};

if (process.env.LYFE_SKIP_DB_BOOTSTRAP) {
  console.log("db:bootstrap — ignoré (LYFE_SKIP_DB_BOOTSTRAP)");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log(
    "db:bootstrap — pas de DATABASE_URL, aucune base à préparer.\n" +
      "  Sur Vercel : Storage → Create Database → Neon Postgres la définit.",
  );
  process.exit(0);
}

console.log("db:bootstrap — DATABASE_URL présent, application du schéma");
run("db/migrate.mjs");

// A cheap look before the expensive part. The authoritative check is the
// one `push.mjs --if-empty` makes inside its transaction, holding a lock;
// this one only decides whether generating two thousand lines of seed
// data is worth the seconds it costs, which on every deploy after the
// first it is not.
/**
 * Writes the fixture accounts, and only into a table that has none.
 *
 * `ON CONFLICT DO NOTHING` on both keys rather than a count alone: the
 * count is read outside this statement, and two builds of the same
 * commit can run at once. A row that is already there keeps its
 * password — this never resets a credential.
 */
async function writeDemoAccounts(client) {
  const password = seedPassword();
  const at = new Date().toISOString();
  let written = 0;
  for (const { userId, fullName, email, phone } of DEMO_ACCOUNTS) {
    const { rowCount } = await client.query(
      `INSERT INTO partner_accounts
         (user_id, full_name, email, phone, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [userId, fullName, email, phone, hashPassword(password), at],
    );
    written += rowCount ?? 0;
  }
  // The reviewer's own row, which is what opens /admin/validations —
  // the `partner_accounts` row above only gets them through the door.
  await client.query(
    `INSERT INTO platform_admins (user_id, full_name, email, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [PLATFORM_ADMIN.userId, PLATFORM_ADMIN.fullName, PLATFORM_ADMIN.email, at],
  );
  return written;
}

const client = await connect();
let venues = 0;
let accounts = 0;
try {
  ({
    rows: [{ n: venues }],
  } = await client.query("SELECT COUNT(*)::int AS n FROM venues"));
  ({
    rows: [{ n: accounts }],
  } = await client.query("SELECT COUNT(*)::int AS n FROM partner_accounts"));

  if (venues === 0) {
    console.log("db:bootstrap — base vide, génération du jeu de démonstration");
    run("db/seed.mjs", "--reset", "--sqlite-only", SEED_FILE);
    run("db/push.mjs", "--if-empty", SEED_FILE);
    // The scratch file has done its job. Leaving it behind would make
    // the next `next build` in the same container see a SQLite database
    // and resolve `dataMode()` to `db` on it.
    try {
      rmSync(SEED_FILE, { force: true });
    } catch {
      // A leftover scratch file is untidy, not fatal.
    }
    console.log("db:bootstrap — base prête");
  } else if (accounts > 0) {
    console.log(
      `db:bootstrap — ${venues} établissement(s) et ${accounts} compte(s) en base, rien à semer`,
    );
  } else if (process.env.LYFE_SKIP_DEMO_ACCOUNTS) {
    console.log(
      `db:bootstrap — ${venues} établissement(s) en base, aucun compte, ` +
        "et LYFE_SKIP_DEMO_ACCOUNTS est posé : personne ne pourra se connecter",
    );
  } else {
    console.log(
      `db:bootstrap — ${venues} établissement(s) en base et aucun compte : ` +
        "écriture des comptes de démonstration",
    );
    const written = await writeDemoAccounts(client);
    console.log(
      `db:bootstrap — ${written} compte(s) écrit(s), mot de passe ` +
        (process.env.LYFE_SEED_PASSWORD
          ? "LYFE_SEED_PASSWORD"
          : "« demo » (posez LYFE_SEED_PASSWORD pour en changer)"),
    );
  }
} finally {
  await client.end();
}
