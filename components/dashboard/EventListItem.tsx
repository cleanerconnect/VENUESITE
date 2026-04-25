import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime, formatMad } from "@/lib/format";
import type { LyfeEvent } from "@/lib/types";

export function EventListItem({ event }: { event: LyfeEvent }) {
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  const revenue = event.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );
  const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0;
  return (
    <Link
      href={`/events/${event.id}`}
      className="card-link block bg-surface border border-line rounded-lg shadow-card overflow-hidden"
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="min-w-0">
            <div className="h-display text-[17px] text-ink truncate">
              {event.name}
            </div>
            <div className="text-[12px] text-muted mt-1 flex items-center gap-2 num">
              <span>{formatDateTime(event.startsAt)}</span>
              <span className="text-line-strong">·</span>
              <span>
                {event.venue.name}, {event.venue.city}
              </span>
            </div>
          </div>
          <StatusBadge status={event.status} />
        </div>

        {cap > 0 ? (
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <div className="flex items-center justify-between text-[12px] text-muted num mb-1.5">
                <span>
                  <span className="text-ink font-semibold">{sold}</span> /{" "}
                  {cap} billets
                </span>
                <span>{pct}%</span>
              </div>
              <ProgressBar value={sold} max={cap} tone="gold" />
            </div>
            <div className="text-right num">
              <div className="text-[10px] uppercase tracking-badge text-muted-2">
                Revenu
              </div>
              <div className="text-sm font-semibold text-ink">
                {formatMad(revenue)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
