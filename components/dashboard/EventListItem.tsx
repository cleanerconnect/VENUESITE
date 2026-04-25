import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { LyfeEvent } from "@/lib/types";

export function EventListItem({ event }: { event: LyfeEvent }) {
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-surface border border-line shadow-card p-5 hover:border-ink transition-colors"
    >
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="min-w-0">
          <div className="h-display text-lg text-ink truncate">{event.name}</div>
          <div className="text-xs text-muted mt-0.5">
            {formatDateTime(event.startsAt)} · {event.venue.name}, {event.venue.city}
          </div>
        </div>
        <StatusBadge status={event.status} />
      </div>
      {cap > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted num mb-1.5">
            <span>
              {sold} / {cap} billets
            </span>
            <span>{Math.round((sold / cap) * 100)}%</span>
          </div>
          <ProgressBar value={sold} max={cap} tone="gold" />
        </div>
      ) : null}
    </Link>
  );
}
