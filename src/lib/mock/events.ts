// Detail data for the Event Detail / Attendees / Refunds / Scanner / Promote
// tabs. Mirrors what GET /events/{id}/* would return.

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
const futureH = (h: number) => new Date(NOW + h * 3600_000).toISOString();

export function getEventById(id: string): LyfeEvent | undefined {
  return getOrganizerOverview().upcomingEvents.find((e) => e.id === id);
}

export function getAllEvents(): LyfeEvent[] {
  const base = getOrganizerOverview().upcomingEvents;
  // Add a past + a rejected event for the My Events list.
  const past: LyfeEvent = {
    id: "evt_past_mar",
    name: "Soirée Afrobeats — Édition de mars",
    description: "Édition complète, sold out 6h après mise en vente.",
    category: "club_night",
    venue: base[0].venue,
    startsAt: offsetMin(60 * 24 * 30),
    endsAt: offsetMin(60 * 24 * 30 - 7 * 60),
    agePolicy: "21+",
    refundPolicy: "auto",
    coverUrl: "/covers/past.jpg",
    status: "past",
    createdAt: offsetMin(60 * 24 * 60),
    pageViews: 7800,
    tiers: [
      {
        id: "t_pm_gen",
        name: "General",
        faceValueMad: 250,
        quantity: 320,
        sold: 320,
        saleStart: offsetMin(60 * 24 * 60),
        saleEnd: offsetMin(60 * 24 * 30),
        maxPerOrder: 6,
        transferable: true,
      },
    ],
  };
  const rejected: LyfeEvent = {
    id: "evt_rejected_after",
    name: "After-party privé — Mansour",
    description: "Soirée VIP confidentielle.",
    category: "club_night",
    venue: base[0].venue,
    startsAt: futureH(24 * 4),
    endsAt: futureH(24 * 4 + 5),
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

// 30-day revenue series for the Sales tab Recharts area.
export function getRevenueSeries(): RevenuePoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    day: new Date(NOW - (29 - i) * 24 * 60 * 60_000).toISOString(),
    amount: Math.round(
      900 + Math.sin(i / 3) * 600 + i * 130 + (i > 24 ? 2400 : 0),
    ),
  }));
}

// Realistic attendee list for the Attendees tab.
export function getAttendees(): Attendee[] {
  return [
    {
      id: "att_1",
      name: "Sara Madini",
      phone: "+212 661 23 45 67",
      email: "sara.m@example.ma",
      tierId: "t_gen",
      tierName: "General",
      purchaseDate: offsetMin(60 * 24 * 4),
      qrStatus: "unused",
    },
    {
      id: "att_2",
      name: "Youssef Belkadi",
      phone: "+212 662 11 22 33",
      email: "youssef.b@example.ma",
      tierId: "t_gen",
      tierName: "General",
      purchaseDate: offsetMin(60 * 24 * 6),
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
      purchaseDate: offsetMin(34),
      qrStatus: "unused",
    },
    {
      id: "att_4",
      name: "Karim Lahlou",
      phone: "+212 664 12 34 56",
      email: "karim.l@example.ma",
      tierId: "t_gen",
      tierName: "General",
      purchaseDate: offsetMin(60 * 24 * 5),
      qrStatus: "scanned",
      scannedAt: offsetMin(80),
    },
    {
      id: "att_5",
      name: "Mehdi Raji",
      phone: "+212 665 78 90 12",
      email: "mehdi.r@example.ma",
      tierId: "t_gen",
      tierName: "General",
      purchaseDate: offsetMin(72),
      qrStatus: "unused",
    },
    {
      id: "att_6",
      name: "Layla Fassi",
      phone: "+212 666 11 99 88",
      email: "layla.f@example.ma",
      tierId: "t_eb",
      tierName: "Early Bird",
      purchaseDate: offsetMin(60 * 24 * 9),
      qrStatus: "unused",
    },
    {
      id: "att_7",
      name: "Hicham El Idrissi",
      phone: "+212 667 33 44 55",
      email: "hicham.e@example.ma",
      tierId: "t_vip",
      tierName: "VIP Lounge",
      purchaseDate: offsetMin(60 * 24 * 2),
      qrStatus: "scanned",
      scannedAt: offsetMin(60),
    },
    {
      id: "att_8",
      name: "Nadia El Amrani",
      phone: "+212 668 77 66 55",
      email: "nadia.a@example.ma",
      tierId: "t_eb",
      tierName: "Early Bird",
      purchaseDate: offsetMin(60 * 24 * 11),
      qrStatus: "unused",
    },
  ];
}

// Refund queue — three pending of varied SLA pressure, plus history.
export function getRefundRequests(): RefundRequest[] {
  return [
    {
      id: "ref_1",
      buyerName: "Nadia El Amrani",
      tierName: "General",
      amountMad: 280,
      requestedAt: offsetMin(60 * 6),
      reason:
        "Empêchement de dernière minute, déplacement professionnel imprévu.",
      status: "pending",
      slaExpiresAt: futureH(42),
    },
    {
      id: "ref_2",
      buyerName: "Omar Benjelloun",
      tierName: "VIP Lounge",
      amountMad: 600,
      requestedAt: offsetMin(60 * 18),
      reason: "Conflit d'agenda — engagement familial.",
      status: "pending",
      slaExpiresAt: futureH(30),
    },
    {
      id: "ref_3",
      buyerName: "Salma Idrissi",
      tierName: "General",
      amountMad: 280,
      requestedAt: offsetMin(60 * 46),
      reason: "Maladie attestée par certificat médical.",
      status: "pending",
      slaExpiresAt: futureH(2), // hot — under 12h
    },
    {
      id: "ref_4",
      buyerName: "Karim Lahlou",
      tierName: "General",
      amountMad: 280,
      requestedAt: offsetMin(60 * 24 * 2),
      reason: "Plus disponible le soir de l'événement.",
      status: "approved",
      resolvedAt: offsetMin(60 * 18),
      slaExpiresAt: offsetMin(0),
    },
    {
      id: "ref_5",
      buyerName: "Sami El Yacoubi",
      tierName: "Early Bird",
      amountMad: 200,
      requestedAt: offsetMin(60 * 24 * 4),
      reason: "Hors fenêtre 48h.",
      status: "denied",
      resolvedAt: offsetMin(60 * 24 * 3),
      slaExpiresAt: offsetMin(0),
    },
  ];
}

// Live scan log — last 10 entries, fresh ones up top.
export function getScanLog(): ScanLog[] {
  const log = (i: number, name: string, code: string, staff: string) => ({
    id: `s_${i}`,
    code,
    staff,
    attendeeName: name,
    at: offsetMin(0.3 + i * 1.7),
  });
  return [
    log(0, "Karim Lahlou", "LYFE-7821-AC9D", "Hamza"),
    log(1, "Hicham El Idrissi", "LYFE-7821-7H2K", "Hamza"),
    log(2, "Reda Hammoumi", "LYFE-7821-2V8L", "Imane"),
    log(3, "Sami El Yacoubi", "LYFE-7821-9P3R", "Hamza"),
    log(4, "Lina Benbrahim", "LYFE-7821-5T7M", "Imane"),
    log(5, "Yasmine Cherkaoui", "LYFE-7821-X4Z2", "Hamza"),
    log(6, "Othmane Tazi", "LYFE-7821-4K8B", "Imane"),
  ];
}
