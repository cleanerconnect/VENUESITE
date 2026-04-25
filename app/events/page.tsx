"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { events as allEvents } from "@/lib/mockData";
import { formatDate, formatMad } from "@/lib/format";
import { IconMore } from "@/components/layout/icons";
import type { EventStatus } from "@/lib/types";

const FILTERS: { id: "all" | EventStatus; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "live", label: "En vente" },
  { id: "pending", label: "En modération" },
  { id: "draft", label: "Brouillons" },
  { id: "past", label: "Passés" },
  { id: "rejected", label: "Refusés" },
];

type SortKey = "date_desc" | "date_asc" | "revenue" | "tickets";

export default function MyEventsPage() {
  const [filter, setFilter] = useState<"all" | EventStatus>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const filtered = useMemo(() => {
    return allEvents
      .filter((e) => (filter === "all" ? true : e.status === filter))
      .filter((e) =>
        query.trim()
          ? e.name.toLowerCase().includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => {
        if (sort === "date_desc")
          return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        if (sort === "date_asc")
          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        const revA = a.tiers.reduce((s, t) => s + t.sold * t.faceValueMad, 0);
        const revB = b.tiers.reduce((s, t) => s + t.sold * t.faceValueMad, 0);
        if (sort === "revenue") return revB - revA;
        const soldA = a.tiers.reduce((s, t) => s + t.sold, 0);
        const soldB = b.tiers.reduce((s, t) => s + t.sold, 0);
        return soldB - soldA;
      });
  }, [filter, query, sort]);

  const counts = useMemo(() => {
    return FILTERS.reduce<Record<string, number>>((acc, f) => {
      acc[f.id] =
        f.id === "all"
          ? allEvents.length
          : allEvents.filter((e) => e.status === f.id).length;
      return acc;
    }, {});
  }, []);

  return (
    <>
      <TopBar
        title="Mes événements"
        action={
          <Link
            href="/events/new"
            className="hidden md:inline-flex h-9 px-4 items-center text-sm bg-ink text-white"
          >
            Créer
          </Link>
        }
      />

      <div className="px-4 md:px-8 py-6 max-w-content mx-auto">
        {/* Search + sort */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="md:w-80">
            <Input
              placeholder="Rechercher par nom…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="md:ml-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 px-3 bg-surface border border-line text-sm focus:outline-none focus:border-ink"
            >
              <option value="date_desc">Date (récent → ancien)</option>
              <option value="date_asc">Date (ancien → récent)</option>
              <option value="revenue">Revenu</option>
              <option value="tickets">Billets vendus</option>
            </select>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto scroll-thin border-b border-line mb-6">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={[
                  "px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors",
                  active
                    ? "border-ink text-ink font-medium"
                    : "border-transparent text-muted hover:text-ink",
                ].join(" ")}
              >
                {f.label}
                <span className="ml-2 text-xs text-muted num">
                  ({counts[f.id] ?? 0})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Aucun événement à afficher.</p>
            </Card>
          ) : (
            filtered.map((event) => {
              const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
              const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
              const revenue = event.tiers.reduce(
                (s, t) => s + t.sold * t.faceValueMad,
                0,
              );

              return (
                <article
                  key={event.id}
                  className="bg-surface border border-line shadow-card overflow-hidden"
                >
                  {event.status === "rejected" && event.rejectionReason ? (
                    <div className="bg-error/5 border-b border-error/30 px-5 py-3 text-sm text-error">
                      <strong className="font-semibold">Refusé : </strong>
                      {event.rejectionReason}
                      <Link
                        href={`/events/${event.id}`}
                        className="ml-2 underline font-medium"
                      >
                        Corriger et resoumettre →
                      </Link>
                    </div>
                  ) : null}

                  <Link
                    href={`/events/${event.id}`}
                    className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-4 p-5 hover:bg-bg/40 transition-colors"
                  >
                    <div
                      className="hidden md:block w-[120px] h-[150px] bg-line/40 border border-line"
                      aria-hidden="true"
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="h-serif text-lg text-ink truncate">
                          {event.name}
                        </h3>
                        <StatusBadge status={event.status} />
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {formatDate(event.startsAt)} · {event.venue.name},{" "}
                        {event.venue.city}
                      </div>

                      {cap > 0 ? (
                        <div className="mt-3 max-w-md">
                          <div className="flex items-center justify-between text-xs text-muted num mb-1.5">
                            <span>
                              {sold} / {cap} billets
                            </span>
                            <span className="text-ink font-medium">
                              {formatMad(revenue)}
                            </span>
                          </div>
                          <ProgressBar value={sold} max={cap} tone="gold" />
                        </div>
                      ) : null}
                    </div>

                    <div className="flex md:flex-col items-end justify-between gap-2 md:py-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          // Real impl: open dropdown — Edit, Duplicate, Cancel, View public.
                        }}
                        className="h-9 w-9 flex items-center justify-center text-muted hover:text-ink"
                        aria-label="Actions"
                      >
                        <IconMore />
                      </button>
                    </div>
                  </Link>
                </article>
              );
            })
          )}
        </div>

        <div className="md:hidden mt-6">
          <Link href="/events/new">
            <Button fullWidth size="lg">
              Créer un événement
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
