import type { EventStatus } from "@/lib/types";

type Tone =
  | "live"
  | "pending"
  | "draft"
  | "past"
  | "rejected"
  | "success"
  | "warning"
  | "info"
  | "neutral"
  | "purple";

interface ToneStyle {
  bg: string;
  text: string;
  ring: string;
  dot: string;
  label: string;
}

const STYLES: Record<Tone, ToneStyle> = {
  live: {
    bg: "rgba(216, 168, 59, 0.12)",
    text: "#7a5e16",
    ring: "rgba(216, 168, 59, 0.35)",
    dot: "#D8A83B",
    label: "EN VENTE",
  },
  pending: {
    bg: "rgba(37, 62, 134, 0.10)",
    text: "#253E86",
    ring: "rgba(37, 62, 134, 0.30)",
    dot: "#253E86",
    label: "EN MODÉRATION",
  },
  draft: {
    bg: "rgba(15, 15, 15, 0.05)",
    text: "#4d4d4d",
    ring: "rgba(15, 15, 15, 0.10)",
    dot: "#9A9588",
    label: "BROUILLON",
  },
  past: {
    bg: "rgba(15, 15, 15, 0.04)",
    text: "#6F6A60",
    ring: "rgba(15, 15, 15, 0.08)",
    dot: "#9A9588",
    label: "PASSÉ",
  },
  rejected: {
    bg: "rgba(161, 44, 44, 0.10)",
    text: "#A12C2C",
    ring: "rgba(161, 44, 44, 0.30)",
    dot: "#A12C2C",
    label: "REFUSÉ",
  },
  success: {
    bg: "rgba(47, 107, 61, 0.10)",
    text: "#2F6B3D",
    ring: "rgba(47, 107, 61, 0.28)",
    dot: "#2F6B3D",
    label: "OK",
  },
  warning: {
    bg: "rgba(140, 74, 27, 0.10)",
    text: "#8C4A1B",
    ring: "rgba(140, 74, 27, 0.28)",
    dot: "#8C4A1B",
    label: "ATTENTION",
  },
  info: {
    bg: "rgba(37, 62, 134, 0.10)",
    text: "#253E86",
    ring: "rgba(37, 62, 134, 0.28)",
    dot: "#253E86",
    label: "INFO",
  },
  purple: {
    bg: "rgba(134, 91, 166, 0.10)",
    text: "#6E489A",
    ring: "rgba(134, 91, 166, 0.30)",
    dot: "#865BA6",
    label: "TRANSFERT",
  },
  neutral: {
    bg: "rgba(15, 15, 15, 0.05)",
    text: "#0F0F0F",
    ring: "rgba(15, 15, 15, 0.10)",
    dot: "#6F6A60",
    label: "",
  },
};

export function Badge({
  tone,
  children,
  withDot = false,
}: {
  tone: Tone;
  children?: React.ReactNode;
  withDot?: boolean;
}) {
  const style = STYLES[tone];
  return (
    <span
      className="badge"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        boxShadow: `inset 0 0 0 1px ${style.ring}`,
      }}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: 999,
            backgroundColor: style.dot,
            marginRight: 6,
          }}
        />
      ) : null}
      {children ?? style.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, Tone> = {
    live: "live",
    pending: "pending",
    draft: "draft",
    past: "past",
    rejected: "rejected",
  };
  return <Badge tone={map[status]} withDot />;
}
