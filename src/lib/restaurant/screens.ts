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
  buildAnalyticsScreen,
  buildAvailabilityScreen,
  buildVisibilityScreen,
} from "./operations";
import type {
  AnalyticsPeriod,
  Customer,
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



const hm = (iso: string) => format(new Date(iso), "HH'h'mm", { locale: fr });
const dayLabel = (iso: string) =>
  format(new Date(iso), "EEEE d MMMM", { locale: fr });

const covers = (n: number) => `${n} ${n > 1 ? "couverts" : "couvert"}`;
const money = (n: number) => formatValue(n, MAD);

// ── Dashboard ────────────────────────────────────────────────

export function buildDashboardScreen(data: RestaurantOverview): ScreenSpec {
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
      {
        label: "Encaissé ce service",
        metric: { value: service.revenueMad, format: MAD, animate: true },
        accent: true,
      },
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
      text: `${service.bookedCovers} couverts réservés sur ${service.capacity} · ${service.noShowCovers} absences enregistrées.`,
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
          label: "Voir le plan de salle →",
          href: restaurantHref("reservations"),
        },
        variant: "secondary",
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
        action: { kind: "link", label: "Voir les versements", href: restaurantHref("versements") },
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
      kpiBlock,
      // Operational before strategic: which half-hour is about to break
      // comes above how the week is trending.
      serviceLoadBlock(data),
      {
        id: "floor",
        type: "split",
        railWidth: 380,
        main: [arrivalsBlock],
        rail: [feedBlock],
      },
      revenueChart,
    ],
    // Phone lane: the floor comes first because that is what a manager
    // opens the app for mid-service. Same blocks, different order and a
    // trimmed KPI set — a layout decision, so it lives in the layout.
    mobileBlocks: [
      heroBlock,
      ...(nudgeBlock ? [nudgeBlock] : []),
      { ...kpiBlock, id: "kpis-mobile", columns: 1, tiles: mobileTiles(kpiBlock) },
      { ...(serviceLoadBlock(data) as Block), id: "service-load-mobile" },
      arrivalsBlock,
      { ...feedBlock, id: "activity-mobile", entries: data.activity.slice(0, 5).map(activityEntry) },
    ],
  };
}

/**
 * Phone bento: a vertical stack. Spans and sparklines are dropped because
 * neither survives a 390px column — a lane adaptation, applied to every
 * tile alike. Which tiles appear at all is the tiles' own call, via
 * `surface`.
 */
function mobileTiles(block: Block): KpiTile[] {
  if (block.type !== "kpi-grid") return [];
  return block.tiles.map((t) => ({
    ...t,
    span: 1 as const,
    sparkline: undefined,
  }));
}

// ── Reservations ─────────────────────────────────────────────

export function buildReservationsScreen(data: RestaurantOverview): ScreenSpec {
  const all = [...data.upcomingReservations, ...data.waitlist];
  const requested = all.filter((r) => r.state === "requested");
  const atRisk = all.filter((r) => (r.noShowRisk ?? 0) >= 0.3);

  return {
    slug: "reservations",
    title: "Réservations",
    subtitle: dayLabel(data.currentService.opensAt),
    blocks: [
      {
        id: "reservation-kpis",
        type: "kpi-grid",
        columns: 4,
        tiles: [
          {
            id: "booked",
            label: "Couverts réservés",
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
      },
      serviceLoadBlock(data),
      {
        id: "book",
        type: "entity-list",
        heading: "Carnet du service",
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
        rows: all.map((r) => reservationRow(r, data.zones)),
        empty: {
          title: "Carnet vide",
          body: "Aucune table réservée sur ce service.",
          icon: "calendar",
        },
        noMatches: {
          title: "Aucune réservation",
          body: "Aucun couvert ne correspond à ce filtre.",
        },
      },
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

export function buildReviewsScreen(data: RestaurantOverview): ScreenSpec {
  const unanswered = data.reviews.filter((r) => !r.replied);

  return {
    slug: "avis",
    title: "Avis",
    subtitle: `${data.rating.reviewCount} avis · note moyenne ${data.rating.average
      .toFixed(1)
      .replace(".", ",")} / 5`,
    blocks: [
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

// ── Services ─────────────────────────────────────────────────

export function buildServicesScreen(data: RestaurantOverview): ScreenSpec {
  return {
    slug: "services",
    title: "Services",
    subtitle: "Programmation et remplissage à venir",
    blocks: [
      {
        id: "services-list",
        type: "entity-list",
        heading: "Prochains services",
        rows: data.services.map(serviceRow),
        empty: {
          title: "Aucun service programmé",
          body: "Ouvrez un service pour commencer à prendre des réservations.",
          icon: "calendar",
        },
      },
    ],
  };
}

// ── Settlements ──────────────────────────────────────────────

export function buildPayoutsScreen(data: RestaurantOverview): ScreenSpec {
  const next = data.payouts.find((p) => p.state !== "paid");
  const paid = data.payouts.filter((p) => p.state === "paid");

  return {
    slug: "versements",
    title: "Versements",
    subtitle: "Encaissements LYFE et commissions",
    blocks: [
      {
        id: "payout-hero",
        type: "hero",
        eyebrow: next ? `PROCHAIN VERSEMENT · ${countdownLabel(next.scheduledFor).toUpperCase()}` : "AUCUN VERSEMENT EN ATTENTE",
        title: next ? next.periodLabel : "Tout est à jour",
        subtitle: next?.reference,
        stats: next
          ? [
              {
                label: "Montant net",
                metric: { value: next.amountMad, format: MAD, animate: true },
                accent: true,
              },
              {
                label: "Commission LYFE",
                metric: { value: next.commissionMad, format: MAD, animate: true },
              },
              {
                label: "Couverts réglés",
                metric: { value: next.coversSettled, format: COUNT, animate: true },
              },
            ]
          : undefined,
      },
      {
        id: "payout-history",
        type: "table",
        heading: "Historique",
        columns: [
          { key: "period", label: "Période" },
          { key: "reference", label: "Référence", hideOnMobile: true },
          { key: "covers", label: "Couverts", align: "right", format: COUNT },
          { key: "commission", label: "Commission", align: "right", format: MAD, hideOnMobile: true },
          { key: "amount", label: "Net versé", align: "right", format: MAD },
          { key: "state", label: "État", align: "right" },
        ],
        rows: paid.map((payout) => ({
          id: payout.id,
          cells: {
            period: { value: payout.periodLabel },
            reference: { value: payout.reference },
            covers: { value: payout.coversSettled },
            commission: { value: payout.commissionMad },
            amount: { value: payout.amountMad },
            state: { value: "", badge: payoutBadge(payout.state) },
          },
        })),
        empty: {
          title: "Aucun versement",
          body: "L'historique apparaîtra après le premier service réglé.",
        },
      },
    ],
  };
}

// ── Row builders ─────────────────────────────────────────────

function zoneName(zones: Zone[], id?: string): string | null {
  if (!id) return null;
  return zones.find((z) => z.id === id)?.name ?? null;
}

function reservationRow(reservation: Reservation, zones: Zone[]): EntityRow {
  const badges = [reservationBadge(reservation.state)];
  if (reservation.vip) badges.push({ label: "Habitué", tone: "violet", icon: "star" });
  if ((reservation.noShowRisk ?? 0) >= 0.3) {
    badges.push({ label: "Risque d'absence", tone: "warning", icon: "alert" });
  }

  const place = [
    zoneName(zones, reservation.zoneId),
    RESERVATION_CHANNEL[reservation.channel],
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: reservation.id,
    title: reservation.guestName,
    initials: initialsOf(reservation.guestName),
    meta: `${hm(reservation.at)} · ${covers(reservation.partySize)} · ${place}`,
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
    href: `${restaurantHref("services")}?service=${service.id}`,
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

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

// ── Registry ─────────────────────────────────────────────────

/**
 * Every screen the restaurant workspace can serve, keyed by URL slug.
 * The route resolves against this — so a new screen ships without a new
 * page file, and the nav can be generated from the same source rather
 * than kept in sync by hand.
 */
/**
 * What a builder is given. The service payload is always present; the
 * Business Service slices are optional because fetching all four for
 * every screen would cost four round trips to render one. `SCREEN_NEEDS`
 * below says which slug needs which, so the page fetches exactly that.
 */
export interface ScreenContext {
  overview: RestaurantOverview;
  customers?: Customer[];
  analytics?: VenueAnalytics;
  visibility?: VisibilityMetrics;
  availability?: VenueAvailability;
  period?: AnalyticsPeriod;
}

export type ScreenDataNeed = "customers" | "analytics" | "visibility" | "availability";

/** Which extra slices each screen requires. */
export const SCREEN_NEEDS: Record<RestaurantSlug, ScreenDataNeed[]> = {
  "": [],
  reservations: [],
  services: [],
  clients: ["customers"],
  menu: [],
  avis: [],
  analytique: ["analytics"],
  visibilite: ["visibility"],
  disponibilites: ["availability"],
  versements: [],
};

/** Adapts a builder that only needs the service payload. */
const fromOverview =
  (build: (data: RestaurantOverview) => ScreenSpec) =>
  (ctx: ScreenContext): ScreenSpec =>
    build(ctx.overview);

export const RESTAURANT_SCREENS: Record<
  RestaurantSlug,
  (ctx: ScreenContext) => ScreenSpec
> = {
  "": fromOverview(buildDashboardScreen),
  reservations: fromOverview(buildReservationsScreen),
  services: fromOverview(buildServicesScreen),
  menu: fromOverview(buildMenuScreen),
  avis: fromOverview(buildReviewsScreen),
  versements: fromOverview(buildPayoutsScreen),
  clients: (ctx) =>
    buildCustomersScreen(ctx.customers ?? [], ctx.overview.reviews),
  analytique: (ctx) => buildAnalyticsScreen(ctx.analytics, ctx.period ?? "30d"),
  visibilite: (ctx) => buildVisibilityScreen(ctx.visibility, ctx.period ?? "30d"),
  disponibilites: (ctx) => buildAvailabilityScreen(ctx.availability),
};

export function buildScreen(
  slug: string,
  ctx: ScreenContext,
): ScreenSpec | null {
  if (!isRestaurantSlug(slug)) return null;
  return RESTAURANT_SCREENS[slug](ctx);
}

/**
 * Slug lookup for routing and metadata. Deliberately does not build a
 * spec — a title should not cost a database read.
 */
export function restaurantScreenTitle(slug: string): string | null {
  return isRestaurantSlug(slug) ? SCREEN_TITLES[slug] : null;
}

const SCREEN_TITLES: Record<RestaurantSlug, string> = {
  "": "Vue d'ensemble",
  reservations: "Réservations",
  services: "Services",
  clients: "Clients",
  menu: "Carte",
  avis: "Avis",
  analytique: "Analytique",
  visibilite: "Visibilité",
  disponibilites: "Disponibilités",
  versements: "Versements",
};

export function restaurantScreenSlugs(): readonly string[] {
  return RESTAURANT_SLUGS;
}
