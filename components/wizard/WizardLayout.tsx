"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const STEPS = [
  "Informations",
  "Tarifs",
  "Remboursements",
  "Médias",
  "Récapitulatif",
];

export function WizardLayout({
  step,
  children,
  saving,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  step: number;
  children: ReactNode;
  saving: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-line">
        <div className="px-4 md:px-8 max-w-content mx-auto">
          <div className="h-14 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-badge text-muted">
                Création d'événement
              </div>
              <div className="h-serif text-base text-ink leading-none mt-0.5">
                Étape {step} sur 5 — {STEPS[step - 1]}
              </div>
            </div>
            <Link
              href="/events"
              className="text-xs uppercase tracking-badge text-muted hover:text-ink"
            >
              Enregistrer & quitter
            </Link>
          </div>

          {/* Progress bar */}
          <div className="pb-3">
            <div className="grid grid-cols-5 gap-1">
              {STEPS.map((label, i) => {
                const reached = i + 1 <= step;
                return (
                  <div
                    key={label}
                    className="h-1 transition-colors"
                    style={{ backgroundColor: reached ? "#0F0F0F" : "#E0DAC7" }}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-badge text-muted mt-2">
              {STEPS.map((label, i) => (
                <span
                  key={label}
                  className={i + 1 === step ? "text-ink font-medium" : ""}
                >
                  {i + 1}. {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto pb-32">
        {children}
      </div>

      <footer className="fixed bottom-0 inset-x-0 md:left-60 bg-surface border-t border-line z-20">
        <div className="px-4 md:px-8 max-w-content mx-auto h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={!onBack}
            className="text-sm text-muted hover:text-ink disabled:opacity-30"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:block">
              {saving ? "Enregistrement…" : "Brouillon enregistré"}
            </span>
            {onNext ? (
              <button
                onClick={onNext}
                disabled={nextDisabled}
                className="h-11 px-6 bg-ink text-white text-sm hover:bg-ink/90 disabled:bg-ink/50"
              >
                {nextLabel ?? "Continuer"}
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
