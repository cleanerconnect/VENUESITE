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
 * Lot 1 is the *Dashboard basique* of Planning Lyfe V3, sprint Prio 02,
 * 12 to 30 October 2026 — `docs/reference/Planning_Lyfe_V3_20260923.xlsx`,
 * sheet `Planning V3`, row `Prio 02`, and sheet `Détail Sprint `, row 40,
 * « Dashboard restaurant partenaire web · Mise en place des Dashboards
 * basique (Authentification + Création de Venue + Gestion des
 * reservation uniquement) ».
 *
 * Three nouns, and the word that decides the rest: *uniquement*.
 * Authentication is Connexion. Création de Venue is Ma fiche and
 * Disponibilités — the venue's own record and the hours it can be booked
 * for. Gestion des réservations is Accueil, Réservations, Check-in and
 * the alert that says a booking came in. Seven screens. Everything else
 * this repository renders — every figure, every review, every boost — is
 * *Dashboards avancés*, `Détail Sprint ` row 133, sprint Prio 08.
 *
 * Lot 2 is still built, designed and rendered here. It is handed over as
 * front-end and design for that later sprint rather than as something
 * the Business Service must answer for in October.
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
  // 1. Aujourd'hui — « Gestion des reservation ».
  "": 1,
  reservations: 1,
  calendrier: 2,
  // 2. En service — the door, which is where a booking is honoured.
  // The queue and the briefing are floor tools, not booking management.
  "liste-attente": 2,
  "check-in": 1,
  briefing: 2,
  // 3. Clients — a guest base is not in the sentence. Prio 08.
  clients: 2,
  segments: 2,
  audience: 2,
  // 4. Ma présence — « Création de Venue » is the record itself: the
  // name, the address, the contact, the photos, the hours. A menu is a
  // catalogue and a review is a conversation; neither creates a venue.
  "ma-fiche": 1,
  menu: 2,
  avis: 2,
  // 5. Croissance — paid placement, offers, experiences. Prio 08.
  visibilite: 2,
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
  // 8. Pilotage — every figure on this page reports on a service the
  // basique dashboard only runs. Reporting is Prio 08.
  performance: 2,
  bilans: 2,
  campagnes: 2,
  // 9. Établissement — the hours a venue can be booked for belong to
  // creating it; roles do not, and the only alert Lot 1 sends is the
  // one that says a booking came in.
  disponibilites: 1,
  equipe: 2,
  notifications: 1,
  // 10. Compte — the commercial relationship with LYFE, which the
  // basique sprint does not open.
  parametres: 2,
  abonnement: 2,
  support: 2,
};

/** Fiche client rides with Liste clients, and both wait for Prio 08. */
export const CUSTOMER_ROUTE_LOT: Lot = 2;

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
