"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import {
  activeDot,
  areaGradient,
  gridProps,
  lineCursor,
  seriesColor,
  xAxisProps,
  yAxisProps,
} from "@/lib/charts/theme";
import { formatMAD } from "@/lib/utils/format";
import type { RevenuePoint } from "@/lib/types/domain";

// Area chart with the primary series gradient and a dashed guide.
// Appearance comes entirely from the chart theme.
const COLOR = seriesColor(0);
const GRADIENT = areaGradient(COLOR);

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" {...GRADIENT.from} />
              <stop offset="100%" {...GRADIENT.to} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="day"
            tickFormatter={(iso) =>
              format(new Date(iso), "d MMM", { locale: fr })
            }
            {...xAxisProps}
          />
          <YAxis tickFormatter={(v) => formatMAD(v, false)} {...yAxisProps} />
          <Tooltip
            cursor={lineCursor}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <ChartTooltip
                  heading={format(new Date(String(label)), "d MMM yyyy", {
                    locale: fr,
                  })}
                  rows={[{ value: formatMAD(Number(payload[0]?.value ?? 0)) }]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={COLOR}
            strokeWidth={1.8}
            fill="url(#revenueArea)"
            activeDot={activeDot(COLOR)}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
