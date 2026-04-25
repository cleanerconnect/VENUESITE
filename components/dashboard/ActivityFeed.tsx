"use client";

import { useEffect, useState } from "react";
import { activity as initial } from "@/lib/mockData";
import { formatRelative } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

const TYPE_LABEL: Record<ActivityItem["type"], string> = {
  purchase: "Achat",
  transfer: "Transfert",
  refund: "Remboursement",
  scan: "Scan",
  moderation: "Modération",
};

const TYPE_COLOR: Record<ActivityItem["type"], string> = {
  purchase: "#2F6B3D",
  transfer: "#865BA6",
  refund: "#8C4A1B",
  scan: "#0F0F0F",
  moderation: "#D8A83B",
};

const TYPE_ICON: Record<ActivityItem["type"], React.ReactNode> = {
  purchase: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4-2 4 2v5l-4 2-4-2V4Z M2 4l4 2 4-2 M6 6v5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  transfer: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4h6l-2-2 M10 8H4l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  refund: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 6a3 3 0 1 1 1 2.2 M3 6V3.5 M3 6h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  scan: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4V3a1 1 0 0 1 1-1h1 M9 4V3a1 1 0 0 0-1-1H7 M3 8v1a1 1 0 0 0 1 1h1 M9 8v1a1 1 0 0 1-1 1H7 M3 6h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  moderation: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3.5 6.5 5 8l3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
};

export function ActivityFeed() {
  const [items] = useState<ActivityItem[]>(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <ol className="relative">
      {/* Timeline rail */}
      <div
        aria-hidden="true"
        className="absolute left-[15px] top-2 bottom-2 w-px bg-line"
      />
      {items.slice(0, 10).map((it, idx) => {
        const color = TYPE_COLOR[it.type];
        return (
          <li key={it.id} className="relative flex items-start gap-3 py-2.5">
            <span
              className="relative z-10 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface border border-line shrink-0"
              style={{ color }}
            >
              {TYPE_ICON[it.type]}
            </span>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase tracking-badge"
                  style={{ color }}
                >
                  {TYPE_LABEL[it.type]}
                </span>
                <span className="text-[11px] text-muted-2 num">
                  {formatRelative(it.at, now)}
                </span>
              </div>
              <div className="text-[13px] text-ink mt-0.5 leading-snug">
                {it.message}
              </div>
            </div>
            {idx === 0 ? (
              <span
                aria-hidden="true"
                className="absolute -left-1 top-3 h-2 w-2 rounded-full"
                style={{ backgroundColor: color, opacity: 0.2 }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
