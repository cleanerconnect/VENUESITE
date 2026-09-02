"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Printer, Search } from "lucide-react";
import { getAllEvents } from "@/lib/mock/events";
import { getBilanByEventId, hasBilan } from "@/lib/mock/bilan";
import type { EventStatus, LyfeEvent } from "@/lib/types/domain";
import { UpcomingEventRow } from "@/components/cards/UpcomingEventRow";
import { MobileEventCard } from "@/components/cards/MobileEventCard";
import { RecentBilansStrip } from "@/components/cards/RecentBilansStrip";
import {
  PullToRefreshIndicator,
  usePullToRefresh,
} from "@/components/cards/PullToRefresh";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRole } from "@/lib/auth/role";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";

type Filter = "all" | EventStatus | "bilans";
type Sort = "date_desc" | "date_asc" | "revenue" | "tickets";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "on_sale", label: "En vente" },
  { id: "live", label: "En cours" },
  { id: "in_review", label: "En modération" },
  { id: "draft", label: "Brouillons" },
  { id: "bilans", label: "Bilans" },
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
  const { toast } = useToast();
  const canCreate = role === "owner" || role === "admin";

  // Pull-to-refresh — fakes a network round-trip and surfaces a toast
  // confirming the freshness. The mock data is static so there's
  // nothing to fetch; the affordance is what investors care about.
  const refresh = async () => {
    await new Promise((r) => setTimeout(r, 700));
    toast({ tone: "success", title: "Liste rafraîchie" });
  };
  const pull = usePullToRefresh(refresh);

  const all = useMemo(getAllEvents, []);

  const counts = useMemo(() => {
    return FILTERS.reduce<Record<string, number>>((acc, f) => {
      if (f.id === "all") acc[f.id] = all.length;
      else if (f.id === "bilans")
        acc[f.id] = all.filter((e) => hasBilan(e)).length;
      else acc[f.id] = all.filter((e) => e.status.state === f.id).length;
      return acc;
    }, {});
  }, [all]);

  // Most-recent settled events with a Bilan, capped at 3 — feeds the
  // "Récents bilans" strip pinned above the filter tabs. Sorted by
  // event end date so the freshest bilan reads first.
  const recentBilans = useMemo(() => {
    return all
      .filter((e) => hasBilan(e))
      .sort((a, b) => (a.endsAt < b.endsAt ? 1 : -1))
      .slice(0, 3)
      .map((e) => ({
        event: e,
        bilan: getBilanByEventId(e.id, all),
      }))
      .filter((r): r is { event: LyfeEvent; bilan: NonNullable<typeof r.bilan> } =>
        Boolean(r.bilan),
      );
  }, [all]);

  const list = useMemo(() => {
    return all
      .filter((e) => {
        if (filter === "all") return true;
        if (filter === "bilans") return hasBilan(e);
        return e.status.state === filter;
      })
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
    <div ref={pull.ref} className="space-y-5">
      <PullToRefreshIndicator
        pulling={pull.pulling}
        distance={pull.distance}
        refreshing={pull.refreshing}
      />

      <PageHeader
        title="Mes événements"
        subtitle={
          canCreate
            ? "Ce que vous organisez, passés, en cours, à venir."
            : "Les événements que vous pouvez scanner."
        }
        action={
          canCreate ? (
            <Link href="/events/new" className="hidden md:block">
              <Button iconLeft={<Plus size={16} strokeWidth={2} />}>
                Créer un événement
              </Button>
            </Link>
          ) : null
        }
      />

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

      {/* === Récents bilans strip (only when 1+ settled events exist) === */}
      {recentBilans.length > 0 ? (
        <RecentBilansStrip rows={recentBilans} />
      ) : null}

      <FilterTabs
        layoutId="events-filter-underline"
        value={filter}
        onChange={setFilter}
        tabs={FILTERS.map((f) => ({ ...f, count: counts[f.id] ?? 0 }))}
      />

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
        <>
          {/* Mobile: full event cards with cover, key metric, two CTAs. */}
          <div className="md:hidden flex flex-col gap-4">
            {list.map((event) => (
              <MobileEventCard key={event.id} event={event} />
            ))}
          </div>
          {/* Desktop: existing horizontal rows. */}
          <div className="hidden md:flex flex-col gap-3">
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
        </>
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
