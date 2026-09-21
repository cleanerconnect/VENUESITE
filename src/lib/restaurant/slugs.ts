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
  "audience",
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

/**
 * The two lots the portal is delivered in.
 *
 * Lot 1 is the dashboard DigiNegoce wires: the screens priced on row 39
 * of ChiffrageV3.0 and confirmed in the September scope email. Lot 2 is
 * everything else on this page — built, designed and rendered here, but
 * handed over as front-end and design for a later phase rather than as
 * something the Business Service must answer now.
 *
 * The field says what a Lot 1 deployment registers, which for the venue
 * dashboard is exactly the contractual split.
 */
export type Lot = 1 | 2;

/**
 * Which lot each screen belongs to.
 *
 * A total map, like the block registry: adding a slug without placing it
 * in a lot is a compile error, because the alternative is a screen that
 * quietly ships in a delivery nobody sold.
 */
export const LOT_BY_SLUG: Record<RestaurantSlug, Lot> = {
  // 1. Aujourd'hui
  "": 1,
  reservations: 1,
  calendrier: 2,
  // 2. En service
  "liste-attente": 2,
  "check-in": 1,
  briefing: 2,
  // 3. Clients
  clients: 1,
  segments: 2,
  audience: 2,
  // 4. Ma présence
  "ma-fiche": 1,
  menu: 1,
  avis: 1,
  // 5. Croissance
  visibilite: 1,
  offres: 2,
  experiences: 2,
  // 6. Vie nocturne — entirely Lot 2.
  "guest-list": 2,
  tables: 2,
  promoteurs: 2,
  // 7. Paiements — entirely Lot 2.
  acomptes: 2,
  annulations: 2,
  "lyfe-pay": 2,
  // 8. Pilotage
  performance: 1,
  bilans: 1,
  campagnes: 2,
  // 9. Établissement
  disponibilites: 1,
  equipe: 1,
  notifications: 1,
  // 10. Compte
  parametres: 1,
  abonnement: 1,
  support: 1,
};

/** The Fiche client detail route rides with Liste clients. */
export const CUSTOMER_ROUTE_LOT: Lot = 1;

/** Whether a screen is registered in a deployment running `lot`. */
export function slugInLot(slug: RestaurantSlug, lot: Lot): boolean {
  return lot === 2 || LOT_BY_SLUG[slug] === 1;
}

export const RESTAURANT_BASE = "/restaurant";

/** Type-checked href for a restaurant screen. */
export function restaurantHref(slug: RestaurantSlug): string {
  return slug === "" ? RESTAURANT_BASE : `${RESTAURANT_BASE}/${slug}`;
}

/**
 * Ma fiche: identity, listing and photos.
 *
 * A form, not a spec screen — drag-reordering and file upload are not
 * blocks, and inventing a block type per field would be worse than a
 * page. It keeps its own route, alongside Menu and Équipe et rôles,
 * which are the same form scoped to their own panel.
 */
export const RESTAURANT_SETTINGS_PATH = `${RESTAURANT_BASE}/ma-fiche`;

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
