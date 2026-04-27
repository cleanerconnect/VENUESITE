"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card, type CardVariant } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { formatPercent } from "@/lib/utils/format";

// Bento KPI tile. Variant chooses the surface treatment (sand / sky / sage /
// rose / gold-soft / surface). Optional sparkline / countdown / chart slot.
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
    <Card
      variant={variant}
      size="md"
      className={span === 2 ? "lg:col-span-2" : ""}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-eyebrow text-ink-soft">{label}</div>
        {icon ? (
          <span
            className="h-9 w-9 rounded-[12px] flex items-center justify-center bg-surface/70"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-2 num">
        {valuePrefix ? (
          <span className="text-h3 text-ink-soft">{valuePrefix}</span>
        ) : null}
        <span
          className="font-extrabold tracking-[-0.03em] text-ink"
          style={{ fontSize: 44, lineHeight: 1 }}
        >
          {isNumber ? <AnimatedNumber value={value as number} /> : value}
        </span>
        {valueSuffix ? (
          <span className="text-h3 text-ink-soft">{valueSuffix}</span>
        ) : null}
      </div>

      {delta ? (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 text-meta font-semibold ${
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
        </div>
      ) : null}

      {hint && !delta ? (
        <div className="mt-3 text-meta text-ink-soft">{hint}</div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
