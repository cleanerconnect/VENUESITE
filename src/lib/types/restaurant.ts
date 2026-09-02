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
  /** Free text shown on the listing. */
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  /** 1–4, rendered in the app as € to €€€€. */
  priceRange: number;
  /** Search and filter facets in the app. */
  tags: string[];
  /** Practical facilities the app lists as icons. */
  features: VenueFeature[];
  /** How the room feels — the app's ambience chips. */
  ambience: string[];
}

export type VenueFeature =
  | "terrasse"
  | "climatisation"
  | "acces_pmr"
  | "wifi"
  | "parking"
  | "animaux"
  | "vue"
  | "musique_live"
  | "groupes";

export const VENUE_FEATURE: Record<VenueFeature, string> = {
  terrasse: "Terrasse",
  climatisation: "Climatisation",
  acces_pmr: "Accès PMR",
  wifi: "Wi-Fi",
  parking: "Parking",
  animaux: "Animaux acceptés",
  vue: "Vue",
  musique_live: "Musique live",
  groupes: "Groupes acceptés",
};

export const PRICE_RANGE_LABEL: Record<number, string> = {
  1: "€ · économique",
  2: "€€ · modéré",
  3: "€€€ · haut de gamme",
  4: "€€€€ · gastronomique",
};

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
  arrivedCovers: number;
  noShowCovers: number;
  revenueMad: number;
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
  | "arrived"
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
  /** Seating area the guest asked for — terrace, salle, rooftop. */
  zoneId?: string;
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

// ── Seating areas ────────────────────────────────────────────

/**
 * A named part of the venue a guest can ask for when booking — terrace,
 * salle, rooftop. This is a booking preference the app offers, not a
 * floor plan: LYFE does not place parties at tables.
 */
export interface Zone {
  id: string;
  name: string;
  capacity: number;
  /** Terrace closes when it rains; blocked zones leave the app. */
  available: boolean;
}

// ── Menu ─────────────────────────────────────────────────────

export type MenuCategory =
  | "entree"
  | "plat"
  | "dessert"
  | "boisson"
  | "cocktail";

/**
 * A dish as the LYFE app displays it. This is a customer-facing listing,
 * not kitchen management: no cost, no stock, no covers sold. What a
 * diner sees before booking, and nothing else.
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  priceMad: number;
  /** Highlighted in the app as a house speciality. */
  signature: boolean;
  /** Hidden listings stay in the dashboard but leave the app. */
  visible: boolean;
  /** Dietary markers the app renders as chips. */
  dietary: DietaryTag[];
}

export type DietaryTag = "vegetarien" | "vegan" | "sans_gluten" | "halal" | "epice";

export const DIETARY_TAG: Record<DietaryTag, string> = {
  vegetarien: "Végétarien",
  vegan: "Vegan",
  sans_gluten: "Sans gluten",
  halal: "Halal",
  epice: "Épicé",
};

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
  | "guest_arrived"
  | "waitlist_joined"
  | "no_show"
  | "review_received"
  | "payment_settled"
  | "anomaly";

export interface RestaurantActivityItem {
  id: string;
  type: RestaurantActivityType;
  actor: string;
  message: string;
  at: string;
  reservationId?: string;
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
  /**
   * Assistant output for the current service. Optional: the advisor
   * returns nothing when the data doesn't justify a recommendation, and
   * a suggestion card with nothing to say trains the team to ignore the
   * one that matters.
   */
  nudge?: {
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
