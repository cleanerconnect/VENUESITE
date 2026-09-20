// Audience — who comes to this establishment, and how it compares.
//
// Fiche client answers "who is this person". This is the same rows read
// the other way round: the cross-guest view. Nothing here is a new
// number; it is customers, their preferences, their completed bookings,
// the daily source rollup and an anonymised benchmark cohort, counted.
//
// Two rules govern the whole screen and both are the store's, not this
// file's — a builder cannot widen them by rendering harder:
//
//   1. No group under ten people is drawn. `audience-store` filters
//      before the spec is built, so a breakdown that arrives here is
//      already safe to paint. What this file adds is saying so: every
//      section states what was withheld rather than quietly showing a
//      short list.
//   2. Benchmarks are a cohort, never a competitor. The store carries
//      `sampleSize` so the screen can name how many establishments the
//      median is drawn from.

import type { Block, EntityRow, ScreenSpec } from "@/lib/dashboard/spec";
import { COUNT, DECIMAL, PERCENT } from "@/lib/dashboard/formats";
import type {
  AudienceBenchmark,
  AudienceBreakdown,
  AudienceInsights,
  VenueConfiguration,
} from "@/lib/types/venue-operations";
import { configFor } from "@/lib/venue/config";
import { restaurantHref } from "./slugs";

/** "sur 60 personnes" / "sur 60 couverts" — the venue's own word. */
function peopleWord(configuration: VenueConfiguration, n: number): string {
  const vocabulary = configFor(configuration);
  return n > 1 ? vocabulary.cover.many : vocabulary.cover.one;
}

/**
 * The line under every breakdown.
 *
 * A section that simply omitted small groups would misrepresent the
 * base: the reader would take the rows as the whole picture. So each one
 * says how many people are behind the rows, how many were withheld by
 * the minimum, and how many never disclosed the dimension at all —
 * three different facts that a single "others" bucket would blur.
 */
function coverageNote(
  breakdown: AudienceBreakdown,
  minimum: number,
  configuration: VenueConfiguration,
): string {
  const parts = [
    `${breakdown.covered} ${peopleWord(configuration, breakdown.covered)} dans les groupes affichés`,
  ];
  if (breakdown.withheldGroups > 0) {
    parts.push(
      `${breakdown.withheldGroups} groupe${breakdown.withheldGroups > 1 ? "s" : ""} sous le seuil de ${minimum} (${breakdown.withheld} personnes) non affiché${breakdown.withheldGroups > 1 ? "s" : ""}`,
    );
  }
  if (breakdown.unknown > 0) {
    parts.push(`${breakdown.unknown} sans réponse`);
  }
  return `${parts.join(" · ")}.`;
}

/** A breakdown as a bar chart, or an honest note where nothing clears the floor. */
function breakdownBlock(
  id: string,
  heading: string,
  breakdown: AudienceBreakdown,
  insights: AudienceInsights,
  configuration: VenueConfiguration,
): Block {
  if (breakdown.rows.length === 0) {
    const total = breakdown.withheld + breakdown.unknown;
    return {
      id,
      type: "entity-list",
      heading,
      rows: [],
      empty: {
        title: "Trop peu de données",
        body:
          total === 0
            ? `Aucune donnée collectée pour cette dimension. L'application ne la demande pas à l'inscription.`
            : `Aucun groupe n'atteint ${insights.minGroupSize} personnes. ${breakdown.withheld} personne${breakdown.withheld > 1 ? "s" : ""} dans ${breakdown.withheldGroups} groupe${breakdown.withheldGroups > 1 ? "s" : ""} trop petit${breakdown.withheldGroups > 1 ? "s" : ""}, ${breakdown.unknown} sans réponse.`,
        icon: "users",
      },
    };
  }

  return {
    id,
    type: "chart",
    heading,
    subheading: coverageNote(breakdown, insights.minGroupSize, configuration),
    variant: "bar",
    series: breakdown.rows.map((r) => ({ label: r.label, value: r.count })),
    valueFormat: COUNT,
  };
}

function benchmarkRow(b: AudienceBenchmark): EntityRow {
  const fmt = (n: number) =>
    b.format === "score" ? n.toFixed(1) : `${Math.round(n * 100)} %`;
  // "Better" is not always "higher": an absence rate wants to be low, and
  // a row that drew the arrow the same way for both would congratulate a
  // venue for missing more bookings.
  const ahead = b.lowerIsBetter ? b.venueValue <= b.median : b.venueValue >= b.median;
  return {
    id: b.metric,
    title: b.label,
    icon: "gauge",
    meta: `Médiane ${fmt(b.median)} · meilleur décile ${fmt(b.topDecile)} · ${b.sampleSize} établissements comparables`,
    badges: [
      ahead
        ? { label: "AU-DESSUS DE LA MÉDIANE", tone: "success" }
        : { label: "SOUS LA MÉDIANE", tone: "warning" },
    ],
    trailing: {
      label: "Vous",
      metric: {
        value: b.format === "score" ? b.venueValue : b.venueValue * 100,
        format: b.format === "score" ? DECIMAL : PERCENT,
      },
    },
  };
}

export function buildAudienceScreen(
  insights: AudienceInsights,
  configuration: VenueConfiguration,
): ScreenSpec {
  const vocabulary = configFor(configuration);
  const noun = vocabulary.cover.many;
  const Noun = `${noun.charAt(0).toUpperCase()}${noun.slice(1)}`;

  const hero: Block = {
    id: "audience-hero",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "base",
        label: `Base totale`,
        icon: "users",
        tone: "sand",
        metric: { value: insights.baseTotal, format: COUNT, animate: true },
        hint: `${Noun} connus de l'établissement, toutes sources confondues.`,
      },
      {
        id: "new-share",
        label: `Nouveaux sur ${insights.periodDays} jours`,
        icon: "user-check",
        metric: { value: insights.newSharePct, format: PERCENT, animate: true },
        hint: "Part de la base vue pour la première fois dans la période.",
      },
      {
        id: "return-90",
        label: "Taux de retour à 90 jours",
        icon: "undo",
        metric: { value: insights.returnRate90Pct, format: PERCENT, animate: true },
        hint: "Part des clients revenus dans les quatre-vingt-dix jours suivant leur première visite.",
      },
    ],
  };

  const profile: Block = {
    id: "audience-profile",
    type: "group",
    heading: "Profil",
    gap: "md",
    children: [
      breakdownBlock("by-city", "Par ville", insights.byCity, insights, configuration),
      breakdownBlock("by-quartier", "Par quartier", insights.byQuartier, insights, configuration),
      breakdownBlock("by-age", "Par tranche d'âge", insights.byAge, insights, configuration),
      breakdownBlock(
        "by-interest",
        "Par centres d'intérêt déclarés dans LYFE",
        insights.byInterest,
        insights,
        configuration,
      ),
    ],
  };

  const sources: Block =
    insights.sources.length === 0
      ? {
          id: "audience-sources",
          type: "entity-list",
          heading: "Sources de trafic",
          rows: [],
          empty: {
            title: "Aucune donnée de trafic",
            body: "Les événements de suivi de l'application n'ont encore rien remonté pour cette période.",
            icon: "gauge",
          },
        }
      : {
          id: "audience-sources",
          type: "table",
          heading: "Sources de trafic",
          columns: [
            { key: "source", label: "Source" },
            { key: "impressions", label: "Impressions", align: "right" },
            { key: "opens", label: "Fiches ouvertes", align: "right" },
            { key: "requests", label: "Demandes", align: "right" },
            { key: "share", label: "Part", align: "right" },
          ],
          rows: insights.sources.map((s) => ({
            id: s.source,
            cells: {
              source: { value: s.label },
              impressions: { value: s.impressions, format: COUNT },
              opens: { value: s.opens, format: COUNT },
              requests: { value: s.requests, format: COUNT },
              share: { value: s.sharePct, format: PERCENT },
            },
          })),
        };

  const timing: Block = {
    id: "audience-timing",
    type: "group",
    heading: "Quand ils viennent",
    gap: "md",
    children: [
      breakdownBlock("by-weekday", "Par jour de semaine", insights.byWeekday, insights, configuration),
      breakdownBlock(
        "by-service",
        `Par ${vocabulary.service.one}`,
        insights.byService,
        insights,
        configuration,
      ),
      breakdownBlock(
        "by-hour",
        "Par heure de réservation",
        insights.byBookingHour,
        insights,
        configuration,
      ),
    ],
  };

  const cohorts: Block =
    insights.cohorts.length === 0
      ? {
          id: "audience-cohorts",
          type: "entity-list",
          heading: "Rétention par cohorte",
          rows: [],
          empty: {
            title: "Trop peu de données",
            body: `Aucun mois de première visite n'atteint ${insights.minGroupSize} personnes. Une courbe sur six clients est du bruit, et lisible à côté d'une ville elle les rend identifiables.`,
            icon: "gauge",
          },
        }
      : {
          id: "audience-cohorts",
          type: "table",
          heading: "Rétention par cohorte",
          columns: [
            { key: "month", label: "Première visite" },
            { key: "size", label: "Cohorte", align: "right" },
            { key: "d30", label: "30 j", align: "right" },
            { key: "d60", label: "60 j", align: "right" },
            { key: "d90", label: "90 j", align: "right" },
          ],
          rows: insights.cohorts.map((c) => ({
            id: c.month,
            cells: {
              month: { value: c.label },
              size: { value: c.size, format: COUNT },
              d30: { value: c.retentionPct[0], format: PERCENT },
              d60: { value: c.retentionPct[1], format: PERCENT },
              d90: { value: c.retentionPct[2], format: PERCENT },
            },
          })),
        };

  const benchmarkNote: Block = {
    id: "audience-benchmarks-note",
    type: "nudge",
    eyebrow: "Anonymisé",
    icon: "info",
    headline: "Une cohorte, jamais un concurrent.",
    body: insights.benchmarks.length
      ? `Les médianes viennent de ${insights.benchmarks[0].sampleSize} établissements comparables, et la plateforme n'en nomme aucun. Une cohorte trop petite n'est pas publiée du tout.`
      : "Aucune médiane n'est publiée tant que la cohorte comparable est trop petite pour rester anonyme.",
  };

  const benchmarkList: Block = {
    id: "audience-benchmarks",
    type: "entity-list",
    rows: insights.benchmarks.map(benchmarkRow),
    empty: {
      title: "Aucune cohorte comparable",
      body: "Pas assez d'établissements comparables sur la plateforme pour publier une médiane.",
      icon: "gauge",
    },
  };

  const benchmarks: Block = {
    id: "audience-benchmarks-group",
    type: "group",
    heading: "Comparaison avec des établissements similaires",
    gap: "md",
    children: [benchmarkNote, benchmarkList],
  };

  // The segment builder is the one thing here that writes. It hands its
  // result to Tags et segments, which already owns segments — Audience
  // does not keep a second copy.
  const builderNote: Block = {
    id: "audience-segment-builder-note",
    type: "nudge",
    eyebrow: "Segment",
    icon: "tag",
    headline: "Combinez les dimensions ci-dessus.",
    body: `Ville, quartier, âge, centres d'intérêt, source et horaire. Le segment est enregistré dans Tags et segments, puis utilisable dans Campagnes et dans le boost de Visibilité. Aucun segment ne peut cibler moins de ${insights.minGroupSize} personnes.`,
  };

  const builderList: Block = {
    id: "audience-segment-builder",
    type: "entity-list",
    headingAction: {
      kind: "command",
      command: "segment.createFromAudience",
      label: "Créer un segment",
      icon: "plus",
    },
    rows: [
      {
        id: "to-segments",
        title: "Tags et segments",
        icon: "tag",
        meta: "Les segments enregistrés vivent là, avec les étiquettes qui les alimentent.",
        href: restaurantHref("segments"),
      },
      {
        id: "to-campaigns",
        title: "Campagnes",
        icon: "megaphone",
        meta: "Lancer une campagne sur un segment enregistré.",
        href: restaurantHref("campagnes"),
      },
      {
        id: "to-visibility",
        title: "Visibilité",
        icon: "gauge",
        meta: "Lancer un boost sur un segment enregistré.",
        href: restaurantHref("visibilite"),
      },
    ],
  };

  const builder: Block = {
    id: "audience-segment-builder-group",
    type: "group",
    heading: "Créer un segment à partir de ces dimensions",
    gap: "md",
    children: [builderNote, builderList],
  };

  return {
    slug: "audience",
    title: "Audience",
    subtitle: `Qui vient chez vous · base de ${insights.baseTotal} ${peopleWord(configuration, insights.baseTotal)}`,
    blocks: [hero, profile, sources, timing, cohorts, benchmarks, builder],
  };
}
