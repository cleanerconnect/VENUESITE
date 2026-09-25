"use client";

import { Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AudiencesEmptyState } from "@/lib/types/analytics";

export function LockedAudiences({
  emptyState,
}: {
  emptyState: AudiencesEmptyState;
}) {
  const pct = Math.round(
    (emptyState.currentBookings / emptyState.unlockThreshold) * 100,
  );
  return (
    <div className="max-w-3xl mx-auto py-10 md:py-16">
      <div className="text-center mb-10">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-soft mb-5"
        >
          <Lock size={20} strokeWidth={1.8} className="text-violet-deep" />
        </span>
        <h1
          className="text-ink"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(34px, 4.5vw, 48px)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {/* Not "en construction" — the feature is built; this
              account has not reached the threshold that makes the
              analysis meaningful yet. The old wording read as
              "we haven't shipped this". */}
          Vos audiences se constituent.
        </h1>
        <p className="text-body text-ink-soft mt-4 max-w-lg mx-auto leading-relaxed">
          Vos audiences se débloquent à partir de{" "}
          <span className="font-semibold text-ink num">
            {emptyState.unlockThreshold}
          </span>{" "}
          réservations confirmées. Vous êtes à{" "}
          <span className="font-semibold text-ink num">
            {emptyState.currentBookings} / {emptyState.unlockThreshold}
          </span>
          .
        </p>

        {/* Progress bar */}
        <div className="mt-7 max-w-md mx-auto">
          <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between mt-2 text-meta num">
            <span className="text-ink-soft">
              {emptyState.currentBookings} réservations
            </span>
            <span className="text-violet-deep font-semibold">{pct} %</span>
          </div>
        </div>
      </div>

      {/* Categories preview */}
      <Card variant="surface" size="md">
        <div className="text-eyebrow text-ink-mute mb-4">
          Catégories qui se peupleront
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {emptyState.upcomingCategories.map((cat, idx) => (
            <div key={cat.name} className="flex gap-3">
              <span
                aria-hidden
                className="text-ink-mute mt-0.5 shrink-0 num"
                style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink">
                  {cat.name}
                </div>
                <p className="text-meta text-ink-soft mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
