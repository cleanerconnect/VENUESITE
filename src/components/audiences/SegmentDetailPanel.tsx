"use client";

import { Megaphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "./Drawer";
import type {
  AudienceSegmentDetail,
} from "@/lib/types/analytics";
import type { AudienceSegment } from "@/lib/types/visibility";

const FORMATTER = new Intl.NumberFormat("fr-FR");

export function SegmentDetailPanel({
  segment,
  detail,
  onClose,
  onLaunchBoost,
}: {
  segment: AudienceSegment | null;
  detail: AudienceSegmentDetail | null;
  onClose: () => void;
  onLaunchBoost: (segment: AudienceSegment) => void;
}) {
  return (
    <Drawer
      open={Boolean(segment && detail)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={segment?.name ?? ""}
      description={segment?.description}
      footer={
        segment ? (
          <Button
            fullWidth
            size="lg"
            iconLeft={<Megaphone size={16} strokeWidth={1.8} />}
            onClick={() => onLaunchBoost(segment)}
          >
            Lancer un boost vers ce segment
          </Button>
        ) : null
      }
    >
      {segment && detail ? (
        <div className="space-y-6">
          {/* Quick stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Membres"
              value={FORMATTER.format(segment.memberCount).replace(/ /g, " ")}
            />
            <StatTile
              label="Panier moyen"
              value={detail.averageSpendLabel}
            />
            <StatTile
              label="Conversion"
              value={detail.conversionLiftLabel}
              tone="violet"
            />
            <StatTile
              label="Ville-mère"
              value={detail.topCity}
            />
          </div>

          <div>
            <div className="text-eyebrow text-ink-mute">Intérêt principal</div>
            <p className="text-[14px] text-ink mt-1.5 leading-relaxed">
              {detail.topInterest}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} strokeWidth={1.8} className="text-violet-deep" />
              <span className="text-eyebrow text-violet-deep">
                Lectures de LYFE
              </span>
            </div>
            <ul className="space-y-3">
              {detail.insights.map((line, idx) => (
                <li
                  key={idx}
                  className="text-[13.5px] text-ink leading-relaxed flex gap-2"
                >
                  <span
                    aria-hidden
                    className="text-violet-deep shrink-0 mt-0.5"
                    style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "violet";
}) {
  return (
    <div
      className={
        "rounded-[var(--radius-md)] p-3.5 border " +
        (tone === "violet"
          ? "bg-violet-soft border-violet-soft"
          : "bg-canvas-2 border-line-soft")
      }
    >
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className={
          "num mt-1.5 " +
          (tone === "violet" ? "text-violet-deep" : "text-ink")
        }
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "18px",
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
