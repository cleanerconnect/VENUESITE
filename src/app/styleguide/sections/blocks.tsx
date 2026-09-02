"use client";

import type { Block, ScreenSpec } from "@/lib/dashboard/spec";
import { COUNT, DECIMAL, MAD } from "@/lib/dashboard/formats";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";
import { DetailBody } from "@/components/dashboard/DetailBody";
import { Specimen } from "../Shell";

// Every block type in the spec vocabulary, rendered from a literal spec.
//
// This is the part of the styleguide that earns its keep. The screens
// the portal ships are pure functions returning a `ScreenSpec`; the
// specs below are hand-written instead of derived, which means a
// developer can see exactly what each block type does without seeding a
// database or reading a builder.
//
// The renderer here is the same one the app uses. If a block renders
// correctly on this page, it renders correctly in the workspace.

const NOW = new Date();
const minutesAgo = (m: number) =>
  new Date(NOW.getTime() - m * 60_000).toISOString();

/** Wraps one block into the minimal screen the renderer accepts. */
function screen(id: string, blocks: Block[]): ScreenSpec {
  return { slug: id, title: id, blocks };
}

const BLOCKS: { type: string; note: string; blocks: Block[] }[] = [
  {
    type: "greeting",
    note: "ouverture éditoriale — titre, incise serif italique, actions",
    blocks: [
      {
        id: "g",
        type: "greeting",
        eyebrow: "JEUDI 12 JUIN",
        title: "Bonsoir Yassine,",
        emphasis: "le service est complet.",
        subline: "128 couverts réservés, 3 demandes en attente.",
        actions: [
          {
            action: { kind: "link", href: "#", label: "Ouvrir le carnet" },
            variant: "primary",
          },
          {
            action: { kind: "link", href: "#", label: "Voir les avis" },
            variant: "ghost",
          },
        ],
      },
    ],
  },
  {
    type: "hero",
    note: "la seule carte sombre par écran — anneau, stats, note de bas",
    blocks: [
      {
        id: "h",
        type: "hero",
        eyebrow: "DÎNER · EN COURS",
        live: true,
        title: "Service en cours",
        subtitle: "19 h 00 – 23 h 30 · Dar Zellij",
        ring: {
          progress: 0.72,
          topLabel: "Arrivés",
          centerLabel: "72 %",
          bottomLabel: "86 / 120",
        },
        stats: [
          {
            label: "Encaissé ce service",
            metric: { value: 63400, format: MAD, animate: true },
            accent: true,
          },
          {
            label: "Couverts arrivés",
            metric: { value: 86, format: COUNT, suffix: "/ 104" },
          },
          {
            label: "Couverts disponibles",
            metric: { value: 16, format: COUNT },
          },
        ],
        footnote: {
          text: "Le rythme d'arrivée dépasse la projection de 8 %.",
          badge: { label: "Prévision", tone: "violet" },
        },
      },
    ],
  },
  {
    type: "nudge",
    note: "sortie de l'assistant — jamais décoratif",
    blocks: [
      {
        id: "n",
        type: "nudge",
        eyebrow: "SUGGESTION",
        icon: "sparkles",
        headline: "Trois annulations sur le créneau de 21 h.",
        body: "Ouvrir 6 couverts supplémentaires récupérerait environ 1 400 MAD.",
        actions: [
          {
            action: { kind: "link", href: "#", label: "Ouvrir le créneau" },
            variant: "primary",
          },
          {
            action: { kind: "command", command: "nudge.dismiss", label: "Ignorer" },
            variant: "ghost",
          },
        ],
      },
    ],
  },
  {
    type: "kpi-grid",
    note: "le bento — ton, span et ordre arrivent en données",
    blocks: [
      {
        id: "k",
        type: "kpi-grid",
        columns: 4,
        tiles: [
          {
            id: "covers",
            label: "Couverts aujourd'hui",
            tone: "sand",
            icon: "users",
            metric: { value: 128, format: COUNT, animate: true },
            delta: { value: 0.12, period: "vs hier" },
            sparkline: [12, 18, 24, 30, 22, 34, 40],
          },
          {
            id: "ticket",
            label: "Ticket moyen",
            icon: "wallet",
            metric: { value: 486, format: MAD },
            delta: { value: -0.04, period: "vs semaine dernière" },
          },
          {
            id: "rating",
            label: "Note moyenne",
            tone: "sage",
            icon: "star",
            metric: { value: 4.6, format: DECIMAL, suffix: "/ 5" },
            hint: "Sur 214 avis",
          },
          {
            id: "noshow",
            label: "Absences",
            tone: "rose",
            icon: "user-x",
            metric: { value: 6, format: COUNT },
            chips: [{ label: "1 240 MAD perdus", tone: "danger" }],
          },
        ],
      },
    ],
  },
  {
    type: "entity-list",
    note: "onglets, recherche, tri, tiroir de détail, menu kebab",
    blocks: [
      {
        id: "e",
        type: "entity-list",
        heading: "Carnet du service",
        tabs: [
          { id: "all", label: "Tous" },
          {
            id: "requested",
            label: "À confirmer",
            match: { facet: "state", values: ["requested"] },
          },
          {
            id: "confirmed",
            label: "Confirmées",
            match: { facet: "state", values: ["confirmed"] },
          },
        ],
        search: { placeholder: "Rechercher un client…" },
        sorts: [
          { id: "time", label: "Heure", key: "time", direction: "asc" },
          { id: "party", label: "Couverts", key: "party", direction: "desc" },
        ],
        rows: [
          {
            id: "r1",
            title: "Salma Bennani",
            meta: "20 h 30 · Patio · 4 couverts",
            initials: "SB",
            badges: [
              { label: "CONFIRMÉE", tone: "info", dot: true },
              { label: "Habituée", tone: "violet", icon: "star" },
            ],
            facets: { state: "confirmed" },
            sortKeys: { time: 1, party: 4 },
            signal: { text: "Anniversaire — dessert avec bougie.", icon: "note" },
            detail: {
              title: "Salma Bennani",
              subtitle: "4 couverts · 20 h 30",
              badges: [{ label: "CONFIRMÉE", tone: "info", dot: true }],
              sections: [
                {
                  label: "Le couvert",
                  items: [
                    { label: "Heure", metric: { value: "20 h 30" } },
                    { label: "Personnes", metric: { value: 4, format: COUNT } },
                    { label: "Espace", metric: { value: "Patio" } },
                  ],
                },
              ],
              notes: [
                {
                  label: "Note",
                  text: "Anniversaire, dessert avec bougie.",
                  icon: "note",
                },
              ],
            },
            menu: [
              { id: "arrive", label: "Marquer comme arrivé", action: { kind: "command", command: "noop" } },
              { id: "cancel", label: "Annuler", action: { kind: "command", command: "noop" }, destructive: true },
            ],
          },
          {
            id: "r2",
            title: "Nabil Cherkaoui",
            meta: "21 h 20 · LYFE · 2 couverts",
            initials: "NC",
            badges: [
              { label: "À CONFIRMER", tone: "warning", dot: true },
              { label: "Risque d'absence", tone: "warning", icon: "alert" },
            ],
            facets: { state: "requested" },
            sortKeys: { time: 2, party: 2 },
            trailing: { label: "Acompte", metric: { value: 400, format: MAD } },
          },
        ],
        empty: { title: "Aucune réservation", icon: "calendar" },
        noMatches: { title: "Rien sur ce filtre" },
      },
    ],
  },
  {
    type: "slot-grid",
    note: "charge par créneau contre une ligne de capacité",
    blocks: [
      {
        id: "s",
        type: "slot-grid",
        heading: "Charge du service",
        subheading: "Couverts réservés par créneau de 30 minutes",
        capacity: 34,
        capacityLabel: "Capacité",
        unitLabel: "couverts",
        slots: [
          { label: "19 h 00", value: 10 },
          { label: "19 h 30", value: 19 },
          { label: "20 h 00", value: 28 },
          { label: "20 h 30", value: 34, current: true },
          { label: "21 h 00", value: 32 },
          { label: "21 h 30", value: 38, tone: "danger" },
          { label: "22 h 00", value: 20 },
          { label: "22 h 30", value: 9 },
        ],
      },
    ],
  },
  {
    type: "feed",
    note: "activité — l'entrée surlignée mérite une vérification",
    blocks: [
      {
        id: "f",
        type: "feed",
        heading: "Activité",
        live: true,
        entries: [
          {
            id: "a1",
            actor: "Salma Bennani",
            message: "est arrivée · 4 couverts",
            at: minutesAgo(2),
            icon: "user-check",
            tone: "live",
          },
          {
            id: "a2",
            actor: "LYFE",
            message: "détecte 3 annulations sur le même créneau",
            at: minutesAgo(9),
            icon: "alert",
            tone: "warning",
            highlight: true,
          },
          {
            id: "a3",
            actor: "Leïla M.",
            message: "a laissé un avis 5 étoiles",
            at: minutesAgo(180),
            icon: "star",
            tone: "success",
          },
        ],
      },
    ],
  },
  {
    type: "table",
    note: "colonnes typées, cellules avec badge / barre / ton",
    blocks: [
      {
        id: "t",
        type: "table",
        heading: "Versements",
        columns: [
          { key: "ref", label: "Référence" },
          { key: "period", label: "Période", hideOnMobile: true },
          { key: "covers", label: "Couverts", align: "right", format: COUNT },
          { key: "amount", label: "Montant", align: "right", format: MAD },
          { key: "state", label: "État", align: "right" },
        ],
        rows: [
          {
            id: "p1",
            cells: {
              ref: { value: "LYF-2026-24" },
              period: { value: "9 – 15 juin" },
              covers: { value: 412 },
              amount: { value: 184300 },
              state: { value: "", badge: { label: "VERSÉ", tone: "success" } },
            },
          },
          {
            id: "p2",
            cells: {
              ref: { value: "LYF-2026-25" },
              period: { value: "16 – 22 juin" },
              covers: { value: 388 },
              amount: { value: 171900 },
              state: { value: "", badge: { label: "PROGRAMMÉ", tone: "info" } },
            },
          },
        ],
      },
    ],
  },
  {
    type: "chart",
    note: "aire ou barres, avec ligne de référence optionnelle",
    blocks: [
      {
        id: "c",
        type: "chart",
        heading: "Recette de la semaine",
        subheading: "Sept derniers jours",
        variant: "area",
        valueFormat: MAD,
        target: { value: 60000, label: "Objectif" },
        series: [
          { label: "Lun", value: 42000 },
          { label: "Mar", value: 48500 },
          { label: "Mer", value: 51200 },
          { label: "Jeu", value: 63400 },
          { label: "Ven", value: 78900 },
          { label: "Sam", value: 91200 },
          { label: "Dim", value: 58300 },
        ],
      },
    ],
  },
  {
    type: "split / group",
    note: "composition — colonne principale et rail, empilement titré",
    blocks: [
      {
        id: "sp",
        type: "split",
        railWidth: 300,
        main: [
          {
            id: "sp-main",
            type: "group",
            heading: "Colonne principale",
            gap: "md",
            children: [
              {
                id: "sp-chart",
                type: "chart",
                heading: "Couverts",
                variant: "bar",
                valueFormat: COUNT,
                series: [
                  { label: "Lun", value: 84 },
                  { label: "Mar", value: 96 },
                  { label: "Mer", value: 102 },
                  { label: "Jeu", value: 128 },
                ],
              },
            ],
          },
        ],
        rail: [
          {
            id: "sp-rail",
            type: "kpi-grid",
            columns: 1,
            tiles: [
              {
                id: "rail-1",
                label: "Prochain versement",
                tone: "violet-soft",
                icon: "wallet",
                metric: { value: 184300, format: MAD },
                hint: "Vendredi 19 juin",
              },
            ],
          },
        ],
      },
    ],
  },
];

const DETAIL_SPEC = BLOCKS.find((b) => b.type === "entity-list")!.blocks[0];

export function BlocksSection() {
  return (
    <>
      {BLOCKS.map((entry) => (
        <Specimen
          key={entry.type}
          name={entry.type}
          note={entry.note}
          ground="canvas"
        >
          <DashboardRenderer spec={screen(entry.type, entry.blocks)} />
        </Specimen>
      ))}

      <Specimen
        name="DetailBody"
        note="le corps d'un panneau de détail, hors du tiroir"
      >
        <DetailBody
          spec={
            DETAIL_SPEC.type === "entity-list"
              ? DETAIL_SPEC.rows[0].detail!
              : { title: "" }
          }
        />
      </Specimen>
    </>
  );
}
