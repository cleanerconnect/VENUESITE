// LYFE domain types, shape mirrors the eventual REST/GraphQL responses
// so swapping mock for fetch() requires no component changes.

export type EventStatus = "live" | "pending" | "draft" | "past" | "rejected";
export type CardOrigin = "moroccan" | "international";
export type AgePolicy = "all" | "18+" | "21+";
export type Category =
  | "concert"
  | "club_night"
  | "festival"
  | "workshop"
  | "comedy"
  | "sports"
  | "other";

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  ice?: string;
  rc?: string;
}

export interface Tier {
  id: string;
  name: string;
  faceValueMad: number;
  quantity: number;
  sold: number;
  saleStart: string;
  saleEnd: string;
  maxPerOrder: number;
  transferable: boolean;
}

export interface LyfeEvent {
  id: string;
  name: string;
  description: string;
  category: Category;
  venue: Venue;
  startsAt: string;
  endsAt: string;
  agePolicy: AgePolicy;
  dressCode?: string;
  tiers: Tier[];
  refundPolicy: "auto" | "manual";
  coverUrl: string;
  status: EventStatus;
  rejectionReason?: string;
  createdAt: string;
  pageViews: number;
  peakHour?: string;
}

export interface ActivityItem {
  id: string;
  type: "purchase" | "transfer" | "refund" | "scan" | "moderation";
  message: string;
  actor: string;
  eventId?: string;
  at: string;
}

export interface OverviewData {
  organizer: {
    firstName: string;
    venueName: string;
    /** Greeting subtitle copy, varies by org type (festival vs venue). */
    greetingSubline: string;
    /** Italic clause inside the H1 (Fraunces violet-deep). */
    greetingClause: string;
  };
  /**
   * Headline event card, either "live tonight" or "in preparation, J-N
   * away". The discriminant is `mode`.
   */
  headline:
    | {
        mode: "live";
        eventName: string;
        eventStartsAt: string;
        soldTickets: number;
        capacity: number;
        revenueMad: number;
      }
    | {
        mode: "preparing";
        eventName: string;
        dateRangeLabel: string;
        daysUntil: number;
        phaseCurrent: number;
        phaseTotal: number;
        /** 0·1 share of phase progression, drives the ring. */
        phaseProgress: number;
        /** Pass-style stats shown beneath the ring. */
        salesPhaseLabel: string;
        salesPhaseValue: number;
        consolidatedRevenueLabel: string;
        consolidatedRevenueMad: number;
      };
  ticketsToday: {
    count: number;
    deltaPctVsYesterday: number;
    series24h: number[];
  };
  revenueWeek: {
    amountMad: number;
    deltaPctVsLastWeek: number;
  };
  upcomingEventsCount: number;
  nextPayout: {
    amountMad: number;
    scheduledFor: string;
  };
  upcomingEvents: LyfeEvent[];
  activity: ActivityItem[];
}

// === Event detail ===

export interface Attendee {
  id: string;
  name: string;
  phone: string;
  email: string;
  tierId: string;
  tierName: string;
  purchaseDate: string;
  qrStatus: "unused" | "scanned" | "transferred";
  scannedAt?: string;
  transferredTo?: string;
  originalBuyer?: string;
}

export interface RefundRequest {
  id: string;
  buyerName: string;
  tierName: string;
  amountMad: number;
  requestedAt: string;
  reason: string;
  status: "pending" | "approved" | "denied" | "auto_approved";
  resolvedAt?: string;
  slaExpiresAt: string;
}

export interface RevenuePoint {
  day: string;
  amount: number;
}

export interface ScanLog {
  id: string;
  code: string;
  staff: string;
  at: string;
  attendeeName: string;
}

// === Settlements ===

export interface Payout {
  id: string;
  amountMad: number;
  scheduledFor: string;
  paidAt?: string;
  status: "scheduled" | "processing" | "paid";
  reference: string;
  eventNames: string[];
  ticketCount: number;
  statementUrl: string;
}

export interface Invoice {
  id: string;
  number: string;
  issuedAt: string;
  amountMad: number;
  description: string;
  pdfUrl: string;
}

// === Team ===

export type TeamRole = "owner" | "admin" | "scanner";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastActive: string;
  pending?: boolean;
  eventScopeId?: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
}

// === Wizard ===

export interface DraftTier {
  id: string;
  name: string;
  faceValueMad: number;
  quantity: number;
  saleStart: string;
  saleEnd: string;
  maxPerOrder: number;
  transferable: boolean;
}

export interface DraftEvent {
  name: string;
  description: string;
  category: Category;
  venueId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  agePolicy: AgePolicy;
  dressCode: string;
  tiers: DraftTier[];
  refundPolicy: "auto" | "manual";
  coverName: string | null;
  galleryNames: string[];
  artists: { id: string; name: string; role: string }[];
  partnerLogos: string[];
}
