// Demo restaurant = Dar Zellij, a Marrakech address on LYFE. Same status
// as the Jazzablanca seed: recognisable-feeling demo data, not a claim
// that they're a customer.
//
// Everything the restaurant dashboard renders originates here. The screen
// specs read from `getRestaurantOverview()` and nothing else, so pointing
// this module at a real endpoint is the whole backend swap.

import { addDays, format, startOfWeek, endOfWeek, getISOWeek, setHours, setMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  DiningTable,
  GuestReview,
  MenuItem,
  Reservation,
  RestaurantActivityItem,
  RestaurantOverview,
  RestaurantPayout,
  RestaurantProfile,
  Service,
  ServiceKind,
  Zone,
} from "@/lib/types/restaurant";

// The demo clock is *now*, not a frozen date.
//
// A fixed anchor rots: every relative label ("assis depuis 12 min", "il y
// a 4 min", "dans 3 jours") drifts a little further from the truth after
// each day the demo isn't redeployed, and eventually reads as a bug
// rather than as data. Anchoring to Date.now() and expressing every
// timestamp as an offset means the service always reads as live —
// whenever anyone opens it.
export const RESTAURANT: RestaurantProfile = {
  id: "rst_dar_zellij",
  kind: "gastronomique",
  name: "Dar Zellij",
  shortName: "Dar Zellij",
  initials: "DZ",
  city: "Marrakech",
  subline: "Restaurant · Marrakech",
  cuisine: "Marocaine contemporaine",
  capacity: 120,
  contactEmail: "reservations@darzellij.ma",
  contactPhone: "+212 524 38 26 00",
  website: "https://darzellij.ma",
  currency: "MAD",
  onboardingCompleted: true,
};

// Everything below is rebuilt per call so the relative labels stay true
// on a server that has been up for weeks. `getRestaurantOverview` caches
// the result for a minute — long enough that a single render is
// internally consistent, short enough that nothing visibly drifts.
function buildOverview(): RestaurantOverview {
  const NOW = Date.now();
  const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
  const minutesAhead = (m: number) => new Date(NOW + m * 60_000).toISOString();
  const daysAhead = (d: number) => new Date(NOW + d * 24 * 3600_000).toISOString();

  /** A wall-clock time on a day relative to today. */
  const atClock = (dayOffset: number, hours: number, minutes: number) =>
    setMinutes(setHours(addDays(new Date(NOW), dayOffset), hours), minutes);

  const weekdayOf = (date: Date) => format(date, "EEEE", { locale: fr });
  const clockOf = (date: Date) => format(date, "HH'h'mm", { locale: fr });
  /** Wall-clock label N minutes from now — for copy that names a slot. */
  const slotIn = (minutes: number) =>
    format(new Date(NOW + minutes * 60_000), "HH'h'", { locale: fr });
  const isoDate = (date: Date) => format(date, "yyyy-MM-dd");

  /** "Semaine 17 · 20 – 26 avril", derived so it can never contradict the date. */
  const weekLabel = (weeksAgo: number) => {
    const day = addDays(new Date(NOW), -7 * weeksAgo);
    const start = startOfWeek(day, { weekStartsOn: 1 });
    const end = endOfWeek(day, { weekStartsOn: 1 });
    const sameMonth = start.getMonth() === end.getMonth();
    return `Semaine ${getISOWeek(day)} · ${format(start, sameMonth ? "d" : "d MMM", {
      locale: fr,
    })} – ${format(end, "d MMMM", { locale: fr })}`;
  };

  /** Bonjour / Bon après-midi / Bonsoir, from the hour the page is opened. */
  const salutationFor = (date: Date) => {
    const h = date.getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };


  const zones: Zone[] = [
    { id: "z_patio", name: "Patio", capacity: 48, available: true },
    { id: "z_salle", name: "Grande salle", capacity: 44, available: true },
    { id: "z_terrasse", name: "Terrasse", capacity: 28, available: true },
  ];

  // The lead service is mid-rush: opened 100 min ago, 170 min left to
  // run. Which service that *is* follows the hour the page is opened —
  // a demo that calls 13h40 "dîner" reads as broken, and the sitting a
  // restaurant is in is a fact about the clock, not a constant.
  const currentOpens = new Date(NOW - 100 * 60_000);
  const currentCloses = new Date(NOW + 170 * 60_000);
  const currentKind: ServiceKind =
    currentOpens.getHours() < 11
      ? "petit_dejeuner"
      : currentOpens.getHours() < 17
        ? "dejeuner"
        : currentOpens.getHours() < 23
          ? "diner"
          : "tardif";
  const KIND_LABEL: Record<ServiceKind, string> = {
    petit_dejeuner: "Petit-déjeuner",
    dejeuner: "Déjeuner",
    diner: "Dîner",
    tardif: "Service tardif",
  };
  const nextLunch = { opens: atClock(1, 12, 0), closes: atClock(1, 15, 30) };
  const nextDinner = { opens: atClock(1, 19, 0), closes: atClock(1, 23, 30) };

  const services: Service[] = [
    {
      id: "svc_current",
      kind: currentKind,
      label: `${KIND_LABEL[currentKind]} · ${weekdayOf(currentOpens)}`,
      date: isoDate(currentOpens),
      opensAt: currentOpens.toISOString(),
      closesAt: currentCloses.toISOString(),
      state: "peak",
      capacity: 120,
      bookedCovers: 104,
      seatedCovers: 86,
      walkInCovers: 11,
      noShowCovers: 6,
      revenueMad: 63_400,
      avgTurnMinutes: 96,
    },
    {
      id: "svc_next_dejeuner",
      kind: "dejeuner",
      label: `Déjeuner · ${weekdayOf(nextLunch.opens)}`,
      date: isoDate(nextLunch.opens),
      opensAt: nextLunch.opens.toISOString(),
      closesAt: nextLunch.closes.toISOString(),
      state: "scheduled",
      capacity: 92,
      bookedCovers: 41,
      seatedCovers: 0,
      walkInCovers: 0,
      noShowCovers: 0,
      revenueMad: 0,
      avgTurnMinutes: 74,
    },
    {
      id: "svc_next_diner",
      kind: "diner",
      label: `Dîner · ${weekdayOf(nextDinner.opens)}`,
      date: isoDate(nextDinner.opens),
      opensAt: nextDinner.opens.toISOString(),
      closesAt: nextDinner.closes.toISOString(),
      state: "scheduled",
      capacity: 120,
      bookedCovers: 118,
      seatedCovers: 0,
      walkInCovers: 0,
      noShowCovers: 0,
      revenueMad: 0,
      avgTurnMinutes: 96,
    },
  ];

  const tables: DiningTable[] = [
    { id: "t_p1", code: "P1", zoneId: "z_patio", seats: 4, state: "seated", reservationId: "res_004", seatedAt: minutesAgo(74), billMad: 1_840 },
    { id: "t_p2", code: "P2", zoneId: "z_patio", seats: 2, state: "dessert", reservationId: "res_005", seatedAt: minutesAgo(98), billMad: 960 },
    { id: "t_p3", code: "P3", zoneId: "z_patio", seats: 6, state: "seated", reservationId: "res_006", seatedAt: minutesAgo(41), billMad: 2_310 },
    { id: "t_p4", code: "P4", zoneId: "z_patio", seats: 4, state: "to_clean" },
    { id: "t_p5", code: "P5", zoneId: "z_patio", seats: 4, state: "reserved", reservationId: "res_001" },
    { id: "t_s1", code: "S1", zoneId: "z_salle", seats: 8, state: "seated", reservationId: "res_007", seatedAt: minutesAgo(63), billMad: 4_120 },
    { id: "t_s2", code: "S2", zoneId: "z_salle", seats: 4, state: "seated", reservationId: "res_008", seatedAt: minutesAgo(29), billMad: 780 },
    { id: "t_s3", code: "S3", zoneId: "z_salle", seats: 2, state: "free" },
    { id: "t_s4", code: "S4", zoneId: "z_salle", seats: 6, state: "reserved", reservationId: "res_002" },
    { id: "t_s5", code: "S5", zoneId: "z_salle", seats: 4, state: "blocked" },
    { id: "t_t1", code: "T1", zoneId: "z_terrasse", seats: 2, state: "seated", reservationId: "res_009", seatedAt: minutesAgo(52), billMad: 640 },
    { id: "t_t2", code: "T2", zoneId: "z_terrasse", seats: 4, state: "free" },
    { id: "t_t3", code: "T3", zoneId: "z_terrasse", seats: 4, state: "reserved", reservationId: "res_003" },
  ];

  const upcomingReservations: Reservation[] = [
    {
      id: "res_001",
      serviceId: "svc_current",
      guestName: "Salma Bennani",
      guestPhone: "+212 661 20 44 18",
      partySize: 4,
      at: minutesAhead(20),
      state: "confirmed",
      channel: "lyfe",
      zoneId: "z_patio",
      tableCode: "P5",
      note: "Anniversaire, dessert avec bougie",
      visits: 6,
      vip: true,
      depositMad: 400,
      noShowRisk: 0.04,
    },
    {
      id: "res_002",
      serviceId: "svc_current",
      guestName: "Groupe Karam",
      guestPhone: "+212 662 88 10 03",
      partySize: 6,
      at: minutesAhead(35),
      state: "confirmed",
      channel: "phone",
      zoneId: "z_salle",
      tableCode: "S4",
      note: "Sans gluten pour deux couverts",
      visits: 2,
      vip: false,
      noShowRisk: 0.11,
    },
    {
      id: "res_003",
      serviceId: "svc_current",
      guestName: "Yasmine El Alaoui",
      guestPhone: "+212 663 41 77 92",
      partySize: 4,
      at: minutesAhead(50),
      state: "confirmed",
      channel: "instagram",
      zoneId: "z_terrasse",
      tableCode: "T3",
      visits: 1,
      vip: false,
      noShowRisk: 0.38,
    },
    {
      id: "res_010",
      serviceId: "svc_current",
      guestName: "Nabil Cherkaoui",
      guestPhone: "+212 665 09 33 71",
      partySize: 2,
      at: minutesAhead(80),
      state: "requested",
      channel: "lyfe",
      note: "Demande une table près de la fontaine",
      visits: 0,
      vip: false,
      noShowRisk: 0.22,
    },
    {
      id: "res_011",
      serviceId: "svc_current",
      guestName: "Hind Tazi",
      guestPhone: "+212 660 15 62 40",
      partySize: 5,
      at: minutesAhead(105),
      state: "confirmed",
      channel: "partner",
      zoneId: "z_salle",
      visits: 9,
      vip: true,
      depositMad: 500,
      noShowRisk: 0.03,
    },
  ];

  const waitlist: Reservation[] = [
    {
      id: "res_w1",
      serviceId: "svc_current",
      guestName: "Omar Idrissi",
      guestPhone: "+212 667 74 21 08",
      partySize: 2,
      at: minutesAhead(15),
      state: "waitlisted",
      channel: "walk_in",
      visits: 0,
      vip: false,
    },
    {
      id: "res_w2",
      serviceId: "svc_current",
      guestName: "Famille Berrada",
      guestPhone: "+212 668 30 90 55",
      partySize: 4,
      at: minutesAhead(25),
      state: "waitlisted",
      channel: "walk_in",
      visits: 3,
      vip: false,
    },
  ];

  const topItems: MenuItem[] = [
    { id: "mi_pastilla", name: "Pastilla de pigeon", category: "entree", priceMad: 180, foodCostMad: 52, soldToday: 34, soldLast7d: 198, state: "available", signature: true },
    { id: "mi_tajine", name: "Tajine d'agneau aux pruneaux", category: "plat", priceMad: 260, foodCostMad: 84, soldToday: 29, soldLast7d: 174, state: "low_stock", remaining: 6, signature: true },
    { id: "mi_seabass", name: "Loup de mer chermoula", category: "plat", priceMad: 320, foodCostMad: 128, soldToday: 21, soldLast7d: 132, state: "available" },
    { id: "mi_couscous", name: "Couscous royal du vendredi", category: "plat", priceMad: 240, foodCostMad: 71, soldToday: 26, soldLast7d: 96, state: "sold_out", remaining: 0 },
    { id: "mi_orange", name: "Salade d'orange à la cannelle", category: "dessert", priceMad: 90, foodCostMad: 18, soldToday: 31, soldLast7d: 186, state: "available" },
    { id: "mi_negroni", name: "Negroni safrané", category: "cocktail", priceMad: 140, foodCostMad: 34, soldToday: 44, soldLast7d: 261, state: "available", signature: true },
  ];

  const reviews: GuestReview[] = [
    { id: "rev_1", guestName: "Leïla M.", rating: 5, comment: "Le patio au coucher du soleil, rien à redire. Service attentif sans être pesant.", at: minutesAgo(180), channel: "lyfe", tags: ["cadre", "service"], replied: true },
    { id: "rev_2", guestName: "Thomas R.", rating: 4, comment: "Cuisine excellente. Vingt minutes d'attente malgré la réservation à 21h.", at: minutesAgo(420), channel: "google", tags: ["attente", "cuisine"], replied: false },
    { id: "rev_3", guestName: "Amina B.", rating: 5, comment: "La pastilla vaut le détour à elle seule.", at: minutesAgo(1_500), channel: "lyfe", tags: ["cuisine"], replied: false },
    { id: "rev_4", guestName: "Karim H.", rating: 3, comment: "Table en terrasse bruyante, on s'entendait à peine.", at: minutesAgo(2_600), channel: "google", tags: ["bruit", "terrasse"], replied: false },
  ];

  const activity: RestaurantActivityItem[] = [
    { id: "act_1", type: "party_seated", actor: "Rachid", message: "a installé la table S2 · 4 couverts", at: minutesAgo(1), tableCode: "S2" },
    { id: "act_2", type: "reservation_created", actor: "Nabil Cherkaoui", message: "a demandé une table pour 2 à 22h00", at: minutesAgo(4), reservationId: "res_010" },
    { id: "act_3", type: "anomaly", actor: "LYFE", message: `détecte 3 annulations sur le créneau ${slotIn(60)} — inhabituel un ${weekdayOf(new Date(NOW))}`, at: minutesAgo(9), needsAttention: true },
    { id: "act_4", type: "table_freed", actor: "Salle", message: "a libéré la table P4, à débarrasser", at: minutesAgo(12), tableCode: "P4" },
    { id: "act_5", type: "item_86", actor: "Cuisine", message: "a passé le couscous royal en rupture", at: minutesAgo(18) },
    { id: "act_6", type: "waitlist_joined", actor: "Famille Berrada", message: "rejoint la liste d'attente · 4 couverts", at: minutesAgo(23) },
    { id: "act_7", type: "review_received", actor: "Leïla M.", message: "a laissé un avis 5 étoiles", at: minutesAgo(180) },
    { id: "act_8", type: "no_show", actor: `Réservation ${slotIn(-60)}`, message: "notée absente après 25 min · 3 couverts", at: minutesAgo(40), needsAttention: true },
    { id: "act_9", type: "reservation_cancelled", actor: "Sofia Lahlou", message: "a annulé sa table de 2 sur ce service", at: minutesAgo(47) },
    { id: "act_10", type: "payment_settled", actor: "LYFE", message: `a clôturé le versement de la ${weekLabel(1).split(" · ")[0].toLowerCase()}`, at: minutesAgo(2_880) },
  ];

  const payouts: RestaurantPayout[] = [
    {
      id: "pay_current",
      reference: `LYFE-DZ-${format(new Date(NOW), "yyyy")}-W${getISOWeek(new Date(NOW))}`,
      amountMad: 291_700,
      commissionMad: 17_900,
      coversSettled: 612,
      periodLabel: weekLabel(0),
      scheduledFor: daysAhead(3),
      state: "scheduled",
    },
    {
      id: "pay_prev",
      reference: `LYFE-DZ-${format(addDays(new Date(NOW), -7), "yyyy")}-W${getISOWeek(addDays(new Date(NOW), -7))}`,
      amountMad: 268_400,
      commissionMad: 16_500,
      coversSettled: 571,
      periodLabel: weekLabel(1),
      scheduledFor: minutesAgo(2_880),
      paidAt: minutesAgo(2_880),
      state: "paid",
    },
    {
      id: "pay_prev2",
      reference: `LYFE-DZ-${format(addDays(new Date(NOW), -14), "yyyy")}-W${getISOWeek(addDays(new Date(NOW), -14))}`,
      amountMad: 243_100,
      commissionMad: 14_900,
      coversSettled: 518,
      periodLabel: weekLabel(2),
      scheduledFor: minutesAgo(13_000),
      paidAt: minutesAgo(13_000),
      state: "paid",
    },
  ];

  const overview: RestaurantOverview = {
    restaurant: RESTAURANT,
    greeting: {
      firstName: "Yassine",
      salutation: salutationFor(new Date(NOW)),
      clause: "le patio tourne à plein.",
      subline: `${services[0].seatedCovers} couverts installés, ${waitlist.reduce(
        (n, r) => n + r.partySize,
        0,
      )} en liste d'attente. Le coup de feu tient jusqu'à ${format(
        currentCloses,
        "HH'h'mm",
        { locale: fr },
      )}.`,
    },
    currentService: services[0],
    zones,
    tables,
    coversToday: {
      count: 97,
      deltaPctVsYesterday: 12.4,
      series24h: [0, 0, 0, 0, 2, 6, 14, 22, 18, 9, 4, 2, 0, 0, 3, 11, 26, 38, 47, 62, 79, 91, 97, 97],
      peakHourLabel: `Pic à ${slotIn(60)}, second service attendu à ${clockOf(
      new Date(NOW + 95 * 60_000),
    )}`,
    },
    averageTicket: {
      amountMad: 737,
      deltaPctVsLastWeek: 5.8,
    },
    occupancy: {
      pct: 82,
      deltaPctVsLastWeek: 6.1,
    },
    noShows: {
      count: 6,
      deltaPctVsLastWeek: 18.5,
      lostRevenueMad: 4_420,
    },
    revenueWeek: {
      amountMad: 384_900,
      deltaPctVsLastWeek: 9.2,
      series: [
        { label: "Lun", value: 31_200 },
        { label: "Mar", value: 38_400 },
        { label: "Mer", value: 44_100 },
        { label: "Jeu", value: 57_800 },
        { label: "Ven", value: 63_400 },
        { label: "Sam", value: 89_600 },
        { label: "Dim", value: 60_400 },
      ],
    },
    rating: {
      average: 4.6,
      reviewCount: 412,
      deltaVsLastMonth: 0.2,
    },
    nextPayout: {
      amountMad: 291_700,
      scheduledFor: daysAhead(3),
    },
    nudge: {
      headline: `3 annulations sur le créneau ${slotIn(60)}.`,
      body:
        "Deux groupes attendent en salle depuis 15 min. Les basculer sur P4 et T2 récupère 6 couverts, soit ≈ 4 400 MAD sur ce service.",
      href: "/restaurant/salle",
      ctaLabel: "Placer la liste d'attente →",
    },
    upcomingReservations,
    waitlist,
    activity,
    topItems,
    reviews,
    services,
    payouts,
  };

  return overview;
}

let cache: { at: number; value: RestaurantOverview } | null = null;
const CACHE_MS = 60_000;

function currentOverview(): RestaurantOverview {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    cache = { at: Date.now(), value: buildOverview() };
  }
  return cache.value;
}


/** Whole dashboard payload. One call, mirrors `GET /restaurants/:id/overview`. */
export function getRestaurantOverview(): RestaurantOverview {
  return currentOverview();
}

export function getServices(): Service[] {
  return currentOverview().services;
}

export function getReservations(): Reservation[] {
  const data = currentOverview();
  return [...data.upcomingReservations, ...data.waitlist];
}

export function getTables(): DiningTable[] {
  return currentOverview().tables;
}

export function getZones(): Zone[] {
  return currentOverview().zones;
}

export function getMenuItems(): MenuItem[] {
  return currentOverview().topItems;
}

export function getReviews(): GuestReview[] {
  return currentOverview().reviews;
}

export function getPayouts(): RestaurantPayout[] {
  return currentOverview().payouts;
}

/** The clock the current payload was built against. */
export function getServiceClock(): number {
  return cache?.at ?? Date.now();
}
