// The canonical list of restaurant screens.
//
// Three things have to agree about which screens exist: the route that
// resolves a URL, the registry that builds the spec, and the sidebar that
// links to them. Keeping three lists in sync by hand is how a nav item
// ends up pointing at a 404.
//
// So this is the one list. The registry is typed as a total map over it,
// which makes a missing builder a compile error; `restaurantHref` builds
// every nav link from it, which makes a typo one too.
//
// No imports on purpose — anything that needs the list (including the
// edge middleware) can take it without dragging the data layer along.

export const RESTAURANT_SLUGS = [
  "",
  "reservations",
  "salle",
  "services",
  "clients",
  "menu",
  "avis",
  "analytique",
  "visibilite",
  "disponibilites",
  "versements",
] as const;

export type RestaurantSlug = (typeof RESTAURANT_SLUGS)[number];

export const RESTAURANT_BASE = "/restaurant";

/** Type-checked href for a restaurant screen. */
export function restaurantHref(slug: RestaurantSlug): string {
  return slug === "" ? RESTAURANT_BASE : `${RESTAURANT_BASE}/${slug}`;
}

export function isRestaurantSlug(value: string): value is RestaurantSlug {
  return (RESTAURANT_SLUGS as readonly string[]).includes(value);
}
