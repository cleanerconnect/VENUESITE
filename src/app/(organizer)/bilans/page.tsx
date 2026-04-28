"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, FileText, Printer, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useProfile } from "@/lib/auth/role";
import { getAllEvents } from "@/lib/mock/events";
import { getBilanByEventId, hasBilan } from "@/lib/mock/bilan";
import type { BilanData } from "@/lib/types/analytics";
import type { LyfeEvent } from "@/lib/types/domain";
import { formatDateFR, formatMAD } from "@/lib/utils/format";

interface Row {
  event: LyfeEvent;
  bilan: BilanData;
}

export default function BilansPage() {
  const profile = useProfile();

  // Bilan factory data is currently scoped to the Jazzablanca demo
  // events. Other profiles (Rooftop Mansour, future accounts) will
  // populate as their first events ship — for now we hard-empty
  // anything that isn't Jazzablanca so the empty state shows.
  const rows = useMemo<Row[]>(() => {
    if (profile && profile.id !== "org_jazzablanca") return [];
    const all = getAllEvents();
    return all
      .filter((e) => hasBilan(e))
      .sort((a, b) => (a.endsAt < b.endsAt ? 1 : -1))
      .map((e) => ({ event: e, bilan: getBilanByEventId(e.id, all) }))
      .filter((r): r is Row => Boolean(r.bilan));
  }, [profile]);

  const aggregate = useMemo(() => {
    if (rows.length === 0) return null;
    const totalNet = rows.reduce((s, r) => s + r.bilan.netRevenueMad, 0);
    // Sell-through weighted by net revenue — aligns with the
    // financial weight of each edition.
    const weightedSellThrough = totalNet
      ? rows.reduce(
          (s, r) => s + r.bilan.finalSellThroughPct * r.bilan.netRevenueMad,
          0,
        ) / totalNet
      : 0;
    return {
      totalNetLabel: shortMadLabel(totalNet),
      editionCount: rows.length,
      sellThroughPct: Math.round(weightedSellThrough),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* === Header === */}
      <div>
        <h1 className="text-h1 text-ink">Bilans</h1>
        <p className="text-body text-ink-soft mt-1.5">
          Vos rapports post-événement, prêts à partager.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyBilans />
      ) : (
        <>
          {aggregate ? (
            <Card variant="surface" size="md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                <HeroNumber
                  label="Revenu net cumulé"
                  value={aggregate.totalNetLabel}
                  sub="Toutes éditions clôturées · post-fees"
                />
                <HeroNumber
                  label="Éditions clôturées"
                  value={String(aggregate.editionCount)}
                  sub="Bilans disponibles à l'export"
                  divider
                />
                <HeroNumber
                  label="Sell-through moyen pondéré"
                  value={`${aggregate.sellThroughPct} %`}
                  sub="Pondération par revenu net"
                  divider
                />
              </div>
            </Card>
          ) : null}

          {/* === Grid of Bilan cards === */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map(({ event, bilan }) => (
              <BilanGridCard key={event.id} event={event} bilan={bilan} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BilanGridCard({
  event,
  bilan,
}: {
  event: LyfeEvent;
  bilan: BilanData;
}) {
  const router = useRouter();

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/events/${event.id}?tab=bilan&print=1`);
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/events/${event.id}?tab=bilan`}
        className="block bg-surface border border-line hover:border-violet-soft rounded-[var(--radius-lg)] p-5 transition-colors hover:shadow-soft relative overflow-hidden h-full"
      >
        <div
          aria-hidden
          className="absolute -top-12 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(134,91,166,0.10), transparent 70%)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Pill tone="success">Édition clôturée</Pill>
            <span className="text-meta text-ink-soft num">
              Clôturé le {formatDateFR(event.endsAt)}
            </span>
          </div>

          <h3
            className="text-ink line-clamp-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "22px",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {event.name}
          </h3>

          <div
            className="text-violet-deep num mt-3"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "26px",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {bilan.netRevenueLabel}
          </div>

          {/* Three small stats inline */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-line-soft">
            <MiniStat
              label="Revenu brut"
              value={shortMadLabel(bilan.finalRevenueMad)}
            />
            <MiniStat
              label="Sell-through"
              value={`${bilan.finalSellThroughPct} %`}
            />
            <MiniStat
              label="Scan"
              value={`${bilan.scanRatePct.toFixed(1).replace(".", ",")} %`}
              icon={<ScanLine size={11} strokeWidth={1.9} />}
            />
          </div>

          <div className="flex items-center justify-between mt-5">
            <span className="inline-flex items-center gap-1 text-meta font-semibold text-violet-deep">
              Voir le bilan complet
              <ArrowRight size={11} strokeWidth={2.2} />
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold bg-canvas-2 hover:bg-violet-soft text-ink-soft hover:text-violet-deep transition-colors"
              aria-label="Télécharger PDF"
            >
              <Printer size={11} strokeWidth={1.9} />
              PDF
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] text-ink-mute font-semibold uppercase tracking-[0.08em] flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-[13px] font-bold text-ink num mt-1">{value}</div>
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

function EmptyBilans() {
  return (
    <Card variant="surface" size="md" className="py-16 text-center">
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-soft mb-5"
      >
        <FileText size={22} strokeWidth={1.6} className="text-violet-deep" />
      </span>
      <h2
        className="text-ink"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          fontSize: "30px",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        Aucun bilan pour le moment.
      </h2>
      <p className="text-body text-ink-soft mt-3 max-w-md mx-auto leading-relaxed">
        Vos premiers bilans apparaîtront ici dès la clôture de votre premier
        événement.
      </p>
    </Card>
  );
}

// Compact MAD label for the aggregate hero, e.g. "32,3M MAD".
// Falls back to formatMAD when the number is below 1M.
function shortMadLabel(mad: number): string {
  if (mad >= 1_000_000) {
    const millions = mad / 1_000_000;
    return `${millions.toFixed(1).replace(".", ",")}M MAD`;
  }
  if (mad >= 1_000) {
    const thousands = mad / 1_000;
    return `${thousands.toFixed(0)}k MAD`;
  }
  return formatMAD(mad);
}
