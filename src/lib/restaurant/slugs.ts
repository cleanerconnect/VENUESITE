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
  // 1. Aujourd'hui
  "",
  "reservations",
  "calendrier",
  // 2. En service
  "liste-attente",
  "check-in",
  "briefing",
  // 3. Clients
  "clients",
  "segments",
  // 4. Ma présence
  "ma-fiche",
  "menu",
  "avis",
  // 5. Croissance
  "visibilite",
  "offres",
  "experiences",
  // 6. Vie nocturne — rendered only where the configuration enables it.
  "guest-list",
  "tables",
  "promoteurs",
  // 7. Paiements
  "acomptes",
  "annulations",
  "lyfe-pay",
  // 8. Pilotage
  "performance",
  "bilans",
  "campagnes",
  // 9. Établissement
  "disponibilites",
  "equipe",
  "notifications",
  // 10. Compte
  "parametres",
  "abonnement",
  "support",
] as const;

export type RestaurantSlug = (typeof RESTAURANT_SLUGS)[number];

export const RESTAURANT_BASE = "/restaurant";

/** Type-checked href for a restaurant screen. */
export function restaurantHref(slug: RestaurantSlug): string {
  return slug === "" ? RESTAURANT_BASE : `${RESTAURANT_BASE}/${slug}`;
}

/**
 * The venue's own editing surface: identity, listing, photos, menu,
 * staff. A form, not a spec screen, so it lives on its own route rather
 * than in the screen registry. Ma fiche links into it section by
 * section; the path is exported here so the nav has one source.
 */
export const RESTAURANT_SETTINGS_PATH = `${RESTAURANT_BASE}/reglages`;

/**
 * Fiche client. A detail route under Clients rather than a slug of its
 * own, because it is always opened for one guest — the spec counts it
 * among the thirty screens, and this is where it lives.
 */
export function customerHref(customerId: string): string {
  return `${RESTAURANT_BASE}/clients/${customerId}`;
}

export function isRestaurantSlug(value: string): value is RestaurantSlug {
  return (RESTAURANT_SLUGS as readonly string[]).includes(value);
}
