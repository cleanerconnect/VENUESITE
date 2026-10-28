// Partner onboarding.
//
// `Planning V3`'s Prio 02 row buys three things, and the second is
// « Création de Venue ». Until now the portal could only be entered by
// an account someone else had created; this is the door a partner comes
// through on their own.
//
// Since DigiNegoce's 27 October decision it is two doors rather than
// one: the account, then — separately, from inside the dashboard it
// belongs to — the establishment. See the two step tables below.
//
// One question group per step. The shape below is what the flow
// collects, and it is deliberately small: nothing is asked that the app
// does not need to list the establishment, because every extra field is
// a partner who stops halfway.

/** What the partner calls their place, in their words. */
export type OnboardingVenueType = "restaurant" | "bar";

/** One row of the weekly grid. `weekday` is ISO: 1 = Monday. */
export interface OnboardingDay {
  weekday: number;
  closed: boolean;
  opensAt: string;
  closesAt: string;
}

/**
 * The venue's answers, saved server-side after every step.
 *
 * The account is created at step 1 and the draft belongs to it, so
 * closing the browser loses nothing: signing back in reopens the flow
 * where it stopped. There is no password here — it never enters a draft.
 */
export interface OnboardingDraft {
  id: string;
  ownerId: string;
  /** The furthest step reached, in the flow that owns the draft. */
  step: number;
  venueName: string;
  venueType: OnboardingVenueType;
  /**
   * « Type de cuisine », as one of `CUISINE_IDS`. Asked beside the name
   * on step 2, and empty until the partner picks.
   */
  cuisine: string;
  /** The line under it, in the partner's words. `SPECIALTIES_MAX`. */
  specialties: string;
  /** 1–4; `PRICE_RANGE_LABEL` turns it into the MAD range the app prints. */
  priceRange: number;
  city: string;
  /** « Quartier ». The app prints it before the city. */
  district: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** The cover photo's stored key. Empty while step 4 is skipped. */
  coverObjectKey: string;
  coverContentType: string;
  coverSizeBytes: number;
  /** A second photo, also optional: two make a carousel, one a header. */
  photo2ObjectKey: string;
  photo2ContentType: string;
  photo2SizeBytes: number;
  /** The carte, as one file — a PDF, or a photograph of it. */
  menuObjectKey: string;
  menuContentType: string;
  menuSizeBytes: number;
  /** The square tile, already cropped 1:1 by the browser. Optional. */
  thumbnailObjectKey: string;
  thumbnailContentType: string;
  thumbnailSizeBytes: number;
  /** Step 5's two lists, as ids from `@/lib/types/restaurant`. */
  ambience: string[];
  features: string[];
  hours: OnboardingDay[];
  /**
   * Where a booking for this establishment lands. Asked first, and it
   * is the one answer with a default — see `MANAGEMENT_MODE_CHOICE`.
   */
  managementMode: ManagementMode;
  /** Set once the venue exists. A spent draft cannot make a second one. */
  submittedVenueId: string | null;
  updatedAt: string;
}

/**
 * Two flows, not one — DigiNegoce, 27 October.
 *
 * The seven steps used to be one road: a partner typed their name and
 * six screens later an establishment existed. That shape answers one
 * question badly and another not at all. Badly: a partner who wants to
 * look before building had to invent a venue to get through the door.
 * Not at all: an account holds *dashboards* — a restaurant, a bar, the
 * events product — and a single road arrives at exactly one of them.
 *
 * So the road is cut in two. `ACCOUNT_STEPS` is the door: who you are,
 * and then the account exists. Picking what to manage is a screen of
 * its own, `/choisir`. `VENUE_STEPS` is the building, and it lives
 * inside the dashboard it builds for — `/restaurant/etablissement/nouveau`
 * — because by then the partner is signed in and has somewhere to come
 * back to if they stop.
 *
 * `name` heads the card; `short` labels its segment of the progress
 * bar, where the names share the width and « Votre établissement »
 * becomes « Votre établiss… ».
 */
export const ACCOUNT_STEPS = [
  { n: 1, name: "Vous", short: "Vous" },
  { n: 2, name: "Votre compte est créé", short: "C'est prêt" },
] as const;

export const ACCOUNT_LAST_STEP = 2;

/**
 * The venue's own steps.
 *
 * Steps 2 to 6 of the old flow, unchanged and in their order, behind a
 * new first question. The ambience step is still `optional`, and the
 * flow still says so out loud: a place that has not decided whether it
 * is « intimiste » is not a place that should be stopped from opening
 * its dashboard.
 *
 * There is no recap step at the end any more. The old step 7 was a
 * « C'est prêt » page that re-read six answers back to the partner
 * before creating anything; it is now the account flow's confirmation,
 * where it has something to confirm. Here the last step's own button
 * creates the establishment, which is one screen less between a
 * decision and its effect.
 */
export const VENUE_STEPS = [
  { n: 1, name: "Mode de gestion des réservations", short: "Gestion" },
  { n: 2, name: "Votre établissement", short: "Établissement" },
  { n: 3, name: "Adresse", short: "Adresse" },
  { n: 4, name: "Photos", short: "Photos" },
  { n: 5, name: "Ambiance et équipements", short: "Ambiance" },
  { n: 6, name: "Horaires", short: "Horaires" },
] as const;

export const VENUE_LAST_STEP = 6;

/** The venue steps the partner may walk past without answering. */
export const VENUE_OPTIONAL_STEPS: number[] = [4, 5];

/**
 * Where a booking goes — the first thing the creation flow asks.
 *
 * Three answers, and they are not three skins of one product: they are
 * three different places a reservation lands. A partner on WhatsApp
 * never opens the portal, and a partner on the API has a system of
 * their own that must not be told to use ours. Asking first is what
 * stops the other five screens from being filled in for a dashboard
 * nobody will read.
 *
 * `dashboard` is the default because it is the one that works with
 * nothing else set up, and a default that needs a second integration
 * before a booking can be answered is not a default.
 */
export type ManagementMode = "dashboard" | "whatsapp" | "api";

export const MANAGEMENT_MODES = ["dashboard", "whatsapp", "api"] as const;

export const DEFAULT_MANAGEMENT_MODE: ManagementMode = "dashboard";

export function isManagementMode(value: string): value is ManagementMode {
  return (MANAGEMENT_MODES as readonly string[]).includes(value);
}

/**
 * The three cards, and the one line each owes the partner.
 *
 * The line says what happens to a booking, not what the mode is
 * called: « API » tells a partner nothing, and « une réservation part
 * dans votre système » tells them everything they need to choose.
 */
export const MANAGEMENT_MODE_CHOICE: Record<
  ManagementMode,
  { label: string; line: string }
> = {
  dashboard: {
    label: "Dashboard LYFE",
    line: "Une réservation arrive dans votre carnet, et vous l'acceptez ici.",
  },
  whatsapp: {
    label: "WhatsApp",
    line: "Une réservation vous arrive par WhatsApp, et vous répondez au client.",
  },
  api: {
    label: "API",
    line: "Une réservation part dans votre système par notre API, et il répond.",
  },
};

/**
 * The cities LYFE opens in, and a closed list on purpose.
 *
 * A free-text city is five spellings of Marrakech in the database
 * within a month — « marrakech », « Marrakesh », « MARAKECH » — and the
 * app searches and groups by that string. Picking from five is also one
 * tap rather than a word typed on a phone keyboard. A sixth city is one
 * line here and a deployment, which is the right amount of ceremony
 * for opening a market.
 */
export const ONBOARDING_CITIES = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tanger",
  "Agadir",
] as const;

export type OnboardingCity = (typeof ONBOARDING_CITIES)[number];

/**
 * Where each of the five cities is, so the map can open on the one the
 * partner picked.
 *
 * The map used to open on Jemaa el-Fna whatever the answer at the step
 * before: a partner in Tanger was shown Marrakech and asked to place a
 * point on it, which is a map you have to pan across the country before
 * it is any use. Centring needs no geocoder — the city is already
 * answered, and a city is a coordinate — so it happens first, and the
 * geocoder is left for the street.
 *
 * City centres, to four decimals, which is about ten metres and far
 * finer than a city needs. Zoom 12 shows the whole of each of them.
 */
export const CITY_CENTRE: Record<OnboardingCity, [number, number]> = {
  Casablanca: [33.5731, -7.5898],
  Marrakech: [31.6295, -7.9811],
  Rabat: [34.0209, -6.8416],
  Tanger: [35.7595, -5.834],
  Agadir: [30.4278, -9.5981],
};

/**
 * The centre for a city name, or null for anything that is not one of
 * the five.
 *
 * Takes a plain string because the callers have one: a venue's `city`
 * column is whatever was stored, and a fiche saved before the list was
 * closed can hold something else. Null means « I have no opinion »,
 * and the caller falls back to its own.
 */
export function cityCentre(city: string | undefined | null): [number, number] | null {
  if (!city) return null;
  const trimmed = city.trim();
  return isOnboardingCity(trimmed) ? CITY_CENTRE[trimmed] : null;
}

export function isOnboardingCity(value: string): value is OnboardingCity {
  return (ONBOARDING_CITIES as readonly string[]).includes(value);
}

/**
 * What the two types are called on the question, and in the summary.
 *
 * « Un bar ou lounge » rather than « Un bar »: the second half of the
 * sprint row is `Dashboard Drinks/Cellar`, and a rooftop lounge whose
 * only choice reads « Un bar » is being asked to accept a word for
 * their place that is not theirs. The stored value is still `bar` —
 * this is the label, not the enum.
 */
export const ONBOARDING_TYPE_CHOICE: Record<OnboardingVenueType, string> = {
  restaurant: "Un restaurant",
  bar: "Un bar ou lounge",
};

export const ONBOARDING_TYPE_LABEL: Record<OnboardingVenueType, string> = {
  restaurant: "Restaurant",
  bar: "Bar ou lounge",
};

/**
 * Mondays to Sundays open, lunch and dinner in one window.
 *
 * A grid that starts empty is a grid the partner has to fill seven
 * times before the place can take a booking; one that starts plausible
 * is a grid they correct. Nothing here is mandatory — these hours are
 * already valid, which is what makes step 5 skippable in practice.
 */
export function defaultHours(): OnboardingDay[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    closed: false,
    opensAt: "12:00",
    closesAt: "23:00",
  }));
}

export const WEEKDAY_LABEL: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};
