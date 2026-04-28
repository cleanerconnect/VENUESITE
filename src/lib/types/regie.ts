// Régie ("production / door operations") tab data. Replaces the older
// Scanner tab on events in on_sale / live / past / settled states.
// Drives two modes: pre-event checklist + will-call lookup, and a
// live (or replay) door-day cockpit with gates, anomalies, ad-hoc
// actions, and an ops feed.

export type RegieMode = "pre_event" | "live";

export type ChecklistStatus = "complete" | "in_progress" | "pending";

export interface ChecklistDetail {
  label: string;
  status: ChecklistStatus;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: ChecklistStatus;
  details?: ChecklistDetail[];
}

export type GateStatus = "normal" | "alert" | "offline";

export interface Gate {
  id: string;
  name: string;
  /** Tickets scanned in the last minute. */
  scansPerMin: number;
  /** Estimated queue length in minutes. */
  queueMin: number;
  /** Number of active scanner staff. */
  staffActive: number;
  /** Total scans at this gate so far. */
  totalScanned: number;
  /** Gate-specific capacity. */
  capacity: number;
  status: GateStatus;
}

export type AnomalySeverity = "warning" | "critical";

export interface RegieAnomaly {
  id: string;
  severity: AnomalySeverity;
  message: string;
  /** Optional gate / area scope label. */
  scope?: string;
  at: string;
}

export type LiveOpsEntryType =
  | "scan_milestone"
  | "walk_up_sale"
  | "comp_issued"
  | "staff_change"
  | "anomaly_resolved"
  | "anomaly_raised";

export interface LiveOpsEntry {
  id: string;
  at: string;
  type: LiveOpsEntryType;
  message: string;
  /** Optional actor initials (CNDP). */
  actorInitials?: string;
}

export interface WillCallAttendee {
  id: string;
  /** Stable lookup name (search hits this). */
  fullName: string;
  initials: string;
  tierName: string;
  paymentStatus: "paid" | "comp" | "partner";
  /** Pre-formatted amount paid label. */
  amountPaidLabel: string;
  /** Anonymized email + phone — kept for the will-call print step. */
  email: string;
  phone: string;
}

export interface RegieData {
  eventId: string;
  /** Default mode the tab opens into. Past / settled events open in
   *  replay-live; on_sale opens pre-event. */
  defaultMode: RegieMode;
  // === Pre-event ===
  checklist: ChecklistItem[];
  willCallSample: WillCallAttendee[];
  // === Live ===
  /** Total scans across all gates. */
  totalScanned: number;
  /** Total tickets sold (denominator for scan rate). */
  totalSold: number;
  /** scanned / sold, %. */
  scanRatePct: number;
  /** Last-minute scan velocity, summed across gates. */
  scansLastMinute: number;
  /** ISO label of the door-day window for the replay mode. */
  doorDayLabel: string;
  gates: Gate[];
  anomalies: RegieAnomaly[];
  liveOpsFeed: LiveOpsEntry[];
}
