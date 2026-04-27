"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  { name: "Infos", full: "Infos" },
  { name: "Tarifs", full: "Tarifs" },
  { name: "Refunds", full: "Remboursements" },
  { name: "Médias", full: "Médias" },
  { name: "Récap", full: "Récapitulatif" },
];

export function WizardLayout({
  step,
  setStep,
  visited,
  saving,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  children,
  wide = false,
}: {
  step: number;
  setStep: (n: number) => void;
  visited: number; // highest step reached, controls click-back behaviour
  saving: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="-mx-4 md:-mx-8 -mt-6 md:-mt-8">
      {/* === Sticky progress header === */}
      <header className="sticky top-[72px] z-10 bg-canvas/85 backdrop-blur-md border-b border-line-soft">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-6">
          <Link
            href="/events"
            className="text-meta font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            ← Retour aux événements
          </Link>
          <div
            className={cn(
              "flex items-center gap-1.5 text-meta",
              saving ? "text-ink-soft" : "text-success",
            )}
          >
            {saving ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="inline-flex"
                >
                  <RefreshCw size={12} strokeWidth={2} />
                </motion.span>
                Enregistrement…
              </>
            ) : (
              <>
                <Check size={12} strokeWidth={2.4} />
                Brouillon enregistré
              </>
            )}
          </div>
        </div>

        {/* Segment bar */}
        <div className="max-w-[1240px] mx-auto px-4 md:px-8 pb-4">
          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((s, i) => {
              const idx = i + 1;
              const reached = idx <= visited;
              const current = idx === step;
              const fillColor = current
                ? "var(--color-violet)"
                : reached
                  ? "var(--color-ink)"
                  : "var(--color-line)";
              const canClick = reached;
              return (
                <button
                  key={s.name}
                  onClick={() => canClick && setStep(idx)}
                  disabled={!canClick}
                  className={cn(
                    "text-left",
                    canClick ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  <div
                    className="h-1 rounded-full transition-colors"
                    style={{ background: fillColor }}
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold transition-colors",
                        current
                          ? "bg-violet text-canvas"
                          : reached
                            ? "bg-ink text-canvas"
                            : "bg-line text-ink-mute",
                      )}
                    >
                      {reached && !current ? (
                        <Check size={9} strokeWidth={3} />
                      ) : (
                        idx
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-[0.06em]",
                        current
                          ? "text-ink"
                          : reached
                            ? "text-ink-soft"
                            : "text-ink-mute",
                      )}
                    >
                      <span className="hidden sm:inline">{s.full}</span>
                      <span className="sm:hidden">{s.name}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto px-4 md:px-8 py-8 md:py-12 pb-32",
          wide ? "max-w-[1240px]" : "max-w-[760px]",
        )}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>

      {/* === Footer with Back / Next === */}
      <footer className="fixed bottom-0 inset-x-0 md:left-[260px] z-30 bg-canvas/95 backdrop-blur-md border-t border-line-soft">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8 h-[72px] flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={!onBack}
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Retour
          </button>
          {onNext ? (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className="inline-flex items-center gap-2 h-12 px-6 bg-violet text-canvas rounded-[var(--radius-sm)] text-[14px] font-bold hover:bg-violet-deep disabled:bg-violet/40 disabled:cursor-not-allowed transition-colors"
            >
              {nextLabel ?? "Continuer"}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
