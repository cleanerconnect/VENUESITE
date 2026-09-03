"use client";

import type { ReactNode } from "react";
import { Card, type CardVariant } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

// The bento KPI tile — one frame, every caller.
//
// Two implementations of this existed: `cards/StatTile` (event side,
// took a number and a delta object) and the `kpi-grid` block's private
// `Tile` (venue side, took a spec). They had already drifted on icon
// chip size and the gap above the value. This is the surviving frame;
// both now compose it.
//
// It is deliberately slot-based rather than data-shaped. It knows about
// a label, an icon, a value, a meta line and a footer — not about
// `Metric`, `Delta` or any spec type. That keeps it importable from the
// styleguide with literal children, and keeps the spec vocabulary from
// leaking into the design system.
export function MetricTile({
  variant = "surface",
  label,
  icon,
  value,
  /** Delta chip or hint line, directly under the value. */
  meta,
  /** Chips, sparkline, progress bar — anything below the meta line. */
  footer,
  span = 1,
  className,
}: {
  variant?: CardVariant;
  label: ReactNode;
  icon?: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  span?: 1 | 2;
  className?: string;
}) {
  return (
    <Card
      variant={variant}
      size="md"
      className={cn("h-full", span === 2 && "lg:col-span-2", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-eyebrow text-ink-soft">{label}</div>
        {icon ? (
          <span
            className="h-9 w-9 rounded-chip flex items-center justify-center bg-surface/70 shrink-0"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-5 text-ink">{value}</div>

      {meta ? <div className="mt-3">{meta}</div> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  );
}
