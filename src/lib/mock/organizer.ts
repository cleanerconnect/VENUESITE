// Demo organizer = Jazzablanca festival team. The demo reads as a real
// product when shown to investors / venues because Jazzablanca is the most
// recognisable lifestyle event brand in Morocco. This is demo data, not a
// commitment that they're a real customer.

import type {
  ActivityItem,
  LyfeEvent,
  OverviewData,
  Venue,
} from "@/lib/types/domain";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();
const futureDays = (d: number) => new Date(NOW + d * 24 * 3600_000).toISOString();

const venues: Venue[] = [
  {
    id: "v_anfa_main",
    name: "Anfa Park · Main Stage",
    address: "Anfa Park",
    city: "Casablanca",
    capacity: 12000,
    ice: "002384719000045",
    rc: "284711",
  },
  {
    id: "v_anfa_21",
    name: "Anfa Park · Stage 21",
    address: "Anfa Park",
    city: "Casablanca",
    capacity: 3000,
  },
  {
    id: "v_anfa_jam",
    name: "Anfa Park · Jam Stage",
    address: "Anfa Park",
    city: "Casablanca",
    capacity: 1800,
  },
];

const upcomingEvents: LyfeEvent[] = [
  {
    id: "evt_jzb_robbie",
    name: "Robbie Williams — Soirée d'ouverture",
    description:
      "L'ouverture officielle de la 19e édition. Set complet, première mondiale du nouveau show.",
    category: "concert",
    venue: venues[0],
    startsAt: futureDays(67),
    endsAt: futureDays(67),
    agePolicy: "all",
    refundPolicy: "manual",
    coverUrl: "/covers/robbie.jpg",
    status: "live",
    createdAt: offsetMin(60 * 24 * 90),
    pageViews: 184_000,
    tiers: [
      {
        id: "t_robbie_eb",
        name: "Pass Jour · Early Bird",
        faceValueMad: 380,
        quantity: 1500,
        sold: 1500,
        saleStart: offsetMin(60 * 24 * 120),
        saleEnd: offsetMin(60 * 24 * 60),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_robbie_gen",
        name: "Pass Jour · General",
        faceValueMad: 590,
        quantity: 8500,
        sold: 5400,
        saleStart: offsetMin(60 * 24 * 60),
        saleEnd: futureDays(67),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_robbie_carre",
        name: "Carré Or",
        faceValueMad: 1200,
        quantity: 2000,
        sold: 1520,
        saleStart: offsetMin(60 * 24 * 60),
        saleEnd: futureDays(67),
        maxPerOrder: 4,
        transferable: false,
      },
    ],
  },
  {
    id: "evt_jzb_riles",
    name: "Rilès — Pass Semaine",
    description:
      "Tête d'affiche de la mi-semaine. Flow rare, scénographie inédite pour Jazzablanca.",
    category: "concert",
    venue: venues[1],
    startsAt: futureDays(73),
    endsAt: futureDays(73),
    agePolicy: "all",
    refundPolicy: "manual",
    coverUrl: "/covers/riles.jpg",
    status: "live",
    createdAt: offsetMin(60 * 24 * 80),
    pageViews: 96_400,
    tiers: [
      {
        id: "t_riles_pass",
        name: "Pass Semaine 1",
        faceValueMad: 1400,
        quantity: 3000,
        sold: 1240,
        saleStart: offsetMin(60 * 24 * 80),
        saleEnd: futureDays(73),
        maxPerOrder: 4,
        transferable: true,
      },
    ],
  },
  {
    id: "evt_jzb_jorja",
    name: "Jorja Smith — Week-End 2",
    description:
      "Week-end de clôture. Voix nouvelle génération, programmation pensée comme un seul mouvement.",
    category: "concert",
    venue: venues[0],
    startsAt: futureDays(76),
    endsAt: futureDays(76),
    agePolicy: "all",
    refundPolicy: "manual",
    coverUrl: "/covers/jorja.jpg",
    status: "pending",
    createdAt: offsetMin(60 * 8),
    pageViews: 0,
    tiers: [
      {
        id: "t_jorja_we",
        name: "Pass Week-End 2",
        faceValueMad: 980,
        quantity: 6000,
        sold: 0,
        saleStart: futureDays(2),
        saleEnd: futureDays(76),
        maxPerOrder: 6,
        transferable: true,
      },
    ],
  },
];

const activity: ActivityItem[] = [
  {
    id: "a1",
    type: "purchase",
    actor: "Yasmine Bennani",
    message: "a acheté 1 Pass Semaine 1 · Rilès — 1 400 MAD",
    eventId: "evt_jzb_riles",
    at: offsetMin(0.5),
  },
  {
    id: "a2",
    type: "transfer",
    actor: "Karim Lahlou",
    message: "a transféré son Pass Jour à Reda Hammoumi",
    eventId: "evt_jzb_robbie",
    at: offsetMin(2),
  },
  {
    id: "a3",
    type: "purchase",
    actor: "Sophie Renaud (FR)",
    message: "a acheté 2 Pass Week-End 2 · Jorja Smith",
    eventId: "evt_jzb_jorja",
    at: offsetMin(7),
  },
  {
    id: "a4",
    type: "purchase",
    actor: "Hicham El Idrissi",
    message: "a acheté 1 Pass 10 jours · Carré Or — 4 500 MAD",
    eventId: "evt_jzb_robbie",
    at: offsetMin(18),
  },
  {
    id: "a5",
    type: "refund",
    actor: "Layla Fassi",
    message: "remboursement approuvé — 750 MAD",
    eventId: "evt_jzb_riles",
    at: offsetMin(34),
  },
  {
    id: "a6",
    type: "purchase",
    actor: "Mehdi Raji",
    message: "a acheté 4 Pass Jour · Robbie Williams",
    eventId: "evt_jzb_robbie",
    at: offsetMin(60 * 4),
  },
  {
    id: "a7",
    type: "moderation",
    actor: "Équipe LYFE",
    message: "Pass Jour Jorja Smith en file de modération",
    eventId: "evt_jzb_jorja",
    at: offsetMin(60 * 6),
  },
  {
    id: "a8",
    type: "purchase",
    actor: "Anissa Tazi",
    message: "a acheté 1 Pass Week-End 1 · Phase 2 active",
    eventId: "evt_jzb_robbie",
    at: offsetMin(60 * 7),
  },
  {
    id: "a9",
    type: "scan",
    actor: "Hamza (équipe d'accueil)",
    message: "premier scan test effectué",
    eventId: "evt_jzb_robbie",
    at: offsetMin(60 * 12),
  },
  {
    id: "a10",
    type: "purchase",
    actor: "Nadia El Amrani",
    message: "a acheté 2 Early Bird (épuisé)",
    eventId: "evt_jzb_robbie",
    at: offsetMin(60 * 24),
  },
];

const series24h = [
  6, 4, 8, 5, 12, 14, 18, 22, 28, 24, 32, 38, 42, 48, 56, 64, 70, 78, 72, 68,
  58, 44, 32, 18,
];

export function getOrganizerOverview(): OverviewData {
  return {
    organizer: {
      firstName: "Mido",
      venueName: "Jazzablanca",
      greetingClause: "La 19e édition se prépare bien.",
      greetingSubline:
        "Phase 2 active sur 4 pass. 3 demandes de remboursement en attente.",
    },
    headline: {
      mode: "preparing",
      eventName: "Jazzablanca 2026 — Anfa Park",
      dateRangeLabel: "02 → 11 juillet 2026",
      daysUntil: 67,
      phaseCurrent: 2,
      phaseTotal: 4,
      phaseProgress: 0.3,
      salesPhaseLabel: "Ventes Phase 2",
      salesPhaseValue: 4280,
      consolidatedRevenueLabel: "Recette consolidée",
      consolidatedRevenueMad: 3_240_000,
    },
    ticketsToday: {
      count: series24h.reduce((s, n) => s + n, 0),
      deltaPctVsYesterday: 22.4,
      series24h,
    },
    revenueWeek: {
      amountMad: 412_800,
      deltaPctVsLastWeek: 14.6,
    },
    upcomingEventsCount: upcomingEvents.filter((e) => e.status === "live")
      .length,
    nextPayout: {
      amountMad: 184_500,
      scheduledFor: futureDays(2),
    },
    upcomingEvents,
    activity,
  };
}
