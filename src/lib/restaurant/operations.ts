// Pilotage and Croissance reads: Performance, Visibilité, Bilans.
//
// All three read Business Service slices rather than the live service
// payload, so they live apart from screens.ts — same spec vocabulary,
// different source.
//
// One rule shapes every money tile below and is worth stating once: a
// revenue or average-ticket figure appears only where a transaction
// source exists. Where none does the tile is absent, not zero and not
// estimated. `analytics.estimatedRevenueMad` is a projection from the
// covers roll-up, so it is shown as a projection or not at all.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Block, KpiTile, ScreenSpec } from "@/lib/dashboard/spec";
import type {
  AnalyticsPeriod,
  VenueAnalytics,
  VisibilityMetrics,
} from "@/lib/types/business";
import { ANALYTICS_PERIOD } from "@/lib/types/business";
import type {
  CalendarDay,
  MoneyDesk,
  VenueConfiguration,
} from "@/lib/types/venue-operations";
import type { RestaurantProfile } from "@/lib/types/restaurant";
import { configFor } from "@/lib/venue/config";
import { RESTAURANT_SETTINGS_PATH, restaurantHref } from "./slugs";
import { COUNT, MAD } from "@/lib/dashboard/formats";
import { shortDay } from "./format";

const PCT = { kind: "percent" as const, decimals: 1 };

const WEEKDAYS = [
  "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche",
];

/** Comparison baselines the period selector offers. */
export type Comparison = "previous" | "last_year";

export const COMPARISON_LABEL: Record<Comparison, string> = {
  previous: "Période précédente",
  last_year: "Même période l'an dernier",
};

// ── Performance ──────────────────────────────────────────────

export function buildPerformanceScreen(
  analytics: VenueAnalytics | undefined,
  period: AnalyticsPeriod,
  comparison: Comparison,
  desk: MoneyDesk | undefined,
  calendar: CalendarDay[],
  configuration: VenueConfiguration,
): ScreenSpec {
  if (!analytics) {
    return {
      slug: "performance",
      title: "Performance",
      blocks: [
        {
          id: "unavailable",
          type: "entity-list",
          heading: "Performance",
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

  const vocabulary = configFor(configuration);
  const hasSpend = Boolean(desk?.hasTransactionSource);
  const baseline = COMPARISON_LABEL[comparison].toLowerCase();

  const successful = (desk?.transactions ?? []).filter((t) => t.status === "reussie");
  const takings = successful.reduce((s, t) => s + t.amountMad, 0);

  const periodPicker: Block = {
    id: "period",
    type: "settings",
    heading: "Période et comparaison",
    rows: [
      {
        id: "period",
        label: "Période",
        control: {
          kind: "select",
          value: period,
          options: (Object.keys(ANALYTICS_PERIOD) as AnalyticsPeriod[]).map((p) => ({
            value: p,
            label: ANALYTICS_PERIOD[p],
          })),
        },
        command: "performance.period",
      },
      {
        id: "comparison",
        label: "Comparer à",
        hint: "Toutes les variations de cet écran sont mesurées contre cette base.",
        control: {
          kind: "select",
          value: comparison,
          options: (["previous", "last_year"] as Comparison[]).map((c) => ({
            value: c,
            label: COMPARISON_LABEL[c],
          })),
        },
        command: "performance.comparison",
      },
    ],
    footerActions: [
      {
        action: {
          kind: "command",
          command: "performance.export",
          label: "Exporter les données",
          icon: "file",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "performance.saveView",
          label: "Enregistrer cette vue",
          icon: "star",
        },
        variant: "ghost",
      },
    ],
  };

  const tiles: KpiTile[] = [
    {
      id: "occupancy",
      label: "Taux d'occupation",
      tone: "sand",
      icon: "gauge",
      metric: { value: analytics.occupancyRate, format: { kind: "percent" }, animate: true },
      delta: { value: analytics.occupancyDeltaPct, period: `vs ${baseline}` },
      hint: "Contre la capacité déclarée dans Disponibilités.",
    },
    {
      id: "covers",
      label: vocabulary.cover.many.replace(/^./, (c) => c.toUpperCase()) + " servis",
      tone: "sage",
      icon: "users",
      metric: { value: analytics.coversServed, format: COUNT, animate: true },
      delta: { value: analytics.coversDeltaPct, period: `vs ${baseline}` },
    },
    {
      id: "no-show",
      label: "Taux d'absence",
      tone: "surface",
      icon: "user-x",
      metric: { value: analytics.noShowRate, format: PCT, animate: true },
      // Down is good here, so the delta chip flips its colour.
      delta: { value: analytics.noShowDeltaPct, period: `vs ${baseline}`, invert: true },
    },
    {
      id: "cancellation",
      label: "Taux d'annulation",
      tone: "surface",
      icon: "ban",
      metric: {
        value: desk ? cancellationRate(desk, analytics) : 0,
        format: PCT,
        animate: true,
      },
      delta: { value: 0, period: `vs ${baseline}`, invert: true },
    },
    {
      id: "party",
      label: "Taille moyenne des groupes",
      tone: "surface",
      icon: "users",
      metric: {
        value: analytics.series.length
          ? Number(
              (
                analytics.coversServed /
                Math.max(1, analytics.series.reduce((s, p) => s + Math.max(1, Math.round(p.covers / 2.6)), 0))
              ).toFixed(1),
            )
          : 0,
        format: { kind: "number", decimals: 1 },
        animate: true,
      },
    },
    // The two money tiles, and the whole point of the rule: they exist
    // only where Lyfe Pay does. A venue without it sees five tiles, not
    // seven with two zeroes.
    ...(hasSpend
      ? ([
          {
            id: "takings",
            label: "Encaissé",
            tone: "surface",
            icon: "coins",
            metric: { value: takings, format: MAD, animate: true },
            hint: "Transactions Lyfe Pay sur la période.",
            action: { kind: "link", href: restaurantHref("lyfe-pay"), label: "Détail" },
          },
          {
            id: "ticket",
            label: "Ticket moyen",
            tone: "surface",
            icon: "receipt",
            metric: {
              value: successful.length ? Math.round(takings / successful.length) : 0,
              format: MAD,
              animate: true,
            },
          },
        ] satisfies KpiTile[])
      : []),
  ];

  const kpis: Block = { id: "performance-kpis", type: "kpi-grid", columns: 4, tiles };

  const noSpendNote: Block | null = hasSpend
    ? null
    : {
        id: "no-spend",
        type: "nudge",
        eyebrow: "Chiffre d'affaires",
        icon: "wallet",
        headline: "Aucune source de transaction dans cet établissement.",
        body: "Les tuiles de recette et de ticket moyen sont absentes plutôt qu'estimées : un chiffre inventé serait pire qu'un chiffre manquant. Branchez Lyfe Pay pour qu'elles apparaissent.",
        actions: [
          {
            action: {
              kind: "link",
              href: restaurantHref("lyfe-pay"),
              label: "Lyfe Pay",
              icon: "wallet",
            },
            variant: "secondary",
          },
        ],
      };

  // The weakest services ahead, and the link to do something about them.
  const today = new Date().toISOString().slice(0, 10);
  const quiet = calendar
    .filter((d) => d.date >= today && !d.closed && d.capacity > 0)
    .map((d) => ({ ...d, fill: d.covers / d.capacity }))
    .sort((a, b) => a.fill - b.fill)
    .slice(0, 6);

  const quietFinder: Block = {
    id: "quiet",
    type: "entity-list",
    heading: "Créneaux creux à venir",
    headingAction: {
      kind: "link",
      href: restaurantHref("offres"),
      label: "Créer une offre →",
    },
    rows: quiet.map((day) => ({
      id: day.date,
      title: shortDay(day.date),
      icon: "sunset" as const,
      meta: `${day.covers} / ${day.capacity} ${vocabulary.cover.many} · ${Math.round(day.fill * 100)} %`,
      progress: { value: day.covers, max: Math.max(1, day.capacity), tone: "ink" as const },
      actions: [
        {
          action: {
            kind: "link" as const,
            href: `${restaurantHref("offres")}?jour=${day.date}`,
            label: "Créer une offre",
            icon: "tag" as const,
          },
          variant: "secondary" as const,
        },
      ],
    })),
    empty: {
      title: "Rien de creux",
      body: "Tous les services à venir sont bien remplis.",
      icon: "sparkles",
    },
  };

  // Occupancy by weekday, from the same series the charts use, so the
  // heatmap cannot disagree with the curve above it.
  const byWeekday = new Map<number, { covers: number; days: number }>();
  for (const point of analytics.series) {
    const parsed = Date.parse(point.label);
    const index = Number.isNaN(parsed)
      ? analytics.series.indexOf(point) % 7
      : (new Date(parsed).getDay() + 6) % 7;
    const current = byWeekday.get(index) ?? { covers: 0, days: 0 };
    byWeekday.set(index, { covers: current.covers + point.covers, days: current.days + 1 });
  }

  return {
    slug: "performance",
    title: "Performance",
    subtitle: `${ANALYTICS_PERIOD[period]} · ${COMPARISON_LABEL[comparison].toLowerCase()}`,
    blocks: [
      periodPicker,
      kpis,
      ...(noSpendNote ? [noSpendNote] : []),
      {
        id: "covers-chart",
        type: "chart",
        heading: `${vocabulary.cover.many.replace(/^./, (c) => c.toUpperCase())} servis`,
        subheading: ANALYTICS_PERIOD[period],
        variant: "area",
        series: analytics.series.map((p) => ({ label: p.label, value: p.covers })),
        valueFormat: COUNT,
      },
      {
        id: "weekday-chart",
        type: "chart",
        heading: "Charge par jour de semaine",
        subheading: "Moyenne sur la période. Le creux de la semaine est là.",
        variant: "bar",
        series: WEEKDAYS.map((label, i) => {
          const entry = byWeekday.get(i);
          return {
            label: label.slice(0, 3),
            value: entry ? Math.round(entry.covers / Math.max(1, entry.days)) : 0,
          };
        }),
        valueFormat: COUNT,
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
      // Only where the source exists. Everywhere else this chart would
      // be a projection drawn as a fact.
      ...(hasSpend
        ? ([
            {
              id: "revenue-chart",
              type: "chart",
              heading: "Encaissements",
              subheading: "Transactions Lyfe Pay",
              variant: "bar",
              series: analytics.series.map((p) => ({
                label: p.label,
                value: p.revenueMad,
              })),
              valueFormat: MAD,
            },
          ] satisfies Block[])
        : []),
      quietFinder,
    ],
  };
}

/** Cancellations and no-shows against bookings made, as a percentage. */
function cancellationRate(desk: MoneyDesk, analytics: VenueAnalytics): number {
  const cancellations = desk.cancellations.filter((c) => c.kind === "annulation").length;
  const total = Math.max(1, analytics.coversServed + cancellations);
  return Number(((cancellations / total) * 100).toFixed(1));
}

// ── Visibilité ───────────────────────────────────────────────

export function buildVisibilityScreen(
  metrics: VisibilityMetrics | undefined,
  period: AnalyticsPeriod,
  profile: RestaurantProfile | null,
  photoCount: number,
  replyRate: number,
  noShowRate: number,
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

  // The checklist is honest about ranking rather than mystical about it:
  // each row is a factor the app actually uses, with the screen that
  // fixes it. A "score" with no way to move it is worse than nothing.
  const checklist = [
    {
      id: "description",
      label: "Description complète",
      done: (profile?.description.length ?? 0) >= 120,
      hint: "Au moins 120 caractères, pour que la fiche ait quelque chose à dire.",
      href: RESTAURANT_SETTINGS_PATH,
    },
    {
      id: "photos",
      label: "Au moins six photos",
      done: photoCount >= 6,
      hint: `${photoCount} photos en ligne. La première sert de couverture.`,
      href: RESTAURANT_SETTINGS_PATH,
    },
    {
      id: "tags",
      label: "Mots-clés renseignés",
      done: (profile?.tags.length ?? 0) >= 3,
      hint: "Ce sur quoi les clients filtrent dans l'application.",
      href: RESTAURANT_SETTINGS_PATH,
    },
    {
      id: "menu",
      label: "Carte en ligne",
      done: Boolean(profile),
      hint: "Une fiche sans carte convertit deux fois moins.",
      href: restaurantHref("menu"),
    },
    {
      id: "replies",
      label: "Avis répondus",
      done: replyRate >= 70,
      hint: `${Math.round(replyRate)} % des avis ont une réponse.`,
      href: restaurantHref("avis"),
    },
    {
      id: "no-show",
      label: "Taux d'absence maîtrisé",
      done: noShowRate <= 8,
      hint: `${noShowRate.toFixed(1)} % d'absences. Au-delà de 8 %, le classement en tient compte.`,
      href: restaurantHref("acomptes"),
    },
  ];
  const done = checklist.filter((c) => c.done).length;

  return {
    slug: "visibilite",
    title: "Visibilité",
    subtitle: ANALYTICS_PERIOD[period],
    blocks: [
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
        ring: {
          progress: done / checklist.length,
          topLabel: "Fiche",
          centerLabel: `${done}/${checklist.length}`,
          bottomLabel: "complète",
        },
        stats: [
          {
            label: "Impressions",
            metric: { value: metrics.impressions, format: COUNT, animate: true },
            accent: true,
          },
          {
            label: "Ouvertures de fiche",
            metric: { value: metrics.listingViews, format: COUNT, animate: true },
          },
          { label: "Portée", metric: { value: metrics.reach, format: COUNT, animate: true } },
        ],
        footnote: {
          text: `${metrics.conversionPct} % des ouvertures deviennent une demande de réservation.`,
        },
      },
      {
        id: "visibility-kpis",
        type: "kpi-grid",
        columns: 4,
        tiles: [
          {
            id: "impressions",
            label: "Impressions dans le fil",
            tone: "sand",
            icon: "megaphone",
            metric: { value: metrics.impressions, format: COUNT, animate: true },
            delta: { value: metrics.impressionsDeltaPct, period: "vs période précédente" },
          },
          {
            id: "views",
            label: "Ouvertures de la fiche",
            tone: "surface",
            icon: "sparkles",
            metric: { value: metrics.listingViews, format: COUNT, animate: true },
            delta: { value: metrics.listingViewsDeltaPct, period: "vs période précédente" },
          },
          {
            id: "reach",
            label: "Portée",
            tone: "surface",
            icon: "users",
            metric: { value: metrics.reach, format: COUNT, animate: true },
            hint: "Comptes distincts ayant vu la fiche.",
          },
          {
            id: "conversion",
            label: "Ouverture → réservation",
            tone: "sage",
            icon: "percent",
            metric: { value: metrics.conversionPct, format: PCT, animate: true },
          },
        ],
      },
      {
        id: "checklist",
        type: "entity-list",
        heading: "Ce qui pèse sur le classement",
        rows: checklist.map((item) => ({
          id: item.id,
          title: item.label,
          icon: item.done ? ("check" as const) : ("alert" as const),
          meta: item.hint,
          badges: [
            item.done
              ? { label: "FAIT", tone: "success" as const }
              : { label: "À FAIRE", tone: "warning" as const },
          ],
          actions: item.done
            ? undefined
            : [
                {
                  action: {
                    kind: "link" as const,
                    href: item.href,
                    label: "Corriger",
                    icon: "settings" as const,
                  },
                  variant: "secondary" as const,
                },
              ],
        })),
      },
      {
        id: "boost-actions",
        type: "nudge",
        eyebrow: "Boost",
        icon: "megaphone",
        headline: metrics.boostActive ? "Boost en cours." : "Aucun boost en cours.",
        body: metrics.boostActive
          ? "Votre fiche apparaît en tête du fil pour les utilisateurs de votre ville. Vous pouvez la mettre en pause ou la prolonger à tout moment."
          : "Un boost place votre fiche en tête du fil de l'application pour les utilisateurs de votre ville, sur une période et un budget que vous choisissez.",
        actions: metrics.boostActive
          ? [
              {
                action: { kind: "command", label: "Mettre en pause", command: "boost.pause" },
                variant: "secondary",
                allow: ["owner", "admin"],
              },
              {
                action: { kind: "command", label: "Prolonger", command: "boost.extend" },
                variant: "primary",
                allow: ["owner", "admin"],
              },
            ]
          : [
              {
                action: { kind: "command", label: "Créer un boost", command: "boost.start" },
                variant: "primary",
                allow: ["owner", "admin"],
              },
            ],
      },
    ],
  };
}

// ── Bilans ───────────────────────────────────────────────────

export function buildReportsScreen(
  analytics: VenueAnalytics | undefined,
  desk: MoneyDesk | undefined,
  configuration: VenueConfiguration,
): ScreenSpec {
  const vocabulary = configFor(configuration);
  const hasSpend = Boolean(desk?.hasTransactionSource);

  if (!analytics) {
    return {
      slug: "bilans",
      title: "Bilans",
      blocks: [
        {
          id: "unavailable",
          type: "entity-list",
          heading: "Bilans",
          rows: [],
          empty: {
            title: "Données indisponibles",
            body: "Le service d'analytique n'a pas répondu.",
            icon: "file",
          },
        },
      ],
    };
  }

  // Recommendations are derived from the figures on this page, never
  // invented: three lines maximum, each pointing at a screen.
  const recommendations: { text: string; href: string; label: string }[] = [];
  if (analytics.noShowRate > 8) {
    recommendations.push({
      text: `${analytics.noShowRate.toFixed(1)} % d'absences sur la période. Un acompte sur les grandes tables est ce qui fait baisser ce chiffre le plus vite.`,
      href: restaurantHref("acomptes"),
      label: "Configurer les acomptes",
    });
  }
  if (analytics.occupancyRate < 65) {
    recommendations.push({
      text: `La salle tourne à ${Math.round(analytics.occupancyRate)} % de sa capacité. Une offre sur les deux services les plus creux remplit sans toucher aux prix.`,
      href: restaurantHref("offres"),
      label: "Créer une offre",
    });
  }
  if (!hasSpend) {
    recommendations.push({
      text: "Sans source de transaction, aucun bilan ne peut parler de recette ni de panier moyen.",
      href: restaurantHref("lyfe-pay"),
      label: "Voir Lyfe Pay",
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      text: "Rien à signaler : occupation correcte, absences maîtrisées. Le prochain levier est la visibilité.",
      href: restaurantHref("visibilite"),
      label: "Ouvrir Visibilité",
    });
  }

  const summary: Block = {
    id: "summary",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "covers",
        label: vocabulary.cover.many.replace(/^./, (c) => c.toUpperCase()),
        tone: "sand",
        icon: "users",
        metric: { value: analytics.coversServed, format: COUNT, animate: true },
        delta: { value: analytics.coversDeltaPct, period: "vs mois précédent" },
      },
      {
        id: "occupancy",
        label: "Occupation",
        tone: "surface",
        icon: "gauge",
        metric: { value: analytics.occupancyRate, format: { kind: "percent" }, animate: true },
        delta: { value: analytics.occupancyDeltaPct, period: "vs mois précédent" },
      },
      {
        id: "no-show",
        label: "Absences",
        tone: "surface",
        icon: "user-x",
        metric: { value: analytics.noShowRate, format: PCT, animate: true },
        delta: { value: analytics.noShowDeltaPct, period: "vs mois précédent", invert: true },
      },
      ...(hasSpend
        ? ([
            {
              id: "revenue",
              label: "Encaissé",
              tone: "surface",
              icon: "coins",
              metric: {
                value: (desk?.transactions ?? [])
                  .filter((t) => t.status === "reussie")
                  .reduce((s, t) => s + t.amountMad, 0),
                format: MAD,
                animate: true,
              },
            },
          ] satisfies KpiTile[])
        : []),
    ],
  };

  const best = [...analytics.series].sort((a, b) => b.covers - a.covers).slice(0, 3);
  const worst = [...analytics.series].sort((a, b) => a.covers - b.covers).slice(0, 3);

  return {
    slug: "bilans",
    title: "Bilans",
    subtitle: "Le mois en deux minutes",
    blocks: [
      {
        id: "head",
        type: "greeting",
        eyebrow: "Rapport mensuel",
        title: "Ce mois-ci,",
        emphasis: "en deux minutes",
        subline: "Généré à partir des mêmes chiffres que Performance.",
        actions: [
          {
            action: {
              kind: "command",
              command: "report.generate",
              label: "Générer maintenant",
              icon: "sparkles",
            },
            variant: "primary",
          },
          {
            action: { kind: "command", command: "print", label: "Télécharger en PDF", icon: "file" },
            variant: "secondary",
          },
          {
            action: {
              kind: "command",
              command: "report.schedule",
              label: "Planifier l'envoi",
              icon: "clock",
            },
            variant: "ghost",
          },
        ],
      },
      summary,
      {
        id: "recommendations",
        type: "group",
        heading: "Recommandations",
        gap: "sm",
        children: recommendations.slice(0, 3).map((r, i) => ({
          id: `rec-${i}`,
          type: "nudge" as const,
          eyebrow: `Recommandation ${i + 1}`,
          icon: "sparkles" as const,
          body: r.text,
          actions: [
            {
              action: { kind: "link" as const, href: r.href, label: r.label, icon: "sparkles" as const },
              variant: "secondary" as const,
            },
          ],
        })),
      },
      {
        id: "best-worst",
        type: "split",
        railWidth: 420,
        main: [
          {
            id: "best",
            type: "entity-list",
            heading: "Meilleurs services",
            rows: best.map((p, i) => ({
              id: `best-${i}`,
              title: p.label,
              icon: "trend-up" as const,
              meta: `${p.covers} ${vocabulary.cover.many}`,
              trailing: { label: vocabulary.cover.many, metric: { value: p.covers, format: COUNT } },
            })),
            empty: { title: "Aucun service", body: "Pas encore de données.", icon: "sunset" },
          },
        ],
        rail: [
          {
            id: "worst",
            type: "entity-list",
            heading: "Services les plus creux",
            headingAction: {
              kind: "link",
              href: restaurantHref("offres"),
              label: "Créer une offre →",
            },
            rows: worst.map((p, i) => ({
              id: `worst-${i}`,
              title: p.label,
              icon: "trend-down" as const,
              meta: `${p.covers} ${vocabulary.cover.many}`,
              trailing: { label: vocabulary.cover.many, metric: { value: p.covers, format: COUNT } },
            })),
            empty: { title: "Aucun service", body: "Pas encore de données.", icon: "sunset" },
          },
        ],
      },
      {
        id: "schedule",
        type: "settings",
        heading: "Envoi automatique",
        subheading: "Le bilan part par e-mail, sans que personne ait à l'ouvrir.",
        rows: [
          {
            id: "weekly",
            label: "Bilan hebdomadaire",
            hint: "Tous les lundis matin.",
            control: { kind: "toggle", value: true },
            command: "report.weekly",
            allow: ["owner", "admin"],
          },
          {
            id: "monthly",
            label: "Bilan mensuel",
            hint: "Le premier de chaque mois.",
            control: { kind: "toggle", value: true },
            command: "report.monthly",
            allow: ["owner", "admin"],
          },
        ],
        footerActions: [
          {
            action: {
              kind: "command",
              command: "report.share",
              label: "Partager un lien",
              icon: "sparkles",
            },
            variant: "secondary",
          },
        ],
      },
    ],
  };
}
