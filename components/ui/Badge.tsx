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
  | "neutral";

const STYLES: Record<Tone, { bg: string; text: string; label: string }> = {
  live: { bg: "rgba(201, 166, 76, 0.12)", text: "#8a6f1c", label: "EN VENTE" },
  pending: { bg: "rgba(31, 78, 121, 0.10)", text: "#1F4E79", label: "EN MODÉRATION" },
  draft: { bg: "rgba(106, 106, 106, 0.10)", text: "#4d4d4d", label: "BROUILLON" },
  past: { bg: "rgba(106, 106, 106, 0.07)", text: "#6A6A6A", label: "PASSÉ" },
  rejected: { bg: "rgba(161, 44, 44, 0.10)", text: "#A12C2C", label: "REFUSÉ" },
  success: { bg: "rgba(47, 107, 61, 0.10)", text: "#2F6B3D", label: "OK" },
  warning: { bg: "rgba(140, 74, 27, 0.10)", text: "#8C4A1B", label: "ATTENTION" },
  info: { bg: "rgba(31, 78, 121, 0.10)", text: "#1F4E79", label: "INFO" },
  neutral: { bg: "rgba(10, 31, 61, 0.06)", text: "#0A1F3D", label: "" },
};

export function Badge({
  tone,
  children,
}: {
  tone: Tone;
  children?: React.ReactNode;
}) {
  const style = STYLES[tone];
  return (
    <span
      className="badge"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
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
  return <Badge tone={map[status]} />;
}
