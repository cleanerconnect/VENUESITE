// Presentation vocabulary for the restaurant domain.
//
// Every enum the API can return gets exactly one entry here: its label,
// its tone, its glyph. Screens read these maps; no component ever spells
// out "EN SALLE" or decides that a no-show is red.
//
// The payoff is narrow but real: adding a reservation state is a line in
// this file, and a mistranslation is fixed in one place instead of in
// every screen that happens to render a pill.

import type { IconKey } from "@/lib/dashboard/icons";
import type { Badge, SemanticTone } from "@/lib/dashboard/spec";
import type {
  MenuCategory,
  MenuItemState,
  PayoutState,
  ReservationChannel,
  ReservationState,
  RestaurantActivityType,
  ServiceKind,
  ServiceState,
  TableState,
} from "@/lib/types/restaurant";

interface Term {
  label: string;
  tone: SemanticTone;
  icon: IconKey;
}

export const RESERVATION_STATE: Record<ReservationState, Term> = {
  requested: { label: "À CONFIRMER", tone: "warning", icon: "hourglass" },
  confirmed: { label: "CONFIRMÉE", tone: "info", icon: "check" },
  waitlisted: { label: "LISTE D'ATTENTE", tone: "muted", icon: "timer" },
  seated: { label: "EN SALLE", tone: "live", icon: "utensils" },
  completed: { label: "TERMINÉE", tone: "success", icon: "receipt" },
  no_show: { label: "ABSENT", tone: "danger", icon: "user-x" },
  cancelled: { label: "ANNULÉE", tone: "muted", icon: "ban" },
};

export const RESERVATION_CHANNEL: Record<ReservationChannel, string> = {
  lyfe: "LYFE",
  phone: "Téléphone",
  walk_in: "Sans réservation",
  partner: "Partenaire",
  instagram: "Instagram",
};

export const TABLE_STATE: Record<TableState, Term> = {
  free: { label: "LIBRE", tone: "muted", icon: "armchair" },
  reserved: { label: "RÉSERVÉE", tone: "info", icon: "calendar-clock" },
  seated: { label: "SERVIE", tone: "live", icon: "utensils" },
  dessert: { label: "DESSERT", tone: "violet", icon: "croissant" },
  to_clean: { label: "À DÉBARRASSER", tone: "warning", icon: "repeat" },
  blocked: { label: "BLOQUÉE", tone: "danger", icon: "ban" },
};

export const SERVICE_KIND: Record<ServiceKind, Term> = {
  petit_dejeuner: { label: "Petit-déjeuner", tone: "neutral", icon: "sunrise" },
  dejeuner: { label: "Déjeuner", tone: "neutral", icon: "sun" },
  diner: { label: "Dîner", tone: "violet", icon: "sunset" },
  tardif: { label: "Service tardif", tone: "muted", icon: "moon" },
};

export const SERVICE_STATE: Record<ServiceState, Term> = {
  scheduled: { label: "PROGRAMMÉ", tone: "muted", icon: "calendar" },
  open: { label: "OUVERT", tone: "info", icon: "door-open" },
  peak: { label: "COUP DE FEU", tone: "live", icon: "flame" },
  closing: { label: "FIN DE SERVICE", tone: "warning", icon: "hourglass" },
  closed: { label: "CLOS", tone: "muted", icon: "check" },
};

export const MENU_STATE: Record<MenuItemState, Term> = {
  available: { label: "DISPONIBLE", tone: "success", icon: "check" },
  low_stock: { label: "STOCK FAIBLE", tone: "warning", icon: "alert" },
  sold_out: { label: "ÉPUISÉ", tone: "danger", icon: "ban" },
};

export const MENU_CATEGORY: Record<MenuCategory, Term> = {
  entree: { label: "Entrée", tone: "neutral", icon: "salad" },
  plat: { label: "Plat", tone: "neutral", icon: "utensils-crossed" },
  dessert: { label: "Dessert", tone: "neutral", icon: "croissant" },
  boisson: { label: "Boisson", tone: "neutral", icon: "cup-soda" },
  cocktail: { label: "Cocktail", tone: "violet", icon: "martini" },
};

export const PAYOUT_STATE: Record<PayoutState, Term> = {
  scheduled: { label: "PROGRAMMÉ", tone: "info", icon: "calendar-clock" },
  processing: { label: "EN COURS", tone: "warning", icon: "hourglass" },
  paid: { label: "VERSÉ", tone: "success", icon: "check" },
};

export const ACTIVITY_TYPE: Record<RestaurantActivityType, Term> = {
  reservation_created: { label: "Réservation", tone: "success", icon: "calendar-plus" },
  reservation_cancelled: { label: "Annulation", tone: "warning", icon: "undo" },
  party_seated: { label: "Installation", tone: "live", icon: "armchair" },
  table_freed: { label: "Table libérée", tone: "info", icon: "repeat" },
  waitlist_joined: { label: "Liste d'attente", tone: "neutral", icon: "timer" },
  no_show: { label: "Absence", tone: "danger", icon: "user-x" },
  review_received: { label: "Avis", tone: "success", icon: "star" },
  item_86: { label: "Rupture", tone: "warning", icon: "ban" },
  payment_settled: { label: "Versement", tone: "violet", icon: "wallet" },
  anomaly: { label: "Signal", tone: "warning", icon: "alert" },
};

/** Badge for any reservation state, with the dot the status pills use. */
export function reservationBadge(state: ReservationState): Badge {
  const term = RESERVATION_STATE[state];
  return { label: term.label, tone: term.tone, dot: true };
}

export function tableBadge(state: TableState): Badge {
  const term = TABLE_STATE[state];
  return { label: term.label, tone: term.tone, dot: true };
}

export function serviceBadge(state: ServiceState): Badge {
  const term = SERVICE_STATE[state];
  return { label: term.label, tone: term.tone, dot: true };
}

export function menuBadge(state: MenuItemState): Badge {
  const term = MENU_STATE[state];
  return { label: term.label, tone: term.tone, dot: true };
}

export function payoutBadge(state: PayoutState): Badge {
  const term = PAYOUT_STATE[state];
  return { label: term.label, tone: term.tone, dot: true };
}
