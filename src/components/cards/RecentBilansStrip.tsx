"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Printer } from "lucide-react";
import type { BilanData } from "@/lib/types/analytics";
import type { LyfeEvent } from "@/lib/types/domain";
import { formatDateFR } from "@/lib/utils/format";

// Pinned strip on /events surfacing the most recent past / settled
// editions with their Bilan. Sponsors and boards regularly need this
// artifact — three clicks deep was too many.
//
// Cards: white surface, subtle violet-soft accent on hover. Stack
// horizontally on desktop, scroll horizontally on mobile.
//
// "Voir le bilan" deep-links to /events/{id}?tab=bilan.
// "Télécharger PDF" deep-links to the same with ?print=1, which
// BilanTab picks up on mount and triggers window.print().
export function RecentBilansStrip({
  rows,
}: {
  rows: { event: LyfeEvent; bilan: BilanData }[];
}) {
  return (
    <section aria-label="Récents bilans" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-eyebrow text-violet-deep">Récents bilans</h2>
        <Link
          href="/events?filter=bilans"
          className="text-meta text-ink-mute hover:text-ink transition-colors font-medium"
        >
          Tout voir
        </Link>
      </div>
      {/* Mobile: single-column vertical stack with full-width cards.
          Desktop: horizontal scroll of fixed-width cards. */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.map(({ event, bilan }) => (
          <BilanCard key={event.id} event={event} bilan={bilan} fullWidth />
        ))}
      </div>
      <div className="hidden md:flex gap-3 overflow-x-auto scroll-thin pb-1">
        {rows.map(({ event, bilan }) => (
          <BilanCard key={event.id} event={event} bilan={bilan} />
        ))}
      </div>
    </section>
  );
}

function BilanCard({
  event,
  bilan,
  fullWidth = false,
}: {
  event: LyfeEvent;
  bilan: BilanData;
  fullWidth?: boolean;
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
      className={fullWidth ? "w-full" : "shrink-0 w-[300px] md:w-[340px]"}
    >
      <Link
        href={`/events/${event.id}?tab=bilan`}
        className="block bg-surface border border-line hover:border-violet-soft rounded-[var(--radius-lg)] p-5 transition-colors hover:shadow-soft relative overflow-hidden"
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
          <div className="text-eyebrow text-ink-mute">
            Clôturé le {formatDateFR(event.endsAt)}
          </div>
          <h3
            className="text-ink mt-2 line-clamp-2"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "20px",
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

          <div className="flex items-center justify-between mt-5">
            <span className="inline-flex items-center gap-1 text-meta font-semibold text-violet-deep">
              Voir le bilan
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
