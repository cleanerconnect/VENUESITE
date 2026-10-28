// Partial payment, in one place.
//
// `Détail Sprint ` ligne 45 lets an organiser split a ticket between
// what is paid in the application and what is paid at the door, and
// ligne 54 asks that the application tell the client about the second
// half on the booking screen. Four surfaces then show the same split —
// the tier editor, the tier row on Ventes, the event's header and the
// phone preview — and the application reads it off the payload.
//
// So the subtraction and the sentence live here rather than in each of
// them. Two amounts are stored, `faceValueMad` and `appAmountMad`; the
// rest is derived every time it is shown, because a stored remainder is
// a third number that can disagree with the other two — and it would,
// the first time someone edited the total and not the remainder.

import { formatMAD } from "@/lib/utils/format";
import type { DraftTier, Tier } from "@/lib/types/domain";

/** The field the editor caps, and the application has to fit. */
export const ON_SITE_MESSAGE_MAX = 120;

type AnyTier = Tier | DraftTier;

/**
 * What is left to pay on site.
 *
 * Clamped at zero. An app amount above the total is a half-typed
 * number — « 1 » before « 100 » — not a venue owing the client money,
 * and the editor says so beside the field instead of showing a
 * negative remainder.
 */
export function onSiteAmount(tier: AnyTier): number {
  if (!tier.partialPayment) return 0;
  return Math.max(0, tier.faceValueMad - tier.appAmountMad);
}

/** The amount the application collects: the whole ticket, or the part. */
export function appAmount(tier: AnyTier): number {
  return tier.partialPayment ? tier.appAmountMad : tier.faceValueMad;
}

/**
 * The sentence the editor offers, built from the two amounts.
 *
 * It is a default and not a format: the organiser can replace it, and
 * what they type is what the client reads. The editor stops refilling
 * it the moment it has been edited — see `StepTiers` — so a sentence
 * about a deposit is not overwritten by moving the amount by 50 MAD.
 */
export function defaultOnSiteMessage(tier: AnyTier): string {
  const rest = onSiteAmount(tier);
  if (rest <= 0) return "";
  return `Il reste ${formatMAD(rest)} à payer sur place, le soir de l'événement.`;
}

/** « 200 MAD sur l'appli · 300 MAD sur place » — the row and the pill. */
export function splitLabel(tier: AnyTier): string {
  return `${formatMAD(appAmount(tier))} sur l'appli · ${formatMAD(
    onSiteAmount(tier),
  )} sur place`;
}
