// LYFE domain types — shape mirrors the eventual REST/GraphQL responses
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
    confirmedRate: number; // 0-1
    noShowsToday: number;
  };
  tonight: {
    soldTickets: number;
    capacity: number;
    revenueMad: number;
    eventName: string;
    eventStartsAt: string;
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
