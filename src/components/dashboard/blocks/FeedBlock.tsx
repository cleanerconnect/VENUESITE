"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { LivePulse } from "@/components/motion/LivePulse";
import type { FeedBlock as Spec, FeedEntry } from "@/lib/dashboard/spec";
import { Icon, TONE_COLOR } from "../primitives";
import { formatRelativeFR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// Activity rail. Entries carry their own glyph, tone and destination, so
// the feed can absorb a new event type — a table freed, an 86'd dish, a
// walk-in seated — without a switch statement growing here.
const FRESH_MS = 60_000;

export function FeedBlock({ block }: { block: Spec }) {
  return (
    <Card variant="surface" size="md">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-h3 text-ink">{block.heading}</h2>
        {block.live ? <LivePulse label="LIVE" /> : null}
      </div>
      {block.subheading ? (
        <p className="text-meta text-ink-mute mb-2">{block.subheading}</p>
      ) : null}

      {block.entries.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-body font-semibold text-ink">
            {block.empty?.title ?? "Rien pour l'instant"}
          </div>
          {block.empty?.body ? (
            <p className="text-meta text-ink-mute mt-1">{block.empty.body}</p>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-line-soft">
          {block.entries.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function Entry({ entry }: { entry: FeedEntry }) {
  const color = TONE_COLOR[entry.tone ?? "neutral"];
  const isFresh = Date.now() - new Date(entry.at).getTime() < FRESH_MS;

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 py-3",
        entry.highlight &&
          "bg-tint-sand/60 -mx-2 px-3 rounded-[var(--radius-sm)] border-l-2 border-warning",
      )}
    >
      <span
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
          color,
        }}
        aria-hidden
      >
        <Icon name={entry.icon} size={13} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink leading-snug">
          <span className="font-semibold">{entry.actor}</span>{" "}
          <span className="text-ink-soft">{entry.message}</span>
        </div>
        <div className="text-meta text-ink-mute num mt-0.5 flex items-center gap-2">
          {formatRelativeFR(entry.at)}
          {isFresh ? <span className="live-pulse" aria-hidden /> : null}
        </div>
      </div>
    </div>
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {entry.href ? (
        <Link
          href={entry.href}
          className="block -mx-2 px-2 rounded-[var(--radius-sm)] hover:bg-canvas-2/60 transition-colors"
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.li>
  );
}
