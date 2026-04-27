import { Pill } from "@/components/ui/Pill";
import type { CampaignStatus } from "@/lib/types/visibility";

const LABEL: Record<CampaignStatus, string> = {
  active: "EN COURS",
  scheduled: "PROGRAMMÉ",
  completed: "TERMINÉ",
  paused: "EN PAUSE",
};

const TONE: Record<
  CampaignStatus,
  "live" | "info" | "neutral" | "warning"
> = {
  active: "live",
  scheduled: "info",
  completed: "neutral",
  paused: "warning",
};

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  return (
    <Pill tone={TONE[status]} dot>
      {LABEL[status]}
    </Pill>
  );
}
