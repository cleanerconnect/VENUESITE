"use client";

import Link from "next/link";
import { ArrowRight, Download, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { LivePulse } from "@/components/motion/LivePulse";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { BOOST_LABEL, BoostFormatIcon } from "@/components/visibility/BoostFormatIcon";
import {
  formatDateFR,
  formatDateTimeFR,
  formatMAD,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { EntityListSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SettlementsPage() {
  const payoutsQuery = useEventQuery((repo) => repo.listPayouts(), []);
  const invoicesQuery = useEventQuery((repo) => repo.listInvoices(), []);

  const payouts = payoutsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const next = payouts.find((p) => p.status !== "paid") ?? payouts[0];
  const history = payouts.filter((p) => p.status === "paid");

  const daysToNext = next
    ? Math.max(
        0,
        Math.ceil(
          (new Date(next.scheduledFor).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // The hero reads `next`, so the whole page waits on the payout list
  // rather than rendering a header above an empty card.
  if (payoutsQuery.status !== "ready" || !next) {
    return (
      <div className="space-y-5 md:space-y-7">
        <PageHeader
          title="Versements"
          subtitle="L'argent de vos billets, sur votre compte. J+3 après la fin de chaque événement."
        />
        <QueryState
          query={{ ...payoutsQuery, isEmpty: !next }}
          label="Chargement de vos versements"
          skeleton={
            <div className="space-y-5">
              <Skeleton shape="card" className="h-52 w-full" />
              <EntityListSkeleton rows={4} />
            </div>
          }
          empty={{
            title: "Aucun versement pour l'instant",
            body: "Votre premier versement arrivera trois jours après votre premier événement.",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-7">
      <PageHeader
        title="Versements"
        subtitle="L'argent de vos billets, sur votre compte. J+3 après la fin de chaque événement."
      />

      {/* === Next payout, dark hero with Fraunces money headline === */}
      <Card variant="ink" size="hero" glow>
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LivePulse />
              <span className="text-eyebrow text-canvas/55">
                Prochain versement
              </span>
            </div>
            <div
              className="text-violet mt-3 num"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "clamp(48px, 7vw, 80px)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              <AnimatedNumber value={next.amountMad} />
              <span className="text-canvas/60 ml-3 text-h2 font-bold">
                MAD
              </span>
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-canvas/10 text-canvas text-meta font-bold num"
              >
                dans {daysToNext} {daysToNext > 1 ? "jours" : "jour"}
              </span>
              <span className="text-meta text-canvas/65 num">
                Versé le{" "}
                <span className="font-semibold text-canvas">
                  {formatDateFR(next.scheduledFor)}
                </span>{" "}
                · J+3 après l'événement
              </span>
            </div>

            <div className="mt-7 pt-6 border-t border-canvas/10 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 num">
              <Stat label="Billets couverts" value={String(next.ticketCount)} />
              <Stat label="Référence" value={next.reference.slice(-7)} />
              <Stat
                label="Événements"
                value={String(Math.max(next.eventNames.length, 1))}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {next.eventNames.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center h-7 px-3 rounded-full bg-canvas/10 text-canvas text-meta font-medium"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Pill tone="warning" dot>
              {next.status === "scheduled"
                ? "PROGRAMMÉ"
                : next.status === "processing"
                  ? "EN TRAITEMENT"
                  : "VERSÉ"}
            </Pill>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} strokeWidth={1.8} />}
              className="!bg-canvas/10 !border-canvas/20 !text-canvas hover:!bg-canvas/20 hover:!border-canvas/30"
            >
              Pré-relevé
            </Button>
          </div>
        </div>
      </Card>

      {/* === Pre-event payout advance — signaled capability === */}

      {/* === Boost spend, deducted from upcoming settlements === */}
      <BoostSpendCard />

      {/* === History === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-h3 text-ink">Historique des versements</h2>
            <p className="text-meta text-ink-soft mt-1">
              {history.length} versements effectués
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
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold text-right">Montant</th>
                <th className="px-6 py-3 font-semibold">Référence</th>
                <th className="px-6 py-3 font-semibold text-right">Billets</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold text-right">Relevé</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line-soft last:border-0 hover:bg-canvas/40 transition-colors"
                >
                  <td className="px-6 py-3.5 text-ink num">
                    {formatDateFR(p.paidAt!)}
                  </td>
                  <td className="px-6 py-3.5 text-right text-ink num font-bold">
                    {formatMAD(p.amountMad)}
                  </td>
                  <td className="px-6 py-3.5 text-ink-mute text-meta num">
                    {p.reference}
                  </td>
                  <td className="px-6 py-3.5 text-right num text-ink-soft">
                    {p.ticketCount}
                  </td>
                  <td className="px-6 py-3.5">
                    <Pill tone="success" dot>
                      VERSÉ
                    </Pill>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <a
                      href={p.statementUrl}
                      className="inline-flex items-center gap-1.5 text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors"
                    >
                      <Download size={12} strokeWidth={1.8} />
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* === Invoices === */}
      <Card variant="canvas-2" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-h3 text-ink">Factures de commission LYFE</h2>
            <p className="text-meta text-ink-soft mt-1 max-w-md leading-relaxed">
              Émises à votre nom pour les besoins comptables (4 % du revenu).
              Conformes ICE/IF marocain.
            </p>
          </div>
          <Button variant="secondary" size="sm">
            Synthèse annuelle
          </Button>
        </div>
        <ul className="divide-y divide-line-soft">
          {invoices.map((i) => (
            <li
              key={i.id}
              className="px-6 py-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink num">
                  {i.number}
                </div>
                <div className="text-meta text-ink-mute mt-0.5 truncate">
                  {i.description} · {formatDateFR(i.issuedAt)}
                </div>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-[14px] font-bold text-ink num">
                  {formatMAD(i.amountMad)}
                </div>
                <a
                  href={i.pdfUrl}
                  className="inline-flex items-center gap-1.5 text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors"
                >
                  <Download size={12} strokeWidth={1.8} />
                  PDF
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function BoostSpendCard() {
  // Spend = every campaign in the window. In production this is a
  // window-bounded query; the static dataset returns them all.
  const query = useEventQuery((repo) => repo.listCampaigns(), []);
  const campaigns = query.data ?? [];
  // A card that is only ever additive context stays out of the way while
  // it loads and if it fails — a spend figure is not worth an error card
  // on a page whose subject is payouts.
  if (query.status !== "ready" || campaigns.length === 0) return null;
  const total = campaigns.reduce((s, c) => s + c.spentMad, 0);

  return (
    <Card variant="canvas-2" size="md" className="!p-0">
      <div className="px-6 pt-6 pb-4 flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="h-10 w-10 rounded-chip bg-violet-soft flex items-center justify-center shrink-0"
          >
            <Megaphone size={18} strokeWidth={1.7} className="text-violet-deep" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h3 text-ink">Dépenses boost</h2>
              <Pill tone="info">DÉDUIT</Pill>
            </div>
            <p className="text-meta text-ink-soft mt-1 max-w-md leading-relaxed">
              Ces montants sont déduits du prochain versement, ligne par ligne
              sur le relevé.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-eyebrow text-ink-mute">Total</div>
          <div className="text-h3 text-ink num font-bold mt-0.5">
            − {formatMAD(total)}
          </div>
        </div>
      </div>
      <ul className="divide-y divide-line-soft">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="px-6 py-4 flex items-center gap-3 justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <BoostFormatIcon
                type={c.boostType}
                size={16}
                className="text-violet-deep shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink truncate">
                  {c.name}
                </div>
                <div className="text-meta text-ink-mute mt-0.5 truncate">
                  {BOOST_LABEL[c.boostType]} · {c.eventName}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <div className="text-[14px] font-bold text-ink num">
                − {formatMAD(c.spentMad)}
              </div>
              <Link
                href={`/visibilite/${c.id}`}
                className="inline-flex items-center gap-1 text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors"
              >
                Détails
                <ArrowRight size={12} strokeWidth={2} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "color-mix(in oklab, var(--color-on-ink) 55%, transparent)" }}
      >
        {label}
      </div>
      <div className="text-h3 text-canvas mt-1.5">{value}</div>
    </div>
  );
}
