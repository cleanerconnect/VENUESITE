"use client";

import type { ReactNode } from "react";

// The one tooltip shell. White card, violet accent on the leading edge,
// tabular figures. Charts pass a heading and rows rather than each
// re-styling a floating div.
export interface ChartTooltipRow {
  label?: string;
  value: string;
  /** Swatch colour — pass the same series colour the mark uses. */
  color?: string;
}

export function ChartTooltip({
  heading,
  rows,
  footer,
}: {
  heading?: string;
  rows: ChartTooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="bg-surface border-l-2 border-violet border border-line rounded-[var(--radius-sm)] shadow-soft px-3 py-2 num">
      {heading ? (
        <div className="text-eyebrow text-ink-mute">{heading}</div>
      ) : null}
      <div className="mt-0.5 flex flex-col gap-1">
        {rows.map((row, i) => (
          <div key={`${row.label ?? "row"}-${i}`} className="flex items-center gap-2">
            {row.color ? (
              <span
                aria-hidden
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: row.color }}
              />
            ) : null}
            {row.label ? (
              <span className="text-meta text-ink-mute">{row.label}</span>
            ) : null}
            <span className="text-[15px] font-bold text-ink">{row.value}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-1 text-meta text-ink-mute">{footer}</div> : null}
    </div>
  );
}
