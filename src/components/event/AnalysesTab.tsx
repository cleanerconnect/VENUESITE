"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/EmptyState";
import { SellThroughChart } from "./SellThroughChart";
import { ChannelBreakdown } from "./ChannelBreakdown";
import { PhasePerformanceCard } from "./PhasePerformanceCard";
import { FunnelCard } from "./FunnelCard";
import { ReviewsSummaryCard } from "./ReviewsSummaryCard";
import { AnalysesSideRail } from "./AnalysesSideRail";
import { formatMAD } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";
import { CHART, seriesColor } from "@/lib/charts/theme";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { ChartSkeleton, EntityListSkeleton, KpiGridSkeleton } from "@/components/ui/Skeleton";

export function AnalysesTab({ event }: { event: LyfeEvent }) {
  const query = useEventQuery((repo) => repo.getAnalyses(event.id), [event.id]);
  const data = query.data;
  if (!data) {
    return (
      <EmptyState
        title="Pas encore de cadence à analyser."
        description="Les analyses se débloquent dès l'ouverture de la billetterie."
      />
    );
  }

  const {
    forecast,
    sellThrough,
    channels,
    phases,
    funnel,
    reviewSummary,
    recommendations,
  } = data;
  const hasActuals = sellThrough.some((p) => typeof p.actualPct === "number");

  return (
    <div className="space-y-5">
      {/* === Sub-card 1: Forecast hero (full width) === */}
      <Card variant="violet-soft" size="lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <span
              aria-hidden
              className="h-10 w-10 rounded-[12px] bg-canvas/60 flex items-center justify-center shrink-0"
            >
              <Sparkles
                size={18}
                strokeWidth={1.7}
                className="text-violet-deep"
              />
            </span>
            <div className="min-w-0">
              <div className="text-eyebrow text-violet-deep">
                Prévision de clôture
              </div>
              <p className="text-meta text-ink-soft mt-1.5 max-w-md leading-relaxed">
                Cadence et signaux d'audience extrapolés à la fenêtre de
                vente complète.
              </p>
            </div>
          </div>
          <Pill tone="violet">
            {forecast.confidenceLabel} · ±{forecast.confidenceMarginPct} %
          </Pill>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-7">
          <ForecastBigStat
            label="Sell-through final"
            value={`${forecast.finalSellThroughPct} %`}
            sub={`Marge ±${forecast.confidenceMarginPct} pts`}
          />
          <ForecastBigStat
            label="Revenu projeté"
            value={forecast.finalRevenueLabel}
            sub={`Soit ${formatMAD(forecast.finalRevenueMad)}`}
          />
        </div>
      </Card>

      {/* === Two-column grid: 5 sub-cards in main + 2-panel side rail === */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5 min-w-0">
          {/* Sub-card 2: Pacing / sell-through cadence */}
          <Card variant="surface" size="md">
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <div>
                <h3 className="text-h3 text-ink">Cadence des ventes</h3>
                <p className="text-meta text-ink-soft mt-1">
                  Sell-through cumulé · réel vs trajectoire cible
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-meta">
                <LegendDot color={seriesColor(0)} label="Réel" solid />
                <LegendDot color={CHART.projection} label="Projection" solid={false} />
              </div>
            </div>
            {hasActuals ? (
              <SellThroughChart data={sellThrough} />
            ) : (
              <div className="space-y-3">
                <Card variant="canvas-2" size="sm">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="h-9 w-9 rounded-full bg-violet-soft flex items-center justify-center shrink-0"
                    >
                      <TrendingUp
                        size={16}
                        strokeWidth={1.8}
                        className="text-violet-deep"
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-ink">
                        Aucun ticket vendu, projection seule
                      </div>
                      <p className="text-meta text-ink-soft mt-1 leading-relaxed">
                        L'événement est en modération. La trajectoire
                        ci-dessous est calibrée sur l'audience comparable des
                        éditions précédentes.
                      </p>
                    </div>
                  </div>
                </Card>
                <SellThroughChart data={sellThrough} />
              </div>
            )}
            <div className="flex sm:hidden items-center gap-4 text-meta mt-3">
              <LegendDot color={seriesColor(0)} label="Réel" solid />
              <LegendDot color={CHART.projection} label="Projection" solid={false} />
            </div>
          </Card>

          {/* Sub-card 3: Phase performance */}
          <PhasePerformanceCard phases={phases} />

          {/* Sub-card 4: Channel attribution */}
          <Card variant="surface" size="md">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-h3 text-ink">Attribution par canal</h3>
                <p className="text-meta text-ink-soft mt-1">
                  D'où viennent les billets vendus à ce jour
                </p>
              </div>
            </div>
            <ChannelBreakdown channels={channels} />
          </Card>

          {/* Sub-card 5: Funnel */}
          <FunnelCard funnel={funnel} />

          {/* Sub-card 6: Reviews summary */}
          <ReviewsSummaryCard summary={reviewSummary} />
        </div>

        {/* Side rail — Insights + Recommendations */}
        <AnalysesSideRail
          eventId={event.id}
          recommendations={recommendations}
        />
      </div>
    </div>
  );
}

function ForecastBigStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className="num text-violet-deep mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(34px, 5vw, 44px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div className="text-meta text-ink-soft num mt-2">{sub}</div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  solid,
}: {
  color: string;
  label: string;
  solid: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-soft">
      <span
        aria-hidden
        className="inline-block h-[2px] w-5 rounded-full"
        style={{
          backgroundColor: color,
          backgroundImage: solid
            ? undefined
            : `linear-gradient(to right, ${color} 0 4px, transparent 4px 8px)`,
          backgroundRepeat: "repeat-x",
          backgroundSize: solid ? undefined : "8px 2px",
        }}
      />
      {label}
    </span>
  );
}
