// Venue configuration.
//
// The brief is explicit: Restaurants and Drinks share one functional
// perimeter — a single base with two configurations, not two builds. So
// the difference lives here, as vocabulary and a few thresholds, and
// every screen builder reads from it.
//
// What is NOT here is as important as what is: no per-kind screen list, no
// per-kind blocks, no branching in a component. If a Drinks venue ever
// needs a screen a restaurant doesn't, that is a screen registered for one
// kind — not a fork of the workspace.

import type { VenueKind } from "@/lib/types/business";
import type { VenueConfiguration } from "@/lib/types/venue-operations";

export interface VenueConfig {
  kind: VenueKind;
  /** Sidebar caption and workspace switcher label. */
  workspaceLabel: string;
  /** What a booked head is called. Drives every count in the UI. */
  cover: { one: string; many: string };
  /** What a sitting is called. */
  service: { one: string; many: string };
  /** What the seating map is called. */
  floorPlanLabel: string;
  /** What the offer list is called. */
  menuLabel: string;
  /** Typical minutes a table is held — the default turn for new venues. */
  defaultTurnMinutes: number;
  /** What a walk-in is called at the door. */
  walkInLabel: string;
  /** What a table type is called, where the venue sells them. */
  tableLabel: string;
}

const RESTAURANT: VenueConfig = {
  kind: "restaurant",
  workspaceLabel: "Espace restaurant",
  cover: { one: "couvert", many: "couverts" },
  service: { one: "service", many: "services" },
  floorPlanLabel: "Plan de salle",
  menuLabel: "Carte",
  defaultTurnMinutes: 96,
  walkInLabel: "Walk-in",
  tableLabel: "Table",
};

const DRINKS: VenueConfig = {
  kind: "drinks",
  workspaceLabel: "Espace bar",
  // A bar seats people, not covers — and turns them roughly twice as fast.
  cover: { one: "personne", many: "personnes" },
  service: { one: "créneau", many: "créneaux" },
  floorPlanLabel: "Plan de salle",
  menuLabel: "Carte des boissons",
  defaultTurnMinutes: 52,
  // At a door, a party that turns up without a booking is an entry.
  walkInLabel: "Entrée porte",
  tableLabel: "Table",
};

export const VENUE_CONFIGS: Record<VenueKind, VenueConfig> = {
  restaurant: RESTAURANT,
  drinks: DRINKS,
};

export function venueConfig(kind: VenueKind): VenueConfig {
  return VENUE_CONFIGS[kind];
}

/** "6 couverts" / "6 personnes", per the venue's vocabulary. */
export function covers(config: VenueConfig, n: number): string {
  return `${n} ${n > 1 ? config.cover.many : config.cover.one}`;
}

// ── Configuration type ───────────────────────────────────────
//
// The switch in Paramètres, and the one thing in the product that adds a
// navigation group rather than renaming one. It is deliberately NOT
// `venues.kind`: kind is what the consumer app lists the place as, and a
// restaurant with a rooftop bar is listed as a restaurant while running
// guest lists and table minimums every Friday.
//
// The spec is explicit that drinks is a configuration, not a second
// product: it enables Vie nocturne, renames covers to people and
// services to time bands, adds table types as inventory, and adds dress
// code and age policy to Ma fiche. Everything else is identical, so
// there is no per-configuration screen list anywhere below.

export const CONFIGURATION_LABEL: Record<VenueConfiguration, string> = {
  restaurant: "Restaurant",
  lounge: "Lounge",
  both: "Restaurant et lounge",
};

/** Whether the Vie nocturne group and its three screens exist at all. */
export function hasNightlife(configuration: VenueConfiguration): boolean {
  return configuration === "lounge" || configuration === "both";
}

/**
 * The vocabulary a configuration speaks.
 *
 * `both` takes the restaurant's words: a place that serves dinner and
 * then opens the rooftop still counts covers at eight o'clock, and one
 * vocabulary per venue beats two that change at a time of night.
 */
export function configFor(configuration: VenueConfiguration): VenueConfig {
  return configuration === "lounge" ? DRINKS : RESTAURANT;
}

/** "6 personnes" at a lounge, "6 couverts" at a restaurant. */
export function coversFor(
  configuration: VenueConfiguration,
  n: number,
): string {
  return covers(configFor(configuration), n);
}
