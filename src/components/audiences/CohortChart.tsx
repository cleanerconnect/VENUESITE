"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Cohort } from "@/lib/types/analytics";

const COHORT_COLORS = ["#865BA6", "#6B3F8A", "#C7B2DB"];

// Cohort retention chart — one line per acquisition cohort, x-axis is
// the index of the event since acquisition (0 = first event), y-axis
// is the % of buyers retained. The data layer carries pre-computed
// retention pcts; the chart just renders.
//
// Recharts doesn't natively support multiple series with different
// x-domains — we widen the data to the longest cohort and let
// shorter cohorts render as undefined points (which Recharts cuts).
export function CohortChart({ cohorts }: { cohorts: Cohort[] }) {
  // Determine the widest cohort so the x-axis can fit all of them.
  const maxIndex = Math.max(...cohorts.map((c) => c.points.length - 1));
  const xLabels = cohorts
    .reduce<string[]>((acc, c) => {
      c.points.forEach((p, i) => {
        if (acc[i] === undefined) acc[i] = p.label;
      });
      return acc;
    }, [])
    .slice(0, maxIndex + 1);

  // Wide-format data for Recharts — one row per index, one column per cohort.
  const data = xLabels.map((label, idx) => {
    const row: Record<string, number | string | undefined> = { label };
    cohorts.forEach((c) => {
      const point = c.points.find((p) => p.index === idx);
      row[c.id] = point ? point.retentionPct : undefined;
    });
    return row;
  });

  return (
    <div>
      <div className="w-full h-[260px]">
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
                return (
                  <div className="bg-surface border-l-2 border-violet border border-line rounded-[var(--radius-sm)] shadow-soft px-3 py-2 num min-w-[180px]">
                    <div className="text-eyebrow text-ink-mute">
                      {String(label)}
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {payload.map((p) => {
                        const cohort = cohorts.find((c) => c.id === p.dataKey);
                        if (!cohort || typeof p.value !== "number") return null;
                        return (
                          <div
                            key={String(p.dataKey)}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="flex items-center gap-1.5 text-meta text-ink-soft">
                              <span
                                aria-hidden
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              {cohort.label}
                            </span>
                            <span className="text-[13px] font-bold text-ink">
                              {p.value.toFixed(0)} %
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />

            {cohorts.map((c, idx) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={c.id}
                stroke={COHORT_COLORS[idx % COHORT_COLORS.length]}
                strokeWidth={2}
                dot={{
                  r: 3.5,
                  fill: COHORT_COLORS[idx % COHORT_COLORS.length],
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: COHORT_COLORS[idx % COHORT_COLORS.length],
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below the chart */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-meta">
        {cohorts.map((c, idx) => (
          <span key={c.id} className="inline-flex items-center gap-1.5 text-ink-soft">
            <span
              aria-hidden
              className="inline-block h-[3px] w-5 rounded-full"
              style={{ backgroundColor: COHORT_COLORS[idx % COHORT_COLORS.length] }}
            />
            <span className="num">
              {c.label} · {c.initialBuyers.toLocaleString("fr-FR").replace(/,/g, " ")} acheteurs
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
