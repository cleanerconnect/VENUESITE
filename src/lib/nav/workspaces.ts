// Workspace registry.
//
// The chrome used to spell out one product's navigation inline: two
// arrays in Sidebar, a third in BottomTabs, a fourth in MobilePlusMenu,
// plus a hardcoded CTA in Topbar. Adding a second product would have
// meant forking all four.
//
// So the chrome now reads from here. A workspace declares its own
// sidebar groups, phone tabs, topbar and identity card; the components
// resolve which workspace is active from the pathname and paint it. The
// event workspace below is the existing navigation, moved verbatim —
// nothing about the organizer UI changes.

import type { IconKey } from "@/lib/dashboard/icons";
import type { Role } from "@/lib/auth/session";
import {
  RESTAURANT_BASE,
  RESTAURANT_SETTINGS_PATH,
  restaurantHref,
} from "@/lib/restaurant/slugs";

export interface NavItem {
  label: string;
  href: string;
  icon: IconKey;
  /** Live dot when the item is active. */
  pulse?: boolean;
  /** Hidden for any role not in the list. Omit for "everyone". */
  allow?: Role[];
}

/**
 * A phone tab either navigates (`href`) or opens something in place
 * (`command`) — exactly one. The raised centre button is usually a
 * command: door duty should not cost the host their place on the screen.
 */
export type BottomTab = {
  label: string;
  icon: IconKey;
  /** The elevated centre button. One per workspace. */
  raised?: boolean;
} & ({ href: string; command?: never } | { command: string; href?: never });

export interface TopbarSpec {
  searchPlaceholder: string;
  /** Dark pill left of the bell — scanner on events, check-in on venues. */
  quickAction?: {
    label: string;
    icon: IconKey;
    command: string;
    /** Rendered as a kbd hint, e.g. "⌘⇧S". */
    shortcut?: string;
    title?: string;
  };
  /** Primary CTA on the right. */
  primaryAction?: {
    label: string;
    href: string;
    allow?: Role[];
  };
}

export interface Workspace {
  id: string;
  /** Lowercase caption under the wordmark. */
  caption: string;
  /** Landing route for the workspace. */
  home: string;
  /** Route prefixes that belong to this workspace, longest first. */
  matches: string[];
  /** Label in the workspace switcher. */
  switcherLabel: string;
  /** Identity card above the nav. Falls back to the session profile. */
  entity?: { initials: string; shortName: string; subline: string };
  /** Sidebar groups, rendered with a hairline divider between them. */
  groups: NavItem[][];
  /**
   * Rows for the phone "Plus" hub. Listed explicitly rather than derived
   * from `groups` because the hub is a different editorial cut: it holds
   * what the five bottom tabs don't, in the order a phone user reaches
   * for it.
   */
  secondary: NavItem[];
  tabs: BottomTab[];
  topbar: TopbarSpec;
}

const EVENT_WORKSPACE: Workspace = {
  id: "event",
  caption: "organisateur",
  home: "/dashboard",
  switcherLabel: "Espace organisateur",
  matches: ["/dashboard", "/events", "/bilans", "/audiences", "/visibilite", "/promo-codes", "/settlements", "/team", "/settings", "/scanner", "/activity", "/plus", "/more", "/onboarding"],
  groups: [
    [
      { label: "Vue d'ensemble", href: "/dashboard", icon: "layout" },
      { label: "Mes événements", href: "/events", icon: "ticket" },
      { label: "Bilans", href: "/bilans", icon: "file", allow: ["owner", "admin"] },
      { label: "Audiences", href: "/audiences", icon: "sparkles", allow: ["owner", "admin"] },
      { label: "Visibilité", href: "/visibilite", icon: "megaphone", allow: ["owner", "admin"] },
      { label: "Codes promo", href: "/promo-codes", icon: "tag", allow: ["owner", "admin"] },
      {
        label: "Créer un événement",
        href: "/events/new",
        icon: "plus-circle",
        pulse: true,
        allow: ["owner", "admin"],
      },
    ],
    [
      { label: "Versements", href: "/settlements", icon: "wallet", allow: ["owner", "admin"] },
      { label: "Équipe", href: "/team", icon: "users", allow: ["owner", "admin"] },
      { label: "Réglages", href: "/settings", icon: "settings" },
    ],
  ],
  secondary: [
    { label: "Bilans", href: "/bilans", icon: "file" },
    { label: "Visibilité", href: "/visibilite", icon: "megaphone" },
    { label: "Versements", href: "/settlements", icon: "wallet" },
    { label: "Codes promo", href: "/promo-codes", icon: "tag" },
    { label: "Équipe", href: "/team", icon: "users" },
    { label: "Réglages", href: "/settings", icon: "settings" },
    { label: "Activité", href: "/activity", icon: "clock" },
  ],
  tabs: [
    { label: "Aperçu", href: "/dashboard", icon: "layout" },
    { label: "Événements", href: "/events", icon: "ticket" },
    { label: "Scanner", href: "/scanner", icon: "scan", raised: true },
    { label: "Audiences", href: "/audiences", icon: "sparkles" },
    { label: "Plus", href: "/plus", icon: "grid" },
  ],
  topbar: {
    searchPlaceholder: "Rechercher un événement, un participant…",
    quickAction: {
      label: "Scanner",
      icon: "scan",
      command: "scanner.open",
      shortcut: "⌘⇧S",
      title: "Scanner, ⌘ + Shift + S",
    },
    primaryAction: {
      label: "Créer un événement",
      href: "/events/new",
      allow: ["owner", "admin"],
    },
  },
};

const RESTAURANT_WORKSPACE: Workspace = {
  id: "restaurant",
  caption: "restaurant",
  home: RESTAURANT_BASE,
  switcherLabel: "Espace restaurant",
  matches: [RESTAURANT_BASE],
  groups: [
    [
      { label: "Vue d'ensemble", href: restaurantHref(""), icon: "layout" },
      { label: "Réservations", href: restaurantHref("reservations"), icon: "calendar-clock" },
      { label: "Services", href: restaurantHref("services"), icon: "sunset", allow: ["owner", "admin"] },
      { label: "Disponibilités", href: restaurantHref("disponibilites"), icon: "calendar-plus", allow: ["owner", "admin"] },
      { label: "Clients", href: restaurantHref("clients"), icon: "users", allow: ["owner", "admin"] },
      { label: "Carte", href: restaurantHref("menu"), icon: "utensils-crossed", allow: ["owner", "admin"] },
      { label: "Avis", href: restaurantHref("avis"), icon: "star", allow: ["owner", "admin"] },
      { label: "Analytique", href: restaurantHref("analytique"), icon: "gauge", allow: ["owner", "admin"] },
      { label: "Visibilité", href: restaurantHref("visibilite"), icon: "megaphone", allow: ["owner", "admin"] },
    ],
    [
      { label: "Versements", href: restaurantHref("versements"), icon: "wallet", allow: ["owner", "admin"] },
      { label: "Réglages du lieu", href: RESTAURANT_SETTINGS_PATH, icon: "settings" },
    ],
  ],
  secondary: [
    { label: "Services", href: restaurantHref("services"), icon: "sunset" },
    { label: "Disponibilités", href: restaurantHref("disponibilites"), icon: "calendar-plus" },
    { label: "Clients", href: restaurantHref("clients"), icon: "users" },
    { label: "Analytique", href: restaurantHref("analytique"), icon: "gauge" },
    { label: "Visibilité", href: restaurantHref("visibilite"), icon: "megaphone" },
    { label: "Avis", href: restaurantHref("avis"), icon: "star" },
    { label: "Versements", href: restaurantHref("versements"), icon: "wallet" },
    { label: "Réglages du lieu", href: RESTAURANT_SETTINGS_PATH, icon: "settings" },
  ],
  tabs: [
    { label: "Aperçu", href: restaurantHref(""), icon: "layout" },
    { label: "Carnet", href: restaurantHref("reservations"), icon: "calendar-clock" },
    // Door duty gets the raised centre button, the way the event
    // workspace raises the scanner. It opens a sheet rather than
    // navigating, so it carries a command instead of an href.
    { label: "Arrivées", command: "checkin.open", icon: "user-check", raised: true },
    { label: "Carte", href: restaurantHref("menu"), icon: "utensils-crossed" },
    { label: "Plus", href: "/plus", icon: "grid" },
  ],
  topbar: {
    searchPlaceholder: "Rechercher une réservation, un client…",
    quickAction: {
      label: "Arrivées",
      icon: "user-check",
      command: "checkin.open",
      title: "Enregistrer une arrivée",
    },
    primaryAction: {
      label: "Nouvelle réservation",
      href: `${restaurantHref("reservations")}?nouvelle=1`,
      allow: ["owner", "admin"],
    },
  },
};

export const WORKSPACES: Workspace[] = [EVENT_WORKSPACE, RESTAURANT_WORKSPACE];

export const DEFAULT_WORKSPACE = EVENT_WORKSPACE;

/**
 * Which workspace owns a path. Longest matching prefix wins so
 * /restaurant/salle resolves to the restaurant even though the event
 * workspace also claims short top-level routes.
 */
export function resolveWorkspace(pathname: string | null): Workspace {
  if (!pathname) return DEFAULT_WORKSPACE;

  let best: { workspace: Workspace; length: number } | null = null;
  for (const workspace of WORKSPACES) {
    for (const prefix of workspace.matches) {
      const hit = pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (hit && (!best || prefix.length > best.length)) {
        best = { workspace, length: prefix.length };
      }
    }
  }
  return best?.workspace ?? DEFAULT_WORKSPACE;
}

/** Nav items a given role may see. */
export function visibleItems<T extends { allow?: Role[] }>(
  items: T[],
  role: Role | null,
): T[] {
  return items.filter((i) => !i.allow || (role !== null && i.allow.includes(role)));
}

/** Active-state test shared by the sidebar and the phone tabs. */
export function isActive(pathname: string | null, href: string, home: string) {
  if (!pathname) return false;
  if (href === home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
