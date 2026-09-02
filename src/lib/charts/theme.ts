// Chart theme.
//
// Six chart implementations each declared their own axis colour, grid
// dash, tick size and tooltip shell. They drifted: three greys for the
// axis, two dash patterns, two tooltip paddings. This module is the one
// place a chart reads its appearance from, and every value resolves to a
// design token — so a rebrand is an edit in `globals.css`, not a sweep
// through SVG attributes.
//
// Recharts accepts any CSS colour string for `stroke`/`fill`, custom
// properties included, so nothing here needs a hex literal.

/** Ordered series palette. Index into it; do not name a hue at a call site. */
export const SERIES = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
  "var(--color-series-4)",
  "var(--color-series-5)",
  "var(--color-series-6)",
] as const;

/** Wraps around rather than running out, so a chart never renders black. */
export function seriesColor(index: number): string {
  return SERIES[index % SERIES.length];
}

export const CHART = {
  axis: "var(--color-chart-axis)",
  grid: "var(--color-chart-grid)",
  track: "var(--color-chart-track)",
  cursorFill: "var(--color-chart-cursor)",
  surface: "var(--color-canvas)",
  /** Dashed forecast lines — the faded twin of `series-1`. */
  projection: "var(--color-chart-projection)",
  /** "Today" markers and target rules. */
  reference: "var(--color-chart-reference)",
} as const;

/** Horizontal rules only — vertical grid lines read as data. */
export const gridProps = {
  stroke: CHART.grid,
  strokeDasharray: "2 4",
  vertical: false,
} as const;

/** Shared by every X and Y axis: no spine, no ticks, 11px muted labels. */
export const axisProps = {
  tick: { fill: CHART.axis, fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
};

export const xAxisProps = {
  ...axisProps,
  tickMargin: 8,
  interval: "preserveStartEnd" as const,
  minTickGap: 28,
};

export const yAxisProps = {
  ...axisProps,
  width: 56,
};

/** Dashed vertical guide for line and area charts. */
export const lineCursor = {
  stroke: "var(--color-violet)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
} as const;

/** Tinted column highlight for bar charts. */
export const barCursor = { fill: CHART.cursorFill } as const;

export function activeDot(color: string) {
  return { r: 5, fill: color, stroke: CHART.surface, strokeWidth: 2 };
}

/**
 * Gradient stops for an area fill. Pair with a `<linearGradient id>` and
 * reference it as `fill={`url(#${id})`}`.
 */
export function areaGradient(color: string) {
  return {
    from: { stopColor: color, stopOpacity: 0.32 },
    to: { stopColor: color, stopOpacity: 0 },
  };
}
