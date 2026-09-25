// Part D-2 · the dataset a busy venue actually has.
//
//   DATABASE_URL=… node tools/verify/_loadseed.mjs
//
// 500 guests, 2 000 bookings on one day (200 of them in one sitting) and
// 60 days of history behind them. Written straight in SQL because the
// point is the volume, not the path it arrived by.

import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant");
const client = new pg.Client({ connectionString: url });
await client.connect();

const VENUE = "rst_dar_zellij";
const tz = 1; // Africa/Casablanca, hors Ramadan
const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

console.log("services :", (await client.query(
  "SELECT id, starts_at, ends_at, slot_minutes FROM service_definitions WHERE venue_id = $1",
  [VENUE])).rows);

// ── 500 guests ──
const customers = [];
for (let i = 0; i < 500; i += 1) {
  customers.push([
    `cus_load_${i}`, VENUE, `Client Charge ${i}`,
    `+2126${String(10000000 + i)}`,
    `client.charge.${i}@example.ma`, new Date().toISOString(), 1 + (i % 9), 0, 0,
  ]);
}
await client.query("DELETE FROM reservations WHERE id LIKE 'res_load_%'");
await client.query("DELETE FROM customers WHERE id LIKE 'cus_load_%'");
for (let i = 0; i < customers.length; i += 100) {
  const chunk = customers.slice(i, i + 100);
  const values = chunk
    .map((_, n) => `($${n * 9 + 1},$${n * 9 + 2},$${n * 9 + 3},$${n * 9 + 4},$${n * 9 + 5},$${n * 9 + 6},$${n * 9 + 7},$${n * 9 + 8},$${n * 9 + 9})`)
    .join(",");
  await client.query(
    `INSERT INTO customers (id, venue_id, full_name, phone, email, first_seen_at,
       visit_count, total_spend_cents, opted_out_of_marketing) VALUES ${values}`,
    chunk.flat(),
  );
}
console.log("clients insérés :", customers.length);

// ── bookings ──
const states = ["requested", "confirmed", "arrived", "completed", "no_show", "cancelled"];
const rows = [];
let n = 0;
const push = (dayOffset, hour, minute, state) => {
  const date = day(dayOffset);
  const at = `${date}T${String(hour - tz).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
  const c = customers[n % customers.length];
  rows.push([
    `res_load_${n}`, VENUE, null, c[0], c[2], c[3], 1 + (n % 8), at, state,
    n % 7 === 0 ? "phone" : n % 5 === 0 ? "whatsapp" : "lyfe",
    n % 11 === 0 ? "Allergie aux fruits de mer" : null,
    `LYFE-L${String(n).padStart(6, "0")}`, new Date().toISOString(), new Date().toISOString(),
  ]);
  n += 1;
};

// 200 in one sitting: today, 13h00–13h30.
for (let i = 0; i < 200; i += 1) push(0, 13, i % 2 === 0 ? 0 : 30, "confirmed");
// Up to 2 000 across today.
while (n < 2000) push(0, 12 + (n % 11), (n % 4) * 15, states[n % states.length]);
// 60 days of history, ~40 a day.
for (let d = 1; d <= 60; d += 1) {
  for (let i = 0; i < 40; i += 1) push(-d, 12 + (i % 11), (i % 4) * 15, states[(i + d) % states.length]);
}

for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const values = chunk
    .map((_, k) => `(${Array.from({ length: 14 }, (_, j) => `$${k * 14 + j + 1}`).join(",")})`)
    .join(",");
  await client.query(
    `INSERT INTO reservations (id, venue_id, service_id, customer_id, guest_name,
       guest_phone, party_size, at, state, channel, note, qr_code, created_at, updated_at)
     VALUES ${values}`,
    chunk.flat(),
  );
}
console.log("réservations insérées :", rows.length);
const counts = await client.query(
  `SELECT count(*) total,
          count(*) FILTER (WHERE at::date = current_date) aujourd_hui
     FROM reservations WHERE venue_id = $1`, [VENUE]);
console.log(counts.rows[0]);
await client.end();
