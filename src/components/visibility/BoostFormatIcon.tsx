import {
  Bell,
  ListOrdered,
  type LucideIcon,
  MapPin,
  Maximize2,
  Pin,
} from "lucide-react";
import type { BoostType } from "@/lib/types/visibility";

const ICON: Record<BoostType, LucideIcon> = {
  splash_welcome: Maximize2,
  feed_top: ListOrdered,
  sponsored_card: Pin,
  targeted_notification: Bell,
  geo_popup: MapPin,
};

export const BOOST_LABEL: Record<BoostType, string> = {
  splash_welcome: "Splash de bienvenue",
  feed_top: "En tête de liste",
  sponsored_card: "Carte mise en avant",
  targeted_notification: "Notification ciblée",
  geo_popup: "Pop-up géolocalisé",
};

export function BoostFormatIcon({
  type,
  size = 16,
  className,
}: {
  type: BoostType;
  size?: number;
  className?: string;
}) {
  const Icon = ICON[type];
  return <Icon size={size} strokeWidth={1.7} className={className} />;
}
