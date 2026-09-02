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
}

const RESTAURANT: VenueConfig = {
  kind: "restaurant",
  workspaceLabel: "Espace restaurant",
  cover: { one: "couvert", many: "couverts" },
  service: { one: "service", many: "services" },
  floorPlanLabel: "Plan de salle",
  menuLabel: "Carte",
  defaultTurnMinutes: 96,
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
