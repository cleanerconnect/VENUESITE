"use client";

import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusPill } from "@/components/ui/Pill";
import { formatDateFR } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";

// Horizontal scroll of the next upcoming events. Each card carries
// the cover gradient, title, J-X countdown, progress bar, and a
// single mini-stat depending on the lifecycle state.
export function MobileUpcomingEventsRow({
  events,
}: {
  events: LyfeEvent[];
}) {
  if (events.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-h3 text-ink">Prochains événements</h2>
        <Link
          href="/events"
          className="text-meta font-semibold text-violet-deep"
        >
          Tout voir →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-thin -mx-4 px-4 pb-1">
        {events.map((event) => (
          <UpcomingMiniCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

function UpcomingMiniCard({ event }: { event: LyfeEvent }) {
  const now = new Date("2026-04-25T19:30:00+01:00").getTime();
  const startsAt = new Date(event.startsAt).getTime();
  const days = Math.max(0, Math.ceil((startsAt - now) / (24 * 3600_000)));
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);

  return (
    <Link
      href={`/events/${event.id}`}
      className="snap-start shrink-0 w-[260px] bg-surface border border-line rounded-[var(--radius-lg)] overflow-hidden active:scale-[0.99] transition-transform"
    >
      {/* Cover gradient — matches the desktop event row treatment */}
      <div
        className="h-28 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-violet-soft), var(--color-tint-sky))",
        }}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--color-gold) 45%, transparent), transparent 70%)",
          }}
        />
        <div className="absolute top-3 left-3">
          <StatusPill status={event.status} />
        </div>
        <div className="absolute top-3 right-3 inline-flex items-center h-6 px-2 rounded-full bg-canvas/80 backdrop-blur text-[10px] font-bold text-ink num uppercase tracking-[0.06em]">
          {days === 0 ? "Jour J" : `J-${days}`}
        </div>
      </div>

      <div className="p-4">
        <h3
          className="text-ink line-clamp-2"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "16px",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {event.name}
        </h3>
        <div className="text-meta text-ink-mute mt-1 num">
          {formatDateFR(event.startsAt)} · {event.venue.city}
        </div>

        {cap > 0 ? (
          <div className="mt-3 space-y-1.5">
            <ProgressBar value={sold} max={cap} tone="violet" size="xs" />
            <div className="text-meta text-ink-soft num">
              <span className="font-bold text-ink">{sold}</span>
              <span className="text-ink-mute"> / {cap}</span>
              <span className="ml-1.5 text-ink-mute">·</span>
              <span className="ml-1.5 font-semibold">
                {Math.round((sold / cap) * 100)} %
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-meta text-ink-mute italic">
            Ventes pas encore ouvertes
          </div>
        )}
      </div>
    </Link>
  );
}
