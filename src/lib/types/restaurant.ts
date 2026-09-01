// LYFE restaurant domain.
//
// Same discipline as `domain.ts`: these shapes mirror the eventual API
// responses, so the mock module is swapped for fetch() without touching a
// component. Nothing here is UI — the screen specs are derived from these
// types, never the other way round.

export type RestaurantKind =
  | "bistro"
  | "gastronomique"
  | "rooftop"
  | "brasserie"
  | "street_food";

export interface RestaurantProfile {
  id: string;
  kind: RestaurantKind;
  name: string;
  shortName: string;
  /** Sidebar avatar tile, max 2 chars. */
  initials: string;
  city: string;
  /** One-line subhead under the workspace switcher. */
  subline: string;
  cuisine: string;
  /** Total seats across every zone. */
  capacity: number;
  contactEmail: string;
  contactPhone: string;
  website: string;
  currency: string;
  onboardingCompleted: boolean;
}

// ── Service ──────────────────────────────────────────────────

export type ServiceKind = "petit_dejeuner" | "dejeuner" | "diner" | "tardif";

export type ServiceState =
  | "scheduled"
  | "open"
  | "peak"
  | "closing"
  | "closed";

/** One sitting: a date + a named window the floor is open for. */
export interface Service {
  id: string;
  kind: ServiceKind;
  label: string;
  date: string;
  opensAt: string;
  closesAt: string;
  state: ServiceState;
  /** Seats the floor plan can actually turn during this window. */
  capacity: number;
  bookedCovers: number;
  seatedCovers: number;
  walkInCovers: number;
  noShowCovers: number;
  revenueMad: number;
  /** Average minutes a table is held, drives the turn projection. */
  avgTurnMinutes: number;
  /**
   * Booked covers per sitting slot across the service window. Comes from
   * the booking engine rather than being inferred from the reservation
   * list — the list a dashboard holds is a page of the book, not all of
   * it, so deriving the curve client-side would understate every slot.
   */
  slotLoad: { at: string; covers: number }[];
}

// ── Reservations ─────────────────────────────────────────────

export type ReservationState =
  | "requested"
  | "confirmed"
  | "waitlisted"
  | "seated"
  | "completed"
  | "no_show"
  | "cancelled";

export type ReservationChannel =
  | "lyfe"
  | "phone"
  | "walk_in"
  | "partner"
  | "instagram";

export interface Reservation {
  id: string;
  serviceId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  /** ISO start of the sitting. */
  at: string;
  state: ReservationState;
  channel: ReservationChannel;
  zoneId?: string;
  tableCode?: string;
  /** Allergies, occasion, seating preference — shown on the row. */
  note?: string;
  /** Repeat guest, drives the VIP badge and the prep list. */
  visits: number;
  vip: boolean;
  /** Pre-paid deposit, refundable against the bill. */
  depositMad?: number;
  /** 0·1 model confidence that the party will not show. */
  noShowRisk?: number;
}

// ── Floor ────────────────────────────────────────────────────

export type TableState =
  | "free"
  | "reserved"
  | "seated"
  | "dessert"
  | "to_clean"
  | "blocked";

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  /** Terrace closes when it rains; blocked zones drop out of capacity. */
  available: boolean;
}

export interface DiningTable {
  id: string;
  code: string;
  zoneId: string;
  seats: number;
  state: TableState;
  reservationId?: string;
  /** ISO time the current party sat down. */
  seatedAt?: string;
  /** Running bill for the seated party. */
  billMad?: number;
}

// ── Menu ─────────────────────────────────────────────────────

export type MenuCategory =
  | "entree"
  | "plat"
  | "dessert"
  | "boisson"
  | "cocktail";

export type MenuItemState = "available" | "low_stock" | "sold_out";

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  priceMad: number;
  /** Ingredient cost — margin is derived, never stored twice. */
  foodCostMad: number;
  soldToday: number;
  soldLast7d: number;
  state: MenuItemState;
  /** Portions left before the dish is 86'd. */
  remaining?: number;
  signature?: boolean;
}

// ── Reviews ──────────────────────────────────────────────────

export interface GuestReview {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  at: string;
  channel: "lyfe" | "google" | "instagram";
  /** Themes the model pulled out, drives the sentiment clusters. */
  tags: string[];
  replied: boolean;
}

// ── Activity ─────────────────────────────────────────────────

export type RestaurantActivityType =
  | "reservation_created"
  | "reservation_cancelled"
  | "party_seated"
  | "table_freed"
  | "waitlist_joined"
  | "no_show"
  | "review_received"
  | "item_86"
  | "payment_settled"
  | "anomaly";

export interface RestaurantActivityItem {
  id: string;
  type: RestaurantActivityType;
  actor: string;
  message: string;
  at: string;
  reservationId?: string;
  tableCode?: string;
  /** Flags the row for the tinted, left-bordered treatment. */
  needsAttention?: boolean;
}

// ── Settlements ──────────────────────────────────────────────

export type PayoutState = "scheduled" | "processing" | "paid";

export interface RestaurantPayout {
  id: string;
  reference: string;
  amountMad: number;
  /** Commission LYFE already deducted from `amountMad`. */
  commissionMad: number;
  coversSettled: number;
  periodLabel: string;
  scheduledFor: string;
  paidAt?: string;
  state: PayoutState;
}

// ── Overview ─────────────────────────────────────────────────

export interface RestaurantOverview {
  restaurant: RestaurantProfile;
  /** Greeting copy, varies by daypart and by how the service is going. */
  greeting: {
    firstName: string;
    salutation: string;
    clause: string;
    subline: string;
  };
  /** The service the dashboard leads with. */
  currentService: Service;
  zones: Zone[];
  tables: DiningTable[];
  coversToday: {
    count: number;
    deltaPctVsYesterday: number;
    series24h: number[];
    peakHourLabel: string;
  };
  averageTicket: {
    amountMad: number;
    deltaPctVsLastWeek: number;
  };
  occupancy: {
    /** 0·100. */
    pct: number;
    deltaPctVsLastWeek: number;
  };
  noShows: {
    count: number;
    deltaPctVsLastWeek: number;
    /** Covers lost, used for the money framing of the nudge. */
    lostRevenueMad: number;
  };
  revenueWeek: {
    amountMad: number;
    deltaPctVsLastWeek: number;
    series: { label: string; value: number }[];
  };
  rating: {
    average: number;
    reviewCount: number;
    deltaVsLastMonth: number;
  };
  nextPayout: {
    amountMad: number;
    scheduledFor: string;
  };
  /** Assistant output for the current service. */
  nudge: {
    headline: string;
    body: string;
    /** Deep link the primary CTA follows. */
    href: string;
    ctaLabel: string;
  };
  upcomingReservations: Reservation[];
  waitlist: Reservation[];
  activity: RestaurantActivityItem[];
  topItems: MenuItem[];
  reviews: GuestReview[];
  services: Service[];
  payouts: RestaurantPayout[];
}
