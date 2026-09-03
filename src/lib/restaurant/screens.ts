// Restaurant screen specs.
//
// This module is the entire restaurant UI. Every screen under
// /restaurant is a function from the overview payload to a `ScreenSpec`;
// the renderer paints whatever comes back. There is no restaurant-shaped
// JSX anywhere in the codebase.
//
// Two properties fall out of that, and they are the point of the
// exercise:
//
//   1. Nothing is hardcoded in a component. Copy, tone, order, spans,
//      icons and CTAs are values derived from data. A slow Tuesday and a
//      sold-out Saturday produce genuinely different screens from the
//      same code path — different hero mode, different tiles, different
//      nudge — because the *spec* differs, not because a component
//      branched.
//   2. These builders are the seam. Replace the body of each with
//      `await fetch('/api/screens/...')` and the UI is server-driven with
//      no component change, because a ScreenSpec is already JSON.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  Block,
  DetailSpec,
  EntityRow,
  FeedEntry,
  KpiTile,
  ScreenSpec,
  SemanticTone,
} from "@/lib/dashboard/spec";
import type {
  GuestReview,
  MenuItem,
  Reservation,
  RestaurantOverview,
  Service,
  Zone,
} from "@/lib/types/restaurant";
import { DIETARY_TAG, PRICE_RANGE_LABEL } from "@/lib/types/restaurant";
import {
  ACTIVITY_TYPE,
  MENU_CATEGORY,
  RESERVATION_CHANNEL,
  RESERVATION_STATE,
  SERVICE_KIND,
  payoutBadge,
  reservationBadge,
  serviceBadge,
} from "./vocabulary";
import { formatValue } from "@/lib/dashboard/value";
import { buildCustomersScreen } from "./crm";
import {
  buildPerformanceScreen,
  buildReportsScreen,
  buildVisibilityScreen,
  type Comparison,
} from "./operations";
import {
  buildBriefingScreen,
  buildCalendarScreen,
  buildWaitlistScreen,
} from "./service-floor";
import {
  buildExperiencesScreen,
  buildOffersScreen,
  buildSegmentsScreen,
} from "./growth";
import {
  buildGuestListScreen,
  buildPromotersScreen,
  buildTablesScreen,
} from "./nightlife";
import {
  buildCancellationsScreen,
  buildDepositsScreen,
  buildLyfePayScreen,
} from "./payments";
import { buildCampaignsScreen } from "./marketing";
import { formsFor } from "./forms";
import {
  buildAvailabilityScreen,
  buildNotificationsScreen,
  buildSettingsScreen,
  buildSubscriptionScreen,
  buildSupportScreen,
} from "./establishment";
import { configFor } from "@/lib/venue/config";
import type { ServiceConfiguration } from "@/lib/data/repository";
import type {
  Deposit,
  Growth,
  GuestGraph,
  Marketing,
  MoneyDesk,
  Nightlife,
  ServiceFloor,
  Subscription,
  SupportTicket,
  SurveyConfig,
  VenueConfiguration,
  VenueSettings,
} from "@/lib/types/venue-operations";
import type {
  AnalyticsPeriod,
  Customer,
  NotificationPreferences,
  VenueAnalytics,
  VenueAvailability,
  VisibilityMetrics,
} from "@/lib/types/business";
import {
  RESTAURANT_SLUGS,
  type RestaurantSlug,
  isRestaurantSlug,
  restaurantHref,
} from "./slugs";
import { COUNT, MAD } from "@/lib/dashboard/formats";
import { coversIn, dayLabel, hm, initialsOf, mobileTiles, money } from "./format";

const covers = (n: number) => `${n} ${n > 1 ? "couverts" : "couvert"}`;

// ── Dashboard ────────────────────────────────────────────────

export function buildDashboardScreen(
  data: RestaurantOverview,
  floor: ServiceFloor,
  desk: MoneyDesk,
): ScreenSpec {
  const service = data.currentService;
  const inService = service.state === "open" || service.state === "peak";
  const remainingCovers = Math.max(0, service.capacity - service.bookedCovers);

  const heroBlock: Block = {
    id: "service-hero",
    type: "hero",
    // Live and pre-service are the same block with different values —
    // the "two hero modes" of the event dashboard, expressed as data.
    live: inService,
    eyebrow: inService
      ? `${SERVICE_KIND[service.kind].label.toUpperCase()} · EN COURS`
      : `${SERVICE_KIND[service.kind].label.toUpperCase()} · ${hm(service.opensAt)}`,
    title: service.label,
    subtitle: `${hm(service.opensAt)} – ${hm(service.closesAt)} · ${data.restaurant.name}`,
    ring: {
      progress: service.arrivedCovers / Math.max(1, service.capacity),
      topLabel: inService ? "Arrivés" : "Réservé",
      centerLabel: `${Math.round(
        (service.arrivedCovers / Math.max(1, service.capacity)) * 100,
      )}%`,
      bottomLabel: `${service.arrivedCovers} / ${service.capacity}`,
    },
    stats: [
      ...(desk.hasTransactionSource
        ? [
            {
              label: "Encaissé ce service",
              metric: { value: service.revenueMad, format: MAD, animate: true },
              accent: true,
            },
          ]
        : []),
      {
        label: "Couverts arrivés",
        metric: {
          value: service.arrivedCovers,
          format: COUNT,
          suffix: `/ ${service.bookedCovers}`,
          animate: true,
        },
      },
      {
        label: "Couverts disponibles",
        metric: { value: remainingCovers, format: COUNT, animate: true },
      },
    ],
    footnote: {
      // Covers, not bookings — the KPI tile beside it counts incidents,
      // and two unlabelled numbers that disagree read as a bug.
      text: `${service.bookedCovers} couverts réservés sur ${service.capacity} · ${service.noShowCovers} couverts absents.`,
      badge: {
        label: `${Math.round((service.bookedCovers / Math.max(1, service.capacity)) * 100)} % engagé`,
        tone: "violet",
      },
    },
  };

  const nudge = data.nudge;
  const nudgeBlock: Block | null = nudge
    ? {
        id: "service-nudge",
        type: "nudge",
        eyebrow: "Suggestion",
        icon: "sparkles",
        headline: nudge.headline,
        body: nudge.body,
        actions: [
          {
            action: { kind: "link", label: nudge.ctaLabel, href: nudge.href },
            allow: ["owner", "admin"],
          },
          {
            action: { kind: "command", label: "Ignorer", command: "nudge.dismiss" },
            variant: "ghost",
          },
        ],
      }
    : null;

  const greetingBlock: Block = {
    id: "greeting",
    type: "greeting",
    eyebrow: data.greeting.salutation,
    title: `${data.greeting.salutation}, ${data.greeting.firstName}.`,
    emphasis: data.greeting.clause,
    subline: data.greeting.subline,
    actions: [
      {
        action: {
          kind: "link",
          label: "Nouvelle réservation",
          href: `${restaurantHref("reservations")}?nouvelle=1`,
          icon: "plus",
        },
        allow: ["owner", "admin"],
      },
      {
        action: {
          kind: "link",
          label: "Ouvrir le carnet →",
          href: restaurantHref("reservations"),
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "link",
          label: "Liste d'attente",
          href: restaurantHref("liste-attente"),
          icon: "timer",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "link",
          label: "Briefing",
          href: restaurantHref("briefing"),
          icon: "clipboard",
        },
        variant: "ghost",
      },
    ],
  };

  const kpiBlock: Block = {
    id: "kpis",
    type: "kpi-grid",
    columns: 4,
    // Sand → white → white → sage: the bento rhythm from the direction
    // review, expressed per tile so a screen can restate it or break it.
    tiles: [
      {
        id: "covers",
        label: "Couverts aujourd'hui",
        tone: "sand",
        span: 2,
        icon: "users",
        metric: { value: data.coversToday.count, format: COUNT, animate: true },
        delta: { value: data.coversToday.deltaPctVsYesterday, period: "vs hier" },
        hint: data.coversToday.peakHourLabel,
        sparkline: data.coversToday.series24h,
      },
      // Money, so it follows the same rule as every other money tile:
      // present only where Lyfe Pay is. A venue without it sees one
      // tile fewer, not a plausible-looking zero.
      ...(desk.hasTransactionSource
        ? ([
            {
              id: "ticket",
              label: "Ticket moyen",
              tone: "surface",
              metric: { value: data.averageTicket.amountMad, format: MAD, animate: true },
              delta: {
                value: data.averageTicket.deltaPctVsLastWeek,
                period: "vs sem. dernière",
              },
            },
          ] satisfies KpiTile[])
        : []),
      {
        id: "occupancy",
        label: "Taux d'occupation",
        tone: "surface",
        icon: "gauge",
        metric: {
          value: data.occupancy.pct,
          format: { kind: "percent" },
          animate: true,
        },
        delta: {
          value: data.occupancy.deltaPctVsLastWeek,
          period: "vs sem. dernière",
        },
      },
      {
        id: "payout",
        // Money-in-three-days is an owner's question, not a question a
        // manager asks on a phone mid-service.
        surface: "desktop",
        label: "Prochain versement",
        tone: "sage",
        span: 2,
        icon: "wallet",
        metric: { value: data.nextPayout.amountMad, format: MAD, animate: true },
        chips: [
          {
            label: countdownLabel(data.nextPayout.scheduledFor),
            tone: "neutral",
          },
          {
            label: `Versé le ${format(new Date(data.nextPayout.scheduledFor), "dd MMM", { locale: fr })}`,
            tone: "muted",
          },
        ],
        action: { kind: "link", label: "Voir Lyfe Pay", href: restaurantHref("lyfe-pay") },
      },
      {
        id: "no-shows",
        label: "Absences ce service",
        tone: "surface",
        icon: "user-x",
        metric: { value: data.noShows.count, format: COUNT, animate: true },
        // Down is good here — the delta chip flips its colour, and no
        // component had to be told that absences are the bad kind.
        delta: {
          value: data.noShows.deltaPctVsLastWeek,
          period: "vs sem. dernière",
          invert: true,
        },
      },
      {
        id: "rating",
        label: "Note moyenne",
        tone: "surface",
        icon: "star",
        metric: {
          value: data.rating.average,
          format: { kind: "rating", max: 5 },
          animate: false,
        },
        hint: `${data.rating.reviewCount} avis · ${
          data.rating.deltaVsLastMonth >= 0 ? "+" : ""
        }${data.rating.deltaVsLastMonth.toFixed(1).replace(".", ",")} ce mois-ci`,
        action: { kind: "link", label: "Voir les avis", href: restaurantHref("avis") },
      },
    ],
  };

  const arrivalsBlock: Block = {
    id: "arrivals",
    type: "entity-list",
    heading: "Prochaines arrivées",
    headingAction: {
      kind: "link",
      label: "Tout voir →",
      href: restaurantHref("reservations"),
    },
    rows: data.upcomingReservations.map((r) => reservationRow(r, data.zones)),
    empty: {
      title: "Plus personne d'attendu",
      body: "Le carnet est vide pour la fin de ce service.",
      icon: "calendar",
    },
  };

  const feedBlock: Block = {
    id: "activity",
    type: "feed",
    heading: "Activité du service",
    subheading: "Dix dernières actions, en direct.",
    live: true,
    entries: data.activity.map(activityEntry),
  };

  // The attention queue: everything that needs a decision before the
  // service does. Assembled from four sources rather than four lists,
  // because "what needs me now" is one question.
  const attention: EntityRow[] = [
    ...data.upcomingReservations
      .filter((r) => r.state === "requested")
      .map((r) => ({
        id: `req-${r.id}`,
        title: r.guestName,
        initials: initialsOf(r.guestName),
        meta: `${hm(r.at)} · ${covers(r.partySize)} · demande en attente`,
        badges: [{ label: "À CONFIRMER", tone: "warning" as const }],
        facets: { queue: "requests" },
        actions: [
          {
            action: {
              kind: "command" as const,
              command: "reservation.accept",
              payload: { id: r.id },
              label: "Accepter",
              icon: "check" as const,
            },
            variant: "primary" as const,
          },
          {
            action: {
              kind: "command" as const,
              command: "reservation.refuse",
              payload: { id: r.id },
              label: "Refuser",
              icon: "ban" as const,
            },
            variant: "secondary" as const,
          },
        ],
      })),
    ...data.upcomingReservations
      .filter((r) => (r.noShowRisk ?? 0) >= 0.3 && r.state === "confirmed")
      .map((r) => ({
        id: `risk-${r.id}`,
        title: r.guestName,
        initials: initialsOf(r.guestName),
        meta: `${hm(r.at)} · ${covers(r.partySize)} · risque d'absence élevé`,
        badges: [{ label: "RISQUE ÉLEVÉ", tone: "danger" as const }],
        facets: { queue: "risk" },
        actions: [
          {
            action: {
              kind: "command" as const,
              command: "reservation.remind",
              payload: { id: r.id },
              label: "Demander une reconfirmation",
              icon: "message-square" as const,
            },
            variant: "secondary" as const,
          },
        ],
      })),
    ...desk.deposits
      .filter((d) => d.status === "echoue")
      .map((d) => ({
        id: `dep-${d.id}`,
        title: d.guestName,
        icon: "wallet" as const,
        meta: `Acompte échoué · ${d.failureReason || "paiement refusé"}`,
        badges: [{ label: "ACOMPTE ÉCHOUÉ", tone: "danger" as const }],
        facets: { queue: "deposits" },
        actions: [
          {
            action: {
              kind: "command" as const,
              command: "deposit.chase",
              payload: { id: d.id },
              label: "Relancer",
              icon: "message-square" as const,
            },
            variant: "primary" as const,
          },
        ],
      })),
    ...data.reviews
      .filter((r) => !r.replied)
      .slice(0, 3)
      .map((r) => ({
        id: `rev-${r.id}`,
        title: r.guestName,
        initials: initialsOf(r.guestName),
        meta: `Avis ${r.rating}/5 sans réponse · ${r.comment.slice(0, 70)}`,
        badges: [{ label: "AVIS SANS RÉPONSE", tone: "warning" as const }],
        facets: { queue: "reviews" },
        href: restaurantHref("avis"),
      })),
  ];

  const attentionBlock: Block = {
    id: "attention",
    type: "entity-list",
    heading: "À traiter",
    tabs: [
      { id: "all", label: "Tout" },
      { id: "requests", label: "Demandes", match: { facet: "queue", values: ["requests"] } },
      { id: "risk", label: "Risque", match: { facet: "queue", values: ["risk"] } },
      { id: "deposits", label: "Acomptes", match: { facet: "queue", values: ["deposits"] } },
      { id: "reviews", label: "Avis", match: { facet: "queue", values: ["reviews"] } },
    ],
    rows: attention,
    empty: {
      title: "Rien à traiter",
      body: "Aucune demande en attente, aucun acompte échoué, aucun avis sans réponse.",
      icon: "check",
    },
    noMatches: { title: "Rien ici", body: "Aucun élément dans cette file." },
  };

  // The next four hours, in quarter-hour arrivals. A manager reads a
  // service by when the door opens, not by a daily total.
  const bandStart = Date.now();
  const arrivalsPerQuarter = new Map<string, number>();
  for (const r of data.upcomingReservations) {
    const at = Date.parse(r.at);
    if (at < bandStart || at > bandStart + 4 * 3_600_000) continue;
    const slot = new Date(Math.floor(at / 900_000) * 900_000).toISOString();
    arrivalsPerQuarter.set(slot, (arrivalsPerQuarter.get(slot) ?? 0) + r.partySize);
  }
  const nextServiceBand: Block = {
    id: "next-service",
    type: "slot-grid",
    heading: "Les quatre prochaines heures",
    subheading: "Couverts attendus par quart d'heure, à partir de maintenant.",
    capacity: Math.max(
      1,
      Math.round(data.currentService.capacity / 16),
    ),
    capacityLabel: `${Math.max(1, Math.round(data.currentService.capacity / 16))} couverts / 15 min`,
    unitLabel: "couverts",
    slots: Array.from({ length: 16 }, (_, i) => {
      const at = new Date(Math.floor(bandStart / 900_000) * 900_000 + i * 900_000);
      return {
        label: hm(at.toISOString()),
        value: arrivalsPerQuarter.get(at.toISOString()) ?? 0,
        current: i === 0,
      };
    }),
  };

  const revenueChart: Block = {
    id: "revenue",
    type: "chart",
    heading: "Recette de la semaine",
    subheading: `${data.revenueWeek.deltaPctVsLastWeek >= 0 ? "+" : ""}${data.revenueWeek.deltaPctVsLastWeek
      .toFixed(1)
      .replace(".", ",")} % vs semaine dernière`,
    variant: "area",
    series: data.revenueWeek.series,
    valueFormat: MAD,
  };

  return {
    slug: "",
    title: "Vue d'ensemble",
    blocks: [
      {
        id: "top",
        type: "split",
        railWidth: 420,
        main: nudgeBlock ? [greetingBlock, nudgeBlock] : [greetingBlock],
        rail: [heroBlock],
      },
      attentionBlock,
      kpiBlock,
      // Operational before strategic: which half-hour is about to break
      // comes above how the week is trending.
      nextServiceBand,
      serviceLoadBlock(data),
      {
        id: "floor",
        type: "split",
        railWidth: 380,
        main: [arrivalsBlock],
        rail: [feedBlock],
      },
      ...(desk.hasTransactionSource ? [revenueChart] : []),
    ],
    // Phone lane: the floor comes first because that is what a manager
    // opens the app for mid-service. Same blocks, different order and a
    // trimmed KPI set — a layout decision, so it lives in the layout.
    mobileBlocks: [
      attentionBlock,
      heroBlock,
      ...(nudgeBlock ? [nudgeBlock] : []),
      nextServiceBand,
      { ...kpiBlock, id: "kpis-mobile", columns: 1, tiles: mobileTiles(kpiBlock) },
      { ...(serviceLoadBlock(data) as Block), id: "service-load-mobile" },
      arrivalsBlock,
      { ...feedBlock, id: "activity-mobile", entries: data.activity.slice(0, 5).map(activityEntry) },
    ],
  };
}

// ── Reservations ─────────────────────────────────────────────

export function buildReservationsScreen(
  data: RestaurantOverview,
  configuration: VenueConfiguration,
  desk: MoneyDesk,
): ScreenSpec {
  const all = [...data.upcomingReservations, ...data.waitlist];
  const requested = all.filter((r) => r.state === "requested");
  const atRisk = all.filter((r) => (r.noShowRisk ?? 0) >= 0.3);
  const vocabulary = configFor(configuration);
  const depositByReservation = new Map(
    desk.deposits
      .filter((d) => d.reservationId)
      .map((d) => [d.reservationId as string, d]),
  );

  const kpiBlock: Block = {
    id: "reservation-kpis",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "booked",
        label: `${vocabulary.cover.many.replace(/^./, (c) => c.toUpperCase())} réservés`,
        tone: "sand",
        icon: "calendar-clock",
        metric: {
          value: data.currentService.bookedCovers,
          format: COUNT,
          suffix: `/ ${data.currentService.capacity}`,
          animate: true,
        },
        hint: `${Math.round(
          (data.currentService.bookedCovers /
            Math.max(1, data.currentService.capacity)) *
            100,
        )} % de la salle engagée`,
      },
      {
        id: "arrived",
        label: "Déjà arrivés",
        tone: "surface",
        icon: "user-check",
        metric: {
          value: data.currentService.arrivedCovers,
          format: COUNT,
          animate: true,
        },
      },
      {
        id: "requested",
        label: "À confirmer",
        tone: requested.length > 0 ? "peach" : "surface",
        icon: "hourglass",
        metric: { value: requested.length, format: COUNT, animate: true },
        hint: requested.length
          ? "À traiter avant le coup de feu"
          : "Rien en attente",
      },
      {
        id: "risk",
        label: "Risque d'absence",
        tone: atRisk.length > 0 ? "rose" : "sage",
        icon: "user-x",
        metric: { value: atRisk.length, format: COUNT, animate: true },
        hint: atRisk.length
          ? "Un rappel SMS réduit le risque de moitié"
          : "Aucun risque détecté",
      },
    ],
  };

  const bookBlock: Block = {
    id: "book",
    type: "entity-list",
    heading: "Carnet du service",
    headingAction: {
      kind: "command",
      command: "reservation.create",
      label: "Nouvelle réservation",
      icon: "plus",
    },
    // One list, filtered — rather than four lists a manager has to
    // scan in turn. Counts, search and sort all derive from the rows.
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
      {
        id: "arrived",
        label: "Arrivés",
        match: { facet: "state", values: ["arrived"] },
      },
      {
        id: "waiting",
        label: "Liste d'attente",
        match: { facet: "state", values: ["waitlisted"] },
      },
      {
        id: "no_show",
        label: "No-show",
        match: { facet: "state", values: ["no_show"] },
      },
      {
        id: "cancelled",
        label: "Annulées",
        match: { facet: "state", values: ["cancelled", "rejected"] },
      },
      {
        id: "risk",
        label: "À risque",
        match: { facet: "risk", values: ["high"] },
      },
    ],
    search: { placeholder: "Rechercher un client, un téléphone, une table…" },
    sorts: [
      { id: "time", label: "Heure · tôt → tard", key: "time", direction: "asc" },
      { id: "time_desc", label: "Heure · tard → tôt", key: "time", direction: "desc" },
      { id: "party", label: "Couverts", key: "party", direction: "desc" },
      { id: "visits", label: "Fidélité", key: "visits", direction: "desc" },
      { id: "name", label: "Nom", key: "name", direction: "asc" },
    ],
    rows: all.map((r) =>
      reservationRow(r, data.zones, configuration, depositByReservation.get(r.id)),
    ),
    empty: {
      title: "Carnet vide",
      body: "Aucune table réservée sur ce service.",
      icon: "calendar",
    },
    noMatches: {
      title: "Aucune réservation",
      body: "Aucun couvert ne correspond à ce filtre.",
    },
  };

  // The day and the service, as a control rather than a heading: the
  // book is always read for one day, and the previous one is one tap
  // away all through a service.
  const dayPicker: Block = {
    id: "day",
    type: "settings",
    heading: "Journée",
    rows: [
      {
        id: "date",
        label: "Date",
        control: { kind: "date", value: data.currentService.date },
        command: "reservations.day",
      },
      {
        id: "service",
        label: vocabulary.service.one.replace(/^./, (c) => c.toUpperCase()),
        hint: `Les ${vocabulary.service.many} se définissent dans Disponibilités.`,
        control: {
          kind: "select",
          value: data.currentService.id,
          options: [{ value: data.currentService.id, label: data.currentService.label }],
        },
        command: "reservations.service",
      },
    ],
    footerActions: [
      {
        action: {
          kind: "command",
          command: "reservation.create",
          label: "Nouvelle réservation",
          icon: "plus",
        },
        variant: "primary",
      },
      {
        action: {
          kind: "command",
          command: "reservation.walkIn",
          label: vocabulary.walkInLabel,
          icon: "door-open",
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "reservations.export",
          label: "Exporter la journée",
          icon: "file",
        },
        variant: "ghost",
      },
      {
        action: { kind: "command", command: "print", label: "Imprimer", icon: "file" },
        variant: "ghost",
      },
    ],
  };

  return {
    slug: "reservations",
    title: "Réservations",
    subtitle: dayLabel(data.currentService.opensAt),
    blocks: [dayPicker, kpiBlock, serviceLoadBlock(data), bookBlock],
    // Phone lane: the book first.
    //
    // Accepting and refusing is one of the three things that has to work
    // one-handed at a host stand, and on the desktop order it sat below
    // four stacked KPI tiles — about a thousand pixels of scrolling
    // before the host could reach a decision. The figures still matter,
    // so they follow rather than disappear.
    mobileBlocks: [
      bookBlock,
      {
        ...kpiBlock,
        id: "reservation-kpis-mobile",
        columns: 1,
        tiles: mobileTiles(kpiBlock),
      },
      dayPicker,
    ],
  };
}

/**
 * Booked covers per slot against the seats the floor can turn. Shared by
 * the dashboard and the reservations screen — the same question, asked
 * from two places.
 */
function serviceLoadBlock(data: RestaurantOverview): Block {
  const service = data.currentService;
  const now = Date.now();
  // Covers the room can seat per slot, from the service window itself.
  const perSlotCapacity = Math.max(
    1,
    Math.round(service.capacity / Math.max(1, service.slotLoad.length / 2)),
  );

  return {
    id: "service-load",
    type: "slot-grid",
    heading: "Charge du service",
    subheading:
      "Couverts réservés par créneau de 30 min. La ligne marque ce que la salle peut tourner.",
    capacity: perSlotCapacity,
    capacityLabel: `${perSlotCapacity} couverts / créneau`,
    unitLabel: "couverts",
    slots: service.slotLoad.map((slot) => {
      const start = new Date(slot.at).getTime();
      return {
        label: hm(slot.at),
        value: slot.covers,
        current: now >= start && now < start + 30 * 60_000,
      };
    }),
  };
}

// ── Floor plan ───────────────────────────────────────────────

// ── Menu ─────────────────────────────────────────────────────

export function buildMenuScreen(data: RestaurantOverview): ScreenSpec {
  const visible = data.topItems.filter((i) => i.visible);
  const signature = data.topItems.filter((i) => i.signature);

  return {
    slug: "menu",
    title: "Carte",
    subtitle:
      "La carte telle que les clients la voient dans l'application LYFE.",
    blocks: [
      {
        id: "menu-kpis",
        type: "kpi-grid",
        columns: 3,
        tiles: [
          {
            id: "published",
            label: "Plats publiés",
            tone: "sand",
            icon: "utensils-crossed",
            metric: {
              value: visible.length,
              format: COUNT,
              suffix: `/ ${data.topItems.length}`,
              animate: true,
            },
            hint: "Visibles dans l'application",
          },
          {
            id: "signature",
            label: "Spécialités",
            tone: "surface",
            icon: "star",
            metric: { value: signature.length, format: COUNT, animate: true },
            hint: "Mises en avant sur la fiche",
          },
          {
            id: "range",
            label: "Gamme de prix",
            tone: "sage",
            icon: "coins",
            metric: {
              value: PRICE_RANGE_LABEL[data.restaurant.priceRange] ?? "—",
              animate: false,
            },
          },
        ],
      },
      {
        id: "menu-list",
        type: "entity-list",
        heading: "Plats",
        tabs: [
          { id: "all", label: "Tous" },
          { id: "visible", label: "Publiés", match: { facet: "visible", values: ["yes"] } },
          { id: "hidden", label: "Masqués", match: { facet: "visible", values: ["no"] } },
          { id: "signature", label: "Spécialités", match: { facet: "signature", values: ["yes"] } },
        ],
        search: { placeholder: "Rechercher un plat…" },
        rows: data.topItems.map((item) => ({
          id: item.id,
          title: item.signature ? `${item.name} ✦` : item.name,
          icon: MENU_CATEGORY[item.category].icon,
          meta: [
            MENU_CATEGORY[item.category].label,
            item.dietary.map((d) => DIETARY_TAG[d]).join(" · "),
          ]
            .filter(Boolean)
            .join(" · "),
          badges: item.visible
            ? []
            : [{ label: "MASQUÉ", tone: "muted" as const, dot: true }],
          signal: item.description
            ? { text: item.description, icon: "note" as const }
            : undefined,
          trailing: {
            label: "Prix",
            metric: { value: item.priceMad, format: MAD },
          },
          facets: {
            visible: item.visible ? "yes" : "no",
            signature: item.signature ? "yes" : "no",
          },
          keywords: item.description,
          menu: [
            {
              id: "toggle",
              label: item.visible ? "Masquer dans l'app" : "Publier dans l'app",
              action: {
                kind: "command",
                command: "menu.toggleVisible",
                payload: { id: item.id },
              },
            },
          ],
        })),
        empty: {
          title: "Carte vide",
          body: "Ajoutez un plat pour qu'il apparaisse dans l'application.",
          icon: "utensils-crossed",
        },
      },
    ],
  };
}

// ── Reviews ──────────────────────────────────────────────────

export function buildReviewsScreen(
  data: RestaurantOverview,
  survey: SurveyConfig | undefined,
): ScreenSpec {
  const unanswered = data.reviews.filter((r) => !r.replied);

  // The post-visit survey and the external redirection. Both are
  // configuration, both belong beside the reviews they produce, and
  // neither is worth a screen of its own.
  const surveyBlock: Block = {
    id: "survey",
    type: "settings",
    heading: "Sondage après visite",
    subheading:
      "Envoyé après la venue. Les clients satisfaits peuvent ensuite être invités à publier ailleurs.",
    banner: survey?.enabled
      ? undefined
      : {
          tone: "neutral",
          title: "Le sondage est désactivé",
          body: "Aucun message n'est envoyé après une visite.",
        },
    rows: [
      {
        id: "survey-enabled",
        label: "Envoyer le sondage",
        hint: "Un message court, dans l'application, après la visite.",
        control: { kind: "toggle", value: survey?.enabled ?? false },
        command: "survey.set",
        payload: { field: "enabled" },
        allow: ["owner", "admin"],
      },
      {
        id: "survey-delay",
        label: "Délai d'envoi",
        hint: "Heures après la fin du service.",
        control: { kind: "number", value: survey?.sendAfterHours ?? 3, min: 1, max: 72 },
        command: "survey.set",
        payload: { field: "sendAfterHours" },
        allow: ["owner", "admin"],
      },
      {
        id: "survey-questions",
        label: "Questions posées",
        control: {
          kind: "readonly",
          value: `${survey?.questions.length ?? 0} questions`,
        },
        command: "survey.questions",
      },
      {
        id: "redirect-rating",
        label: "Inviter à publier à partir de",
        hint: "Les clients notant au moins ce score se voient proposer Google ou Tripadvisor.",
        control: {
          kind: "select",
          value: String(survey?.redirectFromRating ?? 4),
          options: [
            { value: "4", label: "4 étoiles et plus" },
            { value: "5", label: "5 étoiles uniquement" },
          ],
        },
        command: "survey.set",
        payload: { field: "redirectFromRating" },
        allow: ["owner", "admin"],
      },
      {
        id: "google-url",
        label: "Lien Google",
        control: { kind: "text", value: survey?.googleUrl ?? "" },
        command: "survey.set",
        payload: { field: "googleUrl" },
        allow: ["owner", "admin"],
      },
      {
        id: "tripadvisor-url",
        label: "Lien Tripadvisor",
        control: { kind: "text", value: survey?.tripadvisorUrl ?? "" },
        command: "survey.set",
        payload: { field: "tripadvisorUrl" },
        allow: ["owner", "admin"],
      },
    ],
  };

  return {
    slug: "avis",
    title: "Avis",
    subtitle: `${data.rating.reviewCount} avis · note moyenne ${data.rating.average
      .toFixed(1)
      .replace(".", ",")} / 5`,
    blocks: [
      surveyBlock,
      {
        id: "review-kpis",
        type: "kpi-grid",
        columns: 3,
        tiles: [
          {
            id: "average",
            label: "Note moyenne",
            tone: "sand",
            icon: "star",
            metric: {
              value: data.rating.average,
              format: { kind: "rating", max: 5 },
              animate: false,
            },
            // The stored delta is a change in rating *points* (+0.2 of 5),
            // not a percentage. Express it against last month's average
            // rather than scaling it by ten and calling it a percent.
            delta: {
              value: ratingDeltaPct(data.rating.average, data.rating.deltaVsLastMonth),
              period: "vs mois dernier",
            },
          },
          {
            id: "count",
            label: "Avis reçus",
            tone: "surface",
            icon: "message-square",
            metric: { value: data.rating.reviewCount, format: COUNT, animate: true },
          },
          {
            id: "unanswered",
            label: "Sans réponse",
            tone: "surface",
            icon: "undo",
            metric: { value: unanswered.length, format: COUNT, animate: true },
            hint: "Répondre sous 48h double la probabilité d'un retour",
          },
        ],
      },
      {
        id: "reviews",
        type: "entity-list",
        heading: "Derniers avis",
        rows: data.reviews.map(reviewRow),
        empty: { title: "Aucun avis", body: "Les avis apparaîtront ici.", icon: "star" },
      },
    ],
  };
}

function zoneName(zones: Zone[], id?: string): string | null {
  if (!id) return null;
  return zones.find((z) => z.id === id)?.name ?? null;
}

function reservationRow(
  reservation: Reservation,
  zones: Zone[],
  configuration: VenueConfiguration = "restaurant",
  deposit?: Deposit,
): EntityRow {
  const vocabulary = configFor(configuration);
  const badges = [reservationBadge(reservation.state)];
  if (reservation.vip) badges.push({ label: "Habitué", tone: "violet", icon: "star" });
  if ((reservation.noShowRisk ?? 0) >= 0.3) {
    badges.push({ label: "Risque d'absence", tone: "warning", icon: "alert" });
  }
  // The deposit's state, on the row, because it decides whether the
  // table is really held — a booking with a failed deposit is not.
  if (deposit) {
    badges.push({
      label: `ACOMPTE ${deposit.status.toUpperCase()}`,
      tone:
        deposit.status === "paye"
          ? "success"
          : deposit.status === "echoue"
            ? "danger"
            : "warning",
      icon: "wallet",
    });
  }

  const place = [
    zoneName(zones, reservation.zoneId),
    // Source, spelled the way the configuration speaks: a bar takes
    // entries at the door, a restaurant takes walk-ins.
    reservation.channel === "walk_in"
      ? vocabulary.walkInLabel
      : RESERVATION_CHANNEL[reservation.channel],
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: reservation.id,
    title: reservation.guestName,
    initials: initialsOf(reservation.guestName),
    meta: `${hm(reservation.at)} · ${coversIn(configuration, reservation.partySize)} · ${place}`,
    badges,
    signal: reservation.note ? { text: reservation.note, icon: "note" } : undefined,
    trailing: reservation.depositMad
      ? { label: "Acompte", metric: { value: reservation.depositMad, format: MAD } }
      : {
          label: "Visites",
          metric: { value: reservation.visits, format: COUNT },
        },
    // Facets are what the tabs filter on; sortKeys what the select orders
    // by; keywords what search reaches beyond the visible text.
    facets: {
      state: reservation.state,
      channel: reservation.channel,
      risk: (reservation.noShowRisk ?? 0) >= 0.3 ? "high" : "low",
      guest: reservation.vip ? "regular" : "new",
    },
    sortKeys: {
      time: new Date(reservation.at).getTime(),
      party: reservation.partySize,
      visits: reservation.visits,
      name: reservation.guestName,
    },
    keywords: [
      reservation.guestPhone,
      reservation.note,
      zoneName(zones, reservation.zoneId),
    ]
      .filter(Boolean)
      .join(" "),
    detail: reservationDetail(reservation, zones),
    menu: reservationMenu(reservation),
  };
}

function reservationMenu(reservation: Reservation): EntityRow["menu"] {
  const items: NonNullable<EntityRow["menu"]> = [];

  // The kebab offers what the reservation's current state actually
  // allows — a seated party has nothing left to confirm.
  if (reservation.state === "requested") {
    items.push({
      id: "confirm",
      label: "Confirmer la réservation",
      action: {
        kind: "command",
        command: "reservation.confirm",
        payload: { id: reservation.id },
      },
    });
  }
  if (reservation.state !== "arrived" && reservation.state !== "completed") {
    items.push({
      id: "arrive",
      label: "Marquer comme arrivé",
      action: {
        kind: "command",
        command: "reservation.arrive",
        payload: { id: reservation.id },
      },
    });
    items.push({
      id: "remind",
      label: "Envoyer un rappel SMS",
      action: {
        kind: "command",
        command: "reservation.remind",
        payload: { id: reservation.id },
      },
    });
    // Refusing a request and a guest cancelling are different events with
    // different analytics, so they are different actions — and refusing
    // captures a coded reason.
    if (reservation.state === "requested") {
      items.push({
        id: "reject",
        label: "Refuser la demande…",
        destructive: true,
        action: {
          kind: "command",
          command: "reservation.reject",
          payload: { id: reservation.id, name: reservation.guestName },
        },
      });
    }
    items.push({
      id: "no-show",
      label: "Signaler une absence",
      destructive: true,
      action: {
        kind: "command",
        command: "reservation.noShow",
        payload: { id: reservation.id },
      },
    });
    items.push({
      id: "cancel",
      label: "Annuler la réservation",
      destructive: true,
      action: {
        kind: "command",
        command: "reservation.cancel",
        payload: { id: reservation.id },
      },
    });
  }
  return items;
}

function reservationDetail(reservation: Reservation, zones: Zone[]): DetailSpec {
  const risk = Math.round((reservation.noShowRisk ?? 0) * 100);

  return {
    title: reservation.guestName,
    subtitle: `${hm(reservation.at)} · ${covers(reservation.partySize)} · ${
      RESERVATION_CHANNEL[reservation.channel]
    }`,
    badges: [
      reservationBadge(reservation.state),
      ...(reservation.vip
        ? [{ label: "Habitué", tone: "violet" as const, icon: "star" as const }]
        : []),
    ],
    sections: [
      {
        label: "Le couvert",
        items: [
          { label: "Heure", metric: { value: hm(reservation.at) } },
          {
            label: "Personnes",
            metric: { value: reservation.partySize, format: COUNT },
          },
          {
            label: "Espace",
            metric: {
              value: zoneName(zones, reservation.zoneId) ?? "Sans préférence",
            },
          },
          {
            label: "Canal",
            metric: { value: RESERVATION_CHANNEL[reservation.channel] },
          },
        ],
      },
      {
        label: "Le client",
        items: [
          { label: "Téléphone", metric: { value: reservation.guestPhone } },
          {
            label: "Visites",
            metric: { value: reservation.visits, format: COUNT },
          },
          ...(reservation.depositMad
            ? [
                {
                  label: "Acompte versé",
                  metric: { value: reservation.depositMad, format: MAD },
                },
              ]
            : []),
          {
            label: "Risque d'absence",
            metric: { value: risk, format: { kind: "percent" as const } },
          },
        ],
      },
    ],
    notes: reservation.note
      ? [{ label: "Note de salle", text: reservation.note, icon: "note" }]
      : undefined,
    actions: [
      {
        action: {
          kind: "command",
          label: "Marquer comme arrivé",
          command: "reservation.arrive",
          payload: { id: reservation.id },
          icon: "user-check",
        },
        allow: ["owner", "admin"],
      },
      {
        action: {
          kind: "command",
          label: "Rappel SMS",
          command: "reservation.remind",
          payload: { id: reservation.id },
        },
        variant: "secondary",
      },
    ],
  };
}

function reviewRow(review: GuestReview): EntityRow {
  return {
    id: review.id,
    title: review.guestName,
    initials: initialsOf(review.guestName),
    meta: `${format(new Date(review.at), "dd MMM · HH'h'mm", { locale: fr })} · ${review.channel.toUpperCase()}`,
    badges: [
      {
        label: `${review.rating} / 5`,
        tone: review.rating >= 4 ? "success" : review.rating >= 3 ? "warning" : "danger",
        icon: "star",
      },
      ...(review.replied
        ? []
        : [{ label: "Sans réponse", tone: "muted" as const }]),
    ],
    signal: { text: review.comment, icon: "message-square" },
    menu: [
      {
        id: "reply",
        label: "Répondre",
        action: { kind: "command", command: "review.reply", payload: { id: review.id } },
      },
    ],
  };
}

function serviceRow(service: Service): EntityRow {
  const kind = SERVICE_KIND[service.kind];
  return {
    id: service.id,
    title: service.label,
    icon: kind.icon,
    meta: `${dayLabel(service.opensAt)} · ${hm(service.opensAt)} – ${hm(service.closesAt)}`,
    badges: [serviceBadge(service.state)],
    progress: { value: service.bookedCovers, max: service.capacity },
    progressCaption: `${service.bookedCovers} / ${service.capacity} · ${Math.round(
      (service.bookedCovers / Math.max(1, service.capacity)) * 100,
    )}%`,
    trailing:
      service.revenueMad > 0
        ? { label: "Recette", metric: { value: service.revenueMad, format: MAD } }
        : undefined,
    href: `${restaurantHref("calendrier")}?service=${service.id}`,
  };
}

function activityEntry(
  item: RestaurantOverview["activity"][number],
): FeedEntry {
  const term = ACTIVITY_TYPE[item.type];
  return {
    id: item.id,
    actor: item.actor,
    message: item.message,
    at: item.at,
    icon: term.icon,
    tone: term.tone,
    highlight: item.needsAttention,
    href: item.reservationId
      ? `${restaurantHref("reservations")}?res=${item.reservationId}`
      : item.type === "review_received"
        ? restaurantHref("avis")
        : undefined,
  };
}

// ── Derivations ──────────────────────────────────────────────

function countdownLabel(iso: string): string {
  const days = Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  if (days === 0) return "aujourd'hui";
  return days === 1 ? "dans 1 jour" : `dans ${days} jours`;
}

/** A rating change in points, as a percentage of last month's average. */
function ratingDeltaPct(average: number, deltaPoints: number): number {
  const previous = average - deltaPoints;
  if (previous <= 0) return 0;
  return Number(((deltaPoints / previous) * 100).toFixed(1));
}

// ── Registry ─────────────────────────────────────────────────

/**
 * What a builder is given.
 *
 * The service payload and the establishment's configuration are always
 * present — the second because vocabulary depends on it and every screen
 * uses vocabulary. Everything else is optional, because fetching all
 * twelve slices to render one screen would cost twelve reads for a
 * screen that wanted two. `SCREEN_NEEDS` says which slug needs which.
 */
export interface ScreenContext {
  overview: RestaurantOverview;
  configuration: VenueConfiguration;
  customers?: Customer[];
  analytics?: VenueAnalytics;
  visibility?: VisibilityMetrics;
  availability?: VenueAvailability;
  serviceFloor?: ServiceFloor;
  guestGraph?: GuestGraph;
  growth?: Growth;
  nightlife?: Nightlife;
  money?: MoneyDesk;
  marketing?: Marketing;
  serviceConfig?: ServiceConfiguration;
  survey?: SurveyConfig;
  settings?: VenueSettings;
  subscription?: Subscription;
  support?: SupportTicket[];
  spendByCustomer?: Record<string, number>;
  notificationPreferences?: NotificationPreferences;
  profile?: import("@/lib/types/restaurant").RestaurantProfile | null;
  photoCount?: number;
  period?: AnalyticsPeriod;
  comparison?: Comparison;
}

export type ScreenDataNeed =
  | "customers"
  | "analytics"
  | "visibility"
  | "availability"
  | "serviceFloor"
  | "guestGraph"
  | "growth"
  | "nightlife"
  | "money"
  | "marketing"
  | "serviceConfig"
  | "survey"
  | "settings"
  | "subscription"
  | "support"
  | "spend"
  | "profile"
  | "notificationPrefs";

/**
 * The screens that are forms rather than specs.
 *
 * Photo reordering, drag-and-drop and file upload are not blocks, and
 * inventing a block type per field would be worse than a page. They keep
 * their own routes; excluding them here is what keeps the registry below
 * a total map, so a missing builder stays a compile error.
 */
export const FORM_ROUTE_SLUGS = [
  "ma-fiche",
  "menu",
  "equipe",
  "check-in",
] as const;

export type FormRouteSlug = (typeof FORM_ROUTE_SLUGS)[number];
export type SpecSlug = Exclude<RestaurantSlug, FormRouteSlug>;

export function isFormRoute(slug: string): slug is FormRouteSlug {
  return (FORM_ROUTE_SLUGS as readonly string[]).includes(slug);
}

/** Which extra slices each screen requires. */
export const SCREEN_NEEDS: Record<SpecSlug, ScreenDataNeed[]> = {
  "": ["serviceFloor", "money"],
  reservations: ["money"],
  calendrier: ["serviceFloor", "growth"],
  "liste-attente": ["serviceFloor"],
  briefing: ["serviceFloor"],
  clients: ["customers", "guestGraph", "spend"],
  segments: ["guestGraph", "money"],
  avis: ["survey"],
  visibilite: ["visibility", "profile"],
  offres: ["growth"],
  experiences: ["growth"],
  "guest-list": ["nightlife"],
  tables: ["nightlife", "money"],
  promoteurs: ["nightlife", "money"],
  acomptes: ["money"],
  annulations: ["money"],
  "lyfe-pay": ["money"],
  performance: ["analytics", "money", "serviceFloor"],
  bilans: ["analytics", "money"],
  campagnes: ["marketing"],
  disponibilites: ["serviceConfig", "availability"],
  notifications: ["marketing", "notificationPrefs"],
  parametres: ["settings"],
  abonnement: ["subscription"],
  support: ["support"],
};

/** Adapts a builder that only needs the service payload. */
const fromOverview =
  (build: (data: RestaurantOverview) => ScreenSpec) =>
  (ctx: ScreenContext): ScreenSpec =>
    build(ctx.overview);

/** An empty bundle, so a builder never has to guard for one. */
const EMPTY_FLOOR: ServiceFloor = {
  waitlist: [],
  waitlistSettings: {
    onlineOpen: false,
    maxPartyOnline: 0,
    defaultQuoteMinutes: 0,
    pausedReason: "",
    updatedAt: new Date().toISOString(),
  },
  briefing: {
    serviceId: null,
    serviceLabel: "Prochain service",
    date: new Date().toISOString().slice(0, 10),
    covers: 0,
    bookings: 0,
    guests: [],
    notes: [],
  },
  calendar: [],
};

const EMPTY_MONEY: MoneyDesk = {
  depositPolicies: [],
  deposits: [],
  cancellationPolicy: {
    freeUntilHours: 24,
    lateFeeMad: 0,
    noShowFeeMad: 0,
    guestMessage: "",
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  cancellations: [],
  transactions: [],
  hasTransactionSource: false,
};

const EMPTY_GRAPH: GuestGraph = { tags: [], rules: [], segments: [], tagsByCustomer: {} };
const EMPTY_GROWTH: Growth = { offers: [], experiences: [] };
const EMPTY_NIGHTLIFE: Nightlife = {
  guestLists: [],
  promoters: [],
  tableTypes: [],
  tableReservations: [],
};
const EMPTY_MARKETING: Marketing = {
  campaigns: [],
  messages: [],
  suppressions: [],
  consent: { optedIn: 0, optedOut: 0, suppressed: 0 },
};

export const RESTAURANT_SCREENS: Record<
  SpecSlug,
  (ctx: ScreenContext) => ScreenSpec
> = {
  // 1. Aujourd'hui
  "": (ctx) =>
    buildDashboardScreen(ctx.overview, ctx.serviceFloor ?? EMPTY_FLOOR, ctx.money ?? EMPTY_MONEY),
  reservations: (ctx) =>
    buildReservationsScreen(ctx.overview, ctx.configuration, ctx.money ?? EMPTY_MONEY),
  calendrier: (ctx) =>
    buildCalendarScreen(ctx.serviceFloor ?? EMPTY_FLOOR, ctx.configuration),

  // 2. En service
  "liste-attente": (ctx) =>
    buildWaitlistScreen(ctx.serviceFloor ?? EMPTY_FLOOR, ctx.configuration),
  briefing: (ctx) =>
    buildBriefingScreen(ctx.serviceFloor ?? EMPTY_FLOOR, ctx.configuration),

  // 3. Clients
  clients: (ctx) =>
    buildCustomersScreen(
      ctx.customers ?? [],
      ctx.overview.reviews,
      ctx.guestGraph ?? EMPTY_GRAPH,
      ctx.spendByCustomer ?? {},
    ),
  segments: (ctx) =>
    buildSegmentsScreen(
      ctx.guestGraph ?? EMPTY_GRAPH,
      (ctx.money ?? EMPTY_MONEY).hasTransactionSource,
    ),

  // 4. Ma présence
  avis: (ctx) => buildReviewsScreen(ctx.overview, ctx.survey),

  // 5. Croissance
  visibilite: (ctx) =>
    buildVisibilityScreen(
      ctx.visibility,
      ctx.period ?? "30d",
      ctx.profile ?? null,
      ctx.photoCount ?? 0,
      replyRateOf(ctx.overview),
      ctx.analytics?.noShowRate ?? 0,
    ),
  offres: (ctx) => buildOffersScreen(ctx.growth ?? EMPTY_GROWTH, ctx.configuration),
  experiences: (ctx) => buildExperiencesScreen(ctx.growth ?? EMPTY_GROWTH),

  // 6. Vie nocturne
  "guest-list": (ctx) => buildGuestListScreen(ctx.nightlife ?? EMPTY_NIGHTLIFE),
  tables: (ctx) =>
    buildTablesScreen(
      ctx.nightlife ?? EMPTY_NIGHTLIFE,
      (ctx.money ?? EMPTY_MONEY).hasTransactionSource,
    ),
  promoteurs: (ctx) =>
    buildPromotersScreen(
      ctx.nightlife ?? EMPTY_NIGHTLIFE,
      (ctx.money ?? EMPTY_MONEY).hasTransactionSource,
    ),

  // 7. Paiements
  acomptes: (ctx) => buildDepositsScreen(ctx.money ?? EMPTY_MONEY),
  annulations: (ctx) => buildCancellationsScreen(ctx.money ?? EMPTY_MONEY),
  "lyfe-pay": (ctx) =>
    buildLyfePayScreen(ctx.money ?? EMPTY_MONEY, ctx.overview.payouts),

  // 8. Pilotage
  performance: (ctx) =>
    buildPerformanceScreen(
      ctx.analytics,
      ctx.period ?? "30d",
      ctx.comparison ?? "previous",
      ctx.money,
      (ctx.serviceFloor ?? EMPTY_FLOOR).calendar,
      ctx.configuration,
    ),
  bilans: (ctx) => buildReportsScreen(ctx.analytics, ctx.money, ctx.configuration),
  campagnes: (ctx) => buildCampaignsScreen(ctx.marketing ?? EMPTY_MARKETING),

  // 9. Établissement
  disponibilites: (ctx) =>
    buildAvailabilityScreen(ctx.serviceConfig, ctx.availability, ctx.configuration),
  notifications: (ctx) =>
    buildNotificationsScreen(
      ctx.notificationPreferences,
      (ctx.marketing ?? EMPTY_MARKETING).messages,
    ),

  // 10. Compte
  parametres: (ctx) =>
    buildSettingsScreen(
      ctx.settings ?? {
        configuration: ctx.configuration,
        legalName: "",
        ice: "",
        rc: "",
        billingAddress: "",
        iban: "",
        language: "fr",
        timezone: "Africa/Casablanca",
        consentText: "",
        retentionMonths: 36,
        googlePlaceUrl: "",
        instagramHandle: "",
        whatsappNumber: "",
        dressCode: "",
        minimumAge: 0,
        apiAccessEnabled: false,
      },
    ),
  abonnement: (ctx) =>
    buildSubscriptionScreen(
      ctx.subscription ?? {
        plan: "annual",
        status: "actif",
        trialEndsAt: null,
        renewsAt: null,
        priceMad: 0,
        paymentMethod: "",
        invoices: [],
        usage: { reservations: 0, guests: 0, messagesSent: 0, campaigns: 0 },
      },
    ),
  support: (ctx) => buildSupportScreen(ctx.support ?? []),
};

/** Share of reviews the venue has answered. Feeds the ranking checklist. */
function replyRateOf(data: RestaurantOverview): number {
  const total = data.reviews.length;
  if (total === 0) return 100;
  return (data.reviews.filter((r) => r.replied).length / total) * 100;
}

export function buildScreen(slug: string, ctx: ScreenContext): ScreenSpec | null {
  if (!isRestaurantSlug(slug) || isFormRoute(slug)) return null;
  const spec = RESTAURANT_SCREENS[slug](ctx);
  // The dialogs this screen's buttons open, attached to the payload.
  // A button whose command has no form and no handler still says so —
  // there are no buttons that quietly do nothing.
  return { ...spec, forms: formsFor(spec) };
}

/**
 * Slug lookup for routing and metadata. Deliberately does not build a
 * spec — a title should not cost a database read.
 */
export function restaurantScreenTitle(slug: string): string | null {
  return isRestaurantSlug(slug) ? SCREEN_TITLES[slug] : null;
}

export const SCREEN_TITLES: Record<RestaurantSlug, string> = {
  "": "Accueil",
  reservations: "Réservations",
  calendrier: "Calendrier",
  "liste-attente": "Liste d'attente",
  "check-in": "Check-in",
  briefing: "Briefing",
  clients: "Liste clients",
  segments: "Tags et segments",
  "ma-fiche": "Ma fiche",
  menu: "Menu",
  avis: "Avis",
  visibilite: "Visibilité",
  offres: "Offres",
  experiences: "Expériences",
  "guest-list": "Guest list",
  tables: "Tables minimums",
  promoteurs: "Promoteurs",
  acomptes: "Acomptes",
  annulations: "Annulations",
  "lyfe-pay": "Lyfe Pay",
  performance: "Performance",
  bilans: "Bilans",
  campagnes: "Campagnes",
  disponibilites: "Disponibilités",
  equipe: "Équipe et rôles",
  notifications: "Notifications",
  parametres: "Paramètres",
  abonnement: "Abonnement",
  support: "Support",
};

export function restaurantScreenSlugs(): readonly string[] {
  return RESTAURANT_SLUGS;
}
