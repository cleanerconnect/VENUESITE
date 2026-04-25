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
import { IconMore, IconSearch } from "@/components/layout/icons";
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
        eyebrow="Catalogue"
        action={
          <Link
            href="/events/new"
            className="hidden md:inline-flex h-9 px-4 items-center text-[13px] font-medium bg-gradient-to-b from-[#1a1a1a] to-ink text-white rounded-md shadow-xs hover:from-[#2a2a2a] transition-all"
          >
            Créer
          </Link>
        }
      />

      <div className="px-4 md:px-8 py-6 max-w-content mx-auto fade-up">
        {/* Search + sort */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
          <div className="md:w-96">
            <Input
              placeholder="Rechercher un événement…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              prefix={<IconSearch />}
            />
          </div>
          <div className="md:ml-auto">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 px-3 bg-surface border border-line rounded-md text-sm focus:outline-none focus:border-ink focus:shadow-focus transition-all"
            >
              <option value="date_desc">Date · récent → ancien</option>
              <option value="date_asc">Date · ancien → récent</option>
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
                  "relative px-3.5 py-3 text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "text-ink font-semibold"
                    : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {f.label}
                <span
                  className={[
                    "ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[11px] rounded num",
                    active ? "bg-ink text-white" : "bg-ink/5 text-muted",
                  ].join(" ")}
                >
                  {counts[f.id] ?? 0}
                </span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink"
                  />
                ) : null}
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
                  className="bg-surface border border-line rounded-lg shadow-card overflow-hidden card-link"
                >
                  {event.status === "rejected" && event.rejectionReason ? (
                    <div className="bg-error/[0.04] border-b border-error/20 px-5 py-3 text-[13px] text-error/90 flex items-start gap-3">
                      <strong className="font-semibold shrink-0">Refusé : </strong>
                      <span className="flex-1">{event.rejectionReason}</span>
                      <Link
                        href={`/events/${event.id}`}
                        className="underline font-medium shrink-0"
                      >
                        Corriger →
                      </Link>
                    </div>
                  ) : null}

                  <Link
                    href={`/events/${event.id}`}
                    className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-5 p-5"
                  >
                    <div
                      className="hidden md:block w-[120px] h-[150px] bg-gradient-to-br from-line/40 to-line/80 rounded-md relative overflow-hidden"
                      aria-hidden="true"
                    >
                      <div className="absolute inset-0 bg-hero-warm opacity-70" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="h-display text-[17px] text-ink truncate">
                          {event.name}
                        </h3>
                        <StatusBadge status={event.status} />
                      </div>
                      <div className="text-[12px] text-muted mt-1 num flex items-center gap-2">
                        <span>{formatDate(event.startsAt)}</span>
                        <span className="text-line-strong">·</span>
                        <span>
                          {event.venue.name}, {event.venue.city}
                        </span>
                      </div>

                      {cap > 0 ? (
                        <div className="mt-4 max-w-md">
                          <div className="flex items-center justify-between text-[12px] num mb-1.5">
                            <span className="text-muted">
                              <span className="text-ink font-semibold">
                                {sold}
                              </span>{" "}
                              / {cap} billets
                            </span>
                            <span className="text-ink font-semibold">
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
                        }}
                        className="h-9 w-9 flex items-center justify-center text-muted hover:text-ink hover:bg-ink/5 rounded-md transition-colors"
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
