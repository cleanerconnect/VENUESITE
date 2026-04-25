"use client";

import { useEffect, useState } from "react";
import { activity as initial } from "@/lib/mockData";
import { formatRelative } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

const TYPE_LABEL: Record<ActivityItem["type"], string> = {
  purchase: "ACHAT",
  transfer: "TRANSFERT",
  refund: "REMBOURSEMENT",
  scan: "SCAN",
  moderation: "MODÉRATION",
};

const TYPE_COLOR: Record<ActivityItem["type"], string> = {
  purchase: "#2F6B3D",
  transfer: "#1F4E79",
  refund: "#8C4A1B",
  scan: "#0A1F3D",
  moderation: "#C9A64C",
};

// Simulates the live WebSocket-driven feed.
// Real impl: subscribe to /ws/organizer/{id}/activity and push to head of list.
export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <ul className="divide-y divide-line">
      {items.slice(0, 10).map((it) => (
        <li key={it.id} className="py-3 flex items-start gap-3">
          <span
            className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: TYPE_COLOR[it.type] }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-badge text-muted">
              {TYPE_LABEL[it.type]}
            </div>
            <div className="text-sm text-ink">{it.message}</div>
          </div>
          <div className="text-xs text-muted shrink-0 num">
            {formatRelative(it.at, now)}
          </div>
        </li>
      ))}
    </ul>
  );
}
