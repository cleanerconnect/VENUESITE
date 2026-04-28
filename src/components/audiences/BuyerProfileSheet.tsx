"use client";

import { Mail, MapPin, Megaphone, Phone, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Drawer } from "./Drawer";
import { formatDateFR, formatMAD } from "@/lib/utils/format";
import type { BuyerProfile } from "@/lib/types/analytics";

const TIER_LABEL: Record<BuyerProfile["lifetimeTier"], string> = {
  vip: "VIP",
  regular: "Régulier",
  casual: "Casual",
};

const TIER_TONE: Record<
  BuyerProfile["lifetimeTier"],
  "violet" | "info" | "neutral"
> = {
  vip: "violet",
  regular: "info",
  casual: "neutral",
};

export function BuyerProfileSheet({
  buyer,
  onClose,
  onLaunchBoost,
}: {
  buyer: BuyerProfile | null;
  onClose: () => void;
  onLaunchBoost: (buyer: BuyerProfile) => void;
}) {
  return (
    <Drawer
      open={Boolean(buyer)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={buyer?.name ?? ""}
      description={
        buyer
          ? `${buyer.totalEventsAttended} événements · ${formatMAD(
              buyer.totalSpentMad,
            )} dépensés depuis ${formatDateFR(buyer.firstSeenAt)}`
          : undefined
      }
      footer={
        buyer ? (
          <Button
            fullWidth
            size="lg"
            iconLeft={<Megaphone size={16} strokeWidth={1.8} />}
            onClick={() => onLaunchBoost(buyer)}
          >
            Lancer un boost vers ce profil
          </Button>
        ) : null
      }
    >
      {buyer ? (
        <div className="space-y-6">
          {/* Header tier + city */}
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={TIER_TONE[buyer.lifetimeTier]} dot>
              {TIER_LABEL[buyer.lifetimeTier]}
            </Pill>
            <span className="text-meta text-ink-soft inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={1.8} />
              {buyer.city}
            </span>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-meta text-ink">
              <Mail size={13} strokeWidth={1.8} className="text-ink-mute" />
              <span className="num">{buyer.email}</span>
            </div>
            <div className="flex items-center gap-2 text-meta text-ink">
              <Phone size={13} strokeWidth={1.8} className="text-ink-mute" />
              <span className="num">{buyer.phone}</span>
            </div>
          </div>

          {/* LTV stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Événements"
              value={String(buyer.totalEventsAttended)}
            />
            <StatTile
              label="Dépense totale"
              value={formatMAD(buyer.totalSpentMad)}
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Première achat" value={formatDateFR(buyer.firstSeenAt)} />
            <StatTile label="Dernier achat" value={formatDateFR(buyer.lastSeenAt)} />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Tag size={13} strokeWidth={1.8} className="text-violet-deep" />
              <span className="text-eyebrow text-violet-deep">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {buyer.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-medium bg-canvas-2 text-ink-soft"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-3 text-meta text-ink-mute leading-relaxed">
              Tag principal&nbsp;: <span className="text-ink font-semibold">{buyer.primaryTag}</span>
              <br />
              Le boost lancé depuis ce profil ciblera le segment correspondant.
            </div>
          </div>

          {buyer.notes ? (
            <div className="rounded-[var(--radius-md)] bg-canvas-2 border-l-2 border-violet p-3">
              <div className="text-eyebrow text-violet-deep mb-1">Note interne</div>
              <p className="text-meta text-ink leading-relaxed">{buyer.notes}</p>
            </div>
          ) : null}
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
