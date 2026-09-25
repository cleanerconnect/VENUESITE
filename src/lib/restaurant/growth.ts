// Guest vocabulary and growth: Tags et segments, Offres, Expériences.
//
// The three screens that turn a booking list into a guest base and a
// quiet Tuesday into a full one. They share a source — the guest graph
// and the growth bundle — and a rule: nothing here estimates money. An
// offer's attribution is counted from redemptions, an experience's
// revenue from tickets sold, and where neither exists the figure is
// absent rather than guessed.

import type { Block, EntityRow, ScreenSpec, SettingRow } from "@/lib/dashboard/spec";
import { COUNT, MAD, PERCENT } from "@/lib/dashboard/formats";
import type {
  Experience,
  Growth,
  GuestGraph,
  GuestTag,
  Offer,
  TagRule,
  VenueConfiguration,
} from "@/lib/types/venue-operations";
import { configFor } from "@/lib/venue/config";
import { restaurantHref } from "./slugs";
import { coversIn, dayLabel, hm, money, mobileTiles, shortDay } from "./format";

const WEEKDAY_SHORT = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const weekdayLabel = (days: number[]) =>
  days.length === 7
    ? "tous les jours"
    : days.map((d) => WEEKDAY_SHORT[d - 1]).join(", ");

// ── Tags et segments ─────────────────────────────────────────

const RULE_COPY: Record<
  TagRule["rule"],
  { label: string; unit: string; hint: (r: TagRule) => string }
> = {
  habitue: {
    label: "Habitué",
    unit: "visites",
    hint: (r) => `Au moins ${r.threshold} visites sur ${Math.round(r.windowDays / 30)} mois.`,
  },
  gros_panier: {
    label: "Gros panier",
    unit: "MAD",
    hint: (r) => `Panier moyen au-dessus de ${r.threshold} MAD sur douze mois.`,
  },
  a_risque: {
    label: "À risque",
    unit: "absences",
    hint: (r) => `Au moins ${r.threshold} absences sur douze mois.`,
  },
  nouveau: {
    label: "Nouveau",
    unit: "jours",
    hint: (r) => `Première visite dans les ${r.windowDays} derniers jours.`,
  },
  inactif: {
    label: "Inactif",
    unit: "jours",
    hint: (r) => `Aucune visite depuis ${r.windowDays} jours.`,
  },
};

export function buildSegmentsScreen(
  graph: GuestGraph,
  hasSpendSource: boolean,
): ScreenSpec {
  const manual = graph.tags.filter((t) => t.origin === "manual" && !t.archived);
  const automatic = graph.tags.filter((t) => t.origin === "auto" && !t.archived);
  const archived = graph.tags.filter((t) => t.archived);

  const manualList: Block = {
    id: "manual-tags",
    type: "entity-list",
    heading: "Étiquettes manuelles",
    headingAction: {
      kind: "command",
      command: "tag.create",
      label: "Créer une étiquette",
      icon: "plus",
    },
    rows: manual.map(tagRow),
    empty: {
      title: "Aucune étiquette",
      body: "Créez celles que l'équipe pose à la main : VIP, presse, allergie.",
      icon: "tag",
      action: { kind: "command", command: "tag.create", label: "Créer une étiquette" },
    },
  };

  // Each automatic tag is one editable threshold, so the rule and the
  // tag it maintains are read side by side rather than on two screens.
  const ruleRows: SettingRow[] = graph.rules.flatMap((rule): SettingRow[] => {
    const copy = RULE_COPY[rule.rule];
    // "Gros panier" needs a transaction source to mean anything. Where
    // there is none the rule is shown disabled and says why, rather than
    // offering a threshold that can never be met.
    const unavailable = rule.rule === "gros_panier" && !hasSpendSource;
    return [
      {
        id: `${rule.id}-enabled`,
        label: copy.label,
        hint: unavailable
          ? "Aucune source de paiement : cette règle reste inactive tant que Lyfe Pay n'est pas branché."
          : copy.hint(rule),
        control: unavailable
          ? { kind: "readonly", value: "Indisponible", href: restaurantHref("lyfe-pay") }
          : { kind: "toggle", value: rule.enabled },
        command: "rule.toggle",
        payload: { id: rule.id },
        badge: rule.enabled && !unavailable
          ? { label: "ACTIVE", tone: "success" }
          : { label: "INACTIVE", tone: "muted" },
        allow: ["owner", "admin"],
      },
      ...(unavailable
        ? []
        : [
            {
              id: `${rule.id}-threshold`,
              label: `Seuil · ${copy.label}`,
              hint: `Exprimé en ${copy.unit}.`,
              control: { kind: "number" as const, value: rule.threshold, min: 0 },
              command: "rule.threshold",
              payload: { id: rule.id },
              allow: ["owner", "admin"],
            },
            {
              id: `${rule.id}-window`,
              label: `Fenêtre · ${copy.label}`,
              hint: "Sur combien de jours la règle regarde en arrière.",
              control: { kind: "number" as const, value: rule.windowDays, min: 1, max: 730 },
              command: "rule.window",
              payload: { id: rule.id },
              allow: ["owner", "admin"],
            },
          ]),
    ];
  });

  const rules: Block = {
    id: "tag-rules",
    type: "settings",
    heading: "Étiquettes automatiques",
    subheading:
      "Posées et retirées toutes seules. Changez un seuil et la base entière se recalcule.",
    rows: ruleRows,
  };

  const automaticList: Block = {
    id: "auto-tags",
    type: "entity-list",
    heading: "Ce que les règles ont posé",
    rows: automatic.map(tagRow),
    empty: {
      title: "Aucune étiquette automatique",
      body: "Activez une règle ci-dessus pour que la base se classe toute seule.",
      icon: "sparkles",
    },
  };

  const segments: Block = {
    id: "segments",
    type: "entity-list",
    heading: "Segments enregistrés",
    headingAction: {
      kind: "command",
      command: "segment.create",
      label: "Créer un segment",
      icon: "plus",
    },
    rows: graph.segments.map((segment) => ({
      id: segment.id,
      title: segment.name,
      icon: "filter" as const,
      meta: segment.description || "Aucune description",
      trailing: { label: "Clients", metric: { value: segment.memberCount, format: COUNT } },
      actions: [
        {
          action: {
            kind: "link" as const,
            href: `${restaurantHref("clients")}?segment=${segment.id}`,
            label: "Voir les clients",
            icon: "users" as const,
          },
          variant: "secondary" as const,
        },
        {
          action: {
            kind: "link" as const,
            href: `${restaurantHref("campagnes")}?segment=${segment.id}`,
            label: "Créer une campagne",
            icon: "megaphone" as const,
          },
          variant: "primary" as const,
        },
      ],
      menu: [
        {
          id: "delete",
          label: "Supprimer le segment",
          destructive: true,
          action: {
            kind: "command",
            command: "segment.delete",
            payload: { id: segment.id },
          },
        },
      ],
    })),
    empty: {
      title: "Aucun segment",
      body: "Un segment combine des étiquettes et des filtres, et se réutilise dans Clients et Campagnes.",
      icon: "filter",
      action: { kind: "command", command: "segment.create", label: "Créer un segment" },
    },
  };

  const archivedList: Block | null = archived.length
    ? {
        id: "archived-tags",
        type: "entity-list",
        heading: "Archivées",
        rows: archived.map(tagRow),
      }
    : null;

  return {
    slug: "segments",
    title: "Tags et segments",
    subtitle: "Le vocabulaire de la base clients",
    blocks: [
      manualList,
      rules,
      automaticList,
      segments,
      ...(archivedList ? [archivedList] : []),
    ],
  };
}

function tagRow(tag: GuestTag): EntityRow {
  return {
    id: tag.id,
    title: tag.label,
    icon: "tag",
    meta: [
      tag.origin === "auto" ? "Posée automatiquement" : "Posée à la main",
      tag.staffVisible ? "visible par l'équipe" : "réservée à la direction",
      tag.archived ? "archivée" : `${tag.usageCount} clients`,
    ].join(" · "),
    badges: [{ label: tag.colour.toUpperCase(), tone: "violet" }],
    trailing: { label: "Clients", metric: { value: tag.usageCount, format: COUNT } },
    menu: tag.archived
      ? undefined
      : [
          {
            id: "edit",
            label: "Modifier",
            action: { kind: "command", command: "tag.edit", payload: { id: tag.id } },
          },
          {
            id: "view",
            label: "Voir les clients",
            action: {
              kind: "link",
              href: `${restaurantHref("clients")}?tag=${tag.id}`,
            },
          },
          ...(tag.origin === "manual"
            ? [
                {
                  id: "archive",
                  label: "Archiver",
                  destructive: true,
                  action: {
                    kind: "command" as const,
                    command: "tag.archive",
                    payload: { id: tag.id },
                  },
                },
              ]
            : []),
        ],
  };
}

// ── Offres ───────────────────────────────────────────────────

const OFFER_STATUS: Record<
  Offer["status"],
  { label: string; tone: "success" | "info" | "warning" | "muted" | "neutral" }
> = {
  active: { label: "ACTIVE", tone: "success" },
  scheduled: { label: "PLANIFIÉE", tone: "info" },
  paused: { label: "EN PAUSE", tone: "warning" },
  draft: { label: "BROUILLON", tone: "neutral" },
  archived: { label: "ARCHIVÉE", tone: "muted" },
};

function offerValue(offer: Offer): string {
  switch (offer.kind) {
    case "percent":
      return `−${offer.value} % sur l'addition`;
    case "amount":
      return `−${money(offer.value)}`;
    case "free_item":
      return offer.freeItemLabel || "Offert";
    case "set_menu":
      return `Menu à ${money(offer.value)}`;
  }
}

export function buildOffersScreen(
  growth: Growth,
  configuration: VenueConfiguration,
): ScreenSpec {
  const config = configFor(configuration);
  const live = growth.offers.filter(
    (o) => o.status === "active" || o.status === "scheduled" || o.status === "paused",
  );
  const past = growth.offers.filter(
    (o) => o.status === "archived" || o.status === "draft",
  );

  const attributedCovers = growth.offers.reduce((s, o) => s + o.coversAttributed, 0);
  const attributedBookings = growth.offers.reduce(
    (s, o) => s + o.reservationsAttributed,
    0,
  );

  const kpis: Block = {
    id: "offer-kpis",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "active",
        label: "Offres actives",
        tone: "sand",
        icon: "tag",
        metric: {
          value: growth.offers.filter((o) => o.status === "active").length,
          format: COUNT,
          animate: true,
        },
      },
      {
        id: "bookings",
        label: "Réservations attribuées",
        tone: "surface",
        icon: "calendar-clock",
        metric: { value: attributedBookings, format: COUNT, animate: true },
        // Counted from redemptions, so this is a fact rather than a model.
        hint: "Comptées sur les offres appliquées, pas estimées.",
      },
      {
        id: "covers",
        label: config.cover.many.replace(/^./, (c) => c.toUpperCase()) + " attribués",
        tone: "surface",
        icon: "users",
        metric: { value: attributedCovers, format: COUNT, animate: true },
      },
    ],
  };

  const liveList: Block = {
    id: "offers-live",
    type: "entity-list",
    heading: "Offres en cours et à venir",
    headingAction: {
      kind: "command",
      command: "offer.create",
      label: "Créer une offre",
      icon: "plus",
    },
    tabs: [
      { id: "all", label: "Toutes" },
      { id: "active", label: "Actives", match: { facet: "status", values: ["active"] } },
      {
        id: "scheduled",
        label: "Planifiées",
        match: { facet: "status", values: ["scheduled"] },
      },
      { id: "paused", label: "En pause", match: { facet: "status", values: ["paused"] } },
    ],
    rows: live.map((o) => offerRow(o, configuration)),
    empty: {
      title: "Aucune offre",
      body: "Une offre remplit un service creux sans toucher à la carte. Le calendrier montre lesquels le sont.",
      icon: "tag",
      action: {
        kind: "link",
        href: restaurantHref("calendrier"),
        label: "Voir les services creux",
      },
    },
    noMatches: { title: "Aucune offre", body: "Aucune offre dans cet état." },
  };

  const pastList: Block = {
    id: "offers-past",
    type: "entity-list",
    heading: "Brouillons et archives",
    rows: past.map((o) => offerRow(o, configuration)),
    empty: { title: "Rien en archive", body: "Aucune offre passée ou en brouillon.", icon: "file" },
  };

  return {
    slug: "offres",
    title: "Offres",
    subtitle: "Remplir un service creux sans toucher aux prix",
    blocks: [kpis, liveList, pastList],
    mobileBlocks: [
      liveList,
      { ...kpis, id: "offer-kpis-mobile", columns: 1, tiles: mobileTiles(kpis) },
      pastList,
    ],
  };
}

function offerRow(offer: Offer, configuration: VenueConfiguration): EntityRow {
  const status = OFFER_STATUS[offer.status];
  return {
    id: offer.id,
    title: offer.name,
    icon: "tag",
    meta: [
      offerValue(offer),
      weekdayLabel(offer.weekdays),
      `du ${shortDay(offer.startsOn)} au ${shortDay(offer.endsOn)}`,
      offer.coverCap > 0
        ? `plafond ${coversIn(configuration, offer.coverCap)}`
        : "sans plafond",
      offer.minParty > 1 ? `à partir de ${offer.minParty}` : "toutes tailles",
    ].join(" · "),
    badges: [
      { label: status.label, tone: status.tone },
      ...(offer.prepaymentRequired
        ? [{ label: "PRÉPAIEMENT", tone: "info" as const }]
        : []),
    ],
    facets: { status: offer.status },
    trailing: {
      label: "Réservations",
      metric: { value: offer.reservationsAttributed, format: COUNT },
    },
    signal:
      offer.reservationsAttributed > 0
        ? {
            text: `${offer.reservationsAttributed} réservations et ${coversIn(configuration, offer.coversAttributed)} attribués à cette offre.`,
            icon: "trend-up",
          }
        : undefined,
    menu: [
      {
        id: "edit",
        label: "Modifier",
        action: { kind: "command", command: "offer.edit", payload: { id: offer.id } },
      },
      {
        id: "duplicate",
        label: "Dupliquer",
        action: {
          kind: "command",
          command: "offer.duplicate",
          payload: { id: offer.id },
        },
      },
      offer.status === "paused"
        ? {
            id: "resume",
            label: "Réactiver",
            action: {
              kind: "command",
              command: "offer.status",
              payload: { id: offer.id, status: "active" },
            },
          }
        : {
            id: "pause",
            label: "Mettre en pause",
            action: {
              kind: "command",
              command: "offer.status",
              payload: { id: offer.id, status: "paused" },
            },
          },
      {
        id: "archive",
        label: "Archiver",
        destructive: true,
        action: {
          kind: "command",
          command: "offer.status",
          payload: { id: offer.id, status: "archived" },
        },
      },
    ],
  };
}

// ── Expériences ──────────────────────────────────────────────

const EXPERIENCE_STATUS: Record<
  Experience["status"],
  { label: string; tone: "success" | "info" | "warning" | "muted" }
> = {
  publie: { label: "PUBLIÉE", tone: "success" },
  brouillon: { label: "BROUILLON", tone: "muted" },
  complet: { label: "COMPLET", tone: "warning" },
  termine: { label: "TERMINÉE", tone: "info" },
};

export function buildExperiencesScreen(growth: Growth): ScreenSpec {
  const experiences = growth.experiences;
  const upcoming = experiences.filter((e) => e.status !== "termine");
  const done = experiences.filter((e) => e.status === "termine");

  const revenue = experiences.reduce((s, e) => s + e.revenueMad, 0);
  const seats = experiences.reduce((s, e) => s + e.seatsSold, 0);

  const kpis: Block = {
    id: "experience-kpis",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "published",
        label: "Expériences publiées",
        tone: "sand",
        icon: "sparkles",
        metric: {
          value: experiences.filter((e) => e.status === "publie").length,
          format: COUNT,
          animate: true,
        },
      },
      {
        id: "seats",
        label: "Places vendues",
        tone: "surface",
        icon: "ticket",
        metric: { value: seats, format: COUNT, animate: true },
      },
      {
        id: "revenue",
        label: "Recette billetterie",
        tone: "surface",
        icon: "coins",
        // Summed from tickets actually sold, so it is a real figure and
        // is shown even where the venue has no Lyfe Pay.
        metric: { value: revenue, format: MAD, animate: true },
        hint: "Somme des billets vendus, hors annulations et remboursements.",
      },
    ],
  };

  const list: Block = {
    id: "experiences",
    type: "entity-list",
    heading: "À venir",
    headingAction: {
      kind: "command",
      command: "experience.create",
      label: "Créer une expérience",
      icon: "plus",
    },
    tabs: [
      { id: "all", label: "Toutes" },
      { id: "publie", label: "Publiées", match: { facet: "status", values: ["publie"] } },
      {
        id: "brouillon",
        label: "Brouillons",
        match: { facet: "status", values: ["brouillon"] },
      },
    ],
    rows: upcoming.map(experienceRow),
    empty: {
      title: "Aucune expérience",
      body: "Une soirée dégustation, un brunch, une table du chef : vendez autre chose qu'une table.",
      icon: "sparkles",
      action: {
        kind: "command",
        command: "experience.create",
        label: "Créer une expérience",
      },
    },
    noMatches: { title: "Aucune expérience", body: "Aucune expérience dans cet état." },
  };

  const pastList: Block = {
    id: "experiences-past",
    type: "entity-list",
    heading: "Terminées",
    rows: done.map(experienceRow),
    empty: {
      title: "Rien de terminé",
      body: "Les expériences passées et leur recette apparaîtront ici.",
      icon: "receipt",
    },
  };

  return {
    slug: "experiences",
    title: "Expériences",
    subtitle: "Vendre autre chose qu'une table",
    blocks: [kpis, list, pastList],
  };
}

function experienceRow(experience: Experience): EntityRow {
  const status = EXPERIENCE_STATUS[experience.status];
  const checkedIn = experience.tickets.filter((t) => t.checkedInAt).length;

  return {
    id: experience.id,
    title: experience.title,
    icon: "sparkles",
    meta: [
      `${dayLabel(experience.startsAt)} à ${hm(experience.startsAt)}`,
      `${money(experience.priceMad)} par personne`,
      experience.prepayPercent === 100
        ? "prépaiement intégral"
        : experience.prepayPercent > 0
          ? `acompte ${experience.prepayPercent} %`
          : "sans acompte",
      experience.addons.length
        ? `${experience.addons.length} options`
        : "sans option",
    ].join(" · "),
    badges: [{ label: status.label, tone: status.tone }],
    facets: { status: experience.status },
    progress: {
      value: experience.seatsSold,
      max: Math.max(1, experience.capacity),
      tone: "violet",
    },
    progressCaption: `${experience.seatsSold} / ${experience.capacity} places · ${checkedIn} arrivés`,
    trailing: { label: "Recette", metric: { value: experience.revenueMad, format: MAD } },
    detail: {
      title: experience.title,
      subtitle: `${dayLabel(experience.startsAt)} · ${experience.seatsSold} / ${experience.capacity} places`,
      badges: [{ label: status.label, tone: status.tone }],
      sections: [
        {
          label: "Vente",
          items: [
            { label: "Prix", metric: { value: experience.priceMad, format: MAD } },
            { label: "Places vendues", metric: { value: experience.seatsSold, format: COUNT } },
            { label: "Recette", metric: { value: experience.revenueMad, format: MAD } },
            {
              label: "Prépaiement",
              metric: { value: experience.prepayPercent, format: PERCENT },
            },
          ],
        },
        ...(experience.addons.length
          ? [
              {
                label: "Options",
                items: experience.addons.map((a) => ({
                  label: a.label,
                  metric: { value: a.priceMad, format: MAD },
                })),
              },
            ]
          : []),
      ],
      notes: [
        { label: "Description", text: experience.description, icon: "note" },
        {
          label: "Conditions d'annulation",
          text: experience.cancellationTerms,
          icon: "info",
        },
      ],
      actions: [
        {
          action: {
            kind: "command",
            command: "experience.guests",
            payload: { id: experience.id },
            label: "Gérer les participants",
            icon: "users",
          },
          variant: "secondary",
        },
        {
          action: {
            kind: "link",
            href: `${restaurantHref("check-in")}?experience=${experience.id}`,
            label: "Scanner les billets",
            icon: "scan",
          },
          variant: "primary",
        },
      ],
    },
    menu: [
      {
        id: "edit",
        label: "Modifier",
        action: {
          kind: "command",
          command: "experience.edit",
          payload: { id: experience.id },
        },
      },
      ...(experience.status === "brouillon"
        ? [
            {
              id: "publish",
              label: "Publier",
              action: {
                kind: "command" as const,
                command: "experience.status",
                payload: { id: experience.id, status: "publie" },
              },
            },
          ]
        : []),
      {
        id: "guests",
        label: "Gérer les participants",
        action: {
          kind: "command",
          command: "experience.guests",
          payload: { id: experience.id },
        },
      },
      {
        id: "export",
        label: "Exporter les ventes",
        action: {
          kind: "command",
          command: "experience.export",
          payload: { id: experience.id },
        },
      },
    ],
  };
}
