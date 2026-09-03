// Service-time screens: Liste d'attente, Briefing, Calendrier.
//
// The three things a venue cannot run a service without, which is why
// they are built first. All three are phone-first: the waitlist is worked
// standing at a host stand, the briefing is read on the way to the pass,
// and the calendar is the one a manager opens on the way home.
//
// Nothing here formats money or counts covers on its own — vocabulary
// comes from the venue configuration, so a lounge says "personnes" and a
// restaurant says "couverts" without either screen branching.

import type {
  Block,
  CalendarCell,
  EntityRow,
  ScreenSpec,
  SettingRow,
} from "@/lib/dashboard/spec";
import { COUNT } from "@/lib/dashboard/formats";
import type {
  Briefing,
  BriefingGuest,
  CalendarDay,
  ServiceFloor,
  VenueConfiguration,
  WaitlistParty,
} from "@/lib/types/venue-operations";
import { configFor } from "@/lib/venue/config";
import { restaurantHref } from "./slugs";
import {
  coversIn,
  dayLabel,
  hm,
  initialsOf,
  minutesBetween,
  mobileTiles,
  shortDay,
  waitLabel,
} from "./format";

// ── Liste d'attente ──────────────────────────────────────────

const WAITLIST_STATUS: Record<
  WaitlistParty["status"],
  { label: string; tone: "warning" | "info" | "live" | "muted" }
> = {
  waiting: { label: "EN ATTENTE", tone: "warning" },
  notified: { label: "PRÉVENU", tone: "info" },
  seated: { label: "INSTALLÉ", tone: "live" },
  left: { label: "PARTI", tone: "muted" },
};

const WAITLIST_SOURCE: Record<WaitlistParty["source"], string> = {
  walk_in: "Sur place",
  app: "App",
};

const REMOVAL_REASON: Record<
  NonNullable<WaitlistParty["removalReason"]>,
  string
> = {
  parti: "Parti",
  no_show: "Ne s'est pas présenté",
  doublon: "Doublon",
};

export function buildWaitlistScreen(
  floor: ServiceFloor,
  configuration: VenueConfiguration,
): ScreenSpec {
  const config = configFor(configuration);
  const settings = floor.waitlistSettings;

  const active = floor.waitlist
    .filter((p) => p.status === "waiting" || p.status === "notified")
    // Ordered by quoted time, as the spec asks: the party promised the
    // shortest wait is the one the door owes a table to first.
    .sort(
      (a, b) =>
        Date.parse(a.addedAt) + a.quotedMinutes * 60_000 -
        (Date.parse(b.addedAt) + b.quotedMinutes * 60_000),
    );
  const closed = floor.waitlist.filter(
    (p) => p.status === "seated" || p.status === "left",
  );

  const waitingCount = active.length;
  const partiesWaiting = active.reduce((sum, p) => sum + p.partySize, 0);
  // The wait actually being served right now, not the one quoted at the
  // door an hour ago — that is the number a host repeats to the queue.
  const averageWait =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce(
            (sum, p) => sum + Math.max(0, p.quotedMinutes - minutesBetween(p.addedAt)),
            0,
          ) / active.length,
        );

  const counters: Block = {
    id: "waitlist-counters",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "parties",
        label: "Groupes en attente",
        tone: waitingCount > 0 ? "sand" : "surface",
        icon: "users",
        metric: { value: waitingCount, format: COUNT, animate: true },
        hint: coversIn(configuration, partiesWaiting),
      },
      {
        id: "average",
        label: "Attente moyenne",
        tone: averageWait > 45 ? "peach" : "surface",
        icon: "timer",
        metric: {
          value: averageWait,
          format: { kind: "duration", unit: "minutes" },
          animate: true,
        },
        hint:
          averageWait > 45
            ? "Au-dessus de trois quarts d'heure : revoyez les délais annoncés."
            : "Délai restant sur les groupes encore en attente.",
      },
      {
        id: "online",
        label: "Liste en ligne",
        tone: settings.onlineOpen ? "sage" : "rose",
        icon: settings.onlineOpen ? "door-open" : "ban",
        metric: { value: settings.onlineOpen ? "Ouverte" : "En pause" },
        hint: settings.onlineOpen
          ? `Jusqu'à ${coversIn(configuration, settings.maxPartyOnline)} par groupe`
          : settings.pausedReason || "Les groupes ne peuvent plus s'inscrire depuis l'app.",
      },
    ],
  };

  const controls: Block = {
    id: "waitlist-controls",
    type: "settings",
    heading: "La liste en ligne",
    subheading:
      "Ce que l'application propose aux clients qui veulent attendre une table.",
    banner: settings.onlineOpen
      ? undefined
      : {
          tone: "warning",
          title: "Inscriptions suspendues",
          body:
            settings.pausedReason ||
            "Personne ne peut rejoindre la liste depuis l'application.",
        },
    rows: [
      {
        id: "online-open",
        label: "Accepter les inscriptions depuis l'app",
        hint: "Coupez pendant un coup de feu ; les groupes sur place restent inscriptibles ici.",
        control: { kind: "toggle", value: settings.onlineOpen },
        command: "waitlist.settings.online",
        allow: ["owner", "admin"],
      },
      {
        id: "max-party",
        label: "Taille maximale acceptée en ligne",
        hint: "Au-delà, le groupe est renvoyé vers une demande de réservation.",
        control: { kind: "number", value: settings.maxPartyOnline, min: 1, max: 30 },
        command: "waitlist.settings.maxParty",
        allow: ["owner", "admin"],
      },
      {
        id: "default-quote",
        label: "Délai annoncé par défaut",
        hint: "Le temps proposé à un groupe qui s'inscrit sans qu'on l'ait vu.",
        control: {
          kind: "number",
          value: settings.defaultQuoteMinutes,
          min: 0,
          max: 180,
          step: 5,
          suffix: "min",
        },
        command: "waitlist.settings.defaultQuote",
        allow: ["owner", "admin"],
      },
      {
        id: "pause-reason",
        label: "Raison affichée en cas de pause",
        hint: "Montrée dans l'app à la place du bouton d'inscription.",
        control: {
          kind: "text",
          value: settings.pausedReason,
          placeholder: "Salle complète jusqu'à 22 h",
        },
        command: "waitlist.settings.pausedReason",
        allow: ["owner", "admin"],
      },
    ],
  };

  const list: Block = {
    id: "waitlist",
    type: "entity-list",
    heading: "À la porte",
    headingAction: {
      kind: "command",
      command: "waitlist.add",
      label: "Ajouter",
      icon: "user-plus",
    },
    tabs: [
      { id: "active", label: "En cours", match: { facet: "phase", values: ["active"] } },
      { id: "all", label: "Tout" },
      {
        id: "notified",
        label: "Prévenus",
        match: { facet: "status", values: ["notified"] },
      },
      { id: "closed", label: "Terminés", match: { facet: "phase", values: ["closed"] } },
    ],
    search: { placeholder: "Rechercher un nom, un téléphone…" },
    sorts: [
      { id: "quoted", label: "Heure promise", key: "quoted", direction: "asc" },
      { id: "added", label: "Ordre d'arrivée", key: "added", direction: "asc" },
      { id: "size", label: "Taille du groupe", key: "size", direction: "desc" },
    ],
    rows: [...active, ...closed].map((p) => waitlistRow(p, configuration)),
    empty: {
      title: "Personne n'attend",
      body: settings.onlineOpen
        ? "La liste en ligne est ouverte : les groupes qui s'inscrivent depuis l'app apparaîtront ici."
        : "La liste en ligne est en pause. Ajoutez un groupe à la main quand quelqu'un se présente.",
      icon: "timer",
      action: {
        kind: "command",
        command: "waitlist.add",
        label: "Ajouter un groupe",
        icon: "user-plus",
      },
    },
    noMatches: {
      title: "Aucun groupe",
      body: "Aucun groupe ne correspond à ce filtre.",
    },
  };

  return {
    slug: "liste-attente",
    title: "Liste d'attente",
    subtitle: `${config.workspaceLabel} · ${waitLabel(averageWait)} d'attente annoncée`,
    blocks: [counters, list, controls],
    // Phone lane: the list, and nothing above it. Prévenir and Installer
    // are pressed one-handed with a queue in front of the host, so the
    // first thing on screen has to be the party being seated — not three
    // counters explaining that there is a queue.
    mobileBlocks: [
      list,
      { ...counters, id: "waitlist-counters-mobile", columns: 1, tiles: mobileTiles(counters) },
      controls,
    ],
  };
}

function waitlistRow(
  party: WaitlistParty,
  configuration: VenueConfiguration,
): EntityRow {
  const status = WAITLIST_STATUS[party.status];
  const waited = minutesBetween(party.addedAt);
  const remaining = party.quotedMinutes - waited;
  const overdue = remaining < 0 && party.status !== "seated" && party.status !== "left";
  const closed = party.status === "seated" || party.status === "left";

  const meta = [
    coversIn(configuration, party.partySize),
    party.guestPhone || "sans numéro",
    `inscrit à ${hm(party.addedAt)}`,
    closed
      ? party.status === "seated"
        ? `installé à ${hm(party.seatedAt ?? party.addedAt)}`
        : REMOVAL_REASON[party.removalReason ?? "parti"]
      : overdue
        ? `promis ${waitLabel(party.quotedMinutes)} · ${waitLabel(-remaining)} de retard`
        : `${waitLabel(Math.max(0, remaining))} restantes sur ${waitLabel(party.quotedMinutes)}`,
  ].join(" · ");

  return {
    id: party.id,
    title: party.guestName,
    initials: initialsOf(party.guestName),
    meta,
    badges: [
      { label: status.label, tone: status.tone },
      { label: WAITLIST_SOURCE[party.source].toUpperCase(), tone: "neutral" },
      ...(overdue ? [{ label: "EN RETARD", tone: "danger" as const }] : []),
    ],
    facets: {
      status: party.status,
      phase: closed ? "closed" : "active",
      source: party.source,
    },
    sortKeys: {
      quoted: Date.parse(party.addedAt) + party.quotedMinutes * 60_000,
      added: Date.parse(party.addedAt),
      size: party.partySize,
    },
    keywords: party.guestPhone,
    progress: closed
      ? undefined
      : {
          value: Math.min(waited, party.quotedMinutes),
          max: Math.max(1, party.quotedMinutes),
          tone: overdue ? "ink" : "violet",
        },
    // The two door verbs, on the row rather than behind a kebab.
    actions: closed
      ? undefined
      : [
          ...(party.status === "waiting"
            ? [
                {
                  action: {
                    kind: "command" as const,
                    command: "waitlist.notify",
                    payload: { id: party.id },
                    label: "Prévenir",
                    icon: "message-square" as const,
                  },
                  variant: "secondary" as const,
                },
              ]
            : []),
          {
            action: {
              kind: "command" as const,
              command: "waitlist.seat",
              payload: { id: party.id },
              label: "Installer",
              icon: "user-check" as const,
            },
            variant: "primary" as const,
          },
        ],
    menu: closed
      ? undefined
      : [
          {
            id: "requote",
            label: "Modifier le délai",
            action: {
              kind: "command",
              command: "waitlist.requote",
              payload: { id: party.id },
            },
          },
          {
            id: "convert",
            label: "Convertir en réservation",
            action: {
              kind: "command",
              command: "waitlist.convert",
              payload: { id: party.id },
            },
          },
          {
            id: "remove",
            label: "Retirer de la liste",
            destructive: true,
            action: {
              kind: "command",
              command: "waitlist.remove",
              payload: { id: party.id },
            },
          },
        ],
  };
}

// ── Briefing ─────────────────────────────────────────────────

/**
 * The pre-service groups, in the order the team reads them.
 *
 * A guest can appear in more than one — a VIP with an allergy belongs in
 * both — because the person reading this is scanning for what will bite
 * them, not filing guests into buckets.
 */
interface BriefingGroup {
  id: string;
  heading: string;
  icon: Parameters<typeof briefingRow>[1];
  empty: string;
  guests: BriefingGuest[];
}

function briefingGroups(briefing: Briefing): BriefingGroup[] {
  const has = (g: BriefingGuest, needle: string) =>
    g.tags.some((t) => t.toLowerCase().includes(needle)) ||
    g.preferences.some((p) => p.toLowerCase().includes(needle)) ||
    (g.note ?? "").toLowerCase().includes(needle);

  return [
    {
      id: "vip",
      heading: "VIP et habitués",
      icon: "star",
      empty: "Aucun habitué attendu sur ce service.",
      guests: briefing.guests.filter(
        (g) => has(g, "vip") || has(g, "habitué") || g.visitCount >= 4,
      ),
    },
    {
      id: "allergies",
      heading: "Allergies et régimes",
      icon: "leaf",
      empty: "Aucune allergie signalée.",
      guests: briefing.guests.filter(
        (g) =>
          has(g, "allerg") ||
          has(g, "gluten") ||
          has(g, "végét") ||
          has(g, "vegan") ||
          has(g, "sans porc"),
      ),
    },
    {
      id: "occasions",
      heading: "Anniversaires et occasions",
      icon: "sparkles",
      empty: "Aucune occasion signalée.",
      guests: briefing.guests.filter(
        (g) => has(g, "anniversaire") || has(g, "occasion") || has(g, "demande en"),
      ),
    },
    {
      id: "large",
      heading: "Grandes tables",
      icon: "users",
      empty: "Aucune table de six ou plus.",
      guests: briefing.guests.filter((g) => g.partySize >= 6),
    },
    {
      id: "first",
      heading: "Première visite",
      icon: "user-plus",
      empty: "Personne ne découvre la maison ce soir.",
      guests: briefing.guests.filter((g) => g.visitCount <= 1),
    },
    {
      id: "risk",
      heading: "Historique d'absence",
      icon: "user-x",
      empty: "Aucun antécédent d'absence.",
      guests: briefing.guests.filter((g) => g.noShowCount > 0),
    },
    {
      id: "requests",
      heading: "Demandes particulières",
      icon: "message-square",
      empty: "Aucune demande en attente.",
      guests: briefing.guests.filter((g) => Boolean(g.note)),
    },
    {
      id: "deposits",
      heading: "Acomptes en attente",
      icon: "wallet",
      empty: "Tous les acomptes sont réglés.",
      guests: briefing.guests.filter(
        (g) => g.depositStatus === "demande" || g.depositStatus === "echoue",
      ),
    },
  ];
}

export function buildBriefingScreen(
  floor: ServiceFloor,
  configuration: VenueConfiguration,
): ScreenSpec {
  const briefing = floor.briefing;
  const groups = briefingGroups(briefing);

  const counts: Block = {
    id: "briefing-counts",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "covers",
        label: configFor(configuration).cover.many,
        tone: "sand",
        icon: "users",
        metric: { value: briefing.covers, format: COUNT, animate: true },
        hint: `${briefing.bookings} réservations`,
      },
      {
        id: "vips",
        label: "VIP et habitués",
        tone: "surface",
        icon: "star",
        metric: {
          value: groups.find((g) => g.id === "vip")?.guests.length ?? 0,
          format: COUNT,
          animate: true,
        },
      },
      {
        id: "allergies",
        label: "Allergies signalées",
        tone:
          (groups.find((g) => g.id === "allergies")?.guests.length ?? 0) > 0
            ? "peach"
            : "surface",
        icon: "leaf",
        metric: {
          value: groups.find((g) => g.id === "allergies")?.guests.length ?? 0,
          format: COUNT,
          animate: true,
        },
      },
      {
        id: "deposits",
        label: "Acomptes en attente",
        tone:
          (groups.find((g) => g.id === "deposits")?.guests.length ?? 0) > 0
            ? "rose"
            : "sage",
        icon: "wallet",
        metric: {
          value: groups.find((g) => g.id === "deposits")?.guests.length ?? 0,
          format: COUNT,
          animate: true,
        },
        action: {
          kind: "link",
          href: restaurantHref("acomptes"),
          label: "Voir les acomptes",
        },
      },
    ],
  };

  const notes: Block = {
    id: "shift-notes",
    type: "feed",
    heading: "Notes de service",
    subheading: "Ce que la direction veut que l'équipe sache avant l'ouverture.",
    entries: briefing.notes.map((note) => ({
      id: note.id,
      actor: note.author,
      message: note.body,
      at: note.createdAt,
      icon: note.pinned ? "flame" : "note",
      tone: note.pinned ? "warning" : "neutral",
      highlight: note.pinned,
    })),
    empty: {
      title: "Aucune note",
      body: "Ajoutez ce que l'équipe doit savoir : une rupture, un invité, une table à éviter.",
      icon: "note",
    },
  };

  const guestBlocks: Block[] = groups.map((group) => ({
    id: `briefing-${group.id}`,
    type: "entity-list" as const,
    heading: group.heading,
    rows: group.guests.map((g) => briefingRow(g, group.icon, configuration)),
    empty: { title: group.heading, body: group.empty, icon: group.icon },
  }));

  return {
    slug: "briefing",
    title: "Briefing",
    subtitle: `${briefing.serviceLabel} · ${dayLabel(`${briefing.date}T12:00:00Z`)}`,
    blocks: [
      {
        id: "briefing-head",
        type: "greeting",
        eyebrow: briefing.serviceLabel,
        title: "Avant l'ouverture,",
        emphasis: "ce que l'équipe doit savoir",
        subline: `${briefing.bookings} réservations · ${coversIn(configuration, briefing.covers)}`,
        actions: [
          {
            action: { kind: "command", command: "print", label: "Imprimer", icon: "file" },
            variant: "secondary",
          },
          {
            action: {
              kind: "command",
              command: "briefing.whatsapp",
              label: "Envoyer au groupe WhatsApp",
              icon: "message-square",
            },
            variant: "secondary",
          },
          {
            action: {
              kind: "command",
              command: "briefing.addNote",
              label: "Ajouter une note de service",
              icon: "plus",
            },
            variant: "primary",
          },
        ],
      },
      counts,
      notes,
      ...guestBlocks,
    ],
    mobileBlocks: [
      { ...counts, id: "briefing-counts-mobile", columns: 2, tiles: mobileTiles(counts) },
      notes,
      ...guestBlocks,
    ],
  };
}

function briefingRow(
  guest: BriefingGuest,
  icon: "star" | "leaf" | "sparkles" | "users" | "user-plus" | "user-x" | "message-square" | "wallet",
  configuration: VenueConfiguration,
): EntityRow {
  return {
    id: `${icon}-${guest.reservationId}`,
    title: guest.guestName,
    initials: initialsOf(guest.guestName),
    meta: [
      hm(guest.at),
      coversIn(configuration, guest.partySize),
      guest.zone ?? "zone à définir",
      guest.visitCount > 0 ? `${guest.visitCount} visites` : "première visite",
    ].join(" · "),
    badges: [
      ...guest.tags.map((t) => ({ label: t.toUpperCase(), tone: "violet" as const })),
      ...(guest.noShowCount > 0
        ? [{ label: `${guest.noShowCount} ABSENCE${guest.noShowCount > 1 ? "S" : ""}`, tone: "danger" as const }]
        : []),
      ...(guest.depositStatus === "demande"
        ? [{ label: "ACOMPTE EN ATTENTE", tone: "warning" as const }]
        : guest.depositStatus === "echoue"
          ? [{ label: "ACOMPTE ÉCHOUÉ", tone: "danger" as const }]
          : []),
    ],
    signal: guest.note ? { text: guest.note, icon: "message-square" } : undefined,
    detail: {
      title: guest.guestName,
      subtitle: `${hm(guest.at)} · ${coversIn(configuration, guest.partySize)}`,
      badges: guest.tags.map((t) => ({ label: t, tone: "violet" as const })),
      sections: [
        {
          label: "Historique",
          items: [
            { label: "Visites", metric: { value: guest.visitCount, format: COUNT } },
            { label: "Absences", metric: { value: guest.noShowCount, format: COUNT } },
          ],
        },
      ],
      notes: [
        ...guest.preferences.map((p) => ({
          label: "Préférence",
          text: p,
          icon: "leaf" as const,
        })),
        ...(guest.note ? [{ label: "Demande", text: guest.note, icon: "message-square" as const }] : []),
      ],
      actions: guest.customerId
        ? [
            {
              action: {
                kind: "link",
                href: `${restaurantHref("clients")}?client=${guest.customerId}`,
                label: "Ouvrir la fiche client",
                icon: "users",
              },
              variant: "secondary",
            },
          ]
        : undefined,
    },
  };
}

// ── Calendrier ───────────────────────────────────────────────

export function buildCalendarScreen(
  floor: ServiceFloor,
  configuration: VenueConfiguration,
): ScreenSpec {
  const config = configFor(configuration);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = floor.calendar.filter((d) => d.date >= today);

  // The quietest days ahead, which is the reason the spec puts a jump to
  // Offres on this screen: an empty Tuesday is an offer waiting to be
  // written, and it is invisible in a month grid.
  const quiet = upcoming
    .filter((d) => !d.closed && d.capacity > 0)
    .map((d) => ({ ...d, fill: d.covers / d.capacity }))
    .sort((a, b) => a.fill - b.fill)
    .slice(0, 4);

  const calendar: Block = {
    id: "calendar",
    type: "calendar",
    heading: "Charge par jour",
    subheading: `${config.cover.many} réservés sur la capacité du jour. Cliquez un jour pour l'ouvrir dans le carnet.`,
    view: "month",
    unitLabel: config.cover.many,
    cells: floor.calendar.map((day) => calendarCell(day, today)),
    headingAction: {
      kind: "link",
      href: restaurantHref("disponibilites"),
      label: "Modifier les services →",
    },
    empty: {
      title: "Rien à afficher",
      body: "Aucun service configuré. Ouvrez Disponibilités pour en créer un.",
      icon: "calendar",
    },
  };

  const quietList: Block = {
    id: "quiet-days",
    type: "entity-list",
    heading: "Services les plus creux",
    headingAction: {
      kind: "link",
      href: restaurantHref("offres"),
      label: "Créer une offre →",
    },
    rows: quiet.map((day) => ({
      id: day.date,
      title: shortDay(`${day.date}T12:00:00Z`),
      icon: "sunset" as const,
      meta: `${day.covers} / ${day.capacity} ${config.cover.many} · ${Math.round(day.fill * 100)} % de la salle`,
      progress: { value: day.covers, max: Math.max(1, day.capacity), tone: "ink" as const },
      progressCaption: `${day.capacity - day.covers} ${config.cover.many} libres`,
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

  return {
    slug: "calendrier",
    title: "Calendrier",
    subtitle: "Quatre semaines en arrière, deux mois en avant",
    blocks: [calendar, quietList],
  };
}

function calendarCell(day: CalendarDay, today: string): CalendarCell {
  const markers = [
    ...(day.closed
      ? [{ label: day.closureReason || "Fermé", tone: "muted" as const, icon: "ban" as const }]
      : []),
    ...(day.capacityOverride !== null && !day.closed
      ? [
          {
            label: day.capacityNote || "Capacité modifiée",
            tone: "info" as const,
            icon: "swap" as const,
          },
        ]
      : []),
    ...day.offerIds.slice(0, 1).map(() => ({
      label: "Offre",
      tone: "violet" as const,
      icon: "tag" as const,
    })),
    ...day.experienceIds.slice(0, 1).map(() => ({
      label: "Expérience",
      tone: "success" as const,
      icon: "sparkles" as const,
    })),
  ];

  return {
    date: day.date,
    value: day.covers,
    capacity: day.capacity,
    closed: day.closed,
    highlight: day.date === today,
    markers,
    href: `${restaurantHref("reservations")}?jour=${day.date}`,
    menu: [
      {
        id: "open",
        label: "Ouvrir le carnet du jour",
        action: {
          kind: "link",
          href: `${restaurantHref("reservations")}?jour=${day.date}`,
        },
      },
      {
        id: "capacity",
        label: "Capacité exceptionnelle",
        action: {
          kind: "command",
          command: "calendar.capacity",
          payload: { date: day.date, capacity: day.capacity },
        },
      },
      {
        id: "offer",
        label: "Créer une offre",
        action: {
          kind: "link",
          href: `${restaurantHref("offres")}?jour=${day.date}`,
        },
      },
      day.closed
        ? {
            id: "open-day",
            label: "Rouvrir la journée",
            action: {
              kind: "command",
              command: "calendar.open",
              payload: { date: day.date },
            },
          }
        : {
            id: "close-day",
            label: "Fermer la journée",
            destructive: true,
            action: {
              kind: "command",
              command: "calendar.close",
              payload: { date: day.date },
            },
          },
    ],
  };
}

/** Settings rows shared with Disponibilités, so the two cannot drift. */
export function waitlistSettingRows(floor: ServiceFloor): SettingRow[] {
  const s = floor.waitlistSettings;
  return [
    {
      id: "wl-online",
      label: "Liste d'attente en ligne",
      hint: "Les clients peuvent rejoindre la file depuis l'application.",
      control: { kind: "toggle", value: s.onlineOpen },
      command: "waitlist.settings.online",
    },
  ];
}
