"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "./Sparkline";
import { formatMAD, formatPercent } from "@/lib/utils/format";

// Single Fraunces revenue number + delta vs yesterday + 24-bucket
// sparkline. Tap-to-expand is wired via a Link on the whole card —
// /events route hosts the full chart for now.
export function MobileSalesPulseCard({
  amountMad,
  deltaPct,
  series,
}: {
  amountMad: number;
  deltaPct: number;
  series: number[];
}) {
  const positive = deltaPct >= 0;
  return (
    <Card variant="sand" size="md">
      <div className="text-eyebrow text-ink-mute">Pouls des ventes</div>
      <div
        className="text-ink num mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "44px",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {formatMAD(amountMad, false)}
        <span className="text-ink-mute text-h3 font-bold ml-1.5">MAD</span>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span
          className={
            "inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold num " +
            (positive
              ? "bg-success/14 text-success"
              : "bg-warning/14 text-warning")
          }
        >
          {positive ? (
            <TrendingUp size={11} strokeWidth={2} />
          ) : (
            <TrendingDown size={11} strokeWidth={2} />
          )}
          {formatPercent(deltaPct, 1)}
        </span>
        <span className="text-meta text-ink-soft">vs hier · 24 dernières heures</span>
      </div>
      <div className="mt-4">
        <Sparkline data={series} />
      </div>
    </Card>
  );
}
