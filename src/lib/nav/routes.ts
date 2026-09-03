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
//   service  the portal side is finished; an external service is not
//            connected, so the action is recorded rather than performed
//
// The third value earns its place. "Partial" used to cover two different
// things — work this repo still owes, and work no amount of front-end
// code can do because Payzone, Twilio or a review platform is not
// wired — and conflating them told the incoming team to look for a bug
// where there was a missing integration.
//
// There is no "planned" — a screen that does not exist does not get a
// row here, and it does not get a nav entry either.

export type RouteStatus = "built" | "partial" | "service";

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
  /** Which service is not connected, when status is `service`. */
  dependsOn?: string;
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
    path: "/events/evt_jzb_robbie",
    label: "Détail d'un événement",
    purpose:
      "Ventes, analyses, participants, invitations, remboursements, régie, promotion, bilan.",
    workspace: "event",
    status: "built",
  },
  {
    path: "/events/evt_jzb_robbie/edit",
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
  //
  // The target specification's thirty screens, in its ten groups and its
  // order. Vie nocturne appears only where the establishment's
  // configuration includes a lounge — Nomad Rooftop in the demo data,
  // not Dar Zellij.

  // 1. Aujourd'hui
  {
    path: "/restaurant",
    label: "Accueil",
    purpose:
      "Ce qui se passe aujourd'hui : chiffres du jour, file d'attente à traiter, bande des quatre prochaines heures.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/reservations",
    label: "Réservations",
    purpose:
      "Le carnet d'une journée : accepter, refuser avec motif, modifier, marquer arrivé, absent, annuler.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/calendrier",
    label: "Calendrier",
    purpose:
      "La charge par jour, en semaine ou en mois. Fermer une journée, forcer une capacité, repérer un service creux.",
    workspace: "venue",
    status: "built",
  },

  // 2. En service
  {
    path: "/restaurant/liste-attente",
    label: "Liste d'attente",
    purpose:
      "La porte quand la salle est pleine. Prévenir, installer, retirer avec motif ; installer crée la réservation.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/check-in",
    label: "Check-in",
    purpose:
      "Valider une arrivée : caméra, code saisi, recherche par nom, annulation dans les cinq minutes.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/briefing",
    label: "Briefing",
    purpose:
      "Ce que l'équipe lit avant l'ouverture : VIP, allergies, occasions, grandes tables, acomptes en attente, notes de service.",
    workspace: "venue",
    status: "built",
  },

  // 3. Clients
  {
    path: "/restaurant/clients",
    label: "Liste clients",
    purpose:
      "La base, alimentée par les réservations, les walk-ins et les installations depuis la liste d'attente.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/clients/cus_1",
    label: "Fiche client",
    purpose:
      "Tout ce que le lieu sait d'un client : visites, risque d'absence sur douze mois, préférences, avis, messages, anonymisation.",
    workspace: "venue",
    status: "built",
  },
  {
    path: "/restaurant/segments",
    label: "Tags et segments",
    purpose:
      "Le vocabulaire de la base : étiquettes manuelles, règles automatiques et leurs seuils, segments enregistrés.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },

  // 4. Ma présence
  {
    path: "/restaurant/ma-fiche",
    label: "Ma fiche",
    purpose:
      "Ce que l'application montre de l'établissement : identité, fiche, photos. Enregistré pour de vrai.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/menu",
    label: "Menu",
    purpose: "La carte telle que l'application l'affiche. Ajouter, masquer, réordonner.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "service",
    dependsOn:
      "L'import assisté d'un PDF en articles structurés attend un service d'extraction. Le téléversement du PDF, lui, fonctionne : la carte fichier est publiée sur la fiche.",
  },
  {
    path: "/restaurant/avis",
    label: "Avis",
    purpose:
      "Les avis, le sondage après visite et la redirection des clients satisfaits vers Google ou Tripadvisor.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "service",
    dependsOn:
      "Les réponses publiques et la redirection vers Google ou Tripadvisor attendent la connexion des plateformes. Le sondage, les liens et le seuil de redirection s'enregistrent.",
  },

  // 5. Croissance
  {
    path: "/restaurant/visibilite",
    label: "Visibilité",
    purpose:
      "Impressions, ouvertures de fiche, conversion, et la liste honnête de ce qui pèse sur le classement.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/offres",
    label: "Offres",
    purpose:
      "Remplir un service creux sans toucher aux prix. Attribution comptée sur les offres appliquées.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/experiences",
    label: "Expériences",
    purpose:
      "Vendre autre chose qu'une table : soirée, atelier, brunch, avec billetterie et recette.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },

  // 6. Vie nocturne — configuration lounge uniquement
  {
    path: "/restaurant/guest-list",
    label: "Guest list",
    purpose:
      "Les listes d'entrée par nuit, leurs tranches tarifaires et la vue porte à une validation par entrée.",
    workspace: "venue",
    roles: "Configuration Lounge",
    status: "built",
  },
  {
    path: "/restaurant/tables",
    label: "Tables minimums",
    purpose:
      "Vendre une banquette avec un minimum de consommation : types, minimums par nuit, demandes, acomptes.",
    workspace: "venue",
    roles: "Configuration Lounge · Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/promoteurs",
    label: "Promoteurs",
    purpose:
      "Qui amène qui : entrées, tables, taux de présentation, lien de partage par promoteur.",
    workspace: "venue",
    roles: "Configuration Lounge · Propriétaire, Gérant",
    status: "built",
  },

  // 7. Paiements
  {
    path: "/restaurant/acomptes",
    label: "Acomptes",
    purpose:
      "Quand un client paie d'avance, et l'état de chaque acompte. Capture et remboursement sont idempotents.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "service",
    dependsOn:
      "Payzone n'est pas branché, et la spécification laisse ouvert le sens du flux : encaissement direct par l'établissement, ou collecte par LYFE puis reversement. Les deux chemins passent par la même clé d'idempotence, donc le choix ne change pas cet écran.",
  },
  {
    path: "/restaurant/annulations",
    label: "Annulations",
    purpose:
      "Les conditions montrées au client, et le journal de ce qui s'est passé, frais compris.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "built",
  },
  {
    path: "/restaurant/lyfe-pay",
    label: "Lyfe Pay",
    purpose:
      "Les transactions passées par LYFE, et la seule source légitime de « dépense » du tableau de bord.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "built",
  },

  // 8. Pilotage
  {
    path: "/restaurant/performance",
    label: "Performance",
    purpose:
      "Les chiffres avec une période et une comparaison, plus le repérage des créneaux creux.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "built",
  },
  {
    path: "/restaurant/bilans",
    label: "Bilans",
    purpose:
      "Le mois en deux minutes : chiffres, meilleurs et pires services, trois recommandations tirées des données.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "service",
    dependsOn:
      "L'export PDF passe par l'impression du navigateur, qui rend correctement. Un rendu serveur attend un service de composition.",
  },
  {
    path: "/restaurant/campagnes",
    label: "Campagnes",
    purpose:
      "Écrire à ses clients dans les limites du consentement, avec le coût par destinataire avant l'envoi.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "service",
    dependsOn:
      "Aucune passerelle d'envoi n'est branchée. Les messages sont journalisés avec leur coût et leur destinataire, et la console dit explicitement qu'ils ne partent pas.",
  },

  // 9. Établissement
  {
    path: "/restaurant/disponibilites",
    label: "Disponibilités",
    purpose:
      "Ce qui décide de ce que l'application propose : services, cadence, fenêtre de réservation, jours exceptionnels.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/equipe",
    label: "Équipe et rôles",
    purpose:
      "Qui peut faire quoi. Le dernier propriétaire ne peut être ni rétrogradé ni retiré.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "built",
  },
  {
    path: "/restaurant/notifications",
    label: "Notifications",
    purpose:
      "Les alertes de l'équipe et les messages aux clients, avec leur canal, leur moment et leur journal de délivrance.",
    workspace: "venue",
    roles: "Propriétaire, Gérant",
    status: "service",
    dependsOn:
      "Les canaux, les horaires et les gabarits s'enregistrent. L'expédition attend le compte Twilio ou Infobip de LYFE.",
  },

  // 10. Compte
  {
    path: "/restaurant/parametres",
    label: "Paramètres",
    purpose:
      "Entité juridique, banque, type de configuration — l'interrupteur qui fait apparaître Vie nocturne —, langue, données, intégrations.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "built",
  },
  {
    path: "/restaurant/abonnement",
    label: "Abonnement",
    purpose: "Le plan, son état, les factures et l'usage de la période.",
    workspace: "venue",
    roles: "Propriétaire",
    status: "built",
  },
  {
    path: "/restaurant/support",
    label: "Support",
    purpose:
      "Guides, formulaire de contact, tickets et leur état, lien WhatsApp avec ses horaires.",
    workspace: "venue",
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
