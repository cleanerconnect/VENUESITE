"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Megaphone, MoreVertical } from "lucide-react";
import type { LyfeEvent } from "@/lib/types/domain";
import { Pill, StatusPill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCampaigns } from "@/lib/mock/visibility";
import { formatDateTimeFR, formatMAD } from "@/lib/utils/format";

// 96px-tall row card. Hover lifts. Click goes to event detail.
export function UpcomingEventRow({ event }: { event: LyfeEvent }) {
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  const revenue = event.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );
  const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0;
  // Whether at least one paid campaign is currently active for this event.
  const activeBoosts = getCampaigns().filter(
    (c) => c.eventId === event.id && c.status === "active",
  ).length;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/events/${event.id}`}
        className="block bg-surface border border-line rounded-[var(--radius-lg)] p-4 hover:shadow-soft transition-shadow"
      >
        <div className="flex items-center gap-4">
          {/* Thumbnail, 80x80, gradient placeholder */}
          <div
            className="hidden sm:block w-20 h-20 rounded-[12px] shrink-0 relative overflow-hidden"
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
                  "radial-gradient(circle at 30% 30%, rgba(201,166,76,0.45), transparent 70%)",
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-h3 text-ink truncate">{event.name}</h4>
              <StatusPill status={event.status} />
              {activeBoosts > 0 ? (
                <Pill tone="info">
                  <Megaphone size={11} strokeWidth={2} className="-ml-0.5" />
                  Boost actif
                </Pill>
              ) : null}
            </div>
            <div className="text-meta text-ink-mute mt-1 num">
              {formatDateTimeFR(event.startsAt)} · {event.venue.name},{" "}
              {event.venue.city}
            </div>

            {cap > 0 ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 max-w-[280px]">
                  <ProgressBar value={sold} max={cap} tone="gold" size="xs" />
                </div>
                <div className="text-meta text-ink-soft num shrink-0">
                  <span className="font-bold text-ink">{sold}</span>
                  <span className="text-ink-mute"> / {cap}</span>
                  <span className="ml-2 text-ink-mute">·</span>
                  <span className="ml-2 font-semibold">{pct}%</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
            <div className="text-eyebrow text-ink-mute">Revenu</div>
            <div className="text-h3 text-ink num">{formatMAD(revenue)}</div>
          </div>

          <button
            className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute shrink-0 transition-colors"
            aria-label="Actions"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            <MoreVertical size={16} strokeWidth={1.8} />
          </button>
        </div>
      </Link>
    </motion.div>
  );
}
