"use client";

import { Card } from "@/components/ui/Card";
import { CapacityRing } from "./CapacityRing";
import { LivePulse } from "@/components/motion/LivePulse";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { formatMAD, formatDateTimeFR } from "@/lib/utils/format";
import type { OverviewData } from "@/lib/types/domain";
import { Sparkles } from "lucide-react";

// Dark hero card — used once per screen. Capacity ring + tonight's live
// data + AI nudge. Gets the radial gold + cool blue glow stack.
export function HeroTonight({
  data,
}: {
  data: OverviewData["tonight"];
}) {
  return (
    <Card variant="ink" size="hero" glow className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <LivePulse label="EN COURS · CE SOIR" />
          <h2 className="text-h2 text-canvas mt-3 max-w-xs">
            {data.eventName}
          </h2>
          <div className="text-meta text-canvas/60 mt-1 num">
            {formatDateTimeFR(data.eventStartsAt)}
          </div>
        </div>
        <div className="hidden sm:block">
          <CapacityRing value={data.soldTickets} max={data.capacity} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-7 pt-6 border-t border-canvas/10">
        <div>
          <div className="text-eyebrow text-canvas/55">Encaissé ce soir</div>
          <div className="text-h1 text-gold mt-2 num">
            <AnimatedNumber value={data.revenueMad} />
            <span className="text-canvas/70 text-h3 font-semibold ml-1.5">
              MAD
            </span>
          </div>
        </div>
        <div>
          <div className="text-eyebrow text-canvas/55">Billets vendus</div>
          <div className="text-h1 text-canvas mt-2 num">
            <AnimatedNumber value={data.soldTickets} />
            <span className="text-canvas/55 text-h3 font-semibold ml-1.5">
              / {data.capacity}
            </span>
          </div>
        </div>
      </div>

      {/* AI nudge — feels native, not bolted on */}
      <div
        className="mt-6 flex items-start gap-3 rounded-[var(--radius-md)] p-3.5"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <span
          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(201,166,76,0.20)" }}
        >
          <Sparkles size={14} strokeWidth={1.8} className="text-gold" />
        </span>
        <div className="text-[13px] text-canvas/85 leading-relaxed">
          <span className="font-semibold text-canvas">Pic à 22h prévu.</span>{" "}
          La conversion est 18 % au-dessus de votre moyenne — pensez à publier
          un story Instagram d'ici 30 min.
        </div>
      </div>

      {/* Mobile-only ring below */}
      <div className="sm:hidden mt-6 flex justify-center">
        <CapacityRing
          value={data.soldTickets}
          max={data.capacity}
          size={140}
        />
      </div>
    </Card>
  );
}
