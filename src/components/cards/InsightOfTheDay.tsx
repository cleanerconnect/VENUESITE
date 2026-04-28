"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

// One AI-generated observation per page load. In production this is a
// daily-rotating, organizer-scoped query against the analytics warehouse.
// For demo we hardcode three plausible variants and let the page pick one
// at hydration time.
const INSIGHTS = [
  {
    body: "Vos acheteurs Pass Semaine 1 ont 73 % de chance d'acheter aussi un Pass Week-End 2. Pensez à leur proposer le bundle au moment du checkout.",
    accent: "73 %",
  },
  {
    body: "Les ventes 19h-22h représentent 64 % de votre revenu quotidien, et la conversion y est 2,3× supérieure. Concentrer vos boosts sur ce créneau ferait baisser votre CPA.",
    accent: "2,3×",
  },
  {
    body: "L'audience Rabat-Salé est encore peu sollicitée (12 % de votre base) mais convertit à 4,1 % vs 3,2 % en moyenne. Un boost géolocalisé pourrait y libérer un segment latent.",
    accent: "4,1 %",
  },
] as const;

export function InsightOfTheDay() {
  // Rotate by current hour so the card visibly varies between sessions
  // without being randomly different per render (which would cause SSR
  // hydration mismatch).
  const insight = useMemo(() => {
    const idx = new Date().getHours() % INSIGHTS.length;
    return INSIGHTS[idx];
  }, []);

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
