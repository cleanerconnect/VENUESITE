"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Reservation } from "@/lib/types/restaurant";
import { searchBookings } from "@/app/actions/bookings";
import { VENUE_TIME_ZONE } from "@/lib/time/zone";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { RESERVATION_CHANNEL } from "@/lib/restaurant/vocabulary";

// What the chrome's search box finds, grouped by day.
//
// It replaces the book rather than filtering it, and that is the whole
// idea: the box used to narrow the rows already on screen, so a host
// looking for a guest who booked for Saturday found nothing on a
// Thursday and had no way to tell whether the booking did not exist or
// was simply not on this page.
//
// Every group is a day, newest first, and each result links to that day
// in the book — so finding the booking and working on it are one move.

export function BookingSearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Reservation[] | null>(null);

  // Debounced, because this is a database read on every keystroke and a
  // host types a name faster than a query answers.
  useEffect(() => {
    let live = true;
    setResults(null);
    const timer = setTimeout(() => {
      searchBookings(query).then((rows) => {
        if (live) setResults(rows);
      });
    }, 220);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (results === null) {
    return (
      <p className="text-sm text-ink-soft">Recherche dans le carnet…</p>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="font-medium text-ink">Aucune réservation trouvée</p>
        <p className="mt-1 text-sm text-ink-soft">
          Cherchez un nom, un numéro de téléphone — les quatre derniers chiffres
          suffisent — ou une date comme 25/09.
        </p>
      </div>
    );
  }

  // Grouped on the venue's own day, not on UTC: a booking at 00h30 in
  // Casablanca belongs to the night the host worked, and slicing the ISO
  // string would file it under tomorrow.
  const groups = new Map<string, Reservation[]>();
  for (const r of results) {
    const day = formatInTimeZone(new Date(r.at), VENUE_TIME_ZONE, "yyyy-MM-dd");
    groups.set(day, [...(groups.get(day) ?? []), r]);
  }

  return (
    <div className="space-y-6" data-search-results={results.length}>
      <p className="text-sm text-ink-soft">
        {results.length === 1
          ? "Une réservation trouvée"
          : `${results.length} réservations trouvées`}{" "}
        pour « {query} ».
      </p>

      {[...groups.entries()].map(([day, rows]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            {formatInTimeZone(
              new Date(`${day}T12:00:00Z`),
              VENUE_TIME_ZONE,
              "EEEE d MMMM",
              { locale: fr },
            )}
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/restaurant/reservations?date=${day}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 hover:bg-canvas-2"
                >
                  <span className="tabular-nums font-medium text-ink">
                    {formatInTimeZone(new Date(r.at), VENUE_TIME_ZONE, "HH'h'mm")}
                  </span>
                  <span className="font-medium text-ink">{r.guestName}</span>
                  <span className="text-sm text-ink-soft">
                    {r.guestPhone}
                  </span>
                  <span className="ml-auto text-sm text-ink-soft">
                    {r.partySize} · {RESERVATION_CHANNEL[r.channel]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
