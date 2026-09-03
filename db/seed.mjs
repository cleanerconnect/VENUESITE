// Database seed.
//
// The brief allows seed data only as a seed script, never as an object
// literal in a component. This is that script: everything the demo venue
// needs, written once, into the store the app actually reads.
//
//   node db/seed.mjs [path]        # default: .data/lyfe.db
//   node db/seed.mjs --reset       # drop and recreate first

import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const dbPath = resolve(args.find((a) => !a.startsWith("--")) ?? ".data/lyfe.db");

if (reset && existsSync(dbPath)) rmSync(dbPath);
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec(readFileSync(resolve("db/schema.sql"), "utf8"));

const now = new Date();
const iso = (d) => d.toISOString();
const daysAgo = (n) => iso(new Date(now.getTime() - n * 86_400_000));
const daysAhead = (n) => iso(new Date(now.getTime() + n * 86_400_000));
const minutesAgo = (n) => iso(new Date(now.getTime() - n * 60_000));
const minutesAhead = (n) => iso(new Date(now.getTime() + n * 60_000));
const day = (d) => iso(d).slice(0, 10);
/** Money is stored in centimes; the app works in MAD. */
const mad = (n) => Math.round(n * 100);

const VENUE = "rst_dar_zellij";
const OWNER = "usr_yassine";

const insert = (table, row) => {
  const keys = Object.keys(row);
  db.prepare(
    `INSERT OR REPLACE INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
  ).run(...keys.map((k) => row[k]));
};

// ── Venue ────────────────────────────────────────────────────
insert("venues", {
  id: VENUE,
  kind: "restaurant",
  name: "Dar Zellij",
  short_name: "Dar Zellij",
  initials: "DZ",
  description:
    "Cuisine marocaine contemporaine dans un riad du XIXe siècle. Patio, grande salle et terrasse sur les toits.",
  category: "Marocaine contemporaine",
  address: "12 derb Sidi Ahmed Soussi, Médina",
  city: "Marrakech",
  latitude: 31.6295,
  longitude: -7.9811,
  contact_email: "reservations@darzellij.ma",
  contact_phone: "+212 524 38 26 00",
  website: "https://darzellij.ma",
  currency: "MAD",
  capacity: 120,
  price_range: 3,
  onboarding_completed: 1,
  created_at: daysAgo(400),
  updated_at: iso(now),
});

insert("business_accounts", {
  business_id: "biz_dar_zellij",
  venue_id: VENUE,
  owner_id: OWNER,
  subscription_tier: "annual",
  features_enabled: JSON.stringify([
    "bookings", "availability", "analytics", "crm",
    "reviews", "visibility", "team",
  ]),
  created_at: daysAgo(400),
});

// Listing facets — what the app shows as chips and filters on.
[
  ["tag", ["Marocain", "Riad", "Romantique", "Vue sur la médina", "Groupes"]],
  ["feature", ["terrasse", "climatisation", "acces_pmr", "wifi", "vue", "musique_live"]],
  ["ambience", ["Intimiste", "Traditionnel", "Cadre exceptionnel"]],
].forEach(([kind, values]) =>
  values.forEach((value, i) =>
    insert("venue_tags", { venue_id: VENUE, kind, value, position: i }),
  ),
);

// ── Staff ────────────────────────────────────────────────────
[
  ["stf_1", OWNER, "Yassine Alami", "yassine@darzellij.ma", "owner", 2],
  ["stf_2", "usr_rachid", "Rachid Amrani", "rachid@darzellij.ma", "manager", 5],
  ["stf_3", "usr_imane", "Imane Ouali", "imane@darzellij.ma", "staff", 40],
  ["stf_4", "usr_karim", "Karim Sefrioui", "karim@darzellij.ma", "staff", 1440],
].forEach(([id, user, name, email, role, mins]) =>
  insert("staff", {
    id, venue_id: VENUE, user_id: user, full_name: name, email,
    role, last_active: minutesAgo(mins), pending: 0, created_at: daysAgo(200),
  }),
);

// ── Zones and tables ─────────────────────────────────────────
const ZONES = [
  ["z_patio", "Patio", 48, 0],
  ["z_salle", "Grande salle", 44, 1],
  ["z_terrasse", "Terrasse", 28, 2],
];
ZONES.forEach(([id, name, capacity, position]) =>
  insert("zones", { id, venue_id: VENUE, name, capacity, available: 1, position }),
);

// ── Availability ─────────────────────────────────────────────
const WEEK = [
  [1, "12:00", "15:00", 60, 1], [1, "19:00", "23:30", 120, 1],
  [2, "12:00", "15:00", 60, 1], [2, "19:00", "23:30", 120, 1],
  [3, "12:00", "15:00", 60, 1], [3, "19:00", "23:30", 120, 1],
  [4, "12:00", "15:00", 60, 1], [4, "19:00", "23:30", 120, 1],
  [5, "12:00", "15:30", 72, 1], [5, "19:00", "00:30", 120, 1],
  [6, "12:00", "15:30", 72, 1], [6, "19:00", "00:30", 120, 1],
  [7, "12:00", "16:00", 92, 1], [7, "19:00", "23:00", 100, 0],
];
WEEK.forEach(([weekday, opens, closes, capacity, enabled], i) =>
  insert("availability_slots", {
    id: `slot_${i + 1}`, venue_id: VENUE, weekday,
    opens_at: opens, closes_at: closes, capacity, enabled,
    version: 1, updated_at: iso(now),
  }),
);
insert("closures", {
  id: "cl_1", venue_id: VENUE, date: day(new Date(now.getTime() + 12 * 86_400_000)),
  reason: "Privatisation",
});

// ── Customers ────────────────────────────────────────────────
const CUSTOMERS = [
  ["cus_1", "Salma Bennani", "+212 661 20 44 18", "salma.bennani@gmail.com", 6, 21, 780, 0, ["Sans porc", "Table au patio"]],
  ["cus_2", "Hind Tazi", "+212 660 15 62 40", "h.tazi@outlook.com", 9, 9, 1120, 0, ["Allergie fruits de mer", "Anniversaire en mai"]],
  ["cus_3", "Groupe Karam", "+212 662 88 10 03", null, 2, 48, 1640, 1, ["Sans gluten (2 couverts)"]],
  ["cus_4", "Yasmine El Alaoui", "+212 663 41 77 92", "yasmine.ea@gmail.com", 1, 74, 620, 2, []],
  ["cus_5", "Nabil Cherkaoui", "+212 665 09 33 71", null, 0, 0, 0, 0, ["Table près de la fontaine"]],
  ["cus_6", "Omar Idrissi", "+212 667 74 21 08", null, 0, 0, 0, 0, []],
  ["cus_7", "Famille Berrada", "+212 668 30 90 55", null, 3, 33, 940, 0, ["Chaise haute"]],
  ["cus_8", "Leïla Mansouri", "+212 664 51 12 87", "leila.m@gmail.com", 14, 4, 890, 0, ["Végétarienne", "Terrasse"]],
  ["cus_9", "Thomas Renaud", "+33 6 12 44 90 21", "t.renaud@free.fr", 2, 5, 1310, 0, []],
  ["cus_10", "Karim Hakimi", "+212 669 22 41 06", null, 4, 60, 700, 1, ["Table calme"]],
  ["cus_11", "Amina Bouzid", "+212 661 88 03 45", "amina.bouzid@gmail.com", 11, 16, 830, 0, ["Sans alcool"]],
  ["cus_12", "Sofia Lahlou", "+212 666 70 15 29", null, 5, 27, 760, 3, []],
];
CUSTOMERS.forEach(([id, name, phone, email, visits, lastDays, avg, noShows, prefs], i) => {
  insert("customers", {
    id, venue_id: VENUE, app_user_id: `app_user_${i + 1}`,
    full_name: name, phone, email,
    first_seen_at: daysAgo(90 + i * 11),
    last_visit_at: visits > 0 ? daysAgo(lastDays) : null,
    visit_count: visits,
    total_spend_cents: mad(avg * visits),
    loyalty_tier: null,      // read from the loyalty service, never derived
    loyalty_points: null,
    opted_out_of_marketing: i % 7 === 0 ? 1 : 0,
  });
  prefs.forEach((label) => insert("customer_preferences", { customer_id: id, label }));

  // The booking has to exist before the no-show that references it.
  for (let n = 0; n < noShows; n += 1) {
    insert("reservations", {
      id: `res_hist_${id}_${n}`, venue_id: VENUE, service_id: null, customer_id: id,
      guest_name: name, guest_phone: phone, party_size: 2 + (n % 3),
      at: daysAgo(20 * (n + 1)), state: "no_show", channel: "lyfe",
      zone_id: null, note: null, deposit_cents: null,
      no_show_risk: null, qr_code: `LYFE-HIST-${id}-${n}`, checked_in_at: null,
      created_at: daysAgo(21 * (n + 1)), updated_at: daysAgo(20 * (n + 1)),
    });
    insert("no_show_records", {
      id: `ns_${id}_${n}`, venue_id: VENUE, customer_id: id,
      reservation_id: `res_hist_${id}_${n}`, party_size: 2 + (n % 3),
      at: daysAgo(20 * (n + 1) + i),
    });
  }
});

// ── Current service ──────────────────────────────────────────
//
// Anchored to whenever the seed runs, so a demo opened at any hour shows
// a service in progress. The kind is derived from that hour rather than
// fixed: a "Dîner" running from 09h05 is the kind of detail that tells a
// partner the whole screen is fake.
const SERVICE = "svc_current";
const opens = new Date(now.getTime() - 100 * 60_000);
const closes = new Date(now.getTime() + 170 * 60_000);

function serviceKindFor(date) {
  const hour = date.getHours();
  if (hour < 11) return ["petit_dejeuner", "Petit-déjeuner"];
  if (hour < 16) return ["dejeuner", "Déjeuner"];
  if (hour < 23) return ["diner", "Dîner"];
  return ["tardif", "Service tardif"];
}
const [serviceKind, serviceLabel] = serviceKindFor(opens);

insert("services", {
  id: SERVICE, venue_id: VENUE, kind: serviceKind, label: serviceLabel,
  date: day(opens), opens_at: iso(opens), closes_at: iso(closes),
  state: "peak", capacity: 120, booked_covers: 104, arrived_covers: 86,
  no_show_covers: 6, revenue_cents: mad(63_400),
});
const SHAPE = [0.28, 0.55, 0.82, 1, 0.94, 0.76, 0.58, 0.4, 0.26, 0.14];
for (let i = 0; i < SHAPE.length; i += 1) {
  insert("service_slot_load", {
    service_id: SERVICE,
    at: iso(new Date(opens.getTime() + i * 30 * 60_000)),
    covers: Math.round(34 * SHAPE[i]),
  });
}

// ── Live bookings ────────────────────────────────────────────
const BOOKINGS = [
  ["res_001", "cus_1", "Salma Bennani", "+212 661 20 44 18", 4, 20, "confirmed", "lyfe", "z_patio", "Anniversaire, dessert avec bougie", 400, 0.04],
  ["res_002", "cus_3", "Groupe Karam", "+212 662 88 10 03", 6, 35, "confirmed", "phone", "z_salle", "Sans gluten pour deux couverts", null, 0.11],
  ["res_003", "cus_4", "Yasmine El Alaoui", "+212 663 41 77 92", 4, 50, "confirmed", "instagram", "z_terrasse", null, null, 0.38],
  ["res_010", "cus_5", "Nabil Cherkaoui", "+212 665 09 33 71", 2, 80, "requested", "lyfe", null, "Demande une table près de la fontaine", null, 0.22],
  ["res_011", "cus_2", "Hind Tazi", "+212 660 15 62 40", 5, 105, "confirmed", "partner", "z_salle", null, 500, 0.03],
  ["res_w1", "cus_6", "Omar Idrissi", "+212 667 74 21 08", 2, 15, "waitlisted", "walk_in", null, null, null, null],
  ["res_w2", "cus_7", "Famille Berrada", "+212 668 30 90 55", 4, 25, "waitlisted", "walk_in", null, null, null, null],
];
BOOKINGS.forEach(([id, cus, name, phone, size, inMin, state, channel, zone, note, deposit, risk]) => {
  insert("reservations", {
    id, venue_id: VENUE, service_id: SERVICE, customer_id: cus,
    guest_name: name, guest_phone: phone, party_size: size,
    at: minutesAhead(inMin), state, channel, zone_id: zone,
    note, deposit_cents: deposit === null ? null : mad(deposit),
    no_show_risk: risk,
    // The QR the app shows the guest (EP20-US9). The portal validates it.
    qr_code: `LYFE-${id.toUpperCase()}`,
    checked_in_at: null,
    created_at: daysAgo(3), updated_at: minutesAgo(30),
  });
  insert("reservation_status_history", {
    id: `sh_${id}_1`, reservation_id: id, from_state: null,
    to_state: "requested", actor: "user", actor_id: cus,
    reason_code: null, note: null, at: daysAgo(3),
  });
  if (state !== "requested" && state !== "waitlisted") {
    insert("reservation_status_history", {
      id: `sh_${id}_2`, reservation_id: id, from_state: "requested",
      to_state: state, actor: "venue", actor_id: OWNER,
      reason_code: null, note: null, at: daysAgo(2),
    });
  }
});

// ── Menu (customer-facing listing) ─────────────────────────
[
  ["mi_pastilla", "Pastilla de pigeon", "Feuilleté croustillant, amandes et cannelle.", "entree", 180, 1, []],
  ["mi_tajine", "Tajine d'agneau aux pruneaux", "Cuit sept heures, amandes grillées.", "plat", 260, 1, []],
  ["mi_seabass", "Loup de mer chermoula", "Pêche du jour, marinade chermoula.", "plat", 320, 0, ["sans_gluten"]],
  ["mi_couscous", "Couscous royal du vendredi", "Servi le vendredi uniquement.", "plat", 240, 0, []],
  ["mi_zaalouk", "Zaalouk d'aubergines", "Aubergines fumées, tomate, coriandre.", "entree", 80, 0, ["vegetarien", "vegan"]],
  ["mi_orange", "Salade d'orange à la cannelle", "Oranges de Marrakech, fleur d'oranger.", "dessert", 90, 0, ["vegetarien", "sans_gluten"]],
  ["mi_negroni", "Negroni safrané", "Safran de Taliouine, gin infusé.", "cocktail", 140, 1, []],
].forEach(([id, name, description, category, price, signature, dietary], i) => {
  insert("menu_items", {
    id, venue_id: VENUE, name, description, category,
    price_cents: mad(price), signature, visible: 1, position: i,
  });
  dietary.forEach((tag) => insert("menu_item_dietary", { item_id: id, tag }));
});

// ── Reviews ──────────────────────────────────────────────────
[
  ["rev_1", "cus_8", "Leïla M.", 5, "Le patio au coucher du soleil, rien à redire. Service attentif sans être pesant.", "lyfe", 180, ["cadre", "service"]],
  ["rev_2", "cus_9", "Thomas R.", 4, "Cuisine excellente. Vingt minutes d'attente malgré la réservation à 21h.", "google", 420, ["attente", "cuisine"]],
  ["rev_3", null, "Amina B.", 5, "La pastilla vaut le détour à elle seule.", "lyfe", 1500, ["cuisine"]],
  ["rev_4", "cus_10", "Karim H.", 3, "Table en terrasse bruyante, on s'entendait à peine.", "google", 2600, ["bruit", "terrasse"]],
].forEach(([id, cus, name, rating, comment, channel, mins, tags]) => {
  insert("reviews", {
    id, venue_id: VENUE, customer_id: cus, guest_name: name,
    rating, comment, channel, at: minutesAgo(mins),
  });
  tags.forEach((tag) => insert("review_tags", { review_id: id, tag }));
});
insert("review_replies", {
  id: "rr_1", review_id: "rev_1", message: "Merci Leïla, au plaisir de vous revoir au patio.",
  author_id: OWNER, published: 0, created_at: minutesAgo(120),
});

// ── Notifications ────────────────────────────────────────────
[
  ["ntf_1", "booking_request", "Nouvelle demande de réservation", "Nabil Cherkaoui · 2 personnes · à confirmer", "/restaurant/reservations", 0, 4],
  ["ntf_2", "cancellation", "Réservation annulée", "Sofia Lahlou a annulé sa table de 2", "/restaurant/reservations", 0, 47],
  ["ntf_3", "review", "Nouvel avis · 5 étoiles", "Leïla M. — « Le patio au coucher du soleil, rien à redire. »", "/restaurant/avis", 1, 180],
].forEach(([id, type, title, body, href, read, mins]) =>
  insert("notifications", { id, venue_id: VENUE, type, title, body, href, read, at: minutesAgo(mins) }),
);
[
  ["new_booking", ["push", "email"]],
  ["cancellation", ["push"]],
  ["review", ["email"]],
  ["daily_summary", ["email"]],
].forEach(([event_type, channels]) =>
  insert("notification_preferences", { venue_id: VENUE, event_type, channels: JSON.stringify(channels) }),
);

// ── Payouts ──────────────────────────────────────────────────
[
  ["pay_current", 291_700, 17_900, 612, 3, null, "scheduled"],
  ["pay_prev", 268_400, 16_500, 571, -2, -2, "paid"],
  ["pay_prev2", 243_100, 14_900, 518, -9, -9, "paid"],
].forEach(([id, amount, commission, covers, schedDays, paidDays, state], i) =>
  insert("payouts", {
    id, venue_id: VENUE, reference: `LYFE-DZ-${id.toUpperCase()}`,
    amount_cents: mad(amount), commission_cents: mad(commission),
    covers_settled: covers,
    period_start: daysAgo(7 * (i + 1)), period_end: daysAgo(7 * i),
    scheduled_for: schedDays >= 0 ? daysAhead(schedDays) : daysAgo(-schedDays),
    paid_at: paidDays === null ? null : daysAgo(-paidDays),
    state,
  }),
);

// ── Analytics rollup (owned by the tracking pipeline) ────────
for (let i = 0; i < 365; i += 1) {
  const d = new Date(now.getTime() - i * 86_400_000);
  const weekend = [5, 6, 0].includes(d.getDay());
  const covers = Math.round((weekend ? 118 : 74) * (1 - i / 2400)) + ((i * 13) % 17) - 8;
  insert("analytics_daily", {
    venue_id: VENUE, date: day(d),
    covers_served: Math.max(0, covers),
    revenue_cents: mad(Math.max(0, covers) * 737),
    no_shows: Math.max(0, Math.round(covers * 0.045) - (i % 3)),
    bookings_made: Math.max(0, covers + 12),
    bookings_refused: i % 5,
    capacity: 240,
    impressions: 1_280 + ((i * 37) % 400),
    listing_views: 160 + ((i * 11) % 90),
  });
}

// ── Activity ─────────────────────────────────────────────────
[
  ["act_1", "guest_arrived", "Salma Bennani", "est arrivée · 4 couverts", "res_001", 0, 1],
  ["act_2", "reservation_created", "Nabil Cherkaoui", "a demandé une table pour 2", "res_010", 0, 4],
  ["act_3", "anomaly", "LYFE", "détecte 3 annulations sur le même créneau", null, 1, 9],
  ["act_4", "guest_arrived", "Hind Tazi", "est arrivée · 5 couverts", "res_011", 0, 12],
  ["act_6", "waitlist_joined", "Famille Berrada", "rejoint la liste d'attente · 4 couverts", "res_w2", 0, 23],
  ["act_7", "review_received", "Leïla M.", "a laissé un avis 5 étoiles", null, 0, 180],
  ["act_8", "no_show", "Réservation précédente", "notée absente après 25 min · 3 couverts", null, 1, 40],
  ["act_9", "reservation_cancelled", "Sofia Lahlou", "a annulé sa table de 2", null, 0, 47],
  ["act_10", "payment_settled", "LYFE", "a clôturé le versement de la semaine", null, 0, 2880],
].forEach(([id, type, actor, message, res, attention, mins]) =>
  insert("activity", {
    id, venue_id: VENUE, type, actor, message,
    reservation_id: res,
    needs_attention: attention, at: minutesAgo(mins),
  }),
);

// ── Second venue ─────────────────────────────────────────────
//
// A bar, owned by the same person as the restaurant. It exists so three
// things stop being theoretical: the venue switcher has somewhere to
// switch to, the login flow's multiple-venues state has real accounts
// behind it, and venue scoping can be demonstrated with two venues
// rather than asserted against one.
//
// Deliberately lighter than Dar Zellij — enough rows for every screen to
// render honestly, not a second full dataset.
const VENUE2 = "bar_nomad_casa";

insert("venues", {
  id: VENUE2,
  kind: "drinks",
  name: "Nomad Rooftop",
  short_name: "Nomad",
  initials: "NR",
  description:
    "Bar à cocktails sur les toits, vue sur le port. Ouvert du mercredi au dimanche, DJ le week-end.",
  category: "Bar à cocktails",
  address: "18 boulevard d'Anfa, Gauthier",
  city: "Casablanca",
  latitude: 33.5899,
  longitude: -7.6328,
  contact_email: "reservations@nomadrooftop.ma",
  contact_phone: "+212 522 47 11 90",
  website: "https://nomadrooftop.ma",
  currency: "MAD",
  capacity: 70,
  price_range: 3,
  onboarding_completed: 1,
  created_at: daysAgo(180),
  updated_at: iso(now),
});

insert("business_accounts", {
  business_id: "biz_nomad",
  venue_id: VENUE2,
  owner_id: OWNER,
  subscription_tier: "annual",
  features_enabled: JSON.stringify([
    "bookings", "availability", "analytics", "reviews", "team",
  ]),
  created_at: daysAgo(180),
});

[
  ["tag", ["Cocktails", "Rooftop", "Vue mer", "DJ", "Afterwork"]],
  ["feature", ["terrasse", "vue", "musique_live", "climatisation"]],
  ["ambience", ["Festif", "Coucher de soleil"]],
].forEach(([kind, values]) =>
  values.forEach((value, i) =>
    insert("venue_tags", { venue_id: VENUE2, kind, value, position: i }),
  ),
);

[
  ["stf_n1", OWNER, "Yassine Alami", "yassine@darzellij.ma", "owner", 2],
  ["stf_n2", "usr_sofia", "Sofia Bennis", "sofia@nomadrooftop.ma", "manager", 18],
  // Rachid manages both venues and holds no event organisation, which
  // makes his the account that lands on the venue chooser at login.
  ["stf_n3", "usr_rachid", "Rachid Amrani", "rachid@darzellij.ma", "manager", 30],
].forEach(([id, user, name, email, role, mins]) =>
  insert("staff", {
    id, venue_id: VENUE2, user_id: user, full_name: name, email,
    role, last_active: minutesAgo(mins), pending: 0, created_at: daysAgo(150),
  }),
);

[
  ["z_n_bar", "Bar", 24, 0],
  ["z_n_toit", "Terrasse toit", 46, 1],
].forEach(([id, name, capacity, position]) =>
  insert("zones", { id, venue_id: VENUE2, name, capacity, available: 1, position }),
);

// Wednesday to Sunday, evenings only — a bar, not a restaurant.
// Weekdays are 1-7 (Monday-Sunday), matching the schema's constraint.
[3, 4, 5, 6, 7].forEach((weekday, i) =>
  insert("availability_slots", {
    id: `av_n_${i}`, venue_id: VENUE2, weekday,
    opens_at: "18:00", closes_at: weekday === 5 || weekday === 6 ? "02:00" : "01:00",
    capacity: 70, enabled: 1, version: 1, updated_at: iso(now),
  }),
);

const SERVICE2 = "svc_nomad_current";
const opens2 = new Date(now.getTime() - 40 * 60_000);
const closes2 = new Date(now.getTime() + 260 * 60_000);
const [kind2, label2] = serviceKindFor(opens2);
insert("services", {
  id: SERVICE2, venue_id: VENUE2, kind: kind2, label: label2,
  date: day(opens2), opens_at: iso(opens2), closes_at: iso(closes2),
  state: "open", capacity: 70, booked_covers: 38, arrived_covers: 22,
  no_show_covers: 2, revenue_cents: mad(14_800),
});
[0.3, 0.6, 0.9, 1, 0.8, 0.5].forEach((f, i) =>
  insert("service_slot_load", {
    service_id: SERVICE2,
    at: iso(new Date(opens2.getTime() + i * 30 * 60_000)),
    covers: Math.round(14 * f),
  }),
);

[
  ["res_n1", "Leïla Fassi", "+212 661 55 20 11", 4, 25, "confirmed", "lyfe", "z_n_toit", "Table près du bord", 0.06],
  ["res_n2", "Anas Berrada", "+212 662 31 88 40", 2, 55, "requested", "lyfe", null, null, 0.19],
  ["res_n3", "Groupe Anfa", "+212 663 12 74 05", 8, 90, "confirmed", "partner", "z_n_bar", "Anniversaire", 0.08],
  ["res_nw1", "Youssef Alaoui", "+212 664 90 33 27", 3, 10, "waitlisted", "walk_in", null, null, null],
].forEach(([id, name, phone, size, inMin, state, channel, zone, note, risk]) => {
  insert("reservations", {
    id, venue_id: VENUE2, service_id: SERVICE2, customer_id: null,
    guest_name: name, guest_phone: phone, party_size: size,
    at: minutesAhead(inMin), state, channel, zone_id: zone,
    note, deposit_cents: null, no_show_risk: risk,
    qr_code: `LYFE-${id.toUpperCase()}`, checked_in_at: null,
    created_at: daysAgo(2), updated_at: minutesAgo(20),
  });
  insert("reservation_status_history", {
    id: `sh_${id}_1`, reservation_id: id, from_state: null,
    to_state: state, actor: "user", actor_id: null,
    reason_code: null, note: null, at: daysAgo(2),
  });
});

[
  ["mi_n1", "Negroni du Nomad", "Campari infusé au safran, vermouth maison.", "cocktail", 140, 1, 0],
  ["mi_n2", "Spritz Atlas", "Vermouth blanc, verveine, agrumes.", "cocktail", 120, 0, 1],
  ["mi_n3", "Planche mezze", "Houmous, zaalouk, olives, pain maison.", "entree", 160, 0, 2],
  ["mi_n4", "Thé glacé menthe", "Sans alcool, menthe fraîche.", "boisson", 60, 0, 3],
].forEach(([id, name, description, category, price, signature, position]) =>
  insert("menu_items", {
    id, venue_id: VENUE2, name, description, category,
    price_cents: mad(price), signature, visible: 1, position,
  }),
);
insert("menu_item_dietary", { item_id: "mi_n4", tag: "vegan" });
insert("menu_item_dietary", { item_id: "mi_n3", tag: "vegetarien" });

[
  ["rv_n1", "Meryem T.", 5, "Vue imbattable au coucher du soleil, cocktails créatifs.", "lyfe", 3],
  ["rv_n2", "Otmane K.", 4, "Très bonne ambiance le samedi, un peu bruyant.", "google", 11],
].forEach(([id, name, rating, comment, channel, days]) =>
  insert("reviews", {
    id, venue_id: VENUE2, guest_name: name, rating, comment,
    channel, at: daysAgo(days),
  }),
);

insert("payouts", {
  id: "pay_n1", venue_id: VENUE2, reference: "LYF-NOMAD-24",
  amount_cents: mad(41_200), commission_cents: mad(3_100),
  covers_settled: 168,
  period_start: daysAgo(9), period_end: daysAgo(3),
  scheduled_for: daysAhead(2), paid_at: null, state: "scheduled",
});

for (let i = 0; i < 365; i += 1) {
  const covers = Math.round(28 + 16 * Math.sin(i / 6) + (i % 5));
  insert("analytics_daily", {
    venue_id: VENUE2, date: day(new Date(now.getTime() - i * 86_400_000)),
    covers_served: Math.max(0, covers),
    revenue_cents: mad(Math.max(0, covers) * 412),
    no_shows: Math.max(0, Math.round(covers * 0.04) - (i % 3)),
    bookings_made: Math.max(0, covers + 6),
    bookings_refused: i % 7,
    capacity: 140,
    impressions: 760 + ((i * 23) % 260),
    listing_views: 95 + ((i * 7) % 60),
  });
}

[
  // A lounge counts people, not covers. The vocabulary belongs to the
  // configuration, and seed copy that ignores it is the fastest way to
  // make a bar manager conclude the screen was written for someone else.
  ["act_n1", "guest_arrived", "Leïla Fassi", "est arrivée · 4 personnes", "res_n1", 0, 6],
  ["act_n2", "waitlist_joined", "Youssef Alaoui", "rejoint la liste d'attente · 3 personnes", "res_nw1", 0, 14],
  ["act_n3", "review_received", "Meryem T.", "a laissé un avis 5 étoiles", null, 0, 4320],
].forEach(([id, type, actor, message, res, attention, mins]) =>
  insert("activity", {
    id, venue_id: VENUE2, type, actor, message,
    reservation_id: res, needs_attention: attention, at: minutesAgo(mins),
  }),
);

// ═════════════════════════════════════════════════════════════
// Phase 5 — the rest of the venue perimeter.
//
// Written as one function applied to both venues rather than twice by
// hand. The two differ by argument, not by code path, which is the same
// reason the UI has one configuration object instead of two builds.
//
// Two differences are deliberate and load-bearing:
//   · Dar Zellij is configured `restaurant`, Nomad `lounge`. The Vie
//     nocturne group appears for the second and not the first, so the
//     gate is demonstrable rather than asserted.
//   · Only Dar Zellij has Lyfe Pay transactions. Nomad therefore has no
//     spend source, and every spend tile hides itself there. That rule
//     is impossible to check against a dataset where every venue has
//     money in it.
// ═════════════════════════════════════════════════════════════

const hoursAhead = (n) => iso(new Date(now.getTime() + n * 3_600_000));
const hoursAgo = (n) => iso(new Date(now.getTime() - n * 3_600_000));
/** The next date falling on the given ISO weekday, as YYYY-MM-DD. */
const nextWeekday = (target) => {
  const d = new Date(now);
  const current = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() + ((target - current + 7) % 7));
  return day(d);
};

// Nomad's guest base. The base seed gave the bar bookings but no
// customers; tags, segments and campaigns all need people behind them,
// and a bar that has been open six months plainly has some.
[
  ["cus_n1", "Leïla Fassi", "+212 661 55 20 11", "leila.fassi@gmail.com", 12, 3, 0],
  ["cus_n2", "Anas Berrada", "+212 662 31 88 40", "anas.berrada@gmail.com", 1, 12, 0],
  ["cus_n3", "Réda Bennis", "+212 661 90 44 12", null, 5, 8, 2],
  ["cus_n4", "Nada Skalli", "+212 662 18 70 33", "n.skalli@outlook.com", 7, 5, 0],
  ["cus_n5", "Ilyas Mrabet", "+212 664 55 02 19", null, 3, 21, 1],
  ["cus_n6", "Sanaa Kettani", "+212 665 12 66 30", null, 0, 0, 0],
  ["cus_n7", "Hamza Doukkali", "+212 666 12 33 90", null, 2, 104, 1],
].forEach(([id, name, phone, email, visits, lastDays, noShows], i) => {
  insert("customers", {
    id, venue_id: VENUE2, app_user_id: `app_user_n${i + 1}`,
    full_name: name, phone, email,
    first_seen_at: daysAgo(120 + i * 9),
    last_visit_at: visits > 0 ? daysAgo(lastDays) : null,
    visit_count: visits,
    // No Lyfe Pay at Nomad, so no spend is known. Zero here means "no
    // source", and every screen hides the tile rather than showing 0 MAD.
    total_spend_cents: 0,
    loyalty_tier: null,
    loyalty_points: null,
    opted_out_of_marketing: i === 1 ? 1 : 0,
  });
  for (let n = 0; n < noShows; n += 1) {
    insert("reservations", {
      id: `res_nhist_${id}_${n}`, venue_id: VENUE2, service_id: null,
      customer_id: id, guest_name: name, guest_phone: phone,
      party_size: 2 + n, at: daysAgo(25 * (n + 1)), state: "no_show",
      channel: "lyfe", zone_id: null, note: null, deposit_cents: null,
      no_show_risk: null, qr_code: `LYFE-NHIST-${id}-${n}`,
      checked_in_at: null,
      created_at: daysAgo(26 * (n + 1)), updated_at: daysAgo(25 * (n + 1)),
    });
    insert("no_show_records", {
      id: `ns_${id}_${n}`, venue_id: VENUE2, customer_id: id,
      reservation_id: `res_nhist_${id}_${n}`, party_size: 2 + n,
      at: daysAgo(25 * (n + 1)),
    });
  }
});

function seedOperations(opts) {
  const {
    venue, prefix, configuration, service, serviceLabel, capacity,
    customers, staffName, staffId, transactions: hasTransactions,
    nightlife, legalName, ice, rc, iban, googleUrl, instagram, whatsapp,
    dressCode, minimumAge, zones,
  } = opts;
  const p = (s) => `${prefix}_${s}`;

  // ── Establishment configuration ──
  insert("venue_settings", {
    venue_id: venue,
    configuration,
    legal_name: legalName,
    ice, rc,
    billing_address: opts.billingAddress,
    iban,
    rib_asset_id: null,
    language: "fr",
    timezone: "Africa/Casablanca",
    consent_text:
      "En réservant, vous acceptez que l'établissement conserve vos coordonnées pour gérer votre venue. Vous pouvez retirer ce consentement à tout moment depuis l'application.",
    retention_months: 36,
    google_place_url: googleUrl,
    instagram_handle: instagram,
    whatsapp_number: whatsapp,
    dress_code: dressCode,
    minimum_age: minimumAge,
    api_access_enabled: 0,
    updated_at: iso(now),
  });

  insert("subscriptions", {
    venue_id: venue,
    plan: "annual",
    status: "actif",
    trial_ends_at: daysAgo(320),
    renews_at: daysAhead(46),
    price_cents: mad(14_400),
    payment_method: "Carte •••• 4417",
    updated_at: daysAgo(320),
  });

  [
    ["a", "LYFE-2026-0182", 14_400, "payee", 319],
    ["b", "LYFE-2025-0611", 12_000, "payee", 684],
  ].forEach(([suffix, reference, amount, status, ago]) =>
    insert("invoices", {
      id: p(`inv_${suffix}`), venue_id: venue, reference,
      amount_cents: mad(amount), status, issued_on: daysAgo(ago), asset_id: null,
    }),
  );

  [
    ["a", "SUP-4412", "Réservations", "Une réservation de l'app n'apparaît pas dans le carnet", "resolu", 9],
    ["b", "SUP-4610", "Paiements", "Acompte marqué échoué alors que le client a été débité", "en_cours", 2],
  ].forEach(([suffix, reference, category, subject, status, ago]) =>
    insert("support_tickets", {
      id: p(`sup_${suffix}`), venue_id: venue, reference, category, subject,
      body: "Détail transmis à l'équipe LYFE avec les captures d'écran.",
      status, author_id: OWNER,
      created_at: daysAgo(ago), updated_at: daysAgo(Math.max(0, ago - 1)),
    }),
  );

  // ── Service definitions, pacing and the booking window ──
  opts.serviceDefinitions.forEach((row, i) => {
    const [id, name, kind, weekdays, startsAt, endsAt, lastBooking, cap, perQuarter] = row;
    insert("service_definitions", {
      id: p(id), venue_id: venue, name, kind, weekdays,
      starts_at: startsAt, ends_at: endsAt, last_booking_at: lastBooking,
      capacity_covers: cap, covers_per_quarter: perQuarter,
      turn_minutes_small: opts.turnSmall, turn_minutes_large: opts.turnLarge,
      enabled: 1, position: i, version: 1, updated_at: daysAgo(11),
    });
    zones.forEach((zoneId) =>
      insert("service_zones", { service_definition_id: p(id), zone_id: zoneId }),
    );
  });

  insert("pacing_rules", {
    venue_id: venue,
    max_arrivals_quarter: opts.maxArrivalsQuarter,
    max_covers_service: capacity,
    max_party_online: opts.maxPartyOnline,
    min_party_online: 1,
    request_only_above: opts.maxPartyOnline,
    booking_window_days: 60,
    same_day_cutoff: opts.sameDayCutoff,
    min_lead_minutes: 60,
    online_booking_open: 1,
    reopen_at: null,
    version: 3,
    updated_at: daysAgo(4),
  });

  // A quiet Monday the manager has capped, and a busy night lifted.
  insert("capacity_overrides", {
    venue_id: venue, date: nextWeekday(1),
    capacity: Math.round(capacity * 0.6), note: "Équipe réduite",
  });
  insert("capacity_overrides", {
    venue_id: venue, date: nextWeekday(6),
    capacity: Math.round(capacity * 1.15), note: "Terrasse ouverte en entier",
  });

  // ── Waitlist ──
  insert("waitlist_settings", {
    venue_id: venue,
    online_open: opts.waitlistOnline,
    max_party_online: opts.maxPartyOnline,
    default_quote_min: opts.defaultQuote,
    paused_reason: opts.waitlistOnline ? "" : "Cuisine en rupture de service",
    updated_at: minutesAgo(90),
  });

  opts.waitlist.forEach((row) => {
    const [id, customerId, name, phone, size, quote, addedMin, source, status, notifiedMin] = row;
    insert("waitlist", {
      id: p(id), venue_id: venue, customer_id: customerId,
      guest_name: name, guest_phone: phone, party_size: size,
      quoted_minutes: quote, added_at: minutesAgo(addedMin),
      notified_at: notifiedMin === null ? null : minutesAgo(notifiedMin),
      seated_at: null, removed_at: null,
      source, status, removal_reason: null, note: "", reservation_id: null,
    });
  });
  // One party already seated and one already gone, so the list has a
  // history behind it rather than only a live top.
  insert("waitlist", {
    id: p("wl_seated"), venue_id: venue, customer_id: customers[0],
    guest_name: opts.seatedName, guest_phone: opts.seatedPhone, party_size: 2,
    quoted_minutes: 15, added_at: minutesAgo(74), notified_at: minutesAgo(61),
    seated_at: minutesAgo(58), removed_at: null,
    source: "walk_in", status: "seated", removal_reason: null,
    note: "", reservation_id: null,
  });
  insert("waitlist", {
    id: p("wl_left"), venue_id: venue, customer_id: null,
    guest_name: opts.leftName, guest_phone: "", party_size: 4,
    quoted_minutes: 45, added_at: minutesAgo(96), notified_at: minutesAgo(52),
    seated_at: null, removed_at: minutesAgo(38),
    source: "app", status: "left", removal_reason: "parti",
    note: "N'a pas répondu au message", reservation_id: null,
  });

  // ── Shift notes ──
  opts.shiftNotes.forEach(([id, body, pinned, ago]) =>
    insert("shift_notes", {
      id: p(id), venue_id: venue, service_id: service, date: day(now),
      author_id: staffId, author: staffName, body, pinned,
      created_at: hoursAgo(ago),
    }),
  );

  // ── Tags, rules and segments ──
  const TAGS = [
    ["tg_vip", "VIP", "violet", "manual", 0],
    ["tg_allergie", "Allergie", "rose", "manual", 1],
    ["tg_presse", "Presse", "sky", "manual", 2],
    ["tg_habitue", "Habitué", "sage", "auto", 3],
    ["tg_nouveau", "Nouveau", "sky", "auto", 4],
    ["tg_risque", "À risque", "peach", "auto", 5],
    ["tg_inactif", "Inactif", "sand", "auto", 6],
    ["tg_panier", "Gros panier", "violet", "auto", 7],
  ];
  TAGS.forEach(([id, label, colour, origin, position]) =>
    insert("tags", {
      id: p(id), venue_id: venue, label, colour, origin,
      staff_visible: 1, archived: 0, position, created_at: daysAgo(150),
    }),
  );

  // "Gros panier" is only meaningful where spend exists, so it is
  // archived at a venue with no transaction source rather than shown
  // with an unreachable threshold.
  if (!hasTransactions) {
    db.prepare("UPDATE tags SET archived = 1 WHERE id = ?").run(p("tg_panier"));
  }

  [
    ["tr_habitue", "tg_habitue", "habitue", 4, 180],
    ["tr_panier", "tg_panier", "gros_panier", mad(900), 365],
    ["tr_risque", "tg_risque", "a_risque", 2, 365],
    ["tr_nouveau", "tg_nouveau", "nouveau", 1, 30],
    ["tr_inactif", "tg_inactif", "inactif", 1, 90],
  ].forEach(([id, tag, rule, threshold, windowDays]) =>
    insert("tag_rules", {
      id: p(id), venue_id: venue, tag_id: p(tag), rule, threshold,
      window_days: windowDays,
      enabled: rule === "gros_panier" && !hasTransactions ? 0 : 1,
      updated_at: daysAgo(30),
    }),
  );

  opts.customerTags.forEach(([customerId, tag]) =>
    insert("customer_tags", {
      customer_id: customerId, tag_id: p(tag), venue_id: venue,
      applied_at: daysAgo(20),
    }),
  );

  [
    ["sg_vip", "VIP et presse", "Les comptes à prévenir en priorité d'une soirée.",
      { tags: ["tg_vip", "tg_presse"] }, 2],
    ["sg_winback", "À reconquérir", "Sans visite depuis quatre-vingt-dix jours.",
      { lastVisitAfterDays: 90 }, 3],
    ["sg_habitues", "Habitués du week-end", "Quatre visites ou plus, majoritairement vendredi et samedi.",
      { tags: ["tg_habitue"], weekdays: [5, 6] }, 4],
  ].forEach(([id, name, description, criteria, count]) =>
    insert("segments", {
      id: p(id), venue_id: venue, name, description,
      criteria: JSON.stringify(criteria), member_count: count,
      created_at: daysAgo(60), updated_at: daysAgo(6),
    }),
  );

  // ── Offers ──
  opts.offers.forEach((row) => {
    const [id, name, kind, value, freeItem, weekdays, startsIn, endsIn, cap, minParty, status] = row;
    insert("offers", {
      id: p(id), venue_id: venue, name, kind, value,
      free_item_label: freeItem, weekdays,
      service_ids: JSON.stringify(opts.serviceDefinitions.map(([sid]) => p(sid))),
      starts_on: day(new Date(now.getTime() + startsIn * 86_400_000)),
      ends_on: day(new Date(now.getTime() + endsIn * 86_400_000)),
      cover_cap: cap, min_party: minParty, prepayment_required: 0,
      channel: "app", status,
      created_at: daysAgo(40), updated_at: daysAgo(5),
    });
  });
  // Attribution, so "réservations attribuées" is counted rather than guessed.
  for (let i = 0; i < 9; i += 1) {
    insert("offer_redemptions", {
      id: p(`ored_${i}`), venue_id: venue, offer_id: p(opts.offers[0][0]),
      reservation_id: null, covers: 2 + (i % 4), at: daysAgo(i * 2 + 1),
    });
  }

  // ── Experiences and tickets ──
  opts.experiences.forEach((row) => {
    const [id, title, description, status, inDays, hour, cap, price, prepay, addons, sold] = row;
    const starts = new Date(now.getTime() + inDays * 86_400_000);
    starts.setHours(hour, 0, 0, 0);
    insert("experiences", {
      id: p(id), venue_id: venue, title, description, status,
      starts_at: iso(starts),
      ends_at: iso(new Date(starts.getTime() + 3 * 3_600_000)),
      recurrence: "", capacity: cap, price_cents: mad(price),
      prepay_percent: prepay,
      cancellation_terms: "Annulation gratuite jusqu'à 48 h avant. Au-delà, l'acompte est conservé.",
      cover_asset_id: null,
      created_at: daysAgo(30), updated_at: daysAgo(3),
    });
    addons.forEach(([label, addonPrice], i) =>
      insert("experience_addons", {
        id: p(`${id}_ad${i}`), experience_id: p(id), venue_id: venue,
        label, price_cents: mad(addonPrice), position: i,
      }),
    );
    for (let i = 0; i < sold; i += 1) {
      const ticketId = p(`${id}_tk${i}`);
      insert("tickets", {
        id: ticketId, venue_id: venue, experience_id: p(id),
        customer_id: customers[i % customers.length],
        guest_name: opts.ticketNames[i % opts.ticketNames.length],
        guest_phone: "", seats: 1 + (i % 2),
        addons: JSON.stringify(i % 3 === 0 ? [p(`${id}_ad0`)] : []),
        amount_cents: mad(price * (1 + (i % 2))),
        status: status === "termine" ? "utilise" : "paye",
        qr_code: `LYFE-${ticketId.toUpperCase()}`,
        checked_in_at: status === "termine" ? daysAgo(-inDays) : null,
        purchased_at: daysAgo(20 - i),
      });
    }
  });

  // ── Deposits and cancellations ──
  opts.depositPolicies.forEach((row, i) => {
    const [id, name, appliesTo, appliesValue, mode, amount, noShowFee, lateFee] = row;
    insert("deposit_policies", {
      id: p(id), venue_id: venue, name, applies_to: appliesTo,
      applies_value: appliesValue, mode, amount_cents: mad(amount),
      no_show_fee_cents: mad(noShowFee), late_cancel_fee_cents: mad(lateFee),
      grace_minutes: 15, enabled: 1, position: i, version: 2,
      updated_at: daysAgo(25),
    });
  });

  opts.deposits.forEach((row) => {
    const [id, reservationId, guest, amount, status, requestedAgo, paidAgo, failure] = row;
    insert("deposits", {
      id: p(id), venue_id: venue, policy_id: p(opts.depositPolicies[0][0]),
      reservation_id: reservationId, ticket_id: null,
      customer_id: null, guest_name: guest,
      amount_cents: mad(amount), status,
      processor_ref: status === "demande" ? null : `PZ-${prefix.toUpperCase()}-${id.slice(-3)}`,
      idempotency_key: `${venue}:${id}`,
      requested_at: daysAgo(requestedAgo),
      paid_at: paidAgo === null ? null : daysAgo(paidAgo),
      settled_at: status === "capture" || status === "rembourse" ? daysAgo(1) : null,
      failure_reason: failure,
    });
  });

  insert("cancellation_policies", {
    venue_id: venue,
    free_until_hours: 24,
    late_fee_cents: mad(opts.lateFee),
    no_show_fee_cents: mad(opts.noShowFee),
    guest_message:
      "Annulation gratuite jusqu'à 24 h avant votre venue. Passé ce délai, des frais peuvent s'appliquer. En cas d'absence, le montant indiqué au moment de la réservation sera prélevé.",
    version: 2,
    updated_at: daysAgo(25),
  });

  opts.cancellations.forEach(([id, guest, kind, actor, reason, fee, waived, disputed, ago]) =>
    insert("cancellation_log", {
      id: p(id), venue_id: venue, reservation_id: null, guest_name: guest,
      kind, actor, reason, fee_cents: mad(fee), waived, disputed,
      at: daysAgo(ago),
    }),
  );

  // ── Lyfe Pay ──
  //
  // Seeded for one venue only, on purpose. See the header.
  if (hasTransactions) {
    for (let i = 0; i < 46; i += 1) {
      const amount = 340 + ((i * 137) % 1_260);
      insert("transactions", {
        id: p(`tx_${i}`), venue_id: venue,
        customer_id: i % 3 === 0 ? customers[i % customers.length] : null,
        reservation_id: null,
        payout_id: i < 30 ? opts.payoutId : null,
        amount_cents: mad(amount),
        fee_cents: mad(Math.round(amount * 0.04)),
        method: ["wallet", "carte", "tpe"][i % 3],
        status: i === 11 ? "remboursee" : i === 29 ? "echouee" : "reussie",
        processor_ref: `PZ-${String(80_400 + i)}`,
        at: hoursAgo(i * 7 + 2),
      });
    }
  }

  // ── Campaigns and the message log ──
  opts.campaigns.forEach((row) => {
    const [id, name, channel, template, segment, status, automation, sentAgo, recipients, delivered, opened, clicked, attributed, unsub] = row;
    insert("campaigns", {
      id: p(id), venue_id: venue, name, channel, template,
      segment_id: segment ? p(segment) : null,
      subject: name,
      body: opts.campaignBody,
      status, automation,
      scheduled_for: status === "programmee" ? daysAhead(3) : null,
      sent_at: sentAgo === null ? null : daysAgo(sentAgo),
      unit_cost_cents: channel === "email" ? 2 : channel === "sms" ? 35 : 18,
      recipients, delivered, opened, clicked,
      reservations_attributed: attributed, unsubscribed: unsub,
      created_at: daysAgo(sentAgo === null ? 2 : sentAgo + 3),
      updated_at: daysAgo(sentAgo === null ? 1 : sentAgo),
    });
  });

  opts.messages.forEach(([id, customerId, channel, kind, recipient, preview, status, minsAgo, failure]) =>
    insert("messages_log", {
      id: p(id), venue_id: venue, customer_id: customerId,
      campaign_id: null, reservation_id: null,
      channel, kind, recipient, preview, status,
      failure_reason: failure, at: minutesAgo(minsAgo),
    }),
  );

  insert("suppression_list", {
    venue_id: venue, contact: opts.suppressed,
    reason: "Désinscription depuis un email", at: daysAgo(48),
  });

  // ── Survey and external redirection ──
  insert("survey_config", {
    venue_id: venue,
    enabled: 1,
    send_after_hours: 3,
    questions: JSON.stringify([
      "Comment noteriez-vous l'accueil ?",
      "Et la cuisine ?",
      "Recommanderiez-vous l'établissement ?",
    ]),
    redirect_from_rating: 4,
    google_url: googleUrl,
    tripadvisor_url: opts.tripadvisorUrl,
    updated_at: daysAgo(18),
  });

  // ── Vie nocturne ──
  //
  // Only where the configuration enables it. A restaurant with guest
  // lists in its database and no screen to show them would be worse
  // than either state on its own.
  if (!nightlife) return;

  const PROMOTERS = [
    ["pr_1", "Adil Naciri", "+212 661 44 90 12", "adil", 10, 1],
    ["pr_2", "Sara Bouhaddou", "+212 662 71 05 88", "sara", 8, 1],
    ["pr_3", "Mehdi Tounsi", "+212 663 30 22 41", "mehdi", 0, 0],
  ];
  PROMOTERS.forEach(([id, name, phone, code, commission, active]) =>
    insert("promoters", {
      id: p(id), venue_id: venue, full_name: name, phone, code,
      commission_percent: commission, active, created_at: daysAgo(120),
    }),
  );

  [
    ["gl_1", "Vendredi Deep House", nextWeekday(5), 180, "23:30", "ouverte"],
    ["gl_2", "Samedi Rooftop Sessions", nextWeekday(6), 220, "23:30", "ouverte"],
    ["gl_3", "Vendredi Afro Night", day(new Date(now.getTime() - 7 * 86_400_000)), 180, "23:30", "fermee"],
  ].forEach(([id, name, night, cap, cutoff, status]) => {
    insert("guest_lists", {
      id: p(id), venue_id: venue, name, night, capacity: cap,
      cutoff_at: `${night}T${cutoff}:00`, status, created_at: daysAgo(14),
    });
    [
      ["Gratuit avant 23h", "23:00", 0, "", 0],
      ["Gratuit pour les femmes avant minuit", "00:00", 0, "femmes", 1],
      ["100 MAD après 23h", "03:00", 100, "", 2],
    ].forEach(([label, until, price, appliesTo, position], i) =>
      insert("guest_list_bands", {
        id: p(`${id}_b${i}`), guest_list_id: p(id), venue_id: venue,
        label, until_at: `${night}T${until}:00`,
        price_cents: mad(price), applies_to: appliesTo, position,
      }),
    );
  });

  const ENTRY_NAMES = [
    "Ilyas Mrabet", "Nada Skalli", "Groupe Zayd", "Rim Chraibi", "Walid Benjelloun",
    "Sanaa Kettani", "Table Anfa", "Hamza Doukkali", "Meriem Ziani", "Réda Bennis",
    "Lina Oufkir", "Groupe Marina",
  ];
  ENTRY_NAMES.forEach((name, i) => {
    const listId = p(i % 3 === 2 ? "gl_3" : i % 2 === 0 ? "gl_1" : "gl_2");
    const closed = listId === p("gl_3");
    const entryId = p(`gle_${i}`);
    const size = 1 + (i % 4);
    insert("guest_list_entries", {
      id: entryId, venue_id: venue, guest_list_id: listId,
      customer_id: i % 4 === 0 ? customers[i % customers.length] : null,
      guest_name: name, party_size: size,
      guest_phone: i % 3 === 0 ? `+212 66${i} 00 11 2${i % 10}` : "",
      source: ["app", "promoteur", "sur_place"][i % 3],
      promoter_id: i % 3 === 1 ? p(PROMOTERS[i % 2][0]) : null,
      qr_code: `LYFE-${entryId.toUpperCase()}`,
      // Only the past night has arrivals; tonight's list is still to come.
      checked_in_at: closed && i % 4 !== 3 ? daysAgo(7) : null,
      checked_in_count: closed && i % 4 !== 3 ? size : 0,
      added_at: daysAgo(3 + (i % 5)),
    });
  });

  const TABLE_TYPES = [
    ["tt_std", "Table standard", 14, 2, 6, 30, "Une bouteille au choix, softs inclus", 24, 0],
    ["tt_lounge", "Banquette Lounge", 8, 4, 10, 30, "Deux bouteilles, softs et service dédié", 48, 1],
    ["tt_vip", "Carré VIP", 3, 6, 14, 50, "Trois bouteilles premium, service et entrée offerte", 72, 2],
  ];
  TABLE_TYPES.forEach(([id, name, count, min, max, deposit, pack, hours, position]) =>
    insert("table_types", {
      id: p(id), venue_id: venue, name, count,
      min_guests: min, max_guests: max, deposit_percent: deposit,
      package: pack, cancellation_hours: hours, position,
    }),
  );

  [
    ["tt_std", "semaine", 1_500], ["tt_std", "weekend", 2_500], ["tt_std", "evenement", 3_500],
    ["tt_lounge", "semaine", 4_000], ["tt_lounge", "weekend", 6_000], ["tt_lounge", "evenement", 8_000],
    ["tt_vip", "semaine", 9_000], ["tt_vip", "weekend", 14_000], ["tt_vip", "evenement", 20_000],
  ].forEach(([type, nightKind, minimum], i) =>
    insert("table_offers", {
      id: p(`to_${i}`), venue_id: venue, table_type_id: p(type),
      night_kind: nightKind, night: null,
      minimum_cents: mad(minimum), updated_at: daysAgo(20),
    }),
  );

  [
    ["tb_1", "tt_vip", "Groupe Anfa", "+212 663 12 74 05", 10, 6, 14_000, null, "demandee", null],
    ["tb_2", "tt_lounge", "Réda Bennis", "+212 661 90 44 12", 6, 6, 6_000, null, "confirmee", "dep_1"],
    ["tb_3", "tt_lounge", "Nada Skalli", "+212 662 18 70 33", 8, 5, 6_000, null, "confirmee", "dep_2"],
    ["tb_4", "tt_std", "Ilyas Mrabet", "+212 664 55 02 19", 4, 5, 2_500, null, "demandee", null],
    // Last weekend: one table that met its minimum, entered by the
    // manager. Nomad has no Lyfe Pay source, so this is the only way the
    // figure can exist — and the screen says so.
    ["tb_5", "tt_vip", "Table Marina", "+212 665 41 88 70", 12, -2, 14_000, 16_400, "arrivee", "dep_4"],
    ["tb_6", "tt_std", "Hamza Doukkali", "+212 666 12 33 90", 5, -2, 2_500, null, "liberee", null],
  ].forEach(([id, type, guest, phone, size, nightIn, minimum, reached, status, depositId]) => {
    const night = nightIn >= 0
      ? nextWeekday(nightIn === 6 ? 6 : 5)
      : day(new Date(now.getTime() - 7 * 86_400_000));
    insert("table_reservations", {
      id: p(id), venue_id: venue, table_type_id: p(type),
      customer_id: null, promoter_id: id === "tb_2" ? p("pr_1") : null,
      guest_name: guest, guest_phone: phone, party_size: size,
      night, at: `${night}T23:30:00`,
      minimum_cents: mad(minimum),
      reached_cents: reached === null ? null : mad(reached),
      status, deposit_id: depositId ? p(depositId) : null,
      created_at: daysAgo(6), updated_at: daysAgo(1),
    });
  });
}

seedOperations({
  venue: VENUE,
  prefix: "dz",
  configuration: "restaurant",
  service: SERVICE,
  serviceLabel,
  capacity: 120,
  zones: ZONES.map(([id]) => id),
  customers: ["cus_1", "cus_2", "cus_3", "cus_8", "cus_11"],
  staffName: "Rachid Amrani",
  staffId: "usr_rachid",
  transactions: true,
  payoutId: "pay_current",
  nightlife: false,
  legalName: "Dar Zellij SARL",
  ice: "001874520000031",
  rc: "112 447",
  billingAddress: "12 derb Sidi Ahmed Soussi, Médina, Marrakech",
  iban: "MA64 0113 0000 0012 3456 7890 12",
  googleUrl: "https://g.page/dar-zellij",
  instagram: "@darzellij",
  whatsapp: "+212 661 00 26 00",
  dressCode: "",
  minimumAge: 0,
  tripadvisorUrl: "https://www.tripadvisor.fr/dar-zellij",
  turnSmall: 90,
  turnLarge: 135,
  maxArrivalsQuarter: 12,
  maxPartyOnline: 8,
  sameDayCutoff: "18:00",
  serviceDefinitions: [
    ["sd_dej", "Déjeuner", "dejeuner", "1,2,3,4,5,6,7", "12:00", "15:00", "14:15", 72, 10],
    ["sd_din", "Dîner", "diner", "1,2,3,4,5,6,7", "19:00", "23:30", "22:30", 120, 14],
  ],
  waitlistOnline: 1,
  defaultQuote: 25,
  waitlist: [
    ["wl_1", "cus_6", "Omar Idrissi", "+212 667 74 21 08", 2, 20, 34, "walk_in", "notified", 6],
    ["wl_2", "cus_7", "Famille Berrada", "+212 668 30 90 55", 4, 35, 22, "walk_in", "waiting", null],
    ["wl_3", null, "Sofia Lahlou", "+212 666 70 15 29", 3, 40, 14, "app", "waiting", null],
    ["wl_4", null, "Couple Renaud", "+33 6 12 44 90 21", 2, 45, 8, "app", "waiting", null],
  ],
  seatedName: "Salma Bennani",
  seatedPhone: "+212 661 20 44 18",
  leftName: "Groupe Tazi",
  shiftNotes: [
    ["sn_1", "Fontaine du patio en réparation jusqu'à 21 h — ne pas placer les tables 4 et 5.", 1, 5],
    ["sn_2", "Le chef propose un dessert hors carte ce soir : cheesecake à l'argan, 90 MAD.", 0, 3],
  ],
  customerTags: [
    ["cus_1", "tg_vip"], ["cus_1", "tg_habitue"],
    ["cus_2", "tg_allergie"], ["cus_2", "tg_habitue"],
    ["cus_3", "tg_allergie"],
    ["cus_4", "tg_risque"], ["cus_4", "tg_inactif"],
    ["cus_5", "tg_nouveau"], ["cus_6", "tg_nouveau"],
    ["cus_8", "tg_habitue"], ["cus_8", "tg_vip"],
    ["cus_9", "tg_presse"],
    ["cus_11", "tg_habitue"], ["cus_11", "tg_panier"],
    ["cus_12", "tg_risque"],
  ],
  offers: [
    ["of_1", "Déjeuner découverte -20 %", "percent", 20, "", "1,2,3,4", -30, 45, 240, 2, "active"],
    ["of_2", "Mise en bouche offerte", "free_item", 0, "Trilogie de mises en bouche", "1,2,3,4,5,6,7", -12, 20, 0, 2, "active"],
    ["of_3", "Menu Ramadan à 450 MAD", "set_menu", 450, "", "1,2,3,4,5,6,7", 30, 60, 600, 2, "scheduled"],
    ["of_4", "Soirée couscous -15 %", "percent", 15, "", "5", -120, -40, 180, 4, "archived"],
  ],
  experiences: [
    ["xp_1", "Dîner aux chandelles sur les toits", "Cinq services, accord mets et thés, vue sur la Koutoubia.", "publie", 12, 20, 24, 780, 50,
      [["Accord vins", 320], ["Gâteau d'anniversaire", 180]], 11],
    ["xp_2", "Atelier pastilla avec le chef", "Deux heures en cuisine, puis déjeuner de ce que vous avez préparé.", "publie", 26, 10, 12, 550, 100,
      [["Tablier brodé", 150]], 5],
    ["xp_3", "Brunch du vendredi", "Buffet marocain, patio, musique andalouse.", "termine", -14, 12, 40, 320, 0,
      [["Jus pressés à volonté", 60]], 34],
  ],
  ticketNames: ["Salma Bennani", "Hind Tazi", "Leïla Mansouri", "Thomas Renaud", "Amina Bouzid", "Karim Hakimi"],
  depositPolicies: [
    ["dp_group", "Groupes de 8 et plus", "party_size", "8", "per_person", 150, 200, 100],
    ["dp_xp", "Expériences", "experience", "", "full", 0, 0, 0],
  ],
  deposits: [
    ["dep_1", "res_001", "Salma Bennani", 400, "paye", 3, 3, ""],
    ["dep_2", "res_011", "Hind Tazi", 500, "demande", 1, null, ""],
    ["dep_3", null, "Groupe Filali", 1_200, "echoue", 4, null, "Carte refusée par l'émetteur"],
    ["dep_4", null, "Famille Ziyad", 900, "capture", 12, 12, ""],
    ["dep_5", null, "Table Bensouda", 600, "libere", 9, 9, ""],
    ["dep_6", null, "Groupe Ouazzani", 750, "rembourse", 21, 21, ""],
  ],
  lateFee: 100,
  noShowFee: 200,
  cancellations: [
    ["cx_1", "Yasmine El Alaoui", "no_show", "system", "Absence constatée après 20 min", 200, 0, 0, 4],
    ["cx_2", "Karim Hakimi", "annulation", "guest", "Empêchement de dernière minute", 100, 1, 0, 7],
    ["cx_3", "Groupe Filali", "annulation", "venue", "Privatisation acceptée le même soir", 0, 0, 0, 11],
    ["cx_4", "Sofia Lahlou", "no_show", "system", "Absence constatée après 20 min", 200, 0, 1, 16],
  ],
  campaigns: [
    ["cp_1", "Menu Ramadan — ouverture des réservations", "email", "offre", "sg_habitues", "envoyee", "", 9, 412, 401, 188, 61, 23, 3],
    ["cp_2", "On ne vous a pas vus depuis trois mois", "whatsapp", "win_back", "sg_winback", "envoyee", "", 24, 96, 94, 71, 18, 7, 1],
    ["cp_3", "Dîner aux chandelles — vos places", "email", "evenement", "sg_vip", "programmee", "", null, 0, 0, 0, 0, 0, 0],
    ["cp_4", "Bienvenue chez Dar Zellij", "email", "newsletter", null, "envoyee", "bienvenue", 1, 34, 34, 26, 9, 4, 0],
    ["cp_5", "Merci de votre visite", "whatsapp", "newsletter", null, "envoyee", "remerciement", 1, 128, 126, 104, 41, 12, 0],
    ["cp_6", "Joyeux anniversaire", "sms", "anniversaire", null, "en_pause", "anniversaire", 40, 22, 22, 0, 6, 3, 0],
  ],
  campaignBody:
    "Bonjour {{prenom}}, nous avons pensé à vous. Réservez votre table en un geste depuis l'application LYFE.",
  messages: [
    ["ml_1", "cus_1", "whatsapp", "confirmation", "+212 661 20 44 18", "Votre table de 4 est confirmée pour ce soir 20h30.", "lu", 180, ""],
    ["ml_2", "cus_2", "whatsapp", "rappel_j1", "+212 660 15 62 40", "À demain ! Votre table de 5 vous attend à 21h15.", "delivre", 1_200, ""],
    ["ml_3", "cus_6", "sms", "table_prete", "+212 667 74 21 08", "Votre table est prête, présentez-vous à l'accueil.", "delivre", 6, ""],
    ["ml_4", "cus_4", "whatsapp", "reconfirmation", "+212 663 41 77 92", "Confirmez-vous votre venue de ce soir ?", "echoue", 300, "Numéro non joignable sur WhatsApp"],
    ["ml_5", "cus_8", "email", "remerciement", "leila.m@gmail.com", "Merci de votre visite — dites-nous tout en une minute.", "lu", 2_800, ""],
    ["ml_6", "cus_11", "push", "avis_invitation", "app_user_11", "Votre avis compte : notez votre soirée.", "envoye", 4_400, ""],
  ],
  suppressed: "t.renaud@free.fr",
});

seedOperations({
  venue: VENUE2,
  prefix: "nm",
  configuration: "lounge",
  service: SERVICE2,
  serviceLabel: label2,
  capacity: 70,
  zones: ["z_n_bar", "z_n_toit"],
  customers: ["cus_n1", "cus_n3", "cus_n4", "cus_n5"],
  staffName: "Sofia Bennis",
  staffId: "usr_sofia",
  // No Lyfe Pay here. Every spend tile hides itself as a result, which
  // is the rule the spec states and the only honest way to show it.
  transactions: false,
  payoutId: "pay_n1",
  nightlife: true,
  legalName: "Nomad Rooftop SARL AU",
  ice: "002233110000047",
  rc: "398 210",
  billingAddress: "18 boulevard d'Anfa, Gauthier, Casablanca",
  iban: "MA64 0117 0000 0098 7654 3210 44",
  googleUrl: "https://g.page/nomad-rooftop",
  instagram: "@nomadrooftop",
  whatsapp: "+212 661 47 11 90",
  dressCode: "Tenue soignée exigée. Ni short ni sandales après 22 h.",
  minimumAge: 21,
  tripadvisorUrl: "https://www.tripadvisor.fr/nomad-rooftop",
  turnSmall: 52,
  turnLarge: 90,
  maxArrivalsQuarter: 16,
  maxPartyOnline: 10,
  sameDayCutoff: "20:00",
  serviceDefinitions: [
    ["sd_sunset", "Sunset", "creneau", "3,4,5,6,7", "18:00", "21:00", "20:30", 40, 8],
    ["sd_night", "Nuit", "creneau", "3,4,5,6,7", "21:00", "02:00", "01:00", 70, 12],
  ],
  waitlistOnline: 0,
  defaultQuote: 20,
  waitlist: [
    ["wl_1", null, "Youssef Alaoui", "+212 664 90 33 27", 3, 20, 18, "walk_in", "notified", 4],
    ["wl_2", null, "Groupe Marina", "+212 665 71 20 04", 5, 40, 11, "walk_in", "waiting", null],
    ["wl_3", null, "Nada Skalli", "+212 662 18 70 33", 2, 25, 6, "app", "waiting", null],
  ],
  seatedName: "Leïla Fassi",
  seatedPhone: "+212 661 55 20 11",
  leftName: "Groupe Anfa",
  shiftNotes: [
    ["sn_1", "DJ résident jusqu'à 1 h, invité international à partir de 1 h — carré VIP réservé à sa table.", 1, 4],
    ["sn_2", "Rupture sur le mezcal. Proposer le tequila reposado en remplacement.", 0, 2],
  ],
  customerTags: [
    ["cus_n1", "tg_vip"], ["cus_n1", "tg_habitue"],
    ["cus_n2", "tg_inactif"],
    ["cus_n3", "tg_risque"], ["cus_n3", "tg_habitue"],
    ["cus_n4", "tg_habitue"], ["cus_n4", "tg_vip"],
    ["cus_n5", "tg_risque"],
    ["cus_n6", "tg_nouveau"],
    ["cus_n7", "tg_inactif"],
  ],
  offers: [
    ["of_1", "Happy hour -30 % avant 20h", "percent", 30, "", "3,4,5", -60, 60, 0, 1, "active"],
    ["of_2", "Cocktail signature offert", "free_item", 0, "Nomad Spritz", "3,4", -20, 30, 120, 2, "active"],
    ["of_3", "Formule sunset 350 MAD", "set_menu", 350, "", "7", 14, 75, 200, 2, "scheduled"],
  ],
  experiences: [
    ["xp_1", "Masterclass mixologie", "Trois cocktails signature, techniques et dégustation, face au coucher du soleil.", "publie", 9, 18, 16, 450, 100,
      [["Kit maison à emporter", 220]], 9],
    ["xp_2", "Sunset Sessions — live band", "Set acoustique sur la terrasse, planche de tapas incluse.", "termine", -10, 19, 60, 250, 0,
      [["Bouteille de champagne", 1_400]], 47],
  ],
  ticketNames: ["Leïla Fassi", "Anas Berrada", "Nada Skalli", "Ilyas Mrabet"],
  depositPolicies: [
    ["dp_table", "Tables avec minimum", "table", "", "per_person", 0, 0, 0],
    ["dp_group", "Groupes de 10 et plus", "party_size", "10", "per_person", 200, 250, 150],
  ],
  deposits: [
    ["dep_1", null, "Réda Bennis", 1_800, "paye", 5, 5, ""],
    ["dep_2", null, "Nada Skalli", 1_800, "paye", 4, 4, ""],
    ["dep_3", null, "Groupe Anfa", 7_000, "demande", 1, null, ""],
    ["dep_4", null, "Table Marina", 7_000, "capture", 9, 9, ""],
    ["dep_5", null, "Hamza Doukkali", 750, "echoue", 6, null, "Fonds insuffisants"],
  ],
  lateFee: 300,
  noShowFee: 500,
  cancellations: [
    ["cx_1", "Hamza Doukkali", "annulation", "guest", "Annulation hors délai", 300, 0, 0, 6],
    ["cx_2", "Groupe Zayd", "no_show", "system", "Table non honorée", 500, 0, 1, 13],
    ["cx_3", "Rim Chraibi", "annulation", "venue", "Terrasse fermée pour intempéries", 0, 0, 0, 19],
  ],
  campaigns: [
    ["cp_1", "Vendredi Deep House — liste ouverte", "whatsapp", "evenement", "sg_vip", "envoyee", "", 3, 214, 210, 176, 88, 31, 2],
    ["cp_2", "Votre table pour le week-end", "sms", "offre", "sg_habitues", "envoyee", "", 11, 88, 86, 0, 19, 9, 1],
    ["cp_3", "Sunset Sessions revient", "email", "evenement", null, "brouillon", "", null, 0, 0, 0, 0, 0, 0],
    ["cp_4", "Merci d'être venu", "whatsapp", "newsletter", null, "envoyee", "remerciement", 1, 64, 63, 55, 21, 6, 0],
  ],
  campaignBody:
    "Salut {{prenom}}, la nuit commence sur le toit. Réservez votre table ou inscrivez-vous sur la liste depuis LYFE.",
  messages: [
    ["ml_1", null, "whatsapp", "confirmation", "+212 661 55 20 11", "Votre table de 4 est confirmée, terrasse toit, 22h.", "lu", 240, ""],
    ["ml_2", null, "whatsapp", "liste_confirmee", "+212 662 18 70 33", "Vous êtes sur la liste de vendredi. Gratuit avant 23 h.", "delivre", 900, ""],
    ["ml_3", null, "sms", "table_prete", "+212 664 90 33 27", "Votre table est prête, présentez-vous à l'entrée.", "delivre", 4, ""],
    ["ml_4", null, "whatsapp", "acompte", "+212 663 12 74 05", "Merci de régler l'acompte de 7 000 MAD pour confirmer le carré VIP.", "envoye", 1_440, ""],
    ["ml_5", null, "email", "remerciement", "anas.berrada@gmail.com", "Merci pour votre soirée — laissez-nous un avis.", "echoue", 3_600, "Adresse inexistante"],
  ],
  suppressed: "anas.berrada@gmail.com",
});

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log(`seeded ${dbPath}`);
for (const t of ["venues","business_accounts","staff","zones","venue_tags","availability_slots","closures","services","service_slot_load","customers","customer_preferences","no_show_records","reservations","reservation_status_history","menu_items","menu_item_dietary","reviews","review_replies","review_tags","notifications","notification_preferences","payouts","analytics_daily","activity",
  "venue_settings","subscriptions","invoices","support_tickets","service_definitions","service_zones","pacing_rules","capacity_overrides","waitlist","waitlist_settings","shift_notes","tags","customer_tags","tag_rules","segments","offers","offer_redemptions","experiences","experience_addons","tickets","deposit_policies","deposits","cancellation_policies","cancellation_log","transactions","guest_lists","guest_list_bands","guest_list_entries","promoters","table_types","table_offers","table_reservations","campaigns","messages_log","suppression_list","survey_config"]) {
  console.log(`  ${t.padEnd(28)} ${count(t)}`);
}
db.close();
