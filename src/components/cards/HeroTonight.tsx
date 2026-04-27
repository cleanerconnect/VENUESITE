"use client";

import { Card } from "@/components/ui/Card";
import { CapacityRing } from "./CapacityRing";
import { LivePulse } from "@/components/motion/LivePulse";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { formatDateTimeFR } from "@/lib/utils/format";
import type { OverviewData } from "@/lib/types/domain";

// Dark hero card — used once per screen. Capacity ring + tonight's live
// data. The AI nudge is now its own card beneath this one (per direction
// review): live status and forward-looking suggestions are different
// cognitive registers and shouldn't share a surface.
export function HeroTonight({ data }: { data: OverviewData["tonight"] }) {
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
