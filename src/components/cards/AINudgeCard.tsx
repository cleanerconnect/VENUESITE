import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

// Forward-looking AI suggestion. Lives directly under the Tonight card.
// gold-soft surface so it reads as a calm hint, not an alert.
export function AINudgeCard() {
  return (
    <Card variant="gold-soft" size="md">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="h-9 w-9 rounded-[12px] bg-surface/70 flex items-center justify-center shrink-0"
        >
          <Sparkles size={16} strokeWidth={1.8} className="text-gold-deep" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-eyebrow text-ink-soft">Suggestion</div>
          <div className="text-[14px] text-ink mt-2 leading-relaxed">
            <span className="font-semibold">Pic à 22h prévu.</span>{" "}
            <span className="text-ink-soft">
              La conversion est 18 % au-dessus de votre moyenne — pensez à
              publier une story Instagram d'ici 30 minutes.
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="text-meta font-bold uppercase tracking-[0.08em] text-ink hover:text-gold-deep transition-colors">
              Préparer la story →
            </button>
            <button className="text-meta font-medium text-ink-mute hover:text-ink transition-colors">
              Ignorer
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
