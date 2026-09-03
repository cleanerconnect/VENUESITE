// CRM screens.
//
// Two screens' worth of spec, kept out of screens.ts because the customer
// base is a different data source (the Business Service's customer
// records) from the service payload every other screen reads.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  Badge,
  DetailSpec,
  EntityRow,
  KpiTile,
  ScreenSpec,
} from "@/lib/dashboard/spec";
import type { GuestGraph } from "@/lib/types/venue-operations";
import { initialsOf } from "./format";
import type { Customer, LoyaltyTier } from "@/lib/types/business";
import { CUSTOMER_SEGMENT, LOYALTY_TIER } from "@/lib/types/business";
import type { GuestReview } from "@/lib/types/restaurant";
import { COUNT, MAD } from "@/lib/dashboard/formats";



const LOYALTY_TONE: Record<LoyaltyTier, Badge["tone"]> = {
  nouveau: "muted",
  regulier: "info",
  fidele: "violet",
  ambassadeur: "success",
};

const dateFR = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });

/** >= 0.3 is the same threshold the booking rows badge on. */
function riskBadge(risk: number): Badge | null {
  if (risk < 0.3) return null;
  return {
    label: risk >= 0.5 ? "Risque élevé" : "Risque d'absence",
    tone: risk >= 0.5 ? "danger" : "warning",
    icon: "alert",
  };
}

export function buildCustomersScreen(
  customers: Customer[],
  reviews: GuestReview[],
  graph: GuestGraph,
  spendByCustomer: Record<string, number>,
): ScreenSpec {
  const loyal = customers.filter(
    (c) => c.visitCount >= LOYALTY_TIER.fidele.minVisits,
  );
  const atRisk = customers.filter((c) => c.noShowRisk >= 0.3);
  // Spend comes from Lyfe Pay alone. An empty map means no source, and
  // every spend tile and column on this screen disappears rather than
  // showing a base that has apparently never spent anything.
  const hasSpend = Object.keys(spendByCustomer).length > 0;
  const totalSpend = Object.values(spendByCustomer).reduce((n, v) => n + v, 0);

  const tagLabels = new Map(graph.tags.map((t) => [t.id, t.label]));
  const thisMonth = new Date().getMonth();

  return {
    slug: "clients",
    title: "Clients",
    subtitle:
      "Base alimentée automatiquement par les réservations — aucune saisie manuelle.",
    blocks: [
      {
        id: "crm-kpis",
        type: "kpi-grid",
        columns: 4,
        tiles: [
          {
            id: "total",
            label: "Clients connus",
            tone: "sand",
            icon: "users",
            metric: { value: customers.length, format: COUNT, animate: true },
            hint: "Créés à la première réservation confirmée",
          },
          {
            id: "loyal",
            label: "Clients fidèles",
            tone: "surface",
            icon: "star",
            metric: { value: loyal.length, format: COUNT, animate: true },
            hint: `${LOYALTY_TIER.fidele.minVisits} visites ou plus`,
          },
          ...(hasSpend
            ? ([
                {
                  id: "spend",
                  label: "Chiffre cumulé",
                  tone: "sage",
                  icon: "coins",
                  metric: { value: totalSpend, format: MAD, animate: true },
                  hint: "Transactions Lyfe Pay rattachées à un client.",
                },
              ] satisfies KpiTile[])
            : []),
          {
            id: "risk",
            label: "À risque d'absence",
            tone: atRisk.length > 0 ? "rose" : "surface",
            icon: "user-x",
            metric: { value: atRisk.length, format: COUNT, animate: true },
            hint: atRisk.length
              ? "Demander un acompte à la prochaine réservation"
              : "Aucun risque détecté",
          },
        ],
      },
      {
        id: "customer-list",
        type: "entity-list",
        heading: "Base clients",
        headingAction: {
          kind: "command",
          label: "Exporter la sélection",
          command: "customers.export",
          icon: "file",
        },
        // Segments are derived per customer, so the tabs match against the
        // segment facet rather than recomputing the rule here.
        tabs: [
          { id: "all", label: CUSTOMER_SEGMENT.all },
          { id: "vip", label: "VIP", match: { facet: "vip", values: ["yes"] } },
          { id: "loyal", label: "Habitués", match: { facet: "loyal", values: ["yes"] } },
          { id: "new", label: "Nouveaux", match: { facet: "new", values: ["yes"] } },
          { id: "at_risk", label: "À risque no-show", match: { facet: "at_risk", values: ["yes"] } },
          { id: "lapsed", label: "Inactifs 90 jours", match: { facet: "lapsed", values: ["yes"] } },
          {
            id: "birthday",
            label: "Anniversaire ce mois",
            match: { facet: "birthday", values: ["yes"] },
          },
        ],
        search: { placeholder: "Rechercher un nom, un téléphone, un e-mail…" },
        sorts: [
          { id: "recent", label: "Dernière visite", key: "lastVisit", direction: "desc" },
          { id: "visits", label: "Nombre de visites", key: "visits", direction: "desc" },
          { id: "spend", label: "Dépense moyenne", key: "spend", direction: "desc" },
          { id: "risk", label: "Risque d'absence", key: "risk", direction: "desc" },
          { id: "name", label: "Nom", key: "name", direction: "asc" },
        ],
        rows: customers.map((c) =>
          customerRow(c, reviews, graph.tagsByCustomer[c.id] ?? [], tagLabels, spendByCustomer[c.id], thisMonth),
        ),
        empty: {
          title: "Aucun client",
          body: "La base se remplit dès la première réservation confirmée.",
          icon: "users",
        },
        noMatches: {
          title: "Aucun client",
          body: "Aucun client ne correspond à ce segment.",
        },
      },
      // Bulk work, declared rather than hidden behind a selection mode
      // nobody discovers. Each hands the current filter to the screen
      // that does the work.
      {
        id: "bulk",
        type: "settings",
        heading: "Actions groupées",
        subheading:
          "S'appliquent à la sélection courante de la liste, filtres et recherche compris.",
        rows: [
          {
            id: "bulk-tag",
            label: "Ajouter une étiquette en masse",
            hint: "Les étiquettes se définissent dans Tags et segments.",
            control: {
              kind: "select",
              value: graph.tags.find((t) => !t.archived)?.id ?? "",
              options: graph.tags
                .filter((t) => !t.archived)
                .map((t) => ({ value: t.id, label: t.label })),
            },
            command: "customers.bulkTag",
            allow: ["owner", "admin"],
          },
          {
            id: "bulk-export",
            label: "Exporter en CSV",
            hint: "Les clients ayant refusé le démarchage sont exclus de l'export.",
            control: { kind: "readonly", value: "Exporter" },
            command: "customers.export",
          },
          {
            id: "bulk-campaign",
            label: "Créer une campagne à partir de la sélection",
            control: {
              kind: "readonly",
              value: "Ouvrir Campagnes",
              href: "/restaurant/campagnes",
            },
            command: "customers.campaign",
          },
          {
            id: "bulk-merge",
            label: "Fusionner des doublons",
            hint: "Deux fiches au même numéro sont proposées à la fusion.",
            control: { kind: "readonly", value: "Rechercher les doublons" },
            command: "customers.merge",
            allow: ["owner", "admin"],
          },
        ],
      },
    ],
  };
}

export function customerRow(
  customer: Customer,
  reviews: GuestReview[],
  tagIds: string[] = [],
  tagLabels: Map<string, string> = new Map(),
  spendMad?: number,
  currentMonth = new Date().getMonth(),
): EntityRow {
  const loyalty = LOYALTY_TIER[customer.loyaltyTier];
  const labels = tagIds.map((id) => tagLabels.get(id) ?? "").filter(Boolean);
  const badges: Badge[] = [
    { label: loyalty.label, tone: LOYALTY_TONE[customer.loyaltyTier] },
    ...labels.map((label) => ({ label: label.toUpperCase(), tone: "violet" as const })),
  ];
  const risk = riskBadge(customer.noShowRisk);
  if (risk) badges.push(risk);
  if (customer.optedOutOfMarketing) {
    badges.push({ label: "Sans démarchage", tone: "muted" });
  }

  const meta = [
    customer.visitCount > 0
      ? `${customer.visitCount} visite${customer.visitCount > 1 ? "s" : ""}`
      : "Aucune visite",
    customer.lastVisitAt ? `dernière le ${dateFR(customer.lastVisitAt)}` : null,
    customer.phone,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: customer.id,
    title: customer.fullName,
    initials: initialsOf(customer.fullName),
    meta,
    badges,
    signal: customer.preferences.length
      ? { text: customer.preferences.join(" · "), icon: "note" }
      : undefined,
    // Absent, not zero: a guest whose spend nobody can see has not
    // spent nothing.
    trailing:
      spendMad === undefined
        ? undefined
        : { label: "Dépensé", metric: { value: spendMad, format: MAD } },
    facets: {
      new: customer.segments.includes("new") ? "yes" : "no",
      returning: customer.segments.includes("returning") ? "yes" : "no",
      loyal: customer.segments.includes("loyal") ? "yes" : "no",
      at_risk: customer.segments.includes("at_risk") ? "yes" : "no",
      lapsed: customer.segments.includes("lapsed") ? "yes" : "no",
      vip: labels.some((l) => l.toLowerCase().includes("vip")) ? "yes" : "no",
      birthday: customer.preferences.some((p) =>
        p.toLowerCase().includes(MONTHS[currentMonth]),
      )
        ? "yes"
        : "no",
    },
    sortKeys: {
      lastVisit: customer.lastVisitAt ? new Date(customer.lastVisitAt).getTime() : 0,
      visits: customer.visitCount,
      spend: customer.averageSpendMad,
      risk: customer.noShowRisk,
      name: customer.fullName,
    },
    keywords: [customer.phone, customer.email, ...customer.preferences]
      .filter(Boolean)
      .join(" "),
    href: `/restaurant/clients/${customer.id}`,
    detail: customerDetail(customer, reviews, spendMad),
  };
}

/**
 * The profile the brief specifies, in its order: identity and contact,
 * visits and last visit, average spend, recurring preferences, reviews
 * left, loyalty tier, and no-show history with its risk indicator.
 *
 * Openable from the customer list and from a booking in progress — both
 * call this, so the two can never drift apart.
 */
export function customerDetail(
  customer: Customer,
  reviews: GuestReview[],
  spendMad?: number,
): DetailSpec {
  const theirReviews = reviews.filter((r) => customer.reviewIds.includes(r.id));
  const loyalty = LOYALTY_TIER[customer.loyaltyTier];
  const risk = riskBadge(customer.noShowRisk);

  return {
    title: customer.fullName,
    subtitle: customer.lastVisitAt
      ? `Client depuis le ${dateFR(customer.firstSeenAt)} · dernière visite le ${dateFR(customer.lastVisitAt)}`
      : `Ajouté le ${dateFR(customer.firstSeenAt)} · pas encore venu`,
    badges: [
      { label: loyalty.label, tone: LOYALTY_TONE[customer.loyaltyTier] },
      ...(risk ? [risk] : []),
    ],
    sections: [
      {
        label: "Contact",
        items: [
          { label: "Téléphone", metric: { value: customer.phone } },
          { label: "E-mail", metric: { value: customer.email ?? "Non renseigné" } },
          {
            label: "Démarchage",
            metric: { value: customer.optedOutOfMarketing ? "Refusé" : "Accepté" },
          },
        ],
      },
      {
        label: "Fréquentation",
        items: [
          { label: "Visites", metric: { value: customer.visitCount, format: COUNT } },
          {
            label: "Dernière visite",
            metric: { value: customer.lastVisitAt ? dateFR(customer.lastVisitAt) : "—" },
          },
          // Spend only where Lyfe Pay says so.
          ...(spendMad === undefined
            ? []
            : [{ label: "Total dépensé", metric: { value: spendMad, format: MAD } }]),
          { label: "Palier fidélité", metric: { value: loyalty.label } },
        ],
      },
      {
        label: "Absences",
        items: [
          {
            label: "No-shows enregistrés",
            metric: { value: customer.noShowHistory.length, format: COUNT },
          },
          {
            label: "Indicateur de risque",
            metric: {
              value: Math.round(customer.noShowRisk * 100),
              format: { kind: "percent" },
            },
          },
          ...customer.noShowHistory.slice(0, 3).map((n) => ({
            label: dateFR(n.at),
            metric: { value: `${n.partySize} couverts` },
          })),
        ],
      },
      ...(theirReviews.length
        ? [
            {
              label: "Avis laissés",
              items: theirReviews.map((r) => ({
                label: `${dateFR(r.at)} · ${r.rating}/5`,
                metric: { value: r.channel.toUpperCase() },
              })),
            },
          ]
        : []),
    ],
    notes: [
      ...(customer.preferences.length
        ? [
            {
              label: "Préférences et demandes",
              text: customer.preferences.join(" · "),
              icon: "note" as const,
            },
          ]
        : []),
      ...theirReviews.slice(0, 2).map((r) => ({
        label: `Avis ${r.rating}/5`,
        text: r.comment,
        icon: "message-square" as const,
      })),
    ],
    actions: [
      {
        action: {
          kind: "command",
          label: "Appeler",
          command: "customer.call",
          payload: { phone: customer.phone },
          icon: "phone",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "link",
          label: "Ouvrir la fiche",
          href: `/restaurant/clients/${customer.id}`,
          icon: "users",
        },
        variant: "primary",
      },
    ],
  };
}

/** Lowercase French months, for the birthday-this-month segment. */
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
