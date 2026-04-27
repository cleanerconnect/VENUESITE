"use client";

import { Download, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LivePulse } from "@/components/motion/LivePulse";
import { RevenueChart } from "./RevenueChart";
import { getRevenueSeries } from "@/lib/mock/events";
import { formatMAD } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";

export function SalesTab({ event }: { event: LyfeEvent }) {
  const series = getRevenueSeries();
  const total = series.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
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
            style={{ background: "rgba(134,91,166,0.20)", color: "#B388D6" }}
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
