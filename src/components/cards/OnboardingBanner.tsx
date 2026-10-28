"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/auth/role";
import { useOnboardingCompleted, readDraft } from "@/lib/auth/onboarding";

// Soft gate at the top of /dashboard, for an organisation whose
// configuration is **started and unfinished**.
//
// It used to render on « incomplete » alone, which is the state every
// seeded demo organisation is in — so the first thing a partner saw on
// the event dashboard was « Continuer la configuration · Configurez
// votre espace », inviting them to resume something they had never
// begun. A banner that says *continue* to someone who has not started
// is a banner that makes the dashboard look broken on arrival.
//
// So it needs a draft: `lastStep > 0`, meaning the wizard was walked at
// least one step and left. Then « Étape 3 / 5 validée · Reprendre »
// reads as what it is, progress with a way back to it. With no draft
// there is nothing to continue, and the way in to the wizard is the
// chooser's « Ajouter » card — which is where adding a space belongs.
export function OnboardingBanner() {
  const profile = useProfile();
  const completed = useOnboardingCompleted(profile?.id ?? null);

  if (!profile || completed === null || completed) return null;

  // How far they got — and whether they got anywhere at all.
  const draft = readDraft(profile.id);
  const stepDone = draft.lastStep ?? 0;
  if (stepDone < 1) return null;

  return (
    <Link
      href="/onboarding"
      className="block bg-violet-soft hover:bg-violet-soft/80 transition-colors rounded-[var(--radius-lg)] p-4 md:p-5 mb-4 md:mb-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="h-9 w-9 rounded-[10px] bg-canvas/60 flex items-center justify-center shrink-0"
        >
          <Sparkles size={16} strokeWidth={1.7} className="text-violet-deep" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-eyebrow text-violet-deep">
            Continuer la configuration
          </div>
          <p className="text-[14px] text-ink mt-1.5 leading-relaxed">
            <span className="font-semibold">
              Étape {stepDone} / 5 validée.
            </span>{" "}
            <span className="text-ink-soft">
              Reprenez la configuration pour pouvoir créer votre premier
              événement.
            </span>
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-meta font-bold uppercase tracking-[0.08em] text-violet-deep mt-1.5">
          Reprendre
          <ArrowRight size={11} strokeWidth={2.2} />
        </span>
      </div>
    </Link>
  );
}
