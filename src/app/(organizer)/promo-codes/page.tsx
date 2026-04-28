"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Copy, MoreVertical, Plus, Tag } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { CreatePromoCodeDialog } from "@/components/promoCodes/CreatePromoCodeDialog";
import { PromoCodeDetailDrawer } from "@/components/promoCodes/PromoCodeDetailDrawer";
import {
  getPromoCodes,
  getPromoCodesAggregate,
} from "@/lib/mock/promoCodes";
import { formatDateFR, formatMAD } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { PromoCode } from "@/lib/types/promoCodes";

type Filter = "all" | "active" | "expired" | "depleted";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "active", label: "Actifs" },
  { id: "expired", label: "Expirés" },
  { id: "depleted", label: "Épuisés" },
];

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

const STATUS_ORDER: Record<PromoCode["status"], number> = {
  active: 0,
  scheduled: 1,
  paused: 2,
  depleted: 3,
  expired: 4,
};

export default function PromoCodesPage() {
  const { toast } = useToast();
  const codes = useMemo(getPromoCodes, []);
  const aggregate = useMemo(getPromoCodesAggregate, []);

  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return FILTERS.reduce<Record<string, number>>((acc, f) => {
      acc[f.id] =
        f.id === "all"
          ? codes.length
          : codes.filter((c) => c.status === f.id).length;
      return acc;
    }, {});
  }, [codes]);

  const list = useMemo(() => {
    return codes
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
  }, [codes, filter]);

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    toast({ tone: "success", title: `Code ${code} copié` });
  };

  return (
    <div className="space-y-6">
      {/* === Header === */}
      <div>
        <h1 className="text-h1 text-ink">Codes promo</h1>
        <p className="text-body text-ink-soft mt-1.5">
          Réductions ciblées, partenariats, et tracking de redemptions.
        </p>
      </div>

      {/* === Hero strip — 3 Fraunces aggregates === */}
      <Card variant="surface" size="md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
          <HeroNumber
            label="Codes actifs"
            value={String(aggregate.activeCount)}
            sub="En diffusion à ce jour"
          />
          <HeroNumber
            label="Redemptions cumulées"
            value={aggregate.totalRedemptions.toLocaleString("fr-FR").replace(/,/g, " ")}
            sub="Tous codes confondus"
            divider
          />
          <HeroNumber
            label="Revenu généré"
            value={formatMAD(aggregate.totalRevenueGeneratedMad)}
            sub="Hors comps presse / partenaires"
            divider
          />
        </div>
      </Card>

      {/* === Filter bar + Create CTA === */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="border-b border-line-soft overflow-x-auto scroll-thin flex-1 min-w-0">
          <div className="flex gap-1 min-w-max">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "relative px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
                    active ? "text-ink" : "text-ink-mute hover:text-ink",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] rounded-full num",
                      active ? "bg-ink text-canvas" : "bg-ink/[0.06] text-ink-soft",
                    )}
                  >
                    {counts[f.id] ?? 0}
                  </span>
                  {active ? (
                    <motion.span
                      layoutId="promo-filter-underline"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-violet rounded-full"
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <Button
          size="md"
          iconLeft={<Plus size={16} strokeWidth={2} />}
          onClick={() => setCreateOpen(true)}
        >
          Créer un code
        </Button>
      </div>

      {/* === Codes table === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-eyebrow text-ink-mute text-left border-b border-line-soft">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Réduction</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Périmètre</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Validité</th>
                <th className="px-4 py-3 font-semibold text-right">Redemptions</th>
                <th className="px-4 py-3 font-semibold text-right hidden md:table-cell">Revenu</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const fillPct =
                  c.maxRedemptions > 0
                    ? (c.redemptionCount / c.maxRedemptions) * 100
                    : 0;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-line-soft last:border-0 hover:bg-canvas-2/40 cursor-pointer transition-colors"
                    onClick={() => setDetailId(c.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(c.code);
                          }}
                          className="font-mono text-[13px] font-semibold text-ink num inline-flex items-center gap-1.5 hover:text-violet-deep transition-colors"
                          aria-label={`Copier ${c.code}`}
                        >
                          {c.code}
                          <Copy
                            size={11}
                            strokeWidth={1.9}
                            className="text-ink-mute"
                          />
                        </button>
                      </div>
                      <div className="md:hidden text-meta text-ink-mute mt-1 num">
                        {c.kind === "percentage"
                          ? `−${c.valuePct} %`
                          : c.kind === "flat"
                            ? `−${formatMAD(c.valueFlatMad ?? 0)}`
                            : "Comp"}
                        {" · "}
                        {c.scopeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Pill tone={c.kind === "comp" ? "info" : "violet"}>
                          {c.kind === "percentage"
                            ? `−${c.valuePct} %`
                            : c.kind === "flat"
                              ? `−${formatMAD(c.valueFlatMad ?? 0, false)} MAD`
                              : "Comp"}
                        </Pill>
                      </div>
                      <div className="text-meta text-ink-mute mt-1.5 num">
                        {c.maxPerUser
                          ? `${c.maxPerUser} max / user`
                          : "Illimité par user"}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-ink-soft text-[12.5px]">
                      <div className="flex items-center gap-1">
                        <Tag size={11} strokeWidth={1.9} className="text-ink-mute" />
                        {c.scopeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell num text-meta text-ink-soft">
                      {formatDateFR(c.startsAt)}
                      <div className="text-ink-mute">→ {formatDateFR(c.endsAt)}</div>
                    </td>
                    <td className="px-4 py-4 text-right num">
                      <div className="text-ink font-bold">
                        {c.redemptionCount}
                        <span className="text-ink-mute"> / {c.maxRedemptions}</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-canvas-2 overflow-hidden ml-auto max-w-[120px]">
                        <div
                          className="h-full rounded-full bg-violet"
                          style={{ width: `${Math.min(100, fillPct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right hidden md:table-cell num font-semibold text-ink">
                      {c.kind === "comp" ? (
                        <span className="text-ink-mute font-normal">—</span>
                      ) : (
                        formatMAD(c.revenueGeneratedMad)
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Pill tone={STATUS_TONE[c.status]} dot>
                        {STATUS_LABEL[c.status]}
                      </Pill>
                    </td>
                    <td
                      className="px-2 py-3 text-ink-mute"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="h-8 w-8 rounded-full hover:bg-ink/[0.04] flex items-center justify-center transition-colors"
                            aria-label="Actions"
                          >
                            <MoreVertical size={14} strokeWidth={1.8} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={4}
                            className="min-w-[200px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
                          >
                            <DropdownMenu.Item
                              onSelect={() => setDetailId(c.id)}
                              className="px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px] hover:bg-ink/[0.04] cursor-pointer outline-none text-ink"
                            >
                              Voir le détail
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() => handleCopy(c.code)}
                              className="px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px] hover:bg-ink/[0.04] cursor-pointer outline-none text-ink"
                            >
                              Copier le code
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() =>
                                toast({
                                  tone: "info",
                                  title: "Action non disponible en démo",
                                })
                              }
                              className="px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px] hover:bg-ink/[0.04] cursor-pointer outline-none text-ink"
                            >
                              Mettre en pause
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() =>
                                toast({
                                  tone: "info",
                                  title: "Action non disponible en démo",
                                })
                              }
                              className="px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px] hover:bg-ink/[0.04] cursor-pointer outline-none text-danger"
                            >
                              Désactiver
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-meta text-ink-soft"
                  >
                    Aucun code dans cette catégorie pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <CreatePromoCodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <PromoCodeDetailDrawer
        codeId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function HeroNumber({
  label,
  value,
  sub,
  divider = false,
}: {
  label: string;
  value: string;
  sub: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? "md:border-l md:border-line-soft md:pl-8" : ""}>
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className="text-violet-deep num mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(36px, 5vw, 52px)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div className="text-meta text-ink-soft mt-2.5">{sub}</div>
    </div>
  );
}
