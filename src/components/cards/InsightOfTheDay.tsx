"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getInsightOfTheDay } from "@/lib/mock/insights";

// Reads from the shared insight engine (lib/mock/insights.ts) so this
// card and the Analyses tab callouts stay coherent. Rotation is keyed
// off the current hour and stays SSR-stable for the same render.
export function InsightOfTheDay() {
  const insight = useMemo(() => getInsightOfTheDay(), []);

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
