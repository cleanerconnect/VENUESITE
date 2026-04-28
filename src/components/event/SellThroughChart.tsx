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
import type { SellThroughPoint } from "@/lib/types/analytics";

// Violet line = actual cumulative sell-through, ends at "today".
// Violet-soft dashed line = projected target trajectory, full curve.
// Recharts breaks the actual line on undefined values, so we don't
// need a custom domain split — the data shape carries the cut.
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
          <CartesianGrid
            stroke="#E8E2EE"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6B7689", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            width={40}
            tickFormatter={(v) => `${v} %`}
            tick={{ fill: "#6B7689", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            cursor={{
              stroke: "#865BA6",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const actual = payload.find((p) => p.dataKey === "actualPct");
              const projected = payload.find(
                (p) => p.dataKey === "projectedPct",
              );
              return (
                <div className="bg-surface border-l-2 border-violet border border-line rounded-[var(--radius-sm)] shadow-soft px-3 py-2 num min-w-[160px]">
                  <div className="text-eyebrow text-ink-mute">
                    {String(label)}
                  </div>
                  {typeof actual?.value === "number" ? (
                    <div className="flex items-center justify-between gap-4 mt-1.5">
                      <span className="flex items-center gap-1.5 text-meta text-ink-soft">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: "#865BA6" }}
                        />
                        Réel
                      </span>
                      <span className="text-[14px] font-bold text-ink">
                        {Number(actual.value).toFixed(1)} %
                      </span>
                    </div>
                  ) : null}
                  {typeof projected?.value === "number" ? (
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-meta text-ink-soft">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: "#C7B2DB" }}
                        />
                        Projection
                      </span>
                      <span className="text-[14px] font-bold text-ink">
                        {Number(projected.value).toFixed(1)} %
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />

          {/* Projected target trajectory — violet-soft, dashed, full curve. */}
          <Line
            type="monotone"
            dataKey="projectedPct"
            stroke="#C7B2DB"
            strokeWidth={1.6}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#C7B2DB",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
          {/* Actual cadence — violet, solid. Recharts handles the cut at
              today by skipping undefined values automatically. */}
          <Line
            type="monotone"
            dataKey="actualPct"
            stroke="#865BA6"
            strokeWidth={2.2}
            dot={false}
            activeDot={{
              r: 5,
              fill: "#865BA6",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {todayPoint ? (
            <ReferenceLine
              x={todayPoint.label}
              stroke="#0a1f3d"
              strokeOpacity={0.18}
              strokeDasharray="3 3"
              label={{
                value: "Aujourd'hui",
                position: "insideTopRight",
                fill: "#6B7689",
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
