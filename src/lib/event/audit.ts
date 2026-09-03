// Audit-entry phrasing.
//
// A formatter over an `AuditEntry`, not a data read — it belongs beside
// the domain rather than inside the static dataset, which is why the
// team page had to import from `lib/data/static` for it.

import type { AuditEntry } from "@/lib/types/domain";

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
