"use client";

import { Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ReviewSummary } from "@/lib/types/analytics";

export function ReviewsSummaryCard({
  summary,
}: {
  summary: ReviewSummary | null;
}) {
  if (!summary || summary.reviewCount === 0) {
    return (
      <Card variant="surface" size="md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-h3 text-ink">Avis & sentiment</h3>
            <p className="text-meta text-ink-soft mt-1">
              Synthèse qualitative · agrégée sur la série
            </p>
          </div>
        </div>
        <EmptyState
          title="Pas encore d'avis."
          description="Les avis apparaîtront après le premier événement de cette série."
        />
      </Card>
    );
  }

  // Total used to scale distribution bars.
  const total = summary.distribution.reduce((s, n) => s + n, 0);

  return (
    <Card variant="surface" size="md">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-h3 text-ink">Avis & sentiment</h3>
          <p className="text-meta text-ink-soft mt-1">
            Synthèse qualitative · agrégée sur la série
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Star
            size={20}
            strokeWidth={1.6}
            className="text-violet-deep fill-violet-deep"
          />
          <span
            className="text-violet-deep num"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "28px",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {summary.averageRating.toFixed(1).replace(".", ",")}
          </span>
          <span className="text-meta text-ink-soft num ml-1.5">
            sur {summary.reviewCount}
          </span>
        </div>
      </div>

      {/* 5-bar histogram */}
      <div className="space-y-1.5 mb-5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.distribution[stars - 1] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={stars} className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-ink-mute w-6 num">
                {stars}★
              </span>
              <div className="flex-1 h-2 bg-canvas-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-meta text-ink-soft num w-10 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-line-soft">
        <div>
          <div className="text-eyebrow text-success mb-2">
            Mentions positives
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.positiveTags.map((tag) => (
              <span
                key={tag.name}
                className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11.5px] font-medium bg-tint-sage text-success"
              >
                {tag.name}
                <span className="text-success/70 num">{tag.count}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-eyebrow text-warning mb-2">
            À surveiller
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.improvementTags.length > 0 ? (
              summary.improvementTags.map((tag) => (
                <span
                  key={tag.name}
                  className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11.5px] font-medium bg-tint-peach text-warning"
                >
                  {tag.name}
                  <span className="text-warning/70 num">{tag.count}</span>
                </span>
              ))
            ) : (
              <span className="text-meta text-ink-mute">
                Aucune mention récurrente.
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
