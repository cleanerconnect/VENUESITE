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
  default_turn_minutes: 96,
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

const TABLES = [
  ["t_p1", "z_patio", "P1", 4, "seated", 74, 1840],
  ["t_p2", "z_patio", "P2", 2, "dessert", 98, 960],
  ["t_p3", "z_patio", "P3", 6, "seated", 41, 2310],
  ["t_p4", "z_patio", "P4", 4, "to_clean", null, null],
  ["t_p5", "z_patio", "P5", 4, "reserved", null, null],
  ["t_s1", "z_salle", "S1", 8, "seated", 63, 4120],
  ["t_s2", "z_salle", "S2", 4, "seated", 29, 780],
  ["t_s3", "z_salle", "S3", 2, "free", null, null],
  ["t_s4", "z_salle", "S4", 6, "reserved", null, null],
  ["t_s5", "z_salle", "S5", 4, "blocked", null, null],
  ["t_t1", "z_terrasse", "T1", 2, "seated", 52, 640],
  ["t_t2", "z_terrasse", "T2", 4, "free", null, null],
  ["t_t3", "z_terrasse", "T3", 4, "reserved", null, null],
];
TABLES.forEach(([id, zone, code, seats, state, seatedMin, bill]) =>
  insert("dining_tables", {
    id, venue_id: VENUE, zone_id: zone, code, seats, state,
    reservation_id: null,
    seated_at: seatedMin === null ? null : minutesAgo(seatedMin),
    bill_cents: bill === null ? null : mad(bill),
  }),
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
      zone_id: null, table_code: null, note: null, deposit_cents: null,
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
const SERVICE = "svc_current";
const opens = new Date(now.getTime() - 100 * 60_000);
const closes = new Date(now.getTime() + 170 * 60_000);
insert("services", {
  id: SERVICE, venue_id: VENUE, kind: "diner", label: "Service en cours",
  date: day(opens), opens_at: iso(opens), closes_at: iso(closes),
  state: "peak", capacity: 120, booked_covers: 104, seated_covers: 86,
  walk_in_covers: 11, no_show_covers: 6, revenue_cents: mad(63_400),
  avg_turn_minutes: 96,
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
  ["res_001", "cus_1", "Salma Bennani", "+212 661 20 44 18", 4, 20, "confirmed", "lyfe", "z_patio", "P5", "Anniversaire, dessert avec bougie", 400, 0.04],
  ["res_002", "cus_3", "Groupe Karam", "+212 662 88 10 03", 6, 35, "confirmed", "phone", "z_salle", "S4", "Sans gluten pour deux couverts", null, 0.11],
  ["res_003", "cus_4", "Yasmine El Alaoui", "+212 663 41 77 92", 4, 50, "confirmed", "instagram", "z_terrasse", "T3", null, null, 0.38],
  ["res_010", "cus_5", "Nabil Cherkaoui", "+212 665 09 33 71", 2, 80, "requested", "lyfe", null, null, "Demande une table près de la fontaine", null, 0.22],
  ["res_011", "cus_2", "Hind Tazi", "+212 660 15 62 40", 5, 105, "confirmed", "partner", "z_salle", null, null, 500, 0.03],
  ["res_w1", "cus_6", "Omar Idrissi", "+212 667 74 21 08", 2, 15, "waitlisted", "walk_in", null, null, null, null, null],
  ["res_w2", "cus_7", "Famille Berrada", "+212 668 30 90 55", 4, 25, "waitlisted", "walk_in", null, null, null, null, null],
];
BOOKINGS.forEach(([id, cus, name, phone, size, inMin, state, channel, zone, table, note, deposit, risk]) => {
  insert("reservations", {
    id, venue_id: VENUE, service_id: SERVICE, customer_id: cus,
    guest_name: name, guest_phone: phone, party_size: size,
    at: minutesAhead(inMin), state, channel, zone_id: zone, table_code: table,
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
// Point held tables at the booking holding them.
db.prepare("UPDATE dining_tables SET reservation_id = ? WHERE venue_id = ? AND code = ?")
  .run("res_001", VENUE, "P5");
db.prepare("UPDATE dining_tables SET reservation_id = ? WHERE venue_id = ? AND code = ?")
  .run("res_002", VENUE, "S4");
db.prepare("UPDATE dining_tables SET reservation_id = ? WHERE venue_id = ? AND code = ?")
  .run("res_003", VENUE, "T3");

// ── Menu ─────────────────────────────────────────────────────
[
  ["mi_pastilla", "Pastilla de pigeon", "entree", 180, 52, "available", null, 1],
  ["mi_tajine", "Tajine d'agneau aux pruneaux", "plat", 260, 84, "low_stock", 6, 1],
  ["mi_seabass", "Loup de mer chermoula", "plat", 320, 128, "available", null, 0],
  ["mi_couscous", "Couscous royal du vendredi", "plat", 240, 71, "sold_out", 0, 0],
  ["mi_orange", "Salade d'orange à la cannelle", "dessert", 90, 18, "available", null, 0],
  ["mi_negroni", "Negroni safrané", "cocktail", 140, 34, "available", null, 1],
].forEach(([id, name, category, price, cost, state, remaining, signature], i) =>
  insert("menu_items", {
    id, venue_id: VENUE, name, category,
    price_cents: mad(price), food_cost_cents: mad(cost),
    state, remaining, signature, position: i,
  }),
);

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
  ["act_1", "party_seated", "Rachid", "a installé la table S2 · 4 couverts", null, "S2", 0, 1],
  ["act_2", "reservation_created", "Nabil Cherkaoui", "a demandé une table pour 2", "res_010", null, 0, 4],
  ["act_3", "anomaly", "LYFE", "détecte 3 annulations sur le même créneau", null, null, 1, 9],
  ["act_4", "table_freed", "Salle", "a libéré la table P4, à débarrasser", null, "P4", 0, 12],
  ["act_5", "item_86", "Cuisine", "a passé le couscous royal en rupture", null, null, 0, 18],
  ["act_6", "waitlist_joined", "Famille Berrada", "rejoint la liste d'attente · 4 couverts", "res_w2", null, 0, 23],
  ["act_7", "review_received", "Leïla M.", "a laissé un avis 5 étoiles", null, null, 0, 180],
  ["act_8", "no_show", "Réservation précédente", "notée absente après 25 min · 3 couverts", null, null, 1, 40],
  ["act_9", "reservation_cancelled", "Sofia Lahlou", "a annulé sa table de 2", null, null, 0, 47],
  ["act_10", "payment_settled", "LYFE", "a clôturé le versement de la semaine", null, null, 0, 2880],
].forEach(([id, type, actor, message, res, table, attention, mins]) =>
  insert("activity", {
    id, venue_id: VENUE, type, actor, message,
    reservation_id: res, table_code: table,
    needs_attention: attention, at: minutesAgo(mins),
  }),
);

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log(`seeded ${dbPath}`);
for (const t of ["venues","business_accounts","staff","zones","dining_tables","availability_slots","closures","services","service_slot_load","customers","customer_preferences","no_show_records","reservations","reservation_status_history","menu_items","reviews","review_replies","review_tags","notifications","notification_preferences","payouts","analytics_daily","activity"]) {
  console.log(`  ${t.padEnd(28)} ${count(t)}`);
}
db.close();
