"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Megaphone, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

// Horizontal swipeable stack of AI suggestions. Scroll-snap drives the
// swipe motion, dots below indicate position. X dismisses. Tap on the
// CTA fires the action — boost wizard launch, navigation, etc.

interface Nudge {
  id: string;
  eyebrow: string;
  body: React.ReactNode;
  ctaLabel: string;
  /** When set, navigate. */
  ctaHref?: string;
  /** When set, fire the toast on click (boost-wizard placeholder). */
  ctaToast?: string;
}

const NUDGES: Nudge[] = [
  {
    id: "nudge_pic_22h",
    eyebrow: "Suggestion",
    body: (
      <>
        <span className="font-semibold">Pic à 22h prévu.</span>{" "}
        <span className="text-ink-soft">
          Un Splash de bienvenue ce soir 19h-23h capterait ≈ 1 200 billets
          supplémentaires sur l&apos;audience Festivaliers Casa 25-35.
          Coût estimé : 4 500 MAD.
        </span>
      </>
    ),
    ctaLabel: "Lancer le boost",
    ctaToast: "Wizard boost ouvert · audience Festivaliers Casa 25-35 pré-sélectionnée",
  },
  {
    id: "nudge_segment_loyalty",
    eyebrow: "Audience",
    body: (
      <>
        <span className="font-semibold">5,2× la conversion moyenne.</span>{" "}
        <span className="text-ink-soft">
          Le segment « Anciens acheteurs Jazzablanca » convertit massivement.
          Un retargeting ciblé pourrait sécuriser 800 ventes additionnelles.
        </span>
      </>
    ),
    ctaLabel: "Voir le segment",
    ctaHref: "/audiences",
  },
  {
    id: "nudge_funnel_payzone",
    eyebrow: "Friction",
    body: (
      <>
        <span className="font-semibold">38 % d&apos;abandons mobile à l&apos;étape Payzone.</span>{" "}
        <span className="text-ink-soft">
          Coût opportunité estimé : 240 000 MAD sur la fenêtre Phase 2.
          À traiter en priorité.
        </span>
      </>
    ),
    ctaLabel: "Voir le tunnel",
    ctaHref: "/events/evt_jzb_robbie?tab=analyses",
  },
];

export function MobileNudgeStack() {
  const router = useRouter();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const visible = NUDGES.filter((n) => !dismissed.has(n.id));

  // Track which card is centered as the user scrolls.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const childWidth = el.clientWidth;
      if (!childWidth) return;
      const idx = Math.round(el.scrollLeft / childWidth);
      setActiveIdx(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [visible.length]);

  if (visible.length === 0) return null;

  const handleAct = (n: Nudge) => {
    if (n.ctaHref) {
      router.push(n.ctaHref);
    } else if (n.ctaToast) {
      toast({ tone: "success", title: n.ctaToast });
    }
  };

  return (
    <div>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-thin -mx-4 px-4 pb-1"
        aria-label="Suggestions LYFE"
      >
        {visible.map((n) => (
          <div
            key={n.id}
            className="snap-center shrink-0 w-[calc(100%-1rem)] first:ml-0"
          >
            <Card variant="violet-soft" size="md" className="relative">
              <button
                type="button"
                onClick={() =>
                  setDismissed((s) => {
                    const next = new Set(s);
                    next.add(n.id);
                    return next;
                  })
                }
                aria-label="Ignorer cette suggestion"
                className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-canvas/40 flex items-center justify-center text-violet-deep transition-colors"
              >
                <X size={14} strokeWidth={1.9} />
              </button>
              <div className="flex items-start gap-3 pr-8">
                <span
                  aria-hidden
                  className="h-9 w-9 rounded-[10px] bg-canvas/60 flex items-center justify-center shrink-0"
                >
                  <Sparkles size={16} strokeWidth={1.7} className="text-violet-deep" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-eyebrow text-violet-deep">
                    {n.eyebrow}
                  </div>
                  <div className="text-[14px] text-ink mt-2 leading-relaxed">
                    {n.body}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAct(n)}
                    className="mt-3 inline-flex items-center gap-1 text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink transition-colors"
                  >
                    {n.ctaLabel}
                    <ArrowRight size={11} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {visible.length > 1 ? (
        <div
          className="flex items-center justify-center gap-1.5 mt-3"
          role="tablist"
          aria-label="Suggestion active"
        >
          {visible.map((n, idx) => (
            <span
              key={n.id}
              aria-hidden
              className={
                "h-1.5 rounded-full transition-all " +
                (idx === activeIdx
                  ? "w-5 bg-violet"
                  : "w-1.5 bg-ink/15")
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
