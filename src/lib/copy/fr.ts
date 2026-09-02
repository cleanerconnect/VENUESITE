// French copy.
//
// The portal ships in French. This module holds the strings that are
// not domain terms — those live in `lib/restaurant/vocabulary.ts`, which
// pairs each state with its tone and icon and is the right home for them.
//
// What belongs here: anything a component would otherwise hard-code that
// a second component also needs, and everything a translator or a
// content owner would want to change without opening a component. What
// does not: a heading that exists once and reads as part of that
// screen's argument — inlining that is clearer than a lookup.
//
// Conventions the strings follow, and that new ones must:
//   · Vouvoiement. "Vos réservations", never "tes réservations".
//   · Verbs in the infinitive on buttons ("Enregistrer", not "Enregistré"),
//     in the past participle for confirmations ("Enregistré").
//   · No exclamation marks. A partner mid-service is not being cheered on.
//   · Numbers in the copy, not in the label: "3 demandes en attente",
//     never "Demandes en attente (3)".
//   · Errors say what happened and what to do, in that order, in one
//     sentence. Never "Une erreur est survenue" alone.
//   · Espace insécable before « : ? ! » and inside « … » per French
//     typography; write it as   rather than a plain space.

export const COPY = {
  /** Verbs. Every button in the portal draws from here. */
  action: {
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    close: "Fermer",
    confirm: "Confirmer",
    reject: "Refuser",
    retry: "Réessayer",
    reset: "Annuler les modifications",
    remove: "Retirer",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    search: "Rechercher",
    export: "Exporter",
    undo: "Annuler",
    seeAll: "Tout voir",
    back: "Retour",
  },

  /** The visible state of a form. */
  form: {
    saved: "Enregistré",
    unsaved: "Modifications non enregistrées",
    savingFailed: "L'enregistrement a échoué. Réessayez.",
    required: "Ce champ est obligatoire.",
    /** Shown when a field is at its cap rather than over it. */
    limitReached: "Limite atteinte.",
  },

  /** Waiting. Also the screen-reader announcement on a loading region. */
  loading: {
    generic: "Chargement…",
    workspace: "Chargement de votre espace",
    settings: "Chargement des réglages",
  },

  /** What went wrong, and what to do about it. */
  error: {
    title: "Cette page n'a pas pu charger",
    body: "Une erreur est survenue en récupérant vos données. Réessayez dans un instant.",
    reference: "Référence",
    sessionExpired: "Session expirée. Reconnectez-vous.",
    venueNotFound: "Lieu introuvable.",
    forbidden: "Votre rôle ne permet pas cette action.",
    /** Optimistic-concurrency loss on a shared record. */
    stale:
      "Ce contenu a été modifié par quelqu'un d'autre. Rechargez la page avant de réessayer.",
  },

  /** Nothing to show — distinct from something failing. */
  empty: {
    noResults: "Aucun résultat",
    noResultsBody: "Essayez un autre filtre ou un autre mot-clé.",
    noMatches: "Rien sur ce filtre",
    nothingToShow: "Rien à afficher",
  },

  /** The reservation book. Shared between the day view and the drawer. */
  booking: {
    covers: "couverts",
    party: (n: number) => `${n} ${n > 1 ? "couverts" : "couvert"}`,
    arrive: "Marquer comme arrivé",
    arrived: "Arrivée enregistrée",
    confirmed: "Réservation confirmée",
    cancelled: "Réservation annulée",
    noShowRecorded: "Absence enregistrée",
    waitlistEmpty: "Liste d'attente vide ou service complet.",
    noPreference: "Sans préférence",
  },

  /** Confirmations the venue workspace throws after an optimistic action. */
  toast: {
    arrived: "Arrivée enregistrée",
    confirmed: "Réservation confirmée",
    cancelled: "Réservation annulée",
    rejected: "Demande refusée",
    noShow: "Absence enregistrée",
    reminderSent: "Rappel SMS envoyé au client",
    exportQueued: "Export CSV en préparation",
    exportQueuedBody: "Le fichier vous sera envoyé par e-mail.",
    slotUpdated: "Créneau mis à jour",
    closureRemoved: "Fermeture retirée",
    boostStarted: "Boost lancé pour 7 jours",
    boostStopped: "Boost arrêté",
    replySaved: "Réponse enregistrée",
    nudgeDismissed: "Suggestion ignorée",
    nothingToConfirm: "Rien à confirmer",
  },

  /** Anything the partner edits that the consumer app then shows. */
  listing: {
    /** Repeated under every app-facing editor. */
    appFacing: "Visible par vos clients dans l'application.",
    hiddenInApp: "Masqué dans l'application.",
  },
} as const;

export type Copy = typeof COPY;
