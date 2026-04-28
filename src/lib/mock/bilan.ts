// Per-event Bilan tab data: post-event recap with channel breakdown,
// review aggregation, and previous-edition comparisons.
//
// Bilan is only available for past / settled events. Cancelled events
// keep their rose ribbon — they're a different operational story
// (refunds, cancellation reason) and conflating them with post-event
// analysis muddies both surfaces.
//
// Comparisons match by `parentEventSeriesId`. A first-time edition
// returns an empty `previousEditions` array — the section won't render.

import type { LyfeEvent } from "@/lib/types/domain";
import {
  CHANNEL_PRESENTATION,
  type BilanData,
  type ChannelKey,
  type ChannelSlice,
  type PreviousEdition,
  type PreviousEditionStat,
} from "@/lib/types/analytics";
import { generateReviews, summarizeReviews } from "./reviews";

interface ChannelInput {
  key: ChannelKey;
  tickets: number;
  revenueMad: number;
}

function buildChannels(slices: ChannelInput[]): ChannelSlice[] {
  const total = slices.reduce((sum, s) => sum + s.tickets, 0) || 1;
  return slices.map((s) => ({
    key: s.key,
    label: CHANNEL_PRESENTATION[s.key].label,
    colorVar: CHANNEL_PRESENTATION[s.key].colorVar,
    tickets: s.tickets,
    revenueMad: s.revenueMad,
    pct: Math.round((s.tickets / total) * 1000) / 10,
  }));
}

// === Bilan stats per past / settled event id. ===
//
// Keys mirror the events seeded in `mock/events.ts` (Diana Krall 2024,
// Pré-vente fidèles 2024) plus the Jazzablanca 2025 settled edition
// added for the Bilan demo.

interface BilanCore {
  finalSellThroughPct: number;
  finalRevenueMad: number;
  totalAttendees: number;
  scanRatePct: number;
  refundRatePct: number;
  netRevenueLabel: string;
  channels: ChannelInput[];
  endedAtIso: string;
  reviewCount: number;
}

const CORE: Record<string, BilanCore> = {
  // Jazzablanca 2025 — full settled edition. The 2025 edition is the
  // anchor for the Bilan demo, with previous-edition comparisons
  // against Pré-vente fidèles 2024 (same parentEventSeriesId).
  evt_jzb_2025_full: {
    finalSellThroughPct: 92,
    finalRevenueMad: 24_750_000,
    totalAttendees: 5500,
    scanRatePct: 96.4,
    refundRatePct: 2.1,
    netRevenueLabel: "23,1M MAD net",
    endedAtIso: new Date(
      new Date("2026-04-25T19:30:00+01:00").getTime() - 285 * 24 * 3600_000,
    ).toISOString(),
    reviewCount: 487,
    channels: [
      { key: "organic", tickets: 2090, revenueMad: 9_405_000 },
      { key: "boost", tickets: 1210, revenueMad: 5_445_000 },
      { key: "partner", tickets: 990, revenueMad: 4_455_000 },
      { key: "direct", tickets: 1210, revenueMad: 5_445_000 },
    ],
  },

  // Diana Krall 2024 — sold-out signature evening, parentEventSeriesId
  // "diana_krall". A standalone series with no current edition to
  // compare against.
  evt_jzb_2024_diana: {
    finalSellThroughPct: 100,
    finalRevenueMad: 4_320_000,
    totalAttendees: 9000,
    scanRatePct: 97.8,
    refundRatePct: 0.8,
    netRevenueLabel: "4,1M MAD net",
    endedAtIso: new Date(
      new Date("2026-04-25T19:30:00+01:00").getTime() - 280 * 24 * 3600_000,
    ).toISOString(),
    reviewCount: 312,
    channels: [
      { key: "organic", tickets: 4140, revenueMad: 1_987_200 },
      { key: "boost", tickets: 720, revenueMad: 345_600 },
      { key: "partner", tickets: 2160, revenueMad: 1_036_800 },
      { key: "direct", tickets: 1980, revenueMad: 950_400 },
    ],
  },

  // Pré-vente fidèles 2024 — Jazzablanca loyalty pre-sale, sold-out.
  // parentEventSeriesId "jazzablanca_annual" — pairs with the 2025
  // edition for the prior-edition comparison block.
  evt_jzb_2024_settled: {
    finalSellThroughPct: 100,
    finalRevenueMad: 5_400_000,
    totalAttendees: 1200,
    scanRatePct: 98.1,
    refundRatePct: 1.4,
    netRevenueLabel: "5,1M MAD net",
    endedAtIso: new Date(
      new Date("2026-04-25T19:30:00+01:00").getTime() - 310 * 24 * 3600_000,
    ).toISOString(),
    reviewCount: 142,
    channels: [
      { key: "organic", tickets: 540, revenueMad: 2_430_000 },
      { key: "boost", tickets: 180, revenueMad: 810_000 },
      { key: "partner", tickets: 240, revenueMad: 1_080_000 },
      { key: "direct", tickets: 240, revenueMad: 1_080_000 },
    ],
  },
};

// Comparisons are keyed by (current event id) → list of priors. Hardcoded
// because the 2024 → 2025 comparison narrative is the demo moment.
//
// Pré-vente fidèles 2024 vs Jazzablanca 2025 (full edition):
//  - Sell-through:   100 %  → 92 %      (−8 pts)   not favorable
//  - Revenue net:    5,1M  → 23,1M     (×4,5)     favorable (full vs pre-sale, of course bigger — kept for context)
//  - Refund rate:    1,4 % → 2,1 %     (+0,7 pt)  not favorable
//  - Avg note:       4,8   → 4,6        (−0,2)     not favorable
//  - Scan rate:      98,1 % → 96,4 %    (−1,7 pt)  not favorable
const COMPARISONS: Record<string, PreviousEditionStat[]> = {
  evt_jzb_2025_full: [
    {
      label: "Sell-through final",
      currentValue: "92 %",
      priorValue: "100 %",
      deltaLabel: "−8 pts",
      favorable: false,
    },
    {
      label: "Note moyenne",
      currentValue: "4,6 / 5",
      priorValue: "4,8 / 5",
      deltaLabel: "−0,2",
      favorable: false,
    },
    {
      label: "Taux de scan",
      currentValue: "96,4 %",
      priorValue: "98,1 %",
      deltaLabel: "−1,7 pt",
      favorable: false,
    },
    {
      label: "Taux de remboursement",
      currentValue: "2,1 %",
      priorValue: "1,4 %",
      deltaLabel: "+0,7 pt",
      favorable: false,
    },
    {
      label: "Revenu net total",
      currentValue: "23,1M MAD",
      priorValue: "5,1M MAD",
      deltaLabel: "×4,5 (édition complète)",
      favorable: true,
    },
  ],
};

function findPriorEditions(
  current: LyfeEvent,
  allEvents: LyfeEvent[],
): PreviousEdition[] {
  if (!current.parentEventSeriesId) return [];
  const stats = COMPARISONS[current.id];
  if (!stats) return [];
  const priors = allEvents.filter(
    (e) =>
      e.id !== current.id &&
      e.parentEventSeriesId === current.parentEventSeriesId &&
      (e.status.state === "past" || e.status.state === "settled"),
  );
  if (priors.length === 0) return [];

  // Pick the most recent prior — the demo narrative is "vs last year".
  const mostRecent = [...priors].sort((a, b) =>
    a.endsAt < b.endsAt ? 1 : -1,
  )[0];

  return [
    {
      priorEventId: mostRecent.id,
      editionLabel: mostRecent.name,
      endedAt: mostRecent.endsAt,
      comparisons: stats,
    },
  ];
}

// Memoised because the profile switcher and the events list both hit
// these factories — generating reviews twice would burn cycles.
const cache = new Map<string, BilanData>();

export function getBilanByEventId(
  eventId: string,
  allEvents: LyfeEvent[],
): BilanData | undefined {
  if (cache.has(eventId)) return cache.get(eventId);

  const event = allEvents.find((e) => e.id === eventId);
  if (!event) return undefined;
  const isEligible =
    event.status.state === "past" || event.status.state === "settled";
  if (!isEligible) return undefined;

  const core = CORE[eventId];
  if (!core) return undefined;

  const reviews = generateReviews(eventId, core.reviewCount > 60 ? 30 : 18, core.endedAtIso);
  const reviewSummary = {
    ...summarizeReviews(reviews),
    // Override the displayed review count to reflect the real total
    // (the generated feed is a rolling preview of the first 18-30).
    reviewCount: core.reviewCount,
  };

  const bilan: BilanData = {
    eventId: event.id,
    finalSellThroughPct: core.finalSellThroughPct,
    finalRevenueMad: core.finalRevenueMad,
    totalAttendees: core.totalAttendees,
    scanRatePct: core.scanRatePct,
    refundRatePct: core.refundRatePct,
    netRevenueLabel: core.netRevenueLabel,
    channels: buildChannels(core.channels),
    reviewSummary,
    reviews,
    previousEditions: findPriorEditions(event, allEvents),
  };

  cache.set(eventId, bilan);
  return bilan;
}

export function hasBilan(event: LyfeEvent): boolean {
  if (event.status.state !== "past" && event.status.state !== "settled") {
    return false;
  }
  return event.id in CORE;
}
