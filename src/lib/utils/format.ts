import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { VENUE_TIME_ZONE, venueInstant } from "@/lib/time/zone";

// Single source of truth for MAD formatting, French convention,
// non-breaking space as thousands separator. e.g. "12 850 MAD".
export function formatMAD(amount: number, withSuffix = true): string {
  const rounded = Math.round(amount);
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return withSuffix ? `${grouped} MAD` : grouped;
}

export function formatDateFR(iso: string | Date, pattern = "dd/MM/yyyy") {
  return formatInTimeZone(venueInstant(iso), VENUE_TIME_ZONE, pattern, { locale: fr });
}

export function formatDateTimeFR(iso: string | Date) {
  return formatInTimeZone(venueInstant(iso), VENUE_TIME_ZONE, "dd MMM · HH'h'mm", {
    locale: fr,
  });
}

/**
 * "20h30" — the French clock, in the venue's zone, on both runtimes.
 *
 * Through `venueInstant`, so a stored value that names no zone is read
 * as the venue's wall clock rather than the runtime's. See `zone.ts`.
 */
export function formatTimeFR(iso: string | Date) {
  return formatInTimeZone(venueInstant(iso), VENUE_TIME_ZONE, "HH'h'mm", {
    locale: fr,
  });
}

/**
 * « il y a 3 min », against a given instant.
 *
 * `now` is not optional decoration: a component that renders on the
 * server and again on hydration and asks the clock each time gets two
 * answers across a minute boundary, and React refuses the mismatch.
 * Callers inside a screen pass `ScreenContext.now`; the default is for
 * the places that have no screen, like the styleguide.
 */
export function formatRelativeFR(iso: string | Date, now?: number) {
  const d = venueInstant(iso);
  return `il y a ${
    now === undefined
      ? formatDistanceToNowStrict(d, { locale: fr })
      : formatDistanceStrict(d, new Date(now), { locale: fr })
  }`;
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
