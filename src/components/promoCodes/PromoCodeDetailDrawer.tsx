"use client";

import { Copy, Lock, Tag } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Drawer } from "@/components/audiences/Drawer";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { getPromoCodeDetail } from "@/lib/data/static/promoCodes";
import { formatDateFR, formatDateTimeFR, formatMAD } from "@/lib/utils/format";
import type { PromoCode } from "@/lib/types/promoCodes";
import { CHART, barCursor, seriesColor } from "@/lib/charts/theme";

const STATUS_TONE: Record<
  PromoCode["status"],
  "success" | "warning" | "info" | "neutral" | "danger"
> = {
  active: "success",
  scheduled: "info",
  paused: "neutral",
  depleted: "warning",
  expired: "danger",
};

const STATUS_LABEL: Record<PromoCode["status"], string> = {
  active: "Actif",
  scheduled: "Programmé",
  paused: "En pause",
  depleted: "Épuisé",
  expired: "Expiré",
};

export function PromoCodeDetailDrawer({
  codeId,
  onClose,
}: {
  codeId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const detail = codeId ? getPromoCodeDetail(codeId) : null;

  const handleCopy = () => {
    if (!detail) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(detail.code.code).catch(() => {});
    }
    toast({
      tone: "success",
      title: `Code ${detail.code.code} copié`,
    });
  };

  return (
    <Drawer
      open={Boolean(detail)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={detail?.code.code ?? ""}
      description={detail?.code.scopeLabel}
    >
      {detail ? (
        <div className="space-y-6">
          {/* Status + value chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={STATUS_TONE[detail.code.status]} dot>
              {STATUS_LABEL[detail.code.status]}
            </Pill>
            <Pill tone="violet">
              {detail.code.kind === "percentage"
                ? `−${detail.code.valuePct} %`
                : detail.code.kind === "flat"
                  ? `−${formatMAD(detail.code.valueFlatMad ?? 0)}`
                  : "Comp"}
            </Pill>
            {detail.code.kind === "comp" ? (
              <Pill tone="info">Type · Comp / Presse</Pill>
            ) : null}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Redemptions"
              value={`${detail.code.redemptionCount} / ${detail.code.maxRedemptions}`}
              tone="violet"
            />
            <StatTile
              label="Revenu généré"
              value={
                detail.code.kind === "comp"
                  ? "—"
                  : formatMAD(detail.code.revenueGeneratedMad)
              }
            />
            <StatTile
              label="Validité"
              value={`${formatDateFR(detail.code.startsAt)} → ${formatDateFR(detail.code.endsAt)}`}
            />
            <StatTile
              label="Par utilisateur"
              value={
                detail.code.maxPerUser ? `${detail.code.maxPerUser} max` : "Illimité"
              }
            />
          </div>

          {/* Copy block */}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-canvas-2 hover:bg-violet-soft border border-line-soft px-4 py-3 transition-colors group"
          >
            <span className="font-mono text-[14px] font-semibold text-ink num truncate">
              {detail.code.code}
            </span>
            <span className="inline-flex items-center gap-1 text-meta font-semibold text-ink-soft group-hover:text-violet-deep">
              <Copy size={12} strokeWidth={1.9} />
              Copier
            </span>
          </button>

          {/* Daily redemption chart */}
          {detail.daily.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={13} strokeWidth={1.8} className="text-violet-deep" />
                <span className="text-eyebrow text-violet-deep">
                  Redemptions par jour
                </span>
              </div>
              <div className="w-full h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={detail.daily}
                    margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      stroke={CHART.grid}
                      strokeDasharray="2 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(iso) =>
                        format(new Date(iso), "d MMM", { locale: fr })
                      }
                      tick={{ fill: CHART.axis, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={6}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis
                      width={32}
                      tick={{ fill: CHART.axis, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={barCursor}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-surface border-l-2 border-violet border border-line rounded-[var(--radius-sm)] shadow-soft px-3 py-2 num">
                            <div className="text-eyebrow text-ink-mute">
                              {format(new Date(String(label)), "d MMM yyyy", {
                                locale: fr,
                              })}
                            </div>
                            <div className="text-[13px] font-bold text-ink mt-0.5">
                              {payload[0]?.value} redemptions
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" fill={seriesColor(0)} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {/* Combinable note */}
          <div>
            <div className="text-eyebrow text-ink-mute mb-2">Règles de cumul</div>
            <p className="text-[13.5px] text-ink leading-relaxed">
              {detail.code.combinableNote}
            </p>
          </div>

          {/* Internal notes */}
          {detail.code.notes ? (
            <div className="rounded-[var(--radius-md)] bg-canvas-2 border-l-2 border-violet p-3">
              <div className="text-eyebrow text-violet-deep mb-1">Note interne</div>
              <p className="text-meta text-ink leading-relaxed">
                {detail.code.notes}
              </p>
            </div>
          ) : null}

          {/* Top redeemers timeline */}
          <div>
            <div className="text-eyebrow text-ink-mute mb-2">
              Redemptions récentes
            </div>
            <ul className="divide-y divide-line-soft">
              {detail.redemptions.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="h-7 w-7 rounded-full bg-violet-soft text-violet-deep font-semibold flex items-center justify-center text-[10px] shrink-0 num"
                  >
                    {r.buyerInitials.split(".")[0].trim()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink num truncate">
                      <span className="font-semibold">{r.buyerInitials}</span>
                      <span className="text-ink-soft">
                        {" "}· {r.tierName} · {r.city}
                      </span>
                    </div>
                    <div className="text-meta text-ink-mute num mt-0.5">
                      {formatDateTimeFR(r.redeemedAt)}
                    </div>
                  </div>
                  <div className="text-meta num shrink-0 text-right">
                    <div className="font-semibold text-success">
                      −{formatMAD(r.amountSavedMad)}
                    </div>
                    <div className="text-ink-mute">{r.amountPaidLabel}</div>
                  </div>
                </li>
              ))}
            </ul>
            {detail.redemptions.length > 8 ? (
              <div className="mt-2 text-meta text-ink-mute">
                + {detail.redemptions.length - 8} autres redemptions ·{" "}
                {detail.code.redemptionCount} au total
              </div>
            ) : null}
            <div className="mt-3 flex items-start gap-2 text-meta text-ink-mute leading-relaxed">
              <Lock size={11} strokeWidth={1.9} className="mt-0.5 shrink-0" />
              <p>
                Données affichées en initiales conformément à la déclaration
                CNDP n° A-PO-23/2024.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "violet";
}) {
  return (
    <div
      className={
        "rounded-[var(--radius-md)] p-3.5 border " +
        (tone === "violet"
          ? "bg-violet-soft border-violet-soft"
          : "bg-canvas-2 border-line-soft")
      }
    >
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className={
          "num mt-1.5 " +
          (tone === "violet" ? "text-violet-deep" : "text-ink")
        }
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "16px",
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
