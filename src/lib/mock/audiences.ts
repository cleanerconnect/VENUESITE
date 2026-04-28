// /audiences route data, keyed by organizer profile id.
//
//   - Jazzablanca (mature account) → "ready" state with segments + a
//     curated rail of buyer profiles for the customer-profile sheet.
//   - Rooftop Mansour (new account) → "locked" state with a thin
//     progress bar showing 23 / 100 confirmed reservations and a
//     preview of the six categories that unlock at the threshold.

import type { AudiencesData, BuyerProfile } from "@/lib/types/analytics";
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
    tags: ["amateurs jazz", "international", "carré or"],
    primaryTag: "amateurs jazz",
    primarySegmentId: "seg_3",
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
    tags: ["amateurs jazz", "pass semaine", "concert récurrent"],
    primaryTag: "amateurs jazz",
    primarySegmentId: "seg_3",
    totalEventsAttended: 6,
    totalSpentMad: 9_600,
    lifetimeTier: "vip",
    firstSeenAt: offsetDays(540),
    lastSeenAt: offsetDays(2),
  },
];

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

export function getAudiencesByProfileId(profileId: string): AudiencesData {
  if (profileId === "org_jazzablanca") {
    return {
      state: "ready",
      totalBuyers: 26_840,
      segments: getAudienceSegments(),
      sampleBuyers: SAMPLE_BUYERS,
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
