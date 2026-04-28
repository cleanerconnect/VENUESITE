"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, ThumbsDown, ThumbsUp, Sparkles, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Brand } from "@/components/organizer/Brand";
import { ChannelBreakdown } from "./ChannelBreakdown";
import { getBilanByEventId } from "@/lib/mock/bilan";
import { getAllEvents } from "@/lib/mock/events";
import { formatDateFR, formatMAD } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";
import type { OperationalStat } from "@/lib/types/analytics";

export function BilanTab({ event }: { event: LyfeEvent }) {
  const data = getBilanByEventId(event.id, getAllEvents());
  const search = useSearchParams();
  const autoPrint = search.get("print") === "1";

  // When the user lands here with ?print=1 (e.g. from the "PDF"
  // chip on the Récents bilans strip), trigger the browser print
  // dialog after one paint so the print stylesheet has been applied.
  useEffect(() => {
    if (!autoPrint || !data) return;
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint, data]);

  if (!data) {
    return (
      <Card variant="surface" size="md">
        <p className="text-body text-ink-soft">
          Bilan non disponible pour cet événement.
        </p>
      </Card>
    );
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="bilan-printable space-y-5">
      {/* === Print-only header — LYFE wordmark + event title === */}
      <header className="hidden print:block mb-6">
        <Brand height={28} />
        <div className="text-eyebrow text-ink-mute mt-4">
          Bilan d&apos;événement
        </div>
        <h1
          className="text-ink mt-1"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "26px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {event.name}
        </h1>
        <div className="text-meta text-ink-soft mt-1 num">
          Clôturé le {formatDateFR(event.endsAt)} · {event.venue.name},{" "}
          {event.venue.city}
        </div>
      </header>

      {/* === Top action row — print button only on screen === */}
      <div className="flex items-center justify-end print:hidden">
        <Button
          variant="secondary"
          size="md"
          iconLeft={<Printer size={14} strokeWidth={1.8} />}
          onClick={handlePrint}
        >
          Téléchargement PDF
        </Button>
      </div>

      {/* === 1 · Résultat financier — dark hero === */}
      <section className="bilan-card bilan-hero relative overflow-hidden rounded-[var(--radius-xl)] p-7 md:p-9 text-canvas">
        {/* Backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 print:hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--color-ink), var(--color-ink-soft))",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none print:hidden"
          style={{
            background:
              "radial-gradient(circle, rgba(134,91,166,0.32), transparent 70%)",
          }}
        />

        <div className="relative">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-eyebrow text-canvas/60">
              Résultat financier
            </span>
            <Pill tone="success">Édition clôturée</Pill>
          </div>

          <div
            className="text-canvas mt-4 num"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(48px, 7vw, 76px)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {data.netRevenueLabel}
          </div>
          <div className="text-canvas/70 num mt-2 text-[14px]">
            Brut {formatMAD(data.finalRevenueMad)} · {data.totalAttendees}{" "}
            participants · {data.finalSellThroughPct} % de sell-through
          </div>

          {/* Channel attribution mini-table */}
          <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.channels.map((c) => (
              <div key={c.key}>
                <div className="text-eyebrow text-canvas/55">{c.label}</div>
                <div className="text-h2 text-canvas num mt-1.5">
                  {c.pct.toFixed(1).replace(".", ",")} %
                </div>
                <div className="text-meta text-canvas/60 num mt-1">
                  {formatMAD(c.revenueMad)}
                </div>
              </div>
            ))}
          </div>

          {/* Italic AI takeaway */}
          <p
            className="text-canvas/85 mt-7 max-w-3xl leading-relaxed"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "16.5px",
              lineHeight: 1.55,
            }}
          >
            &laquo; {data.aiTakeaway} &raquo;
          </p>
          <div className="text-meta text-canvas/55 mt-2">
            — Lecture LYFE
          </div>
        </div>
      </section>

      {/* === 2 · Performance opérationnelle — three numbers === */}
      <section className="bilan-card">
        <Card variant="surface" size="md">
          <div className="mb-5">
            <h3 className="text-h3 text-ink">Performance opérationnelle</h3>
            <p className="text-meta text-ink-soft mt-1">
              Comparaison vs édition précédente et médiane plateforme
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.operationalStats.map((s) => (
              <OperationalStatBlock key={s.label} stat={s} />
            ))}
          </div>
        </Card>
      </section>

      {/* === 3 · Ce qui a marché — sage tint === */}
      <section className="bilan-card bilan-tint">
        <Card variant="sage" size="md">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp size={14} strokeWidth={1.9} className="text-success" />
            <span className="text-eyebrow text-success">
              Ce qui a marché
            </span>
          </div>
          <ul className="space-y-3.5">
            {data.whatWorked.map((line, idx) => (
              <li key={idx} className="flex gap-3">
                <span
                  aria-hidden
                  className="text-success mt-0.5 shrink-0"
                  style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <p className="text-[14px] text-ink leading-relaxed flex-1">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* === 4 · Ce qui a moins marché — rose tint === */}
      <section className="bilan-card bilan-tint">
        <Card variant="rose" size="md">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown size={14} strokeWidth={1.9} className="text-danger" />
            <span className="text-eyebrow text-danger">
              Ce qui a moins marché
            </span>
          </div>
          <ul className="space-y-3.5">
            {data.whatDidntWork.map((line, idx) => (
              <li key={idx} className="flex gap-3">
                <span
                  aria-hidden
                  className="text-danger mt-0.5 shrink-0"
                  style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <p className="text-[14px] text-ink leading-relaxed flex-1">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* === 5 · Recommandations — white surface === */}
      <section className="bilan-card">
        <Card variant="surface" size="md">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks size={14} strokeWidth={1.9} className="text-violet-deep" />
            <span className="text-eyebrow text-violet-deep">
              Recommandations
            </span>
          </div>
          <ul className="space-y-3">
            {data.recommendations.map((line, idx) => (
              <li key={idx} className="flex gap-3 items-start">
                <span
                  aria-hidden
                  className="h-5 w-5 rounded-full bg-violet-soft text-violet-deep flex items-center justify-center text-[11px] font-bold shrink-0 num mt-0.5"
                >
                  {idx + 1}
                </span>
                <p className="text-[14px] text-ink leading-relaxed flex-1">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* === Optional · Channel breakdown + reviews summary on screen only ===
          These exist in the data but aren't part of the 5 narrative
          sections — they're appended for screen reading and hidden in
          print to keep the PDF a single readable artifact. */}
      <div className="space-y-5 print:hidden">
        <Card variant="surface" size="md">
          <div className="mb-5">
            <h3 className="text-h3 text-ink">Détail par canal</h3>
            <p className="text-meta text-ink-soft mt-1">
              Volume, attribution et revenu par canal d&apos;acquisition
            </p>
          </div>
          <ChannelBreakdown channels={data.channels} />
        </Card>

        {data.previousEditions.length > 0 ? (
          <Card variant="surface" size="md">
            <div className="mb-5">
              <h3 className="text-h3 text-ink">Comparaison avec l&apos;édition précédente</h3>
              <p className="text-meta text-ink-soft mt-1 num">
                vs {data.previousEditions[0].editionLabel}
              </p>
            </div>
            <div className="space-y-3">
              {data.previousEditions[0].comparisons.map((c) => (
                <div
                  key={c.label}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-4 py-2 border-b border-line-soft last:border-0"
                >
                  <span className="text-[13.5px] text-ink-soft">{c.label}</span>
                  <span className="text-[13.5px] font-bold text-ink num">
                    {c.currentValue}
                  </span>
                  <span className="text-meta text-ink-mute num">
                    vs {c.priorValue}
                  </span>
                  <span
                    className={`text-meta font-semibold num ${
                      c.favorable ? "text-success" : "text-warning"
                    }`}
                  >
                    {c.deltaLabel}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Sparkles
          aria-hidden
          size={14}
          strokeWidth={1.8}
          className="hidden"
        />
      </div>
    </div>
  );
}

function OperationalStatBlock({ stat }: { stat: OperationalStat }) {
  return (
    <div className="border-l-2 border-violet-soft pl-4">
      <div className="text-eyebrow text-ink-mute">{stat.label}</div>
      <div
        className="text-violet-deep num mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(34px, 4.5vw, 44px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {stat.value}
      </div>
      <div className="mt-3 space-y-1">
        <div
          className={`text-meta num ${
            stat.vsHistoricalFavorable ? "text-success" : "text-warning"
          }`}
        >
          {stat.vsHistoricalLabel}
        </div>
        <div
          className={`text-meta num ${
            stat.vsPlatformFavorable ? "text-success" : "text-warning"
          }`}
        >
          {stat.vsPlatformLabel}
        </div>
      </div>
    </div>
  );
}
