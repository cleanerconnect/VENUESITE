// Settlements + invoices for /settlements, Jazzablanca scale.

import type { Invoice, Payout } from "@/lib/types/domain";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetDays = (d: number) => new Date(NOW - d * 24 * 3600_000).toISOString();
const futureDays = (d: number) => new Date(NOW + d * 24 * 3600_000).toISOString();

export function getPayouts(): Payout[] {
  return [
    {
      id: "po_next",
      amountMad: 184_500,
      scheduledFor: futureDays(2),
      status: "scheduled",
      reference: "LYFE-PAY-2026-04-29-001",
      eventNames: ["Jazzablanca 2026, Phase 2 (semaine du 18 → 24 avril)"],
      ticketCount: 412,
      statementUrl: "#",
    },
    {
      id: "po_1",
      amountMad: 1_240_000,
      scheduledFor: offsetDays(28),
      paidAt: offsetDays(28),
      status: "paid",
      reference: "LYFE-PAY-2026-03-29-001",
      eventNames: ["Jazzablanca 2026, Early Bird"],
      ticketCount: 3_280,
      statementUrl: "#",
    },
    {
      id: "po_2",
      amountMad: 728_400,
      scheduledFor: offsetDays(58),
      paidAt: offsetDays(58),
      status: "paid",
      reference: "LYFE-PAY-2026-02-26-001",
      eventNames: ["Jazzablanca 2026, Pré-vente fidèles"],
      ticketCount: 1_880,
      statementUrl: "#",
    },
    {
      id: "po_3",
      amountMad: 4_320_000,
      scheduledFor: offsetDays(280),
      paidAt: offsetDays(280),
      status: "paid",
      reference: "LYFE-PAY-2024-07-15-001",
      eventNames: ["Jazzablanca 2024, Recettes consolidées"],
      ticketCount: 9_000,
      statementUrl: "#",
    },
  ];
}

export function getInvoices(): Invoice[] {
  return [
    {
      id: "inv_1",
      number: "LYFE-COM-2026-03-001",
      issuedAt: offsetDays(28),
      amountMad: 49_600,
      description: "Commission LYFE 4 %, Jazzablanca Early Bird",
      pdfUrl: "#",
    },
    {
      id: "inv_2",
      number: "LYFE-COM-2026-02-001",
      issuedAt: offsetDays(58),
      amountMad: 29_136,
      description: "Commission LYFE 4 %, Pré-vente fidèles",
      pdfUrl: "#",
    },
    {
      id: "inv_3",
      number: "LYFE-COM-2024-07-001",
      issuedAt: offsetDays(280),
      amountMad: 172_800,
      description: "Commission LYFE 4 %, Édition 2024",
      pdfUrl: "#",
    },
  ];
}
