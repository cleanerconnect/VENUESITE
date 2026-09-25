// Vie nocturne: Guest list, Tables minimums, Promoteurs.
//
// Rendered only where the establishment's configuration includes a
// lounge. That gate lives in the nav and the registry, not here — these
// builders assume they were asked for.
//
// The three are one business between them: a promoter brings a name, the
// name arrives on a list or at a table, the table carries a minimum. So
// attribution runs through all three, and it is counted rather than
// modelled: where the venue has no transaction source, the revenue
// column is absent instead of estimated.

import type { Block, EntityRow, ScreenSpec } from "@/lib/dashboard/spec";
import { COUNT, MAD, PERCENT } from "@/lib/dashboard/formats";
import type {
  GuestList,
  GuestListEntry,
  Nightlife,
  Promoter,
  TableReservation,
  TableType,
} from "@/lib/types/venue-operations";
import { restaurantHref } from "./slugs";
import { hm, initialsOf, mobileTiles, money, shortDay } from "./format";

const ENTRY_SOURCE: Record<GuestListEntry["source"], string> = {
  app: "App",
  promoteur: "Promoteur",
  sur_place: "Sur place",
};

const NIGHT_KIND_LABEL: Record<string, string> = {
  semaine: "Semaine",
  weekend: "Week-end",
  evenement: "Événement spécial",
};

const TABLE_STATUS: Record<
  TableReservation["status"],
  { label: string; tone: "warning" | "info" | "live" | "muted" | "danger" }
> = {
  demandee: { label: "DEMANDE", tone: "warning" },
  confirmee: { label: "CONFIRMÉE", tone: "info" },
  arrivee: { label: "ARRIVÉE", tone: "live" },
  liberee: { label: "LIBÉRÉE", tone: "muted" },
  annulee: { label: "ANNULÉE", tone: "danger" },
};

// ── Guest list ───────────────────────────────────────────────

export function buildGuestListScreen(nightlife: Nightlife): ScreenSpec {
  const today = new Date().toISOString().slice(0, 10);
  const nights = [...nightlife.guestLists].sort((a, b) => (a.night < b.night ? 1 : -1));
  // The list the door is working: the next open night, or the most
  // recent one if nothing is open.
  const active =
    nights.find((n) => n.status === "ouverte" && n.night >= today) ?? nights[0];

  const entries = active?.entries ?? [];
  const expected = entries.reduce((s, e) => s + e.partySize, 0);
  const arrived = entries.reduce((s, e) => s + e.checkedInCount, 0);

  const counters: Block = {
    id: "guestlist-counters",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "expected",
        label: "Personnes attendues",
        tone: "sand",
        icon: "users",
        metric: { value: expected, format: COUNT, animate: true },
        hint: active ? `${entries.length} entrées sur la liste` : "Aucune liste ouverte",
      },
      {
        id: "arrived",
        label: "Entrées validées",
        tone: "surface",
        icon: "user-check",
        metric: { value: arrived, format: COUNT, animate: true },
        hint: expected > 0 ? `${Math.round((arrived / expected) * 100)} % de la liste` : undefined,
      },
      {
        id: "capacity",
        label: "Capacité de la liste",
        tone: active && expected > active.capacity ? "rose" : "surface",
        icon: "door-open",
        metric: { value: active?.capacity ?? 0, format: COUNT, animate: true },
        hint: active
          ? `Clôture à ${hm(active.cutoffAt)}`
          : "Ouvrez une liste pour accepter des inscriptions",
      },
    ],
  };

  // The door view. Phone-first, one tap per entry, search first: the
  // person holding this is standing in a doorway with a queue behind a
  // name they cannot quite hear.
  const door: Block = {
    id: "door",
    type: "entity-list",
    heading: active ? `${active.name} · ${shortDay(active.night)}` : "Porte",
    headingAction: active
      ? {
          kind: "command",
          command: "guestList.addEntry",
          payload: { guestListId: active.id },
          label: "Ajouter une entrée",
          icon: "user-plus",
        }
      : undefined,
    search: { placeholder: "Rechercher un nom…" },
    tabs: [
      { id: "all", label: "Tous" },
      {
        id: "pending",
        label: "À valider",
        match: { facet: "checked", values: ["no"] },
      },
      { id: "in", label: "Entrés", match: { facet: "checked", values: ["yes"] } },
      {
        id: "promoter",
        label: "Promoteurs",
        match: { facet: "source", values: ["promoteur"] },
      },
    ],
    sorts: [
      { id: "name", label: "Nom", key: "name", direction: "asc" },
      { id: "size", label: "Taille du groupe", key: "size", direction: "desc" },
    ],
    rows: entries.map(entryRow),
    empty: {
      title: active ? "Liste vide" : "Aucune liste ouverte",
      body: active
        ? "Personne ne s'est encore inscrit. Ajoutez une entrée à la main quand quelqu'un se présente."
        : "Ouvrez une liste pour la nuit et l'application commencera à prendre les inscriptions.",
      icon: "door-open",
      action: active
        ? {
            kind: "command",
            command: "guestList.addEntry",
            payload: { guestListId: active.id },
            label: "Ajouter une entrée",
          }
        : {
            kind: "command",
            command: "guestList.create",
            label: "Ouvrir une liste",
          },
    },
    noMatches: { title: "Aucun nom", body: "Aucune entrée ne correspond." },
  };

  const bands: Block | null = active
    ? {
        id: "bands",
        type: "table",
        heading: "Conditions d'entrée",
        columns: [
          { key: "label", label: "Tranche" },
          { key: "until", label: "Jusqu'à" },
          { key: "who", label: "Pour qui", hideOnMobile: true },
          { key: "price", label: "Tarif", align: "right", format: MAD },
        ],
        rows: active.bands.map((band) => ({
          id: band.id,
          cells: {
            label: { value: band.label },
            until: { value: hm(band.untilAt) },
            who: { value: band.appliesTo || "Tout le monde" },
            price: {
              value: band.priceMad,
              badge:
                band.priceMad === 0
                  ? { label: "GRATUIT", tone: "success" }
                  : undefined,
            },
          },
        })),
        empty: {
          title: "Aucune tranche",
          body: "Définissez ce que coûte l'entrée selon l'heure.",
          icon: "clock",
        },
      }
    : null;

  const allNights: Block = {
    id: "nights",
    type: "entity-list",
    heading: "Toutes les nuits",
    headingAction: {
      kind: "command",
      command: "guestList.create",
      label: "Ouvrir une liste",
      icon: "plus",
    },
    rows: nights.map(nightRow),
    empty: {
      title: "Aucune nuit",
      body: "Créez une liste par soirée : capacité, heure de clôture, tarifs par tranche.",
      icon: "moon",
    },
  };

  return {
    slug: "guest-list",
    title: "Guest list",
    subtitle: active
      ? `${active.name} · ${active.status === "ouverte" ? "ouverte" : "fermée"}`
      : "Aucune liste ouverte",
    blocks: [counters, door, ...(bands ? [bands] : []), allNights],
    // Phone lane: the door, then everything else. The person on the door
    // needs the search field in the first viewport and nothing above it.
    mobileBlocks: [
      door,
      { ...counters, id: "guestlist-counters-mobile", columns: 1, tiles: mobileTiles(counters) },
      ...(bands ? [bands] : []),
      allNights,
    ],
  };
}

function entryRow(entry: GuestListEntry): EntityRow {
  const inside = Boolean(entry.checkedInAt);
  return {
    id: entry.id,
    title: entry.guestName,
    initials: initialsOf(entry.guestName),
    meta: [
      entry.partySize > 1 ? `${entry.partySize} personnes` : "seul",
      ENTRY_SOURCE[entry.source],
      entry.promoterName ? `via ${entry.promoterName}` : null,
      inside ? `entré à ${hm(entry.checkedInAt!)} · ${entry.checkedInCount} personnes` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    badges: inside
      ? [{ label: "ENTRÉ", tone: "live" }]
      : [{ label: "ATTENDU", tone: "neutral" }],
    facets: { checked: inside ? "yes" : "no", source: entry.source },
    sortKeys: { name: entry.guestName, size: entry.partySize },
    keywords: entry.guestPhone,
    actions: inside
      ? [
          {
            action: {
              kind: "command",
              command: "guestList.undoCheckIn",
              payload: { entryId: entry.id },
              label: "Annuler l'entrée",
              icon: "undo",
            },
            variant: "ghost",
          },
        ]
      : [
          {
            action: {
              kind: "command",
              command: "guestList.checkIn",
              payload: { entryId: entry.id, count: entry.partySize },
              label: `Valider ${entry.partySize > 1 ? `${entry.partySize} entrées` : "l'entrée"}`,
              icon: "user-check",
            },
            variant: "primary",
          },
        ],
  };
}

function nightRow(list: GuestList): EntityRow {
  const expected = list.entries.reduce((s, e) => s + e.partySize, 0);
  const arrived = list.entries.reduce((s, e) => s + e.checkedInCount, 0);

  return {
    id: list.id,
    title: list.name,
    icon: "moon",
    meta: [
      shortDay(list.night),
      `clôture ${hm(list.cutoffAt)}`,
      `${list.entries.length} entrées`,
    ].join(" · "),
    badges: [
      list.status === "ouverte"
        ? { label: "OUVERTE", tone: "success" }
        : { label: "FERMÉE", tone: "muted" },
    ],
    progress: { value: expected, max: Math.max(1, list.capacity), tone: "violet" },
    progressCaption: `${expected} attendus sur ${list.capacity} · ${arrived} entrés`,
    menu: [
      {
        id: "toggle",
        label: list.status === "ouverte" ? "Fermer la liste" : "Rouvrir la liste",
        action: {
          kind: "command",
          command: "guestList.status",
          payload: {
            id: list.id,
            status: list.status === "ouverte" ? "fermee" : "ouverte",
          },
        },
      },
      {
        id: "import",
        label: "Importer une liste (CSV)",
        action: {
          kind: "command",
          command: "guestList.import",
          payload: { id: list.id },
        },
      },
      {
        id: "export",
        label: "Exporter la nuit",
        action: {
          kind: "command",
          command: "guestList.export",
          payload: { id: list.id },
        },
      },
    ],
  };
}

// ── Tables minimums ──────────────────────────────────────────

export function buildTablesScreen(
  nightlife: Nightlife,
  hasSpendSource: boolean,
): ScreenSpec {
  const today = new Date().toISOString().slice(0, 10);
  const requests = nightlife.tableReservations.filter((t) => t.status === "demandee");
  const confirmed = nightlife.tableReservations.filter(
    (t) => t.status === "confirmee" && t.night >= today,
  );
  const past = nightlife.tableReservations.filter(
    (t) => t.night < today || t.status === "arrivee" || t.status === "liberee",
  );

  const soldTonight = nightlife.tableReservations.filter(
    (t) => t.night === today && (t.status === "confirmee" || t.status === "arrivee"),
  ).length;
  const inventory = nightlife.tableTypes.reduce((s, t) => s + t.count, 0);
  const committed = confirmed.reduce((s, t) => s + t.minimumMad, 0);

  const kpis: Block = {
    id: "table-kpis",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "requests",
        label: "Demandes à traiter",
        tone: requests.length > 0 ? "peach" : "sage",
        icon: "hourglass",
        metric: { value: requests.length, format: COUNT, animate: true },
        hint: requests.length ? "Répondre avant la soirée" : "Rien en attente",
      },
      {
        id: "tonight",
        label: "Tables vendues ce soir",
        tone: "sand",
        icon: "armchair",
        metric: { value: soldTonight, format: COUNT, animate: true },
        hint: `${inventory} tables au total`,
      },
      {
        id: "committed",
        label: "Minimums engagés",
        tone: "surface",
        icon: "coins",
        // A confirmed minimum is a contract, not a forecast: it is the
        // amount the table has agreed to spend, so it is shown whether
        // or not Lyfe Pay is connected.
        metric: { value: committed, format: MAD, animate: true },
        hint: "Somme des minimums sur les tables confirmées à venir.",
      },
    ],
  };

  const requestList: Block = {
    id: "table-requests",
    type: "entity-list",
    heading: "Demandes depuis l'application",
    rows: requests.map((t) => tableRow(t, hasSpendSource)),
    empty: {
      title: "Aucune demande",
      body: "Les demandes de table arrivées par l'app apparaissent ici avec l'historique du client.",
      icon: "hourglass",
    },
  };

  const confirmedList: Block = {
    id: "table-confirmed",
    type: "entity-list",
    heading: "Tables confirmées",
    search: { placeholder: "Rechercher un nom, un téléphone…" },
    rows: confirmed.map((t) => tableRow(t, hasSpendSource)),
    empty: {
      title: "Aucune table confirmée",
      body: "Confirmez une demande pour qu'elle apparaisse ici.",
      icon: "armchair",
    },
  };

  const typeList: Block = {
    id: "table-types",
    type: "entity-list",
    heading: "Types de table",
    headingAction: {
      kind: "command",
      command: "tableType.create",
      label: "Ajouter un type",
      icon: "plus",
    },
    rows: nightlife.tableTypes.map(tableTypeRow),
    empty: {
      title: "Aucun type de table",
      body: "Décrivez ce que la salle vend : combien de tables, pour combien de personnes, à quel minimum.",
      icon: "armchair",
      action: {
        kind: "command",
        command: "tableType.create",
        label: "Ajouter un type",
      },
    },
  };

  const minimums: Block = {
    id: "minimums",
    type: "table",
    heading: "Minimums par type de nuit",
    headingAction: {
      kind: "command",
      command: "tableOffer.edit",
      label: "Modifier les minimums",
      icon: "coins",
    },
    columns: [
      { key: "type", label: "Type" },
      { key: "semaine", label: "Semaine", align: "right", format: MAD },
      { key: "weekend", label: "Week-end", align: "right", format: MAD },
      { key: "evenement", label: "Événement", align: "right", format: MAD },
      { key: "deposit", label: "Acompte", align: "right", format: PERCENT, hideOnMobile: true },
    ],
    rows: nightlife.tableTypes.map((type) => ({
      id: type.id,
      cells: {
        type: { value: type.name },
        semaine: { value: minimumFor(type, "semaine") },
        weekend: { value: minimumFor(type, "weekend") },
        evenement: { value: minimumFor(type, "evenement") },
        deposit: { value: type.depositPercent },
      },
    })),
    empty: {
      title: "Aucun minimum",
      body: "Définissez d'abord les types de table.",
      icon: "coins",
    },
  };

  const history: Block = {
    id: "table-history",
    type: "entity-list",
    heading: "Nuits passées",
    rows: past.map((t) => tableRow(t, hasSpendSource)),
    empty: {
      title: "Aucun historique",
      body: "Les tables des soirées passées apparaîtront ici.",
      icon: "receipt",
    },
  };

  return {
    slug: "tables",
    title: "Tables minimums",
    subtitle: "Vendre une banquette avec un minimum de consommation",
    blocks: [kpis, requestList, confirmedList, typeList, minimums, history],
    mobileBlocks: [
      requestList,
      { ...kpis, id: "table-kpis-mobile", columns: 1, tiles: mobileTiles(kpis) },
      confirmedList,
      typeList,
      minimums,
      history,
    ],
  };
}

const minimumFor = (type: TableType, nightKind: string) =>
  type.minimums.find((m) => m.nightKind === nightKind)?.minimumMad ?? 0;

function tableRow(table: TableReservation, hasSpendSource: boolean): EntityRow {
  const status = TABLE_STATUS[table.status];
  // Absent, not zero: a table whose spend nobody has entered has not
  // spent nothing, and the spec is explicit about the difference.
  const reachedKnown = table.reachedMad !== null;

  return {
    id: table.id,
    title: table.guestName,
    initials: initialsOf(table.guestName),
    meta: [
      table.tableTypeName,
      `${table.partySize} personnes`,
      shortDay(table.night),
      `minimum ${money(table.minimumMad)}`,
      table.promoterName ? `via ${table.promoterName}` : null,
      reachedKnown ? `${money(table.reachedMad!)} consommés` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    badges: [
      { label: status.label, tone: status.tone },
      ...(table.depositStatus
        ? [
            {
              label: `ACOMPTE ${table.depositStatus.toUpperCase()}`,
              tone:
                table.depositStatus === "paye"
                  ? ("success" as const)
                  : table.depositStatus === "echoue"
                    ? ("danger" as const)
                    : ("warning" as const),
            },
          ]
        : []),
      ...(reachedKnown && table.reachedMad! >= table.minimumMad
        ? [{ label: "MINIMUM ATTEINT", tone: "success" as const }]
        : []),
    ],
    trailing: reachedKnown
      ? { label: "Consommé", metric: { value: table.reachedMad!, format: MAD } }
      : { label: "Minimum", metric: { value: table.minimumMad, format: MAD } },
    signal:
      !reachedKnown && table.status === "arrivee" && !hasSpendSource
        ? {
            text: "Aucune source de paiement : saisissez le montant consommé à la main.",
            icon: "info",
          }
        : undefined,
    actions:
      table.status === "demandee"
        ? [
            {
              action: {
                kind: "command",
                command: "table.confirm",
                payload: { id: table.id },
                label: "Confirmer",
                icon: "check",
              },
              variant: "primary",
            },
            {
              action: {
                kind: "command",
                command: "table.requestDeposit",
                payload: { id: table.id },
                label: "Demander l'acompte",
                icon: "wallet",
              },
              variant: "secondary",
            },
          ]
        : table.status === "confirmee"
          ? [
              {
                action: {
                  kind: "command",
                  command: "table.markReached",
                  payload: { id: table.id },
                  label: "Minimum atteint",
                  icon: "coins",
                },
                variant: "secondary",
              },
            ]
          : undefined,
    menu:
      table.status === "liberee" || table.status === "annulee"
        ? undefined
        : [
            {
              id: "deposit",
              label: "Demander l'acompte",
              action: {
                kind: "command",
                command: "table.requestDeposit",
                payload: { id: table.id },
              },
            },
            {
              id: "reached",
              label: "Marquer le minimum atteint",
              action: {
                kind: "command",
                command: "table.markReached",
                payload: { id: table.id },
              },
            },
            {
              id: "release",
              label: "Libérer la table",
              destructive: true,
              action: {
                kind: "command",
                command: "table.release",
                payload: { id: table.id },
              },
            },
          ],
  };
}

function tableTypeRow(type: TableType): EntityRow {
  return {
    id: type.id,
    title: type.name,
    icon: "armchair",
    meta: [
      `${type.count} tables`,
      `${type.minGuests} à ${type.maxGuests} personnes`,
      `acompte ${type.depositPercent} %`,
      `annulation ${type.cancellationHours} h avant`,
    ].join(" · "),
    signal: type.packageLabel
      ? { text: type.packageLabel, icon: "wine" }
      : undefined,
    trailing: {
      label: "Minimum week-end",
      metric: { value: minimumFor(type, "weekend"), format: MAD },
    },
    menu: [
      {
        id: "edit",
        label: "Modifier le type",
        action: {
          kind: "command",
          command: "tableType.edit",
          payload: { id: type.id },
        },
      },
      {
        id: "minimums",
        label: "Définir les minimums",
        action: {
          kind: "command",
          command: "tableOffer.edit",
          payload: { tableTypeId: type.id },
        },
      },
    ],
  };
}

// ── Promoteurs ───────────────────────────────────────────────

export function buildPromotersScreen(
  nightlife: Nightlife,
  hasSpendSource: boolean,
): ScreenSpec {
  const active = nightlife.promoters.filter((p) => p.active);
  const inactive = nightlife.promoters.filter((p) => !p.active);

  const guests = active.reduce((s, p) => s + p.guestsBrought, 0);
  const arrived = active.reduce((s, p) => s + p.checkedIn, 0);

  const kpis: Block = {
    id: "promoter-kpis",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "active",
        label: "Promoteurs actifs",
        tone: "sand",
        icon: "users",
        metric: { value: active.length, format: COUNT, animate: true },
      },
      {
        id: "guests",
        label: "Personnes apportées",
        tone: "surface",
        icon: "user-plus",
        metric: { value: guests, format: COUNT, animate: true },
      },
      {
        id: "rate",
        label: "Taux de présentation",
        tone: "surface",
        icon: "user-check",
        metric: {
          value: guests > 0 ? Math.round((arrived / guests) * 100) : 0,
          format: PERCENT,
          animate: true,
        },
        hint: `${arrived} entrées validées sur ${guests} annoncées`,
      },
    ],
  };

  const list: Block = {
    id: "promoters",
    type: "entity-list",
    heading: "Annuaire",
    headingAction: {
      kind: "command",
      command: "promoter.create",
      label: "Ajouter un promoteur",
      icon: "user-plus",
    },
    search: { placeholder: "Rechercher un promoteur…" },
    sorts: [
      { id: "guests", label: "Personnes apportées", key: "guests", direction: "desc" },
      { id: "rate", label: "Taux de présentation", key: "rate", direction: "desc" },
      { id: "name", label: "Nom", key: "name", direction: "asc" },
    ],
    rows: [...active, ...inactive].map((p) => promoterRow(p, hasSpendSource)),
    empty: {
      title: "Aucun promoteur",
      body: "Un promoteur reçoit un lien qui attribue automatiquement les réservations faites depuis l'app.",
      icon: "users",
      action: {
        kind: "command",
        command: "promoter.create",
        label: "Ajouter un promoteur",
      },
    },
  };

  return {
    slug: "promoteurs",
    title: "Promoteurs",
    subtitle: "Qui amène qui, et ce que ça donne à la porte",
    blocks: [kpis, list],
  };
}

function promoterRow(promoter: Promoter, hasSpendSource: boolean): EntityRow {
  const rate =
    promoter.guestsBrought > 0
      ? Math.round((promoter.checkedIn / promoter.guestsBrought) * 100)
      : 0;

  return {
    id: promoter.id,
    title: promoter.fullName,
    initials: initialsOf(promoter.fullName),
    meta: [
      promoter.phone || "sans numéro",
      `${promoter.entriesBrought} entrées · ${promoter.tablesBrought} tables`,
      promoter.commissionPercent > 0
        ? `commission ${promoter.commissionPercent} %`
        : "sans commission",
      `lyfemaroc.org/p/${promoter.code}`,
    ].join(" · "),
    badges: promoter.active
      ? [{ label: "ACTIF", tone: "success" }]
      : [{ label: "DÉSACTIVÉ", tone: "muted" }],
    sortKeys: {
      guests: promoter.guestsBrought,
      rate,
      name: promoter.fullName,
    },
    keywords: promoter.code,
    progress: {
      value: promoter.checkedIn,
      max: Math.max(1, promoter.guestsBrought),
      tone: "violet",
    },
    progressCaption: `${promoter.checkedIn} entrés sur ${promoter.guestsBrought} annoncés · ${rate} %`,
    // Only where a transaction source exists. Otherwise the column is
    // absent rather than showing a promoter who brought in zero dirhams.
    trailing:
      hasSpendSource && promoter.revenueAttributedMad !== null
        ? {
            label: "Revenu attribué",
            metric: { value: promoter.revenueAttributedMad, format: MAD },
          }
        : undefined,
    menu: [
      {
        id: "link",
        label: "Copier le lien de partage",
        action: {
          kind: "command",
          command: "promoter.link",
          payload: { id: promoter.id, code: promoter.code },
        },
      },
      {
        id: "edit",
        label: "Modifier",
        action: {
          kind: "command",
          command: "promoter.edit",
          payload: { id: promoter.id },
        },
      },
      {
        id: "export",
        label: "Exporter le mois",
        action: {
          kind: "command",
          command: "promoter.export",
          payload: { id: promoter.id },
        },
      },
      {
        id: "toggle",
        label: promoter.active ? "Désactiver" : "Réactiver",
        destructive: promoter.active,
        action: {
          kind: "command",
          command: "promoter.setActive",
          payload: { id: promoter.id, active: !promoter.active },
        },
      },
    ],
  };
}
