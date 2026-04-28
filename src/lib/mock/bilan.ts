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
  type OperationalStat,
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
  netRevenueMad: number;
  netRevenueLabel: string;
  channels: ChannelInput[];
  endedAtIso: string;
  reviewCount: number;
  aiTakeaway: string;
  operationalStats: OperationalStat[];
  whatWorked: string[];
  whatDidntWork: string[];
  recommendations: string[];
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
    netRevenueMad: 23_100_000,
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
    aiTakeaway:
      "L'édition 2025 valide la thèse premium : votre billetterie haut-de-gamme (Pass 10 jours, Carré Or) absorbe 38 % du revenu pour 22 % du volume. Les boosts payants ont rapporté 6,3× leur coût. La pression résiduelle vient du door-day — scan rate −1,7 pt vs 2024 — qu'un ajustement opérationnel résoudra l'année prochaine.",
    operationalStats: [
      {
        label: "Sell-through final",
        value: "92 %",
        vsHistoricalLabel: "−8 pts vs édition 2024",
        vsHistoricalFavorable: false,
        vsPlatformLabel: "+11 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
      {
        label: "Taux de scan",
        value: "96,4 %",
        vsHistoricalLabel: "−1,7 pt vs édition 2024",
        vsHistoricalFavorable: false,
        vsPlatformLabel: "+8 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
      {
        label: "Taux de remboursement",
        value: "2,1 %",
        vsHistoricalLabel: "+0,7 pt vs édition 2024",
        vsHistoricalFavorable: false,
        vsPlatformLabel: "−1,4 pt vs médiane plateforme",
        vsPlatformFavorable: true,
      },
    ],
    whatWorked: [
      "Le mix premium a confirmé sa thèse : Pass 10 jours et Carré Or représentent 38 % du revenu pour 22 % du volume. Le segment fidèle Casa-Rabat porte 64 % de cette catégorie — c'est le socle à entretenir.",
      "Les boosts Splash de bienvenue ont délivré un ROAS pondéré de 6,3× sur 1,2M MAD investis. Le créneau 19h-22h capte 64 % des conversions — confirmer ce day-parting comme stratégie par défaut l'année prochaine.",
      "L'audience internationale (3 % des billets, 7 % du revenu) s'est présentée à 99 % le jour J — meilleur taux de scan toutes catégories. La piste prioritaire pour 2026 est d'amplifier ce segment via partenaires aériens.",
    ],
    whatDidntWork: [
      "Le door-day a perdu 1,7 pt de scan rate vs 2024. La file d'attente Stage 21 a culminé à 38 minutes en pic 21h — feedback récurrent dans les avis (18 mentions négatives sur l'attente). À traiter en priorité avant l'édition 2026.",
      "Le tunnel de paiement mobile a abandonné 38 % à l'étape Payzone — friction technique identifiée mais non résolue à temps. Coût opportunité estimé à 240 000 MAD de revenu manqué sur la fenêtre Phase 2.",
      "Le segment 18-24 ans a sous-performé : 14 % des achats vs 22 % attendu. Le messaging Phase 1 Blind n'a pas atteint l'audience étudiante Casablanca — rééquilibrer le canal Instagram l'année prochaine.",
    ],
    recommendations: [
      "Ajouter 4 portes Stage 21 et 8 scanners mobiles supplémentaires l'année prochaine pour absorber le pic 21h sans dégrader l'expérience.",
      "Migrer la passerelle paiement mobile vers PayDunya v2 ou tester un fallback Apple Pay / Google Pay dès Phase 2 — récupérer les 240k MAD de friction Payzone.",
      "Lancer un Splash de bienvenue ciblé étudiants Casablanca dès l'ouverture Phase 1 Blind 2026, avec tarif Early Bird dédié −15 %.",
      "Activer un partenariat Royal Air Maroc / Air Arabia avec offre billet+vol pour amplifier le segment international (objectif 5 % du revenu en 2026).",
      "Pré-réserver 8 % du stock Carré Or pour les acheteurs fidèles 2024-2025 (segment à 5,2× la conversion moyenne) — verrou de revenu Premium dès le lancement.",
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
    netRevenueMad: 4_100_000,
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
    aiTakeaway:
      "Soirée signature, sold-out 7 jours avant la date — la rareté programmée a fonctionné comme un argument de vente à elle seule. Boosts modestes (8 % du revenu pour 4 % du spend total) — l'organique a porté la billetterie. La répétition de ce mécanisme exige un line-up de calibre équivalent en 2026.",
    operationalStats: [
      {
        label: "Sell-through final",
        value: "100 %",
        vsHistoricalLabel: "Première édition de la série",
        vsHistoricalFavorable: true,
        vsPlatformLabel: "+19 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
      {
        label: "Taux de scan",
        value: "97,8 %",
        vsHistoricalLabel: "Première édition de la série",
        vsHistoricalFavorable: true,
        vsPlatformLabel: "+9 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
      {
        label: "Taux de remboursement",
        value: "0,8 %",
        vsHistoricalLabel: "Première édition de la série",
        vsHistoricalFavorable: true,
        vsPlatformLabel: "−2,7 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
    ],
    whatWorked: [
      "Le sold-out 7 jours avant la date a créé un effet de rareté qui a porté la conversion finale — 14 % des billets vendus dans les 72 dernières heures sans aucune relance payante.",
      "L'audience 35-54 ans (62 % du volume, vs 28 % en moyenne plateforme) confirme que le segment jazz/soul mature est sous-exploité au Maroc — opportunité claire pour étendre la programmation.",
      "Les achats partenaires (24 % du volume) viennent à 78 % des hôtels Anfa et boutiques de luxe Casa — réseau de distribution premium à activer en première intention pour les soirées signature 2026.",
    ],
    whatDidntWork: [
      "Audience géographique trop concentrée Casa (74 %) vs ambition régionale. Les acheteurs Tanger / Marrakech ont représenté seulement 9 % combinés — pas de relais média hors-Casablanca activé en 2024.",
      "Le tarif unique Pass Jour à 480 MAD a laissé la possibilité d'un Carré Or premium sur la table — 23 % des avis mentionnent qu'ils auraient payé plus pour une expérience signature.",
    ],
    recommendations: [
      "Reproduire la stratégie sold-out programmé en 2026 avec un autre artiste de calibre Diana Krall — annoncer la jauge limitée dès le lancement.",
      "Introduire un tarif Carré Or à 1 200 MAD pour capturer le 23 % d'audience disposée à payer premium identifiée dans les avis.",
      "Activer un canal partenaire à Tanger et Marrakech (hôtels 5★, boutiques) dès Phase 1 pour décentraliser l'audience.",
      "Programmer un boost Notification ciblée sur le segment Jazz/Soul 35-54 ans Casa-Rabat-Marrakech 14 jours avant la date.",
      "Capturer la base acheteur 2024 dans un segment retargeting dédié — taux de re-conversion estimé à 5× sur la prochaine soirée signature.",
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
    netRevenueMad: 5_100_000,
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
    aiTakeaway:
      "La pré-vente fidèles 2024 a tenu sa fonction de levier financier : 5,4M MAD encaissés 4 mois avant l'édition, 100 % de sell-through en 9 jours. La base fidèle représente un effet de levier disproportionné — chaque acheteur a converti 2,4 fois en moyenne sur l'édition complète qui a suivi.",
    operationalStats: [
      {
        label: "Sell-through final",
        value: "100 %",
        vsHistoricalLabel: "Pré-vente 2023 : 100 %",
        vsHistoricalFavorable: true,
        vsPlatformLabel: "+19 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
      {
        label: "Taux de scan",
        value: "98,1 %",
        vsHistoricalLabel: "+0,4 pt vs pré-vente 2023",
        vsHistoricalFavorable: true,
        vsPlatformLabel: "+10 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
      {
        label: "Taux de remboursement",
        value: "1,4 %",
        vsHistoricalLabel: "−0,3 pt vs pré-vente 2023",
        vsHistoricalFavorable: true,
        vsPlatformLabel: "−2,1 pts vs médiane plateforme",
        vsPlatformFavorable: true,
      },
    ],
    whatWorked: [
      "L'effet fidèle a fonctionné comme prévu : la base 2023 a re-converti à 73 %, soit 2,4× la moyenne de la plateforme — c'est le segment-roi du modèle Jazzablanca.",
      "Le tarif Pass 10 jours · Fidélité à 4 500 MAD a créé une rareté désirable — 100 % vendu en 9 jours, à comparer avec les 60-90 jours typiques d'un Pass équivalent en open sale.",
      "L'effet de levier financier est massif : 5,4M MAD encaissés 4 mois avant l'événement permet de financer l'édition complète sans tirer sur la trésorerie organisateur.",
    ],
    whatDidntWork: [
      "La fenêtre de 9 jours était plus courte que prévu — 38 % des fidèles 2023 n'ont pas eu le temps de réagir et se sont retrouvés en open sale standard. Allonger la fenêtre à 14 jours en 2025 a corrigé partiellement.",
      "Le canal de communication (email seul) a sous-servi le segment 18-34 ans qui consulte peu sa boîte — pour 2025, ajouter un canal SMS ou WhatsApp ciblé fidèles.",
    ],
    recommendations: [
      "Reproduire la pré-vente fidèles chaque année comme rituel — elle finance l'édition et capture le segment le plus rentable du portfolio.",
      "Étendre la fenêtre à 14 jours minimum pour permettre à tous les fidèles de réagir.",
      "Ajouter un canal SMS / WhatsApp aux notifications pré-vente — l'email seul exclut une partie de l'audience 18-34.",
      "Tester un tarif Carré Or fidèles à 6 500 MAD : 28 % des avis pré-vente mentionnent qu'ils auraient pris plus premium si proposé.",
      "Verrouiller la pré-vente comme « rendez-vous annuel » avec une date fixe — janvier de chaque année — pour créer l'attente.",
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
    netRevenueMad: core.netRevenueMad,
    netRevenueLabel: core.netRevenueLabel,
    channels: buildChannels(core.channels),
    reviewSummary,
    reviews,
    previousEditions: findPriorEditions(event, allEvents),
    aiTakeaway: core.aiTakeaway,
    operationalStats: core.operationalStats,
    whatWorked: core.whatWorked,
    whatDidntWork: core.whatDidntWork,
    recommendations: core.recommendations,
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
