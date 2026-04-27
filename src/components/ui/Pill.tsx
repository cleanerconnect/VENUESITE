import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";
import type { EventStatus } from "@/lib/types/domain";

// Pill = status badges and filter chips. 10% bg / full text colour, uppercase
// 10px tracking 0.12em — see brief spec.
type Tone =
  | "live"
  | "pending"
  | "draft"
  | "past"
  | "rejected"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

interface Style {
  bg: string;
  text: string;
}

const STYLES: Record<Tone, Style> = {
  live: { bg: "rgba(201,166,76,0.14)", text: "var(--color-gold-deep)" },
  pending: { bg: "rgba(31,78,121,0.10)", text: "var(--color-info)" },
  draft: { bg: "rgba(107,118,137,0.12)", text: "var(--color-ink-mute)" },
  past: { bg: "rgba(107,118,137,0.08)", text: "var(--color-ink-mute)" },
  rejected: { bg: "rgba(161,44,44,0.10)", text: "var(--color-danger)" },
  info: { bg: "rgba(31,78,121,0.10)", text: "var(--color-info)" },
  success: { bg: "rgba(47,107,61,0.10)", text: "var(--color-success)" },
  warning: { bg: "rgba(140,90,27,0.12)", text: "var(--color-warning)" },
  danger: { bg: "rgba(161,44,44,0.10)", text: "var(--color-danger)" },
  neutral: { bg: "rgba(10,31,61,0.06)", text: "var(--color-ink)" },
};

const LABEL: Record<EventStatus, string> = {
  live: "EN VENTE",
  pending: "EN MODÉRATION",
  draft: "BROUILLON",
  past: "PASSÉ",
  rejected: "REFUSÉ",
};

export function Pill({
  tone,
  children,
  dot = false,
  className,
}: {
  tone: Tone;
  children?: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const s = STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full",
        "text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap",
        className,
      )}
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {dot ? (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: s.text }}
        />
      ) : null}
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: EventStatus }) {
  const tone: Tone = status;
  return (
    <Pill tone={tone} dot>
      {LABEL[status]}
    </Pill>
  );
}
