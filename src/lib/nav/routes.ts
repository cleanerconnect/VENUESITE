// The route index.
//
// Every screen the portal ships, what it is for, who may open it, and
// whether it is finished. One list, consumed by the styleguide and
// quoted in the README, so "what screens exist?" has a single answer
// that cannot drift from the two places it used to be answered badly.
//
// `status` is deliberately blunt:
//
//   built    finished against current scope
//   partial  renders and is useful, but something named below is missing
//
// There is no "planned" — a screen that does not exist does not get a
// row here, and it does not get a nav entry either.

export type RouteStatus = "built" | "partial";

export interface RouteEntry {
  path: string;
  label: string;
  /** One line: what a partner does here. */
  purpose: string;
  workspace: "entry" | "event" | "venue" | "shared";
  /** Who can open it. Empty means anyone signed in. */
  roles?: string;
  status: RouteStatus;
  /** What is missing, when status is `partial`. */
  gap?: string;
}

export const ROUTES: RouteEntry[] = [
  // ── Entry ──
  {
    path: "/login",
    label: "Connexion",
    purpose:
      "Le seul point d'entrée. Résout le compte vers son espace ; propose de choisir le lieu quand il y en a plusieurs.",
    workspace: "entry",
    status: "built",
  },
  {
    path: "/splash",
    label: "Splash",
    purpose: "Écran de lancement de l'application mobile.",
    workspace: "entry",
    status: "built",
  },
  {
    path: "/contact",
    label: "Demander une démo",
    purpose: "Formulaire public pour un partenaire sans accès.",
    workspace: "entry",
    status: "built",
  },
  {
    path: "/styleguide",
    label: "Styleguide",
    purpose:
      "Chaque composant dans chacun de ses états, plus cet index. Aucune session requise.",
    workspace: "shared",
    status: "built",
  },

  // ── Event workspace ──
  {
    path: "/dashboard",
    label: "Vue d'ensemble",
    purpose:
      "L'état de l'organisation : événement en cours, ventes du jour, prochain versement, activité.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/events",
    label: "Mes événements",
    purpose: "Tous les événements, filtrés par état du cycle de vie.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/events/new",
    label: "Créer un événement",
    purpose: "Assistant en cinq étapes : info, média, tarifs, remboursement, vérification.",
    workspace: "event",
    roles: "Propriétaire, Administrateur",
    status: "partial",
    gap: "La soumission affiche une confirmation ; rien n'est persisté.",
  },
  {
    path: "/events/evt_jazz_2026",
    label: "Détail d'un événement",
    purpose:
      "Ventes, analyses, participants, invitations, remboursements, régie, promotion, bilan.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/events/evt_jazz_2026/edit",
    label: "Édition d'un événement",
    purpose: "Corriger un événement, notamment après un refus de modération.",
    workspace: "event",
    roles: "Propriétaire, Administrateur",
    status: "partial",
    gap: "Comme la création : la soumission n'est pas persistée.",
  },
  {
    path: "/bilans",
    label: "Bilans",
    purpose: "Les rapports post-événement, prêts à partager ou imprimer.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/audiences",
    label: "Audiences",
    purpose:
      "Qui achète : segments, cohortes, géographie, comparaison au marché.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/audiences/details",
    label: "Audiences · détail",
    purpose: "La version complète des panneaux que le mobile résume.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/visibilite",
    label: "Visibilité",
    purpose: "Campagnes de mise en avant, budget, ROAS.",
    workspace: "event",
    status: "partial",
    gap: "Lancer un boost ouvre l'assistant mais ne crée pas de campagne.",
  },
  {
    path: "/promo-codes",
    label: "Codes promo",
    purpose: "Réductions ciblées et suivi des utilisations.",
    workspace: "event",
    status: "partial",
    gap: "La création affiche le code sans le persister.",
  },
  {
    path: "/scanner",
    label: "Scanner",
    purpose:
      "Contrôle des billets à l'entrée, plein écran sombre, pensé pour une main.",
    workspace: "event",
    status: "partial",
    gap: "La caméra n'est pas branchée ; les scans sont simulés.",
  },
  {
    path: "/settlements",
    label: "Versements",
    purpose: "Prochain versement, historique, factures, dépenses de boost.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/activity",
    label: "Activité",
    purpose: "Le flux complet, promu en écran sur mobile.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/team",
    label: "Équipe",
    purpose: "Qui a accès, à quel rôle, et le journal d'audit.",
    workspace: "event",
    status: "partial",
    gap: "Les invitations vivent dans l'état local, pas dans un backend.",
  },
  {
    path: "/settings",
    label: "Réglages",
    purpose: "Profil de l'organisation, versements, préférences.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/onboarding",
    label: "Onboarding",
    purpose: "Quatre étapes : bienvenue, profil, banque, équipe.",
    workspace: "event",
    status: "built",
  },

  // ── Venue workspace ──
  {
    path: "/restaurant",
    label: "Vue d'ensemble",
    purpose:
      "Le service en cours : couverts, arrivées, suggestion, carnet du soir.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/reservations",
    label: "Réservations",
    purpose:
      "Le carnet : confirmer, refuser avec motif, marquer une arrivée ou une absence.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/services",
    label: "Services",
    purpose: "Les services passés et à venir, avec leur charge par créneau.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/disponibilites",
    label: "Disponibilités",
    purpose:
      "Ce qu'un client peut réserver : créneaux, capacités, fermetures exceptionnelles.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/clients",
    label: "Clients",
    purpose: "Habitués, préférences, historique d'absences.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/menu",
    label: "Carte",
    purpose: "Les plats tels que l'application les affiche avant réservation.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/avis",
    label: "Avis",
    purpose: "Les avis clients et les thèmes qui reviennent.",
    workspace: "venue",
    status: "partial",
    gap: "Répondre affiche une confirmation ; aucune plateforme d'avis n'est branchée.",
  },
  {
    path: "/restaurant/analytique",
    label: "Analytique",
    purpose: "Couverts, recette, absences, comparés à la période précédente.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/visibilite",
    label: "Visibilité",
    purpose: "Impressions et vues de la fiche dans l'application.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/versements",
    label: "Versements",
    purpose: "Versements LYFE, commission déduite, couverts réglés.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/reglages",
    label: "Réglages du lieu",
    purpose:
      "Identité, fiche applicative, carte, horaires, photos, équipe. Tout y est enregistré pour de vrai.",
    workspace: "venue",
    roles: "Propriétaire, Gérant (Équipe : accès refusé)",
    status: "built",
  },

  // ── Shared ──
  {
    path: "/plus",
    label: "Plus",
    purpose: "Le menu de débordement du mobile.",
    workspace: "shared",
    status: "built",
  },
  {
    path: "/more",
    label: "Plus (compte)",
    purpose: "Équipe, réglages et déconnexion sur mobile.",
    workspace: "shared",
    status: "built",
  },
];

export const WORKSPACE_LABEL: Record<RouteEntry["workspace"], string> = {
  entry: "Entrée",
  event: "Espace événements",
  venue: "Espace lieux",
  shared: "Partagé",
};
