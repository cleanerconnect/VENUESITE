// What the build step does with each kind of database, and why.
//
//   node tools/verify/deploiement.mjs
//   DATABASE_URL=postgres://…/lyfe_refus node tools/verify/deploiement.mjs
//
// The one tool here that needs neither a browser nor a running server.
// It runs `db/bootstrap.mjs` — the first half of `vercel.json`'s build
// command — against crafted environments and reads its exit code, which
// is the whole of what a deployment reads from it.
//
// Why it exists. Every **Preview** deployment of this project failed for
// weeks while every **Production** deployment of the same commit
// succeeded: `1c4475c`, `6d1afbe` and `b5a74fd` went to production
// green, and the previews of `97b608f`, `84313c5`, `f07910c` and six
// others before them went red. No code was involved — the same tree
// built both ways — and the only thing that differs between the two is
// the environment. `next build` survives a `DATABASE_URL` nothing
// answers on; `db/bootstrap.mjs` did not, and it is the only step in
// the command that opens a connection.
//
// So the step now tells two things apart that one exit code used to
// conflate:
//
//   · **unreachable** — nothing was written, because nothing could be.
//     Fatal everywhere except a Vercel preview, where a look at the
//     front end has no business being gated on a database the preview
//     environment cannot reach.
//   · **reached, and it refused** — the schema may be half applied, and
//     a deployment on top of a half-applied schema reads a shape that
//     does not exist. Fatal everywhere, previews included. This is the
//     assertion that must never be weakened to make a check go green.
//
// The fifth case — reached, and it worked — is `tools/verify/bootstrap.mjs`,
// which counts what comes out the other side.

import { execFileSync } from "node:child_process";

const UNREACHABLE =
  "postgres://user:pass@ep-nothing-answers-here.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require";

const problems = [];
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

/** Runs the step and returns its exit code and what it said. */
function bootstrap(env) {
  try {
    const out = execFileSync(process.execPath, ["db/bootstrap.mjs"], {
      // A clean slate: the ambient `DATABASE_URL` of whoever is running
      // this would otherwise decide half the cases.
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: process.env.NODE_ENV,
        ...env,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, said: out };
  } catch (error) {
    return {
      code: typeof error.status === "number" ? error.status : 1,
      said: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

console.log("\nÉtape de base au build · les issues de db/bootstrap.mjs\n");

// ── 1. No database attached ──
const none = bootstrap({});
check("sans DATABASE_URL, le build continue", none.code === 0, `code ${none.code}`);
check(
  "et il dit qu'il n'y avait rien à préparer",
  /pas de DATABASE_URL/.test(none.said),
  none.said.split("\n")[0] ?? "",
);

// ── 2. The explicit skip ──
const skipped = bootstrap({
  DATABASE_URL: UNREACHABLE,
  LYFE_SKIP_DB_BOOTSTRAP: "1",
});
check("LYFE_SKIP_DB_BOOTSTRAP saute l'étape", skipped.code === 0, `code ${skipped.code}`);
check("sans ouvrir de connexion", !/tentative/.test(skipped.said));

// ── 3. Unreachable, in production ──
//
// Unchanged, and it is the half of this that must stay fatal: a
// production deployment against an unprepared schema is worse than the
// previous deployment staying up.
const prod = bootstrap({ DATABASE_URL: UNREACHABLE, VERCEL_ENV: "production" });
check("en production, une base injoignable arrête le build", prod.code === 1, `code ${prod.code}`);
check(
  "et dit que le schéma n'a rien reçu",
  /n'a reçu aucune écriture/.test(prod.said),
);
check(
  "après plusieurs tentatives, pas une seule",
  /tentative dans 1 s/.test(prod.said) && /tentative dans 4 s/.test(prod.said),
  "1 s, 2 s, 4 s",
);

// ── 4. Unreachable, in a preview ──
const preview = bootstrap({ DATABASE_URL: UNREACHABLE, VERCEL_ENV: "preview" });
check("sur un aperçu, elle ne l'arrête pas", preview.code === 0, `code ${preview.code}`);
check(
  "et l'aperçu dit pourquoi, plutôt que de se taire",
  /Aperçu \(VERCEL_ENV=preview\)/.test(preview.said) &&
    /le schéma n'a reçu aucune écriture/.test(preview.said),
);
check(
  "et renvoie vers /api/health pour savoir ce que l'exécution atteint",
  /api\/health/.test(preview.said),
);

// ── 5. Reached, and refused ──
//
// The one case that needs a real database: one that answers and then
// says no. It must be fatal **on a preview too**, or this tool would be
// certifying that a half-applied schema can ship.
if (!process.env.DATABASE_URL) {
  console.log(
    "\n  —    « jointe et refusée » demande une base Postgres qui réponde " +
      "et refuse le schéma.\n" +
      "       DATABASE_URL=postgres://… node tools/verify/deploiement.mjs\n" +
      "       (un rôle sans CREATE sur le schéma public suffit)",
  );
} else {
  const refused = bootstrap({
    DATABASE_URL: process.env.DATABASE_URL,
    VERCEL_ENV: "preview",
  });
  check(
    "une base qui répond et refuse arrête le build, aperçu compris",
    refused.code !== 0,
    `code ${refused.code}`,
  );
  check(
    "et c'est la migration qui le dit, pas la sonde",
    /db\/migrate\.mjs a échoué/.test(refused.said) && !/injoignable/.test(refused.said),
  );
}

console.log(
  `\n${problems.length === 0 ? "L'étape de base tient ses issues." : `${problems.length} problème(s) :`}`,
);
for (const p of problems) console.log(`  · ${p}`);
console.log("");
process.exit(problems.length === 0 ? 0 : 1);
