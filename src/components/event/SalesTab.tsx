"use client";

import Link from "next/link";
import { ArrowRight, Download, Megaphone, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LivePulse } from "@/components/motion/LivePulse";
import { RevenueChart } from "./RevenueChart";
import { formatMAD } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { ChartSkeleton, EntityListSkeleton, KpiGridSkeleton } from "@/components/ui/Skeleton";

export function SalesTab({ event }: { event: LyfeEvent }) {
  const seriesQuery = useEventQuery((repo) => repo.getRevenueSeries(), []);
  const series = seriesQuery.data ?? [];
  const total = series.reduce((s, p) => s + p.amount, 0);

  // Boost attribution scoped to this event — what share of sales came
  // from paid promotion. Shown only when at least one campaign exists.
  const campaignsQuery = useEventQuery((repo) => repo.listCampaigns(), []);
  const eventCampaigns = (campaignsQuery.data ?? []).filter(
    (c) => c.eventId === event.id,
  );
  const boostTickets = eventCampaigns.reduce(
    (s, c) => s + c.ticketsAttributed,
    0,
  );
  const boostRevenue = eventCampaigns.reduce(
    (s, c) => s + c.revenueAttributedMad,
    0,
  );
  const boostSpend = eventCampaigns.reduce((s, c) => s + c.spentMad, 0);
  const totalSold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const boostShare = totalSold > 0 ? (boostTickets / totalSold) * 100 : 0;
  const boostRoas = boostSpend > 0 ? boostRevenue / boostSpend : 0;

  return (
    <div className="space-y-5">
      {/* === Boost attribution strip === */}
      {eventCampaigns.length > 0 ? (
        <Card variant="violet-soft" size="md">
          <div className="flex items-start gap-4 flex-wrap">
            <span
              aria-hidden
              className="h-10 w-10 rounded-[12px] bg-canvas/60 flex items-center justify-center shrink-0"
            >
              <Megaphone size={18} strokeWidth={1.7} className="text-violet-deep" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-eyebrow text-violet-deep">
                  Attribution boost
                </div>
                <Pill tone="info">{eventCampaigns.length} active{eventCampaigns.length > 1 ? "s" : ""}</Pill>
              </div>
              <div className="text-[14px] text-ink mt-2 leading-relaxed">
                <span className="font-semibold num">{boostTickets}</span>{" "}
                billets ({boostShare.toFixed(0)} % du total) attribués aux
                campagnes payantes ·{" "}
                <span className="font-semibold num">
                  {formatMAD(boostRevenue)}
                </span>{" "}
                de revenu pour{" "}
                <span className="num">{formatMAD(boostSpend)}</span> dépensés.
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-eyebrow text-ink-mute">ROAS</div>
                <div
                  className="num text-violet-deep mt-1"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 600,
                    fontSize: "28px",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {boostRoas.toFixed(1).replace(".", ",")}×
                </div>
              </div>
              <Link
                href="/visibilite"
                className="text-meta font-semibold text-violet-deep hover:text-ink transition-colors flex items-center gap-1"
              >
                Détails
                <ArrowRight size={12} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      {/* === Tier breakdown table === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-h3 text-ink">Détail par tarif</h3>
            <p className="text-meta text-ink-soft mt-1">
              Vente, restant et conversion par catégorie de billet
            </p>
          </div>
          <Button variant="secondary" size="sm" iconLeft={<Download size={14} strokeWidth={1.8} />}>
            Exporter CSV
          </Button>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-eyebrow text-ink-mute text-left border-y border-line-soft">
                <th className="px-6 py-3 font-semibold">Tarif</th>
                <th className="px-6 py-3 font-semibold text-right">Prix</th>
                <th className="px-6 py-3 font-semibold text-right">Vendu</th>
                <th className="px-6 py-3 font-semibold text-right">Restant</th>
                <th className="px-6 py-3 font-semibold text-right">Revenu</th>
                <th className="px-6 py-3 font-semibold text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {event.tiers.map((t) => {
                const conv =
                  event.pageViews > 0 ? (t.sold / event.pageViews) * 100 : 0;
                return (
                  <tr key={t.id} className="border-b border-line-soft last:border-0">
                    <td className="px-6 py-4 text-ink">
                      <div className="font-semibold">{t.name}</div>
                      <div className="mt-2 max-w-[220px]">
                        <ProgressBar value={t.sold} max={t.quantity} tone="gold" size="xs" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right num">{formatMAD(t.faceValueMad)}</td>
                    <td className="px-6 py-4 text-right num font-bold text-ink">
                      {t.sold}
                    </td>
                    <td className="px-6 py-4 text-right num text-ink-soft">
                      {t.quantity - t.sold}
                    </td>
                    <td className="px-6 py-4 text-right num font-bold text-ink">
                      {formatMAD(t.sold * t.faceValueMad)}
                    </td>
                    <td className="px-6 py-4 text-right num text-ink-soft">
                      {conv.toFixed(1)} %
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* === Revenue chart + Peak hour === */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(260px,300px)] gap-5">
        <Card variant="surface" size="md">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-h3 text-ink">Chiffre d'affaires</h3>
              <p className="text-meta text-ink-soft mt-1">
                30 derniers jours · valeur faciale
              </p>
            </div>
            <div className="text-right num">
              <div className="text-eyebrow text-ink-mute">Total</div>
              <div className="text-h3 text-ink mt-1">{formatMAD(total)}</div>
            </div>
          </div>
          <RevenueChart data={series} />
        </Card>

        <Card variant="ink" size="md">
          <div className="flex items-center gap-2 mb-3">
            <LivePulse />
            <span className="text-eyebrow text-canvas/60">Pic de ventes</span>
          </div>
          <div className="text-h1 text-canvas num">21h à 22h</div>
          <div
            className="mt-4 inline-flex items-center gap-1.5 text-meta font-bold rounded-full px-2.5 h-6"
            style={{ background: "rgba(134,91,166,0.20)", color: "var(--color-violet-on-ink)" }}
          >
            <TrendingUp size={12} strokeWidth={2} />
            +34 % vs autres heures
          </div>
          <p className="text-[13px] text-canvas/70 mt-4 leading-relaxed">
            Profitez de cette fenêtre pour relancer une story ou un message
            WhatsApp 30 min avant.
          </p>
        </Card>
      </div>
    </div>
  );
}
