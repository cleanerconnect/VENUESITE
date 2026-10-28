// What an account can manage on LYFE, and which of it already exists.
//
// DigiNegoce, 27 October: « Que voulez-vous gérer sur LYFE ? ». The
// decision behind the screen is that a LYFE account is not a
// restaurant — it is a person, and a person can hold a restaurant, a
// bar, and a season of events at once. The old sign-in resolved that
// ambiguity by guessing: an account holding any organisation went to
// the event dashboard, an account holding venues went to the venue
// portal, and an account holding both never saw that it held both.
//
// So the guess becomes a screen, and this module is what the screen
// reads. Three dashboards, each either held or offered — nothing else:
// no fourth state for « being created », because a half-finished
// establishment is a dashboard you already hold with an empty Accueil.

import type { ResolvedAccount } from "@/lib/auth/accounts";
import type { IconKey } from "@/lib/dashboard/icons";

/**
 * The three. `restaurant` and `bar` are the two halves of the venue
 * product — `Dashboard Restau` and `Dashboard Drinks/Cellar` of the
 * sprint row — and they are two cards rather than one because a
 * rooftop lounge asked to pick « Restaurant » is being told its place
 * is something it is not.
 */
export type DashboardId = "restaurant" | "bar" | "events";

/**
 * What `/choisir` says under its question — and what the sidebar card
 * says while there is no establishment behind it.
 *
 * Here rather than in the page because two screens say it: the chooser
 * itself, and the identity card that opens it. A partner reads the same
 * sentence before and after pressing, which is how they know the card
 * and the screen are the same thing.
 */
export const CHOOSER_LINE =
  "Un espace par activité. Vous pourrez en ajouter d'autres plus tard.";

export interface DashboardCard {
  id: DashboardId;
  label: string;
  /** One line, and it says what the dashboard is for. */
  line: string;
  icon: IconKey;
  /** True when the account already holds one of these. */
  active: boolean;
  /** Where the card goes: the dashboard, or the flow that makes one. */
  href: string;
  /**
   * What the card's button says.
   *
   * One verb each, because the three cards now carry the same control:
   * a full-width button at the foot of the card. « Actif » left the
   * word and became a badge beside the title — it is a *state*, and a
   * state inside the label of a button makes the partner read two
   * things to find the one they can press.
   */
  action: "Ouvrir" | "Ajouter";
}

const COPY: Record<DashboardId, { label: string; line: string; icon: IconKey }> = {
  restaurant: {
    label: "Restaurant",
    line: "Le carnet de réservations, les arrivées et la fiche de votre établissement.",
    icon: "utensils-crossed",
  },
  bar: {
    label: "Bar ou lounge",
    line: "Les mêmes réservations, plus la guest list et les tables minimums.",
    icon: "wine",
  },
  events: {
    label: "Événements",
    line: "La billetterie, le scanner à l'entrée et le bilan de chaque soirée.",
    icon: "ticket",
  },
};

/**
 * Which venue kind answers to which card.
 *
 * `drinks` is what the app calls a bar — the partner said « bar », the
 * listing says `drinks`, and the translation happens once, where the
 * venue is created. Here it has to be read back the same way round.
 */
function cardOfVenueKind(kind: string): DashboardId {
  return kind === "drinks" || kind === "bar" ? "bar" : "restaurant";
}

/**
 * The three cards for this account.
 *
 * `href` for an active card is the dashboard; for an offered one it is
 * the flow that creates it — the venue flow for the two halves of the
 * venue product, and the event side's own four steps for the third,
 * which the 27 October decision leaves exactly as it is.
 */
export function dashboardsFor(account: ResolvedAccount): DashboardCard[] {
  const held = new Set<DashboardId>();
  for (const venue of account.venues) held.add(cardOfVenueKind(venue.kind));
  if (account.organizations.length > 0) held.add("events");

  const firstOfKind = (id: DashboardId) =>
    account.venues.find((v) => cardOfVenueKind(v.kind) === id);

  return (["restaurant", "bar", "events"] as const).map((id) => {
    const active = held.has(id);
    const copy = COPY[id];
    return {
      id,
      label: copy.label,
      line: copy.line,
      icon: copy.icon,
      active,
      href: active
        ? id === "events"
          ? "/dashboard"
          : // The venue, by id: an account holding both a restaurant
            // and a bar must land on the one the card names, and
            // `/restaurant` alone would land on whichever the session
            // happened to have in its cookie.
            `/restaurant?etablissement=${firstOfKind(id)?.id ?? ""}`
        : id === "events"
          ? "/onboarding"
          : `/restaurant/etablissement/nouveau?type=${id === "bar" ? "bar" : "restaurant"}`,
      action: active ? "Ouvrir" : "Ajouter",
    };
  });
}

/**
 * The one space this account holds, when it holds exactly one.
 *
 * **Read by the sign-in and by nothing else.** It used to be read by
 * the chooser itself, which redirected on it — and that made the screen
 * impossible to open on purpose: a partner who held a restaurant and
 * came looking for the bar card was bounced back to their carnet
 * before it painted. Arriving somewhere you did not ask for is the
 * right behaviour for a *destination* and the wrong behaviour for a
 * *switcher*, and this screen is now the switcher.
 *
 * So the rule moved to where arriving is decided: `destinationFor`
 * skips the chooser at sign-in, once, when there is nothing to choose.
 * Everywhere else `/choisir` renders, every time, with the three cards.
 *
 * An account holding none still sees it at sign-in too: that is the
 * case the screen was built for.
 */
export function onlySpace(account: ResolvedAccount): DashboardCard | null {
  const active = dashboardsFor(account).filter((d) => d.active);
  return active.length === 1 ? active[0] : null;
}
