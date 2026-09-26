// The lot the tools check against.
//
// Every tool here walks a list of screens. Which screens exist depends
// on `LYFE_LOT`, so the list is derived from the route index rather than
// typed into each tool — and the same variable has to be set for the
// server under test, or the tool will ask for screens the build does not
// register and call the 404s a failure.
//
//   node tools/verify/walk.mjs                 # lot 1, the default
//   LYFE_LOT=2 node tools/verify/walk.mjs      # the full dashboard
//
// It also carries the demo clock, for the same reason: every tool
// imports this file, so installing it here installs it once.
//
// Mirrors `src/lib/lot/index.ts`: anything that is not "2" is lot 1.

import { ROUTES } from "../../src/lib/nav/routes.ts";
import {
  DEMO_CLOCK_ENV,
  installDemoClock,
  toolClock,
} from "../../src/lib/time/demo-clock-shared.mjs";

export const LOT = process.env.LYFE_LOT?.trim() === "2" ? 2 : 1;

// ── The clock the tools run on ───────────────────────────────
//
// Every tool here imports this module, so this is the one place the
// demo clock has to be installed for all of them. Three of them book a
// table for « today » and read it back off the dashboard; without this
// the tool's today and the portal's today are the same day only when
// the container happens to be awake at the same hour the portal is.
//
// The portal has to be started with the same value — the resolved
// instant, which is what `DEMO_CLOCK` below prints — or the two agree
// about the seed and disagree about the hour. `docs/HANDOFF.md` § 3 has
// the command.
export const DEMO_CLOCK = toolClock();
installDemoClock(DEMO_CLOCK);

/** One line for a tool's banner, so a log says which clock it ran on. */
export const clockLine = () =>
  DEMO_CLOCK
    ? `${DEMO_CLOCK_ENV}=${DEMO_CLOCK.toISOString()} · ` +
      DEMO_CLOCK.toLocaleString("fr-FR", {
        timeZone: process.env.NEXT_PUBLIC_VENUE_TZ ?? "Africa/Casablanca",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "horloge réelle";

export const LOT_LABEL = LOT === 2 ? "lot 2 · complet" : "lot 1 · contractuel";

/** Whether the build under test registers this route. */
export const inLot = (route) => LOT === 2 || route.lot === 1;

/** Venue screens this lot registers, as `[slugPath, label]` pairs. */
export function venueScreens() {
  return ROUTES.filter((r) => r.workspace === "venue" && inLot(r)).map((r) => [
    r.path.replace(/^\/restaurant/, ""),
    r.label,
  ]);
}

/** The same list as bare paths, for the tools that only need those. */
export function venuePaths() {
  return venueScreens().map(([path]) => path);
}

// ── The driver under test ────────────────────────────────────
//
// Five of these tools write: they sign a partner up, decide a booking,
// move one to another hour. The static driver serves the committed
// snapshot and keeps a write in memory at best, so on a cold clone
// those five used to fail — and two of them crashed with a Playwright
// stack rather than saying why. A reviewer reading that stack concludes
// the front end is broken, when what happened is that they ran a
// write-side tool against a read-only driver.
//
// So the driver is asked, once, and a tool that needs more than the
// snapshot says so and stops with a zero exit: the same shape
// `audience.mjs` already uses for a screen this lot does not register.

/** What `/api/health` says, or `null` when nothing answered. */
async function healthOf(base) {
  try {
    const response = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return await response.json();
  } catch {
    // A server that cannot be reached is a different failure, and the
    // tool's own first navigation will report it properly.
    return null;
  }
}

/** Which data driver answered: `http`, `db` or `static`. */
export async function dataModeOf(base) {
  const body = await healthOf(base);
  if (!body) return "unknown";
  return body?.adapters?.data ?? "static";
}

/** Which engine the `db` driver opened: `sqlite`, `postgres`, or null. */
export async function dataEngineOf(base) {
  const body = await healthOf(base);
  return body?.adapters?.dataEngine ?? null;
}

/**
 * Stop, with a reason, when the driver cannot keep a write.
 *
 * `what` names the tool's subject, so the sentence reads as a fact about
 * this run rather than as an error.
 */
export async function requireWrites(base, what) {
  const mode = await dataModeOf(base);
  if (mode !== "static") return mode;
  console.log(
    `${what} a besoin d'une base : le pilote statique sert un instantané en lecture seule.`,
  );
  console.log(
    "Relancer avec `npm run db:reset` (SQLite), `DATABASE_URL=…` (Postgres) " +
      "ou le service mock (`LYFE_DATA=http`).",
  );
  process.exit(0);
}

/**
 * Stop unless the portal and the consumer app share one database.
 *
 * `handshake.mjs` asserts that a venue created at `/inscription` is
 * listed by the app's own API. That is only true when both read the
 * same Postgres: against the mock service the portal writes into a
 * process that the app has never heard of, so the check fails for a
 * reason that has nothing to do with the handshake it is testing.
 */
export async function requireSharedDatabase(base, what) {
  const mode = await dataModeOf(base);
  const engine = mode === "db" ? await dataEngineOf(base) : null;
  // Postgres, specifically. « db » is not enough: the app's backend is
  // FastAPI on Postgres and cannot open a SQLite file, so a portal on
  // SQLite and an app on Postgres are two databases wearing one name.
  // The tool used to accept that and then fail on « the app does not
  // list the venue », which is true and says nothing about the
  // handshake — the venue was written somewhere the app cannot read.
  if (mode === "db" && engine === "postgres") return mode;
  const seen = mode === "db" ? `base ${engine ?? "inconnue"}` : `mode « ${mode} »`;
  console.log(`${what} a besoin d'une base Postgres partagée : le portail est sur ${seen}.`);
  console.log(
    "Relancer le portail sur la même base que l'application " +
      "(`DATABASE_URL=…`), sans `LYFE_DATA=http` et sans base SQLite.",
  );
  process.exit(0);
}

// ── Signing in, without a stopwatch ──────────────────────────
//
// Every tool used to submit the login form and then sleep for a fixed
// 2 000 or 2 800 ms. That held for as long as the seeded account landed
// straight on a venue. Two things ended it:
//
//   · closing the events door in Lot 1 (`A-06`) means the account that
//     owns two venues *and* an organisation now lands on the venue
//     chooser — the login screen's second stage — instead of on a
//     dashboard, so the URL is still `/login` when the sleep ends;
//   · a Postgres round trip for the account, its venues and its
//     organisations takes longer than a SQLite one, so the same sleep
//     was enough on one engine and not on the other.
//
// A tool that fails for either reason reports a defect that is not
// there, which is worse than no tool. So: submit, then wait for the
// portal — picking the venue if the portal asks which one.

/**
 * Sign in and come back with the URL the portal landed on.
 *
 * `venue` names the establishment to pick if the chooser appears; the
 * first one is taken when it does not match. Throws with a readable
 * sentence — not a Playwright stack — when the form refuses.
 */
export async function signIn(page, base, options = {}) {
  const {
    email = "yassine@darzellij.ma",
    password = "demo",
    venue = null,
    timeout = 25000,
  } = options;

  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();

  const deadline = Date.now() + timeout;
  let refusal = "";
  while (Date.now() < deadline) {
    if (!page.url().includes("/login")) return page.url();

    // Stage two: which of my venues? Buttons, not a dialog — the panel
    // replaces the form in place, so the form's disappearance is what
    // says the stage changed. Without that test the loop would click
    // « Mot de passe oublié ? » while waiting.
    const stillOnTheForm = (await page.locator('input[type="email"]').count()) > 0;
    const choices = page.locator('main button:not([type="submit"]):visible');
    const count = stillOnTheForm ? 0 : await choices.count().catch(() => 0);
    if (count > 0) {
      const wanted = venue
        ? choices.filter({ hasText: new RegExp(venue, "i") }).first()
        : null;
      const target = wanted && (await wanted.count()) > 0 ? wanted : choices.first();
      await target.click().catch(() => {});
      await page.waitForTimeout(900);
      continue;
    }

    // A refusal is final: no amount of waiting turns a wrong password
    // into a session.
    const body = (await page.innerText("body").catch(() => "")) ?? "";
    const line = body
      .split("\n")
      .find((l) => /incorrect|trop de tentatives|aucun espace|indisponible/i.test(l));
    if (line) {
      refusal = line.trim();
      break;
    }
    await page.waitForTimeout(400);
  }

  if (!page.url().includes("/login")) return page.url();
  return { refused: refusal || "le portail est resté sur /login", url: page.url() };
}
