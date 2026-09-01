"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import type { FloorPlanBlock as Spec, FloorTile } from "@/lib/dashboard/spec";
import { useDetailStore } from "@/lib/stores/detail";
import { Icon, TONE_COLOR } from "../primitives";
import { cn } from "@/lib/utils/cn";

// The floor at a glance.
//
// A list of tables tells you what exists; a plan tells you where the
// room is tight. Tiles are colour-coded by state, sized so a manager can
// read the whole service in one look, and ringed by how far into the
// expected turn each party is — the number that decides whether the
// waitlist moves.
export function FloorPlanBlock({ block }: { block: Spec }) {
  return (
    <section>
      {block.heading ? (
        <div className="mb-4">
          <h2 className="text-h2 text-ink">{block.heading}</h2>
          {block.subheading ? (
            <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
          ) : null}
        </div>
      ) : null}

      {block.legend?.length ? (
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mb-5">
          {block.legend.map((entry) => (
            <span
              key={entry.label}
              className="inline-flex items-center gap-2 text-meta text-ink-soft"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: TONE_COLOR[entry.tone] }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {block.zones.map((zone) => (
          <Card key={zone.id} variant="canvas-2" size="md">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h3 className="text-h3 text-ink">{zone.name}</h3>
              {zone.caption ? (
                <span className="text-meta text-ink-mute num shrink-0">
                  {zone.caption}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {zone.tiles.map((tile) => (
                <Tile key={tile.id} tile={tile} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Tile({ tile }: { tile: FloorTile }) {
  const openDetail = useDetailStore((s) => s.open);
  const color = TONE_COLOR[tile.tone];
  const interactive = Boolean(tile.detail);

  const body = (
    <>
      {/* Turn progress runs along the top edge — a party at 110% of its
          expected turn is the one blocking the next seating. */}
      {typeof tile.turnProgress === "number" ? (
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[3px] bg-ink/[0.06] overflow-hidden rounded-t-[var(--radius-lg)]"
        >
          <motion.span
            className="block h-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, tile.turnProgress * 100)}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span className="text-h3 text-ink num">{tile.code}</span>
        <span className="inline-flex items-center gap-1 text-meta text-ink-mute num shrink-0">
          <Icon name="users" size={12} strokeWidth={1.9} />
          {tile.seats}
        </span>
      </div>

      <span
        className="inline-flex items-center gap-1.5 mt-2.5 h-6 px-2 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap self-start"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
          color,
        }}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {tile.stateLabel}
      </span>

      {tile.lines?.length ? (
        <div className="mt-2.5 space-y-0.5">
          {tile.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "text-meta truncate num",
                i === 0 ? "text-ink font-semibold" : "text-ink-mute",
              )}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  const className = cn(
    "relative flex flex-col text-left p-3.5 min-h-[132px] overflow-hidden",
    "bg-surface border rounded-[var(--radius-lg)] transition-all duration-150",
    tile.flagged ? "shadow-soft" : "border-line",
    interactive && "hover:border-ink/30 hover:shadow-soft active:scale-[0.99]",
  );

  // A flagged tile borrows its own state colour rather than a blanket
  // amber — a blocked table and a table running long are both problems,
  // but not the same one, and the tile already says which.
  const style = tile.flagged
    ? { borderColor: `color-mix(in srgb, ${color} 55%, transparent)` }
    : undefined;

  if (!interactive) {
    return (
      <div className={className} style={style}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => tile.detail && openDetail(tile.detail)}
      aria-label={`${tile.code} · ${tile.stateLabel}`}
      className={className}
      style={style}
    >
      {body}
    </button>
  );
}
