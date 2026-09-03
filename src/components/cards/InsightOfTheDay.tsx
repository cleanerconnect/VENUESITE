"use client";

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Insight } from "@/lib/types/analytics";

// Presentational. The insight is read by whoever renders this card, so
// the same component serves the dashboard, the styleguide and any
// future surface without knowing where insights come from.
export function InsightOfTheDay({ insight }: { insight: Insight }) {

  return (
    <Card variant="violet-soft" size="md" className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} strokeWidth={1.8} className="text-violet-deep" />
        <span className="text-eyebrow text-violet-deep">
          L&apos;insight du jour
        </span>
      </div>
      <p className="text-[14px] text-ink leading-relaxed">{insight.body}</p>
    </Card>
  );
}
