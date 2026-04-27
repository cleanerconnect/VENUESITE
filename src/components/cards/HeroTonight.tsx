"use client";

import { Card } from "@/components/ui/Card";
import { CapacityRing } from "./CapacityRing";
import { LivePulse } from "@/components/motion/LivePulse";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { formatDateTimeFR } from "@/lib/utils/format";
import type { OverviewData } from "@/lib/types/domain";

// Headline event card, single per screen. Two modes:
// - "live": tonight's event with live capacity ring + revenue counter
// - "preparing": festival-scale event, J-N countdown, phase progression
//   ring, consolidated revenue + phase sales counter
//
// AI nudge has been moved out of this card per the previous direction
// review (lives in its own violet-soft sub-card beneath).
export function HeroTonight({ data }: { data: OverviewData["headline"] }) {
  if (data.mode === "preparing") {
    return <PreparingHero data={data} />;
  }
  return <LiveHero data={data} />;
}

function PreparingHero({
  data,
}: {
  data: Extract<OverviewData["headline"], { mode: "preparing" }>;
}) {
  return (
    <Card variant="ink" size="hero" glow className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-violet"
            />
            <span className="text-eyebrow text-canvas/65">
              EN PRÉPARATION · J-{data.daysUntil}
            </span>
          </div>
          <h2 className="text-h2 text-canvas mt-3 max-w-xs">
            {data.eventName}
          </h2>
          <div className="text-meta text-canvas/60 mt-1 num">
            {data.dateRangeLabel}
          </div>
        </div>
        <div className="hidden sm:block">
          <CapacityRing
            progress={data.phaseProgress}
            topLabel={`Phase ${data.phaseCurrent} sur ${data.phaseTotal}`}
            centerLabel={`${Math.round(data.phaseProgress * 100)}%`}
            bottomLabel="Pass écoulés"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-7 pt-6 border-t border-canvas/10">
        <div>
          <div className="text-eyebrow text-canvas/55">
            {data.salesPhaseLabel}
          </div>
          <div className="text-h1 text-canvas mt-2 num">
            <AnimatedNumber value={data.salesPhaseValue} />
            <span className="text-canvas/55 text-h3 font-semibold ml-1.5">
              pass
            </span>
          </div>
        </div>
        <div>
          <div className="text-eyebrow text-canvas/55">
            {data.consolidatedRevenueLabel}
          </div>
          <div className="text-h1 text-violet mt-2 num">
            <AnimatedNumber value={data.consolidatedRevenueMad} />
            <span className="text-canvas/70 text-h3 font-semibold ml-1.5">
              MAD
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-only ring below */}
      <div className="sm:hidden mt-6 flex justify-center">
        <CapacityRing
          progress={data.phaseProgress}
          topLabel={`Phase ${data.phaseCurrent} sur ${data.phaseTotal}`}
          centerLabel={`${Math.round(data.phaseProgress * 100)}%`}
          bottomLabel="Pass écoulés"
          size={140}
        />
      </div>
    </Card>
  );
}

function LiveHero({
  data,
}: {
  data: Extract<OverviewData["headline"], { mode: "live" }>;
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
          <CapacityRing
            progress={data.soldTickets / Math.max(1, data.capacity)}
            topLabel="Couvert ce soir"
            centerLabel={`${Math.round(
              (data.soldTickets / Math.max(1, data.capacity)) * 100,
            )}%`}
            bottomLabel={`${data.soldTickets} / ${data.capacity}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-7 pt-6 border-t border-canvas/10">
        <div>
          <div className="text-eyebrow text-canvas/55">Encaissé ce soir</div>
          <div className="text-h1 text-violet mt-2 num">
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

      <div className="sm:hidden mt-6 flex justify-center">
        <CapacityRing
          progress={data.soldTickets / Math.max(1, data.capacity)}
          topLabel="Couvert ce soir"
          centerLabel={`${Math.round(
            (data.soldTickets / Math.max(1, data.capacity)) * 100,
          )}%`}
          bottomLabel={`${data.soldTickets} / ${data.capacity}`}
          size={140}
        />
      </div>
    </Card>
  );
}
