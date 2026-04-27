// Visibility / boost layer demo data — Jazzablanca campaigns in three
// states (active well-performing, active under-performing, completed) so
// screenshots capture the full lifecycle.

import type {
  AudienceSegment,
  Campaign,
  PortfolioStats,
} from "@/lib/types/visibility";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetH = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const futureH = (h: number) => new Date(NOW + h * 3600_000).toISOString();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();

// Conversion sparkline series — 24 buckets, last 24 hours.
const sparkActive = [
  4, 6, 5, 8, 12, 14, 18, 22, 28, 32, 38, 42, 36, 30, 26, 22, 18, 14, 12, 16,
  20, 24, 28, 22,
];
const sparkUnderperform = [
  1, 0, 2, 1, 3, 2, 4, 3, 2, 4, 3, 5, 4, 3, 2, 4, 3, 2, 1, 2, 3, 1, 2, 1,
];

export function getCampaigns(): Campaign[] {
  return [
    // 1) Active and performing well — Splash de bienvenue, Robbie Williams
    {
      id: "cmp_robbie_splash",
      name: "Splash de bienvenue, Robbie Williams",
      eventId: "evt_jzb_robbie",
      eventName: "Robbie Williams, Soirée d'ouverture",
      boostType: "splash_welcome",
      status: "active",
      budgetMad: 12_000,
      spentMad: 8_000,
      impressions: 24_200,
      uniqueReach: 18_400,
      frequency: 1.32,
      ticketsAttributed: 312,
      revenueAttributedMad: 184_080, // 312 × 590 (Pass Jour General)
      cpaMad: 26,
      roas: 11.4,
      startedAt: offsetH(48),
      endsAt: futureH(24),
      daysRemaining: 1,
      conversionsByHour: sparkActive,
      audienceProfile: {
        topCities: [
          { city: "Casablanca", pct: 58 },
          { city: "Rabat", pct: 22 },
          { city: "Marrakech", pct: 12 },
        ],
        ageDistribution: [
          { range: "25-34", pct: 41 },
          { range: "35-44", pct: 28 },
          { range: "18-24", pct: 19 },
          { range: "45+", pct: 12 },
        ],
        interests: [
          { name: "Concerts", pct: 64 },
          { name: "Soirées", pct: 48 },
          { name: "Festivals", pct: 39 },
        ],
      },
      recentTickets: [
        {
          id: "att_a_1",
          name: "Yasmine Bennani",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(2),
        },
        {
          id: "att_a_2",
          name: "Mehdi Raji",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(7),
        },
        {
          id: "att_a_3",
          name: "Sophie Renaud",
          tierName: "Carré Or",
          amountMad: 1_200,
          at: offsetMin(18),
        },
        {
          id: "att_a_4",
          name: "Hicham El Idrissi",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(34),
        },
        {
          id: "att_a_5",
          name: "Anissa Tazi",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(60),
        },
        {
          id: "att_a_6",
          name: "Layla Fassi",
          tierName: "Carré Or",
          amountMad: 1_200,
          at: offsetMin(82),
        },
        {
          id: "att_a_7",
          name: "Nadia El Amrani",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(110),
        },
        {
          id: "att_a_8",
          name: "Reda Hammoumi",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(140),
        },
        {
          id: "att_a_9",
          name: "Sami El Yacoubi",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(170),
        },
        {
          id: "att_a_10",
          name: "Lina Benbrahim",
          tierName: "Pass Jour, General",
          amountMad: 590,
          at: offsetMin(210),
        },
      ],
      optimizations: [
        {
          id: "opt_1",
          text: "Votre tranche 25-34 ans convertit 2,3× mieux que la moyenne. Pensez à augmenter la part de budget sur ce segment.",
          actionLabel: "Rebalancer le budget",
        },
        {
          id: "opt_2",
          text: "Le créneau 19h-21h capte 64 % de vos clics. Limiter la diffusion à cette plage pourrait baisser le CPA.",
          actionLabel: "Activer le day-parting",
        },
      ],
      abVariants: [
        {
          id: "v_a",
          label: "Variante A, photo show",
          impressions: 12_100,
          conversions: 178,
          winner: true,
        },
        {
          id: "v_b",
          label: "Variante B, line-up détaillé",
          impressions: 12_100,
          conversions: 134,
          winner: false,
        },
      ],
    },

    // 2) Active under-performing — Carte mise en avant, Rilès
    {
      id: "cmp_riles_card",
      name: "Carte mise en avant, Rilès",
      eventId: "evt_jzb_riles",
      eventName: "Rilès, Pass Semaine",
      boostType: "sponsored_card",
      status: "active",
      budgetMad: 4_500,
      spentMad: 1_800,
      impressions: 7_800,
      uniqueReach: 6_240,
      frequency: 1.25,
      ticketsAttributed: 38,
      revenueAttributedMad: 53_200, // 38 × 1400
      cpaMad: 47,
      roas: 2.1, // below the 3× target
      startedAt: offsetH(72),
      endsAt: futureH(96),
      daysRemaining: 4,
      conversionsByHour: sparkUnderperform,
      audienceProfile: {
        topCities: [
          { city: "Casablanca", pct: 71 },
          { city: "Rabat", pct: 18 },
          { city: "Tanger", pct: 7 },
        ],
        ageDistribution: [
          { range: "18-24", pct: 38 },
          { range: "25-34", pct: 34 },
          { range: "35-44", pct: 18 },
          { range: "45+", pct: 10 },
        ],
        interests: [
          { name: "Hip-hop", pct: 52 },
          { name: "Concerts", pct: 41 },
          { name: "Soirées", pct: 36 },
        ],
      },
      recentTickets: [
        {
          id: "att_b_1",
          name: "Othmane Tazi",
          tierName: "Pass Semaine 1",
          amountMad: 1_400,
          at: offsetMin(45),
        },
        {
          id: "att_b_2",
          name: "Yasmine Cherkaoui",
          tierName: "Pass Semaine 1",
          amountMad: 1_400,
          at: offsetMin(180),
        },
        {
          id: "att_b_3",
          name: "Karim Lahlou",
          tierName: "Pass Semaine 1",
          amountMad: 1_400,
          at: offsetMin(60 * 5),
        },
        {
          id: "att_b_4",
          name: "Imane El Amrani",
          tierName: "Pass Semaine 1",
          amountMad: 1_400,
          at: offsetMin(60 * 8),
        },
        {
          id: "att_b_5",
          name: "Anas Bennis",
          tierName: "Pass Semaine 1",
          amountMad: 1_400,
          at: offsetMin(60 * 12),
        },
      ],
      optimizations: [
        {
          id: "opt_3",
          text: "Pour cette campagne, ajouter le filtre « a écouté du hip-hop francophone dans les 30 derniers jours » pourrait augmenter le ROAS de 34 %.",
          actionLabel: "Appliquer le filtre",
        },
        {
          id: "opt_4",
          text: "Votre audience actuelle inclut 18 % de profils 45+ avec une conversion 4× plus faible. Les exclure libérerait 320 MAD de budget.",
          actionLabel: "Affiner l'audience",
        },
        {
          id: "opt_5",
          text: "Le visuel actuel sous-performe sur mobile. Tester une variante portrait pourrait améliorer le CTR de 18 à 24 %.",
          actionLabel: "Lancer un test A/B",
        },
      ],
    },

    // 3) Recently completed — Notification ciblée, Jorja Smith
    {
      id: "cmp_jorja_notif",
      name: "Notification ciblée, Jorja Smith",
      eventId: "evt_jzb_jorja",
      eventName: "Jorja Smith, Week-End 2",
      boostType: "targeted_notification",
      status: "completed",
      budgetMad: 6_200,
      spentMad: 6_200,
      impressions: 14_000, // notifications delivered
      uniqueReach: 14_000,
      frequency: 1.0,
      ticketsAttributed: 184,
      revenueAttributedMad: 180_320, // 184 × 980
      cpaMad: 34,
      roas: 7.8,
      startedAt: offsetH(168),
      endsAt: offsetH(24),
      daysRemaining: 0,
      conversionsByHour: sparkActive,
      audienceProfile: {
        topCities: [
          { city: "Casablanca", pct: 46 },
          { city: "Rabat", pct: 24 },
          { city: "Marrakech", pct: 18 },
          { city: "Tanger", pct: 12 },
        ],
        ageDistribution: [
          { range: "25-34", pct: 38 },
          { range: "18-24", pct: 32 },
          { range: "35-44", pct: 22 },
          { range: "45+", pct: 8 },
        ],
        interests: [
          { name: "Soul / R&B", pct: 58 },
          { name: "Concerts", pct: 52 },
          { name: "Festivals", pct: 41 },
        ],
      },
      recentTickets: [
        {
          id: "att_c_1",
          name: "Sophie Renaud",
          tierName: "Pass Week-End 2",
          amountMad: 980,
          at: offsetH(28),
        },
        {
          id: "att_c_2",
          name: "Lina Benbrahim",
          tierName: "Pass Week-End 2",
          amountMad: 980,
          at: offsetH(36),
        },
        {
          id: "att_c_3",
          name: "Imane Cherkaoui",
          tierName: "Pass Week-End 2",
          amountMad: 980,
          at: offsetH(48),
        },
      ],
      optimizations: [],
      abVariants: [
        {
          id: "v_jorja_a",
          label: "Variante A, voix off",
          impressions: 7_000,
          conversions: 102,
          winner: true,
        },
        {
          id: "v_jorja_b",
          label: "Variante B, citation",
          impressions: 7_000,
          conversions: 82,
          winner: false,
        },
      ],
    },
  ];
}

export function getCampaignById(id: string): Campaign | undefined {
  return getCampaigns().find((c) => c.id === id);
}

export function getAudienceSegments(): AudienceSegment[] {
  return [
    {
      id: "seg_1",
      name: "Festivaliers Casa 25-35",
      description:
        "Casablanca, 25-35 ans, ont acheté 2+ pass festival sur 12 mois.",
      memberCount: 8_240,
    },
    {
      id: "seg_2",
      name: "Anciens acheteurs Jazzablanca",
      description:
        "Tous utilisateurs ayant acheté pour Jazzablanca 2023, 2024 ou 2025.",
      memberCount: 14_680,
    },
    {
      id: "seg_3",
      name: "Amateurs jazz / soul Casablanca-Rabat",
      description:
        "Casa et Rabat, intérêt jazz ou soul, ont attendu 1+ concert en 2025.",
      memberCount: 4_920,
    },
    {
      id: "seg_4",
      name: "Clients Pass 10 jours 2024-2025",
      description: "Détenteurs de Pass 10 jours sur les deux dernières éditions.",
      memberCount: 1_180,
    },
  ];
}

export function getPortfolioStats(): PortfolioStats {
  const campaigns = getCampaigns();
  const monthlySpend = campaigns.reduce((s, c) => s + c.spentMad, 0);
  const monthlyRevenue = campaigns.reduce(
    (s, c) => s + c.revenueAttributedMad,
    0,
  );
  return {
    monthlySpendMad: monthlySpend,
    monthlyRevenueAttributedMad: monthlyRevenue,
    portfolioRoas: monthlyRevenue / Math.max(1, monthlySpend),
  };
}

// Past campaigns history table (CSV-exportable in the real product).
export interface CampaignHistoryRow {
  id: string;
  name: string;
  eventName: string;
  finishedAt: string;
  spentMad: number;
  ticketsAttributed: number;
  finalRoas: number;
}

export function getCampaignHistory(): CampaignHistoryRow[] {
  return [
    {
      id: "h_1",
      name: "Notification ciblée, Jorja Smith",
      eventName: "Jorja Smith, Week-End 2",
      finishedAt: offsetH(24),
      spentMad: 6_200,
      ticketsAttributed: 184,
      finalRoas: 7.8,
    },
    {
      id: "h_2",
      name: "En tête de liste, Pré-vente fidèles",
      eventName: "Jazzablanca 2026, Pré-vente",
      finishedAt: offsetH(60 * 24 * 6),
      spentMad: 8_200,
      ticketsAttributed: 248,
      finalRoas: 6.4,
    },
    {
      id: "h_3",
      name: "Splash de bienvenue, Early Bird",
      eventName: "Jazzablanca 2026, Early Bird",
      finishedAt: offsetH(60 * 24 * 22),
      spentMad: 13_500,
      ticketsAttributed: 612,
      finalRoas: 9.2,
    },
    {
      id: "h_4",
      name: "Pop-up géolocalisé Anfa",
      eventName: "Diana Krall, Jazzablanca 2024",
      finishedAt: offsetH(60 * 24 * 280),
      spentMad: 4_800,
      ticketsAttributed: 96,
      finalRoas: 4.1,
    },
  ];
}

// Format catalog used by the boost creation wizard (Step 1) and rendered
// as little cards on the portfolio "Lancer un boost" CTA. Pricing is the
// transparent rate card from the brief.
export interface BoostFormat {
  type: import("@/lib/types/visibility").BoostType;
  label: string;
  tagline: string;
  pricing: string;
  reachLabel: string;
}

export function getBoostFormats(): BoostFormat[] {
  return [
    {
      type: "splash_welcome",
      label: "Splash de bienvenue",
      tagline:
        "Plein écran à l'ouverture de l'app, un seul annonceur par jour par ville.",
      pricing: "4 500 MAD / jour",
      reachLabel: "≈ 12 000 personnes touchées",
    },
    {
      type: "feed_top",
      label: "En tête de liste",
      tagline:
        "Votre événement en haut du feed des utilisateurs ciblés, 24h, 72h ou 7j.",
      pricing: "8 200 MAD / 7 jours",
      reachLabel: "≈ 45 000 impressions",
    },
    {
      type: "sponsored_card",
      label: "Carte mise en avant",
      tagline:
        "Carte « Mis en avant » intégrée au feed de découverte, tarif au mille.",
      pricing: "95 MAD / 1 000 impressions",
      reachLabel: "Audience standard",
    },
    {
      type: "targeted_notification",
      label: "Notification ciblée",
      tagline:
        "Push notification envoyée à un segment, plafond 5 000 / jour par organisateur.",
      pricing: "0,80 MAD / notification livrée",
      reachLabel: "Cap 5 000 / jour",
    },
    {
      type: "geo_popup",
      label: "Pop-up géolocalisé",
      tagline:
        "Carte qui apparaît quand un utilisateur entre dans la zone définie.",
      pricing: "240 MAD / 1 000 impressions",
      reachLabel: "Audience premium",
    },
  ];
}
