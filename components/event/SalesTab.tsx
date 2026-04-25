import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RevenueChart } from "./RevenueChart";
import { revenue30d } from "@/lib/mockData";
import { formatMad } from "@/lib/format";
import type { LyfeEvent } from "@/lib/types";
import { IconDownload } from "@/components/layout/icons";

export function SalesTab({ event }: { event: LyfeEvent }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Chiffre d'affaires"
          subtitle="30 derniers jours · valeur faciale"
          action={
            <Button variant="secondary" size="sm" iconLeft={<IconDownload />}>
              Exporter CSV
            </Button>
          }
        />
        <RevenueChart data={revenue30d} />
        <div className="mt-3 text-xs text-muted">
          Pic de ventes : <span className="text-ink num">21h–22h</span>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Détail par tarif"
          subtitle="Conversion à partir des vues de page publique"
        />
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm num">
            <thead className="text-xs uppercase tracking-badge text-muted text-left border-b border-line">
              <tr>
                <th className="px-6 py-2">Tarif</th>
                <th className="px-6 py-2 text-right">Prix</th>
                <th className="px-6 py-2 text-right">Vendu</th>
                <th className="px-6 py-2 text-right">Restant</th>
                <th className="px-6 py-2 text-right">Revenu</th>
                <th className="px-6 py-2 text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {event.tiers.map((t) => {
                const conv =
                  event.pageViews > 0 ? (t.sold / event.pageViews) * 100 : 0;
                return (
                  <tr key={t.id} className="border-b border-line/60">
                    <td className="px-6 py-3 text-ink">
                      <div>{t.name}</div>
                      <div className="mt-1.5 max-w-[180px]">
                        <ProgressBar
                          value={t.sold}
                          max={t.quantity}
                          tone="gold"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {formatMad(t.faceValueMad)}
                    </td>
                    <td className="px-6 py-3 text-right">{t.sold}</td>
                    <td className="px-6 py-3 text-right">
                      {t.quantity - t.sold}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {formatMad(t.sold * t.faceValueMad)}
                    </td>
                    <td className="px-6 py-3 text-right text-muted">
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
