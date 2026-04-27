// Settlements + invoices for /settlements.

import type { Invoice, Payout } from "@/lib/types/domain";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetDays = (d: number) => new Date(NOW - d * 24 * 3600_000).toISOString();
const futureDays = (d: number) => new Date(NOW + d * 24 * 3600_000).toISOString();

export function getPayouts(): Payout[] {
  return [
    {
      id: "po_next",
      amountMad: 12450,
      scheduledFor: futureDays(2),
      status: "scheduled",
      reference: "LYFE-PAY-2026-04-29-001",
      eventNames: ["Soirée Afrobeats au Rooftop Mansour"],
      ticketCount: 286,
      statementUrl: "#",
    },
    {
      id: "po_1",
      amountMad: 84000,
      scheduledFor: offsetDays(28),
      paidAt: offsetDays(28),
      status: "paid",
      reference: "LYFE-PAY-2026-03-29-001",
      eventNames: ["Soirée Afrobeats — Édition de mars"],
      ticketCount: 320,
      statementUrl: "#",
    },
    {
      id: "po_2",
      amountMad: 152400,
      scheduledFor: offsetDays(58),
      paidAt: offsetDays(58),
      status: "paid",
      reference: "LYFE-PAY-2026-02-26-001",
      eventNames: ["Concert Hindi Zahra (preview)", "Workshop production"],
      ticketCount: 462,
      statementUrl: "#",
    },
    {
      id: "po_3",
      amountMad: 41200,
      scheduledFor: offsetDays(90),
      paidAt: offsetDays(90),
      status: "paid",
      reference: "LYFE-PAY-2026-01-25-001",
      eventNames: ["Open Mic — Édition de janvier"],
      ticketCount: 165,
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
      amountMad: 3360,
      description: "Commission LYFE 4 % — Soirée Afrobeats mars",
      pdfUrl: "#",
    },
    {
      id: "inv_2",
      number: "LYFE-COM-2026-02-001",
      issuedAt: offsetDays(58),
      amountMad: 6096,
      description: "Commission LYFE 4 % — Événements de février",
      pdfUrl: "#",
    },
    {
      id: "inv_3",
      number: "LYFE-COM-2026-01-001",
      issuedAt: offsetDays(90),
      amountMad: 1648,
      description: "Commission LYFE 4 % — Janvier 2026",
      pdfUrl: "#",
    },
  ];
}
