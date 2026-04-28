"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { getAllEvents } from "@/lib/mock/events";
import type { EventStatus, LyfeEvent } from "@/lib/types/domain";
import { UpcomingEventRow } from "@/components/cards/UpcomingEventRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRole } from "@/lib/auth/role";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | EventStatus;
type Sort = "date_desc" | "date_asc" | "revenue" | "tickets";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "on_sale", label: "En vente" },
  { id: "live", label: "En cours" },
  { id: "in_review", label: "En modération" },
  { id: "draft", label: "Brouillons" },
  { id: "past", label: "Passés" },
  { id: "settled", label: "Versés" },
  { id: "cancelled", label: "Annulés" },
  { id: "rejected", label: "Refusés" },
];

export default function EventsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date_desc");
  const role = useRole();
  const canCreate = role === "owner" || role === "admin";

  const all = useMemo(getAllEvents, []);

  const counts = useMemo(() => {
    return FILTERS.reduce<Record<string, number>>((acc, f) => {
      acc[f.id] =
        f.id === "all"
          ? all.length
          : all.filter((e) => e.status.state === f.id).length;
      return acc;
    }, {});
  }, [all]);

  const list = useMemo(() => {
    return all
      .filter((e) => (filter === "all" ? true : e.status.state === filter))
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
  }, [all, filter, query, sort]);

  return (
    <div className="space-y-5">
      {/* === Header === */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Mes événements</h1>
          <p className="text-body text-ink-soft mt-1.5">
            {canCreate
              ? "Ce que vous organisez, passés, en cours, à venir."
              : "Les événements que vous pouvez scanner."}
          </p>
        </div>
        {canCreate ? (
          <Link href="/events/new" className="hidden md:block">
            <Button iconLeft={<Plus size={16} strokeWidth={2} />}>
              Créer un événement
            </Button>
          </Link>
        ) : null}
      </div>

      {/* === Search + sort === */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="md:flex-1 max-w-xl">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={1.8}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un événement…"
              className="w-full h-12 pl-10 pr-4 bg-surface border border-line rounded-full text-[14px] outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-12 px-4 pr-10 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors appearance-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%236B7689' stroke-width='1.4' stroke-linecap='round'%3E%3Cpath d='m3 5 3 3 3-3'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            backgroundSize: "12px",
          }}
        >
          <option value="date_desc">Date · récent → ancien</option>
          <option value="date_asc">Date · ancien → récent</option>
          <option value="revenue">Revenu</option>
          <option value="tickets">Billets vendus</option>
        </select>
      </div>

      {/* === Filter tabs (segmented control with sliding violet underline) === */}
      <div className="border-b border-line-soft overflow-x-auto scroll-thin">
        <div className="flex gap-1 min-w-max">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                  active ? "text-ink" : "text-ink-mute hover:text-ink",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] rounded-full num",
                    active ? "bg-ink text-canvas" : "bg-ink/[0.06] text-ink-soft",
                  )}
                >
                  {counts[f.id] ?? 0}
                </span>
                {active ? (
                  <motion.span
                    layoutId="events-filter-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-violet rounded-full"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* === List === */}
      {list.length === 0 ? (
        <EmptyState
          title={canCreate ? "Pas encore d'événement." : "Aucun événement à scanner"}
          description={
            !canCreate
              ? "Le Propriétaire de l'organisation publiera ici les événements ouverts à votre rôle."
              : filter === "all"
                ? "Lancez votre premier événement en quelques minutes."
                : "Aucun événement ne correspond à ce filtre."
          }
          cta={
            canCreate && filter === "all"
              ? { label: "Créer un événement", href: "/events/new" }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((event) =>
            event.status.state === "rejected" ? (
              <RejectedRow key={event.id} event={event} />
            ) : event.status.state === "cancelled" ? (
              <CancelledRow key={event.id} event={event} />
            ) : (
              <UpcomingEventRow key={event.id} event={event} />
            ),
          )}
        </div>
      )}

      {canCreate ? (
        <div className="md:hidden pt-4">
          <Link href="/events/new">
            <Button fullWidth size="lg" iconLeft={<Plus size={18} strokeWidth={2} />}>
              Créer un événement
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function RejectedRow({ event }: { event: LyfeEvent }) {
  if (event.status.state !== "rejected") return null;
  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden border border-line bg-surface">
      <UpcomingEventRow event={event} />
      <div className="bg-tint-rose px-5 py-3.5">
        <div className="text-eyebrow text-danger mb-1">Refusé par LYFE</div>
        <p className="text-[13px] text-ink leading-relaxed">
          {event.status.reason}
        </p>
        <Link
          href={`/events/${event.id}/edit?reason=rejected`}
          className="inline-flex items-center gap-1 text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink mt-2 transition-colors"
        >
          Corriger & resoumettre
          <ChevronRight size={12} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function CancelledRow({ event }: { event: LyfeEvent }) {
  if (event.status.state !== "cancelled") return null;
  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  return (
    <div className="rounded-[var(--radius-lg)] overflow-hidden border border-line bg-surface">
      <UpcomingEventRow event={event} />
      <div className="bg-tint-rose px-5 py-3.5">
        <div className="text-eyebrow text-danger mb-1">
          Annulé · {sold} remboursements en cours
        </div>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          L&apos;équipe LYFE traite les remboursements automatiques. Les
          acheteurs reçoivent leur courriel sous 48h.
        </p>
      </div>
    </div>
  );
}
