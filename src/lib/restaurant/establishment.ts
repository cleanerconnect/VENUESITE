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

import { SLOT_MINUTES } from "@/lib/types/venue-operations";
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
import { RESTAURANT_SETTINGS_PATH, restaurantHref, type Lot } from "./slugs";
import type { Role } from "@/lib/auth/session";
import { clock, dayLabel, money, shortDay } from "./format";

const WEEKDAY_SHORT = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const weekdayLabel = (days: number[]) =>
  days.length === 7 ? "tous les jours" : days.map((d) => WEEKDAY_SHORT[d - 1]).join(", ");

// ── Disponibilités ───────────────────────────────────────────

export function buildAvailabilityScreen(
  config: ServiceConfiguration | undefined,
  availability: VenueAvailability | undefined,
  configuration: VenueConfiguration,
  lot: Lot = 2,
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

  // The switch the whole screen hangs off, drawn as the largest control
  // on it. Everything below only matters while this is on.
  const master: Block = {
    id: "booking-switch",
    type: "settings",
    banner: pacing.onlineBookingOpen
      ? undefined
      : {
          tone: "danger",
          title: "La réservation en ligne est coupée",
          body: "L'établissement reste visible dans l'application, mais aucun créneau n'y est proposé.",
        },
    rows: [
      {
        id: "online",
        label: "Accepter les réservations en ligne",
        hint: "Coupé, l'établissement reste visible mais n'est plus réservable.",
        control: { kind: "toggle", value: pacing.onlineBookingOpen },
        command: "pacing.set",
        payload: { field: "onlineBookingOpen" },
        allow: ["owner", "admin"],
        emphasis: "lead",
      },
    ],
  };

  const serviceCards: Block[] = config.services.map((service) =>
    serviceCard(service, configuration),
  );

  const services: Block = {
    id: "services",
    type: "group",
    heading: vocabulary.service.many.replace(/^./, (c) => c.toUpperCase()),
    headingAction: {
      kind: "command",
      command: "service.create",
      label: `Ajouter un ${vocabulary.service.one}`,
      icon: "plus",
    },
    children:
      serviceCards.length > 0
        ? serviceCards
        : [
            {
              id: "services-empty",
              type: "entity-list",
              rows: [],
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
            },
          ],
  };

  // The three rules a venue actually changes in a season. Groups that are
  // too big for the room, how far ahead the book opens, and the hour
  // after which tonight is closed.
  const rules: Block = {
    id: "rules",
    type: "settings",
    heading: "Règles de réservation",
    subheading: "Ce que l'application accepte sans vous demander.",
    rows: [
      {
        id: "max-party",
        label: "Groupe maximum en ligne",
        hint: "Au-delà, la demande passe en validation manuelle.",
        control: {
          kind: "number",
          value: pacing.maxPartyOnline,
          min: 1,
          max: 40,
          suffix: "personnes",
        },
        command: "pacing.set",
        payload: { field: "maxPartyOnline" },
        allow: ["owner", "admin"],
      },
      {
        id: "window",
        label: "Réservation possible à l'avance",
        hint: "Au-delà de ce nombre de jours, la date n'est pas encore ouverte.",
        control: {
          kind: "number",
          value: pacing.bookingWindowDays,
          min: 1,
          max: 365,
          suffix: "jours",
        },
        command: "pacing.set",
        payload: { field: "bookingWindowDays" },
        allow: ["owner", "admin"],
      },
      {
        id: "cutoff",
        label: "Heure limite le jour même",
        hint: "Passé cette heure, l'application ne propose plus ce soir.",
        control: { kind: "time", value: pacing.sameDayCutoff },
        command: "pacing.set",
        payload: { field: "sameDayCutoff" },
        allow: ["owner", "admin"],
      },
    ],
  };

  // Set once, at installation, and then left alone for years. Open, they
  // put eight fields between the host and the two they came for.
  const advanced: Block = {
    id: "advanced",
    type: "settings",
    heading: "Réglages avancés",
    subheading: "La cadence en salle et les seuils. Réglés une fois, rarement revus.",
    collapsed: true,
    rows: [
      {
        id: "arrivals",
        label: "Arrivées maximum par quart d'heure",
        hint: "Au-delà, l'application propose le créneau suivant.",
        control: {
          kind: "number",
          value: pacing.maxArrivalsPerQuarter,
          min: 1,
          max: 60,
          suffix: "arrivées",
        },
        command: "pacing.set",
        payload: { field: "maxArrivalsPerQuarter" },
        allow: ["owner", "admin"],
      },
      {
        id: "max-covers",
        label: `${vocabulary.cover.many.replace(/^./, (c) => c.toUpperCase())} maximum par ${vocabulary.service.one}`,
        control: {
          kind: "number",
          value: pacing.maxCoversPerService,
          min: 0,
          max: 2000,
          suffix: vocabulary.cover.many,
        },
        command: "pacing.set",
        payload: { field: "maxCoversPerService" },
        allow: ["owner", "admin"],
      },
      {
        id: "min-party",
        label: "Groupe minimum en ligne",
        control: {
          kind: "number",
          value: pacing.minPartyOnline,
          min: 1,
          max: 20,
          suffix: "personnes",
        },
        command: "pacing.set",
        payload: { field: "minPartyOnline" },
        allow: ["owner", "admin"],
      },
      {
        id: "request-only",
        label: "Validation manuelle à partir de",
        hint: "Les groupes de cette taille ne sont plus confirmés automatiquement.",
        control: {
          kind: "number",
          value: pacing.requestOnlyAbove,
          min: 1,
          max: 40,
          suffix: "personnes",
        },
        command: "pacing.set",
        payload: { field: "requestOnlyAbove" },
        allow: ["owner", "admin"],
      },
      {
        id: "lead",
        label: "Délai minimum avant une réservation",
        hint: "Entre le moment où le client réserve et l'heure demandée.",
        control: {
          kind: "number",
          value: pacing.minLeadMinutes,
          min: 0,
          max: 1440,
          step: 15,
          suffix: "minutes",
        },
        command: "pacing.set",
        payload: { field: "minLeadMinutes" },
        allow: ["owner", "admin"],
      },
    ],
  };

  const closures: Block = {
    id: "closures",
    type: "entity-list",
    heading: "Jours de fermeture",
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
        kind: "command",
        command: "calendar.close",
        label: "Fermer une journée",
      },
    },
  };

  // Lot 2 adds the load calendar; Lot 1 stops at the closure list.
  const calendarLink: Block[] = lot === 1
    ? []
    : [
        {
          id: "calendar-link",
          type: "nudge",
          eyebrow: "Calendrier",
          icon: "calendar",
          headline: "La charge jour par jour",
          body: "Le calendrier montre ce que chaque journée a déjà pris, et où il reste de la place.",
          actions: [
            {
              action: {
                kind: "link",
                href: restaurantHref("calendrier"),
                label: "Ouvrir le calendrier",
                icon: "calendar",
              },
              variant: "secondary",
            },
          ],
        },
      ];

  return {
    slug: "disponibilites",
    title: "Disponibilités",
    subtitle: "Ce qui décide de ce que l'application propose",
    blocks: [master, services, rules, advanced, closures, ...calendarLink],
  };
}

const WEEKDAY_OPTIONS = WEEKDAY_SHORT.map((label, i) => ({
  value: String(i + 1),
  label: label.replace(/^./, (c) => c.toUpperCase()),
}));

/**
 * A service, as a card of fields.
 *
 * It used to be a row of run-together text — "lun, mar, mer · 19:00 –
 * 23:00 · dernière réservation 22:00 · 60 couverts" — with a menu that
 * opened a ten-field dialog to change any of it. A host moving the
 * closing time forward by half an hour should see a closing time and
 * type in it.
 */
function serviceCard(
  service: ServiceDefinition,
  configuration: VenueConfiguration,
): Block {
  const vocabulary = configFor(configuration);
  const id = (field: string) => `svc-${service.id}-${field}`;
  const write = (field: string) => ({
    command: "service.set",
    payload: { id: service.id, field },
    allow: ["owner", "admin"] as string[],
  });

  return {
    id: `service-${service.id}`,
    type: "settings",
    heading: service.name,
    subheading: `${weekdayLabel(service.weekdays)} · ${clock(service.startsAt)} – ${clock(service.endsAt)} · créneaux de ${service.slotMinutes === 60 ? "1 heure" : `${service.slotMinutes} minutes`}`,
    rows: [
      {
        id: id("weekdays"),
        label: "Jours",
        control: {
          kind: "switches",
          value: service.weekdays.map(String).join(","),
          options: WEEKDAY_OPTIONS,
        },
        ...write("weekdays"),
      },
      {
        id: id("startsAt"),
        label: "Ouverture",
        control: { kind: "time", value: service.startsAt },
        ...write("startsAt"),
      },
      {
        id: id("endsAt"),
        label: "Fermeture",
        control: { kind: "time", value: service.endsAt },
        ...write("endsAt"),
      },
      {
        id: id("lastBookingAt"),
        label: "Dernière réservation acceptée",
        hint: "L'heure après laquelle l'application ne propose plus ce service.",
        control: { kind: "time", value: service.lastBookingAt },
        ...write("lastBookingAt"),
      },
      {
        // The grid, above capacity, because it is the choice that
        // changes what every other number on the card means: a capacity
        // of 72 is 72 per half hour or 72 per hour depending on it.
        id: id("slotMinutes"),
        label: "Créneaux de",
        hint: "Les heures que l'application propose, et la façon dont le carnet regroupe la journée.",
        control: {
          kind: "select",
          value: String(service.slotMinutes),
          options: SLOT_MINUTES.map((m) => ({
            value: String(m),
            label: m === 60 ? "1 heure" : `${m} minutes`,
          })),
        },
        ...write("slotMinutes"),
      },
      {
        id: id("capacityCovers"),
        label: "Capacité",
        control: {
          kind: "number",
          value: service.capacityCovers,
          min: 1,
          max: 2000,
          suffix: vocabulary.cover.many,
        },
        ...write("capacityCovers"),
      },
      {
        id: id("enabled"),
        label: "Service ouvert à la réservation",
        control: { kind: "toggle", value: service.enabled },
        ...write("enabled"),
      },
    ],
    footerActions: [
      {
        action: {
          kind: "command",
          command: "service.remove",
          label: "Retirer ce service",
          payload: { id: service.id },
        },
        variant: "ghost",
        allow: ["owner", "admin"],
      },
    ],
  };
}

// ── Notifications ────────────────────────────────────────────

const CHANNELS = [
  { value: "push", label: "Push" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
];

/** The three alerts a basic dashboard sends, and what each one is. */
const ALERTS: { id: string; event: string; label: string; hint: string }[] = [
  {
    id: "new-booking",
    event: "newBooking",
    label: "Nouvelle demande de réservation",
    hint: "Dès qu'un client demande une table.",
  },
  {
    id: "cancellation",
    event: "cancellation",
    label: "Annulation par le client",
    hint: "Une table qui se libère est une table à remplir.",
  },
  {
    id: "guest-reminder",
    event: "guestReminder",
    label: "Rappel au client la veille",
    hint: "Le message qui fait le plus baisser les absences. Il part au client, pas à vous.",
  },
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
  settings: VenueSettings | undefined,
  messages: { id: string; recipient: string; kind: string; status: string; at: string; channel: string; failureReason: string }[],
  lot: Lot = 2,
): ScreenSpec {
  const lot1 = lot === 1;
  const channelsOf = (list: string[] | undefined) => (list ?? []).join(",");

  // Three alerts, three channels each, as switches. A select made the
  // channels exclusive, which was wrong twice over: an alert that matters
  // goes out by push *and* WhatsApp, and an alert nobody wants is muted
  // by turning all three off, not by choosing "Aucun".
  const alerts: Block = {
    id: "alerts",
    type: "settings",
    heading: "Alertes",
    subheading: "Par quel canal chaque alerte part. Plusieurs canaux à la fois si vous voulez.",
    rows: ALERTS.map((alert) => ({
      id: alert.id,
      label: alert.label,
      hint: alert.hint,
      control: {
        kind: "switches" as const,
        value: channelsOf(
          alert.event === "newBooking"
            ? prefs?.newBooking
            : alert.event === "cancellation"
              ? prefs?.cancellation
              : prefs?.guestReminder,
        ),
        options: CHANNELS,
      },
      command: "notifications.set",
      payload: { event: alert.event },
      allow: ["owner", "admin"],
    })),
  };

  // Where they land. Kept apart from the public contact on the fiche: the
  // number a guest calls to book is not necessarily the one that should
  // buzz at 23h when a table cancels.
  const recipients: Block = {
    id: "recipients",
    type: "settings",
    heading: "Qui les reçoit",
    subheading: "Le numéro et l'adresse de l'établissement, pas ceux de la fiche publique.",
    rows: [
      {
        id: "alert-phone",
        label: "Numéro qui reçoit les alertes",
        hint: "Push et WhatsApp partent sur ce numéro.",
        control: {
          kind: "text",
          value: settings?.alertPhone ?? "",
          placeholder: "+212 6 00 00 00 00",
        },
        command: "settings.set",
        payload: { field: "alertPhone" },
        allow: ["owner"],
      },
      {
        id: "alert-email",
        label: "Adresse e-mail qui reçoit les alertes",
        control: {
          kind: "text",
          value: settings?.alertEmail ?? "",
          placeholder: "reservations@etablissement.ma",
        },
        command: "settings.set",
        payload: { field: "alertEmail" },
        allow: ["owner"],
      },
    ],
  };

  const guest: Block = {
    id: "guest-messages",
    type: "settings",
    heading: "Autres messages aux clients",
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
    rows: GUEST_MESSAGES.map((message): SettingRow => ({
      id: `${message.id}-channel`,
      label: message.label,
      hint: message.hint,
      control: { kind: "switches", value: "whatsapp", options: CHANNELS },
      command: "notifications.guestChannel",
      payload: { message: message.id },
      badge: { label: message.timing.toUpperCase(), tone: "neutral" },
      allow: ["owner", "admin"],
    })),
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

  // Notifications, under sprint Prio 02.
  //
  // Three alerts and the two addresses they reach. The wider guest-message
  // cadence and the delivery journal both describe messages LYFE sends on
  // the venue's behalf, and the screen that owns that conversation —
  // Campagnes — is Prio 08. A journal listing sends the partner cannot
  // configure reads as a screen with settings hidden from them.
  if (lot1) {
    return {
      slug: "notifications",
      title: "Notifications",
      subtitle: "Ce dont vous êtes prévenu, et par quel canal",
      blocks: [alerts, recipients],
    };
  }

  return {
    slug: "notifications",
    title: "Notifications",
    subtitle: "Qui reçoit quoi, et par quel canal",
    blocks: [alerts, recipients, guest, log],
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

export function buildSubscriptionScreen(
  subscription: Subscription,
  lot: Lot = 2,
): ScreenSpec {
  const lot1 = lot === 1;
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
        hint: lot1
          ? "Un abonnement annuel unique. Ni palier, ni option à l'usage."
          : "Un abonnement unique, sans palier.",
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
        hint: "Toutes celles enregistrées depuis l'ouverture du compte."
      },
      {
        id: "guests",
        label: "Clients au fichier",
        tone: "surface",
        icon: "users",
        metric: { value: subscription.usage.guests, format: COUNT, animate: true },
        hint: "Le total affiché par Clients."
      },
      {
        id: "messages",
        label: "Messages envoyés",
        tone: "surface",
        icon: "message-square",
        metric: { value: subscription.usage.messagesSent, format: COUNT, animate: true },
        // The journal counts one row per guest message. Campaign sends
        // are counted per campaign in Campagnes, which is why the two
        // screens quote different totals for the word "messages".
        hint: lot1
          ? "Messages de service envoyés au nom de l'établissement."
          : "Messages de service. Les envois de campagne sont comptés dans Campagnes."
      },
      {
        id: "campaigns",
        label: "Campagnes",
        tone: "surface",
        icon: "megaphone",
        metric: { value: subscription.usage.campaigns, format: COUNT, animate: true },
        hint: "Campagnes ponctuelles et automatisations confondues."
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
    // One annual plan, its invoices, and what it has been used for. The
    // marketing add-on is priced per recipient against Campagnes, so it
    // belongs to the lot that sells Campagnes.
    blocks: lot1 ? [plan, usage, invoices] : [plan, usage, invoices, marketingAddon],
  };
}

// ── Support ──────────────────────────────────────────────────

/**
 * The help catalogue, per lot.
 *
 * A guide is only worth listing where the screen it explains exists. The
 * Acomptes guide described a Lot 2 screen outright, and two others sent a
 * Lot 1 partner to Liste d'attente and the briefing — so `lot1` carries
 * the shorter body for the screens Lot 1 does have, and the guide with no
 * Lot 1 subject is not listed at all. The ids are the help centre's own
 * slugs, so they stay put whichever body is shown.
 */
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
    lot1: {
      body: "Le carnet du service, accepter ou refuser une demande, le check-in à la porte.",
      minutes: 9,
    },
    minutes: 12,
  },
  {
    id: "no-show",
    title: "Réduire les absences",
    body: "Rappels, reconfirmation, acomptes : ce qui marche, dans l'ordre.",
    lot1: { body: "Rappels et reconfirmation : ce qui marche, dans l'ordre.", minutes: 6 },
    minutes: 10,
  },
  {
    id: "deposits",
    title: "Configurer les acomptes",
    body: "Quand demander de l'argent d'avance, et comment le capturer ou le rendre.",
    lot2Only: true,
    minutes: 7,
  },
];

export function buildSupportScreen(
  tickets: SupportTicket[],
  lot: Lot = 2,
): ScreenSpec {
  const lot1 = lot === 1;
  const guideList = GUIDES.filter((g) => !(lot1 && g.lot2Only)).map((g) =>
    lot1 && g.lot1 ? { ...g, ...g.lot1 } : g,
  );
  const guides: Block = {
    id: "guides",
    type: "entity-list",
    heading: "Guides",
    search: { placeholder: "Rechercher dans l'aide…" },
    rows: guideList.map((guide) => ({
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
