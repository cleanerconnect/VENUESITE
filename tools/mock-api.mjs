// A Business Service that answers the Lot 1 contract.
//
//   node tools/mock-api.mjs            # :3311
//   PORT=4000 node tools/mock-api.mjs
//
// Why this exists. The HTTP driver was written, typed and never run: the
// portal has three data drivers and only two of them had ever served a
// screen. Nothing checked that the paths matched, that the payload
// shapes were what the types claim, or that a write came back in a form
// the next read agreed with — and "it compiles" is not that check.
//
// So this serves the committed snapshot — `src/lib/data/static/
// venue-snapshot.json`, captured from the seeded database by
// `tools/verify/extract.mjs` — over the exact routes of
// `src/lib/data/http-repository.ts`. Point the portal at it:
//
//   node tools/mock-api.mjs &
//   LYFE_LOT=1 LYFE_DATA=http \
//     LYFE_API_BASE_URL=http://localhost:3311 LYFE_API_TOKEN=mock \
//     npm start
//
// and every verify tool then runs against the seam rather than around
// it. It is a test double, not a backend: state lives in this process
// and dies with it, the password is the same for every account, and the
// Lot 2 action endpoints echo their bundle rather than applying it.
// docs/LOT1_API_CONTRACT.md is the specification; this is one
// implementation of it, kept honest by being run.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = resolve(HERE, "../src/lib/data/static/venue-snapshot.json");
const PORT = Number(process.env.PORT ?? 3311);
const TOKEN = process.env.MOCK_API_TOKEN ?? "";
const PASSWORD = process.env.MOCK_API_PASSWORD ?? "demo";

// ── The dataset ──────────────────────────────────────────────
//
// Rebased on load exactly as `static/venue-data.ts` rebases it, so a
// snapshot captured last week still serves tonight's service. Without
// this the portal would show a book for a day that has passed and the
// current service would resolve to none.

const RAW = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function rebase(value, offsetMs, offsetDays) {
  if (typeof value === "string") {
    if (ISO.test(value)) {
      return new Date(Date.parse(value) + offsetMs).toISOString();
    }
    if (DAY.test(value)) {
      const shifted = new Date(`${value}T12:00:00Z`);
      shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
      return shifted.toISOString().slice(0, 10);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => rebase(v, offsetMs, offsetDays));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rebase(v, offsetMs, offsetDays)]),
    );
  }
  return value;
}

const offsetMs = Date.now() - Date.parse(RAW.capturedAt);
const db = {
  users: RAW.users,
  businessAccounts: RAW.businessAccounts,
  venues: Object.fromEntries(
    Object.entries(RAW.venues).map(([id, bundle]) => [
      id,
      rebase(bundle, offsetMs, Math.round(offsetMs / 86_400_000)),
    ]),
  ),
};

const venue = (id) => db.venues[id] ?? null;
const ops = (id) => venue(id)?.operations ?? null;

// ── Plumbing ────────────────────────────────────────────────

class Refused extends Error {
  constructor(status, code, message) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

const isoNow = () => new Date().toISOString();

/**
 * Every booking the venue holds, in one list.
 *
 * The overview carries today's book in `upcomingReservations` and the
 * queue in `waitlist`; other days live in `dayBooks`. A write has to
 * find its row wherever it is, or accepting tomorrow's request would
 * silently do nothing.
 */
function everyBooking(bundle) {
  const rows = [...bundle.overview.upcomingReservations, ...bundle.overview.waitlist];
  for (const book of Object.values(bundle.dayBooks ?? {})) {
    rows.push(...book.reservations);
  }
  return rows;
}

function findBooking(bundle, id) {
  return everyBooking(bundle).find((r) => r.id === id) ?? null;
}

/**
 * Applies a state change the way the schema's history would.
 *
 * The row is mutated in place — it is shared between the overview and
 * the day book by reference after the rebase — and the derived counters
 * the dashboard reads are moved with it. A backend that changed the
 * state and left `bookedCovers` alone would render a dashboard that
 * disagrees with its own list.
 */
function transition(bundle, id, to) {
  const row = findBooking(bundle, id);
  if (!row) throw new Refused(404, "booking_not_found", "Réservation introuvable.");
  if (row.state === to) return row;

  const service = bundle.overview.currentService;
  const wasBooked = row.state === "confirmed" || row.state === "requested";
  row.state = to;

  if (to === "confirmed" && service) service.bookedCovers += row.partySize;
  if (to === "arrived" && service) service.arrivedCovers += row.partySize;
  if (to === "no_show" && service) {
    service.noShowCovers += row.partySize;
    bundle.overview.noShows.count += 1;
  }
  if ((to === "cancelled" || to === "rejected") && wasBooked && service) {
    service.bookedCovers = Math.max(0, service.bookedCovers - row.partySize);
  }
  if (to === "cancelled" || to === "rejected" || to === "no_show") {
    bundle.overview.upcomingReservations =
      bundle.overview.upcomingReservations.filter((r) => r.id !== id);
  }
  if (to === "arrived" || to === "confirmed") {
    bundle.overview.waitlist = bundle.overview.waitlist.filter((r) => r.id !== id);
  }
  return row;
}

/** The book for one day: today from the overview, any other from the capture. */
function dayBook(bundle, date) {
  const today = new Date().toISOString().slice(0, 10);
  if (date === today) {
    return {
      date,
      services: bundle.overview.services,
      reservations: bundle.overview.upcomingReservations,
    };
  }
  const held = (bundle.dayBooks ?? {})[date];
  if (held) return held;
  // A day the capture does not hold is not an error: it is a day with no
  // bookings, which is a state the screen has to render anyway.
  return { date, services: bundle.overview.services, reservations: [] };
}

function accountFor(user) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    venues: user.venues,
  };
}

// ── Routes ──────────────────────────────────────────────────
//
// One entry per method + path of `http-repository.ts`. A path the driver
// never calls is not here, and a path the driver calls that is missing
// here shows up as a 404 in the walk rather than as a shrug.

const ROUTES = [
  // Session — the endpoint the account directory resolves against.
  ["GET", /^\/api\/business\/auth\/session$/, (_m, q) => {
    const user = q.user_id
      ? db.users.find((u) => u.userId === q.user_id)
      : db.users.find((u) => u.email.toLowerCase() === (q.email ?? "").toLowerCase());
    if (!user) throw new Refused(404, "no_account");
    return accountFor(user);
  }],
  ["POST", /^\/api\/business\/auth\/session$/, (_m, _q, body) => {
    const email = String(body?.email ?? "").trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    // One answer for an unknown address and a wrong password, so the
    // form cannot be used to find out which partners have accounts.
    if (!user || String(body?.password ?? "") !== PASSWORD) {
      throw new Refused(401, "bad_credentials");
    }
    return accountFor(user);
  }],

  // Onboarding — « Création de Venue ». The draft lives here for the
  // life of the process, and the submit makes a venue the rest of the
  // routes then serve like any other.
  ["POST", /^\/api\/business\/onboarding$/, (_m, _q, body) => {
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Refused(409, "email_taken", "Cette adresse a déjà un compte.");
    }
    const userId = `usr_${randomUUID().slice(0, 10)}`;
    db.users.push({
      userId,
      fullName: String(body?.fullName ?? ""),
      email,
      venues: [],
    });
    const draft = {
      id: `onb_${randomUUID().slice(0, 10)}`,
      ownerId: userId,
      step: 2,
      venueName: "",
      venueType: "restaurant",
      city: "",
      address: "",
      latitude: null,
      longitude: null,
      coverObjectKey: "",
      coverContentType: "",
      coverSizeBytes: 0,
      hours: WEEK.map((weekday) => ({
        weekday,
        closed: false,
        opensAt: "12:00",
        closesAt: "23:00",
      })),
      submittedVenueId: null,
      updatedAt: isoNow(),
    };
    drafts.set(draft.id, draft);
    return { userId, draft };
  }],
  ["GET", /^\/api\/business\/onboarding\/([^/]+)$/, (m) => drafts.get(m[1]) ?? null],
  ["PUT", /^\/api\/business\/onboarding\/([^/]+)$/, (m, _q, body) => {
    const draft = drafts.get(m[1]);
    if (!draft) throw new Refused(404, "draft_not_found", "Inscription introuvable.");
    // The city is one of five. The screen offers a list, so a value
    // outside it reached the service some other way, and a service that
    // accepts it is how « Marrakesh » gets into the database.
    const city = body?.city;
    if (city !== undefined && city !== "" && !CITIES.includes(city)) {
      throw new Refused(400, "city_unknown", "Ville hors de la liste.");
    }
    Object.assign(draft, body ?? {}, { updatedAt: isoNow() });
    return draft;
  }],
  ["POST", /^\/api\/business\/onboarding\/([^/]+)\/submit$/, (m) => {
    const draft = drafts.get(m[1]);
    if (!draft) throw new Refused(404, "draft_not_found", "Inscription introuvable.");
    // Idempotent: a spent draft hands back the venue it already made.
    if (draft.submittedVenueId) return { venueId: draft.submittedVenueId };
    return { venueId: makeVenueFromDraft(draft) };
  }],

  ["GET", /^\/api\/business\/account$/, () =>
    db.businessAccounts[process.env.MOCK_API_USER ?? "usr_yassine"] ??
    Object.values(db.businessAccounts)[0]],

  // Reads the seven screens make.
  ["GET", /^\/api\/business\/overview$/, (_m, q) => scoped(q).overview],
  ["GET", /^\/api\/business\/bookings$/, (_m, q) =>
    dayBook(scoped(q), q.date ?? new Date().toISOString().slice(0, 10))],
  ["GET", /^\/api\/business\/settings$/, (_m, q) => scoped(q).operations.settings],
  ["PUT", /^\/api\/business\/settings$/, (_m, q, body) => {
    const bundle = scoped(q);
    bundle.operations.settings = { ...bundle.operations.settings, ...body };
    return bundle.operations.settings;
  }],
  ["GET", /^\/api\/business\/services\/configuration$/, (_m, q) =>
    scoped(q).operations.serviceConfiguration],
  ["POST", /^\/api\/business\/services\/configuration$/, (_m, q, body) => {
    const config = scoped(q).operations.serviceConfiguration;
    return applyConfiguration(config, body);
  }],

  ["GET", /^\/api\/business\/venues\/([^/]+)$/, (m) => needVenue(m[1]).profile],
  ["PUT", /^\/api\/business\/venues\/([^/]+)$/, (m, _q, body) => {
    const bundle = needVenue(m[1]);
    bundle.profile = {
      ...bundle.profile,
      name: body.name,
      shortName: body.shortName,
      description: body.description,
      cuisine: body.category,
      address: body.address,
      city: body.city,
      latitude: body.latitude ?? undefined,
      longitude: body.longitude ?? undefined,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      website: body.website,
      subline: `${body.kind === "drinks" ? "Bar" : "Restaurant"} · ${body.city}`,
    };
    return bundle.profile;
  }],
  ["PUT", /^\/api\/business\/venues\/([^/]+)\/listing$/, (m, _q, body) => {
    const bundle = needVenue(m[1]);
    bundle.profile = {
      ...bundle.profile,
      priceRange: body.priceRange,
      tags: body.tags,
      features: body.features,
      ambience: body.ambience,
    };
    return bundle.profile;
  }],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/menu$/, (m) => needVenue(m[1]).menuItems],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/staff$/, (m) => needVenue(m[1]).staff],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/assets$/, (m, q) =>
    assetsOf(needVenue(m[1]), q.kind ?? "photo")],
  ["POST", /^\/api\/business\/venues\/([^/]+)\/assets$/, (m, _q, body) =>
    applyAssetAction(needVenue(m[1]), body)],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/availability$/, (m) =>
    needVenue(m[1]).availability],
  ["PUT", /^\/api\/business\/venues\/([^/]+)\/availability$/, (m, _q, body) => {
    const bundle = needVenue(m[1]);
    // The whole record, with the guard stamped fresh: this is the
    // endpoint row 39 of the chiffrage names, and it takes a set rather
    // than a row precisely so a partial write cannot half-close a venue.
    bundle.availability = {
      venueId: m[1],
      slots: body.slots ?? [],
      closures: (body.closures ?? []).map((c) => ({
        ...c,
        id: c.id || `clo_${randomUUID().slice(0, 8)}`,
      })),
      updatedAt: isoNow(),
    };
    return bundle.availability;
  }],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/notification-preferences$/, (m) =>
    needVenue(m[1]).notificationPreferences],
  ["PUT", /^\/api\/business\/venues\/([^/]+)\/notification-preferences$/,
    (m, _q, body) => {
      const bundle = needVenue(m[1]);
      bundle.notificationPreferences = { ...bundle.notificationPreferences, ...body };
      return bundle.notificationPreferences;
    }],
  ["PUT", /^\/api\/business\/zones\/([^/]+)$/, (m, q, body) => {
    const bundle = scoped(q);
    const zone = bundle.overview.zones.find((z) => z.id === m[1]);
    if (!zone) throw new Refused(404, "zone_not_found");
    zone.available = Boolean(body?.available);
    return null;
  }],

  // The booking lifecycle — five of the seven endpoints of row 39.
  ["PUT", /^\/api\/business\/bookings\/([^/]+)\/confirm$/, (m, q) => {
    const bundle = scoped(q);
    transition(bundle, m[1], "confirmed");
    return bundle.overview;
  }],
  ["PUT", /^\/api\/business\/bookings\/([^/]+)\/reject$/, (m, q, body) => {
    const bundle = scoped(q);
    const row = transition(bundle, m[1], "rejected");
    // The coded reason is the point of the endpoint; a mock that dropped
    // it would let the portal ship a reason nothing reads.
    row.rejectionReason = body?.reason ?? "other";
    if (body?.note) row.rejectionNote = body.note;
    return bundle.overview;
  }],
  ["PUT", /^\/api\/business\/bookings\/([^/]+)\/cancel$/, (m, q) => {
    const bundle = scoped(q);
    transition(bundle, m[1], "cancelled");
    return bundle.overview;
  }],
  ["POST", /^\/api\/business\/bookings\/([^/]+)\/no-show$/, (m, q) => {
    const bundle = scoped(q);
    transition(bundle, m[1], "no_show");
    return bundle.overview;
  }],
  ["POST", /^\/api\/business\/bookings\/([^/]+)\/remind$/, () => null],

  // Décaler. The slot is checked against what this venue offers, because
  // that check is a contract rule (§3.1) and a double that skipped it
  // would let the portal ship a call no real service accepts.
  ["PUT", /^\/api\/business\/bookings\/([^/]+)\/reschedule$/, (m, q, body) => {
    const bundle = scoped(q);
    const at = String(body?.at ?? "");
    const day = at.slice(0, 10);
    if (!slotsFor(bundle, day).some((slot) => slot.at === at)) {
      return { status: 422, body: { code: "slot_unavailable" } };
    }
    const row = [...bundle.overview.upcomingReservations, ...bundle.overview.waitlist].find(
      (r) => r.id === m[1],
    );
    if (!row) return { status: 404, body: { code: "not_found" } };
    // The state is untouched on purpose — see §3.1, rule 2.
    row.at = at;
    return bundle.overview;
  }],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/slots$/, (_m, q) =>
    slotsFor(scoped(q), String(q.get("date") ?? "")),
  ],
  ["GET", /^\/api\/business\/venues\/([^/]+)\/bookings\/search$/, (_m, q) => {
    const bundle = scoped(q);
    const term = String(q.get("q") ?? "").trim().toLowerCase();
    if (term.length < 2) return [];
    const digits = term.replace(/\D/g, "");
    return [...bundle.overview.upcomingReservations, ...bundle.overview.waitlist].filter(
      (r) =>
        r.guestName.toLowerCase().includes(term) ||
        (digits !== "" && String(r.guestPhone).replace(/\D/g, "").includes(digits)) ||
        String(r.at).slice(0, 10) === term,
    );
  }],

  // LYFE's review of a listing.
  ["GET", /^\/api\/business\/venues\/pending$/, () => pendingVenues()],
  ["PUT", /^\/api\/business\/venues\/([^/]+)\/validation$/, (m, _q, body) => {
    const status = body?.status === "rejected" ? "rejected" : "validated";
    if (status === "rejected" && String(body?.reason ?? "").trim() === "") {
      return { status: 422, body: { code: "reason_required" } };
    }
    const bundle = db.venues[m[1]];
    if (!bundle) return { status: 404, body: { code: "venue_not_found" } };
    bundle.profile.status = status;
    bundle.profile.statusReason = status === "rejected" ? String(body.reason) : "";
    bundle.profile.statusChangedAt = isoNow();
    return pendingVenues();
  }],
  ["POST", /^\/api\/business\/bookings\/([^/]+)\/check-in$/, (m, q, body) =>
    checkIn(scoped(q), m[1], body?.qr_code ?? "")],
  ["POST", /^\/api\/business\/bookings\/check-in$/, (_m, q, body) =>
    checkIn(scoped(q), null, body?.qr_code ?? "")],

  // Lot 2 reads. Served from the same capture, so a Lot 2 walk against
  // this backend renders rather than 404s.
  ["GET", /^\/api\/business\/service-floor$/, (_m, q) => scoped(q).operations.serviceFloor],
  ["GET", /^\/api\/business\/guests\/graph$/, (_m, q) => scoped(q).operations.guestGraph],
  ["GET", /^\/api\/business\/audience$/, (_m, q) => scoped(q).operations.audience],
  ["GET", /^\/api\/business\/growth$/, (_m, q) => scoped(q).operations.growth],
  ["GET", /^\/api\/business\/nightlife$/, (_m, q) => scoped(q).operations.nightlife],
  ["GET", /^\/api\/business\/payments$/, (_m, q) => scoped(q).operations.moneyDesk],
  ["GET", /^\/api\/business\/payments\/spend-by-customer$/, (_m, q) =>
    scoped(q).operations.spendByCustomer],
  ["GET", /^\/api\/business\/marketing$/, (_m, q) => scoped(q).operations.marketing],
  ["GET", /^\/api\/business\/reviews\/survey$/, (_m, q) => scoped(q).operations.surveyConfig],
  ["GET", /^\/api\/business\/subscription$/, (_m, q) => scoped(q).operations.subscription],
  ["GET", /^\/api\/business\/support\/tickets$/, (_m, q) =>
    scoped(q).operations.supportTickets],
  ["GET", /^\/api\/business\/analytics$/, (_m, q) => scoped(q).analytics[q.period ?? "30d"]
    ?? Object.values(scoped(q).analytics)[0]],
  ["GET", /^\/api\/business\/visibility$/, (_m, q) => scoped(q).visibility[q.period ?? "30d"]
    ?? Object.values(scoped(q).visibility)[0]],
  ["GET", /^\/api\/business\/customers$/, (_m, q) => scoped(q).customers],
  ["GET", /^\/api\/business\/customers\/([^/]+)\/bookings$/, (m, q) =>
    (scoped(q).operations.bookingsByCustomer ?? {})[m[1]] ?? []],
  ["GET", /^\/api\/business\/customers\/([^/]+)$/, (m, q) =>
    scoped(q).customers.find((c) => c.id === m[1]) ?? null],
  ["GET", /^\/api\/business\/notifications$/, (_m, q) => scoped(q).notifications],
  ["PUT", /^\/api\/business\/notifications\/([^/]+)\/read$/, () => null],
  ["POST", /^\/api\/business\/reviews\/([^/]+)\/reply$/, () => null],

  // Lot 2 writes. Echoed, not applied — this double exists to exercise
  // the Lot 1 surface, and a half-applied Lot 2 action would be a
  // worse lie than an honest echo.
  ["POST", /^\/api\/business\/service-floor$/, (_m, q) => scoped(q).operations.serviceFloor],
  ["POST", /^\/api\/business\/guests\/graph$/, (_m, q) => scoped(q).operations.guestGraph],
  ["POST", /^\/api\/business\/growth$/, (_m, q) => scoped(q).operations.growth],
  ["POST", /^\/api\/business\/nightlife$/, (_m, q) => scoped(q).operations.nightlife],
  ["POST", /^\/api\/business\/payments$/, (_m, q) => scoped(q).operations.moneyDesk],
  ["POST", /^\/api\/business\/marketing$/, (_m, q) => scoped(q).operations.marketing],
  ["PUT", /^\/api\/business\/reviews\/survey$/, (_m, q, body) => {
    const bundle = scoped(q);
    bundle.operations.surveyConfig = { ...bundle.operations.surveyConfig, ...body };
    return bundle.operations.surveyConfig;
  }],
  ["POST", /^\/api\/business\/support\/tickets$/, (_m, q) =>
    scoped(q).operations.supportTickets],
];

const CITIES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir"];

const WEEK = [1, 2, 3, 4, 5, 6, 7];
const drafts = new Map();

/**
 * Turns a finished draft into a venue the rest of the routes can serve.
 *
 * The same seven pieces the SQLite driver writes — the venue, its
 * settings, the owner's membership, the account, the bookable windows,
 * a service definition and today's service row — except that here they
 * are one bundle in a Map. The service row matters as much as it does
 * there: a venue with no service in hand has no dashboard to render.
 */
function makeVenueFromDraft(draft) {
  const venueId = `${draft.venueType === "bar" ? "bar" : "rst"}_${randomUUID().slice(0, 8)}`;
  const kind = draft.venueType === "bar" ? "drinks" : "restaurant";
  const open = draft.hours.filter((h) => !h.closed);
  const pattern = open[0] ?? { opensAt: "12:00", closesAt: "23:00" };
  const today = new Date().toISOString().slice(0, 10);
  const initials =
    draft.venueName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "LY";

  const service = {
    id: `svc_${randomUUID().slice(0, 8)}`,
    kind: "diner",
    label: "Service",
    date: today,
    opensAt: `${today}T${pattern.opensAt}:00.000Z`,
    closesAt: `${today}T${pattern.closesAt}:00.000Z`,
    state: "scheduled",
    capacity: 40,
    bookedCovers: 0,
    arrivedCovers: 0,
    noShowCovers: 0,
    revenueMad: 0,
    slotLoad: [],
  };
  const profile = {
    id: venueId,
    kind: "gastronomique",
    name: draft.venueName,
    shortName: draft.venueName.slice(0, 40),
    initials,
    city: draft.city,
    subline: `${kind === "drinks" ? "Bar" : "Restaurant"} · ${draft.city}`,
    cuisine: "",
    capacity: 40,
    contactEmail: "",
    contactPhone: "",
    website: "",
    currency: "MAD",
    onboardingCompleted: true,
    // Like the real driver: a listing waits for LYFE. The double has to
    // agree, or a portal in `http` mode would show no banner where a
    // portal on the database shows one.
    status: "pending_review",
    statusReason: "",
    statusChangedAt: null,
    description: "",
    address: draft.address,
    latitude: draft.latitude ?? undefined,
    longitude: draft.longitude ?? undefined,
    priceRange: 2,
    tags: [],
    features: [],
    ambience: [],
  };

  // Built from an existing bundle so every field the types require is
  // present, then emptied: a new venue has no bookings, no reviews and
  // no history, and inventing any would be a lie the screens repeat.
  const template = Object.values(db.venues)[0];
  const bundle = JSON.parse(JSON.stringify(template));
  bundle.profile = profile;
  bundle.overview = {
    ...bundle.overview,
    restaurant: profile,
    currentService: service,
    services: [service],
    zones: [],
    upcomingReservations: [],
    waitlist: [],
    activity: [],
    topItems: [],
    reviews: [],
    payouts: [],
    coversToday: { count: 0, deltaPctVsYesterday: 0, series24h: [], peakHourLabel: "" },
    averageTicket: { amountMad: 0, deltaPctVsLastWeek: 0 },
    occupancy: { pct: 0, deltaPctVsLastWeek: 0 },
    noShows: { count: 0, lostRevenueMad: 0 },
    revenueWeek: { amountMad: 0, deltaPctVsLastWeek: 0, series: [] },
    rating: { average: 0, reviewCount: 0, deltaVsLastMonth: null },
    nextPayout: { amountMad: 0, scheduledFor: isoNow() },
  };
  bundle.dayBooks = {};
  bundle.customers = [];
  bundle.notifications = [];
  bundle.photos = draft.coverObjectKey
    ? [
        {
          id: `ast_${randomUUID().slice(0, 10)}`,
          venueId,
          kind: "photo",
          objectKey: draft.coverObjectKey,
          contentType: draft.coverContentType || "image/jpeg",
          sizeBytes: draft.coverSizeBytes || 0,
          position: 0,
          createdAt: isoNow(),
        },
      ]
    : [];
  bundle.menuFiles = [];
  bundle.menuItems = [];
  bundle.staff = [];
  bundle.availability = {
    venueId,
    slots: open.map((h, i) => ({
      id: `slot_${i + 1}`,
      weekday: h.weekday,
      opensAt: h.opensAt,
      closesAt: h.closesAt,
      capacity: 40,
      enabled: true,
    })),
    closures: [],
    updatedAt: isoNow(),
  };
  bundle.operations.settings = {
    ...bundle.operations.settings,
    configuration: kind === "drinks" ? "lounge" : "restaurant",
  };
  bundle.operations.serviceConfiguration = {
    services: [
      {
        id: `svd_${randomUUID().slice(0, 8)}`,
        name: "Service",
        kind: "diner",
        weekdays: (open.length ? open : draft.hours).map((h) => h.weekday),
        startsAt: pattern.opensAt,
        endsAt: pattern.closesAt,
        lastBookingAt: pattern.closesAt,
        capacityCovers: 40,
        coversPerQuarter: 6,
        turnMinutesSmall: 90,
        turnMinutesLarge: 120,
        zoneIds: [],
        enabled: true,
        version: 1,
        updatedAt: isoNow(),
      },
    ],
    pacing: bundle.operations.serviceConfiguration.pacing,
  };

  db.venues[venueId] = bundle;
  const owner = db.users.find((u) => u.userId === draft.ownerId);
  if (owner) {
    owner.venues.push({
      id: venueId,
      name: profile.name,
      shortName: profile.shortName,
      initials,
      city: profile.city,
      kind,
      role: "owner",
    });
  }
  db.businessAccounts[draft.ownerId] = {
    businessId: `biz_${randomUUID().slice(0, 8)}`,
    venueId,
    ownerId: draft.ownerId,
    subscriptionTier: "annual",
    featuresEnabled: ["bookings", "availability"],
  };
  draft.submittedVenueId = venueId;
  draft.step = 6;
  return venueId;
}

function needVenue(id) {
  const bundle = venue(id);
  if (!bundle) throw new Refused(404, "venue_not_found", `Aucun lieu ${id}.`);
  return bundle;
}

/**
 * The venue a scoped call is about.
 *
 * `venue_id` is a hint the driver sends and the service is supposed to
 * re-derive from the token. This double has one tenant, so it takes the
 * hint — and refuses an id it does not hold, which is the behaviour the
 * contract says the portal relies on.
 */
function scoped(q) {
  return needVenue(q.venue_id ?? Object.keys(db.venues)[0]);
}

// ── LYFE's review, and the venue's own slots ──────────────────

/**
 * The listings waiting for a decision.
 *
 * The captured venues are live — the snapshot is of a running
 * establishment — so the queue only ever holds what this process
 * created through /inscription, which is exactly what makes it a useful
 * double: walk the six steps and the venue appears here.
 */
function pendingVenues() {
  return Object.entries(db.venues)
    .filter(([, b]) => (b.profile.status ?? "validated") === "pending_review")
    .map(([id, b]) => ({
      id,
      name: b.profile.name,
      kind: b.profile.kind === "drinks" ? "drinks" : "restaurant",
      city: b.profile.city,
      address: b.profile.address ?? "",
      contactEmail: b.profile.contactEmail ?? "",
      contactPhone: b.profile.contactPhone ?? "",
      ownerName: b.staff?.[0]?.fullName ?? "—",
      createdAt: b.profile.createdAt ?? isoNow(),
      hasPhoto: (b.photos ?? []).length > 0,
      openDays: new Set((b.availability?.slots ?? []).map((x) => x.weekday)).size,
    }));
}

/**
 * The times one day can take, on each service's own grid.
 *
 * The same walk the SQLite driver does — the weekdays a service runs,
 * its opening, its last accepted booking and its `slotMinutes` — because
 * a double that offered a different set would let the portal ship a
 * Décaler sheet that only works against one of the two.
 */
function slotsFor(bundle, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  if ((bundle.availability?.closures ?? []).some((c) => c.date === date)) return [];
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const weekday = day === 0 ? 7 : day;
  const minutes = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const out = [];
  for (const svc of bundle.operations?.serviceConfiguration?.services ?? []) {
    if (!svc.enabled || !(svc.weekdays ?? []).includes(weekday)) continue;
    const step = [15, 30, 60].includes(svc.slotMinutes) ? svc.slotMinutes : 30;
    const start = minutes(svc.startsAt);
    const raw = minutes(svc.lastBookingAt);
    const last = raw < start ? raw + 24 * 60 : raw;
    for (let m = start; m <= last; m += step) {
      const d = new Date(`${date}T00:00:00.000Z`);
      d.setUTCMinutes(m);
      out.push({ at: d.toISOString(), serviceLabel: svc.name });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

function assetsOf(bundle, kind) {
  return kind === "menu_file" ? bundle.menuFiles : bundle.photos;
}

function applyAssetAction(bundle, action) {
  if (action?.kind === "asset.record") {
    const list = assetsOf(bundle, action.assetKind);
    list.push({
      id: `ast_${randomUUID().slice(0, 12)}`,
      venueId: bundle.profile.id,
      kind: action.assetKind,
      objectKey: action.objectKey,
      contentType: action.contentType,
      sizeBytes: action.sizeBytes,
      position: list.length,
      createdAt: isoNow(),
    });
    return list;
  }
  if (action?.kind === "asset.remove") {
    for (const kind of ["photo", "menu_file"]) {
      const list = assetsOf(bundle, kind);
      const at = list.findIndex((a) => a.id === action.id);
      if (at >= 0) {
        list.splice(at, 1);
        return list;
      }
    }
    throw new Refused(404, "asset_not_found");
  }
  if (action?.kind === "asset.reorder") {
    const list = assetsOf(bundle, action.assetKind);
    const byId = new Map(list.map((a) => [a.id, a]));
    const ordered = action.orderedIds
      .map((id, index) => {
        const found = byId.get(id);
        return found ? { ...found, position: index } : null;
      })
      .filter(Boolean);
    if (action.assetKind === "menu_file") bundle.menuFiles = ordered;
    else bundle.photos = ordered;
    return ordered;
  }
  throw new Refused(400, "unknown_action");
}

/** `service.save`, `service.remove`, `pacing.save` — versioned. */
function applyConfiguration(config, action) {
  if (action?.kind === "service.save") {
    const { expectedVersion, kind, kindLabel, id, ...rest } = action;
    const at = config.services.findIndex((s) => s.id === id);
    if (at >= 0) {
      // The version guard the contract insists on: a stale edit is
      // refused, never merged, because this decides what is bookable.
      if (
        expectedVersion !== null &&
        expectedVersion !== undefined &&
        config.services[at].version !== expectedVersion
      ) {
        throw new Refused(409, "stale", "La configuration a changé entre-temps.");
      }
      config.services[at] = {
        ...config.services[at],
        ...rest,
        kind: kindLabel ?? config.services[at].kind,
        version: config.services[at].version + 1,
        updatedAt: isoNow(),
      };
    } else {
      config.services.push({
        ...rest,
        id: `svc_${randomUUID().slice(0, 8)}`,
        kind: kindLabel ?? "dinner",
        version: 1,
        updatedAt: isoNow(),
      });
    }
    return config;
  }
  if (action?.kind === "service.remove") {
    config.services = config.services.filter((s) => s.id !== action.id);
    return config;
  }
  if (action?.kind === "pacing.save") {
    const { expectedVersion, kind, ...rest } = action;
    if (expectedVersion !== undefined && config.pacing.version !== expectedVersion) {
      throw new Refused(409, "stale", "Les règles ont changé entre-temps.");
    }
    config.pacing = {
      ...config.pacing,
      ...rest,
      version: config.pacing.version + 1,
      updatedAt: isoNow(),
    };
    return config;
  }
  throw new Refused(400, "unknown_action");
}

function checkIn(bundle, reservationId, code) {
  const rows = everyBooking(bundle);
  const needle = String(code).trim().toUpperCase();
  const method = needle ? "qr" : "manual";
  const match = needle
    ? rows.find(
        (r) => `LYFE-${r.id}`.toUpperCase() === needle || r.id.toUpperCase() === needle,
      )
    : rows.find((r) => r.id === reservationId);

  if (!match) return { ok: false, method, error: "unknown_code" };
  if (match.state === "arrived") return { ok: false, method, error: "already_used" };
  if (["cancelled", "rejected", "no_show"].includes(match.state)) {
    return { ok: false, method, error: "expired" };
  }

  transition(bundle, match.id, "arrived");
  return {
    ok: true,
    bookingId: match.id,
    guestName: match.guestName,
    partySize: match.partySize,
    method,
  };
}

// ── The server ──────────────────────────────────────────────

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const query = Object.fromEntries(url.searchParams.entries());

  const send = (status, payload) => {
    const body = payload === null || payload === undefined ? "" : JSON.stringify(payload);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
    const tail = status >= 400 ? ` ${body.slice(0, 120)}` : "";
    console.log(`${req.method} ${url.pathname}${url.search} → ${status}${tail}`);
  };

  // Health, unauthenticated, so a launch script can wait on it.
  if (url.pathname === "/__health") {
    return send(200, {
      ok: true,
      snapshot: RAW.capturedAt,
      lot: RAW.capturedUnderLot ?? null,
      venues: Object.keys(db.venues),
      routes: ROUTES.length,
    });
  }

  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ") || (TOKEN && auth.slice(7) !== TOKEN)) {
    return send(401, { code: "unauthenticated", message: "Jeton manquant." });
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });
  req.on("end", () => {
    let body = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        return send(400, { code: "bad_json", message: "Corps illisible." });
      }
    }

    for (const [method, pattern, handler] of ROUTES) {
      if (req.method !== method) continue;
      const match = pattern.exec(url.pathname);
      if (!match) continue;
      try {
        const payload = handler(match, query, body);
        return payload === null || payload === undefined
          ? send(204, null)
          : send(200, payload);
      } catch (error) {
        if (error instanceof Refused) {
          return send(error.status, { code: error.code, message: error.message });
        }
        console.error(error);
        return send(500, { code: "mock_failed", message: String(error?.message ?? error) });
      }
    }

    // A path the driver calls and this file does not serve is a hole in
    // the contract; saying so beats a silent empty screen.
    send(404, { code: "no_route", message: `${req.method} ${url.pathname}` });
  });
});

server.listen(PORT, () => {
  console.log(
    `mock Business Service · :${PORT} · ${ROUTES.length} routes · ` +
      `capture ${RAW.capturedAt} · lieux ${Object.keys(db.venues).join(", ")}`,
  );
});
