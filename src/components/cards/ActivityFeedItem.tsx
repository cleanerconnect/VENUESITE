"use client";

import { motion } from "motion/react";
import { ArrowLeftRight, Check, ScanLine, ShoppingBag, Undo2 } from "lucide-react";
import type { ActivityItem } from "@/lib/types/domain";
import { formatRelativeFR } from "@/lib/utils/format";

const ICON: Record<ActivityItem["type"], React.ReactNode> = {
  purchase: <ShoppingBag size={13} strokeWidth={1.8} />,
  transfer: <ArrowLeftRight size={13} strokeWidth={1.8} />,
  refund: <Undo2 size={13} strokeWidth={1.8} />,
  scan: <ScanLine size={13} strokeWidth={1.8} />,
  moderation: <Check size={13} strokeWidth={1.8} />,
};

const COLOR: Record<ActivityItem["type"], string> = {
  purchase: "var(--color-success)",
  transfer: "var(--color-violet)",
  refund: "var(--color-warning)",
  scan: "var(--color-ink)",
  moderation: "var(--color-gold-deep)",
};

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();

export function ActivityFeedItem({ item }: { item: ActivityItem }) {
  const ageMs = NOW - new Date(item.at).getTime();
  const isFresh = ageMs < 60_000;

  return (
    <motion.li
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 py-3"
    >
      <span
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: `color-mix(in srgb, ${COLOR[item.type]} 12%, transparent)`,
          color: COLOR[item.type],
        }}
        aria-hidden
      >
        {ICON[item.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink leading-snug">
          <span className="font-semibold">{item.actor}</span>{" "}
          <span className="text-ink-soft">{item.message}</span>
        </div>
        <div className="text-meta text-ink-mute num mt-0.5 flex items-center gap-2">
          {formatRelativeFR(item.at)}
          {isFresh ? <span className="live-pulse" aria-hidden /> : null}
        </div>
      </div>
    </motion.li>
  );
}
