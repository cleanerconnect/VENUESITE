"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { ChartBlock as Spec } from "@/lib/dashboard/spec";
import { formatValue } from "@/lib/dashboard/value";
import { cardVariant } from "../primitives";

// Time series surface. The value format travels with the block, so the
// same component paints MAD, covers or occupancy without a per-screen
// tooltip formatter.
export function ChartBlock({ block }: { block: Spec }) {
  const format = block.valueFormat ?? { kind: "number" as const };
  const tick = (v: number) => formatValue(v, format);

  return (
    <Card variant={cardVariant(block.tone)} size="md">
      <div className="mb-5">
        <h2 className="text-h3 text-ink">{block.heading}</h2>
        {block.subheading ? (
          <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
        ) : null}
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {block.variant === "bar" ? (
            <BarChart data={block.series} margin={CHART_MARGIN}>
              {commonAxes(tick)}
              <Tooltip content={<ChartTooltip format={format} />} cursor={false} />
              {block.target ? (
                <ReferenceLine
                  y={block.target.value}
                  stroke="var(--color-ink-mute)"
                  strokeDasharray="4 4"
                />
              ) : null}
              <Bar
                dataKey="value"
                fill="var(--color-violet)"
                radius={[6, 6, 0, 0]}
                maxBarSize={34}
              />
            </BarChart>
          ) : (
            <AreaChart data={block.series} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="spec-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-violet)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-violet)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              {commonAxes(tick)}
              <Tooltip content={<ChartTooltip format={format} />} cursor={false} />
              {block.target ? (
                <ReferenceLine
                  y={block.target.value}
                  stroke="var(--color-ink-mute)"
                  strokeDasharray="4 4"
                  label={{
                    value: block.target.label,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "var(--color-ink-mute)",
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-violet)"
                strokeWidth={2}
                fill="url(#spec-chart-fill)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

function commonAxes(tick: (v: number) => string) {
  return (
    <>
      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
        stroke="var(--color-line)"
      />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }}
        dy={8}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={64}
        tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }}
        tickFormatter={tick}
      />
    </>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  format: NonNullable<Spec["valueFormat"]>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-ink text-canvas rounded-[var(--radius-sm)] px-3 py-2 shadow-deep">
      <div className="text-eyebrow text-canvas/55">{label}</div>
      <div className="text-[14px] font-bold text-violet num mt-1">
        {formatValue(payload[0].value, format)}
      </div>
    </div>
  );
}
