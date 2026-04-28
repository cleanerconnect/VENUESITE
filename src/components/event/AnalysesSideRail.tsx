"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  getInsightsForSurface,
} from "@/lib/mock/insights";
import type {
  Insight,
  InsightSurface,
  Recommendation,
} from "@/lib/types/analytics";

const ANALYSES_SURFACES: InsightSurface[] = [
  "analyses_phase",
  "analyses_pace",
  "analyses_funnel",
  "analyses_reviews",
];

const RECO_TONE: Record<
  Recommendation["tone"],
  { bg: string; text: string }
> = {
  violet: {
    bg: "bg-violet-soft",
    text: "text-violet-deep",
  },
  warning: {
    bg: "bg-tint-peach",
    text: "text-warning",
  },
  success: {
    bg: "bg-tint-sage",
    text: "text-success",
  },
};

export function AnalysesSideRail({
  eventId,
  recommendations,
}: {
  eventId: string;
  recommendations: Recommendation[];
}) {
  const insights = ANALYSES_SURFACES.flatMap((surface) =>
    getInsightsForSurface(surface, eventId),
  );

  return (
    <aside className="space-y-5 lg:sticky lg:top-6">
      {/* === Insights panel === */}
      <Card variant="violet-soft" size="md">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} strokeWidth={1.8} className="text-violet-deep" />
          <span className="text-eyebrow text-violet-deep">
            Lectures de LYFE
          </span>
        </div>
        {insights.length > 0 ? (
          <ul className="space-y-4">
            {insights.map((ins) => (
              <InsightRow key={ins.id} insight={ins} />
            ))}
          </ul>
        ) : (
          <p className="text-meta text-ink-soft leading-relaxed">
            Pas encore d'observation à surfacer pour cet événement.
          </p>
        )}
      </Card>

      {/* === Recommendations panel === */}
      {recommendations.length > 0 ? (
        <Card variant="surface" size="md">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={14} strokeWidth={1.8} className="text-violet" />
            <span className="text-eyebrow text-violet-deep">
              Prochaines étapes
            </span>
          </div>
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationRow key={rec.id} reco={rec} />
            ))}
          </ul>
        </Card>
      ) : null}
    </aside>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <li className="text-[13px] leading-relaxed text-ink">
      <p>{insight.body}</p>
      {insight.cta ? (
        <Link
          href={insight.cta.href}
          className="inline-flex items-center gap-1 mt-1.5 text-meta font-semibold text-violet-deep hover:text-ink transition-colors"
        >
          {insight.cta.label}
          <ArrowRight size={11} strokeWidth={2.2} />
        </Link>
      ) : null}
    </li>
  );
}

function RecommendationRow({ reco }: { reco: Recommendation }) {
  const tone = RECO_TONE[reco.tone];
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    reco.ctaHref ? (
      <Link
        href={reco.ctaHref}
        className="block rounded-[var(--radius-md)] hover:bg-canvas-2/60 transition-colors -mx-2 px-2 py-2"
      >
        {children}
      </Link>
    ) : (
      <div className="-mx-2 px-2 py-2">{children}</div>
    );

  return (
    <li>
      <Wrapper>
        <p className="text-[13px] leading-relaxed text-ink">{reco.body}</p>
        <span
          className={`inline-flex items-center gap-1 mt-1.5 text-meta font-semibold ${tone.text}`}
        >
          {reco.ctaLabel}
          {reco.ctaHref ? (
            <ArrowRight size={11} strokeWidth={2.2} />
          ) : null}
        </span>
      </Wrapper>
    </li>
  );
}
