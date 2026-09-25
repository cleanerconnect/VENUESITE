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
  CtaAction,
  EntityRow,
  FeedEntry,
  FilterTab,
  KpiTile,
  ScreenSpec,
  SemanticTone,
} from "@/lib/dashboard/spec";
import type {
  DayBook,
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
  reservationBand,
  serviceBadge,
} from "./vocabulary";
import { formatValue } from "@/lib/dashboard/value";
import { buildCustomersScreen } from "./crm";
import { buildAudienceScreen } from "./audience";
import type { AudienceInsights } from "@/lib/types/venue-operations";
import { emptyAudience } from "@/lib/types/venue-operations";
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
import {
  configFor,
  coverAgreement,
  coverLabel,
  coverNoun,
} from "@/lib/venue/config";
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
  type Lot,
  type RestaurantSlug,
  isRestaurantSlug,
  restaurantHref,
} from "./slugs";
import { COUNT, MAD } from "@/lib/dashboard/formats";
import { coversIn, dayLabel, hm, inWords, initialsOf, mobileTiles, money, openSentence } from "./format";

/**
 * The venue's word for a booked head.
 *
 * Takes the configuration rather than assuming a restaurant: this used
 * to be a private literal, which is exactly how a lounge ended up
 * counting "couverts" on its own home screen.
 */
const covers = coversIn;

// ── Dashboard ────────────────────────────────────────────────

/**
 * The rows one service's book holds, out of the day handed to a screen.
 *
 * Accueil and Réservations both lead with the service resolved from the
 * clock, and both used to count their tiles off something else — the
 * day's array, the door's queue, or the counters on the `services` row.
 * One definition, read from both, is what stops the same room being
 * three different percentages full on two screens a tap apart.
 */
function serviceBook(reservations: Reservation[], service: Service): Reservation[] {
  const opens = new Date(service.opensAt).getTime();
  const closes = new Date(service.closesAt).getTime();
  return reservations.filter((r) => {
    // A booking written against the live service names it. One taken for
    // a day still ahead has no service row to name yet, so it is placed
    // by the only thing it does carry: the time it asked for.
    if (r.serviceId) return r.serviceId === service.id;
    const at = new Date(r.at).getTime();
    return at >= opens && at <= closes;
  });
}

/**
 * How far the book can be walked.
 *
 * The same window `db/snapshot.mjs` captures, so the static driver can
 * answer for every date the picker offers. A wider picker would hand a
 * reviewer an empty screen and no way to tell that from a quiet day.
 */
const BOOK_DAYS_BACK = 7;
const BOOK_DAYS_AHEAD = 30;

/** `yyyy-MM-dd` in the venue's own calendar, not UTC. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Shift a `yyyy-MM-dd` by whole days, staying on the calendar grid. */
function shiftDay(date: string, by: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + by);
  return isoDay(d);
}

/**
 * Which service a walked-to day opens on.
 *
 * The named one when the partner picked it, otherwise the first that
 * actually holds bookings — a venue serving lunch and dinner takes
 * almost all of its forward bookings for dinner, and opening on an empty
 * lunch reads as a day with nothing in it.
 */
function pickService(book: DayBook, serviceId?: string): Service | undefined {
  if (serviceId) {
    const named = book.services.find((s) => s.id === serviceId);
    if (named) return named;
  }
  const busiest = book.services.find(
    (s) => serviceBook(book.reservations, s).length > 0,
  );
  return busiest ?? book.services[0];
}

/**
 * A stand-in for a date the venue does not open on.
 *
 * Shaped like a service so every figure beside the book divides by
 * something, and zeroed so none of them claims a house that is not
 * opening.
 */
function closedService(shape: Service, date: string): Service {
  return {
    ...shape,
    id: `closed@${date}`,
    label: "Fermé",
    date,
    opensAt: `${date}T00:00:00.000Z`,
    closesAt: `${date}T00:00:00.000Z`,
    state: "closed",
    capacity: 0,
    bookedCovers: 0,
    arrivedCovers: 0,
    noShowCovers: 0,
    revenueMad: 0,
    slotLoad: [],
  };
}

/**
 * Covers holding a table, counted off those rows.
 *
 * A request holds nothing until someone accepts it — the "À confirmer"
 * tile counts those — and a party marked absent has left the book, which
 * is the difference between this and `service.bookedCovers`: that figure
 * is this plus `noShowCovers`, which is what the no-show rate divides by.
 */
function heldCovers(reservations: Reservation[]): number {
  return reservations
    .filter((r) => r.state === "confirmed" || r.state === "arrived")
    .reduce((n, r) => n + r.partySize, 0);
}

export function buildDashboardScreen(
  data: RestaurantOverview,
  floor: ServiceFloor,
  desk: MoneyDesk,
  configuration: VenueConfiguration,
  lot: Lot = 2,
): ScreenSpec {
  const lot1 = lot === 1;
  const vocabulary = configFor(configuration);
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
        label: coverLabel(vocabulary, "arrivé"),
        metric: {
          value: service.arrivedCovers,
          format: COUNT,
          suffix: `/ ${service.bookedCovers}`,
          animate: true,
        },
      },
      {
        label: `${coverNoun(vocabulary)} disponibles`,
        metric: { value: remainingCovers, format: COUNT, animate: true },
      },
    ],
    footnote: {
      // Covers, not bookings — the KPI tile beside it counts incidents,
      // and two unlabelled numbers that disagree read as a bug.
      text: `${covers(configuration, service.bookedCovers)} ${coverAgreement(
        vocabulary,
        "réservé",
      )} sur ${service.capacity} · ${covers(
        configuration,
        service.noShowCovers,
      )} ${coverAgreement(vocabulary, "absent")}.`,
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

  // The three groups below are the screen, and the greeting says in one
  // sentence what they add up to — so their counts are taken here,
  // before the card that reports them.
  const dayRowsForGreeting = data.upcomingReservations;
  const pendingCount = dayRowsForGreeting.filter((r) => r.state === "requested").length;
  const arrivedCount = dayRowsForGreeting.filter((r) => r.state === "arrived").length;
  const totalCount = dayRowsForGreeting.length;
  const hostSubline = [
    totalCount === 0
      ? "Aucune réservation aujourd'hui"
      : `${openSentence(inWords(totalCount))} ${
          totalCount === 1 ? "réservation" : "réservations"
        } aujourd'hui`,
    pendingCount === 0
      ? "rien en attente de réponse"
      : `${inWords(pendingCount)} en attente de réponse`,
    arrivedCount === 0
      ? "personne encore arrivé"
      : `${inWords(arrivedCount)} déjà ${arrivedCount === 1 ? "arrivée" : "arrivées"}`,
  ].join(", ") + ".";

  const greetingBlock: Block = {
    id: "greeting",
    type: "greeting",
    // Both home screens are the same card: the salutation as an eyebrow,
    // the salutation again as the headline's lead, and the serif italic
    // clause after it. It is the house gesture on the event Overview and
    // it is the house gesture here — a partner who holds both should not
    // meet two different products.
    eyebrow: data.greeting.salutation,
    title: `${data.greeting.salutation}, ${data.greeting.firstName}.`,
    emphasis: data.greeting.clause,
    // The store composes one subline for both lots, because the payload
    // is lot-agnostic by design. Lot 1 writes its own: the store's names
    // a waitlist and a remaining capacity, and Liste d'attente and
    // Pilotage are both Lot 2 — a count of people queueing is no use on
    // a dashboard with nowhere to work the queue. What a basique
    // dashboard can answer is the three groups underneath, in words.
    subline: lot1 ? hostSubline : data.greeting.subline,
    // The shortcuts the specification names are Nouvelle réservation,
    // Liste d'attente and Briefing — all three Lot 2. Under Lot 1 the
    // greeting keeps the one shortcut that lands somewhere: the carnet.
    actions: lot1
      ? [
          {
            action: {
              kind: "link",
              label: "Ouvrir le carnet",
              href: restaurantHref("reservations"),
              icon: "book",
            },
            variant: "primary",
          },
          // Two shortcuts side by side, filled then outlined, the way
          // the event Overview pairs Créer un événement with Voir tous
          // les événements. The second one is the door: a host reading
          // this screen is either about to open the book or about to
          // take an arrival.
          {
            action: {
              kind: "link",
              label: "Check-in",
              href: restaurantHref("check-in"),
              icon: "user-check",
            },
            variant: "secondary",
          },
        ]
      : [
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
        label: `${coverNoun(vocabulary)} aujourd'hui`,
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
              // A seven-day average in a grid whose other tiles are
              // today's. Two scopes on one screen, so both say so.
              hint: "7 derniers jours",
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
        // The spec asks Accueil for the occupancy of the service in
        // hand, and the hero three lines above already draws that
        // service. A seven-day average here disagreed with it on every
        // screen — same word, different question.
        metric: {
          value: Math.round(
            (service.bookedCovers / Math.max(1, service.capacity)) * 100,
          ),
          format: { kind: "percent" },
          animate: true,
        },
        hint: service.label,
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
        // Counted over this service, like the label says and like the
        // footnote under the hero. The week-over-week delta that used to
        // sit here was measured over whole days, so the tile carried one
        // scope in its label and another in its chip.
        hint: service.label,
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
        // The delta is dropped rather than shown as a full-value jump
        // when nothing was reviewed before this month: "+4,3 ce mois-ci"
        // on a 4,3 average is the absence of a baseline, not a rise.
        hint:
          data.rating.deltaVsLastMonth === null
            ? `${data.rating.reviewCount} avis · premier mois d'avis`
            : `${data.rating.reviewCount} avis · ${
                data.rating.deltaVsLastMonth >= 0 ? "+" : ""
              }${data.rating.deltaVsLastMonth.toFixed(1).replace(".", ",")} ce mois-ci`,
        action: { kind: "link", label: "Voir les avis", href: restaurantHref("avis") },
      },
    ],
  };

  const arrivalsBlock: Block = {
    id: "arrivals",
    type: "entity-list",
    // Lot 1 asks Accueil for the day's reservations; the full screen
    // asks it for what is still to come, because it has a carnet, a
    // band and a load chart carrying the rest of the day already.
    heading: lot1 ? "Réservations du jour" : "Prochaines arrivées",
    // "Tout voir" under Lot 1 would point at a list that is already all
    // of it; the greeting's own button opens the carnet to work it.
    headingAction: lot1
      ? undefined
      : {
          kind: "link",
          label: "Tout voir →",
          href: restaurantHref("reservations"),
        },
    // Still expected, which is what the heading says: a party already
    // seated is not an arrival to come, and the whole carnet — seated
    // parties included — is one tap away behind "Tout voir".
    // Lot 1 shows the whole day rather than the first six of it: this is
    // the only list the basique dashboard puts on Accueil, and the
    // sentence above counts the same rows.
    rows: (lot1
      ? data.upcomingReservations
      : data.upcomingReservations
          .filter((r) => r.state !== "arrived" && Date.parse(r.at) >= Date.now())
          .slice(0, 6)
    ).map((r) => reservationRow(r, data.zones, configuration, undefined, lot)),
    empty: lot1
      ? {
          title: "Aucune réservation aujourd'hui",
          body: "Le carnet du jour est vide.",
          icon: "calendar",
        }
      : {
          title: "Plus personne d'attendu",
          body: "Le carnet est vide pour la fin de ce service.",
          icon: "calendar",
        },
  };

  // ── Accueil, under host density ──────────────────────────────
  //
  // One list of "Réservations du jour" asked the host to do the sorting:
  // the request needing a decision sat between two confirmed bookings
  // and looked like them. Three groups, in the order the work happens.
  //
  //   1  À traiter          — a request is the only thing that goes
  //                           stale. Accepter and refuser are on the row
  //                           and never behind a hover or a kebab.
  //   2  Prochaines arrivées — confirmed, not yet in the room, by time.
  //                           Check-in and absent on the row.
  //   3  Arrivés            — done. A count and an expand, because a
  //                           seated party needs no decision and the
  //                           space belongs to the two groups above.
  const dayRows = data.upcomingReservations;
  const hostRow = (r: Reservation) =>
    reservationRow(r, data.zones, configuration, undefined, lot, true);
  const byTime = (a: Reservation, b: Reservation) =>
    Date.parse(a.at) - Date.parse(b.at);

  const toHandle = dayRows.filter((r) => r.state === "requested").sort(byTime);
  const expected = dayRows.filter((r) => r.state === "confirmed").sort(byTime);
  const seated = dayRows.filter((r) => r.state === "arrived").sort(byTime);

  const toHandleBlock: Block = {
    id: "to-handle",
    type: "entity-list",
    heading: "À traiter",
    subheading:
      toHandle.length > 0
        ? "Ces clients attendent une réponse."
        : "Rien en attente de décision.",
    rows: toHandle.map(hostRow),
    empty: {
      title: "Rien à traiter",
      body: "Aucune demande n'attend de réponse.",
      icon: "check",
    },
  };

  const expectedBlock: Block = {
    id: "expected",
    type: "entity-list",
    heading: "Prochaines arrivées",
    subheading: "Confirmées, pas encore en salle.",
    rows: expected.map(hostRow),
    empty: {
      title: "Personne d'attendu",
      body: "Aucune table confirmée à venir aujourd'hui.",
      icon: "calendar",
    },
  };

  const seatedBlock: Block = {
    id: "seated",
    type: "entity-list",
    heading: "Arrivés",
    // Collapsed by default: the work is done, and the count is the only
    // thing a host needs from it mid-service.
    collapsible: { summary: `${seated.length} ${seated.length === 1 ? "table installée" : "tables installées"}` },
    rows: seated.map(hostRow),
    empty: {
      title: "Personne encore arrivé",
      body: "Les clients installés apparaîtront ici.",
      icon: "user-check",
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
        meta: `${hm(r.at)} · ${covers(configuration, r.partySize)} · demande en attente`,
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
        meta: `${hm(r.at)} · ${covers(configuration, r.partySize)} · risque d'absence élevé`,
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
    // Acomptes is a Lot 2 screen, so a failed deposit has nowhere to be
    // resolved under Lot 1 and does not join the queue.
    ...(lot1 ? [] : desk.deposits.filter((d) => d.status === "echoue")).map((d) => ({
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
      ...(lot1
        ? []
        : [{ id: "deposits", label: "Acomptes", match: { facet: "queue", values: ["deposits"] } }]),
      { id: "reviews", label: "Avis", match: { facet: "queue", values: ["reviews"] } },
    ],
    rows: attention,
    empty: {
      title: "Rien à traiter",
      body: lot1
        ? "Aucune demande en attente, aucun avis sans réponse."
        : "Aucune demande en attente, aucun acompte échoué, aucun avis sans réponse.",
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
    subheading: `${coverLabel(
      vocabulary,
      "attendu",
    )} par quart d'heure, à partir de maintenant.`,
    capacity: Math.max(
      1,
      Math.round(data.currentService.capacity / 16),
    ),
    capacityLabel: `${Math.max(1, Math.round(data.currentService.capacity / 16))} ${vocabulary.cover.many} / 15 min`,
    unitLabel: vocabulary.cover.many,
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

  // Accueil, under « Gestion des reservation uniquement ».
  //
  // Planning V3's Prio 02 row buys the booking work and names nothing
  // else, so this screen is the day's book and the sentence above it.
  // The three numbers went with the rest of Pilotage; the attention
  // queue went with them, because two of its four sources — a risk
  // score and an unanswered review — are readings the basique dashboard
  // does not produce, and the decision the other two ask for is taken
  // on Réservations, on the row itself.
  if (lot1) {
    const groups = [toHandleBlock, expectedBlock, seatedBlock];
    return {
      slug: "",
      title: "Vue d'ensemble",
      blocks: [greetingBlock, ...groups],
      mobileBlocks: [greetingBlock, ...groups],
    };
  }

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
      serviceLoadBlock(data, configuration),
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
      { ...(serviceLoadBlock(data, configuration) as Block), id: "service-load-mobile" },
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
  lot: Lot = 2,
  /**
   * The day being shown, when it is not today.
   *
   * A restaurant takes tomorrow's bookings all through tonight's
   * service, so the book has to be walkable. Today still comes from the
   * overview — the live service with its engine counters — and any other
   * day comes from here, resolved against the venue's own service
   * definitions.
   */
  book?: DayBook,
  /** Which of the day's services to read, when the partner picked one. */
  serviceId?: string,
): ScreenSpec {
  const lot1 = lot === 1;
  const today = isoDay(new Date());
  const onAnotherDay = Boolean(book && book.date !== today);
  // A day with no service defined — a venue closed on Mondays, or a date
  // past what the dataset holds — still has to render. It gets the
  // overview's service for its shape, emptied of every figure, so the
  // screen says "closed" instead of dividing by a capacity it invented.
  // Today leads with the service the clock resolves — the live row with
  // the engine's counters — unless the partner picked another of the
  // day's sittings. Any other day is resolved from the book.
  const service = onAnotherDay
    ? pickService(book!, serviceId) ?? closedService(data.currentService, book!.date)
    : (serviceId && book
        ? book.services.find((s) => s.id === serviceId)
        : undefined) ?? data.currentService;
  // One scope, named on the tiles.
  //
  // The tiles used to read `currentService`, a per-service figure, while
  // the rows under them were the whole day plus the door's queue: three
  // scopes on one screen, with "Déjà arrivés" counting covers directly
  // above an "Arrivés" chip counting bookings. Lot 1 reads the service
  // in hand and nothing else, and every figure beside the book is
  // counted off these same rows.
  // The queue at the door is a thing about right now, so it joins the
  // book only on today; a waitlist on a page showing next Tuesday would
  // be counting people who are standing in the room tonight.
  const dayRows =
    onAnotherDay || (book && serviceId)
      ? book!.reservations
      : data.upcomingReservations;
  const all = lot1
    ? serviceBook(dayRows, service)
    : onAnotherDay
      ? dayRows
      : [...data.upcomingReservations, ...data.waitlist];
  const requested = all.filter((r) => r.state === "requested");
  const atRisk = all.filter((r) => (r.noShowRisk ?? 0) >= 0.3);
  const arrived = all.filter((r) => r.state === "arrived");
  // The same covers Accueil's remplissage tile divides by the same
  // capacity, so the two screens cannot report the room differently.
  const bookedCovers = heldCovers(all);
  const vocabulary = configFor(configuration);
  // Acomptes is a Lot 2 screen, so no Lot 1 row carries a deposit pill
  // or an amount — not even when the driver hands one over.
  const depositByReservation = new Map(
    (lot1 ? [] : desk.deposits)
      .filter((d) => d.reservationId)
      .map((d) => [d.reservationId as string, d]),
  );
  // "couverts · Déjeuner", "réservations · Déjeuner": the unit and the
  // scope, on every tile, because two of them count different things.
  const scope = (unit: string) => `${unit} · ${service.label}`;

  const kpiBlock: Block = {
    id: "reservation-kpis",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "booked",
        label: coverLabel(vocabulary, "réservé"),
        tone: "sand",
        icon: "calendar-clock",
        metric: {
          value: lot1 ? bookedCovers : service.bookedCovers,
          format: COUNT,
          suffix: `/ ${service.capacity}`,
          animate: true,
        },
        hint: lot1
          ? `${scope(vocabulary.cover.many)} · ${Math.round(
              (bookedCovers / Math.max(1, service.capacity)) * 100,
            )} % de la salle engagée · hors demandes`
          : `${Math.round(
              (service.bookedCovers / Math.max(1, service.capacity)) * 100,
            )} % de la salle engagée`,
      },
      {
        id: "arrived",
        label: "Déjà arrivés",
        tone: "surface",
        icon: "user-check",
        // Bookings, not covers — the same thing the Arrivés chip on the
        // book counts, so the tile and the chip read the same number.
        metric: {
          value: lot1 ? arrived.length : service.arrivedCovers,
          format: COUNT,
          animate: true,
        },
        hint: lot1 ? scope("réservations") : undefined,
      },
      {
        id: "requested",
        label: "À confirmer",
        tone: requested.length > 0 ? "peach" : "surface",
        icon: "hourglass",
        metric: { value: requested.length, format: COUNT, animate: true },
        hint: lot1
          ? `${scope("réservations")} · ${
              requested.length ? "à traiter avant le coup de feu" : "rien en attente"
            }`
          : requested.length
            ? "À traiter avant le coup de feu"
            : "Rien en attente",
      },
      {
        id: "risk",
        label: "Risque d'absence",
        tone: atRisk.length > 0 ? "rose" : "sage",
        icon: "user-x",
        metric: { value: atRisk.length, format: COUNT, animate: true },
        hint: lot1
          ? `${scope("réservations")} · ${
              atRisk.length
                ? "un rappel SMS réduit le risque de moitié"
                : "aucun risque détecté"
            }`
          : atRisk.length
            ? "Un rappel SMS réduit le risque de moitié"
            : "Aucun risque détecté",
      },
    ],
  };

  const bookBlock: Block = {
    id: "book",
    type: "entity-list",
    heading: "Carnet du service",
    // Lot 1 works the book it is given: view, accept, refuse with a
    // reason, check in, mark absent. Creating a booking from the portal
    // is Lot 2, so the button that starts one is not drawn.
    headingAction: lot1
      ? undefined
      : {
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
      // Three filters Lot 1 cannot fill. The queue is Liste d'attente, a
      // Lot 2 screen; marking a booking absent or refusing it takes it
      // out of the service's book, so those two chips could only ever
      // read zero next to a no-show figure Performance does show.
      ...(lot1
        ? []
        : ([
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
          ] satisfies FilterTab[])),
      // A no-show risk is a score, and the screen that explains a score
      // is Performance — Prio 08. Lot 1 filters on the states it sets
      // itself and on nothing it cannot account for.
      ...(lot1
        ? []
        : ([{ id: "risk", label: "À risque", match: { facet: "risk", values: ["high"] } }] satisfies FilterTab[])),
    ],
    search: { placeholder: "Rechercher un client, un téléphone, une table…" },
    sorts: [
      // The default a host works to: the next table to arrive, first.
      // Sorting by clock time put a party seated at noon above one due
      // in ten minutes, so the top of the book was the part of the day
      // already dealt with.
      ...(lot1
        ? ([
            {
              id: "next",
              label: "Prochaine arrivée",
              key: "queue",
              direction: "asc",
            },
          ] as const)
        : []),
      { id: "time", label: "Heure · tôt → tard", key: "time", direction: "asc" },
      { id: "time_desc", label: "Heure · tard → tôt", key: "time", direction: "desc" },
      { id: "party", label: "Couverts", key: "party", direction: "desc" },
      ...(lot1
        ? []
        : ([{ id: "visits", label: "Fidélité", key: "visits", direction: "desc" }] as const)),
      { id: "name", label: "Nom", key: "name", direction: "asc" },
    ],
    rows: all.map((r) =>
      reservationRow(r, data.zones, configuration, depositByReservation.get(r.id), lot, true),
    ),
    empty: {
      title: "Carnet vide",
      body: "Aucune table réservée sur ce service.",
      icon: "calendar",
    },
    noMatches: {
      title: "Aucune réservation",
      body: "Aucune réservation ne correspond à ce filtre.",
    },
  };

  const shownDate = onAnotherDay ? book!.date : service.date;
  const MIN_DAY = shiftDay(today, -BOOK_DAYS_BACK);
  const MAX_DAY = shiftDay(today, BOOK_DAYS_AHEAD);

  // The day and the service, as a control rather than a heading: the
  // book is always read for one day, and the previous one is one tap
  // away all through a service.
  //
  // The date used to be a dead control — read-only under Lot 1, and
  // under Lot 2 a date input whose command had no handler. Taking
  // tomorrow's bookings while tonight's service runs is the ordinary
  // work of a restaurant, so the day is walkable: a step either way,
  // a picker for a date further off, and a way back to today.
  // The day's services, for the tabs. `getDayBook` answers for today as
  // well as for a walked-to day, so a restaurant serving lunch and
  // dinner can read either without leaving the screen.
  const dayServices = book && book.services.length > 0 ? book.services : [service];

  // Lot 1 turns the page; Lot 2 keeps the settings card, which is the
  // right shape beside four KPI tiles and a load histogram.
  const dayBar: Block = {
    id: "day",
    type: "day-bar",
    label: dayLabel(shownDate),
    hint:
      shownDate === today
        ? "Aujourd'hui."
        : shownDate === shiftDay(today, 1)
          ? "Demain."
          : undefined,
    value: shownDate,
    min: MIN_DAY,
    max: MAX_DAY,
    command: "reservations.day",
    services: dayServices.map((s) => ({ id: s.id, label: s.label })),
    activeServiceId: service.id,
    serviceCommand: "reservations.service",
  };

  const dayPicker: Block = {
    id: "day",
    type: "settings",
    heading: "Journée",
    rows: [
      {
        id: "date",
        label: dayLabel(shownDate),
        hint:
          shownDate === today
            ? "Aujourd'hui."
            : shownDate === shiftDay(today, 1)
              ? "Demain."
              : undefined,
        control: {
          kind: "date",
          value: shownDate,
          min: MIN_DAY,
          max: MAX_DAY,
          compact: true,
          label: "Choisir une date",
        },
        command: "reservations.day",
      },
      {
        id: "service",
        label: vocabulary.service.one.replace(/^./, (c) => c.toUpperCase()),
        hint: `Les ${vocabulary.service.many} se définissent dans Disponibilités.`,
        control: {
          kind: "select",
          value: service.id,
          options: dayServices.map((s) => ({ value: s.id, label: s.label })),
        },
        command: "reservations.service",
      },
    ],
    footerActions: [
      {
        action: {
          kind: "command",
          command: "reservations.day",
          label: "Jour précédent",
          icon: "chevron-left",
          payload: { value: shiftDay(shownDate, -1) },
        },
        variant: "secondary",
      },
      {
        action: {
          kind: "command",
          command: "reservations.day",
          label: "Jour suivant",
          icon: "chevron-right",
          payload: { value: shiftDay(shownDate, 1) },
        },
        variant: "secondary",
      },
      ...(shownDate === today
        ? []
        : ([
            {
              action: {
                kind: "command" as const,
                command: "reservations.day",
                label: "Aujourd'hui",
                icon: "calendar" as const,
                payload: { value: today },
              },
              variant: "ghost" as const,
            },
          ])),
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

  // The scope, spelled out: the day in French long form, the service
  // resolved from the clock against the services table, and the hours
  // that service actually runs. Everything below is inside it.
  const subtitle =
    service.capacity === 0
      ? `${dayLabel(shownDate)} · aucun service ce jour-là`
      : `${dayLabel(shownDate)} · ${service.label} · ${hm(service.opensAt)} – ${hm(
          service.closesAt,
        )}`;

  // Réservations, under « Gestion des reservation uniquement ».
  //
  // The four tiles and the load histogram are readings, and a reading is
  // Pilotage's job — Détail Sprint row 133, « Dashboards avancés », Prio
  // 08. What Prio 02 buys is the book and the four decisions taken on
  // it: accepter, refuser, check-in, no-show. So the screen is the day
  // and the service it is scoped to, then the book.
  if (lot1) {
    return {
      slug: "reservations",
      title: "Réservations",
      subtitle,
      // Taking a copy of the day away acts on the whole screen, not on
      // anything inside it, so it sits in the header rather than among
      // the controls that change what the screen shows.
      headerActions: [
        {
          action: {
            kind: "command",
            command: "reservations.export",
            label: "Exporter la journée",
            icon: "file",
          },
          variant: "secondary",
        },
        {
          action: {
            kind: "command",
            command: "print",
            label: "Imprimer",
            icon: "file",
          },
          variant: "secondary",
        },
      ],
      blocks: [dayBar, bookBlock],
      mobileBlocks: [dayBar, bookBlock],
    };
  }

  return {
    slug: "reservations",
    title: "Réservations",
    subtitle,
    blocks: [dayPicker, kpiBlock, serviceLoadBlock(data, configuration), bookBlock],
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
function serviceLoadBlock(
  data: RestaurantOverview,
  configuration: VenueConfiguration,
): Block {
  const vocabulary = configFor(configuration);
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
    subheading: `${coverLabel(
      vocabulary,
      "réservé",
    )} par créneau de 30 min. La ligne marque ce que la salle peut tourner.`,
    capacity: perSlotCapacity,
    capacityLabel: `${perSlotCapacity} ${vocabulary.cover.many} / créneau`,
    unitLabel: vocabulary.cover.many,
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
            // Null where nothing was reviewed before this month: there
            // is no baseline to have moved from.
            ...(data.rating.deltaVsLastMonth === null
              ? {}
              : {
                  delta: {
                    value: ratingDeltaPct(
                      data.rating.average,
                      data.rating.deltaVsLastMonth,
                    ),
                    period: "vs mois dernier",
                  },
                }),
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
  lot: Lot = 2,
  // Réservations is where a booking is decided, so that is the only
  // place the decisions are drawn on the row. Accueil lists the same
  // bookings beside an attention queue that already carries them, and
  // two copies of Accepter on one screen is one too many.
  inlineActions = false,
): EntityRow {
  const vocabulary = configFor(configuration);
  const lot1 = lot === 1;
  const badges = [reservationBadge(reservation.state)];
  // Two flags a basique dashboard cannot stand behind. "Habitué" is read
  // off a visit count, and the guest base it comes from is Liste clients
  // — Prio 08. A no-show risk is a score, and Performance is the screen
  // that would explain it.
  if (reservation.vip && !lot1) {
    badges.push({ label: "Habitué", tone: "violet", icon: "star" });
  }
  if ((reservation.noShowRisk ?? 0) >= 0.3 && !lot1) {
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
    //
    // Lot 1 has no walk-in action and no queue to take one from, so a
    // Lot 1 row never names one as a source — it reads the channel the
    // booking actually arrived through.
    reservation.channel === "walk_in" && !lot1
      ? vocabulary.walkInLabel
      : RESERVATION_CHANNEL[reservation.channel],
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: reservation.id,
    title: reservation.guestName,
    initials: initialsOf(reservation.guestName),
    // Under host density the time and the party size lead the row in
    // their own type, so the secondary line carries what is left: where
    // they sit and how the booking arrived. Lot 2 keeps the dot-joined
    // line, which is the right density for a screen read at a desk.
    lead: lot1
      ? {
          time: hm(reservation.at),
          party: coversIn(configuration, reservation.partySize),
        }
      : undefined,
    status: lot1 ? reservationBand(reservation.state) : undefined,
    // The sitting this booking files under, on the half hour the whole
    // dataset is already aligned to.
    slot: lot1 ? slotOf(reservation.at) : undefined,
    meta: lot1
      ? place || undefined
      : `${hm(reservation.at)} · ${coversIn(configuration, reservation.partySize)} · ${place}`,
    badges,
    signal: reservation.note ? { text: reservation.note, icon: "note" } : undefined,
    trailing: lot1
      ? undefined
      : reservation.depositMad
        ? { label: "Acompte", metric: { value: reservation.depositMad, format: MAD } }
        : { label: "Visites", metric: { value: reservation.visits, format: COUNT } },
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
      // Next arrival first, with the parties already in the room at the
      // bottom: they are the day's finished work, and the book is read
      // for what is still coming. A day-sized offset does the sinking,
      // so within each half the clock order still holds.
      queue:
        new Date(reservation.at).getTime() +
        (reservation.state === "arrived" || reservation.state === "completed"
          ? 86_400_000 * 365
          : 0),
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
    detail: reservationDetail(reservation, zones, configuration, lot),
    // Réservations is where a booking is decided, and under Lot 1 that
    // is the only place that offers a decision: Accueil's list reads the
    // day, and a kebab there would be a second, quieter way to do the
    // same work from a screen that does not show the outcome.
    // Under Lot 1 every decision the sprint buys is on the row itself, so
    // the kebab would be a second, quieter path to the same four verbs —
    // and one more small target in a row built for large ones.
    menu: lot1 ? undefined : reservationMenu(reservation, lot),
    actions: lot1 && inlineActions ? reservationActions(reservation) : undefined,
  };
}

/**
 * The half-hour sitting a booking belongs to.
 *
 * The seed puts every Lot 1 booking on a `:00` or `:30` slot, so this
 * rounds down rather than inventing a bucket — a 19h05 booking taken by
 * phone still files under the 19h00 sitting a host is working.
 */
function slotOf(at: string): string {
  const d = new Date(at);
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return hm(d.toISOString());
}

/**
 * The three decisions Lot 1 buys on a booking, on the row itself.
 *
 * Accepter, refuser and signaler une absence are the whole of what a Lot
 * 1 partner does to a reservation, and all three sat behind a kebab that
 * had to be opened first — one tap too many at a host stand, and nothing
 * at all on a printed frame. They are the same commands the kebab
 * dispatches, drawn inline and filtered by the state the row is in: a
 * booking already seated has no decision left, and check-in replaces
 * accepter once the request has been accepted.
 */
function reservationActions(reservation: Reservation): CtaAction[] | undefined {
  // Absent is a judgement about a table that did not turn up, and it
  // cannot be made before the table was due. Offered early it is a
  // mis-tap waiting to happen — one that writes a no-show against a
  // guest who is simply not late yet.
  const due = Date.parse(reservation.at) <= Date.now();
  const absent: CtaAction = {
    action: {
      kind: "command",
      command: "reservation.noShow",
      payload: { id: reservation.id },
      label: "Absent",
      icon: "user-x",
    },
    variant: "ghost",
  };

  if (reservation.state === "requested") {
    return [
      {
        action: {
          kind: "command",
          command: "reservation.confirm",
          payload: { id: reservation.id },
          label: "Accepter",
          icon: "check",
        },
        variant: "primary",
      },
      {
        action: {
          kind: "command",
          command: "reservation.reject",
          payload: { id: reservation.id, name: reservation.guestName },
          label: "Refuser",
          icon: "ban",
        },
        variant: "secondary",
      },
      ...(due ? [absent] : []),
    ];
  }
  if (reservation.state === "confirmed") {
    return [
      {
        action: {
          kind: "command",
          command: "reservation.arrive",
          payload: { id: reservation.id },
          label: "Check-in",
          icon: "user-check",
        },
        variant: "primary",
      },
      ...(due ? [absent] : []),
    ];
  }
  return undefined;
}

function reservationMenu(reservation: Reservation, lot: Lot = 2): EntityRow["menu"] {
  const items: NonNullable<EntityRow["menu"]> = [];
  // Prio 02 names four decisions on a booking: accepter, refuser,
  // check-in, no-show. A reminder is a message campaign and a
  // cancellation is the guest's own, both of which arrive later.
  const lot1 = lot === 1;

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
    if (!lot1) {
      items.push({
        id: "remind",
        label: "Envoyer un rappel SMS",
        action: {
          kind: "command",
          command: "reservation.remind",
          payload: { id: reservation.id },
        },
      });
    }
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
    if (!lot1) {
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
  }
  return items;
}

function reservationDetail(
  reservation: Reservation,
  zones: Zone[],
  configuration: VenueConfiguration = "restaurant",
  lot: Lot = 2,
): DetailSpec {
  const risk = Math.round((reservation.noShowRisk ?? 0) * 100);

  return {
    title: reservation.guestName,
    subtitle: `${hm(reservation.at)} · ${covers(configuration, reservation.partySize)} · ${
      RESERVATION_CHANNEL[reservation.channel]
    }`,
    badges: [
      reservationBadge(reservation.state),
      ...(reservation.vip && lot !== 1
        ? [{ label: "Habitué", tone: "violet" as const, icon: "star" as const }]
        : []),
    ],
    sections: [
      {
        label: "La réservation",
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
          // A visit count is the guest base's figure, and Liste clients
          // is Prio 08.
          ...(lot === 1
            ? []
            : [
                {
                  label: "Visites",
                  metric: { value: reservation.visits, format: COUNT },
                },
              ]),
          // An amount the Lot 1 partner cannot see taken, refunded or
          // released, because Acomptes is a Lot 2 screen.
          ...(reservation.depositMad && lot !== 1
            ? [
                {
                  label: "Acompte versé",
                  metric: { value: reservation.depositMad, format: MAD },
                },
              ]
            : []),
          ...(lot === 1
            ? []
            : [
                {
                  label: "Risque d'absence",
                  metric: { value: risk, format: { kind: "percent" as const } },
                },
              ]),
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
      // A reminder is a message campaign; Prio 02 sends one alert, and it
      // goes to the venue rather than the guest.
      ...(lot === 1
        ? []
        : ([
            {
              action: {
                kind: "command" as const,
                label: "Rappel SMS",
                command: "reservation.remind",
                payload: { id: reservation.id },
              },
              variant: "secondary" as const,
            },
          ])),
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
  audience?: AudienceInsights;
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
  /**
   * The day Réservations is showing, when it is not today.
   *
   * Absent means today, and the builder reads the overview as before —
   * the live service, its counters and the book behind them. Present
   * means the partner walked to another date, and every figure on the
   * screen is counted off this instead.
   */
  dayBook?: DayBook;
  /** Which of `dayBook`'s services to read, when the partner picked one. */
  dayService?: string;
  profile?: import("@/lib/types/restaurant").RestaurantProfile | null;
  photoCount?: number;
  period?: AnalyticsPeriod;
  comparison?: Comparison;
  /**
   * The lot this deployment runs.
   *
   * A builder reads it to leave out what Lot 1 did not buy, and to drop
   * any link, button or tile that would lead into a screen Lot 1 does
   * not register. Defaulting to 2 keeps every existing caller — and
   * every test — rendering the full screen unless it says otherwise.
   */
  lot?: Lot;
}

export type ScreenDataNeed =
  | "customers"
  | "audience"
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
  | "dayBook"
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
/**
 * The slices a screen needs **in this lot**.
 *
 * Four Lot 1 screens declared a need whose payload no Lot 1 builder
 * reads: the dashboard never touches the service floor at all, the money
 * desk is read for `hasTransactionSource` and the deposits — both behind
 * a Lot 2 guard — and the marketing bundle feeds a delivery journal that
 * belongs to Campagnes. Fetching them anyway is not just waste: against
 * a real backend it makes a Lot 1 deployment *demand* endpoints no Lot 1
 * screen renders, which is work the integrator pays for nothing.
 *
 * See docs/LOT1_API_CONTRACT.md §4.
 */
export function screenNeeds(slug: SpecSlug, lot: Lot): ScreenDataNeed[] {
  const declared = SCREEN_NEEDS[slug];
  if (lot === 2) return declared;
  const unread = LOT1_UNREAD[slug];
  return unread ? declared.filter((need) => !unread.includes(need)) : declared;
}

/** Declared, fetched, and then not read — per screen, under Lot 1. */
const LOT1_UNREAD: Partial<Record<SpecSlug, ScreenDataNeed[]>> = {
  "": ["serviceFloor", "money"],
  reservations: ["money"],
  notifications: ["marketing"],
};

export const SCREEN_NEEDS: Record<SpecSlug, ScreenDataNeed[]> = {
  "": ["serviceFloor", "money"],
  reservations: ["money", "dayBook"],
  calendrier: ["serviceFloor", "growth"],
  "liste-attente": ["serviceFloor"],
  briefing: ["serviceFloor"],
  clients: ["customers", "guestGraph", "spend"],
  segments: ["guestGraph", "money"],
  audience: ["audience"],
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
    buildDashboardScreen(
      ctx.overview,
      ctx.serviceFloor ?? EMPTY_FLOOR,
      ctx.money ?? EMPTY_MONEY,
      ctx.configuration,
      ctx.lot,
    ),
  reservations: (ctx) =>
    buildReservationsScreen(
      ctx.overview,
      ctx.configuration,
      ctx.money ?? EMPTY_MONEY,
      ctx.lot,
      ctx.dayBook,
      ctx.dayService,
    ),
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
      ctx.lot,
    ),
  audience: (ctx) =>
    buildAudienceScreen(ctx.audience ?? emptyAudience(ctx.overview.restaurant.id), ctx.configuration),
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
      ctx.lot,
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
      ctx.lot,
    ),
  bilans: (ctx) =>
    buildReportsScreen(ctx.analytics, ctx.money, ctx.configuration, ctx.lot),
  campagnes: (ctx) => buildCampaignsScreen(ctx.marketing ?? EMPTY_MARKETING),

  // 9. Établissement
  disponibilites: (ctx) =>
    buildAvailabilityScreen(
      ctx.serviceConfig,
      ctx.availability,
      ctx.configuration,
      ctx.lot,
    ),
  notifications: (ctx) =>
    buildNotificationsScreen(
      ctx.notificationPreferences,
      ctx.settings,
      (ctx.marketing ?? EMPTY_MARKETING).messages,
      ctx.lot,
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
        alertPhone: "",
        alertEmail: "",
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
      ctx.lot,
    ),
  support: (ctx) => buildSupportScreen(ctx.support ?? [], ctx.lot),
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
  audience: "Audience",
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
