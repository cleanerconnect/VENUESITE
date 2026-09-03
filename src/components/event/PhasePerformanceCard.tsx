"use client";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDateFR } from "@/lib/utils/format";
import type { PhaseStat } from "@/lib/types/analytics";

const STATUS_LABEL: Record<PhaseStat["status"], string> = {
  saturated: "Saturée",
  on_track: "En cadence",
  lagging: "En retard",
  upcoming: "À venir",
};

const STATUS_TONE: Record<
  PhaseStat["status"],
  "success" | "violet" | "warning" | "info"
> = {
  saturated: "success",
  on_track: "violet",
  lagging: "warning",
  upcoming: "info",
};

export function PhasePerformanceCard({ phases }: { phases: PhaseStat[] }) {
  return (
    <Card variant="surface" size="md">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-h3 text-ink">Performance par phase</h3>
          <p className="text-meta text-ink-soft mt-1">
            Sell-through et momentum tarif par tarif
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {phases.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13.5px] font-semibold text-ink">
                {p.label}
              </span>
              <Pill tone={STATUS_TONE[p.status]}>
                {STATUS_LABEL[p.status]}
              </Pill>
              <span className="ml-auto text-meta text-ink-soft num">
                {formatDateFR(p.startedAt)} → {formatDateFR(p.endsAt)}
              </span>
            </div>

            <ProgressBar
              value={p.sold}
              max={p.quantity}
              tone="violet"
              size="sm"
            />

            <div className="flex items-baseline justify-between gap-3 text-meta num">
              <span className="text-ink-soft">
                <span className="font-bold text-ink">{p.sold}</span>
                <span className="text-ink-mute"> / {p.quantity}</span>
                <span className="text-ink-mute"> · </span>
                <span className="font-semibold text-ink">
                  {p.fillPct.toFixed(1).replace(".", ",")} %
                </span>
              </span>
              <span className="font-semibold text-ink">{p.revenueLabel}</span>
            </div>

            <p className="text-meta text-ink-soft leading-relaxed">{p.note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
