// Team members + audit log for /team, Jazzablanca demo.

import type { AuditEntry, TeamMember } from "@/lib/types/domain";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();

export function getTeam(): TeamMember[] {
  return [
    {
      id: "tm_1",
      name: "Mido Reffas",
      email: "mido@jazzablanca.com",
      role: "owner",
      lastActive: offsetMin(5),
    },
    {
      id: "tm_2",
      name: "Imane Cherkaoui",
      email: "imane@jazzablanca.com",
      role: "admin",
      lastActive: offsetMin(60 * 3),
    },
    {
      id: "tm_3",
      name: "Hamza Door Staff",
      email: "hamza.staff@jazzablanca.com",
      role: "scanner",
      lastActive: offsetMin(60 * 24 * 4),
    },
    {
      id: "tm_4",
      name: "Reda Bennani",
      email: "reda@example.ma",
      role: "scanner",
      lastActive: offsetMin(60 * 24),
      pending: true,
    },
  ];
}

export function getAuditLog(): AuditEntry[] {
  return [
    {
      id: "au_1",
      actor: "Mido Reffas",
      action: "A invité Reda Bennani comme Scanner",
      at: offsetMin(60 * 24),
    },
    {
      id: "au_2",
      actor: "Imane Cherkaoui",
      action: "A approuvé un remboursement pour Karim L.",
      at: offsetMin(60 * 18),
    },
    {
      id: "au_3",
      actor: "Mido Reffas",
      action: "A modifié les coordonnées bancaires (RIB)",
      at: offsetMin(60 * 24 * 6),
    },
    {
      id: "au_4",
      actor: "Imane Cherkaoui",
      action: "A publié Pass Week-End 2, Jorja Smith",
      at: offsetMin(60 * 8),
    },
  ];
}
