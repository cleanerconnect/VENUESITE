// Metric formatting.
//
// The spec says *what* a number means (`ValueFormat`); this decides how
// it reads. Keeping the two apart is what lets a tile switch from covers
// to MAD to a 5-star rating without touching the component that paints
// it — and what stops "MAD" from being hardcoded next to a value that is
// actually a percentage.

import { differenceInCalendarDays, differenceInHours } from "date-fns";
import type { Delta, Metric, ValueFormat } from "./spec";
import {
  formatDateFR,
  formatDateTimeFR,
  formatMAD,
  formatRelativeFR,
} from "@/lib/utils/format";

const FR_GROUPS = (n: number, decimals = 0) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Text of a metric, ignoring prefix/suffix (those are painted separately). */
export function formatValue(
  value: number | string,
  format: ValueFormat = { kind: "text" },
): string {
  if (typeof value === "string") {
    // A pre-formatted string always wins — the backend may have already
    // localised something we can't reconstruct client-side.
    return value;
  }

  switch (format.kind) {
    case "number":
      return FR_GROUPS(value, format.decimals ?? 0);
    case "currency":
      return format.currency && format.currency !== "MAD"
        ? `${FR_GROUPS(value, format.decimals ?? 0)} ${format.currency}`
        : formatMAD(value);
    case "percent":
      return `${FR_GROUPS(value, format.decimals ?? 0)} %`;
    case "rating":
      return `${FR_GROUPS(value, 1)} / ${format.max ?? 5}`;
    case "duration":
      return formatDuration(
        format.unit === "seconds" ? Math.round(value / 60) : value,
      );
    case "countdown":
      return formatCountdown(value, format.unit);
    case "datetime":
    case "date":
    case "relative":
      // Numeric epoch is legal for the temporal formats.
      return formatTemporal(new Date(value), format);
    case "text":
    default:
      return FR_GROUPS(value);
  }
}

/**
 * Numeric part of a metric, for the count-up animation. Returns null when
 * the metric can't be animated (strings, dates) so the caller renders
 * static text instead.
 */
export function numericValue(metric: Metric): number | null {
  if (typeof metric.value !== "number") return null;
  const kind = metric.format?.kind ?? "text";
  if (kind === "datetime" || kind === "date" || kind === "relative") return null;
  return metric.value;
}

/** Formatter bound to a metric's format, for AnimatedNumber. */
export function metricFormatter(metric: Metric) {
  const format = metric.format ?? { kind: "number" as const };
  return (n: number) => formatValue(Math.round(n), format);
}

export function formatMetric(metric: Metric): string {
  const body = formatValue(metric.value, metric.format);
  return [metric.prefix, body, metric.suffix].filter(Boolean).join(" ");
}

function formatTemporal(date: Date, format: ValueFormat): string {
  if (format.kind === "relative") return formatRelativeFR(date);
  if (format.kind === "datetime") return formatDateTimeFR(date);
  if (format.kind === "date")
    return formatDateFR(date, format.pattern ?? "dd/MM/yyyy");
  return date.toISOString();
}

function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, "0")}`;
}

function formatCountdown(target: number, unit: "days" | "hours"): string {
  const now = Date.now();
  if (unit === "hours") {
    const h = Math.max(0, differenceInHours(target, now));
    return h <= 1 ? "dans moins d'une heure" : `dans ${h} h`;
  }
  const d = Math.max(0, differenceInCalendarDays(target, now));
  if (d === 0) return "aujourd'hui";
  return d === 1 ? "dans 1 jour" : `dans ${d} jours`;
}

/**
 * Whether a delta should read as good news. `invert` flips it for metrics
 * where down is up — no-shows, waiting time, food cost.
 */
export function isDeltaPositive(delta: Delta): boolean {
  return delta.invert ? delta.value <= 0 : delta.value >= 0;
}

export function formatDelta(delta: Delta): string {
  const sign = delta.value > 0 ? "+" : "";
  return `${sign}${delta.value.toFixed(1).replace(".", ",")} %`;
}
