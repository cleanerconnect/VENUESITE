// Promo codes — second-class layer alongside Visibility (paid promotion).
// Promo codes are organizer-issued discount mechanisms (referrals, press
// comps, partner deals). They consume inventory like regular tickets but
// carry custom revenue and attribution rules.
//
// Mirrors the eventual REST shape so swapping mock for fetch() is
// mechanical.

export type PromoCodeKind = "percentage" | "flat" | "comp";
export type PromoCodeStatus =
  | "active"
  | "scheduled"
  | "depleted"
  | "expired"
  | "paused";

/**
 * Where the code applies. Discriminated union — the form picks one
 * variant in step 2 of the create wizard.
 */
export type PromoCodeScope =
  | { kind: "all_events" }
  | { kind: "event"; eventId: string }
  | { kind: "tier"; eventId: string; tierId: string };

export interface PromoCode {
  id: string;
  /** Display code, e.g. "ROYALAIRMAROC25". Always upper-snake. */
  code: string;
  kind: PromoCodeKind;
  /** % off, e.g. 15 = -15 %. Set when kind === "percentage" or
   *  kind === "comp" (always 100). */
  valuePct?: number;
  /** Flat MAD off. Set when kind === "flat". */
  valueFlatMad?: number;
  scope: PromoCodeScope;
  /** Pre-formatted scope label for the table, e.g. "Pass 10 jours". */
  scopeLabel: string;
  maxRedemptions: number;
  redemptionCount: number;
  /** 1 = single-use per user, > 1 = multi-use cap, undefined = unlimited. */
  maxPerUser?: number;
  startsAt: string;
  endsAt: string;
  /** Total revenue generated through this code, MAD. Comp codes
   *  always have 0 here — comps consume inventory without revenue. */
  revenueGeneratedMad: number;
  /** Comb-rules note shown in detail drawer. */
  combinableNote: string;
  /** Internal note — visible only to the organizer team. */
  notes?: string;
  status: PromoCodeStatus;
  createdAt: string;
  /** Initials of the creator (CNDP-style). */
  createdByInitials: string;
}

export interface PromoCodeRedemption {
  id: string;
  redeemedAt: string;
  /** Anonymized initials per CNDP, e.g. "Y. B." */
  buyerInitials: string;
  city: string;
  tierName: string;
  /** Amount saved by the buyer, MAD. */
  amountSavedMad: number;
  /** Pre-formatted total paid after discount, MAD. */
  amountPaidLabel: string;
}

export interface PromoCodeDailyPoint {
  /** ISO date, day-resolution. */
  day: string;
  count: number;
}

export interface PromoCodeDetail {
  code: PromoCode;
  redemptions: PromoCodeRedemption[];
  daily: PromoCodeDailyPoint[];
}

/**
 * Aggregate hero numbers shown at the top of /promo-codes.
 */
export interface PromoCodesAggregate {
  activeCount: number;
  totalRedemptions: number;
  totalRevenueGeneratedMad: number;
}
