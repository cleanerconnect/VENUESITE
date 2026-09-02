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
  ScreenSpec,
} from "@/lib/dashboard/spec";
import type { Customer, LoyaltyTier } from "@/lib/types/business";
import { CUSTOMER_SEGMENT, LOYALTY_TIER } from "@/lib/types/business";
import type { GuestReview } from "@/lib/types/restaurant";

const MAD = { kind: "currency" as const, currency: "MAD" };
const COUNT = { kind: "number" as const };

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
): ScreenSpec {
  const loyal = customers.filter(
    (c) => c.visitCount >= LOYALTY_TIER.fidele.minVisits,
  );
  const atRisk = customers.filter((c) => c.noShowRisk >= 0.3);
  const totalSpend = customers.reduce((n, c) => n + c.totalSpendMad, 0);

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
          {
            id: "spend",
            label: "Chiffre cumulé",
            tone: "sage",
            icon: "coins",
            metric: { value: totalSpend, format: MAD, animate: true },
          },
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
          label: "Exporter CSV",
          command: "customers.export",
          icon: "file",
        },
        // Segments are derived per customer, so the tabs match against the
        // segment facet rather than recomputing the rule here.
        tabs: [
          { id: "all", label: CUSTOMER_SEGMENT.all },
          { id: "new", label: CUSTOMER_SEGMENT.new, match: { facet: "new", values: ["yes"] } },
          { id: "returning", label: CUSTOMER_SEGMENT.returning, match: { facet: "returning", values: ["yes"] } },
          { id: "loyal", label: CUSTOMER_SEGMENT.loyal, match: { facet: "loyal", values: ["yes"] } },
          { id: "at_risk", label: CUSTOMER_SEGMENT.at_risk, match: { facet: "at_risk", values: ["yes"] } },
          { id: "lapsed", label: CUSTOMER_SEGMENT.lapsed, match: { facet: "lapsed", values: ["yes"] } },
        ],
        search: { placeholder: "Rechercher un nom, un téléphone, un e-mail…" },
        sorts: [
          { id: "recent", label: "Dernière visite", key: "lastVisit", direction: "desc" },
          { id: "visits", label: "Nombre de visites", key: "visits", direction: "desc" },
          { id: "spend", label: "Dépense moyenne", key: "spend", direction: "desc" },
          { id: "risk", label: "Risque d'absence", key: "risk", direction: "desc" },
          { id: "name", label: "Nom", key: "name", direction: "asc" },
        ],
        rows: customers.map((c) => customerRow(c, reviews)),
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
    ],
  };
}

export function customerRow(
  customer: Customer,
  reviews: GuestReview[],
): EntityRow {
  const loyalty = LOYALTY_TIER[customer.loyaltyTier];
  const badges: Badge[] = [
    { label: loyalty.label, tone: LOYALTY_TONE[customer.loyaltyTier] },
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
    trailing: {
      label: "Panier moyen",
      metric: { value: customer.averageSpendMad, format: MAD },
    },
    facets: {
      new: customer.segments.includes("new") ? "yes" : "no",
      returning: customer.segments.includes("returning") ? "yes" : "no",
      loyal: customer.segments.includes("loyal") ? "yes" : "no",
      at_risk: customer.segments.includes("at_risk") ? "yes" : "no",
      lapsed: customer.segments.includes("lapsed") ? "yes" : "no",
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
    detail: customerDetail(customer, reviews),
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
          { label: "Panier moyen", metric: { value: customer.averageSpendMad, format: MAD } },
          { label: "Total dépensé", metric: { value: customer.totalSpendMad, format: MAD } },
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
    ],
  };
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}
