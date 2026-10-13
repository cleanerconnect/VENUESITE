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
//
// ── The demo book ────────────────────────────────────────────────────
//
// One more thing happens on a database that already has venues, and it
// is the only write this step makes to one: the **demo book** is
// refreshed. The dataset is anchored to the demo clock — the Thursday
// of the week at 20h30 — so a deployment that went up three weeks ago
// opens Réservations on an evening that has already happened, with
// every day ahead of it empty. Nothing in the first-deploy path can fix
// that, because the first deploy already happened.
//
// `db/refresh-demo-book.mjs` replaces the reservations of the two demo
// establishments and nothing else: not the venues, not the accounts,
// not the guests, and never a booking made through the portal or the
// app. It is a separate script because that boundary is the whole of
// its value, and `LYFE_SKIP_DEMO_BOOK=1` turns it off.
//
// ── The demo fixtures ────────────────────────────────────────────────
//
// And one more: `db/refresh-demo-fixtures.mjs`, which writes the demo
// venues' fixture rows that are **absent**, and only those.
//
// A refresh that rewrites the book and nothing else leaves a gap that
// widens with every release. The seed grows — photos landed in it on
// 26 September, one day after the first database was filled from it —
// and a row added to the seed after a database was first seeded never
// reaches that database, because the first-deploy path is the only one
// that writes it and the first deploy already happened. The symptom is
// a screen that reads as broken rather than empty: Ma fiche Photos with
// no photos, on a production database that has never held a single
// `venue_assets` row.
//
// It inserts and never updates, so a value a reviewer changed on a row
// that exists stays changed, and `LYFE_SKIP_DEMO_FIXTURES=1` turns it
// off.
//
// ── One clock for the build and the portal ───────────────────────────
//
// The seed anchors its dataset to a moment, and the portal renders
// against one. They have to be the *same* moment, and left alone they
// are not: `db/seed.mjs` is a tool, so an unset `LYFE_DEMO_CLOCK` means
// « the Thursday of this week at 20h30 » to it, while the portal takes
// an unset variable to mean the real clock — the documented behaviour of
// a deployment, which should not freeze.
//
// So on a Tuesday the build writes a book whose live service is dated
// Thursday, and the portal opens Réservations on Tuesday and asks for
// Tuesday's rows: the day bar names the service the data has, the book
// under it is queried for the day the clock has, and the screen says
// « Carnet vide » with two thousand bookings in the table.
//
// The seed children below are therefore told what the portal will use:
// the variable when it is set, and `off` — the real clock — when it is
// not. Agreement in both configurations, rather than agreement in one.

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
 * What the seed children are told « now » is: whatever the portal will
 * read.
 *
 * `db/seed.mjs` imports `toolClock`, whose fallback is Thursday 20h30 —
 * right for a capture that has to look the same tomorrow, wrong for the
 * dataset a deployment serves, because the portal's fallback is the real
 * clock. Passing `off` makes the seed take the deployment's own view of
 * the hour; passing the variable on, where it is set, freezes both to
 * one instant. Either way the build and the portal agree, which is the
 * only property that matters here.
 */
const CLOCK = {
  LYFE_DEMO_CLOCK: process.env.LYFE_DEMO_CLOCK?.trim() || "off",
};

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
    execFileSync(process.execPath, [script, ...args], {
      stdio: "inherit",
      env: { ...process.env, ...CLOCK },
    });
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

/**
 * Regenerates the demo book and swaps it in, on a database that has one.
 *
 * The generator only writes SQLite, so the book is produced into a
 * scratch file exactly as the first-deploy path does, then handed to
 * `db/refresh-demo-book.mjs`, which is the half that knows what it is
 * allowed to touch.
 *
 * A failure here does **not** fail the build. A stale book is a demo
 * that shows last Thursday; a red build is a deployment that shows
 * nothing. The script says what went wrong, rolls its own transaction
 * back, and the schema — which is what this step exists for — is
 * already applied by then.
 */
function refreshDemoBook(venueCount) {
  if (process.env.LYFE_SKIP_DEMO_BOOK) {
    console.log(
      `db:bootstrap — ${venueCount} établissement(s) en base, carnet laissé en place (LYFE_SKIP_DEMO_BOOK)`,
    );
    return;
  }
  console.log(
    `db:bootstrap — ${venueCount} établissement(s) en base, régénération du carnet de démonstration`,
  );
  try {
    execFileSync(process.execPath, ["db/seed.mjs", "--reset", "--sqlite-only", SEED_FILE], {
      stdio: "inherit",
      env: { ...process.env, ...CLOCK },
    });
    // The fixture rows first — the photos, the services, the rooms and
    // the guests a database seeded before they existed has never held.
    // Before the book, because the book carries `customer_id` and
    // `zone_id` and the refresh nulls the ones its target cannot
    // match: guests and rooms first, and the book keeps its names.
    if (process.env.LYFE_SKIP_DEMO_FIXTURES) {
      console.log(
        "db:bootstrap — pièces de démonstration laissées en place (LYFE_SKIP_DEMO_FIXTURES)",
      );
    } else {
      execFileSync(process.execPath, ["db/refresh-demo-fixtures.mjs", SEED_FILE], {
        stdio: "inherit",
      });
    }
    execFileSync(process.execPath, ["db/refresh-demo-book.mjs", SEED_FILE], {
      stdio: "inherit",
    });
  } catch {
    console.error(
      "db:bootstrap — le jeu de démonstration n'a pas été rafraîchi. " +
        "Le schéma est appliqué et le déploiement continue ; les " +
        "réservations affichées sont celles d'avant.",
    );
  }
  try {
    rmSync(SEED_FILE, { force: true });
  } catch {
    // A leftover scratch file is untidy, not fatal.
  }
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
  } else {
    // An existing database. Its book is as old as the deployment, which
    // is the one thing this step rewrites here; whether anybody can
    // sign in to read it is the separate question below.
    refreshDemoBook(venues);

    if (accounts > 0) {
      console.log(
        `db:bootstrap — ${venues} établissement(s) et ${accounts} compte(s) en base, aucun compte à semer`,
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
  }
} finally {
  await client.end();
}
