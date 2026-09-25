"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import type { SlotGridBlock as Spec } from "@/lib/dashboard/spec";
import { TONE_COLOR } from "../primitives";
import { cn } from "@/lib/utils/cn";

// Load per slot against the capacity line.
//
// A weekly revenue curve tells an owner how the month is going; this
// tells a manager which fifteen minutes are about to break. Bars over
// capacity paint warning without the spec having to say so — that is a
// reading of the same two numbers the bar already has.
export function SlotGridBlock({ block }: { block: Spec }) {
  const peak = Math.max(block.capacity, ...block.slots.map((s) => s.value), 1);
  const crowded = block.slots.length > 6;

  return (
    <Card variant="surface" size="md">
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-h3 text-ink">{block.heading}</h2>
          {block.subheading ? (
            <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
          ) : null}
        </div>
        <span className="text-meta text-ink-mute num shrink-0">
          {block.capacityLabel ?? `Capacité ${block.capacity} ${block.unitLabel}`}
        </span>
      </div>

      {/* Plot and axis are separate boxes so the capacity line and the
          bars share one coordinate space. Mixing the label row into the
          same flex column is what makes a reference line drift off the
          data it is supposed to cut through. */}
      <div className="relative h-[176px]">
        <div
          aria-hidden
          className="absolute inset-x-0 border-t border-dashed border-ink-mute/45"
          style={{ bottom: `${(block.capacity / peak) * 100}%` }}
        />

        <div className="absolute inset-0 flex items-end gap-1.5">
          {block.slots.map((slot) => {
            const over = slot.value > block.capacity;
            const tone = slot.tone ?? (over ? "warning" : "violet");
            const color = TONE_COLOR[tone];
            const heightPct = Math.max(1, (slot.value / peak) * 100);

            return (
              <div
                key={slot.label}
                className="relative flex-1 min-w-0 h-full flex items-end group"
                title={`${slot.label} · ${slot.value} ${block.unitLabel}`}
              >
                <motion.span
                  className={cn(
                    "block w-full rounded-t-[5px]",
                    slot.current && "ring-2 ring-ink/15",
                  )}
                  style={{ backgroundColor: color }}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.05,
                  }}
                />
                <span
                  className={cn(
                    "absolute inset-x-0 text-center text-meta num font-semibold pointer-events-none transition-opacity",
                    slot.current
                      ? "text-ink"
                      : "text-ink-mute opacity-0 group-hover:opacity-100",
                  )}
                  style={{ bottom: `calc(${heightPct}% + 4px)` }}
                >
                  {slot.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ten labels don't fit a 390px column — they truncate to "08h..",
          which is worse than not showing them. Below sm every other one
          is dropped, except the slot the service is currently in. */}
      <div className="flex gap-1.5 mt-2">
        {block.slots.map((slot, i) => (
          <span
            key={slot.label}
            className={cn(
              "flex-1 min-w-0 text-center text-[10px] num truncate",
              slot.current ? "text-ink font-bold" : "text-ink-mute",
              crowded && i % 2 === 1 && !slot.current && "max-sm:invisible",
            )}
          >
            {slot.label}
          </span>
        ))}
      </div>

    </Card>
  );
}
