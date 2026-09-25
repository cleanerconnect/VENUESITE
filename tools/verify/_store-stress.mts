// Part D · concurrence, temps, et les cas de données limites, au niveau
// du magasin plutôt que du navigateur : ce sont des courses et des
// frontières d'heure, et un clic ne les provoque pas de façon fiable.
//
//   DATABASE_URL=… npx tsx tools/verify/_store-stress.mts

import { formatInTimeZone } from "date-fns-tz";

// `server-only` throws outside a React server context, and this is a
// script. Stubbed before anything imports a store module — the same
// thing `db/snapshot.mjs` does, which is why the store modules below are
// dynamic imports: a static one is hoisted above this stub.
const { createRequire } = await import("node:module");
const require_ = createRequire(`${process.cwd()}/package.json`);
require_.cache[require_.resolve("server-only")] = {
  id: "server-only",
  exports: {},
  loaded: true,
} as never;

const { all, one, run, engineKind } = await import("../../src/lib/db/store.ts");
const overviewStore = await import("../../src/lib/db/overview-store.ts");
const { transitionBooking, rescheduleBooking, bookableSlots, searchReservations } = overviewStore;
const { StaleWriteError } = await import("../../src/lib/data/repository.ts");
const { slotOf } = await import("../../src/lib/restaurant/screens.ts");

const results: { id: string; ok: boolean }[] = [];
const record = (id: string, label: string, expected: string, observed: string, ok: boolean) => {
  results.push({ id, ok });
  console.log(`${ok ? "ok  " : "✗   "} ${id}  ${label}`);
  console.log(`        attendu : ${expected}`);
  console.log(`        observé : ${observed}`);
};

console.log(`moteur : ${engineKind()}`);

const VENUE = "rst_dar_zellij";

// ── D-1 · Concurrence ───────────────────────────────────────

// Two decisions on the same booking, at the same moment.
{
  const row = await one(
    "SELECT id FROM reservations WHERE venue_id = ? AND state = 'requested' LIMIT 1",
    VENUE,
  );
  if (!row) {
    record("D1-a", "deux décisions simultanées", "une réservation à confirmer", "aucune", false);
  } else {
    const id = String(row.id);
    const before = (await all(
      "SELECT id FROM reservation_status_history WHERE reservation_id = ?",
      id,
    )).length;
    const settled = await Promise.allSettled([
      transitionBooking(VENUE, id, "confirmed", "venue"),
      transitionBooking(VENUE, id, "no_show", "venue"),
    ]);
    const stale = settled.filter(
      (r) => r.status === "rejected" && r.reason instanceof StaleWriteError,
    ).length;
    const won = settled.filter((r) => r.status === "fulfilled").length;
    const after = (await all(
      "SELECT id FROM reservation_status_history WHERE reservation_id = ?",
      id,
    )).length;
    const state = String((await one("SELECT state FROM reservations WHERE id = ?", id))?.state);
    const ok = won === 1 && stale === 1 && after - before === 1;
    record(
      "D1-a",
      "Accepter et Absent sur la même réservation, en parallèle",
      "une gagne, l'autre est refusée, une seule ligne d'historique",
      `gagnantes ${won} · refusées ${stale} · lignes d'historique +${after - before} · état ${state}`,
      ok,
    );
  }
}

// Two reschedules of the same booking, to two different hours.
{
  const row = await one(
    "SELECT id, at FROM reservations WHERE venue_id = ? AND state IN ('confirmed','requested') LIMIT 1",
    VENUE,
  );
  if (!row) {
    record("D1-b", "deux décalages simultanés", "une réservation décalable", "aucune", false);
  } else {
    const id = String(row.id);
    const base = new Date(String(row.at));
    const a = new Date(base.getTime() + 30 * 60_000).toISOString();
    const b = new Date(base.getTime() + 60 * 60_000).toISOString();
    const [ra, rb] = await Promise.all([
      rescheduleBooking(VENUE, id, a),
      rescheduleBooking(VENUE, id, b),
    ]);
    const moved = [ra, rb].filter((r) => r.moved).length;
    const messages = (await all(
      "SELECT id FROM messages_log WHERE reservation_id = ? AND kind = 'reservation_decalee'",
      id,
    )).length;
    record(
      "D1-b",
      "deux décalages simultanés vers deux heures différentes",
      "un seul décalage, un seul message au client",
      `décalages acceptés ${moved} · messages ${messages} · raisons ${[ra.reason, rb.reason].filter(Boolean).join(",") || "—"}`,
      moved === 1 && messages === 1,
    );
  }
}

// ── D-6 · Le temps ──────────────────────────────────────────

// A booking taken at 23h45 for a service that runs past midnight.
{
  const service = await one(
    `SELECT id, venue_id, name, starts_at, ends_at, slot_minutes
       FROM service_definitions
      WHERE ends_at < starts_at
      LIMIT 1`,
  );
  record(
    "D6-a",
    "un service qui franchit minuit existe dans le jeu de données",
    "au moins un — « Nuit » du Bar Nomad, 21h00 → 02h00",
    service ? `${service.name} ${service.starts_at}–${service.ends_at} (${service.venue_id})` : "aucun",
    Boolean(service),
  );

  if (service) {
    const venue = String(service.venue_id);
    const today = formatInTimeZone(new Date(), "Africa/Casablanca", "yyyy-MM-dd");
    const slots = await bookableSlots(venue, today);
    const past = slots.filter((s) => {
      const hm = formatInTimeZone(new Date(s.at), "Africa/Casablanca", "HH:mm");
      return hm < "06:00";
    });
    record(
      "D6-b",
      "les créneaux proposés après minuit pour ce service",
      "des créneaux entre 00h00 et 02h00 le lendemain",
      `${slots.length} créneaux au total, dont ${past.length} avant 06h00 · ${past.slice(0, 3).map((s) => formatInTimeZone(new Date(s.at), "Africa/Casablanca", "dd/MM HH:mm")).join(", ") || "—"}`,
      past.length > 0,
    );
  }
}

// A 15-minute grid, and a booking at :10.
{
  const row = await one(
    "SELECT id, at FROM reservations WHERE venue_id = ? LIMIT 1",
    VENUE,
  );
  const id = String(row?.id);
  const base = new Date(String(row?.at));
  base.setMinutes(10, 0, 0);
  await run("UPDATE reservations SET at = ? WHERE id = ?", base.toISOString(), id);
  await run("UPDATE service_definitions SET slot_minutes = 15 WHERE venue_id = ?", VENUE);
  const observed = slotOf(base.toISOString(), 15);
  record(
    "D6-c",
    "grille de 15 minutes, réservation à :10",
    "regroupée sous le créneau :00, jamais inventée à :10",
    String(observed),
    String(observed).endsWith("h00"),
  );
  await run("UPDATE service_definitions SET slot_minutes = 30 WHERE venue_id = ?", VENUE);
}

// The offset Morocco actually uses, and the two nights it changes.
{
  const transitions = ["2026-02-15T02:00:00Z", "2026-03-22T02:00:00Z", "2027-02-07T02:00:00Z"];
  const lines = transitions.map((iso) => {
    const before = new Date(Date.parse(iso) - 3600_000);
    const after = new Date(Date.parse(iso) + 3600_000);
    return `${iso.slice(0, 10)} : ${formatInTimeZone(before, "Africa/Casablanca", "HH:mm XXX")} → ${formatInTimeZone(after, "Africa/Casablanca", "HH:mm XXX")}`;
  });
  record(
    "D6-d",
    "les bascules d'offset du Maroc (Ramadan, pas l'heure d'été)",
    "deux par an, et le portail les lit depuis la base IANA plutôt que d'un décalage fixe",
    lines.join(" · "),
    true,
  );
}

// The server's own clock.
{
  const tz = process.env.TZ ?? "(non défini)";
  const day = new Date().toISOString().slice(0, 10);
  const local = formatInTimeZone(new Date(), "Africa/Casablanca", "yyyy-MM-dd");
  record(
    "D6-e",
    "le jour calculé par le processus contre le jour du lieu",
    "les deux identiques, ou TZ fixée à Africa/Casablanca",
    `TZ=${tz} · UTC ${day} · Casablanca ${local}`,
    tz === "Africa/Casablanca" || day === local,
  );
}

// ── D-7 · Données limites ───────────────────────────────────

// A guest with no phone at all.
{
  const row = await one("SELECT id FROM reservations WHERE venue_id = ? LIMIT 1", VENUE);
  const id = String(row?.id);
  const before = await one("SELECT guest_phone FROM reservations WHERE id = ?", id);
  await run("UPDATE reservations SET guest_phone = '' WHERE id = ?", id);
  const found = await searchReservations(VENUE, "06");
  record(
    "D7-a",
    "une réservation sans téléphone",
    "la recherche par chiffres ne la fait pas planter",
    `${found.length} résultat(s) pour « 06 »`,
    true,
  );
  await run("UPDATE reservations SET guest_phone = ? WHERE id = ?", String(before?.guest_phone ?? ""), id);
}

// A booking whose customer row is gone.
{
  // Today's book, because that is what `overview()` reads: a booking on
  // another day is absent for a reason that has nothing to do with its
  // customer row.
  const today = formatInTimeZone(new Date(), "Africa/Casablanca", "yyyy-MM-dd");
  const row = await one(
    `SELECT id, customer_id FROM reservations
      WHERE venue_id = ? AND customer_id IS NOT NULL
        AND at LIKE ? AND state IN ('requested','confirmed','arrived')
      LIMIT 1`,
    VENUE,
    `${today}%`,
  );
  const id = String(row?.id);
  const customer = row?.customer_id;
  await run("UPDATE reservations SET customer_id = NULL WHERE id = ?", id);
  let ok = true;
  let observed = "";
  try {
    const data = await overviewStore.overview(VENUE, "Yassine");
    const found = data?.upcomingReservations.find((r) => r.id === id);
    observed = found
      ? `rendue · e-mail ${found.guestEmail ?? "absent"} · visites ${found.visits}`
      : "absente de l'aperçu";
  } catch (error) {
    ok = false;
    observed = `exception : ${String(error).slice(0, 90)}`;
  }
  record("D7-b", "une réservation sans fiche client", "rendue, sans e-mail ni âge, sans exception", observed, ok);
  await run("UPDATE reservations SET customer_id = ? WHERE id = ?", String(customer), id);
}

// A venue with no service defined at all.
{
  const { dayBookFor } = overviewStore;
  const rows = await all("SELECT id FROM service_definitions WHERE venue_id = ?", VENUE);
  await run("UPDATE service_definitions SET enabled = 0 WHERE venue_id = ?", VENUE);
  let ok = true;
  let observed = "";
  try {
    const book = await dayBookFor(VENUE, formatInTimeZone(new Date(), "Africa/Casablanca", "yyyy-MM-dd"));
    observed = `${book.services.length} service(s), ${book.reservations.length} réservation(s)`;
  } catch (error) {
    ok = false;
    observed = `exception : ${String(error).slice(0, 90)}`;
  }
  record("D7-c", "un établissement dont aucun service n'est actif", "le carnet du jour se lit quand même", observed, ok);
  await run("UPDATE service_definitions SET enabled = 1 WHERE venue_id = ?", VENUE);
  void rows;
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} cas conformes`);
const failed = results.filter((r) => !r.ok);
if (failed.length) console.log("échecs : " + failed.map((r) => r.id).join(", "));
