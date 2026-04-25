// Placeholder dataset shaped exactly like the eventual API responses.
// When DigiNegoce wires the backend, these exports get replaced by
// fetch calls returning the same shape — components stay untouched.

import type {
  ActivityItem,
  Attendee,
  AuditEntry,
  Invoice,
  LyfeEvent,
  Payout,
  RefundRequest,
  TeamMember,
  Venue,
} from "./types";

// Stable "now" so that all relative timestamps look coherent in the demo.
const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offset = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const future = (hours: number) => new Date(NOW + hours * 60 * 60_000).toISOString();

export const venues: Venue[] = [
  {
    id: "v_blend",
    name: "Blend Rooftop",
    address: "Bd de la Corniche",
    city: "Casablanca",
    capacity: 420,
    ice: "002384719000045",
    rc: "284711",
  },
  {
    id: "v_jardin",
    name: "Le Jardin Sonore",
    address: "Av. Hassan II",
    city: "Marrakech",
    capacity: 800,
  },
  {
    id: "v_studio",
    name: "Studio 21",
    address: "Quartier Gauthier",
    city: "Casablanca",
    capacity: 250,
  },
];

export const events: LyfeEvent[] = [
  {
    id: "evt_blend_apr",
    name: "Blend Sunset Sessions · vol. 12",
    description:
      "Soirée house and afro-electronic sur le rooftop de Blend. Line-up local et international.",
    category: "club_night",
    venue: venues[0],
    startsAt: future(60),
    endsAt: future(67),
    agePolicy: "21+",
    dressCode: "Smart casual",
    refundPolicy: "auto",
    coverUrl: "/images/cover-1.jpg",
    galleryUrls: [],
    artists: [
      { id: "a1", name: "Amine K", role: "Headliner" },
      { id: "a2", name: "Driss Bennis", role: "Support" },
    ],
    status: "live",
    createdAt: offset(60 * 24 * 7),
    pageViews: 3420,
    tiers: [
      {
        id: "t_eb",
        name: "Early Bird",
        faceValueMad: 200,
        quantity: 80,
        sold: 80,
        saleStart: offset(60 * 24 * 14),
        saleEnd: offset(60 * 24 * 7),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_gen",
        name: "General",
        faceValueMad: 280,
        quantity: 260,
        sold: 184,
        saleStart: offset(60 * 24 * 7),
        saleEnd: future(60),
        maxPerOrder: 6,
        transferable: true,
      },
      {
        id: "t_vip",
        name: "VIP Lounge",
        faceValueMad: 600,
        quantity: 40,
        sold: 22,
        saleStart: offset(60 * 24 * 7),
        saleEnd: future(60),
        maxPerOrder: 4,
        transferable: false,
      },
    ],
  },
  {
    id: "evt_jardin_may",
    name: "Jardin Sonore · Festival d'ouverture",
    description:
      "Trois scènes, dix artistes, une nuit. Lancement de la saison à Marrakech.",
    category: "festival",
    venue: venues[1],
    startsAt: future(24 * 12),
    endsAt: future(24 * 12 + 8),
    agePolicy: "18+",
    refundPolicy: "manual",
    coverUrl: "/images/cover-2.jpg",
    galleryUrls: [],
    artists: [],
    status: "pending",
    createdAt: offset(60 * 6),
    pageViews: 0,
    tiers: [
      {
        id: "t_jardin_gen",
        name: "Pass 1 jour",
        faceValueMad: 350,
        quantity: 600,
        sold: 0,
        saleStart: future(24),
        saleEnd: future(24 * 12),
        maxPerOrder: 6,
        transferable: true,
      },
    ],
  },
  {
    id: "evt_studio_draft",
    name: "Studio 21 · Open Mic Comedy",
    description: "Brouillon — line-up à confirmer.",
    category: "comedy",
    venue: venues[2],
    startsAt: future(24 * 20),
    endsAt: future(24 * 20 + 3),
    agePolicy: "all",
    refundPolicy: "auto",
    coverUrl: "/images/cover-3.jpg",
    galleryUrls: [],
    artists: [],
    status: "draft",
    createdAt: offset(60 * 2),
    pageViews: 0,
    tiers: [
      {
        id: "t_om_gen",
        name: "General",
        faceValueMad: 80,
        quantity: 200,
        sold: 0,
        saleStart: future(48),
        saleEnd: future(24 * 20),
        maxPerOrder: 4,
        transferable: true,
      },
    ],
  },
  {
    id: "evt_blend_mar",
    name: "Blend Sunset Sessions · vol. 11",
    description: "Édition précédente, complète.",
    category: "club_night",
    venue: venues[0],
    startsAt: offset(60 * 24 * 30),
    endsAt: offset(60 * 24 * 30 - 7 * 60),
    agePolicy: "21+",
    refundPolicy: "auto",
    coverUrl: "/images/cover-4.jpg",
    galleryUrls: [],
    artists: [],
    status: "past",
    createdAt: offset(60 * 24 * 60),
    pageViews: 5800,
    tiers: [
      {
        id: "t11_gen",
        name: "General",
        faceValueMad: 250,
        quantity: 380,
        sold: 380,
        saleStart: offset(60 * 24 * 60),
        saleEnd: offset(60 * 24 * 30),
        maxPerOrder: 6,
        transferable: true,
      },
    ],
  },
  {
    id: "evt_rejected",
    name: "After-party privé",
    description: "Soirée VIP confidentielle.",
    category: "club_night",
    venue: venues[2],
    startsAt: future(24 * 5),
    endsAt: future(24 * 5 + 5),
    agePolicy: "21+",
    refundPolicy: "manual",
    coverUrl: "/images/cover-5.jpg",
    galleryUrls: [],
    artists: [],
    status: "rejected",
    rejectionReason:
      "Photo de couverture floue et description incomplète. Merci d'ajouter une description de 500 caractères minimum et une image en 1080×1350.",
    createdAt: offset(60 * 24 * 2),
    pageViews: 0,
    tiers: [],
  },
];

export const activity: ActivityItem[] = [
  {
    id: "a1",
    type: "purchase",
    message: "Sara M. a acheté 2 billets pour Blend Sunset Sessions · vol. 12",
    eventId: "evt_blend_apr",
    at: offset(2),
  },
  {
    id: "a2",
    type: "transfer",
    message: "Billet transféré à Youssef B. (Blend Sunset Sessions · vol. 12)",
    eventId: "evt_blend_apr",
    at: offset(7),
  },
  {
    id: "a3",
    type: "refund",
    message: "Remboursement approuvé pour Karim L. — 280 MAD",
    eventId: "evt_blend_apr",
    at: offset(18),
  },
  {
    id: "a4",
    type: "purchase",
    message: "Anissa T. a acheté 1 billet VIP Lounge — 600 MAD",
    eventId: "evt_blend_apr",
    at: offset(34),
  },
  {
    id: "a5",
    type: "moderation",
    message: "Jardin Sonore · Festival d'ouverture est en file de modération",
    eventId: "evt_jardin_may",
    at: offset(60 * 6),
  },
  {
    id: "a6",
    type: "purchase",
    message: "Mehdi R. a acheté 4 billets General",
    eventId: "evt_blend_apr",
    at: offset(72),
  },
  {
    id: "a7",
    type: "scan",
    message: "Premier scan test effectué par l'équipe d'accueil",
    eventId: "evt_blend_mar",
    at: offset(60 * 24 * 30),
  },
  {
    id: "a8",
    type: "purchase",
    message: "Layla F. a acheté 2 billets",
    eventId: "evt_blend_apr",
    at: offset(120),
  },
  {
    id: "a9",
    type: "transfer",
    message: "Billet transféré à Reda H.",
    eventId: "evt_blend_apr",
    at: offset(180),
  },
  {
    id: "a10",
    type: "purchase",
    message: "Hicham E. a acheté 1 billet General",
    eventId: "evt_blend_apr",
    at: offset(240),
  },
];

export const attendees: Attendee[] = [
  {
    id: "att_1",
    name: "Sara Madini",
    phone: "+212 661 23 45 67",
    email: "sara.m@example.ma",
    tierId: "t_gen",
    tierName: "General",
    purchaseDate: offset(60 * 24 * 4),
    qrStatus: "unused",
  },
  {
    id: "att_2",
    name: "Youssef Belkadi",
    phone: "+212 662 11 22 33",
    email: "youssef.b@example.ma",
    tierId: "t_gen",
    tierName: "General",
    purchaseDate: offset(60 * 24 * 6),
    qrStatus: "transferred",
    transferredTo: "Reda Hammoumi",
    originalBuyer: "Youssef Belkadi",
  },
  {
    id: "att_3",
    name: "Anissa Tazi",
    phone: "+212 663 99 88 77",
    email: "anissa.t@example.ma",
    tierId: "t_vip",
    tierName: "VIP Lounge",
    purchaseDate: offset(34),
    qrStatus: "unused",
  },
  {
    id: "att_4",
    name: "Karim Lahlou",
    phone: "+212 664 12 34 56",
    email: "karim.l@example.ma",
    tierId: "t_gen",
    tierName: "General",
    purchaseDate: offset(60 * 24 * 5),
    qrStatus: "scanned",
    scannedAt: offset(60 * 24 * 30),
  },
  {
    id: "att_5",
    name: "Mehdi Raji",
    phone: "+212 665 78 90 12",
    email: "mehdi.r@example.ma",
    tierId: "t_gen",
    tierName: "General",
    purchaseDate: offset(72),
    qrStatus: "unused",
  },
  {
    id: "att_6",
    name: "Layla Fassi",
    phone: "+212 666 11 99 88",
    email: "layla.f@example.ma",
    tierId: "t_eb",
    tierName: "Early Bird",
    purchaseDate: offset(60 * 24 * 9),
    qrStatus: "unused",
  },
];

export const refundRequests: RefundRequest[] = [
  {
    id: "ref_1",
    buyerName: "Nadia El Amrani",
    tierName: "General",
    amountMad: 280,
    requestedAt: offset(60 * 6),
    reason: "Empêchement de dernière minute, déplacement professionnel.",
    status: "pending",
    slaExpiresAt: future(42),
  },
  {
    id: "ref_2",
    buyerName: "Omar Benjelloun",
    tierName: "VIP Lounge",
    amountMad: 600,
    requestedAt: offset(60 * 18),
    reason: "Conflit d'agenda.",
    status: "pending",
    slaExpiresAt: future(30),
  },
  {
    id: "ref_3",
    buyerName: "Karim Lahlou",
    tierName: "General",
    amountMad: 280,
    requestedAt: offset(60 * 24 * 2),
    reason: "Plus disponible le soir de l'événement.",
    status: "approved",
    resolvedAt: offset(60 * 18),
    slaExpiresAt: offset(0),
  },
];

export const payouts: Payout[] = [
  {
    id: "po_next",
    amountMad: 12450,
    scheduledFor: future(24 * 4),
    status: "scheduled",
    reference: "LYFE-PAY-2026-04-29-001",
    eventIds: ["evt_blend_apr"],
    ticketCount: 286,
    statementUrl: "#",
  },
  {
    id: "po_1",
    amountMad: 95000,
    scheduledFor: offset(60 * 24 * 27),
    paidAt: offset(60 * 24 * 27),
    status: "paid",
    reference: "LYFE-PAY-2026-03-29-001",
    eventIds: ["evt_blend_mar"],
    ticketCount: 380,
    statementUrl: "#",
  },
  {
    id: "po_2",
    amountMad: 41200,
    scheduledFor: offset(60 * 24 * 60),
    paidAt: offset(60 * 24 * 60),
    status: "paid",
    reference: "LYFE-PAY-2026-02-24-001",
    eventIds: [],
    ticketCount: 165,
    statementUrl: "#",
  },
];

export const invoices: Invoice[] = [
  {
    id: "inv_1",
    number: "LYFE-COM-2026-03-001",
    issuedAt: offset(60 * 24 * 27),
    amountMad: 3800,
    description: "Commission LYFE 4 % — Blend Sunset Sessions vol. 11",
    pdfUrl: "#",
  },
  {
    id: "inv_2",
    number: "LYFE-COM-2026-02-001",
    issuedAt: offset(60 * 24 * 60),
    amountMad: 1648,
    description: "Commission LYFE 4 % — événements de février 2026",
    pdfUrl: "#",
  },
];

export const team: TeamMember[] = [
  {
    id: "tm_1",
    name: "Yassine El Khalfi",
    email: "yassine@blend.ma",
    role: "owner",
    lastActive: offset(5),
  },
  {
    id: "tm_2",
    name: "Imane Cherkaoui",
    email: "imane@blend.ma",
    role: "admin",
    lastActive: offset(60 * 3),
  },
  {
    id: "tm_3",
    name: "Hamza Door Staff",
    email: "hamza.staff@blend.ma",
    role: "scanner",
    lastActive: offset(60 * 24 * 4),
  },
  {
    id: "tm_4",
    name: "Reda Bennani",
    email: "reda@example.ma",
    role: "scanner",
    lastActive: offset(60 * 24 * 7),
    pending: true,
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: "au_1",
    actor: "Yassine El Khalfi",
    action: "A invité Reda Bennani comme Scanner",
    at: offset(60 * 24 * 1),
  },
  {
    id: "au_2",
    actor: "Imane Cherkaoui",
    action: "A approuvé un remboursement pour Karim L.",
    at: offset(60 * 18),
  },
  {
    id: "au_3",
    actor: "Yassine El Khalfi",
    action: "A modifié les coordonnées bancaires (RIB)",
    at: offset(60 * 24 * 6),
  },
];

// Sparkline series — last 24 buckets, used by the "Tickets sold today" card.
export const ticketsTodaySpark: number[] = [
  0, 0, 1, 0, 2, 1, 3, 4, 6, 5, 8, 12, 9, 14, 18, 22, 20, 24, 19, 16, 12, 8, 5, 3,
];

// 30-day revenue series for the Event Detail Sales tab.
export const revenue30d: { day: string; amount: number }[] = Array.from(
  { length: 30 },
  (_, i) => ({
    day: new Date(NOW - (29 - i) * 24 * 60 * 60_000).toISOString(),
    amount: Math.round(800 + Math.sin(i / 3) * 500 + i * 120 + (i > 24 ? 2000 : 0)),
  }),
);

export function getEventById(id: string): LyfeEvent | undefined {
  return events.find((e) => e.id === id);
}
