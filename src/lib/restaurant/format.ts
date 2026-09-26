// Shared builder helpers.
//
// Every screen module needs the same handful of these — a time, a day,
// a party size in the venue's own vocabulary, initials for an avatar.
// They lived inside screens.ts while there was one module; there are now
// several, and three private copies of `initialsOf` is exactly how two
// screens end up disagreeing about how to abbreviate a name.

import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { VENUE_TIME_ZONE, venueInstant } from "@/lib/time/zone";
import type { Block, KpiTile } from "@/lib/dashboard/spec";
import { MAD } from "@/lib/dashboard/formats";
import { formatValue } from "@/lib/dashboard/value";
import { formatTimeFR } from "@/lib/utils/format";
import { configFor } from "@/lib/venue/config";
import type { VenueConfiguration } from "@/lib/types/venue-operations";

export const hm = formatTimeFR;

/**
 * "14h15", from a bare clock string.
 *
 * `hm` takes an instant; availability, services and pacing store a wall
 * clock — "14:15" with no day attached. Both end up in the same French
 * sentence, and a screen that renders one of them with a colon is the
 * only place in the portal that does.
 */
export const clock = (value: string) =>
  /^\d{1,2}:\d{2}$/.test(value) ? value.replace(":", "h") : value;

/** "vendredi 14 mars", from an instant or a bare calendar day. */
export const dayLabel = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : venueInstant(value);
  return Number.isNaN(date.getTime()) ? "—" : formatInTimeZone(date, VENUE_TIME_ZONE, "EEEE d MMMM", { locale: fr });
};

/**
 * "ven 14 mars", from either a full instant or a bare calendar day.
 *
 * Both shapes reach these builders — a night is `2026-03-14`, a payment
 * is an ISO instant — and a helper that only took one of them meant
 * every call site remembering which. An unparseable value renders as a
 * dash rather than throwing: a broken date should not take the screen
 * down with it.
 */
export const shortDay = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : venueInstant(value);
  return Number.isNaN(date.getTime()) ? "—" : formatInTimeZone(date, VENUE_TIME_ZONE, "EEE d MMM", { locale: fr });
};

export const money = (n: number) => formatValue(n, MAD);

/** "6 couverts" at a restaurant, "6 personnes" at a lounge. */
export const coversIn = (configuration: VenueConfiguration, n: number) => {
  const config = configFor(configuration);
  return `${n} ${n > 1 ? config.cover.many : config.cover.one}`;
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/**
 * Phone bento: a vertical stack. Spans and sparklines are dropped
 * because neither survives a 390px column — a lane adaptation applied to
 * every tile alike. Which tiles appear at all is the tiles' own call,
 * via `surface`.
 */
export function mobileTiles(block: Block): KpiTile[] {
  if (block.type !== "kpi-grid") return [];
  return block.tiles.map((t) => ({ ...t, span: 1 as const, sparkline: undefined }));
}

/** Minutes between two instants, floored at zero. */
export const minutesBetween = (from: string, to: string | number = Date.now()) =>
  Math.max(
    0,
    Math.round(
      ((typeof to === "number" ? to : Date.parse(to)) - Date.parse(from)) / 60_000,
    ),
  );

/** "1 h 05" for a wait a host quotes out loud, "25 min" below the hour. */
export function waitLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/**
 * Small counts, spelled out.
 *
 * A greeting is a sentence, and a sentence does not open with a numeral:
 * "Cinq réservations aujourd'hui" reads, "5 réservations aujourd'hui"
 * is a readout. Feminine, because every noun a dashboard counts here is
 * — réservation, arrivée, table. Past twenty a figure is clearer than a
 * word, so it stays a figure.
 */
const FEMININE = [
  "zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit",
  "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf", "vingt",
];
export const inWords = (n: number) =>
  Number.isInteger(n) && n >= 0 && n <= 20 ? FEMININE[n] : String(n);

/** First letter up, for a count that opens a sentence. */
export const openSentence = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1);
