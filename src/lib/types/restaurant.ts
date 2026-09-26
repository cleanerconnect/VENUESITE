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

/**
 * Where a listing is in LYFE's review.
 *
 * `pending_review` is what /inscription creates: the partner's dashboard
 * works in full, and the consumer app does not list the venue. Only
 * `validated` is visible to a guest. `rejected` carries the reason LYFE
 * gave, which is the one thing the partner is shown about it.
 */
export type VenueStatus = "pending_review" | "validated" | "rejected";

export const VENUE_STATUSES: VenueStatus[] = [
  "pending_review",
  "validated",
  "rejected",
];

export const isVenueStatus = (value: unknown): value is VenueStatus =>
  typeof value === "string" && (VENUE_STATUSES as string[]).includes(value);

/** One venue awaiting LYFE's decision, as /admin/validations lists it. */
export interface PendingVenue {
  id: string;
  name: string;
  kind: string;
  city: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  createdAt: string;
  /** Whether the partner got as far as a cover photo. */
  hasPhoto: boolean;
  openDays: number;
}

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
  /**
   * « Type de cuisine » on the app's detail screen, and the subtitle
   * under the venue's name — « Cuisine japonaise traditionnelle moderne
   * & omakase ». Free text: a cuisine is a sentence, not an enum, and
   * the app prints it verbatim.
   */
  cuisine: string;
  /**
   * « Catégorie » on the same screen, one line below the cuisine —
   * « Restaurant gastronomique, sushi bar ». What kind of establishment
   * this is, as opposed to what it cooks.
   */
  category: string;
  /**
   * The quarter, which is how a Moroccan address is actually given. The
   * app's header reads « El cenador, Casablanca »: quartier first, then
   * the city, so the two travel together and the quarter comes first.
   */
  district: string;
  /**
   * One line on the app's list cards, 60 characters. Not the
   * description: a card has room for a sentence, and truncating a
   * paragraph into it is how every card ends in « … ».
   */
  tagline: string;
  /** Total seats across every zone. */
  capacity: number;
  contactEmail: string;
  contactPhone: string;
  website: string;
  currency: string;
  onboardingCompleted: boolean;
  /** LYFE's review. The app lists only a `validated` venue. */
  status: VenueStatus;
  /** Why LYFE refused. Empty unless `status` is `rejected`. */
  statusReason: string;
  statusChangedAt?: string;
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
  | "wifi"
  | "reservation_recommandee"
  | "cartes_credit"
  | "terrasse"
  | "service_midi_soir"
  | "musique_mixologie"
  | "parking"
  | "acces_pmr"
  | "climatisation"
  | "animaux"
  | "vue"
  | "musique_live"
  | "groupes";

export const VENUE_FEATURE: Record<VenueFeature, string> = {
  wifi: "Wi-Fi",
  reservation_recommandee: "Réservation recommandée",
  cartes_credit: "Cartes de crédit acceptées",
  terrasse: "Terrasse / extérieur",
  service_midi_soir: "Déjeuner & dîner servis",
  musique_mixologie: "Ambiance musique & mixologie",
  parking: "Parking",
  acces_pmr: "Accès PMR",
  climatisation: "Climatisation",
  animaux: "Animaux acceptés",
  vue: "Vue",
  musique_live: "Musique live",
  groupes: "Groupes acceptés",
};

/**
 * The eight the portal asks for, in the order the app draws them.
 *
 * The first six are the rows under « Equipements » on the app's
 * restaurant and bar detail screens, read off the design rather than
 * invented here. Parking and accès PMR are the two a guest phones to
 * ask about, so they are asked once in the fiche instead.
 *
 * The other five in `VENUE_FEATURE` are older values the seed and the
 * curated Lot 2 listing still carry; they keep their labels so a row
 * already in the database renders, and they are not offered here.
 */
export const APP_FEATURES: VenueFeature[] = [
  "wifi",
  "reservation_recommandee",
  "cartes_credit",
  "terrasse",
  "service_midi_soir",
  "musique_mixologie",
  "parking",
  "acces_pmr",
];

/**
 * Ambience, as a closed list.
 *
 * Free text gave « Cadre exceptionnel » and « Coucher de soleil » —
 * true of the room, and useless to the app, which groups and filters on
 * the string. The app's own screen shows three of these at a time
 * (« Elégant, minimaliste, moderne »), so the list is the vocabulary
 * that screen can draw, and five is the ceiling.
 */
export type VenueAmbience =
  | "elegant"
  | "minimaliste"
  | "moderne"
  | "traditionnel"
  | "romantique"
  | "familial"
  | "convivial"
  | "festif"
  | "intimiste"
  | "chaleureux"
  | "panoramique"
  | "bord_de_mer";

export const VENUE_AMBIENCE: Record<VenueAmbience, string> = {
  elegant: "Élégant",
  minimaliste: "Minimaliste",
  moderne: "Moderne",
  traditionnel: "Traditionnel",
  romantique: "Romantique",
  familial: "Familial",
  convivial: "Convivial",
  festif: "Festif",
  intimiste: "Intimiste",
  chaleureux: "Chaleureux",
  panoramique: "Panoramique",
  bord_de_mer: "Bord de mer",
};

export const isVenueAmbience = (value: string): value is VenueAmbience =>
  value in VENUE_AMBIENCE;

/**
 * A stored ambience, in words.
 *
 * Lenient on purpose: rows written before the list was closed hold free
 * text, and printing « Cadre exceptionnel » is better than printing
 * nothing while the partner has not re-picked from the chips.
 */
export const ambienceLabel = (value: string): string =>
  isVenueAmbience(value) ? VENUE_AMBIENCE[value] : value;

/** The app's list card has room for one line. */
export const TAGLINE_MAX = 60;

/**
 * A carte is a PDF or a handful of photographed pages — never a
 * hundred. Ten is what a two-sided menu shot page by page comes to.
 */
export const MENU_FILE_MAX = 10;

export const PRICE_RANGE_LABEL: Record<number, string> = {
  1: "€ · économique",
  2: "€€ · modéré",
  3: "€€€ · haut de gamme",
  4: "€€€€ · gastronomique",
};

// ── Service ──────────────────────────────────────────────────

/**
 * What kind of sitting a service is.
 *
 * `creneau` is the lounge's: a bar sells a time slot, not a meal, and
 * `Détail Sprint` row 41 puts the same user story on Drinks/Cellar, so
 * it is as real a kind as dinner. The seed has written it since the
 * nightlife dataset landed; the union did not admit it, so the row came
 * back cast to a kind no lookup table had an entry for.
 */
export type ServiceKind =
  | "petit_dejeuner"
  | "dejeuner"
  | "diner"
  | "tardif"
  | "creneau";

export type ServiceState =
  | "scheduled"
  | "open"
  | "peak"
  | "closing"
  | "closed";

/** One sitting: a date + a named window the floor is open for. */
/**
 * The book for one day, and the services it is read against.
 *
 * Réservations is the one screen that is not about now — a venue takes
 * tomorrow's bookings all through tonight's service — so the day it is
 * showing is a payload of its own rather than a slice of the overview.
 */
export interface DayBook {
  /** `yyyy-MM-dd`, the day these rows belong to. */
  date: string;
  services: Service[];
  reservations: Reservation[];
}

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
   * The bookable grid this service runs on: 15, 30 or 60 minutes.
   *
   * Carried on the service rather than on the venue because it is the
   * service's own choice — a venue can seat its lunch on the half hour
   * and its late sitting on the hour. Réservations groups the book by
   * it and the load curve is cut on it, so the two cannot disagree.
   */
  slotMinutes: 15 | 30 | 60;
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
  /**
   * The venue refused a request. Distinct from `cancelled`, which is the
   * guest withdrawing — `db/schema.sql` says the two must never be
   * collapsed, because a refusal carries a coded reason and a
   * cancellation does not.
   */
  | "rejected"
  | "cancelled";

export type ReservationChannel =
  | "lyfe"
  | "phone"
  /**
   * « Réservation via whatsapp » — Planning V3 Prio 02, and Détail
   * Sprint row 42, both in the same sprint as this dashboard.
   *
   * The channel was missing from this union, so a booking the backend
   * marks `whatsapp` had no label: `RESERVATION_CHANNEL[channel]` came
   * back `undefined` and the row's source line printed nothing. The
   * front-end has to be able to *show* a WhatsApp booking even though
   * taking one is the backend's job.
   */
  | "whatsapp"
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
  /**
   * The guest's address, when the app has one.
   *
   * From the `customers` row rather than the booking: a reservation is
   * made with a name and a phone, and the address belongs to the guest.
   * Absent for a booking taken by phone.
   */
  guestEmail?: string;
  /**
   * The year the guest was born, when the app collected it.
   *
   * Optional in the schema and optional here, because the consumer app
   * asks for it in a profile nobody has to fill. The drawer turns it
   * into an age and says nothing at all when it is missing — a "—" in
   * an Âge field reads like a fact about the guest.
   */
  guestBirthYear?: number;
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
    /** Counted over `currentService`, which is the scope the tile names. */
    count: number;
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
    /** Rating points versus the month before; null where there is no month before. */
    deltaVsLastMonth: number | null;
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
