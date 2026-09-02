"use client";

import { Card } from "@/components/ui/Card";
import { CapacityRing } from "@/components/cards/CapacityRing";
import { LivePulse } from "@/components/motion/LivePulse";
import type { HeroBlock as Spec } from "@/lib/dashboard/spec";
import { MetricValue } from "../primitives";
import { cn } from "@/lib/utils/cn";

// The single dark card a screen is allowed. Generic on purpose: a ring,
// up to a handful of headline stats, and an advisory strip. Whether the
// ring counts seats, covers, pass phases or table turns is the spec's
// business.
export function HeroBlock({ block }: { block: Spec }) {
  const stats = block.stats ?? [];

  return (
    <Card variant="ink" size="hero" glow className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {block.live ? (
            <LivePulse label={block.eyebrow} />
          ) : (
            <div className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-violet" />
              <span className="text-eyebrow text-canvas/65">
                {block.eyebrow}
              </span>
            </div>
          )}
          <h2 className="text-h2 text-canvas mt-3 max-w-xs">{block.title}</h2>
          {block.subtitle ? (
            <div className="text-meta text-canvas/60 mt-1 num">
              {block.subtitle}
            </div>
          ) : null}
        </div>

        {block.ring ? (
          <div className="hidden sm:block shrink-0">
            <CapacityRing {...block.ring} />
          </div>
        ) : null}
      </div>

      {stats.length ? (
        <div
          className={cn(
            "grid gap-x-8 gap-y-3 mt-7 pt-6 border-t border-canvas/10",
            stats.length >= 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2",
          )}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-eyebrow text-canvas/55">{stat.label}</div>
              <MetricValue
                metric={stat.metric}
                size="md"
                className={cn("mt-2", stat.accent ? "text-violet" : "text-canvas")}
                affixClassName={
                  stat.accent ? "text-canvas/70" : "text-canvas/55"
                }
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Ring drops below the stats on a phone rather than competing with
          the title for the same row. */}
      {block.ring ? (
        <div className="sm:hidden mt-6 flex justify-center">
          <CapacityRing {...block.ring} size={140} />
        </div>
      ) : null}

      {block.footnote ? (
        <div className="mt-7 pt-5 border-t border-canvas/10 flex items-center gap-4 flex-wrap">
          <p className="text-meta text-canvas/75 leading-relaxed flex-1 min-w-[240px]">
            {block.footnote.text}
          </p>
          {block.footnote.badge ? (
            <span
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-meta font-semibold"
              style={{
                background: "var(--color-violet-soft)",
                color: "var(--color-violet-deep)",
              }}
            >
              {block.footnote.badge.label}
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
