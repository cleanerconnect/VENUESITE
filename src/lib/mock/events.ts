// Detail data for the Event Detail / Attendees / Refunds / Scanner / Promote
// tabs. Mirrors what GET /events/{id}/* would return.
// Demo organizer is Jazzablanca, all events here are festival passes.

import type {
  Attendee,
  LyfeEvent,
  RefundRequest,
  RevenuePoint,
  ScanLog,
} from "@/lib/types/domain";
import { getOrganizerOverview } from "./organizer";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();
const offsetDays = (d: number) =>
  new Date(NOW - d * 24 * 3600_000).toISOString();
const futureDays = (d: number) =>
  new Date(NOW + d * 24 * 3600_000).toISOString();

export function getEventById(id: string): LyfeEvent | undefined {
  return getOrganizerOverview().upcomingEvents.find((e) => e.id === id);
}

export function getAllEvents(): LyfeEvent[] {
  const base = getOrganizerOverview().upcomingEvents;
  // Past edition (2024 demo data)
  const past: LyfeEvent = {
    id: "evt_jzb_2024_diana",
    name: "Diana Krall, Jazzablanca 2024",
    description: "Édition 2024, soirée signature, complète.",
    category: "concert",
    venue: base[0].venue,
    startsAt: offsetDays(280),
    endsAt: offsetDays(280),
    agePolicy: "all",
    refundPolicy: "auto",
    coverUrl: "/covers/past.jpg",
    status: "past",
    createdAt: offsetDays(360),
    pageViews: 156_000,
    tiers: [
      {
        id: "t_diana_pass",
        name: "Pass Jour",
        faceValueMad: 480,
        quantity: 9000,
        sold: 9000,
        saleStart: offsetDays(360),
        saleEnd: offsetDays(280),
        maxPerOrder: 6,
        transferable: true,
      },
    ],
  };
  const rejected: LyfeEvent = {
    id: "evt_jzb_after_rej",
    name: "After-party VIP, Anfa Beach Club",
    description: "Soirée privée post-Jazzablanca.",
    category: "club_night",
    venue: base[0].venue,
    startsAt: futureDays(78),
    endsAt: futureDays(78),
    agePolicy: "21+",
    refundPolicy: "manual",
    coverUrl: "/covers/rej.jpg",
    status: "rejected",
    rejectionReason:
      "Photo de couverture floue et description trop courte. Merci d'ajouter une description de 500 caractères minimum et une image en 1080×1350.",
    createdAt: offsetMin(60 * 24 * 2),
    pageViews: 0,
    tiers: [],
  };
  return [...base, past, rejected];
}

// 30-day revenue series, Jazzablanca scale (much higher daily ranges).
export function getRevenueSeries(): RevenuePoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    day: new Date(NOW - (29 - i) * 24 * 60 * 60_000).toISOString(),
    amount: Math.round(
      18_000 + Math.sin(i / 3) * 8_000 + i * 2_400 + (i > 24 ? 38_000 : 0),
    ),
  }));
}

// Attendees, Jazzablanca pass holders. Bilingual mix (FR / MA names).
export function getAttendees(): Attendee[] {
  return [
    {
      id: "att_1",
      name: "Yasmine Bennani",
      phone: "+212 661 23 45 67",
      email: "yasmine.b@example.ma",
      tierId: "t_robbie_gen",
      tierName: "Pass Jour · General",
      purchaseDate: offsetMin(60 * 24 * 4),
      qrStatus: "unused",
    },
    {
      id: "att_2",
      name: "Karim Lahlou",
      phone: "+212 662 11 22 33",
      email: "karim.l@example.ma",
      tierId: "t_robbie_gen",
      tierName: "Pass Jour · General",
      purchaseDate: offsetMin(60 * 24 * 6),
      qrStatus: "transferred",
      transferredTo: "Reda Hammoumi",
      originalBuyer: "Karim Lahlou",
    },
    {
      id: "att_3",
      name: "Sophie Renaud",
      phone: "+33 6 12 34 56 78",
      email: "sophie.r@example.fr",
      tierId: "t_jorja_we",
      tierName: "Pass Week-End 2",
      purchaseDate: offsetMin(34),
      qrStatus: "unused",
    },
    {
      id: "att_4",
      name: "Hicham El Idrissi",
      phone: "+212 664 12 34 56",
      email: "hicham.e@example.ma",
      tierId: "t_robbie_carre",
      tierName: "Carré Or",
      purchaseDate: offsetMin(60 * 24 * 5),
      qrStatus: "scanned",
      scannedAt: offsetMin(80),
    },
    {
      id: "att_5",
      name: "Mehdi Raji",
      phone: "+212 665 78 90 12",
      email: "mehdi.r@example.ma",
      tierId: "t_robbie_gen",
      tierName: "Pass Jour · General",
      purchaseDate: offsetMin(72),
      qrStatus: "unused",
    },
    {
      id: "att_6",
      name: "Layla Fassi",
      phone: "+212 666 11 99 88",
      email: "layla.f@example.ma",
      tierId: "t_robbie_eb",
      tierName: "Pass Jour · Early Bird",
      purchaseDate: offsetMin(60 * 24 * 9),
      qrStatus: "unused",
    },
    {
      id: "att_7",
      name: "Anissa Tazi",
      phone: "+212 667 33 44 55",
      email: "anissa.t@example.ma",
      tierId: "t_riles_pass",
      tierName: "Pass Semaine 1",
      purchaseDate: offsetMin(60 * 24 * 2),
      qrStatus: "scanned",
      scannedAt: offsetMin(60),
    },
    {
      id: "att_8",
      name: "Nadia El Amrani",
      phone: "+212 668 77 66 55",
      email: "nadia.a@example.ma",
      tierId: "t_robbie_eb",
      tierName: "Pass Jour · Early Bird",
      purchaseDate: offsetMin(60 * 24 * 11),
      qrStatus: "unused",
    },
  ];
}

// Refund queue, Jazzablanca-tier amounts (Carré Or, Pass Semaine).
export function getRefundRequests(): RefundRequest[] {
  return [
    {
      id: "ref_1",
      buyerName: "Nadia El Amrani",
      tierName: "Pass Jour · General",
      amountMad: 590,
      requestedAt: offsetMin(60 * 6),
      reason:
        "Empêchement de dernière minute, déplacement professionnel imprévu.",
      status: "pending",
      slaExpiresAt: futureDays(2),
    },
    {
      id: "ref_2",
      buyerName: "Omar Benjelloun",
      tierName: "Carré Or",
      amountMad: 1200,
      requestedAt: offsetMin(60 * 18),
      reason: "Conflit d'agenda, engagement familial.",
      status: "pending",
      slaExpiresAt: futureDays(1),
    },
    {
      id: "ref_3",
      buyerName: "Salma Idrissi",
      tierName: "Pass Semaine 1",
      amountMad: 1400,
      requestedAt: offsetMin(60 * 46),
      reason: "Maladie attestée par certificat médical.",
      status: "pending",
      slaExpiresAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
    },
    {
      id: "ref_4",
      buyerName: "Karim Lahlou",
      tierName: "Pass Jour · General",
      amountMad: 590,
      requestedAt: offsetMin(60 * 24 * 2),
      reason: "Plus disponible le jour de l'événement.",
      status: "approved",
      resolvedAt: offsetMin(60 * 18),
      slaExpiresAt: offsetMin(0),
    },
    {
      id: "ref_5",
      buyerName: "Sami El Yacoubi",
      tierName: "Pass Jour · Early Bird",
      amountMad: 380,
      requestedAt: offsetMin(60 * 24 * 4),
      reason: "Hors fenêtre 48h.",
      status: "denied",
      resolvedAt: offsetMin(60 * 24 * 3),
      slaExpiresAt: offsetMin(0),
    },
  ];
}

// Scan log, door-day data (drawn from the 2024 edition for the demo).
export function getScanLog(): ScanLog[] {
  const log = (i: number, name: string, code: string, staff: string) => ({
    id: `s_${i}`,
    code,
    staff,
    attendeeName: name,
    at: offsetMin(0.3 + i * 1.7),
  });
  return [
    log(0, "Hicham El Idrissi", "JZB-9402-AC9D", "Hamza"),
    log(1, "Anissa Tazi", "JZB-9402-7H2K", "Hamza"),
    log(2, "Reda Hammoumi", "JZB-9402-2V8L", "Imane"),
    log(3, "Sami El Yacoubi", "JZB-9402-9P3R", "Hamza"),
    log(4, "Lina Benbrahim", "JZB-9402-5T7M", "Imane"),
    log(5, "Yasmine Cherkaoui", "JZB-9402-X4Z2", "Hamza"),
    log(6, "Othmane Tazi", "JZB-9402-4K8B", "Imane"),
  ];
}
