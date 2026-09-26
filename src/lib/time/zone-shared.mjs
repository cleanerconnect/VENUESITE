// The venue's wall clock, in plain JavaScript.
//
// `zone.ts` states why the portal pins a zone at all: the screen builder
// runs twice, once on the server and once in the browser, and a date
// read in the runtime's own zone gives two different strings when those
// two runtimes sit in different zones.
//
// That rule covers *formatting*. This file covers the other half —
// **parsing**. A stored value like `2026-09-25T23:30:00` carries no
// zone, and the language says a date-time without one is local time. So
// the same string became 22:30 UTC on a server running on Casablanca
// time and 23:30 UTC in a browser running on UTC, the guest list's
// « Clôture à 23h30 » hydrated against « Clôture à 00h30 », React threw
// the tree away, and a door team in another zone read a cutoff an hour
// out. `venueInstant` reads such a value as the venue's wall clock on
// both sides, which is what it always meant.
//
// Plain JavaScript and `-shared` suffixed for the same two reasons
// `demo-clock-shared.mjs` is: `db/seed.mjs` is run by node directly
// while the portal is bundled by Next, and a `.mjs` sitting next to a
// `.ts` of the same base name shadows it in Next's resolver.

/** Where a LYFE venue is, when nothing says otherwise. */
export const DEFAULT_VENUE_TZ = "Africa/Casablanca";

/** A stored date-time that names no zone: the venue's own wall clock. */
const NAIVE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** A bare calendar day, which is a day in the venue's zone, not in UTC. */
const DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** How far `timeZone` is ahead of UTC at this instant, in milliseconds. */
export function zoneOffsetMs(instant, timeZone = DEFAULT_VENUE_TZ) {
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
export function instantFromWallClock(
  y,
  m,
  d,
  hh = 0,
  mm = 0,
  ss = 0,
  timeZone = DEFAULT_VENUE_TZ,
) {
  const wall = Date.UTC(y, m - 1, d, hh, mm, ss);
  // Two passes settle the one case a single pass gets wrong: a wall time
  // on the far side of a DST change, where the offset to subtract is the
  // offset *after* the shift rather than before it. Morocco shifts twice
  // a year around Ramadan, so this is not hypothetical here.
  let ts = wall - zoneOffsetMs(new Date(wall), timeZone);
  ts = wall - zoneOffsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

/**
 * An instant from a stored value, reading a zoneless one as the venue's.
 *
 * Anything that already carries a zone — an ISO instant with `Z` or an
 * offset — is left exactly as it is. This only settles the values that
 * were ambiguous, and it settles them the same way on every runtime.
 */
export function venueInstant(value, timeZone = DEFAULT_VENUE_TZ) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return new Date(value);
  const naive = NAIVE.exec(value);
  if (!naive) return new Date(value);
  return instantFromWallClock(
    Number(naive[1]),
    Number(naive[2]),
    Number(naive[3]),
    Number(naive[4]),
    Number(naive[5]),
    Number(naive[6] ?? 0),
    timeZone,
  );
}

/**
 * The instant a bare day at a bare time is, in the venue's zone.
 *
 * `venueWallClock("2026-09-25", "23:30")`. What the seed writes for a
 * guest list's cutoff and a table's booking: the time is a time in the
 * room, and storing it without a zone leaves whoever reads it to guess.
 */
export function venueWallClock(day, time = "00:00", timeZone = DEFAULT_VENUE_TZ) {
  const d = DAY_ONLY.exec(day);
  if (!d) return venueInstant(day, timeZone);
  const [hh, mm] = time.split(":");
  return instantFromWallClock(
    Number(d[1]),
    Number(d[2]),
    Number(d[3]),
    Number(hh ?? 0),
    Number(mm ?? 0),
    0,
    timeZone,
  );
}
