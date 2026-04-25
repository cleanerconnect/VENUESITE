"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const STEPS = [
  { name: "Informations", short: "Infos" },
  { name: "Tarifs", short: "Tarifs" },
  { name: "Remboursements", short: "Refunds" },
  { name: "Médias", short: "Médias" },
  { name: "Récapitulatif", short: "Récap" },
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
      <header className="sticky top-0 z-20 bg-bg/85 backdrop-blur-md border-b border-line">
        <div className="px-4 md:px-8 max-w-content mx-auto">
          <div className="h-[58px] flex items-center justify-between">
            <div>
              <div className="eyebrow text-muted-2 leading-none mb-1">
                Création d'événement
              </div>
              <div className="h-display text-[15px] text-ink leading-none">
                Étape {step} sur 5 — {STEPS[step - 1].name}
              </div>
            </div>
            <Link
              href="/events"
              className="text-[12px] font-medium text-muted hover:text-ink transition-colors"
            >
              Enregistrer & quitter
            </Link>
          </div>

          {/* Step pills */}
          <div className="pb-4">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => {
                const idx = i + 1;
                const reached = idx <= step;
                const active = idx === step;
                return (
                  <div key={s.name} className="flex-1 flex items-center gap-2">
                    <div className="flex-1">
                      <div
                        className="h-[3px] rounded-full transition-colors duration-300"
                        style={{
                          background: reached
                            ? "linear-gradient(90deg,#1a1a1a,#0f0f0f)"
                            : "#E8E1CE",
                        }}
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className={[
                            "inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold transition-all duration-200",
                            reached
                              ? "bg-ink text-white"
                              : "bg-line text-muted-2",
                          ].join(" ")}
                        >
                          {reached && !active ? (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path
                                d="m2 4 1.5 1.5L6 2.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            idx
                          )}
                        </span>
                        <span
                          className={[
                            "text-[11px] font-medium hidden sm:block",
                            active ? "text-ink" : "text-muted-2",
                          ].join(" ")}
                        >
                          {s.short}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-7 md:py-12 max-w-3xl mx-auto pb-32 fade-up">
        {children}
      </div>

      <footer className="fixed bottom-0 inset-x-0 md:left-[248px] bg-surface/95 backdrop-blur-md border-t border-line z-20">
        <div className="px-4 md:px-8 max-w-content mx-auto h-[68px] flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={!onBack}
            className="text-[13px] font-medium text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 4 5 7l4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
          <div className="flex items-center gap-4">
            <span
              className={[
                "text-[12px] hidden sm:flex items-center gap-1.5 transition-opacity",
                saving ? "text-muted opacity-100" : "text-success opacity-90",
              ].join(" ")}
            >
              {saving ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning animate-pulse-soft" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="m3 6.5 2 2 4-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Brouillon enregistré
                </>
              )}
            </span>
            {onNext ? (
              <button
                onClick={onNext}
                disabled={nextDisabled}
                className="h-11 px-6 bg-gradient-to-b from-[#1a1a1a] to-ink text-white text-[13px] font-medium rounded-md shadow-xs hover:from-[#2a2a2a] disabled:opacity-50 transition-all"
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
