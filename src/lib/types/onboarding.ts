// Partner onboarding.
//
// `Planning V3`'s Prio 02 row buys three things, and the second is
// « Création de Venue ». Until now the portal could only be entered by
// an account someone else had created; this is the door a partner comes
// through on their own.
//
// Six steps, one question group each. The shape below is what the flow
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
  /** 1–6, the furthest step reached. */
  step: number;
  venueName: string;
  venueType: OnboardingVenueType;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** The cover photo's stored key. Empty while step 4 is skipped. */
  coverObjectKey: string;
  coverContentType: string;
  coverSizeBytes: number;
  hours: OnboardingDay[];
  /** Set once the venue exists. A spent draft cannot make a second one. */
  submittedVenueId: string | null;
  updatedAt: string;
}

/**
 * The six steps, and two names each.
 *
 * `name` is the question, and it heads the card. `short` is the label
 * under its segment of the progress bar, where six names share the
 * width and « Votre établissement » becomes « Votre établiss… ».
 */
export const ONBOARDING_STEPS = [
  { n: 1, name: "Vous", short: "Vous" },
  { n: 2, name: "Votre établissement", short: "Établissement" },
  { n: 3, name: "Adresse", short: "Adresse" },
  { n: 4, name: "Photos", short: "Photos" },
  { n: 5, name: "Horaires", short: "Horaires" },
  { n: 6, name: "C'est prêt", short: "C'est prêt" },
] as const;

export const ONBOARDING_LAST_STEP = 6;

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
