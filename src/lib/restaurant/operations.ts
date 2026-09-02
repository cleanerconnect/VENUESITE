// Analytics, visibility and availability screens.
//
// All three read Business Service slices rather than the live service
// payload, so they live apart from screens.ts — same spec vocabulary,
// different source.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Block, ScreenSpec } from "@/lib/dashboard/spec";
import type {
  AnalyticsPeriod,
  VenueAnalytics,
  VenueAvailability,
  VisibilityMetrics,
} from "@/lib/types/business";
import { ANALYTICS_PERIOD } from "@/lib/types/business";
import { restaurantHref } from "./slugs";
import { COUNT, MAD } from "@/lib/dashboard/formats";


const PCT = { kind: "percent" as const, decimals: 1 };

const WEEKDAYS = [
  "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche",
];

// ── Analytics ────────────────────────────────────────────────

export function buildAnalyticsScreen(
  analytics: VenueAnalytics | undefined,
  period: AnalyticsPeriod,
): ScreenSpec {
  if (!analytics) {
    return {
      slug: "analytique",
      title: "Analytique",
      blocks: [
        {
          id: "unavailable",
          type: "entity-list",
          heading: "Analytique",
          rows: [],
          empty: {
            title: "Données indisponibles",
            body: "Le service d'analytique n'a pas répondu. Réessayez dans un instant.",
            icon: "gauge",
          },
        },
      ],
    };
  }

  return {
    slug: "analytique",
    title: "Analytique",
    subtitle: ANALYTICS_PERIOD[period],
    blocks: [
      {
        id: "period-links",
        type: "group",
        heading: "Période",
        headingAction: {
          kind: "link",
          label: "Exporter →",
          href: `${restaurantHref("analytique")}?p=${period}&export=1`,
        },
        children: [
          {
            id: "period-row",
            type: "kpi-grid",
            columns: 4,
            tiles: (Object.keys(ANALYTICS_PERIOD) as AnalyticsPeriod[]).map((p) => ({
              id: `p-${p}`,
              label: ANALYTICS_PERIOD[p],
              tone: p === period ? "peach" : "surface",
              metric: { value: p === period ? "Sélectionnée" : "Voir", animate: false },
              action: {
                kind: "link",
                label: ANALYTICS_PERIOD[p],
                href: `${restaurantHref("analytique")}?p=${p}`,
              },
            })),
          },
        ],
      },
      {
        id: "analytics-kpis",
        type: "kpi-grid",
        columns: 4,
        tiles: [
          {
            id: "occupancy",
            label: "Taux d'occupation",
            tone: "sand",
            icon: "gauge",
            metric: { value: analytics.occupancyRate, format: { kind: "percent" }, animate: true },
            delta: { value: analytics.occupancyDeltaPct, period: "vs période précédente" },
          },
          {
            id: "revenue",
            label: "Revenu estimé",
            tone: "surface",
            icon: "coins",
            metric: { value: analytics.estimatedRevenueMad, format: MAD, animate: true },
            delta: { value: analytics.revenueDeltaPct, period: "vs période précédente" },
          },
          {
            id: "no-show",
            label: "Taux d'absence",
            tone: "surface",
            icon: "user-x",
            metric: { value: analytics.noShowRate, format: PCT, animate: true },
            // Down is good here, so the delta chip flips its colour.
            delta: {
              value: analytics.noShowDeltaPct,
              period: "vs période précédente",
              invert: true,
            },
          },
          {
            id: "covers",
            label: "Couverts servis",
            tone: "sage",
            icon: "users",
            metric: { value: analytics.coversServed, format: COUNT, animate: true },
            delta: { value: analytics.coversDeltaPct, period: "vs période précédente" },
          },
        ],
      },
      {
        id: "covers-chart",
        type: "chart",
        heading: "Couverts servis",
        subheading: ANALYTICS_PERIOD[period],
        variant: "area",
        series: analytics.series.map((p) => ({ label: p.label, value: p.covers })),
        valueFormat: COUNT,
      },
      {
        id: "revenue-chart",
        type: "chart",
        heading: "Revenu estimé",
        subheading: ANALYTICS_PERIOD[period],
        variant: "bar",
        series: analytics.series.map((p) => ({ label: p.label, value: p.revenueMad })),
        valueFormat: MAD,
      },
      {
        id: "no-show-chart",
        type: "chart",
        heading: "Absences",
        subheading: "Réservations où le client n'est jamais venu",
        variant: "bar",
        series: analytics.series.map((p) => ({ label: p.label, value: p.noShows })),
        valueFormat: COUNT,
      },
    ],
  };
}

// ── Visibility ───────────────────────────────────────────────

export function buildVisibilityScreen(
  metrics: VisibilityMetrics | undefined,
  period: AnalyticsPeriod,
): ScreenSpec {
  if (!metrics) {
    return {
      slug: "visibilite",
      title: "Visibilité",
      blocks: [
        {
          id: "unavailable",
          type: "entity-list",
          heading: "Visibilité",
          rows: [],
          empty: {
            title: "Données indisponibles",
            body: "Les métriques de visibilité n'ont pas répondu.",
            icon: "megaphone",
          },
        },
      ],
    };
  }

  const blocks: Block[] = [
    {
      id: "boost-hero",
      type: "hero",
      live: metrics.boostActive,
      eyebrow: metrics.boostActive ? "BOOST ACTIF" : "AUCUN BOOST EN COURS",
      title: metrics.boostActive
        ? "Votre établissement est mis en avant"
        : "Mettre votre établissement en avant",
      subtitle: metrics.boostEndsAt
        ? `Jusqu'au ${format(new Date(metrics.boostEndsAt), "d MMMM", { locale: fr })}`
        : undefined,
      stats: [
        { label: "Impressions", metric: { value: metrics.impressions, format: COUNT, animate: true }, accent: true },
        { label: "Vues de la fiche", metric: { value: metrics.listingViews, format: COUNT, animate: true } },
        { label: "Portée", metric: { value: metrics.reach, format: COUNT, animate: true } },
      ],
      footnote: {
        text: `${metrics.conversionPct} % des vues deviennent une demande de réservation.`,
      },
    },
    {
      id: "visibility-kpis",
      type: "kpi-grid",
      columns: 3,
      tiles: [
        {
          id: "impressions",
          label: "Impressions",
          tone: "sand",
          icon: "megaphone",
          metric: { value: metrics.impressions, format: COUNT, animate: true },
          delta: { value: metrics.impressionsDeltaPct, period: "vs période précédente" },
        },
        {
          id: "views",
          label: "Vues de la fiche",
          tone: "surface",
          icon: "sparkles",
          metric: { value: metrics.listingViews, format: COUNT, animate: true },
          delta: { value: metrics.listingViewsDeltaPct, period: "vs période précédente" },
        },
        {
          id: "conversion",
          label: "Conversion",
          tone: "sage",
          icon: "percent",
          metric: { value: metrics.conversionPct, format: PCT, animate: true },
          hint: "Vues devenues une demande de réservation",
        },
      ],
    },
    {
      id: "boost-actions",
      type: "nudge",
      eyebrow: "Boost",
      icon: "megaphone",
      headline: metrics.boostActive ? "Boost en cours." : "Aucun boost en cours.",
      body: metrics.boostActive
        ? "Votre fiche apparaît en tête du fil pour les utilisateurs de votre ville. Vous pouvez l'arrêter à tout moment."
        : "Un boost place votre fiche en tête du fil de l'application pour les utilisateurs de votre ville.",
      actions: [
        {
          action: {
            kind: "command",
            label: metrics.boostActive ? "Arrêter le boost" : "Lancer un boost",
            command: metrics.boostActive ? "boost.stop" : "boost.start",
          },
          allow: ["owner", "admin"],
        },
      ],
    },
  ];

  return {
    slug: "visibilite",
    title: "Visibilité",
    subtitle: ANALYTICS_PERIOD[period],
    blocks,
  };
}

// ── Availability ─────────────────────────────────────────────

export function buildAvailabilityScreen(
  availability: VenueAvailability | undefined,
): ScreenSpec {
  if (!availability) {
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
            body: "Les disponibilités n'ont pas pu être chargées.",
            icon: "calendar-clock",
          },
        },
      ],
    };
  }

  const openSlots = availability.slots.filter((s) => s.enabled);
  const weeklyCapacity = openSlots.reduce((n, s) => n + s.capacity, 0);

  return {
    slug: "disponibilites",
    title: "Disponibilités",
    subtitle:
      "Toute modification est répercutée immédiatement sur ce que l'application propose à la réservation.",
    blocks: [
      {
        id: "availability-kpis",
        type: "kpi-grid",
        columns: 3,
        tiles: [
          {
            id: "open-slots",
            label: "Créneaux ouverts",
            tone: "sand",
            icon: "calendar-clock",
            metric: {
              value: openSlots.length,
              format: COUNT,
              suffix: `/ ${availability.slots.length}`,
              animate: true,
            },
          },
          {
            id: "weekly-capacity",
            label: "Capacité hebdomadaire",
            tone: "surface",
            icon: "users",
            metric: { value: weeklyCapacity, format: COUNT, animate: true },
            hint: "Couverts réservables sur une semaine type",
          },
          {
            id: "closures",
            label: "Fermetures programmées",
            tone: availability.closures.length ? "peach" : "surface",
            icon: "ban",
            metric: { value: availability.closures.length, format: COUNT, animate: true },
          },
        ],
      },
      {
        id: "slots",
        type: "entity-list",
        heading: "Créneaux d'ouverture",
        rows: availability.slots.map((slot) => ({
          id: slot.id,
          title: `${WEEKDAYS[slot.weekday - 1]} · ${slot.opensAt} – ${slot.closesAt}`,
          icon: slot.enabled ? "calendar-clock" : "ban",
          meta: `${slot.capacity} couverts réservables`,
          badges: [
            slot.enabled
              ? { label: "OUVERT", tone: "success", dot: true }
              : { label: "FERMÉ", tone: "muted", dot: true },
          ],
          menu: [
            {
              id: "toggle",
              label: slot.enabled ? "Fermer ce créneau" : "Ouvrir ce créneau",
              action: {
                kind: "command",
                command: "availability.toggleSlot",
                payload: { id: slot.id },
              },
              destructive: slot.enabled,
            },
          ],
        })),
        empty: {
          title: "Aucun créneau",
          body: "Ajoutez un créneau pour ouvrir les réservations.",
          icon: "calendar-clock",
        },
      },
      {
        id: "closures",
        type: "entity-list",
        heading: "Jours de fermeture",
        rows: availability.closures.map((c) => ({
          id: c.id,
          title: format(new Date(c.date), "EEEE d MMMM yyyy", { locale: fr }),
          icon: "ban",
          meta: c.reason,
          badges: [{ label: "FERMÉ", tone: "danger", dot: true }],
          menu: [
            {
              id: "remove",
              label: "Retirer cette fermeture",
              destructive: true,
              action: {
                kind: "command",
                command: "availability.removeClosure",
                payload: { id: c.id },
              },
            },
          ],
        })),
        empty: {
          title: "Aucune fermeture programmée",
          body: "L'établissement suit ses horaires habituels.",
          icon: "calendar",
        },
      },
    ],
  };
}
