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

const MIDO = { name: "Mido Reffas", email: "mido@jazzablanca.com" };
const IMANE = {
  name: "Imane Cherkaoui",
  email: "imane@jazzablanca.com",
};

export function getAuditLog(): AuditEntry[] {
  // 12 entries spanning the last 7 days, all 9 action types covered at
  // least once. Sorted newest first.
  return [
    {
      id: "au_1",
      actor: IMANE,
      action: "submitted_event",
      targetSummary: "Pass Week-End 2, Jorja Smith",
      timestamp: offsetMin(60 * 6),
    },
    {
      id: "au_2",
      actor: IMANE,
      action: "approved_refund",
      targetSummary: "Karim L. · Pass Jour General · 590 MAD",
      timestamp: offsetMin(60 * 18),
    },
    {
      id: "au_3",
      actor: MIDO,
      action: "edited_settings",
      targetSummary: "Préférences de boost · budget par défaut 8 000 MAD",
      timestamp: offsetMin(60 * 22),
    },
    {
      id: "au_4",
      actor: MIDO,
      action: "invited_member",
      targetSummary: "Reda Bennani · Scanner",
      timestamp: offsetMin(60 * 24),
    },
    {
      id: "au_5",
      actor: IMANE,
      action: "denied_refund",
      targetSummary: "Sami E. · Pass Jour Early Bird · hors fenêtre 48h",
      timestamp: offsetMin(60 * 24 * 2),
    },
    {
      id: "au_6",
      actor: MIDO,
      action: "cancelled_event",
      targetSummary: "Brunch Jazz Anfa · 412 remboursements déclenchés",
      timestamp: offsetMin(60 * 24 * 2 + 60 * 4),
    },
    {
      id: "au_7",
      actor: MIDO,
      action: "changed_payout_account",
      targetSummary: "RIB Bank of Africa · vérification SMS validée",
      timestamp: offsetMin(60 * 24 * 3),
    },
    {
      id: "au_8",
      actor: IMANE,
      action: "submitted_event",
      targetSummary: "Pass Semaine 1, Rilès",
      timestamp: offsetMin(60 * 24 * 4),
    },
    {
      id: "au_9",
      actor: MIDO,
      action: "changed_role",
      targetSummary: "Imane Cherkaoui · Administrateur (depuis Scanner)",
      timestamp: offsetMin(60 * 24 * 5),
    },
    {
      id: "au_10",
      actor: IMANE,
      action: "approved_refund",
      targetSummary: "Layla F. · Pass Jour Early Bird · 380 MAD",
      timestamp: offsetMin(60 * 24 * 5 + 60 * 3),
    },
    {
      id: "au_11",
      actor: MIDO,
      action: "removed_member",
      targetSummary: "Hicham B. · Scanner (compte inactif)",
      timestamp: offsetMin(60 * 24 * 6),
    },
    {
      id: "au_12",
      actor: MIDO,
      action: "edited_settings",
      targetSummary: "Notifications · digest hebdomadaire activé",
      timestamp: offsetMin(60 * 24 * 7),
    },
  ];
}

const ACTION_LABEL: Record<AuditEntry["action"], string> = {
  invited_member: "A invité",
  removed_member: "A retiré",
  changed_role: "A modifié le rôle de",
  approved_refund: "A approuvé un remboursement",
  denied_refund: "A refusé un remboursement",
  cancelled_event: "A annulé l'événement",
  changed_payout_account: "A modifié les coordonnées de versement",
  submitted_event: "A soumis l'événement",
  edited_settings: "A modifié les réglages",
};

export function describeAuditAction(entry: AuditEntry): string {
  return ACTION_LABEL[entry.action];
}
