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
  restaurantHref,
} from "@/lib/restaurant/slugs";
import type { VenueConfiguration } from "@/lib/types/venue-operations";
import { hasNightlife } from "@/lib/venue/config";

/** A named sidebar group. The spec's ten, rendered in its order. */
export interface NavGroup {
  label: string;
  items: NavItem[];
  /**
   * Shown only for these configurations. Vie nocturne is the one group
   * that appears and disappears, which is the whole difference between
   * the two configurations of the venue product.
   */
  configurations?: VenueConfiguration[];
}

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
  /** Sidebar groups, rendered with their label and a hairline rule. */
  groups: NavGroup[];
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
    {
      label: "Organisation",
      items: [
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
    },
    {
      label: "Compte",
      items: [
        { label: "Versements", href: "/settlements", icon: "wallet", allow: ["owner", "admin"] },
        { label: "Équipe", href: "/team", icon: "users", allow: ["owner", "admin"] },
        { label: "Réglages", href: "/settings", icon: "settings" },
      ],
    },
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
  caption: "établissement",
  home: RESTAURANT_BASE,
  switcherLabel: "Espace établissement",
  matches: [RESTAURANT_BASE],
  // The specification's ten groups, in its order. Roles follow its own
  // rule: staff see today, service and clients; managers add presence,
  // growth, nightlife and establishment; owners add payments, pilotage
  // and account.
  groups: [
    {
      label: "Aujourd'hui",
      items: [
        { label: "Accueil", href: restaurantHref(""), icon: "layout" },
        { label: "Réservations", href: restaurantHref("reservations"), icon: "calendar-clock" },
        { label: "Calendrier", href: restaurantHref("calendrier"), icon: "calendar" },
      ],
    },
    {
      label: "En service",
      items: [
        { label: "Liste d'attente", href: restaurantHref("liste-attente"), icon: "timer" },
        { label: "Check-in", href: restaurantHref("check-in"), icon: "user-check" },
        { label: "Briefing", href: restaurantHref("briefing"), icon: "clipboard" },
      ],
    },
    {
      label: "Clients",
      items: [
        { label: "Liste clients", href: restaurantHref("clients"), icon: "users" },
        {
          label: "Tags et segments",
          href: restaurantHref("segments"),
          icon: "tag",
          allow: ["owner", "admin"],
        },
      ],
    },
    {
      label: "Ma présence",
      items: [
        {
          label: "Ma fiche",
          href: restaurantHref("ma-fiche"),
          icon: "building",
          allow: ["owner", "admin"],
        },
        {
          label: "Menu",
          href: restaurantHref("menu"),
          icon: "utensils-crossed",
          allow: ["owner", "admin"],
        },
        { label: "Avis", href: restaurantHref("avis"), icon: "star", allow: ["owner", "admin"] },
      ],
    },
    {
      label: "Croissance",
      items: [
        {
          label: "Visibilité",
          href: restaurantHref("visibilite"),
          icon: "megaphone",
          allow: ["owner", "admin"],
        },
        { label: "Offres", href: restaurantHref("offres"), icon: "percent", allow: ["owner", "admin"] },
        {
          label: "Expériences",
          href: restaurantHref("experiences"),
          icon: "sparkles",
          allow: ["owner", "admin"],
        },
      ],
    },
    {
      label: "Vie nocturne",
      // The one group that is configuration-dependent. A restaurant does
      // not see it at all — not greyed out, not empty: absent.
      configurations: ["lounge", "both"],
      items: [
        {
          label: "Guest list",
          href: restaurantHref("guest-list"),
          icon: "door-open",
        },
        {
          label: "Tables minimums",
          href: restaurantHref("tables"),
          icon: "armchair",
          allow: ["owner", "admin"],
        },
        {
          label: "Promoteurs",
          href: restaurantHref("promoteurs"),
          icon: "user-plus",
          allow: ["owner", "admin"],
        },
      ],
    },
    {
      label: "Paiements",
      items: [
        { label: "Acomptes", href: restaurantHref("acomptes"), icon: "wallet", allow: ["owner"] },
        { label: "Annulations", href: restaurantHref("annulations"), icon: "ban", allow: ["owner"] },
        { label: "Lyfe Pay", href: restaurantHref("lyfe-pay"), icon: "banknote", allow: ["owner"] },
      ],
    },
    {
      label: "Pilotage",
      items: [
        { label: "Performance", href: restaurantHref("performance"), icon: "gauge", allow: ["owner"] },
        { label: "Bilans", href: restaurantHref("bilans"), icon: "file", allow: ["owner"] },
        { label: "Campagnes", href: restaurantHref("campagnes"), icon: "megaphone", allow: ["owner"] },
      ],
    },
    {
      label: "Établissement",
      items: [
        {
          label: "Disponibilités",
          href: restaurantHref("disponibilites"),
          icon: "calendar-plus",
          allow: ["owner", "admin"],
        },
        {
          label: "Équipe et rôles",
          href: restaurantHref("equipe"),
          icon: "users",
          allow: ["owner", "admin"],
        },
        {
          label: "Notifications",
          href: restaurantHref("notifications"),
          icon: "bell",
          allow: ["owner", "admin"],
        },
      ],
    },
    {
      label: "Compte",
      items: [
        { label: "Paramètres", href: restaurantHref("parametres"), icon: "settings", allow: ["owner"] },
        { label: "Abonnement", href: restaurantHref("abonnement"), icon: "coins", allow: ["owner"] },
        { label: "Support", href: restaurantHref("support"), icon: "message" },
      ],
    },
  ],
  secondary: [
    { label: "Calendrier", href: restaurantHref("calendrier"), icon: "calendar" },
    { label: "Briefing", href: restaurantHref("briefing"), icon: "clipboard" },
    { label: "Liste clients", href: restaurantHref("clients"), icon: "users" },
    { label: "Tags et segments", href: restaurantHref("segments"), icon: "tag" },
    { label: "Ma fiche", href: restaurantHref("ma-fiche"), icon: "building" },
    { label: "Menu", href: restaurantHref("menu"), icon: "utensils-crossed" },
    { label: "Avis", href: restaurantHref("avis"), icon: "star" },
    { label: "Visibilité", href: restaurantHref("visibilite"), icon: "megaphone" },
    { label: "Offres", href: restaurantHref("offres"), icon: "percent" },
    { label: "Expériences", href: restaurantHref("experiences"), icon: "sparkles" },
    { label: "Guest list", href: restaurantHref("guest-list"), icon: "door-open" },
    { label: "Tables minimums", href: restaurantHref("tables"), icon: "armchair" },
    { label: "Promoteurs", href: restaurantHref("promoteurs"), icon: "user-plus" },
    { label: "Acomptes", href: restaurantHref("acomptes"), icon: "wallet" },
    { label: "Annulations", href: restaurantHref("annulations"), icon: "ban" },
    { label: "Lyfe Pay", href: restaurantHref("lyfe-pay"), icon: "banknote" },
    { label: "Performance", href: restaurantHref("performance"), icon: "gauge" },
    { label: "Bilans", href: restaurantHref("bilans"), icon: "file" },
    { label: "Campagnes", href: restaurantHref("campagnes"), icon: "megaphone" },
    { label: "Disponibilités", href: restaurantHref("disponibilites"), icon: "calendar-plus" },
    { label: "Équipe et rôles", href: restaurantHref("equipe"), icon: "users" },
    { label: "Notifications", href: restaurantHref("notifications"), icon: "bell" },
    { label: "Paramètres", href: restaurantHref("parametres"), icon: "settings" },
    { label: "Abonnement", href: restaurantHref("abonnement"), icon: "coins" },
    { label: "Support", href: restaurantHref("support"), icon: "message" },
  ],
  tabs: [
    { label: "Accueil", href: restaurantHref(""), icon: "layout" },
    { label: "Carnet", href: restaurantHref("reservations"), icon: "calendar-clock" },
    // Door duty gets the raised centre button, the way the event
    // workspace raises the scanner. It opens a sheet rather than
    // navigating, so it carries a command instead of an href.
    { label: "Arrivées", command: "checkin.open", icon: "user-check", raised: true },
    { label: "Attente", href: restaurantHref("liste-attente"), icon: "timer" },
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

/**
 * The groups a configuration actually shows.
 *
 * Vie nocturne is the only one that moves, and it moves as a whole: the
 * spec is explicit that drinks is a configuration rather than a second
 * product, so nothing else in the navigation changes with it.
 */
export function visibleGroups(
  workspace: Workspace,
  configuration: VenueConfiguration,
): NavGroup[] {
  return workspace.groups.filter(
    (group) =>
      !group.configurations ||
      (group.label === "Vie nocturne"
        ? hasNightlife(configuration)
        : group.configurations.includes(configuration)),
  );
}

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
