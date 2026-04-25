// LYFE domain types. Shape mirrors the future REST/GraphQL responses
// so the dev team at DigiNegoce can swap mock for real fetches one for one.

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
  faceValueMad: number; // Organizer receives this — face value, no fees.
  quantity: number;
  sold: number;
  saleStart: string; // ISO 8601
  saleEnd: string;
  maxPerOrder: number;
  transferable: boolean;
}

export interface Artist {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
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
  galleryUrls: string[];
  artists: Artist[];
  status: EventStatus;
  rejectionReason?: string;
  createdAt: string;
  pageViews: number;
}

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

export interface ActivityItem {
  id: string;
  type: "purchase" | "transfer" | "refund" | "scan" | "moderation";
  message: string;
  eventId?: string;
  at: string;
}

export interface Payout {
  id: string;
  amountMad: number;
  scheduledFor: string;
  paidAt?: string;
  status: "scheduled" | "processing" | "paid";
  reference: string;
  eventIds: string[];
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

// Fee structure — single source of truth used by the customer-facing
// preview in the wizard and the settlement breakdowns.
export interface FeeBreakdown {
  faceValueMad: number;
  serviceFeeMad: number;
  customerPaysMad: number;
  organizerReceivesMad: number;
  payzoneFeeMad: number;
  lyfeFeeMad: number;
  origin: CardOrigin;
}
