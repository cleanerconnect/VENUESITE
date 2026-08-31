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
  EntityRow,
  FeedEntry,
  KpiTile,
  ScreenSpec,
} from "@/lib/dashboard/spec";
import type {
  DiningTable,
  GuestReview,
  MenuItem,
  Reservation,
  RestaurantOverview,
  Service,
} from "@/lib/types/restaurant";
import {
  ACTIVITY_TYPE,
  MENU_CATEGORY,
  RESERVATION_CHANNEL,
  RESERVATION_STATE,
  SERVICE_KIND,
  menuBadge,
  payoutBadge,
  reservationBadge,
  serviceBadge,
  tableBadge,
} from "./vocabulary";
import { getRestaurantOverview } from "@/lib/mock/restaurant";

const MAD = { kind: "currency" as const, currency: "MAD" };
const COUNT = { kind: "number" as const };

const hm = (iso: string) => format(new Date(iso), "HH'h'mm", { locale: fr });
const dayLabel = (iso: string) =>
  format(new Date(iso), "EEEE d MMMM", { locale: fr });

const covers = (n: number) => `${n} ${n > 1 ? "couverts" : "couvert"}`;

// ── Dashboard ────────────────────────────────────────────────

export function buildDashboardScreen(data: RestaurantOverview): ScreenSpec {
  const service = data.currentService;
  const inService = service.state === "open" || service.state === "peak";
  const freeSeats = freeSeatCount(data.tables);

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
      progress: service.seatedCovers / Math.max(1, service.capacity),
      topLabel: inService ? "Salle occupée" : "Réservé",
      centerLabel: `${Math.round(
        (service.seatedCovers / Math.max(1, service.capacity)) * 100,
      )}%`,
      bottomLabel: `${service.seatedCovers} / ${service.capacity}`,
    },
    stats: [
      {
        label: "Encaissé ce service",
        metric: { value: service.revenueMad, format: MAD, animate: true },
        accent: true,
      },
      {
        label: "Couverts installés",
        metric: {
          value: service.seatedCovers,
          format: COUNT,
          suffix: `/ ${service.bookedCovers}`,
          animate: true,
        },
      },
      {
        label: "Places libres",
        metric: { value: freeSeats, format: COUNT, animate: true },
      },
    ],
    footnote: {
      text: `Rotation moyenne ${service.avgTurnMinutes} min · ${service.walkInCovers} couverts sans réservation · ${service.noShowCovers} absences enregistrées.`,
      badge: {
        label: `Second service ~${hm(
          new Date(
            new Date(service.opensAt).getTime() +
              service.avgTurnMinutes * 60_000,
          ).toISOString(),
        )}`,
        tone: "violet",
      },
    },
  };

  const nudgeBlock: Block = {
    id: "service-nudge",
    type: "nudge",
    eyebrow: "Suggestion",
    icon: "sparkles",
    headline: data.nudge.headline,
    body: data.nudge.body,
    actions: [
      {
        action: { kind: "link", label: data.nudge.ctaLabel, href: data.nudge.href },
        allow: ["owner", "admin"],
      },
      {
        action: { kind: "command", label: "Ignorer", command: "nudge.dismiss" },
        variant: "ghost",
      },
    ],
  };

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
          href: "/restaurant/reservations?nouvelle=1",
          icon: "plus",
        },
        allow: ["owner", "admin"],
      },
      {
        action: {
          kind: "link",
          label: "Voir le plan de salle →",
          href: "/restaurant/salle",
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
        action: { kind: "link", label: "Voir les versements", href: "/restaurant/versements" },
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
        action: { kind: "link", label: "Voir les avis", href: "/restaurant/avis" },
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
      href: "/restaurant/reservations",
    },
    rows: data.upcomingReservations.map(reservationRow),
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
        main: [greetingBlock, nudgeBlock],
        rail: [heroBlock],
      },
      kpiBlock,
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
      nudgeBlock,
      { ...kpiBlock, id: "kpis-mobile", columns: 1, tiles: mobileTiles(kpiBlock) },
      arrivalsBlock,
      { ...feedBlock, id: "activity-mobile", entries: data.activity.slice(0, 5).map(activityEntry) },
    ],
  };
}

/** Phone bento: a vertical stack, spans and sparklines dropped. */
function mobileTiles(block: Block): KpiTile[] {
  if (block.type !== "kpi-grid") return [];
  return block.tiles
    .filter((t) => t.id !== "payout")
    .map((t) => ({ ...t, span: 1 as const, sparkline: undefined }));
}

// ── Reservations ─────────────────────────────────────────────

export function buildReservationsScreen(data: RestaurantOverview): ScreenSpec {
  const all = [...data.upcomingReservations, ...data.waitlist];
  const confirmed = all.filter((r) => r.state === "confirmed");
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
          },
          {
            id: "confirmed",
            label: "Confirmées",
            tone: "surface",
            icon: "check",
            metric: { value: confirmed.length, format: COUNT, animate: true },
          },
          {
            id: "requested",
            label: "En attente de confirmation",
            tone: "surface",
            icon: "hourglass",
            metric: { value: requested.length, format: COUNT, animate: true },
            hint: requested.length
              ? "À traiter avant le début du service"
              : "Rien à traiter",
          },
          {
            id: "risk",
            label: "Risque d'absence",
            tone: "rose",
            icon: "user-x",
            metric: { value: atRisk.length, format: COUNT, animate: true },
            hint: atRisk.length
              ? "Un rappel SMS réduit le risque de moitié"
              : "Aucun risque détecté",
          },
        ],
      },
      {
        id: "waitlist",
        type: "entity-list",
        heading: "Liste d'attente",
        rows: data.waitlist.map(reservationRow),
        empty: {
          title: "Personne n'attend",
          body: "Les arrivées sans réservation apparaîtront ici.",
          icon: "timer",
        },
      },
      {
        id: "book",
        type: "entity-list",
        heading: "Carnet du service",
        rows: data.upcomingReservations.map(reservationRow),
        empty: {
          title: "Carnet vide",
          body: "Aucune table réservée sur ce service.",
          icon: "calendar",
        },
      },
    ],
  };
}

// ── Floor plan ───────────────────────────────────────────────

export function buildFloorScreen(data: RestaurantOverview): ScreenSpec {
  // One group per zone, built from the zone list — adding a terrace is a
  // data change, not a layout change.
  const zoneGroups: Block[] = data.zones.map((zone) => {
    const zoneTables = data.tables.filter((t) => t.zoneId === zone.id);
    const seated = zoneTables.filter((t) => t.state === "seated" || t.state === "dessert");
    return {
      id: `zone-${zone.id}`,
      type: "entity-list",
      heading: `${zone.name} · ${seated.length}/${zoneTables.length} tables occupées`,
      rows: zoneTables.map((table) => tableRow(table, data)),
      empty: {
        title: `${zone.name} vide`,
        body: "Aucune table configurée dans cette zone.",
        icon: "table",
      },
    };
  });

  return {
    slug: "salle",
    title: "Plan de salle",
    subtitle: `${data.currentService.label} · ${hm(data.currentService.opensAt)} – ${hm(data.currentService.closesAt)}`,
    blocks: [
      {
        id: "floor-kpis",
        type: "kpi-grid",
        columns: 4,
        tiles: [
          {
            id: "occupied",
            label: "Tables occupées",
            tone: "sand",
            icon: "armchair",
            metric: {
              value: data.tables.filter((t) => t.state === "seated" || t.state === "dessert").length,
              format: COUNT,
              suffix: `/ ${data.tables.length}`,
              animate: true,
            },
          },
          {
            id: "free-seats",
            label: "Places libres",
            tone: "surface",
            icon: "users",
            metric: { value: freeSeatCount(data.tables), format: COUNT, animate: true },
          },
          {
            id: "to-clean",
            label: "À débarrasser",
            tone: "surface",
            icon: "repeat",
            metric: {
              value: data.tables.filter((t) => t.state === "to_clean").length,
              format: COUNT,
              animate: true,
            },
            hint: "Chaque minute gagnée, c'est un couvert de plus",
          },
          {
            id: "open-bills",
            label: "Addition en cours",
            tone: "sage",
            icon: "receipt",
            metric: {
              value: data.tables.reduce((s, t) => s + (t.billMad ?? 0), 0),
              format: MAD,
              animate: true,
            },
          },
        ],
      },
      ...zoneGroups,
    ],
  };
}

// ── Menu ─────────────────────────────────────────────────────

export function buildMenuScreen(data: RestaurantOverview): ScreenSpec {
  return {
    slug: "menu",
    title: "Carte",
    subtitle: "Performance des plats sur le service en cours",
    blocks: [
      {
        id: "menu-kpis",
        type: "kpi-grid",
        columns: 3,
        tiles: [
          {
            id: "plates",
            label: "Plats servis",
            tone: "sand",
            icon: "utensils-crossed",
            metric: {
              value: data.topItems.reduce((s, i) => s + i.soldToday, 0),
              format: COUNT,
              animate: true,
            },
          },
          {
            id: "margin",
            label: "Marge moyenne",
            tone: "surface",
            icon: "percent",
            metric: {
              value: averageMargin(data.topItems),
              format: { kind: "percent" },
              animate: true,
            },
          },
          {
            id: "out",
            label: "Ruptures",
            tone: "rose",
            icon: "ban",
            metric: {
              value: data.topItems.filter((i) => i.state === "sold_out").length,
              format: COUNT,
              animate: true,
            },
            hint: "Retirer de la carte évite la déception en salle",
          },
        ],
      },
      {
        id: "menu-table",
        type: "table",
        heading: "Plats du service",
        columns: [
          { key: "name", label: "Plat" },
          { key: "category", label: "Catégorie", hideOnMobile: true },
          { key: "price", label: "Prix", align: "right", format: MAD },
          { key: "sold", label: "Servis", align: "right", format: COUNT },
          { key: "margin", label: "Marge", align: "right", format: { kind: "percent" } },
          { key: "state", label: "État", align: "right" },
        ],
        rows: data.topItems.map((item) => ({
          id: item.id,
          cells: {
            name: { value: item.signature ? `${item.name} ✦` : item.name },
            category: { value: MENU_CATEGORY[item.category].label },
            price: { value: item.priceMad },
            sold: { value: item.soldToday },
            margin: { value: itemMargin(item) },
            state: { value: "", badge: menuBadge(item.state) },
          },
        })),
        empty: { title: "Carte vide", body: "Aucun plat configuré." },
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
            delta: { value: data.rating.deltaVsLastMonth * 10, period: "vs mois dernier" },
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

function reservationRow(reservation: Reservation): EntityRow {
  const state = RESERVATION_STATE[reservation.state];
  const badges = [reservationBadge(reservation.state)];
  if (reservation.vip) badges.push({ label: "Habitué", tone: "violet", icon: "star" });
  if ((reservation.noShowRisk ?? 0) >= 0.3) {
    badges.push({ label: "Risque d'absence", tone: "warning", icon: "alert" });
  }

  const place = [
    reservation.tableCode ? `Table ${reservation.tableCode}` : null,
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
    href: `/restaurant/reservations?res=${reservation.id}`,
    menu: [
      {
        id: "seat",
        label: "Installer la table",
        action: {
          kind: "command",
          command: "reservation.seat",
          payload: { id: reservation.id },
        },
      },
      {
        id: "remind",
        label: "Envoyer un rappel",
        action: {
          kind: "command",
          command: "reservation.remind",
          payload: { id: reservation.id },
        },
      },
      {
        id: "cancel",
        label: `Annuler (${state.label.toLowerCase()})`,
        destructive: true,
        action: {
          kind: "command",
          command: "reservation.cancel",
          payload: { id: reservation.id },
        },
      },
    ],
  };
}

function tableRow(table: DiningTable, data: RestaurantOverview): EntityRow {
  const term = tableBadge(table.state);
  const reservation = [...data.upcomingReservations, ...data.waitlist].find(
    (r) => r.id === table.reservationId,
  );
  const seatedMin = table.seatedAt
    ? Math.round((Date.now() - new Date(table.seatedAt).getTime()) / 60_000)
    : null;

  const meta = [
    `${table.seats} places`,
    reservation ? reservation.guestName : null,
    seatedMin !== null ? `assis depuis ${seatedMin} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: table.id,
    title: `Table ${table.code}`,
    icon: "table",
    meta,
    badges: [term],
    trailing:
      table.billMad !== undefined
        ? { label: "Addition", metric: { value: table.billMad, format: MAD } }
        : undefined,
    menu: [
      {
        id: "seat",
        label: "Installer une table",
        action: { kind: "command", command: "table.seat", payload: { id: table.id } },
      },
      {
        id: "clear",
        label: "Marquer comme débarrassée",
        action: { kind: "command", command: "table.clear", payload: { id: table.id } },
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
    href: `/restaurant/services?service=${service.id}`,
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
      ? `/restaurant/reservations?res=${item.reservationId}`
      : item.type === "review_received"
        ? "/restaurant/avis"
        : item.tableCode
          ? "/restaurant/salle"
          : undefined,
  };
}

// ── Derivations ──────────────────────────────────────────────

function freeSeatCount(tables: DiningTable[]): number {
  return tables
    .filter((t) => t.state === "free")
    .reduce((sum, t) => sum + t.seats, 0);
}

function itemMargin(item: MenuItem): number {
  if (item.priceMad <= 0) return 0;
  return Math.round(((item.priceMad - item.foodCostMad) / item.priceMad) * 100);
}

function averageMargin(items: MenuItem[]): number {
  if (items.length === 0) return 0;
  return Math.round(
    items.reduce((sum, i) => sum + itemMargin(i), 0) / items.length,
  );
}

function countdownLabel(iso: string): string {
  const days = Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  if (days === 0) return "aujourd'hui";
  return days === 1 ? "dans 1 jour" : `dans ${days} jours`;
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
export const RESTAURANT_SCREENS: Record<
  string,
  (data: RestaurantOverview) => ScreenSpec
> = {
  "": buildDashboardScreen,
  reservations: buildReservationsScreen,
  salle: buildFloorScreen,
  menu: buildMenuScreen,
  avis: buildReviewsScreen,
  services: buildServicesScreen,
  versements: buildPayoutsScreen,
};

export function getRestaurantScreen(slug: string): ScreenSpec | null {
  const build = RESTAURANT_SCREENS[slug];
  if (!build) return null;
  return build(getRestaurantOverview());
}

export function restaurantScreenSlugs(): string[] {
  return Object.keys(RESTAURANT_SCREENS);
}
