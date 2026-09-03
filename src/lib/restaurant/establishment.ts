// Établissement and Compte: Disponibilités, Notifications, Paramètres,
// Abonnement, Support.
//
// Five configuration screens, and the reason the `settings` block exists.
// Written as bespoke forms they would have drifted apart in spacing, in
// how they validate and in how they say "saved"; written as rows they
// share one surface and one optimistic-write contract.
//
// Disponibilités additionally carries the version check the spec calls
// out: it is the one edit that changes what a guest can book right now,
// so a stale write is refused rather than merged.

import type { Block, ScreenSpec, SettingRow } from "@/lib/dashboard/spec";
import { COUNT, MAD, PERCENT } from "@/lib/dashboard/formats";
import type {
  NotificationPreferences,
  VenueAvailability,
} from "@/lib/types/business";
import type {
  ServiceDefinition,
  Subscription,
  SupportTicket,
  VenueConfiguration,
  VenueSettings,
} from "@/lib/types/venue-operations";
import type { ServiceConfiguration } from "@/lib/data/repository";
import { CONFIGURATION_LABEL, configFor } from "@/lib/venue/config";
import { RESTAURANT_SETTINGS_PATH, restaurantHref } from "./slugs";
import { money, shortDay } from "./format";

const WEEKDAY_SHORT = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const weekdayLabel = (days: number[]) =>
  days.length === 7 ? "tous les jours" : days.map((d) => WEEKDAY_SHORT[d - 1]).join(", ");

// ── Disponibilités ───────────────────────────────────────────

export function buildAvailabilityScreen(
  config: ServiceConfiguration | undefined,
  availability: VenueAvailability | undefined,
  configuration: VenueConfiguration,
): ScreenSpec {
  const vocabulary = configFor(configuration);

  if (!config) {
    return {
      slug: "disponibilites",
      title: "Disponibilités",
      blocks: [
        {
          id: "unavailable",
          type: "entity-list",
          heading: "Disponibilités",
          rows: [],
          empty: {
            title: "Données indisponibles",
            body: "Le service de disponibilités n'a pas répondu. Réessayez dans un instant.",
            icon: "calendar-plus",
          },
        },
      ],
    };
  }

  const pacing = config.pacing;

  const master: Block = {
    id: "booking-switch",
    type: "settings",
    heading: "Réservation en ligne",
    subheading: "L'interrupteur général. Tout le reste de cet écran en dépend.",
    banner: pacing.onlineBookingOpen
      ? undefined
      : {
          tone: "danger",
          title: "La réservation en ligne est coupée",
          body: pacing.reopenAt
            ? `Réouverture programmée le ${shortDay(pacing.reopenAt)}.`
            : "Aucune réouverture programmée : l'application n'accepte aucune réservation.",
        },
    rows: [
      {
        id: "online",
        label: "Accepter les réservations depuis l'application",
        hint: "Coupé, l'établissement reste visible mais n'est plus réservable.",
        control: { kind: "toggle", value: pacing.onlineBookingOpen },
        command: "pacing.set",
        payload: { field: "onlineBookingOpen" },
        allow: ["owner", "admin"],
      },
      {
        id: "reopen",
        label: "Réouverture programmée",
        hint: "Laissez vide pour rouvrir à la main.",
        control: { kind: "date", value: (pacing.reopenAt ?? "").slice(0, 10) },
        command: "pacing.set",
        payload: { field: "reopenAt" },
        allow: ["owner", "admin"],
      },
    ],
  };

  const services: Block = {
    id: "services",
    type: "entity-list",
    heading: vocabulary.service.many.replace(/^./, (c) => c.toUpperCase()),
    headingAction: {
      kind: "command",
      command: "service.create",
      label: `Ajouter un ${vocabulary.service.one}`,
      icon: "plus",
    },
    rows: config.services.map((service) => serviceRow(service, configuration)),
    empty: {
      title: `Aucun ${vocabulary.service.one}`,
      body: "Sans service défini, l'application n'a aucun créneau à proposer.",
      icon: "sunset",
      action: {
        kind: "command",
        command: "service.create",
        label: `Ajouter un ${vocabulary.service.one}`,
      },
    },
  };

  const pacingBlock: Block = {
    id: "pacing",
    type: "settings",
    heading: "Cadence et fenêtre de réservation",
    subheading:
      "Ce qui empêche la salle de recevoir vingt arrivées dans le même quart d'heure.",
    rows: [
      {
        id: "arrivals",
        label: "Arrivées maximum par quart d'heure",
        hint: "Au-delà, l'application propose le créneau suivant.",
        control: { kind: "number", value: pacing.maxArrivalsPerQuarter, min: 1, max: 60 },
        command: "pacing.set",
        payload: { field: "maxArrivalsPerQuarter" },
        allow: ["owner", "admin"],
      },
      {
        id: "max-covers",
        label: `${vocabulary.cover.many.replace(/^./, (c) => c.toUpperCase())} maximum par ${vocabulary.service.one}`,
        control: { kind: "number", value: pacing.maxCoversPerService, min: 0, max: 2000 },
        command: "pacing.set",
        payload: { field: "maxCoversPerService" },
        allow: ["owner", "admin"],
      },
      {
        id: "max-party",
        label: "Groupe maximum accepté en ligne",
        hint: "Au-delà, la demande passe en validation manuelle.",
        control: { kind: "number", value: pacing.maxPartyOnline, min: 1, max: 40 },
        command: "pacing.set",
        payload: { field: "maxPartyOnline" },
        allow: ["owner", "admin"],
      },
      {
        id: "min-party",
        label: "Groupe minimum accepté en ligne",
        control: { kind: "number", value: pacing.minPartyOnline, min: 1, max: 20 },
        command: "pacing.set",
        payload: { field: "minPartyOnline" },
        allow: ["owner", "admin"],
      },
      {
        id: "request-only",
        label: "Sur demande à partir de",
        hint: "Les groupes de cette taille ne sont plus confirmés automatiquement.",
        control: { kind: "number", value: pacing.requestOnlyAbove, min: 1, max: 40 },
        command: "pacing.set",
        payload: { field: "requestOnlyAbove" },
        allow: ["owner", "admin"],
      },
      {
        id: "window",
        label: "Le carnet ouvre à",
        hint: "Combien de jours à l'avance un client peut réserver.",
        control: { kind: "number", value: pacing.bookingWindowDays, min: 1, max: 365 },
        command: "pacing.set",
        payload: { field: "bookingWindowDays" },
        allow: ["owner", "admin"],
      },
      {
        id: "cutoff",
        label: "Heure limite le jour même",
        control: { kind: "time", value: pacing.sameDayCutoff },
        command: "pacing.set",
        payload: { field: "sameDayCutoff" },
        allow: ["owner", "admin"],
      },
      {
        id: "lead",
        label: "Délai minimum avant une réservation",
        hint: "Minutes entre la réservation et l'heure demandée.",
        control: { kind: "number", value: pacing.minLeadMinutes, min: 0, max: 1440, step: 15 },
        command: "pacing.set",
        payload: { field: "minLeadMinutes" },
        allow: ["owner", "admin"],
      },
    ],
  };

  const closures: Block = {
    id: "closures",
    type: "entity-list",
    heading: "Jours exceptionnels",
    headingAction: {
      kind: "command",
      command: "calendar.close",
      label: "Fermer une journée",
      icon: "ban",
    },
    rows: (availability?.closures ?? []).map((closure) => ({
      id: closure.id,
      title: shortDay(closure.date),
      icon: "ban" as const,
      meta: closure.reason || "Fermeture exceptionnelle",
      badges: [{ label: "FERMÉ", tone: "muted" as const }],
      menu: [
        {
          id: "open",
          label: "Rouvrir la journée",
          action: {
            kind: "command" as const,
            command: "calendar.open",
            payload: { date: closure.date },
          },
        },
      ],
    })),
    empty: {
      title: "Aucune fermeture",
      body: "Fériés, privatisations, congés : ce qui retire une journée du carnet.",
      icon: "calendar",
      action: {
        kind: "link",
        href: restaurantHref("calendrier"),
        label: "Ouvrir le calendrier",
      },
    },
  };

  // What a guest sees, from the same values the rows above edit. A
  // preview built from a second source is a preview that lies.
  const preview: Block = {
    id: "guest-preview",
    type: "nudge",
    eyebrow: "Ce que voit un client",
    icon: "phone",
    headline: pacing.onlineBookingOpen
      ? "Réservation ouverte"
      : "Réservation fermée",
    body: pacing.onlineBookingOpen
      ? `Réservable jusqu'à ${pacing.bookingWindowDays} jours à l'avance, de ${pacing.minPartyOnline} à ${pacing.maxPartyOnline} personnes, au plus tard ${pacing.minLeadMinutes} minutes avant. Le jour même, jusqu'à ${pacing.sameDayCutoff}. Au-delà de ${pacing.requestOnlyAbove} personnes, la demande est envoyée à l'établissement.`
      : "L'établissement apparaît dans l'application mais aucun créneau n'est proposé.",
    actions: [
      {
        action: {
          kind: "link",
          href: restaurantHref("calendrier"),
          label: "Voir la charge par jour",
          icon: "calendar",
        },
        variant: "secondary",
      },
    ],
  };

  return {
    slug: "disponibilites",
    title: "Disponibilités",
    subtitle: "Ce qui décide de ce que l'application propose",
    blocks: [master, services, pacingBlock, closures, preview],
  };
}

function serviceRow(service: ServiceDefinition, configuration: VenueConfiguration) {
  const vocabulary = configFor(configuration);
  return {
    id: service.id,
    title: service.name,
    icon: "sunset" as const,
    meta: [
      weekdayLabel(service.weekdays),
      `${service.startsAt} – ${service.endsAt}`,
      `dernière réservation ${service.lastBookingAt}`,
      `${service.capacityCovers} ${vocabulary.cover.many}`,
      `${service.coversPerQuarter} par quart d'heure`,
    ].join(" · "),
    badges: [
      service.enabled
        ? { label: "ACTIF", tone: "success" as const }
        : { label: "DÉSACTIVÉ", tone: "muted" as const },
      // The version is on screen because a refused write names it. A
      // conflict the user cannot see is a conflict they cannot resolve.
      { label: `V${service.version}`, tone: "neutral" as const },
    ],
    signal:
      service.zoneIds.length > 0
        ? { text: `${service.zoneIds.length} zones réservables sur ce service.`, icon: "map" as const }
        : { text: "Aucune zone associée : le client ne choisit pas où s'asseoir.", icon: "info" as const },
    menu: [
      {
        id: "edit",
        label: "Modifier",
        action: {
          kind: "command" as const,
          command: "service.edit",
          payload: { id: service.id },
        },
      },
      {
        id: "remove",
        label: "Supprimer",
        destructive: true,
        action: {
          kind: "command" as const,
          command: "service.remove",
          payload: { id: service.id },
        },
      },
    ],
  };
}

// ── Notifications ────────────────────────────────────────────

const CHANNELS = [
  { value: "push", label: "Push" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "none", label: "Aucun" },
];

/** The guest messages LYFE sends on the venue's behalf. */
const GUEST_MESSAGES: {
  id: string;
  label: string;
  hint: string;
  timing: string;
}[] = [
  {
    id: "confirmation",
    label: "Confirmation",
    hint: "Envoyée dès que la réservation est acceptée.",
    timing: "immédiat",
  },
  {
    id: "reminder_j1",
    label: "Rappel la veille",
    hint: "Le rappel qui fait le plus baisser les absences.",
    timing: "J-1 à 18:00",
  },
  {
    id: "reminder_h3",
    label: "Rappel trois heures avant",
    hint: "Le dernier avant le service.",
    timing: "H-3",
  },
  {
    id: "reconfirm",
    label: "Demande de reconfirmation",
    hint: "Un bouton unique dans l'app : le client confirme ou libère la table.",
    timing: "H-4",
  },
  {
    id: "table_ready",
    label: "Table prête",
    hint: "Envoyée depuis la liste d'attente quand vous appuyez sur Prévenir.",
    timing: "immédiat",
  },
  {
    id: "thanks",
    label: "Remerciement",
    hint: "Après la visite, avec l'invitation à laisser un avis.",
    timing: "H+3",
  },
];

export function buildNotificationsScreen(
  prefs: NotificationPreferences | undefined,
  messages: { id: string; recipient: string; kind: string; status: string; at: string; channel: string; failureReason: string }[],
): ScreenSpec {
  const channelOf = (list: string[] | undefined) =>
    list && list.length > 0 ? list[0] : "none";

  const team: Block = {
    id: "team-alerts",
    type: "settings",
    heading: "Alertes de l'équipe",
    subheading: "Ce que l'établissement reçoit, et par quel canal.",
    rows: [
      {
        id: "new-booking",
        label: "Nouvelle demande de réservation",
        hint: "La seule alerte qu'un manager doit voir pendant un service.",
        control: { kind: "select", value: channelOf(prefs?.newBooking), options: CHANNELS },
        command: "notifications.channel",
        payload: { event: "newBooking" },
        allow: ["owner", "admin"],
      },
      {
        id: "cancellation",
        label: "Annulation",
        control: {
          kind: "select",
          value: channelOf(prefs?.cancellation),
          options: CHANNELS,
        },
        command: "notifications.channel",
        payload: { event: "cancellation" },
        allow: ["owner", "admin"],
      },
      {
        id: "review",
        label: "Avis reçu",
        control: { kind: "select", value: channelOf(prefs?.review), options: CHANNELS },
        command: "notifications.channel",
        payload: { event: "review" },
        allow: ["owner", "admin"],
      },
      {
        id: "summary",
        label: "Résumé quotidien",
        hint: "Un récapitulatif du service de la veille, le matin.",
        control: {
          kind: "select",
          value: channelOf(prefs?.dailySummary),
          options: CHANNELS,
        },
        command: "notifications.channel",
        payload: { event: "dailySummary" },
        allow: ["owner", "admin"],
      },
    ],
  };

  const guest: Block = {
    id: "guest-messages",
    type: "settings",
    heading: "Messages aux clients",
    subheading:
      "Envoyés par LYFE au nom de l'établissement. Le texte reste dans les gabarits validés ; le moment vous appartient.",
    banner: {
      tone: "info",
      title: "Ces messages ne sont pas des campagnes",
      body: "Ils partent quel que soit le consentement marketing, parce qu'ils concernent une réservation que le client a faite. Les campagnes vivent dans Campagnes.",
      action: {
        kind: "link",
        href: restaurantHref("campagnes"),
        label: "Ouvrir Campagnes",
      },
    },
    rows: GUEST_MESSAGES.flatMap((message): SettingRow[] => [
      {
        id: `${message.id}-channel`,
        label: message.label,
        hint: message.hint,
        control: { kind: "select", value: "whatsapp", options: CHANNELS },
        command: "notifications.guestChannel",
        payload: { message: message.id },
        badge: { label: message.timing.toUpperCase(), tone: "neutral" },
        allow: ["owner", "admin"],
      },
    ]),
    footerActions: [
      {
        action: {
          kind: "command",
          command: "notifications.test",
          label: "Envoyer un test",
          icon: "message-square",
        },
        variant: "secondary",
        allow: ["owner", "admin"],
      },
    ],
  };

  const log: Block = {
    id: "delivery-log",
    type: "entity-list",
    heading: "Journal de délivrance",
    tabs: [
      { id: "all", label: "Tout" },
      { id: "failed", label: "Échecs", match: { facet: "status", values: ["echoue"] } },
    ],
    rows: messages.slice(0, 50).map((m) => ({
      id: m.id,
      title: m.recipient,
      icon: "message-square" as const,
      meta: `${m.kind} · ${shortDay(m.at)}`,
      badges: [
        { label: m.channel.toUpperCase(), tone: "neutral" as const },
        m.status === "echoue"
          ? { label: "ÉCHEC", tone: "danger" as const }
          : { label: m.status.toUpperCase(), tone: "info" as const },
      ],
      facets: { status: m.status },
      signal: m.failureReason ? { text: m.failureReason, icon: "alert" as const } : undefined,
    })),
    empty: {
      title: "Aucun message",
      body: "Chaque message envoyé, avec son état de délivrance, apparaît ici.",
      icon: "message-square",
    },
    noMatches: { title: "Aucun message", body: "Aucun message dans ce filtre." },
  };

  return {
    slug: "notifications",
    title: "Notifications",
    subtitle: "Qui reçoit quoi, et par quel canal",
    blocks: [team, guest, log],
  };
}

// ── Paramètres ───────────────────────────────────────────────

export function buildSettingsScreen(settings: VenueSettings): ScreenSpec {
  const legal: Block = {
    id: "legal",
    type: "settings",
    heading: "Entité juridique",
    subheading: "Ce qui figure sur les factures LYFE.",
    rows: [
      row("legalName", "Raison sociale", settings.legalName),
      row("ice", "ICE", settings.ice),
      row("rc", "RC", settings.rc),
      row("billingAddress", "Adresse de facturation", settings.billingAddress, true),
    ],
  };

  const bank: Block = {
    id: "bank",
    type: "settings",
    heading: "Coordonnées bancaires",
    subheading: "Le compte qui reçoit les reversements.",
    rows: [
      row("iban", "IBAN", settings.iban),
      {
        id: "rib",
        label: "RIB",
        hint: "Document justificatif, demandé une fois.",
        control: { kind: "readonly", value: "Téléverser depuis Ma fiche", href: RESTAURANT_SETTINGS_PATH },
        command: "noop",
      },
    ],
  };

  // The switch that adds a whole navigation group. Called out rather
  // than buried among the fields, because it is the only setting on this
  // screen that changes what the portal contains.
  const configuration: Block = {
    id: "configuration",
    type: "settings",
    heading: "Type de configuration",
    subheading:
      "Le seul réglage qui ajoute des écrans. Lounge active Vie nocturne — guest list, tables avec minimum, promoteurs — et renomme les couverts en personnes.",
    banner: {
      tone: settings.configuration === "restaurant" ? "neutral" : "violet",
      title:
        settings.configuration === "restaurant"
          ? "Vie nocturne est masquée"
          : "Vie nocturne est active",
      body:
        settings.configuration === "restaurant"
          ? "Passez en Lounge ou en Restaurant et lounge pour la faire apparaître dans la navigation."
          : "Les trois écrans de Vie nocturne apparaissent dans la navigation de cet établissement.",
    },
    rows: [
      {
        id: "configuration",
        label: "Configuration",
        hint: "Restaurant, Lounge, ou les deux.",
        control: {
          kind: "select",
          value: settings.configuration,
          options: (["restaurant", "lounge", "both"] as const).map((value) => ({
            value,
            label: CONFIGURATION_LABEL[value],
          })),
        },
        command: "settings.set",
        payload: { field: "configuration" },
        allow: ["owner"],
      },
      {
        id: "dress-code",
        label: "Dress code",
        hint: "Affiché sur la fiche de l'application. Utile surtout en configuration lounge.",
        control: { kind: "text", value: settings.dressCode },
        command: "settings.set",
        payload: { field: "dressCode" },
        allow: ["owner"],
      },
      {
        id: "minimum-age",
        label: "Âge minimum",
        hint: "0 pour aucune restriction.",
        control: { kind: "number", value: settings.minimumAge, min: 0, max: 25 },
        command: "settings.set",
        payload: { field: "minimumAge" },
        allow: ["owner"],
      },
    ],
  };

  const locale: Block = {
    id: "locale",
    type: "settings",
    heading: "Langue et fuseau",
    rows: [
      {
        id: "language",
        label: "Langue de l'établissement",
        control: {
          kind: "select",
          value: settings.language,
          options: [
            { value: "fr", label: "Français" },
            { value: "ar", label: "العربية" },
            { value: "en", label: "English" },
          ],
        },
        command: "settings.set",
        payload: { field: "language" },
        allow: ["owner"],
      },
      {
        id: "timezone",
        label: "Fuseau horaire",
        control: {
          kind: "select",
          value: settings.timezone,
          options: [
            { value: "Africa/Casablanca", label: "Casablanca (GMT+1)" },
            { value: "Europe/Paris", label: "Paris (GMT+1 / +2)" },
          ],
        },
        command: "settings.set",
        payload: { field: "timezone" },
        allow: ["owner"],
      },
    ],
  };

  const privacy: Block = {
    id: "privacy",
    type: "settings",
    heading: "Données et vie privée",
    subheading: "Ce que le client accepte, et combien de temps vous le gardez.",
    rows: [
      {
        id: "consent",
        label: "Texte de consentement",
        hint: "Montré dans l'application au moment de réserver.",
        control: { kind: "text", value: settings.consentText, multiline: true },
        command: "settings.set",
        payload: { field: "consentText" },
        allow: ["owner"],
      },
      {
        id: "retention",
        label: "Durée de conservation",
        hint: "Mois après la dernière visite, au terme desquels la fiche est anonymisée.",
        control: { kind: "number", value: settings.retentionMonths, min: 6, max: 120 },
        command: "settings.set",
        payload: { field: "retentionMonths" },
        allow: ["owner"],
      },
    ],
    footerActions: [
      {
        action: {
          kind: "command",
          command: "settings.export",
          label: "Exporter toutes les données",
          icon: "file",
        },
        variant: "secondary",
        allow: ["owner"],
      },
      {
        action: {
          kind: "command",
          command: "settings.delete",
          label: "Demander la suppression de l'établissement",
          icon: "ban",
        },
        variant: "ghost",
        allow: ["owner"],
      },
    ],
  };

  const integrations: Block = {
    id: "integrations",
    type: "settings",
    heading: "Intégrations",
    rows: [
      row("googlePlaceUrl", "Fiche Google Business", settings.googlePlaceUrl),
      row("instagramHandle", "Compte Instagram", settings.instagramHandle),
      row("whatsappNumber", "Numéro WhatsApp Business", settings.whatsappNumber),
      {
        id: "api",
        label: "Accès API",
        hint: "Pour un futur raccordement à une caisse. Désactivé par défaut.",
        control: { kind: "toggle", value: settings.apiAccessEnabled },
        command: "settings.set",
        payload: { field: "apiAccessEnabled" },
        allow: ["owner"],
      },
    ],
  };

  return {
    slug: "parametres",
    title: "Paramètres",
    subtitle: "La configuration administrative de l'établissement",
    blocks: [configuration, legal, bank, locale, privacy, integrations],
  };
}

function row(
  field: string,
  label: string,
  value: string,
  multiline = false,
): SettingRow {
  return {
    id: field,
    label,
    control: { kind: "text", value, multiline },
    command: "settings.set",
    payload: { field },
    allow: ["owner"],
  };
}

// ── Abonnement ───────────────────────────────────────────────

export function buildSubscriptionScreen(subscription: Subscription): ScreenSpec {
  const statusBadge =
    subscription.status === "actif"
      ? { label: "ACTIF", tone: "success" as const }
      : subscription.status === "essai"
        ? { label: "ESSAI", tone: "info" as const }
        : { label: "EXPIRÉ", tone: "danger" as const };

  const plan: Block = {
    id: "plan",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "status",
        label: "Abonnement",
        tone: subscription.status === "expire" ? "rose" : "sand",
        icon: "sparkles",
        metric: { value: statusBadge.label },
        chips: [statusBadge],
        hint:
          subscription.status === "essai" && subscription.trialEndsAt
            ? `Essai jusqu'au ${shortDay(subscription.trialEndsAt)}`
            : subscription.renewsAt
              ? `Renouvellement le ${shortDay(subscription.renewsAt)}`
              : undefined,
      },
      {
        id: "price",
        label: "Montant annuel",
        tone: "surface",
        icon: "coins",
        metric: { value: subscription.priceMad, format: MAD, animate: true },
        hint: "Un abonnement unique, sans palier.",
      },
      {
        id: "method",
        label: "Moyen de paiement",
        tone: "surface",
        icon: "banknote",
        metric: { value: subscription.paymentMethod || "Non renseigné" },
        action: {
          kind: "command",
          command: "subscription.payment",
          label: "Mettre à jour",
        },
      },
    ],
  };

  const usage: Block = {
    id: "usage",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "reservations",
        label: "Réservations",
        tone: "surface",
        icon: "calendar-clock",
        metric: { value: subscription.usage.reservations, format: COUNT, animate: true },
      },
      {
        id: "guests",
        label: "Clients au fichier",
        tone: "surface",
        icon: "users",
        metric: { value: subscription.usage.guests, format: COUNT, animate: true },
      },
      {
        id: "messages",
        label: "Messages envoyés",
        tone: "surface",
        icon: "message-square",
        metric: { value: subscription.usage.messagesSent, format: COUNT, animate: true },
      },
      {
        id: "campaigns",
        label: "Campagnes",
        tone: "surface",
        icon: "megaphone",
        metric: { value: subscription.usage.campaigns, format: COUNT, animate: true },
      },
    ],
  };

  const invoices: Block = {
    id: "invoices",
    type: "table",
    heading: "Factures",
    columns: [
      { key: "reference", label: "Référence" },
      { key: "date", label: "Émise le" },
      { key: "amount", label: "Montant", align: "right", format: MAD },
      { key: "status", label: "État", align: "right" },
    ],
    rows: subscription.invoices.map((invoice) => ({
      id: invoice.id,
      cells: {
        reference: { value: invoice.reference },
        date: { value: shortDay(invoice.issuedOn) },
        amount: { value: invoice.amountMad },
        status: {
          value: invoice.status,
          badge:
            invoice.status === "payee"
              ? { label: "PAYÉE", tone: "success" }
              : invoice.status === "due"
                ? { label: "À RÉGLER", tone: "warning" }
                : { label: "IMPAYÉE", tone: "danger" },
        },
      },
    })),
    empty: {
      title: "Aucune facture",
      body: "Les factures LYFE apparaîtront ici, téléchargeables en PDF.",
      icon: "file",
    },
  };

  const marketingAddon: Block = {
    id: "addon",
    type: "nudge",
    eyebrow: "Services marketing",
    icon: "megaphone",
    headline: "Disponibles à partir de juin 2027.",
    body: "L'envoi de campagnes e-mail, SMS et WhatsApp est facturé à l'usage, en plus de l'abonnement. Les coûts par destinataire sont affichés avant chaque envoi dans Campagnes.",
    actions: [
      {
        action: {
          kind: "link",
          href: restaurantHref("campagnes"),
          label: "Voir Campagnes",
          icon: "megaphone",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "support.contact",
          label: "Demander un contact commercial",
          icon: "phone",
        },
        variant: "primary",
      },
    ],
  };

  return {
    slug: "abonnement",
    title: "Abonnement",
    subtitle: "La relation commerciale avec LYFE",
    blocks: [plan, usage, invoices, marketingAddon],
  };
}

// ── Support ──────────────────────────────────────────────────

const GUIDES = [
  {
    id: "start",
    title: "Démarrer avec LYFE",
    body: "Compléter la fiche, ouvrir les disponibilités, prendre la première réservation.",
    minutes: 8,
  },
  {
    id: "service",
    title: "Gérer un service",
    body: "Le carnet, la liste d'attente, le check-in, et ce que l'équipe lit au briefing.",
    minutes: 12,
  },
  {
    id: "no-show",
    title: "Réduire les absences",
    body: "Rappels, reconfirmation, acomptes : ce qui marche, dans l'ordre.",
    minutes: 10,
  },
  {
    id: "deposits",
    title: "Configurer les acomptes",
    body: "Quand demander de l'argent d'avance, et comment le capturer ou le rendre.",
    minutes: 7,
  },
];

export function buildSupportScreen(tickets: SupportTicket[]): ScreenSpec {
  const guides: Block = {
    id: "guides",
    type: "entity-list",
    heading: "Guides",
    search: { placeholder: "Rechercher dans l'aide…" },
    rows: GUIDES.map((guide) => ({
      id: guide.id,
      title: guide.title,
      icon: "book" as const,
      meta: `${guide.body} · ${guide.minutes} min de lecture`,
      keywords: guide.body,
      href: `https://aide.lyfemaroc.org/${guide.id}`,
    })),
    empty: { title: "Aucun guide", body: "Le centre d'aide est momentanément indisponible.", icon: "book" },
    noMatches: {
      title: "Rien trouvé",
      body: "Aucun guide ne correspond. Écrivez-nous : la question servira au prochain.",
    },
  };

  const contact: Block = {
    id: "contact",
    type: "nudge",
    eyebrow: "Nous joindre",
    icon: "message-square",
    headline: "WhatsApp, du lundi au samedi, 9 h – 22 h.",
    body: "Pour un service en cours, WhatsApp est le plus rapide. Pour tout ce qui demande une pièce jointe ou un suivi, ouvrez un ticket : il reste consultable ci-dessous.",
    actions: [
      {
        action: {
          kind: "link",
          href: "https://wa.me/212661000000",
          external: true,
          label: "Ouvrir WhatsApp",
          icon: "message-square",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "support.contact",
          label: "Ouvrir un ticket",
          icon: "plus",
        },
        variant: "primary",
      },
      {
        action: {
          kind: "link",
          href: "https://status.lyfemaroc.org",
          external: true,
          label: "État des services",
          icon: "gauge",
        },
        variant: "ghost",
      },
    ],
  };

  const ticketList: Block = {
    id: "tickets",
    type: "entity-list",
    heading: "Vos demandes",
    tabs: [
      { id: "all", label: "Toutes" },
      {
        id: "open",
        label: "En cours",
        match: { facet: "status", values: ["ouvert", "en_cours"] },
      },
      { id: "closed", label: "Résolues", match: { facet: "status", values: ["resolu"] } },
    ],
    rows: tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.subject,
      icon: "message" as const,
      meta: `${ticket.reference} · ${ticket.category} · ouvert le ${shortDay(ticket.createdAt)}`,
      badges: [
        ticket.status === "resolu"
          ? { label: "RÉSOLU", tone: "success" as const }
          : ticket.status === "en_cours"
            ? { label: "EN COURS", tone: "info" as const }
            : { label: "OUVERT", tone: "warning" as const },
      ],
      facets: { status: ticket.status },
      signal: ticket.body ? { text: ticket.body, icon: "note" as const } : undefined,
    })),
    empty: {
      title: "Aucune demande",
      body: "Vous n'avez encore rien demandé. Les tickets ouverts restent consultables ici avec leur état.",
      icon: "message",
      action: {
        kind: "command",
        command: "support.contact",
        label: "Ouvrir un ticket",
      },
    },
    noMatches: { title: "Aucune demande", body: "Aucun ticket dans cet état." },
  };

  return {
    slug: "support",
    title: "Support",
    subtitle: "De l'aide sans quitter le portail",
    blocks: [guides, contact, ticketList],
  };
}

/** Kept for the styleguide's percentage sample. */
export const SUPPORT_PERCENT = PERCENT;
