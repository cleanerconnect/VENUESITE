import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RevenueChart } from "./RevenueChart";
import { revenue30d } from "@/lib/mockData";
import { formatMad } from "@/lib/format";
import type { LyfeEvent } from "@/lib/types";
import { IconDownload } from "@/components/layout/icons";

export function SalesTab({ event }: { event: LyfeEvent }) {
  const totalRevenue = revenue30d.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <Card padded={false}>
        <div className="px-6 pt-6 pb-2 flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="eyebrow text-muted-2">Chiffre d'affaires</div>
            <div className="h-hero text-[28px] text-ink mt-2 num">
              {formatMad(totalRevenue)}
            </div>
            <div className="text-[12px] text-muted mt-1">
              30 derniers jours · valeur faciale
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">Pic 21h–22h</span>
            <Button variant="secondary" size="sm" iconLeft={<IconDownload />}>
              Exporter CSV
            </Button>
          </div>
        </div>
        <div className="px-2 pb-2">
          <RevenueChart data={revenue30d} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-6 pt-6">
          <CardHeader
            title="Détail par tarif"
            subtitle="Performance et conversion par catégorie de billet"
          />
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm num">
            <thead>
              <tr className="text-[10px] uppercase tracking-badge text-muted-2 text-left border-y border-line">
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
                const sellThrough = t.quantity > 0 ? (t.sold / t.quantity) * 100 : 0;
                return (
                  <tr
                    key={t.id}
                    className="border-b border-line/60 hover:bg-bg-soft/40 transition-colors"
                  >
                    <td className="px-6 py-4 text-ink">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-1 rounded-full shrink-0"
                          style={{
                            background:
                              sellThrough >= 95
                                ? "linear-gradient(180deg,#D8A83B,#cc9a2e)"
                                : sellThrough >= 60
                                  ? "linear-gradient(180deg,#2f4ea3,#253E86)"
                                  : "rgba(15,15,15,0.15)",
                          }}
                        />
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          <div className="mt-1.5 w-[180px]">
                            <ProgressBar
                              value={t.sold}
                              max={t.quantity}
                              tone={sellThrough >= 95 ? "gold" : "royal"}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatMad(t.faceValueMad)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-ink">
                      {t.sold}
                    </td>
                    <td className="px-6 py-4 text-right text-muted">
                      {t.quantity - t.sold}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-ink">
                      {formatMad(t.sold * t.faceValueMad)}
                    </td>
                    <td className="px-6 py-4 text-right text-muted">
                      {conv.toFixed(1)} %
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
