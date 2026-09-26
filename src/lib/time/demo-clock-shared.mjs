// The demo clock.
//
// A dashboard is a picture of a moment. Captured at 03h17 the seed's
// dinner service is four hours over, Accueil greets the partner with
// « Bonne nuit », the book has eleven arrived rows and no decision to
// take, and the plate says nothing about what the screen is for. The
// same command run at 20h30 shows a full service. That is not a
// difference anybody chose, and it made the reference captures depend on
// when the container happened to be awake.
//
// `LYFE_DEMO_CLOCK` settles it. One value, read by the seed, by the
// capture tool and by the verify tools, and passed on to the portal they
// start, so all four agree on what « now » is.
//
//   unset · auto      the Thursday of the current week, 20h30 in
//                     Africa/Casablanca — mid-dinner, mid-week
//   off · real        the real clock, for measuring against live time
//   jeudi 20:30       that weekday of the current week, that local time
//   2026-09-24T19:30Z an exact instant
//
// Plain JavaScript, and on purpose: `db/seed.mjs` and `tools/verify/*`
// are ESM scripts run by node directly, and the portal is bundled by
// Next. One file both can import is the only way the seed's idea of the
// hour and the screen's cannot drift.
//
// The portal freezes only when the variable is **set**. Unset is the
// real clock, so a deployment behaves like a deployment; it is the tools
// that default to Thursday, because it is the tools that need a picture
// that looks the same tomorrow.

export const DEMO_CLOCK_ENV = "LYFE_DEMO_CLOCK";

/** Where a LYFE venue is. Kept in step with `VENUE_TIME_ZONE`. */
const ZONE = process.env.NEXT_PUBLIC_VENUE_TZ ?? "Africa/Casablanca";

/** Thursday, 20h30 — the middle of a dinner service, mid-week. */
export const DEMO_CLOCK_DEFAULT = "jeudi 20:30";

const WEEKDAY = {
  lundi: 1, monday: 1, lun: 1, mon: 1,
  mardi: 2, tuesday: 2, mar: 2, tue: 2,
  mercredi: 3, wednesday: 3, mer: 3, wed: 3,
  jeudi: 4, thursday: 4, jeu: 4, thu: 4,
  vendredi: 5, friday: 5, ven: 5, fri: 5,
  samedi: 6, saturday: 6, sam: 6, sat: 6,
  dimanche: 7, sunday: 7, dim: 7, sun: 7,
};

/** How far `timeZone` is ahead of UTC at this instant, in milliseconds. */
function offsetMs(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** The instant whose wall clock in `timeZone` reads these numbers. */
function fromZoned(y, m, d, hh, mm, timeZone) {
  const wall = Date.UTC(y, m - 1, d, hh, mm, 0);
  // Two passes settle the one case a single pass gets wrong: a wall time
  // on the far side of a DST change, where the offset to subtract is the
  // offset *after* the shift rather than before it.
  let ts = wall - offsetMs(new Date(wall), timeZone);
  ts = wall - offsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

/** Today's date and ISO weekday, as `timeZone` reads them. */
function localToday(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const iso = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), weekday: iso };
}

/**
 * The instant `LYFE_DEMO_CLOCK` names, or `null` for the real clock.
 *
 * `fallback` is what an unset variable means to the caller: the tools
 * pass `DEMO_CLOCK_DEFAULT`, the portal passes nothing.
 */
export function resolveDemoClock(value, { fallback = null, from = new Date() } = {}) {
  const raw = (value ?? fallback ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "off" || lower === "real" || lower === "0" || lower === "false") return null;
  if (lower === "auto" || lower === "on" || lower === "1" || lower === "true") {
    return resolveDemoClock(DEMO_CLOCK_DEFAULT, { from });
  }

  // An exact instant, which is what a tool passes to the process it
  // starts: resolved once, then repeated verbatim so a run that straddles
  // midnight does not change its mind halfway through.
  const exact = Date.parse(raw);
  if (!Number.isNaN(exact) && /\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(exact);

  const match = lower.match(/^([a-zé]+)\s+(\d{1,2})[h:](\d{2})$/);
  if (!match) {
    throw new Error(
      `${DEMO_CLOCK_ENV} incompris : « ${raw} ». Attendu « jeudi 20:30 », un instant ISO, ou « off ».`,
    );
  }
  const weekday = WEEKDAY[match[1]];
  if (!weekday) throw new Error(`${DEMO_CLOCK_ENV} : jour inconnu « ${match[1]} ».`);

  const today = localToday(from, ZONE);
  const shift = weekday - today.weekday;
  const day = new Date(Date.UTC(today.y, today.m - 1, today.d) + shift * 86_400_000);
  return fromZoned(
    day.getUTCFullYear(),
    day.getUTCMonth() + 1,
    day.getUTCDate(),
    Number(match[2]),
    Number(match[3]),
    ZONE,
  );
}

/** What the tools run on: the variable, or Thursday 20h30. */
export function toolClock(from = new Date()) {
  return resolveDemoClock(process.env[DEMO_CLOCK_ENV], {
    fallback: DEMO_CLOCK_DEFAULT,
    from,
  });
}

/**
 * What a process started by a tool should be told, as an exact instant.
 *
 * Passing the word « jeudi » on would let each child resolve it against
 * its own idea of the week; passing the instant cannot.
 */
export function toolClockEnv(from = new Date()) {
  const at = toolClock(from);
  return at ? { [DEMO_CLOCK_ENV]: at.toISOString() } : {};
}

/**
 * Where the offset lives, and why it is on `globalThis`.
 *
 * Next.js bundles `instrumentation.ts` and the app router separately, so
 * a module-level `let` in this file is *two* variables: the one the
 * instrumentation hook sets when it installs the clock, and the one the
 * root layout reads when it decides whether to send the browser a
 * script. They were never the same variable, the layout always read
 * zero, and the browser ran an hour and a half behind a server that
 * believed they agreed — which cost Réservations its hydration.
 *
 * The patched `Date` is already global. The offset belongs with it.
 */
const OFFSET = Symbol.for("lyfe.demoClockOffset");

/**
 * Shifts this runtime's clock onto `at`, and returns the offset.
 *
 * An offset rather than a freeze: a frozen `Date.now()` makes every
 * duration zero, and a screen that measures « il y a 3 min » would print
 * « à l'instant » forever. Real time still passes; it passes from a
 * different starting point.
 */
export function installDemoClock(at) {
  if (!at || globalThis[OFFSET] !== undefined) return globalThis[OFFSET] ?? 0;
  const Real = Date;
  const offset = at.getTime() - Real.now();
  globalThis[OFFSET] = offset;
  if (offset === 0) return 0;

  class DemoDate extends Real {
    constructor(...args) {
      if (args.length === 0) super(Real.now() + offset);
      else super(...args);
    }
    static now() {
      return Real.now() + offset;
    }
  }
  // eslint-disable-next-line no-global-assign
  globalThis.Date = DemoDate;
  return offset;
}

/** The offset a runtime is already running on, in milliseconds. */
export function demoClockOffset() {
  return globalThis[OFFSET] ?? 0;
}
