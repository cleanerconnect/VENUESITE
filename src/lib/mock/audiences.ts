// /audiences route data, keyed by organizer profile id.
//
//   - Jazzablanca (mature account) → "ready" state with hero stats,
//     six segments and per-segment narrative detail, Morocco geo
//     points, three acquisition cohorts, top-ten clients, and
//     platform benchmarks.
//   - Rooftop Mansour (new account) → "locked" state with a thin
//     progress bar showing 23 / 100 confirmed reservations and a
//     preview of the six categories that unlock at the threshold.

import type {
  AudienceSegmentDetail,
  AudiencesData,
  BenchmarkRow,
  BuyerProfile,
  Cohort,
  GeoPoint,
  TopClient,
} from "@/lib/types/analytics";
import { getAudienceSegments } from "./visibility";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetDays = (d: number) =>
  new Date(NOW - d * 24 * 3600_000).toISOString();

const SAMPLE_BUYERS: BuyerProfile[] = [
  {
    id: "buyer_yasmine",
    name: "Yasmine Bennani",
    email: "yasmine.b@example.ma",
    phone: "+212 661 23 45 67",
    city: "Casablanca",
    tags: ["festivaliers casa 25-35", "carré or", "fidèle 3 éditions"],
    primaryTag: "festivaliers casa 25-35",
    primarySegmentId: "seg_1",
    totalEventsAttended: 7,
    totalSpentMad: 18_400,
    lifetimeTier: "vip",
    firstSeenAt: offsetDays(720),
    lastSeenAt: offsetDays(2),
    notes: "Présente sur les 3 dernières éditions Jazzablanca.",
  },
  {
    id: "buyer_karim",
    name: "Karim Lahlou",
    email: "karim.l@example.ma",
    phone: "+212 662 11 22 33",
    city: "Casablanca",
    tags: ["anciens acheteurs jazzablanca", "pass jour", "transferable user"],
    primaryTag: "anciens acheteurs jazzablanca",
    primarySegmentId: "seg_2",
    totalEventsAttended: 4,
    totalSpentMad: 5_240,
    lifetimeTier: "regular",
    firstSeenAt: offsetDays(440),
    lastSeenAt: offsetDays(6),
  },
  {
    id: "buyer_sophie",
    name: "Sophie Renaud",
    email: "sophie.r@example.fr",
    phone: "+33 6 12 34 56 78",
    city: "Paris",
    tags: ["acheteurs internationaux", "amateurs jazz", "carré or"],
    primaryTag: "acheteurs internationaux",
    primarySegmentId: "seg_5",
    totalEventsAttended: 2,
    totalSpentMad: 3_180,
    lifetimeTier: "regular",
    firstSeenAt: offsetDays(380),
    lastSeenAt: offsetDays(0.5),
    notes: "Vol direct Paris-Casa réservé, séjour 8 jours sur l'édition.",
  },
  {
    id: "buyer_hicham",
    name: "Hicham El Idrissi",
    email: "hicham.e@example.ma",
    phone: "+212 664 12 34 56",
    city: "Rabat",
    tags: ["clients pass 10 jours", "pass 10 jours fidélité", "carré or"],
    primaryTag: "clients pass 10 jours",
    primarySegmentId: "seg_4",
    totalEventsAttended: 5,
    totalSpentMad: 22_500,
    lifetimeTier: "vip",
    firstSeenAt: offsetDays(820),
    lastSeenAt: offsetDays(5),
    notes: "Pass 10 jours sur les deux dernières éditions.",
  },
  {
    id: "buyer_mehdi",
    name: "Mehdi Raji",
    email: "mehdi.r@example.ma",
    phone: "+212 665 78 90 12",
    city: "Casablanca",
    tags: ["festivaliers casa 25-35", "early bird", "groupe 4 personnes"],
    primaryTag: "festivaliers casa 25-35",
    primarySegmentId: "seg_1",
    totalEventsAttended: 3,
    totalSpentMad: 4_720,
    lifetimeTier: "regular",
    firstSeenAt: offsetDays(220),
    lastSeenAt: offsetDays(0.3),
  },
  {
    id: "buyer_anissa",
    name: "Anissa Tazi",
    email: "anissa.t@example.ma",
    phone: "+212 667 33 44 55",
    city: "Casablanca",
    tags: ["amateurs jazz / soul casablanca-rabat", "pass semaine"],
    primaryTag: "amateurs jazz / soul casablanca-rabat",
    primarySegmentId: "seg_3",
    totalEventsAttended: 6,
    totalSpentMad: 9_600,
    lifetimeTier: "vip",
    firstSeenAt: offsetDays(540),
    lastSeenAt: offsetDays(2),
  },
];

// Per-segment narrative detail keyed by the visibility AudienceSegment id.
const SEGMENT_DETAILS: Record<string, AudienceSegmentDetail> = {
  seg_1: {
    segmentId: "seg_1",
    averageSpendLabel: "1 240 MAD",
    conversionLiftLabel: "2,3× vs moyenne plateforme",
    topCity: "Casablanca",
    topInterest: "Festivals d'été",
    insights: [
      "Convertit 2,3× mieux que la moyenne plateforme — segment le plus rentable du portfolio en CPA.",
      "Achète majoritairement entre 19h et 22h les jeudis et vendredis — fenêtre boost prioritaire.",
      "Le Pass Jour General représente 64 % de leurs achats, le Carré Or 28 %.",
      "Réseau social principal : Instagram (78 % des découvertes), TikTok en croissance (12 %).",
    ],
  },
  seg_2: {
    segmentId: "seg_2",
    averageSpendLabel: "2 180 MAD",
    conversionLiftLabel: "5,2× vs moyenne plateforme",
    topCity: "Casablanca",
    topInterest: "Jazzablanca historique",
    insights: [
      "Le segment-roi : 5,2× la conversion moyenne, ROAS retargeting estimé > 8×.",
      "73 % de re-conversion d'année en année — base la plus prévisible du portfolio.",
      "Panier moyen 2 180 MAD, vs 980 MAD pour un acheteur première fois.",
      "À traiter en pré-vente fidèles dès janvier chaque année.",
    ],
  },
  seg_3: {
    segmentId: "seg_3",
    averageSpendLabel: "1 580 MAD",
    conversionLiftLabel: "3,1× vs moyenne plateforme",
    topCity: "Casablanca · Rabat",
    topInterest: "Jazz · Soul · Soirées intimes",
    insights: [
      "Public mature 35-54 (62 % du segment) — le cœur de l'audience signature.",
      "Sensibles aux soirées petites jauges : Stage 21 (capacité 3 000) convertit 2,8× mieux que la Main Stage pour ce segment.",
      "Achètent en duo dans 78 % des cas — proposer systématiquement le Pack 2 personnes.",
      "Géographie répartie Casa-Rabat — opportunité Tanger / Marrakech sous-exploitée.",
    ],
  },
  seg_4: {
    segmentId: "seg_4",
    averageSpendLabel: "5 120 MAD",
    conversionLiftLabel: "Conversion premium",
    topCity: "Casablanca · Rabat",
    topInterest: "Pass 10 jours · Carré Or",
    insights: [
      "Panier le plus haut du portfolio — 5 120 MAD en moyenne, 4× la médiane.",
      "100 % de re-conversion d'une édition à la suivante — fidélité quasi-absolue.",
      "Sensibles aux services premium : conciergerie, parking VIP, accès lounge.",
      "Pré-réserver 8 % du stock Carré Or pour ce segment dès le lancement.",
    ],
  },
  seg_5: {
    segmentId: "seg_5",
    averageSpendLabel: "3 240 MAD",
    conversionLiftLabel: "Audience 100 % nouveau",
    topCity: "Paris · Madrid · Londres",
    topInterest: "Tourisme festival",
    insights: [
      "Représente 3 % des billets pour 7 % du revenu — segment à amplifier.",
      "99 % de scan rate le jour J — meilleur taux toutes catégories confondues.",
      "78 % achètent via canal hôtel partenaire — opportunité partenariat aérien à activer.",
      "Séjournent 4-8 jours en moyenne — offre billet+vol+hôtel à explorer.",
    ],
  },
  seg_6: {
    segmentId: "seg_6",
    averageSpendLabel: "420 MAD",
    conversionLiftLabel: "Volume sous-exploité",
    topCity: "Casablanca · Rabat",
    topInterest: "Early Bird · Pass Jour",
    insights: [
      "Représente 14 % des achats vs 22 % attendu — sous-performance Phase 1 Blind 2025.",
      "Email seul ne suffit pas — ajouter SMS / WhatsApp boost dès Phase 1.",
      "Sensibles au tarif : Early Bird convertit 4× mieux que Pass Jour General sur ce segment.",
      "Tester un tarif Étudiants dédié avec −15 % vs Early Bird en 2026.",
    ],
  },
};

const ROOFTOP_CATEGORIES = [
  {
    name: "Habitués week-end",
    description:
      "Réservent récurrence vendredi ou samedi, 1 à 2 fois par mois.",
  },
  {
    name: "Couples cocktail-dîner",
    description:
      "Achètent en duo, table dînatoire, panier moyen au-dessus de 800 MAD.",
  },
  {
    name: "Groupes anniversaires",
    description: "Réservent 6+ couverts, soirées spéciales, bouteilles VIP.",
  },
  {
    name: "Voyageurs hôtels Anfa",
    description:
      "Géolocalisés sur la corniche, séjours courts, carte bancaire étrangère.",
  },
  {
    name: "Événementiel privé",
    description:
      "Privatisations partielles, événements d'entreprise, mariages.",
  },
  {
    name: "Curieux première visite",
    description:
      "Découvrent le lieu, panier moyen plus bas, à fidéliser sur la 2e visite.",
  },
];

// Morocco geo bubbles — coordinates approximated against a 100×140 SVG
// viewBox where Casablanca anchors at roughly (28, 60) and Tangier sits
// at the top-right (52, 14). Demo data, not real GPS.
const GEO: GeoPoint[] = [
  { city: "Casablanca", share: 58.4, ticketCount: 15_676, x: 28, y: 60 },
  { city: "Rabat", share: 14.2, ticketCount: 3_811, x: 36, y: 50 },
  { city: "Marrakech", share: 8.6, ticketCount: 2_308, x: 38, y: 90 },
  { city: "Tanger", share: 6.4, ticketCount: 1_718, x: 52, y: 14 },
  { city: "Agadir", share: 3.8, ticketCount: 1_020, x: 18, y: 110 },
  { city: "Fès", share: 3.2, ticketCount: 859, x: 60, y: 44 },
  { city: "Meknès", share: 1.9, ticketCount: 510, x: 56, y: 46 },
  { city: "Tétouan", share: 0.8, ticketCount: 215, x: 50, y: 18 },
  // International (placed off the map at the corner — drives the
  // "International" mini-tile rather than a Morocco bubble).
  { city: "Paris", share: 1.4, ticketCount: 376, x: 90, y: 6 },
  { city: "Madrid", share: 0.7, ticketCount: 188, x: 90, y: 16 },
  { city: "Londres", share: 0.4, ticketCount: 107, x: 90, y: 26 },
];

const COHORTS: Cohort[] = [
  {
    id: "cohort_2023",
    label: "Acquis · Édition 2023",
    startedAtIso: offsetDays(720),
    initialBuyers: 9_400,
    points: [
      { index: 0, label: "Édition 2023", retentionPct: 100 },
      { index: 1, label: "Édition 2024", retentionPct: 64 },
      { index: 2, label: "Édition 2025", retentionPct: 41 },
      { index: 3, label: "Édition 2026", retentionPct: 28 },
    ],
  },
  {
    id: "cohort_2024",
    label: "Acquis · Édition 2024",
    startedAtIso: offsetDays(420),
    initialBuyers: 11_280,
    points: [
      { index: 0, label: "Édition 2024", retentionPct: 100 },
      { index: 1, label: "Édition 2025", retentionPct: 73 },
      { index: 2, label: "Édition 2026", retentionPct: 52 },
    ],
  },
  {
    id: "cohort_2025",
    label: "Acquis · Édition 2025",
    startedAtIso: offsetDays(280),
    initialBuyers: 6_160,
    points: [
      { index: 0, label: "Édition 2025", retentionPct: 100 },
      { index: 1, label: "Édition 2026", retentionPct: 81 },
    ],
  },
];

// Top clients — anonymized initials in display per CNDP guidelines.
// Full names live in the data layer for the customer profile sheet.
const TOP_CLIENTS: TopClient[] = [
  {
    initials: "H. E. I.",
    fullName: "Hicham El Idrissi",
    city: "Rabat",
    segment: "Clients Pass 10 jours",
    eventsAttended: 5,
    totalSpentMad: 22_500,
    ltvLabel: "22 500 MAD",
    lifetimeTier: "vip",
  },
  {
    initials: "Y. B.",
    fullName: "Yasmine Bennani",
    city: "Casablanca",
    segment: "Festivaliers Casa 25-35",
    eventsAttended: 7,
    totalSpentMad: 18_400,
    ltvLabel: "18 400 MAD",
    lifetimeTier: "vip",
  },
  {
    initials: "O. B.",
    fullName: "Omar Benjelloun",
    city: "Casablanca",
    segment: "Anciens acheteurs Jazzablanca",
    eventsAttended: 6,
    totalSpentMad: 14_280,
    ltvLabel: "14 280 MAD",
    lifetimeTier: "vip",
  },
  {
    initials: "L. F.",
    fullName: "Layla Fassi",
    city: "Casablanca",
    segment: "Anciens acheteurs Jazzablanca",
    eventsAttended: 5,
    totalSpentMad: 11_820,
    ltvLabel: "11 820 MAD",
    lifetimeTier: "vip",
  },
  {
    initials: "A. T.",
    fullName: "Anissa Tazi",
    city: "Casablanca",
    segment: "Amateurs jazz / soul",
    eventsAttended: 6,
    totalSpentMad: 9_600,
    ltvLabel: "9 600 MAD",
    lifetimeTier: "vip",
  },
  {
    initials: "S. I.",
    fullName: "Salma Idrissi",
    city: "Rabat",
    segment: "Anciens acheteurs Jazzablanca",
    eventsAttended: 4,
    totalSpentMad: 8_240,
    ltvLabel: "8 240 MAD",
    lifetimeTier: "vip",
  },
  {
    initials: "K. L.",
    fullName: "Karim Lahlou",
    city: "Casablanca",
    segment: "Anciens acheteurs Jazzablanca",
    eventsAttended: 4,
    totalSpentMad: 5_240,
    ltvLabel: "5 240 MAD",
    lifetimeTier: "regular",
  },
  {
    initials: "M. R.",
    fullName: "Mehdi Raji",
    city: "Casablanca",
    segment: "Festivaliers Casa 25-35",
    eventsAttended: 3,
    totalSpentMad: 4_720,
    ltvLabel: "4 720 MAD",
    lifetimeTier: "regular",
  },
  {
    initials: "S. R.",
    fullName: "Sophie Renaud",
    city: "Paris",
    segment: "Acheteurs internationaux",
    eventsAttended: 2,
    totalSpentMad: 3_180,
    ltvLabel: "3 180 MAD",
    lifetimeTier: "regular",
  },
  {
    initials: "N. E. A.",
    fullName: "Nadia El Amrani",
    city: "Casablanca",
    segment: "Festivaliers Casa 25-35",
    eventsAttended: 3,
    totalSpentMad: 2_980,
    ltvLabel: "2 980 MAD",
    lifetimeTier: "regular",
  },
];

const BENCHMARKS: BenchmarkRow[] = [
  {
    metric: "Re-conversion d'une édition à la suivante",
    yourValue: "73 %",
    platformMedian: "32 %",
    deltaLabel: "+41 pts",
    favorable: true,
  },
  {
    metric: "Panier moyen acheteur",
    yourValue: "1 380 MAD",
    platformMedian: "490 MAD",
    deltaLabel: "+182 %",
    favorable: true,
  },
  {
    metric: "Concentration géographique (top 3 villes)",
    yourValue: "81,2 %",
    platformMedian: "62,4 %",
    deltaLabel: "+19 pts",
    favorable: false,
  },
  {
    metric: "Audience internationale",
    yourValue: "2,5 %",
    platformMedian: "0,8 %",
    deltaLabel: "+1,7 pt",
    favorable: true,
  },
  {
    metric: "LTV à 24 mois",
    yourValue: "2 940 MAD",
    platformMedian: "780 MAD",
    deltaLabel: "+277 %",
    favorable: true,
  },
];

export function getAudiencesByProfileId(profileId: string): AudiencesData {
  if (profileId === "org_jazzablanca") {
    return {
      state: "ready",
      heroStats: {
        totalBuyersLabel: "26 840",
        totalBuyers: 26_840,
        activeSegments: 6,
        ltvLabel: "1 380 MAD",
        ltvMad: 1_380,
      },
      segments: getAudienceSegments(),
      segmentDetails: SEGMENT_DETAILS,
      sampleBuyers: SAMPLE_BUYERS,
      geo: GEO,
      cohorts: COHORTS,
      topClients: TOP_CLIENTS,
      benchmarks: BENCHMARKS,
    };
  }
  // Rooftop Mansour or any other new account.
  return {
    state: "locked",
    emptyState: {
      currentBookings: 23,
      unlockThreshold: 100,
      upcomingCategories: ROOFTOP_CATEGORIES,
    },
  };
}

export function getBuyerById(buyerId: string): BuyerProfile | undefined {
  return SAMPLE_BUYERS.find((b) => b.id === buyerId);
}

export function getAllSampleBuyers(): BuyerProfile[] {
  return SAMPLE_BUYERS;
}
