import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";
import type { EventState, LifecycleStatus } from "@/lib/types/domain";

// Pill = status badges and filter chips. 10% bg / full text colour, uppercase
// 10px tracking 0.12em, see brief spec.
type Tone =
  | "live"
  | "pending"
  | "draft"
  | "past"
  | "rejected"
  | "info"
  | "violet"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

// Every tone is a token at an opacity, never a literal. The rgba values
// that used to live here had drifted from the palette: `violet` was
// rgba(107,78,168) — a colour that existed nowhere else in the portal and
// was not `--color-violet` (134,91,166). It now reads the token.
//
// Four names therefore resolve to the same pair. That is deliberate: the
// tone is the caller's vocabulary, not the paint. `live` and `violet`,
// `pending` and `info`, `rejected` and `danger` are distinct things to
// say about a row, and collapsing them would push the choice of word
// into the call site.
const STYLES: Record<Tone, string> = {
  live: "bg-violet/12 text-violet-deep",
  pending: "bg-info/10 text-info",
  draft: "bg-ink-mute/12 text-ink-mute",
  past: "bg-ink-mute/8 text-ink-mute",
  rejected: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  violet: "bg-violet/12 text-violet-deep",
  success: "bg-success/10 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-ink/6 text-ink",
};

const STATE_LABEL: Record<EventState, string> = {
  draft: "BROUILLON",
  in_review: "EN MODÉRATION",
  rejected: "REFUSÉ",
  on_sale: "EN VENTE",
  live: "EN COURS",
  past: "TERMINÉ",
  settled: "VERSÉ",
  cancelled: "ANNULÉ",
};

const STATE_TONE: Record<EventState, Tone> = {
  draft: "draft",
  in_review: "pending",
  rejected: "rejected",
  on_sale: "live",
  live: "live",
  past: "past",
  settled: "success",
  cancelled: "danger",
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full",
        "text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap",
        STYLES[tone],
        className,
      )}
    >
      {dot ? (
        // `bg-current` takes the tone's text colour from the parent, so the
        // dot cannot disagree with the label it sits next to.
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: LifecycleStatus }) {
  return (
    <Pill tone={STATE_TONE[status.state]} dot>
      {STATE_LABEL[status.state]}
    </Pill>
  );
}
