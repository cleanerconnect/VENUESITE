// Per-event Analyses tab data: sell-through curve, forecast, and
// channel attribution. The Analyses tab is forward-looking, so only
// on-sale and in-review events have data here. Past / settled events
// are handled by the Bilan factory.
//
// Curves are hardcoded story arcs that converge on the per-event
// forecast. No live computation — the chart is a story the data tells,
// not a live model output.

import {
  CHANNEL_PRESENTATION,
  type AnalysesData,
  type ChannelKey,
  type ChannelSlice,
  type EventForecast,
  type FunnelData,
  type PhaseStat,
  type Recommendation,
  type ReviewSummary,
  type SellThroughPoint,
  confidenceLabelFor,
} from "@/lib/types/analytics";
import { formatMAD } from "@/lib/utils/format";

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

function buildForecast(input: {
  finalSellThroughPct: number;
  finalRevenueMad: number;
  finalRevenueLabel: string;
  confidenceMarginPct: number;
}): EventForecast {
  return {
    ...input,
    confidenceLabel: confidenceLabelFor(input.confidenceMarginPct),
  };
}

/**
 * Helper for a smooth target trajectory that lands on the forecast's
 * predicted final sell-through. Day 0 = sale start, `totalDays` = sale
 * close. Uses an ease-out curve that ramps fast early, plateaus mid,
 * accelerates again near the close — the canonical "story" shape for
 * festival ticketing.
 */
function projectedTrajectory(
  totalDays: number,
  finalPct: number,
  earlyShare = 0.25,
  midShare = 0.55,
): (day: number) => number {
  return (day) => {
    if (day <= 0) return 0;
    if (day >= totalDays) return finalPct;
    const t = day / totalDays;
    if (t < earlyShare) {
      // Fast initial ramp — captures launch / early bird.
      return finalPct * 0.32 * (t / earlyShare);
    }
    if (t < midShare) {
      // Mid plateau — slow steady drip.
      const localT = (t - earlyShare) / (midShare - earlyShare);
      return finalPct * (0.32 + 0.28 * localT);
    }
    // Final acceleration — closing surge.
    const localT = (t - midShare) / (1 - midShare);
    return finalPct * (0.6 + 0.4 * Math.pow(localT, 1.4));
  };
}

// === Robbie Williams, Soirée d'ouverture ===
// Sale started 60 days ago, closes in 67 days. Total window 127 days.
// Currently sold 8420 / 12000 = 70.17 %. Strong cadence — running 18 %
// above projection (drives the forecast_deviation analytics signal).
function buildRobbieAnalyses(): AnalysesData {
  const TOTAL_DAYS = 127;
  const TODAY = 60;
  const FINAL_PCT = 92;

  const projected = projectedTrajectory(TOTAL_DAYS, FINAL_PCT);
  // Hand-tuned actual cadence — runs ahead of projection from day ~25
  // onwards, peaking at +18 % by today. Numbers anchor on the real
  // tier-sold totals: EB sold-out by day 30, Gen + Carré ramping.
  const ACTUALS_BY_DAY: Record<number, number> = {
    0: 0,
    5: 4.2,
    10: 8.1,
    15: 12.0,
    20: 15.4,
    25: 18.6,
    30: 22.5, // EB sold-out
    35: 27.4,
    40: 33.8,
    45: 41.2,
    50: 50.6,
    55: 60.4,
    60: 70.2, // today
  };

  const days = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110,
    120, 127,
  ];

  const sellThrough: SellThroughPoint[] = days.map((d) => ({
    day: d,
    label:
      d === 0
        ? "Lancement"
        : d === TOTAL_DAYS
          ? "Jour J"
          : d <= TODAY
            ? `J−${TOTAL_DAYS - d}`
            : `J−${TOTAL_DAYS - d}`,
    actualPct: d <= TODAY ? ACTUALS_BY_DAY[d] : undefined,
    projectedPct: Math.round(projected(d) * 10) / 10,
  }));

  return {
    sellThrough,
    forecast: buildForecast({
      finalSellThroughPct: 92,
      finalRevenueMad: 7_530_000,
      finalRevenueLabel: "7,5M MAD",
      confidenceMarginPct: 8,
    }),
    channels: buildChannels([
      { key: "organic", tickets: 3370, revenueMad: 2_240_000 },
      { key: "boost", tickets: 1265, revenueMad: 850_000 },
      { key: "partner", tickets: 1515, revenueMad: 1_000_000 },
      { key: "direct", tickets: 2270, revenueMad: 1_490_000 },
    ]),
    phases: [
      buildPhase({
        id: "t_robbie_eb",
        label: "Pass Jour · Early Bird",
        startDaysAgo: 120,
        endDaysAgo: 60,
        sold: 1500,
        quantity: 1500,
        faceValue: 380,
        status: "saturated",
        note: "Saturée en 11 jours, plus rapidement que 2024.",
      }),
      buildPhase({
        id: "t_robbie_gen",
        label: "Pass Jour · General",
        startDaysAgo: 60,
        endDaysFuture: 67,
        sold: 5400,
        quantity: 8500,
        faceValue: 590,
        status: "on_track",
        note: "63 % vendu à mi-parcours, projection 88 %.",
      }),
      buildPhase({
        id: "t_robbie_carre",
        label: "Carré Or",
        startDaysAgo: 60,
        endDaysFuture: 67,
        sold: 1520,
        quantity: 2000,
        faceValue: 1200,
        status: "on_track",
        note: "76 % vendu, momentum confirmé sur le segment premium.",
      }),
    ],
    funnel: buildFunnel({
      visits: 184_000,
      cart: 25_800,
      payment: 18_120,
      completed: 8_420,
      vsPlatformPts: -1.4,
    }),
    reviewSummary: {
      averageRating: 4.7,
      reviewCount: 47,
      distribution: [0, 1, 3, 12, 31],
      positiveTags: [
        { name: "Son", count: 47 },
        { name: "Ambiance", count: 38 },
        { name: "Show", count: 24 },
      ],
      improvementTags: [
        { name: "File d'attente", count: 18 },
        { name: "Bar", count: 6 },
      ],
    },
    recommendations: [
      {
        id: "rec_robbie_1",
        body: "Cadence +18 % vs cible. Un Splash de bienvenue vendredi soir pourrait sécuriser le sell-out avant Phase 3.",
        ctaLabel: "Lancer un boost",
        ctaHref: "/visibilite",
        tone: "violet",
      },
      {
        id: "rec_robbie_2",
        body: "Friction Payzone mobile identifiée — 38 % d'abandons à l'étape paiement. À surveiller cette semaine.",
        ctaLabel: "Voir le tunnel",
        tone: "warning",
      },
    ],
  };
}

// === Rilès, Pass Semaine ===
// Sale started 80 days ago, closes in 73 days. Total window 153 days.
// Currently sold 1240 / 3000 = 41.3 %. Below projection — the drag is
// what the cmp_riles_card optimisation suggestions try to fix.
function buildRilesAnalyses(): AnalysesData {
  const TOTAL_DAYS = 153;
  const TODAY = 80;
  const FINAL_PCT = 75;

  const projected = projectedTrajectory(TOTAL_DAYS, FINAL_PCT);
  const ACTUALS_BY_DAY: Record<number, number> = {
    0: 0,
    10: 4.0,
    20: 8.5,
    30: 13.4,
    40: 18.2,
    50: 23.0,
    60: 28.4,
    70: 34.6,
    80: 41.3, // today
  };

  const days = [
    0, 10, 20, 30, 40, 50, 60, 70, 80, 95, 110, 125, 140, 153,
  ];

  const sellThrough: SellThroughPoint[] = days.map((d) => ({
    day: d,
    label:
      d === 0
        ? "Lancement"
        : d === TOTAL_DAYS
          ? "Jour J"
          : `J−${TOTAL_DAYS - d}`,
    actualPct: d <= TODAY ? ACTUALS_BY_DAY[d] : undefined,
    projectedPct: Math.round(projected(d) * 10) / 10,
  }));

  return {
    sellThrough,
    forecast: buildForecast({
      finalSellThroughPct: 75,
      finalRevenueMad: 3_150_000,
      finalRevenueLabel: "3,2M MAD",
      confidenceMarginPct: 11,
    }),
    channels: buildChannels([
      { key: "organic", tickets: 558, revenueMad: 781_200 },
      { key: "boost", tickets: 38, revenueMad: 53_200 },
      { key: "partner", tickets: 273, revenueMad: 382_200 },
      { key: "direct", tickets: 371, revenueMad: 519_400 },
    ]),
    phases: [
      buildPhase({
        id: "t_riles_pass",
        label: "Pass Semaine 1",
        startDaysAgo: 80,
        endDaysFuture: 73,
        sold: 1240,
        quantity: 3000,
        faceValue: 1400,
        status: "lagging",
        note: "41 % à mi-parcours, légèrement sous la projection cible.",
      }),
    ],
    funnel: buildFunnel({
      visits: 96_400,
      cart: 8_650,
      payment: 5_180,
      completed: 1_240,
      vsPlatformPts: 4.0,
    }),
    reviewSummary: {
      averageRating: 4.8,
      reviewCount: 32,
      distribution: [0, 0, 2, 6, 24],
      positiveTags: [
        { name: "Acoustique Stage 21", count: 22 },
        { name: "Intimité", count: 14 },
        { name: "Énergie", count: 11 },
      ],
      improvementTags: [{ name: "Capacité limitée", count: 4 }],
    },
    recommendations: [
      {
        id: "rec_riles_1",
        body: "Cadence légèrement en avance sur Phase 1. Profitez du momentum pour annoncer la transition Phase 2 dans 5 jours.",
        ctaLabel: "Programmer l'annonce",
        tone: "violet",
      },
      {
        id: "rec_riles_2",
        body: "Audience Hip-hop francophone Casa-Rabat sous-exploitée. Un boost Carte mise en avant pourrait débloquer 200 ventes additionnelles.",
        ctaLabel: "Voir l'audience",
        ctaHref: "/audiences",
        tone: "violet",
      },
    ],
  };
}

// === Jorja Smith, Week-End 2 ===
// Still in modération. Sale opens in 2 days, closes in 76 days. No
// actual cadence to plot yet — the entire curve is projected. The
// Analyses tab here demonstrates what the data layer looks like
// before the first ticket sells.
function buildJorjaAnalyses(): AnalysesData {
  const TOTAL_DAYS = 78;
  const FINAL_PCT = 70;

  const projected = projectedTrajectory(TOTAL_DAYS, FINAL_PCT);
  const days = [0, 5, 10, 15, 20, 30, 40, 50, 60, 70, 78];

  const sellThrough: SellThroughPoint[] = days.map((d) => ({
    day: d,
    label:
      d === 0
        ? "Ouverture"
        : d === TOTAL_DAYS
          ? "Jour J"
          : `J−${TOTAL_DAYS - d}`,
    actualPct: undefined,
    projectedPct: Math.round(projected(d) * 10) / 10,
  }));

  return {
    sellThrough,
    forecast: buildForecast({
      finalSellThroughPct: 70,
      finalRevenueMad: 4_120_000,
      finalRevenueLabel: "4,1M MAD",
      confidenceMarginPct: 15,
    }),
    // No sales yet — channels stay empty until the first ticket lands.
    channels: [],
    phases: [
      buildPhase({
        id: "t_jorja_we",
        label: "Pass Week-End 2",
        startDaysFuture: 2,
        endDaysFuture: 76,
        sold: 0,
        quantity: 6000,
        faceValue: 980,
        status: "upcoming",
        note: "Ouverture dans 2 jours dès la validation modération.",
      }),
    ],
    // No funnel data until the first visitor lands.
    funnel: null,
    // No reviews on the first edition of this artist with the brand.
    reviewSummary: null,
    recommendations: [
      {
        id: "rec_jorja_1",
        body: "Pré-vente non encore ouverte. Une fois la modération validée, les premiers signaux apparaîtront sous 24h.",
        ctaLabel: "Voir la file de modération",
        tone: "violet",
      },
    ],
  };
}

// === Builders for the four shared shapes ===

interface PhaseInput {
  id: string;
  label: string;
  startDaysAgo?: number;
  startDaysFuture?: number;
  endDaysAgo?: number;
  endDaysFuture?: number;
  sold: number;
  quantity: number;
  faceValue: number;
  status: PhaseStat["status"];
  note: string;
}

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const DAY_MS = 24 * 3600_000;

function buildPhase(input: PhaseInput): PhaseStat {
  const startedAt = new Date(
    NOW -
      (input.startDaysAgo ?? -(input.startDaysFuture ?? 0)) * DAY_MS,
  ).toISOString();
  const endsAt = new Date(
    NOW -
      (input.endDaysAgo ?? -(input.endDaysFuture ?? 0)) * DAY_MS,
  ).toISOString();
  const fillPct = input.quantity
    ? Math.round((input.sold / input.quantity) * 1000) / 10
    : 0;
  const revenueMad = input.sold * input.faceValue;
  return {
    id: input.id,
    label: input.label,
    startedAt,
    endsAt,
    sold: input.sold,
    quantity: input.quantity,
    fillPct,
    revenueLabel: formatMAD(revenueMad),
    revenueMad,
    status: input.status,
    note: input.note,
  };
}

function buildFunnel(input: {
  visits: number;
  cart: number;
  payment: number;
  completed: number;
  vsPlatformPts: number;
}): FunnelData {
  const pct = (a: number, b: number) =>
    b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
  return {
    steps: [
      { key: "visits", label: "Visites", count: input.visits },
      {
        key: "cart",
        label: "Ajouts au panier",
        count: input.cart,
        stepConversionPct: pct(input.cart, input.visits),
      },
      {
        key: "payment",
        label: "Paiement entamé",
        count: input.payment,
        stepConversionPct: pct(input.payment, input.cart),
      },
      {
        key: "completed",
        label: "Achat finalisé",
        count: input.completed,
        stepConversionPct: pct(input.completed, input.payment),
      },
    ],
    overallConversionPct: pct(input.completed, input.visits),
    vsPlatformPts: input.vsPlatformPts,
  };
}

const REGISTRY: Record<string, () => AnalysesData> = {
  evt_jzb_robbie: buildRobbieAnalyses,
  evt_jzb_riles: buildRilesAnalyses,
  evt_jzb_jorja: buildJorjaAnalyses,
};

// Memoised — the profile switcher hits this on every render.
const cache = new Map<string, AnalysesData>();

export function getAnalysesByEventId(eventId: string): AnalysesData | undefined {
  if (cache.has(eventId)) return cache.get(eventId);
  const builder = REGISTRY[eventId];
  if (!builder) return undefined;
  const data = builder();
  cache.set(eventId, data);
  return data;
}

export function hasAnalyses(eventId: string): boolean {
  return eventId in REGISTRY;
}
