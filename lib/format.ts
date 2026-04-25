// Formatting helpers — money, dates, fees, deltas. Centralised so that
// "12 450 MAD" and "DD/MM/YYYY" stay consistent across every screen.

import type { CardOrigin, FeeBreakdown } from "./types";

const FEE_RATES: Record<CardOrigin, { payzone: number; lyfe: number }> = {
  moroccan: { payzone: 0.018, lyfe: 0.04 },
  international: { payzone: 0.03, lyfe: 0.04 },
};

// Customer pays face value plus the visible service fee.
// Organizer keeps 100% of face value — a non-negotiable LYFE policy.
export function computeFee(
  faceValueMad: number,
  origin: CardOrigin = "moroccan",
): FeeBreakdown {
  const { payzone, lyfe } = FEE_RATES[origin];
  const totalRate = payzone + lyfe;
  const customerPaysMad = Math.round(faceValueMad * (1 + totalRate));
  const serviceFeeMad = customerPaysMad - faceValueMad;
  return {
    faceValueMad,
    serviceFeeMad,
    customerPaysMad,
    organizerReceivesMad: faceValueMad,
    payzoneFeeMad: Math.round(faceValueMad * payzone),
    lyfeFeeMad: Math.round(faceValueMad * lyfe),
    origin,
  };
}

// "12 450 MAD" — non-breaking space as thousands separator, French convention.
export function formatMad(amount: number, withSuffix = true): string {
  const rounded = Math.round(amount);
  const grouped = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " "); // narrow no-break space
  return withSuffix ? `${grouped} MAD` : grouped;
}

// "24/04/2026" — French default. ISO toggle is in Settings (out of scope here).
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, "0")}h${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
  return `${formatDate(iso)} · ${time}`;
}

// "il y a 2 min" — relative French timestamps for the activity feed.
export function formatRelative(iso: string, now = Date.now()): string {
  const diffSec = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `il y a ${diffSec} s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return formatDate(iso);
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} %`;
}

// "dans 3 j" — used by SLA countdowns and payout dates.
export function formatCountdown(iso: string, now = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  if (diffMs <= 0) return "expiré";
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 24) return `dans ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `dans ${diffD} j`;
}
