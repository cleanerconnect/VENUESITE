// Fiche client.
//
// Everything the venue knows about one guest, in the order the target
// specification lists it: who they are, how to reach them, how often
// they come, whether they turn up, what they like, what they spent, what
// they said, and what was said to them.
//
// Two rules the screen keeps and the rest of the portal shares. Spend
// appears only where a transaction source exists — a guest whose spend
// nobody can see has not spent nothing. And the risk indicator is
// derived here from the last twelve months, not stored: a number that
// stops moving is a number that stops being true.

import type { Block, DetailSpec, ScreenSpec } from "@/lib/dashboard/spec";
import { COUNT, MAD, PERCENT } from "@/lib/dashboard/formats";
import type { Customer } from "@/lib/types/business";
import { LOYALTY_TIER } from "@/lib/types/business";
import type { GuestReview, Reservation } from "@/lib/types/restaurant";
import type {
  GuestTag,
  LoggedMessage,
  VenueConfiguration,
} from "@/lib/types/venue-operations";
import { RESERVATION_STATE } from "./vocabulary";
import { restaurantHref } from "./slugs";
import { coversIn, dayLabel, hm, initialsOf, money, shortDay } from "./format";

export type RiskLevel = "none" | "faible" | "eleve";

const RISK_LABEL: Record<RiskLevel, string> = {
  none: "Aucun risque",
  faible: "Risque faible",
  eleve: "Risque élevé",
};

/**
 * The risk indicator, from the last twelve months only.
 *
 * Derived rather than stored, and windowed rather than lifetime: a guest
 * who missed two tables three years ago is not the guest standing at the
 * door tonight, and treating them as one is how a venue loses a regular.
 */
export function riskLevelOf(customer: Customer): RiskLevel {
  const cutoff = Date.now() - 365 * 86_400_000;
  const recent = customer.noShowHistory.filter(
    (n) => Date.parse(n.at) >= cutoff,
  ).length;
  if (recent === 0) return "none";
  return recent >= 2 ? "eleve" : "faible";
}

export function buildCustomerScreen(input: {
  customer: Customer;
  reviews: GuestReview[];
  reservations: Reservation[];
  tagIds: string[];
  tags: GuestTag[];
  spendMad: number | undefined;
  hasSpendSource: boolean;
  messages: LoggedMessage[];
  configuration: VenueConfiguration;
}): ScreenSpec {
  const {
    customer,
    reviews,
    reservations,
    tagIds,
    tags,
    spendMad,
    hasSpendSource,
    messages,
    configuration,
  } = input;

  const labels = tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is GuestTag => Boolean(t) && !t!.archived);
  const risk = riskLevelOf(customer);
  const loyalty = LOYALTY_TIER[customer.loyaltyTier];
  const theirs = reservations.filter(
    (r) => r.guestName === customer.fullName || r.guestPhone === customer.phone,
  );
  const upcoming = theirs.filter(
    (r) => Date.parse(r.at) >= Date.now() && r.state !== "cancelled",
  );
  const theirReviews = reviews.filter((r) => customer.reviewIds.includes(r.id));

  const header: Block = {
    id: "header",
    type: "greeting",
    eyebrow: loyalty.label,
    title: `${customer.fullName}`,
    emphasis: labels.map((t) => t.label).join(" · ") || undefined,
    subline: customer.lastVisitAt
      ? `Client depuis le ${shortDay(customer.firstSeenAt)} · dernière visite le ${shortDay(customer.lastVisitAt)}`
      : `Ajouté le ${shortDay(customer.firstSeenAt)} · pas encore venu`,
    actions: [
      {
        action: {
          kind: "command",
          command: "reservation.create",
          payload: { customerId: customer.id },
          label: "Créer une réservation",
          icon: "plus",
        },
        variant: "primary",
      },
      {
        action: {
          kind: "command",
          command: "customer.call",
          payload: { phone: customer.phone },
          label: "Appeler",
          icon: "phone",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "customer.message",
          payload: { id: customer.id },
          label: "Envoyer un message",
          icon: "message-square",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "customer.export",
          payload: { id: customer.id },
          label: "Exporter la fiche",
          icon: "file",
        },
        variant: "ghost",
      },
    ],
  };

  const summary: Block = {
    id: "summary",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "visits",
        label: "Visites",
        tone: "sand",
        icon: "users",
        metric: { value: customer.visitCount, format: COUNT, animate: true },
        hint: customer.lastVisitAt
          ? `Dernière le ${shortDay(customer.lastVisitAt)}`
          : "Aucune visite enregistrée",
      },
      {
        id: "risk",
        label: "Risque d'absence",
        tone: risk === "eleve" ? "rose" : risk === "faible" ? "peach" : "sage",
        icon: "user-x",
        metric: { value: RISK_LABEL[risk] },
        hint: `${customer.noShowHistory.length} absences enregistrées, dont ${
          customer.noShowHistory.filter(
            (n) => Date.parse(n.at) >= Date.now() - 365 * 86_400_000,
          ).length
        } sur douze mois`,
      },
      {
        id: "loyalty",
        label: "Palier fidélité",
        tone: "surface",
        icon: "star",
        metric: { value: loyalty.label },
        // Read from the loyalty service, never computed here.
        hint: "Fourni par le service de fidélité.",
      },
      // Spend only where Lyfe Pay says so. Elsewhere the tile is absent,
      // which is the rule the whole portal follows.
      ...(hasSpendSource && spendMad !== undefined
        ? [
            {
              id: "spend",
              label: "Total dépensé",
              tone: "surface" as const,
              icon: "coins" as const,
              metric: { value: spendMad, format: MAD, animate: true },
              hint: "Transactions Lyfe Pay rattachées à ce client.",
            },
          ]
        : []),
    ],
  };

  const contact: Block = {
    id: "contact",
    type: "settings",
    heading: "Contact et consentement",
    banner: customer.optedOutOfMarketing
      ? {
          tone: "warning",
          title: "Ce client refuse le démarchage",
          body: "Il est exclu de toute campagne, quel que soit le segment. Les messages de service — confirmation, rappel, table prête — continuent de partir.",
        }
      : undefined,
    rows: [
      {
        id: "phone",
        label: "Téléphone",
        control: { kind: "readonly", value: customer.phone },
        command: "customer.call",
        payload: { phone: customer.phone },
      },
      {
        id: "email",
        label: "E-mail",
        control: { kind: "readonly", value: customer.email ?? "Non renseigné" },
        command: "noop",
      },
      {
        id: "vip",
        label: "Marquer VIP",
        hint: "Visible par l'équipe en salle et au briefing.",
        control: {
          kind: "toggle",
          value: labels.some((t) => t.label.toLowerCase().includes("vip")),
        },
        command: "customer.vip",
        payload: { id: customer.id },
        allow: ["owner", "admin"],
      },
      {
        id: "marketing",
        label: "Accepte le démarchage",
        hint: "Le client peut retirer son consentement depuis l'application à tout moment.",
        control: { kind: "readonly", value: customer.optedOutOfMarketing ? "Non" : "Oui" },
        command: "noop",
      },
    ],
    footerActions: [
      {
        action: {
          kind: "command",
          command: "customer.anonymise",
          payload: { id: customer.id },
          label: "Anonymiser (droit à l'effacement)",
          icon: "ban",
        },
        variant: "ghost",
        allow: ["owner"],
      },
    ],
  };

  const preferences: Block = {
    id: "preferences",
    type: "entity-list",
    heading: "Préférences et demandes",
    headingAction: {
      kind: "command",
      command: "customer.notes",
      label: "Modifier les notes",
      icon: "note",
    },
    rows: customer.preferences.map((p, i) => ({
      id: `pref-${i}`,
      title: p,
      icon: "note" as const,
      meta: "Reportée automatiquement sur chaque réservation",
    })),
    empty: {
      title: "Aucune préférence",
      body: "Allergies, table préférée, occasion : ce qui est noté ici suit le client à chaque venue.",
      icon: "note",
      action: { kind: "command", command: "customer.notes", label: "Ajouter une note" },
    },
  };

  const tagBlock: Block = {
    id: "tags",
    type: "entity-list",
    heading: "Étiquettes",
    headingAction: {
      kind: "link",
      href: restaurantHref("segments"),
      label: "Gérer les étiquettes →",
    },
    rows: labels.map((tag) => ({
      id: tag.id,
      title: tag.label,
      icon: "tag" as const,
      meta: tag.origin === "auto" ? "Posée automatiquement" : "Posée à la main",
      badges: [{ label: tag.colour.toUpperCase(), tone: "violet" as const }],
      menu:
        tag.origin === "manual"
          ? [
              {
                id: "remove",
                label: "Retirer l'étiquette",
                destructive: true,
                action: {
                  kind: "command" as const,
                  command: "customer.untag",
                  payload: { customerId: customer.id, tagId: tag.id },
                },
              },
            ]
          : undefined,
    })),
    empty: {
      title: "Aucune étiquette",
      body: "Les étiquettes automatiques se posent seules ; les manuelles se posent depuis la liste clients.",
      icon: "tag",
    },
  };

  const upcomingBlock: Block = {
    id: "upcoming",
    type: "entity-list",
    heading: "Réservations à venir",
    rows: upcoming.map((r) => reservationLine(r, configuration)),
    empty: {
      title: "Rien de prévu",
      body: "Ce client n'a aucune réservation à venir.",
      icon: "calendar",
      action: {
        kind: "command",
        command: "reservation.create",
        payload: { customerId: customer.id },
        label: "Créer une réservation",
      },
    },
  };

  const historyBlock: Block = {
    id: "history",
    type: "entity-list",
    heading: "Historique",
    tabs: [
      { id: "all", label: "Tout" },
      { id: "noshow", label: "Absences", match: { facet: "state", values: ["no_show"] } },
    ],
    rows: theirs
      .filter((r) => Date.parse(r.at) < Date.now())
      .map((r) => reservationLine(r, configuration)),
    empty: {
      title: "Aucune visite",
      body: "L'historique se remplit à partir de la première venue.",
      icon: "clock",
    },
    noMatches: { title: "Rien à afficher", body: "Aucune réservation dans ce filtre." },
  };

  const reviewBlock: Block = {
    id: "reviews",
    type: "entity-list",
    heading: "Avis laissés",
    rows: theirReviews.map((r) => ({
      id: r.id,
      title: `${r.rating}/5`,
      icon: "star" as const,
      meta: `${shortDay(r.at)} · ${r.channel.toUpperCase()}${r.replied ? " · répondu" : " · sans réponse"}`,
      signal: { text: r.comment, icon: "message-square" as const },
      badges: r.replied
        ? [{ label: "RÉPONDU", tone: "success" as const }]
        : [{ label: "SANS RÉPONSE", tone: "warning" as const }],
      href: restaurantHref("avis"),
    })),
    empty: {
      title: "Aucun avis",
      body: "Ce client n'a pas encore laissé d'avis.",
      icon: "star",
    },
  };

  const messageBlock: Block = {
    id: "messages",
    type: "feed",
    heading: "Journal des messages",
    subheading: "Ce que LYFE a envoyé à ce client au nom de l'établissement.",
    entries: messages.slice(0, 20).map((m) => ({
      id: m.id,
      actor: m.channel.toUpperCase(),
      message: `${m.kind} — ${m.preview}`,
      at: m.at,
      icon: m.status === "echoue" ? ("alert" as const) : ("message-square" as const),
      tone: m.status === "echoue" ? ("danger" as const) : ("neutral" as const),
      highlight: m.status === "echoue",
    })),
    empty: {
      title: "Aucun message",
      body: "Confirmations, rappels et campagnes envoyés à ce client apparaîtront ici.",
      icon: "message-square",
    },
  };

  return {
    slug: `clients/${customer.id}`,
    title: customer.fullName,
    subtitle: `${customer.visitCount} visites · ${RISK_LABEL[risk].toLowerCase()}`,
    blocks: [
      header,
      summary,
      { id: "split", type: "split", railWidth: 400, main: [preferences, upcomingBlock, historyBlock], rail: [contact, tagBlock] },
      reviewBlock,
      messageBlock,
    ],
    mobileBlocks: [
      header,
      { ...summary, id: "summary-mobile", columns: 2 },
      contact,
      tagBlock,
      preferences,
      upcomingBlock,
      historyBlock,
      reviewBlock,
      messageBlock,
    ],
  };
}

function reservationLine(reservation: Reservation, configuration: VenueConfiguration) {
  const state = RESERVATION_STATE[reservation.state];
  return {
    id: reservation.id,
    title: `${dayLabel(reservation.at)} à ${hm(reservation.at)}`,
    initials: initialsOf(reservation.guestName),
    meta: [
      coversIn(configuration, reservation.partySize),
      reservation.note ?? "sans note",
      reservation.depositMad ? `acompte ${money(reservation.depositMad)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    badges: [{ label: state.label, tone: state.tone, icon: state.icon }],
    facets: { state: reservation.state },
  };
}

/** The same profile, as a drawer. Kept beside the screen so the two agree. */
export function customerDetailFrom(spec: ScreenSpec): DetailSpec {
  return {
    title: spec.title,
    subtitle: spec.subtitle,
    sections: [],
  };
}

export const CUSTOMER_PERCENT = PERCENT;
