"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/auth/role";
import { useOnboardingCompleted, readDraft } from "@/lib/auth/onboarding";

// Soft gate at the top of /dashboard for first-time orgs. Renders
// only when the active profile's onboarding is incomplete. Once the
// wizard finishes, the banner disappears and the dashboard reads
// normally for the rest of the session.
export function OnboardingBanner() {
  const profile = useProfile();
  const completed = useOnboardingCompleted(profile?.id ?? null);

  if (!profile || completed === null || completed) return null;

  // Show the user how far they got so the resume call-to-action
  // reads like progress rather than a chore.
  const draft = readDraft(profile.id);
  const stepDone = draft.lastStep ?? 0;

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
              {stepDone === 0
                ? "Configurez votre espace"
                : `Étape ${stepDone} / 5 validée`}
              .
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
