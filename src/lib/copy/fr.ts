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

  /** The front door. */
  auth: {
    title: "Connectez-vous",
    // The partner arrives from the Org button on lyfemaroc.org, already
    // knowing what LYFE is. What they need to read here is whose screen
    // this is — not what the platform sells.
    subtitle: "L'accès à votre établissement sur LYFE.",
    eyebrow: "Espace partenaire",
    hero: "Gérez les réservations de votre établissement, de la demande à l'arrivée en salle.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    remember: "Se souvenir de moi",
    forgot: "Mot de passe oublié ?",
    forgotSent:
      "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.",
    forgotNeedsEmail: "Saisissez votre adresse e-mail, puis redemandez le lien.",
    // Said when no service is connected to send the mail. The old
    // behaviour claimed the link had been sent regardless, which left a
    // locked-out partner refreshing an inbox nothing was coming to.
    forgotNoService:
      "Cette instance n'est pas reliée au service qui envoie les e-mails. Écrivez-nous depuis « Nous contacter » et nous réinitialisons le mot de passe.",
    forgotFailed:
      "Le service ne répond pas pour l'instant. Réessayez dans un moment.",
    notPartner: "Votre établissement n'est pas encore sur LYFE ?",
    notPartnerCta: "Inscrire mon établissement",
    submit: "Se connecter",
    submitting: "Connexion…",
    invalidCredentials: "E-mail ou mot de passe incorrect.",
    signOut: "Se déconnecter",
    expired: "Votre session a expiré. Reconnectez-vous.",
    chooseVenue: "Quel lieu voulez-vous ouvrir ?",
    chooseVenueBody: "Vous pourrez changer à tout moment depuis le portail.",
    noWorkspaceTitle: "Votre compte n'est rattaché à aucun espace",
    noWorkspaceBody:
      "Un membre de l'équipe LYFE finalise votre inscription. Vous recevrez un e-mail dès que votre espace sera prêt.",
  },

  /**
   * Récupérer, puis changer.
   *
   * `Détail Sprint ` ligne 53 — « En tant qu'organisateur, je dois
   * pouvoir récupérer mon mot de passe ou le changer en cas d'oubli ».
   * Deux verbes, trois écrans : demander le lien, poser le nouveau mot
   * de passe, et le changer depuis Réglages quand on le connaît encore.
   *
   * La phrase de confirmation est volontairement neutre — « si un compte
   * existe » — et c'est la même qu'au lien de connexion : un formulaire
   * qui répond différemment selon que l'adresse est connue est un
   * annuaire des partenaires de LYFE.
   */
  password: {
    forgotTitle: "Mot de passe oublié",
    forgotBody:
      "Indiquez l'adresse de votre compte. Nous envoyons un lien qui permet d'en choisir un nouveau.",
    forgotSubmit: "Envoyer le lien",
    forgotSubmitting: "Envoi…",
    backToSignIn: "Revenir à la connexion",

    resetTitle: "Nouveau mot de passe",
    resetBody:
      "Choisissez un mot de passe. Vous serez reconnecté avec celui-ci.",
    resetSubmit: "Enregistrer le mot de passe",
    resetSubmitting: "Enregistrement…",
    resetDone:
      "Mot de passe enregistré. Connectez-vous avec le nouveau mot de passe.",
    resetNoToken:
      "Ce lien est incomplet. Redemandez-en un depuis « Mot de passe oublié ? ».",
    resetBadToken:
      "Ce lien a expiré ou a déjà servi. Redemandez-en un depuis « Mot de passe oublié ? ».",

    changeTitle: "Changer mon mot de passe",
    changeBody:
      "Le mot de passe actuel est demandé : c'est ce qui empêche un écran laissé ouvert de devenir un compte perdu.",
    current: "Mot de passe actuel",
    next: "Nouveau mot de passe",
    confirm: "Confirmer le nouveau mot de passe",
    changeSubmit: "Changer le mot de passe",
    changeSubmitting: "Changement…",
    changeDone: "Mot de passe changé.",
    badCurrent: "Le mot de passe actuel est incorrect.",

    /** La même règle qu'à l'inscription, et le même message. */
    tooShort: "Huit caractères au minimum.",
    mismatch: "Les deux mots de passe ne sont pas identiques.",
    /**
     * Dit par un pilote qui n'a pas de service derrière lui.
     *
     * Le jeu statique est une capture : il ne peut ni vérifier un lien
     * ni remplacer un mot de passe. Le pilote `db` change vraiment
     * celui d'un compte de `partner_accounts` — le semis les y écrit,
     * hachés — et répond ceci pour un compte qu'il ne détient pas, et
     * pour un lien de réinitialisation, qu'aucun des deux n'a émis.
     * Prétendre le contraire serait pire que de le dire.
     */
    noService:
      "Cette instance n'est pas reliée au service des comptes. Écrivez-nous depuis « Nous contacter » et nous changeons le mot de passe.",
    failed: "Le service ne répond pas pour l'instant. Réessayez dans un moment.",
  },

  /** The visible state of a form. */
  form: {
    saved: "Enregistré",
    unsaved: "Modifications non enregistrées",
    /**
     * The same sentence on every save bar in the portal, spec-driven or
     * not: how many fields are waiting, not merely that some are.
     */
    unsavedCount: (n: number) =>
      n === 1 ? "1 modification non enregistrée" : `${n} modifications non enregistrées`,
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
    loadFailed: "Impossible de charger ces données",
    deniedTitle: "Accès non autorisé",
    venueNotFound: "Lieu introuvable.",
    forbidden: "Votre rôle ne permet pas cette action.",
    /** Optimistic-concurrency loss on a shared record. */
    stale:
      "Ce contenu a été modifié par quelqu'un d'autre. Rechargez la page avant de réessayer.",
  },

  /** Nothing to show — distinct from something failing. */
  empty: {
    noResults: "Aucun résultat",
    noEvents: "Aucun événement",
    noEventsBody: "Vos événements apparaîtront ici dès le premier créé.",
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
