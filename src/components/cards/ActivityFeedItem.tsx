"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  MapPin,
  Megaphone,
  ScanLine,
  ShoppingBag,
  TrendingUp,
  Undo2,
} from "lucide-react";
import type { ActivityItem } from "@/lib/types/domain";
import { formatRelativeFR } from "@/lib/utils/format";

const ICON: Record<ActivityItem["type"], React.ReactNode> = {
  purchase: <ShoppingBag size={13} strokeWidth={1.8} />,
  transfer: <ArrowLeftRight size={13} strokeWidth={1.8} />,
  refund: <Undo2 size={13} strokeWidth={1.8} />,
  scan: <ScanLine size={13} strokeWidth={1.8} />,
  moderation: <Check size={13} strokeWidth={1.8} />,
  boost: <Megaphone size={13} strokeWidth={1.8} />,
  anomaly: <AlertTriangle size={13} strokeWidth={1.8} />,
};

const COLOR: Record<ActivityItem["type"], string> = {
  purchase: "var(--color-success)",
  transfer: "var(--color-violet)",
  refund: "var(--color-warning)",
  scan: "var(--color-ink)",
  moderation: "var(--color-violet-deep)",
  boost: "var(--color-violet-deep)",
  anomaly: "var(--color-warning)",
};

const ANOMALY_ICON = {
  spike: <TrendingUp size={13} strokeWidth={1.8} />,
  cluster: <AlertTriangle size={13} strokeWidth={1.8} />,
  geo: <MapPin size={13} strokeWidth={1.8} />,
} as const;

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();

export function ActivityFeedItem({ item }: { item: ActivityItem }) {
  const ageMs = NOW - new Date(item.at).getTime();
  const isFresh = ageMs < 60_000;

  const linkHref =
    item.type === "boost" && item.campaignId
      ? `/visibilite/${item.campaignId}`
      : null;

  const isAnomaly = item.type === "anomaly";
  const icon = isAnomaly && item.anomalyKind
    ? ANOMALY_ICON[item.anomalyKind]
    : ICON[item.type];

  const inner = (
    <div
      className={
        "flex items-start gap-3 py-3 " +
        (isAnomaly
          ? "bg-tint-sand/60 -mx-2 px-3 rounded-[var(--radius-sm)] border-l-2 border-warning"
          : "")
      }
    >
      <span
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: `color-mix(in srgb, ${COLOR[item.type]} 14%, transparent)`,
          color: COLOR[item.type],
        }}
        aria-hidden
      >
        {icon}
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
    </div>
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {linkHref ? (
        <Link
          href={linkHref}
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
