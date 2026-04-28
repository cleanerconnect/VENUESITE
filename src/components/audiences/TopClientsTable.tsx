"use client";

import { ChevronRight, Lock } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { formatMAD } from "@/lib/utils/format";
import type { TopClient } from "@/lib/types/analytics";

const TIER_TONE: Record<TopClient["lifetimeTier"], "violet" | "info" | "neutral"> = {
  vip: "violet",
  regular: "info",
  casual: "neutral",
};

const TIER_LABEL: Record<TopClient["lifetimeTier"], string> = {
  vip: "VIP",
  regular: "Régulier",
  casual: "Casual",
};

export function TopClientsTable({
  clients,
  onSelect,
}: {
  clients: TopClient[];
  onSelect: (client: TopClient) => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-eyebrow text-ink-mute text-left border-y border-line-soft">
              <th className="px-4 py-3 font-semibold w-12">#</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Ville</th>
              <th className="px-4 py-3 font-semibold hidden lg:table-cell">Segment</th>
              <th className="px-4 py-3 font-semibold text-right">Événements</th>
              <th className="px-4 py-3 font-semibold text-right">LTV</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {clients.map((c, idx) => (
              <tr
                key={c.initials + idx}
                className="border-b border-line-soft last:border-0 hover:bg-canvas-2/60 cursor-pointer transition-colors"
                onClick={() => onSelect(c)}
              >
                <td className="px-4 py-3.5 num text-ink-mute font-semibold">
                  {String(idx + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-9 w-9 rounded-full bg-violet-soft text-violet-deep font-semibold flex items-center justify-center text-[12px] shrink-0 num"
                    >
                      {c.initials.split(".")[0].trim()}
                    </span>
                    <div>
                      <div className="font-semibold text-ink num">
                        {c.initials}
                      </div>
                      <div className="md:hidden text-meta text-ink-soft mt-0.5">
                        {c.city}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell text-ink-soft">
                  {c.city}
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <Pill tone={TIER_TONE[c.lifetimeTier]}>
                    {TIER_LABEL[c.lifetimeTier]} · {c.segment}
                  </Pill>
                </td>
                <td className="px-4 py-3.5 num text-right font-bold text-ink">
                  {c.eventsAttended}
                </td>
                <td className="px-4 py-3.5 num text-right font-bold text-ink">
                  {formatMAD(c.totalSpentMad)}
                </td>
                <td className="px-4 py-3.5 text-ink-mute">
                  <ChevronRight size={14} strokeWidth={1.8} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CNDP disclosure footer */}
      <div className="mt-4 flex items-start gap-2 text-meta text-ink-mute leading-relaxed">
        <Lock size={11} strokeWidth={1.9} className="mt-0.5 shrink-0" />
        <p>
          Données affichées en initiales conformément à la déclaration CNDP
          n° A-PO-23/2024. Le nom complet n&apos;est visible qu&apos;au sein
          de votre équipe propriétaire et reste dans l&apos;Union européenne
          / Maroc selon les exigences du transfert transfrontalier.
        </p>
      </div>
    </div>
  );
}
