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
import { formatMAD } from "@/lib/utils/format";
import type { RevenuePoint } from "@/lib/types/domain";

// Recharts area chart with the gold area gradient + ink stroke. Custom
// tooltip — white card with gold accent left border.
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
              <stop offset="0%" stopColor="#C9A64C" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#C9A64C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#E8DFC9"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={(iso) =>
              format(new Date(iso), "d MMM", { locale: fr })
            }
            tick={{ fill: "#6B7689", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            width={56}
            tickFormatter={(v) => formatMAD(v, false)}
            tick={{ fill: "#6B7689", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "#C9A64C", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = Number(payload[0]?.value ?? 0);
              return (
                <div className="bg-surface border-l-2 border-gold border border-line rounded-[var(--radius-sm)] shadow-soft px-3 py-2 num">
                  <div className="text-eyebrow text-ink-mute">
                    {format(new Date(String(label)), "d MMM yyyy", { locale: fr })}
                  </div>
                  <div className="text-[15px] font-bold text-ink mt-0.5">
                    {formatMAD(v)}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#0A1F3D"
            strokeWidth={1.8}
            fill="url(#revenueArea)"
            activeDot={{ r: 5, fill: "#0A1F3D", stroke: "#C9A64C", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
