"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import type { FunnelData } from "@/lib/types/analytics";

// French number formatting with non-breaking space thousand separator —
// matches the rest of the app.
function formatNum(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function FunnelCard({ funnel }: { funnel: FunnelData | null }) {
  if (!funnel) {
    return (
      <Card variant="surface" size="md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-h3 text-ink">Tunnel de conversion</h3>
            <p className="text-meta text-ink-soft mt-1">
              Visites → Panier → Paiement → Achat finalisé
            </p>
          </div>
        </div>
        <EmptyState
          title="En attente du premier visiteur."
          description="Le tunnel apparaîtra dès l'ouverture de la billetterie."
        />
      </Card>
    );
  }

  const max = funnel.steps[0]?.count ?? 1;

  return (
    <Card variant="surface" size="md">
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h3 className="text-h3 text-ink">Tunnel de conversion</h3>
          <p className="text-meta text-ink-soft mt-1">
            Visites → Panier → Paiement → Achat finalisé
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={funnel.vsPlatformPts >= 0 ? "success" : "warning"}>
            {funnel.vsPlatformPts >= 0 ? "+" : "−"}
            {Math.abs(funnel.vsPlatformPts).toFixed(1).replace(".", ",")} pts
            vs plateforme
          </Pill>
        </div>
      </div>

      {/* Steps — proportional bars, drop-off pct between consecutive steps */}
      <div className="space-y-3">
        {funnel.steps.map((step, idx) => {
          const widthPct = Math.max(8, (step.count / max) * 100);
          const previousCount = idx > 0 ? funnel.steps[idx - 1].count : null;
          const dropOffPct =
            previousCount && previousCount > 0
              ? Math.round(((previousCount - step.count) / previousCount) * 100)
              : null;
          return (
            <div key={step.key}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-[13.5px] font-semibold text-ink">
                  {step.label}
                </span>
                <div className="flex items-baseline gap-2 num">
                  <span className="text-[13.5px] font-bold text-ink">
                    {formatNum(step.count)}
                  </span>
                  {typeof step.stepConversionPct === "number" ? (
                    <span className="text-meta text-ink-soft">
                      ({step.stepConversionPct.toFixed(1).replace(".", ",")} %
                      vs précédent)
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="h-7 rounded-[6px] bg-canvas-2 overflow-hidden relative">
                <div
                  className="h-full bg-violet/20 border-l-[3px] border-violet"
                  style={{ width: `${widthPct}%` }}
                />
                {dropOffPct !== null && dropOffPct > 0 ? (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-warning num">
                    −{dropOffPct} %
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall conversion */}
      <div className="mt-5 pt-4 border-t border-line-soft flex items-baseline justify-between">
        <span className="text-meta text-ink-soft">
          Conversion globale visite → achat
        </span>
        <span
          className="text-violet-deep num"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "22px",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {funnel.overallConversionPct.toFixed(1).replace(".", ",")} %
        </span>
      </div>
    </Card>
  );
}
