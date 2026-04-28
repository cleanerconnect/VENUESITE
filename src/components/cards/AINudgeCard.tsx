"use client";

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BoostWizardLauncher } from "@/components/visibility/BoostWizard";

// AI suggestion card. The recommendation can shift between channels:
// here it surfaces a paid-promotion play because the conversion data
// indicates it's the higher-leverage move tonight. Clicking the primary
// CTA opens the boost wizard pre-filled for that audience.
export function AINudgeCard() {
  return (
    <Card variant="violet-soft" size="md">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="h-9 w-9 rounded-[12px] bg-surface/70 flex items-center justify-center shrink-0"
        >
          <Sparkles size={16} strokeWidth={1.8} className="text-violet-deep" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-eyebrow text-violet-deep">Suggestion</div>
          <div className="text-[14px] text-ink mt-2 leading-relaxed">
            <span className="font-semibold">Pic à 22h prévu.</span>{" "}
            <span className="text-ink-soft">
              Un Splash de bienvenue ce soir 19h-23h capterait ≈ 1 200 billets
              supplémentaires sur l&apos;audience Festivaliers Casa 25-35.
              Coût estimé : 4 500 MAD.
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <BoostWizardLauncher
              initialSegmentId="seg_1"
              className="text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink transition-colors"
            >
              Lancer le boost →
            </BoostWizardLauncher>
            <button className="text-meta font-medium text-ink-mute hover:text-ink transition-colors">
              Ignorer
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
