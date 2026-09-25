import { formatDistanceToNowStrict } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { VENUE_TIME_ZONE } from "@/lib/time/zone";

// Single source of truth for MAD formatting, French convention,
// non-breaking space as thousands separator. e.g. "12 850 MAD".
export function formatMAD(amount: number, withSuffix = true): string {
  const rounded = Math.round(amount);
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return withSuffix ? `${grouped} MAD` : grouped;
}

export function formatDateFR(iso: string | Date, pattern = "dd/MM/yyyy") {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatInTimeZone(d, VENUE_TIME_ZONE, pattern, { locale: fr });
}

export function formatDateTimeFR(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatInTimeZone(d, VENUE_TIME_ZONE, "dd MMM · HH'h'mm", { locale: fr });
}

/** "20h30" — the French clock, used wherever a service time is shown. */
/** "20h30" — the French clock, in the venue's zone, on both runtimes. */
export function formatTimeFR(iso: string | Date) {
  return formatInTimeZone(
    typeof iso === "string" ? new Date(iso) : iso,
    VENUE_TIME_ZONE,
    "HH'h'mm",
    { locale: fr },
  );
}

export function formatRelativeFR(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `il y a ${formatDistanceToNowStrict(d, { locale: fr })}`;
}

export function formatPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} %`;
}

// Card fee math, face value is what the organizer receives.
// Customer pays face + visible service fee (5.8% MA / 7.0% intl).
const FEE_RATES = {
  moroccan: 0.058,
  international: 0.07,
} as const;

export function computeCustomerPrice(
  faceValueMad: number,
  origin: keyof typeof FEE_RATES = "moroccan",
) {
  const customerPays = Math.round(faceValueMad * (1 + FEE_RATES[origin]));
  return {
    faceValueMad,
    customerPaysMad: customerPays,
    serviceFeeMad: customerPays - faceValueMad,
    organizerReceivesMad: faceValueMad,
    rate: FEE_RATES[origin],
  };
}
