"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { CardVariant } from "@/components/ui/Card";
import { MetricTile } from "@/components/ui/MetricTile";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { formatPercent } from "@/lib/utils/format";

// Event-side KPI tile: the plain-props front door to `MetricTile`, for
// pages that hold a number and a delta rather than a spec. The frame,
// the type scale and the spacing all come from `MetricTile`.
export function StatTile({
  variant = "surface",
  label,
  value,
  valuePrefix,
  valueSuffix,
  delta,
  hint,
  icon,
  span = 1,
  children,
}: {
  variant?: CardVariant;
  label: string;
  value: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  delta?: { value: number; period: string };
  hint?: string;
  icon?: ReactNode;
  span?: 1 | 2;
  children?: ReactNode;
}) {
  const isNumber = typeof value === "number";

  return (
    <MetricTile
      variant={variant}
      label={label}
      icon={icon}
      span={span}
      value={
        <span className="flex items-baseline gap-2 num">
          {valuePrefix ? (
            <span className="text-h3 text-ink-soft">{valuePrefix}</span>
          ) : null}
          <span className="text-metric-lg">
            {isNumber ? <AnimatedNumber value={value} /> : value}
          </span>
          {valueSuffix ? (
            <span className="text-h3 text-ink-soft">{valueSuffix}</span>
          ) : null}
        </span>
      }
      meta={
        delta ? (
          <span
            className={`inline-flex items-center gap-1.5 text-meta font-semibold num ${
              delta.value >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {delta.value >= 0 ? (
              <ArrowUpRight size={14} strokeWidth={2} />
            ) : (
              <ArrowDownRight size={14} strokeWidth={2} />
            )}
            {formatPercent(delta.value)}
            <span className="text-ink-mute font-medium">· {delta.period}</span>
          </span>
        ) : hint ? (
          <span className="text-meta text-ink-soft">{hint}</span>
        ) : null
      }
      footer={children}
    />
  );
}
