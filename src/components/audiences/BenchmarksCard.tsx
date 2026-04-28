"use client";

import { Card } from "@/components/ui/Card";
import type { BenchmarkRow } from "@/lib/types/analytics";

export function BenchmarksCard({ rows }: { rows: BenchmarkRow[] }) {
  return (
    <Card variant="surface" size="md">
      <div className="mb-4">
        <h3 className="text-h3 text-ink">Benchmarks plateforme</h3>
        <p className="text-meta text-ink-soft mt-1">
          Vous · médiane LYFE toutes catégories confondues
        </p>
      </div>
      <ul className="divide-y divide-line-soft">
        {rows.map((row) => (
          <li
            key={row.metric}
            className="grid grid-cols-[1fr_auto] gap-3 py-3.5"
          >
            <div className="min-w-0">
              <div className="text-[13.5px] text-ink leading-snug">
                {row.metric}
              </div>
              <div className="text-meta text-ink-mute num mt-1">
                Vous {row.yourValue} · médiane {row.platformMedian}
              </div>
            </div>
            <span
              className={
                "shrink-0 inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] num " +
                (row.favorable
                  ? "bg-tint-sage text-success"
                  : "bg-tint-peach text-warning")
              }
            >
              {row.deltaLabel}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
