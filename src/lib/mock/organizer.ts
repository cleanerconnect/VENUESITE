// Realistic French event data — real-feeling venues and acts.
// Returns OverviewData shape for direct consumption by the dashboard.

import type {
  ActivityItem,
  LyfeEvent,
  OverviewData,
  Venue,
} from "@/lib/types/domain";

// Stable "now" so relative timestamps in the demo are coherent.
const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();
const futureH = (h: number) => new Date(NOW + h * 3600_000).toISOString();

const venues: Venue[] = [
  {
    id: "v_mansour",
    name: "Rooftop Mansour",
    address: "27 av. de la Mer",
    city: "Casablanca",
    capacity: 320,
    ice: "002384719000045",
    rc: "284711",
  },
  {
    id: "v_theatre_m6",
    name: "Théâtre Mohammed VI",
    address: "Rond-point Hassan II",
    city: "Casablanca",
    capacity: 1800,
  },
  {
    id: "v_scene_casa",
    name: "La Scène Casa",
    address: "Quartier Gauthier",
    city: "Casablanca",
    capacity: 220,
  },
  {
    id: "v_jardin",
    name: "Le Jardin Sonore",
    address: "Av. Hassan II",
    city: "Marrakech",
    capacity: 800,
  },
];

const upcomingEvents: LyfeEvent[] = [
  {
    id: "evt_afro_apr",
    name: "Soirée Afrobeats au Rooftop Mansour",
    description:
      "Une nuit afrobeats sur le rooftop. DJ set et performances live, vue sur la corniche.",
    category: "club_night",
    venue: venues[0],
    startsAt: futureH(2),
    endsAt: futureH(8),
    agePolicy: "21+",
    dressCode: "Smart casual",
    refundPolicy: "auto",
    coverUrl: "/covers/afro.jpg",
    status: "live",
    createdAt: offsetMin(60 * 24 * 9),
    pageViews: 4280,
    tiers: [
      {
        id: "t_eb",
        name: "Early Bird",
        faceValueMad: 200,
        quantity: 80,
        sold: 80,
        saleStart: offsetMin(60 * 24 * 14),
        saleEnd: offsetMin(60 * 24 * 7),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_gen",
        name: "General",
        faceValueMad: 280,
        quantity: 200,
        sold: 158,
        saleStart: offsetMin(60 * 24 * 7),
        saleEnd: futureH(2),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_vip",
        name: "VIP Lounge",
        faceValueMad: 600,
        quantity: 40,
        sold: 22,
        saleStart: offsetMin(60 * 24 * 7),
        saleEnd: futureH(2),
        maxPerOrder: 4,
        transferable: false,
      },
    ],
  },
  {
    id: "evt_hindi_zahra",
    name: "Concert Hindi Zahra — Théâtre Mohammed VI",
    description:
      "Concert acoustique exceptionnel dans la salle principale. Première partie surprise.",
    category: "concert",
    venue: venues[1],
    startsAt: futureH(24 * 6),
    endsAt: futureH(24 * 6 + 3),
    agePolicy: "all",
    refundPolicy: "manual",
    coverUrl: "/covers/hindi.jpg",
    status: "live",
    createdAt: offsetMin(60 * 24 * 18),
    pageViews: 12400,
    tiers: [
      {
        id: "t_h_balcony",
        name: "Balcon",
        faceValueMad: 350,
        quantity: 600,
        sold: 410,
        saleStart: offsetMin(60 * 24 * 30),
        saleEnd: futureH(24 * 6),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_h_orch",
        name: "Orchestre",
        faceValueMad: 600,
        quantity: 800,
        sold: 612,
        saleStart: offsetMin(60 * 24 * 30),
        saleEnd: futureH(24 * 6),
        maxPerOrder: 4,
        transferable: true,
      },
      {
        id: "t_h_carre",
        name: "Carré Or",
        faceValueMad: 1200,
        quantity: 120,
        sold: 86,
        saleStart: offsetMin(60 * 24 * 30),
        saleEnd: futureH(24 * 6),
        maxPerOrder: 2,
        transferable: false,
      },
    ],
  },
  {
    id: "evt_open_mic",
    name: "Open Mic Comedy — La Scène Casa",
    description:
      "Soirée stand-up découverte. Six artistes émergents, un line-up à confirmer le jour J.",
    category: "comedy",
    venue: venues[2],
    startsAt: futureH(24 * 12),
    endsAt: futureH(24 * 12 + 3),
    agePolicy: "all",
    refundPolicy: "auto",
    coverUrl: "/covers/comedy.jpg",
    status: "pending",
    createdAt: offsetMin(60 * 4),
    pageViews: 0,
    tiers: [
      {
        id: "t_om_gen",
        name: "General",
        faceValueMad: 80,
        quantity: 200,
        sold: 0,
        saleStart: futureH(24),
        saleEnd: futureH(24 * 12),
        maxPerOrder: 4,
        transferable: true,
      },
    ],
  },
  {
    id: "evt_jardin_may",
    name: "Festival d'ouverture — Jardin Sonore",
    description:
      "Trois scènes, dix artistes, une nuit. Lancement de la saison à Marrakech.",
    category: "festival",
    venue: venues[3],
    startsAt: futureH(24 * 18),
    endsAt: futureH(24 * 18 + 8),
    agePolicy: "18+",
    refundPolicy: "manual",
    coverUrl: "/covers/jardin.jpg",
    status: "draft",
    createdAt: offsetMin(60 * 12),
    pageViews: 0,
    tiers: [],
  },
];

const activity: ActivityItem[] = [
  {
    id: "a1",
    type: "purchase",
    actor: "Sara Madini",
    message: "a acheté 2 billets General · Soirée Afrobeats",
    eventId: "evt_afro_apr",
    at: offsetMin(0.5),
  },
  {
    id: "a2",
    type: "purchase",
    actor: "Anissa Tazi",
    message: "a acheté 1 billet VIP Lounge · 600 MAD",
    eventId: "evt_afro_apr",
    at: offsetMin(2),
  },
  {
    id: "a3",
    type: "transfer",
    actor: "Youssef Belkadi",
    message: "a transféré son billet à Reda Hammoumi",
    eventId: "evt_afro_apr",
    at: offsetMin(7),
  },
  {
    id: "a4",
    type: "refund",
    actor: "Karim Lahlou",
    message: "remboursement approuvé — 280 MAD",
    eventId: "evt_afro_apr",
    at: offsetMin(18),
  },
  {
    id: "a5",
    type: "purchase",
    actor: "Mehdi Raji",
    message: "a acheté 4 billets General",
    eventId: "evt_afro_apr",
    at: offsetMin(34),
  },
  {
    id: "a6",
    type: "moderation",
    actor: "Équipe LYFE",
    message: "Open Mic Comedy en file de modération",
    eventId: "evt_open_mic",
    at: offsetMin(60 * 4),
  },
  {
    id: "a7",
    type: "purchase",
    actor: "Layla Fassi",
    message: "a acheté 2 billets Balcon · Hindi Zahra",
    eventId: "evt_hindi_zahra",
    at: offsetMin(60 * 5),
  },
  {
    id: "a8",
    type: "purchase",
    actor: "Hicham El Idrissi",
    message: "a acheté 1 billet Carré Or — 1 200 MAD",
    eventId: "evt_hindi_zahra",
    at: offsetMin(60 * 7),
  },
  {
    id: "a9",
    type: "scan",
    actor: "Hamza (équipe d'accueil)",
    message: "premier scan test effectué",
    eventId: "evt_afro_apr",
    at: offsetMin(60 * 12),
  },
  {
    id: "a10",
    type: "purchase",
    actor: "Nadia El Amrani",
    message: "a acheté 2 billets Early Bird (sold out)",
    eventId: "evt_afro_apr",
    at: offsetMin(60 * 24),
  },
];

// Looks like a 24-bucket sparkline of bookings throughout the day.
const series24h = [
  0, 0, 1, 0, 2, 1, 3, 4, 6, 5, 8, 12, 9, 14, 18, 22, 20, 24, 19, 16, 12, 8, 5,
  3,
];

export function getOrganizerOverview(): OverviewData {
  const tonight = upcomingEvents[0];
  const tonightSold = tonight.tiers.reduce((s, t) => s + t.sold, 0);
  const tonightCap = tonight.tiers.reduce((s, t) => s + t.quantity, 0);
  const tonightRevenue = tonight.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );

  return {
    organizer: {
      firstName: "Mido",
      venueName: "Rooftop Mansour",
      confirmedRate: 0.78,
      noShowsToday: 2,
    },
    tonight: {
      soldTickets: tonightSold,
      capacity: tonightCap,
      revenueMad: tonightRevenue,
      eventName: tonight.name,
      eventStartsAt: tonight.startsAt,
    },
    ticketsToday: {
      count: series24h.reduce((s, n) => s + n, 0),
      deltaPctVsYesterday: 18.4,
      series24h,
    },
    revenueWeek: {
      amountMad: 41280,
      deltaPctVsLastWeek: 12.6,
    },
    upcomingEventsCount: upcomingEvents.filter((e) => e.status === "live")
      .length,
    nextPayout: {
      amountMad: 12450,
      scheduledFor: futureH(24 * 2),
    },
    upcomingEvents,
    activity,
  };
}
