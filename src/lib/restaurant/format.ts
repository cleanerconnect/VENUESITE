// Shared builder helpers.
//
// Every screen module needs the same handful of these — a time, a day,
// a party size in the venue's own vocabulary, initials for an avatar.
// They lived inside screens.ts while there was one module; there are now
// several, and three private copies of `initialsOf` is exactly how two
// screens end up disagreeing about how to abbreviate a name.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Block, KpiTile } from "@/lib/dashboard/spec";
import { MAD } from "@/lib/dashboard/formats";
import { formatValue } from "@/lib/dashboard/value";
import { formatTimeFR } from "@/lib/utils/format";
import { configFor } from "@/lib/venue/config";
import type { VenueConfiguration } from "@/lib/types/venue-operations";

export const hm = formatTimeFR;

/** "vendredi 14 mars", from an instant or a bare calendar day. */
export const dayLabel = (value: string) => {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "EEEE d MMMM", { locale: fr });
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
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "EEE d MMM", { locale: fr });
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
