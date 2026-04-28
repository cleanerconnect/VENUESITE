// Comp / invitation tracker for the Invitations tab on event detail.
// Comps consume inventory but don't generate revenue — they need their
// own ledger (categories, allocations, audit trail, scan rate).

export type CompCategory =
  | "press"
  | "sponsors"
  | "talent"
  | "staff"
  | "contest";

export type CompStatus =
  | "issued" // generated, not yet sent
  | "delivered" // sent to recipient
  | "scanned" // redeemed at the door
  | "no_show"; // never used

export const COMP_CATEGORY_LABEL: Record<CompCategory, string> = {
  press: "Presse",
  sponsors: "Sponsors / Partenaires",
  talent: "Talent / Artistes",
  staff: "Personnel",
  contest: "Concours / RP",
};

export interface CompAllocation {
  id: string;
  category: CompCategory;
  /** CNDP-anonymized initials shown in the UI. */
  recipientInitials: string;
  /** Full name kept in the data layer (organizer team only). */
  recipientName: string;
  /** Organization or affiliation (e.g. "Eklectik PR", "Royal Air Maroc"). */
  organization: string;
  ticketCount: number;
  status: CompStatus;
  issuedAt: string;
  /** Initials of the team member who issued. */
  issuedByInitials: string;
  scannedAt?: string;
  notes?: string;
}

export interface CompCategoryStat {
  category: CompCategory;
  label: string;
  /** Total inventory allocated to this category. */
  allocated: number;
  /** Number of tickets issued so far (issued + delivered + scanned). */
  used: number;
  /** Number actually redeemed (scanned). */
  redeemed: number;
}

export interface CompAuditEntry {
  id: string;
  at: string;
  action: "issued" | "redistributed" | "revoked";
  actorInitials: string;
  recipientInitials: string;
  category: CompCategory;
  ticketCount: number;
}

export interface InvitationsData {
  eventId: string;
  /** Total invitations issued (i.e. used out of the allocation pool). */
  totalIssued: number;
  /** Total delivered to recipients (issued status >= delivered). */
  totalDelivered: number;
  /** Total scanned at the door. */
  totalScanned: number;
  /** scanned / issued, %. Independent from the paid-ticket scan rate. */
  scanRatePct: number;
  /** Total inventory allocated across all categories. */
  totalAllocation: number;
  /** Inventory remaining (allocated − used). */
  remainingAllocation: number;
  /** Per-category aggregated stats. */
  categories: CompCategoryStat[];
  /** Individual allocations grouped by category. */
  allocations: CompAllocation[];
  /** Chronological audit trail. */
  auditTrail: CompAuditEntry[];
}
