"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { LivePulse } from "@/components/motion/LivePulse";
import type { LyfeEvent } from "@/lib/types/domain";

// Live event card on the mobile dashboard — surfaces the event that's
// happening right now or starting within the next 6 hours. Tap takes
// the user straight into the fullscreen scanner mode.
//
// Renders nothing when no event qualifies. The dashboard owns the
// detection (see liveOrUpcomingEvent in MobileFeed).
export function MobileLiveEventCard({
  event,
  hoursAway,
  scanRatePct,
  scannedCount,
  capacity,
  queueAlert,
}: {
  event: LyfeEvent;
  /** 0 = currently live, > 0 = starts in N hours. */
  hoursAway: number;
  scanRatePct: number;
  scannedCount: number;
  capacity: number;
  queueAlert?: string;
}) {
  const isLive = hoursAway === 0;
  const pillLabel = isLive ? "EN COURS" : `DANS ${Math.ceil(hoursAway)}H`;

  return (
    <Link
      href="/scanner"
      className="block rounded-[var(--radius-xl)] overflow-hidden relative active:scale-[0.99] transition-transform"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--color-ink), var(--color-ink-soft))",
        }}
      />
      <div
        aria-hidden
        className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(134,91,166,0.32), transparent 70%)",
        }}
      />

      <div className="relative p-5 text-canvas">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-violet text-canvas text-[10px] font-bold uppercase tracking-[0.12em]">
            {isLive ? <LivePulse /> : null}
            {pillLabel}
          </span>
          <span className="text-meta text-canvas/60 num">
            {event.venue.name}
          </span>
        </div>

        <h2
          className="text-canvas mt-3 line-clamp-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "26px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {event.name}
        </h2>

        <div className="mt-5 flex items-baseline gap-2">
          <span
            className="text-canvas num"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "44px",
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {scanRatePct.toFixed(0)} %
          </span>
          <span className="text-meta text-canvas/65 num">
            scannés · {scannedCount.toLocaleString("fr-FR").replace(/,/g, " ")}{" "}
            / {capacity.toLocaleString("fr-FR").replace(/,/g, " ")}
          </span>
        </div>

        {queueAlert ? (
          <div className="mt-4 inline-flex items-start gap-2 rounded-[10px] bg-warning/15 text-warning px-3 py-2">
            <AlertTriangle size={13} strokeWidth={1.9} className="mt-0.5 shrink-0" />
            <span className="text-meta font-medium">{queueAlert}</span>
          </div>
        ) : null}

        <div className="mt-5 inline-flex items-center gap-1 text-meta font-bold uppercase tracking-[0.08em] text-violet">
          Ouvrir le scanner
          <ArrowRight size={11} strokeWidth={2.2} />
        </div>
      </div>
    </Link>
  );
}
