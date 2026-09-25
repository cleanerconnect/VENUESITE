"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import {
  CHART,
  activeDot,
  gridProps,
  lineCursor,
  seriesColor,
  xAxisProps,
  yAxisProps,
} from "@/lib/charts/theme";
import type { SellThroughPoint } from "@/lib/types/analytics";

// Solid line = actual cumulative sell-through, ends at "today".
// Dashed projection line = target trajectory, full curve.
// Recharts breaks the actual line on undefined values, so we don't
// need a custom domain split — the data shape carries the cut.
const ACTUAL = seriesColor(0);

export function SellThroughChart({ data }: { data: SellThroughPoint[] }) {
  // The chart annotates "Aujourd'hui" — the first point with actuals
  // is day 0, last is the latest with `actualPct` defined.
  const todayPoint = [...data]
    .reverse()
    .find((p) => typeof p.actualPct === "number");

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...xAxisProps} minTickGap={32} />
          <YAxis
            {...yAxisProps}
            width={40}
            tickFormatter={(v) => `${v} %`}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const actual = payload.find((p) => p.dataKey === "actualPct");
              const projected = payload.find(
                (p) => p.dataKey === "projectedPct",
              );
              return (
                <ChartTooltip
                  heading={String(label)}
                  rows={[
                    ...(typeof actual?.value === "number"
                      ? [
                          {
                            label: "Réel",
                            value: `${Number(actual.value).toFixed(1)} %`,
                            color: ACTUAL,
                          },
                        ]
                      : []),
                    ...(typeof projected?.value === "number"
                      ? [
                          {
                            label: "Projection",
                            value: `${Number(projected.value).toFixed(1)} %`,
                            color: CHART.projection,
                          },
                        ]
                      : []),
                  ]}
                />
              );
            }}
          />

          {/* Projected target trajectory — dashed, full curve. */}
          <Line
            type="monotone"
            dataKey="projectedPct"
            stroke={CHART.projection}
            strokeWidth={1.6}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ ...activeDot(CHART.projection), r: 4 }}
            isAnimationActive={false}
          />
          {/* Actual cadence — solid. Recharts handles the cut at today by
              skipping undefined values automatically. */}
          <Line
            type="monotone"
            dataKey="actualPct"
            stroke={ACTUAL}
            strokeWidth={2.2}
            dot={false}
            activeDot={activeDot(ACTUAL)}
            connectNulls={false}
            isAnimationActive={false}
          />

          {todayPoint ? (
            <ReferenceLine
              x={todayPoint.label}
              stroke={CHART.reference}
              strokeDasharray="3 3"
              label={{
                value: "Aujourd'hui",
                position: "insideTopRight",
                fill: CHART.axis,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
