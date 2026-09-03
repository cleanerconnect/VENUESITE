"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Edit3,
  Eye,
  FileText,
  Megaphone,
  Wand2,
} from "lucide-react";
import type { LyfeEvent } from "@/lib/types/domain";
import { Pill, StatusPill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { formatDateTimeFR, formatMAD } from "@/lib/utils/format";

// Mobile event card — replaces the desktop horizontal row with a full
// 16:9 cover, big Fraunces title, single key metric, and two action
// buttons. Surface stays state-aware: a rejected card swaps the second
// CTA for "Corriger", a settled card surfaces "Voir le bilan", an
// on_sale card with an active boost flips to "Gérer le boost".

type SecondAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  tone: "secondary" | "warning" | "violet";
};

export function MobileEventCard({
  event,
  /** Supplied by the list, which reads both once for every row. */
  activeBoosts = 0,
  hasBilan = false,
}: {
  event: LyfeEvent;
  activeBoosts?: number;
  hasBilan?: boolean;
}) {
  const router = useRouter();
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  const revenue = event.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );
  const sellThroughPct = cap > 0 ? Math.round((sold / cap) * 100) : 0;

  // Headline metric varies by lifecycle. Past + settled lead with
  // sell-through (the bilan is the next step), on_sale leads with
  // revenue, in_review shows a moderation note, draft has no metric.
  const metric = ((): { label: string; value: string } | null => {
    if (event.status.state === "draft") return null;
    if (event.status.state === "in_review")
      return { label: "Statut", value: "En modération" };
    if (event.status.state === "rejected") return null;
    if (event.status.state === "cancelled")
      return { label: "Statut", value: "Annulé" };
    if (event.status.state === "past" || event.status.state === "settled")
      return {
        label: "Sell-through final",
        value: `${sellThroughPct} %`,
      };
    return { label: "Revenu", value: formatMAD(revenue) };
  })();

  const second: SecondAction = ((): SecondAction => {
    if (event.status.state === "rejected") {
      return {
        label: "Corriger",
        href: `/events/${event.id}/edit?reason=rejected`,
        icon: <Edit3 size={14} strokeWidth={1.8} />,
        tone: "warning",
      };
    }
    if (event.status.state === "in_review") {
      return {
        label: "Modérer",
        href: `/events/${event.id}`,
        icon: <Wand2 size={14} strokeWidth={1.8} />,
        tone: "violet",
      };
    }
    if (
      (event.status.state === "past" || event.status.state === "settled") &&
      hasBilan
    ) {
      return {
        label: "Voir le bilan",
        href: `/events/${event.id}?tab=bilan`,
        icon: <FileText size={14} strokeWidth={1.8} />,
        tone: "violet",
      };
    }
    if (event.status.state === "draft") {
      return {
        label: "Modifier",
        href: `/events/${event.id}/edit`,
        icon: <Edit3 size={14} strokeWidth={1.8} />,
        tone: "secondary",
      };
    }
    if (event.status.state === "cancelled") {
      return {
        label: "Voir l'historique",
        href: `/events/${event.id}`,
        icon: <Eye size={14} strokeWidth={1.8} />,
        tone: "secondary",
      };
    }
    // on_sale / live → boost
    return {
      label: activeBoosts > 0 ? "Gérer le boost" : "Booster",
      href: `/events/${event.id}?tab=promote`,
      icon: <Megaphone size={14} strokeWidth={1.8} />,
      tone: "violet",
    };
  })();

  const isMuted =
    event.status.state === "rejected" || event.status.state === "cancelled";

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <article
        className="bg-surface border border-line rounded-[var(--radius-xl)] overflow-hidden"
      >
        {/* Cover, 16:9. We use a gradient placeholder consistent with
            the desktop row treatment. Status pill overlays top-left,
            J-X countdown / metric flag overlays top-right. */}
        <Link
          href={`/events/${event.id}`}
          aria-label={event.name}
          className="block relative"
        >
          <div
            className="aspect-[16/9] relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--color-violet-soft), var(--color-tint-sky))",
            }}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--color-gold) 45%, transparent), transparent 70%)",
              }}
            />
            {isMuted ? (
              <div
                aria-hidden
                className="absolute inset-0 bg-ink/30"
              />
            ) : null}
          </div>
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <StatusPill status={event.status} />
            {activeBoosts > 0 ? (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-canvas/85 backdrop-blur text-[10px] font-bold text-violet-deep uppercase tracking-[0.06em]">
                <Megaphone size={11} strokeWidth={2} />
                Boost
              </span>
            ) : null}
          </div>
        </Link>

        <div className="p-5">
          <Link href={`/events/${event.id}`}>
            <h3
              className="text-ink line-clamp-2"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              {event.name}
            </h3>
          </Link>
          <div className="text-meta text-ink-mute mt-1.5 num">
            {formatDateTimeFR(event.startsAt)} · {event.venue.city}
          </div>

          {/* Rejected reason — bleed into the card body. */}
          {event.status.state === "rejected" ? (
            <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] bg-tint-rose/60 border-l-2 border-danger px-3 py-2">
              <AlertTriangle
                size={12}
                strokeWidth={1.9}
                className="text-danger mt-0.5 shrink-0"
              />
              <p className="text-meta text-ink leading-relaxed">
                {event.status.reason}
              </p>
            </div>
          ) : null}

          {/* Progress + key metric */}
          {cap > 0 ? (
            <div className="mt-4 space-y-2">
              <ProgressBar value={sold} max={cap} tone="violet" size="xs" />
              <div className="flex items-baseline justify-between gap-3 text-meta num">
                <span className="text-ink-soft">
                  <span className="font-bold text-ink">{sold}</span>
                  <span className="text-ink-mute"> / {cap}</span>
                  <span className="ml-1.5 text-ink-mute">·</span>
                  <span className="ml-1.5 font-semibold">
                    {sellThroughPct} %
                  </span>
                </span>
                {metric ? (
                  <span className="text-ink-soft">
                    {metric.label}{" "}
                    <span className="font-bold text-ink">{metric.value}</span>
                  </span>
                ) : null}
              </div>
            </div>
          ) : metric ? (
            <div className="mt-4">
              <Pill tone="neutral">{metric.value}</Pill>
            </div>
          ) : null}

          {/* Action row */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button
              size="md"
              fullWidth
              iconLeft={<Eye size={14} strokeWidth={1.8} />}
              onClick={() => router.push(`/events/${event.id}`)}
            >
              Voir
            </Button>
            {second.onClick ? (
              <Button
                variant="secondary"
                size="md"
                fullWidth
                iconLeft={second.icon}
                onClick={second.onClick}
              >
                {second.label}
              </Button>
            ) : (
              <Link
                href={second.href!}
                aria-label={second.label}
              >
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  iconLeft={second.icon}
                  className={
                    second.tone === "warning"
                      ? "!border-warning/30 !text-warning hover:!bg-warning/10"
                      : second.tone === "violet"
                        ? "!border-violet-soft !text-violet-deep hover:!bg-violet-soft/60"
                        : ""
                  }
                >
                  {second.label}
                  <ArrowRight
                    size={11}
                    strokeWidth={2.2}
                    className="ml-1"
                  />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </article>
    </motion.div>
  );
}
