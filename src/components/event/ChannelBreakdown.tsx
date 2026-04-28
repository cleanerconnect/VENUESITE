"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMAD } from "@/lib/utils/format";
import type { ChannelSlice } from "@/lib/types/analytics";

// Channel attribution: violet (organic) + violet-deep (boost) + sand
// (partner) + sky (direct). Donut on the left, breakdown table on the
// right. Channel slices already carry the colorVar contract from the
// analytics module — we resolve the CSS custom property to a literal
// hex via getComputedStyle for Recharts, since Recharts doesn't read
// `var(--…)` strings on its own SVG paint props.

// Resolved hex matching globals.css. Kept in sync with `analytics.ts`
// CHANNEL_PRESENTATION. Hardcoded so SSR snapshots paint the right
// colors before the runtime CSS evaluates.
const CHANNEL_COLOR_HEX: Record<string, string> = {
  organic: "#865BA6",
  boost: "#6B3F8A",
  partner: "#C4A777",
  direct: "#6395BD",
};

export function ChannelBreakdown({ channels }: { channels: ChannelSlice[] }) {
  if (channels.length === 0) {
    return (
      <EmptyState
        title="Pas encore d'attribution canal"
        description="Les attributions de canal apparaîtront dès la première vente."
      />
    );
  }

  const total = channels.reduce((s, c) => s + c.tickets, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenueMad, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6 items-center">
      {/* Donut — Recharts pie with custom hex per slice */}
      <div className="relative w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={channels}
              dataKey="tickets"
              nameKey="key"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              startAngle={90}
              endAngle={-270}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {channels.map((c) => (
                <Cell
                  key={c.key}
                  fill={CHANNEL_COLOR_HEX[c.key] ?? "#865BA6"}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const slice = payload[0].payload as ChannelSlice;
                return (
                  <div className="bg-surface border-l-2 border-violet border border-line rounded-[var(--radius-sm)] shadow-soft px-3 py-2 num">
                    <div className="text-eyebrow text-ink-mute">
                      {slice.label}
                    </div>
                    <div className="text-[14px] font-bold text-ink mt-1">
                      {slice.tickets} billets · {slice.pct} %
                    </div>
                    <div className="text-meta text-ink-soft mt-0.5">
                      {formatMAD(slice.revenueMad)}
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Donut center — total tickets attributed */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-eyebrow text-ink-mute">Billets</div>
          <div className="text-h2 text-ink num leading-none mt-1">{total}</div>
        </div>
      </div>

      {/* Breakdown — one row per channel */}
      <div className="space-y-3">
        {channels.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: CHANNEL_COLOR_HEX[c.key] ?? "#865BA6" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {c.label}
                </span>
                <span className="text-[13px] font-bold text-ink num">
                  {c.pct} %
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-meta text-ink-soft num mt-0.5">
                <span>{c.tickets} billets</span>
                <span>{formatMAD(c.revenueMad)}</span>
              </div>
              {/* Thin proportional bar — visual anchor to the donut slice */}
              <div className="mt-1.5 h-1 rounded-full bg-line-soft overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.pct}%`,
                    backgroundColor: CHANNEL_COLOR_HEX[c.key] ?? "#865BA6",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        <div className="pt-2 mt-2 border-t border-line-soft flex items-baseline justify-between text-[13px] num">
          <span className="text-ink-soft">Revenu total attribué</span>
          <span className="font-bold text-ink">{formatMAD(totalRevenue)}</span>
        </div>
      </div>
    </div>
  );
}
