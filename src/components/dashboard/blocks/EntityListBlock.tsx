"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Search } from "lucide-react";
import type { EntityListBlock as Spec, EntityRow } from "@/lib/dashboard/spec";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { COPY } from "@/lib/copy/fr";
import { useDetailStore } from "@/lib/stores/detail";
import {
  ActionControl,
  ActionLink,
  Icon,
  MetricText,
  SpecBadge,
} from "../primitives";
import { useCommandRunner } from "../commands";
import { cn } from "@/lib/utils/cn";

// The row card behind every "list of things" on the platform: upcoming
// events, tonight's covers, tables in service, menu items. It knows about
// a title, badges, a meta line, a progress bar, a trailing figure and a
// signal strip — never about what any of them mean.
export function EntityListBlock({ block }: { block: Spec }) {
  const [tab, setTab] = useState(block.tabs?.[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(block.sorts?.[0]?.id ?? "");
  // A collapsible group opens on demand and stays open; nothing else on
  // the screen collapses, so this is local rather than a stored setting.
  const [expanded, setExpanded] = useState(false);

  // Counts are derived from the rows rather than passed in, so a tab can
  // never disagree with the list underneath it.
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of block.tabs ?? []) {
      out[t.id] = block.rows.filter((r) => matchesTab(r, t)).length;
    }
    return out;
  }, [block.rows, block.tabs]);

  const rows = useMemo(() => {
    const activeTab = block.tabs?.find((t) => t.id === tab);
    const needle = query.trim().toLowerCase();
    const activeSort = block.sorts?.find((o) => o.id === sort);

    const filtered = block.rows
      .filter((r) => (activeTab ? matchesTab(r, activeTab) : true))
      .filter((r) => (needle ? searchText(r).includes(needle) : true));

    if (!activeSort) return filtered;

    // Sorting a copy — the spec's row order is the caller's, not ours to
    // mutate.
    return [...filtered].sort((a, b) => {
      const av = a.sortKeys?.[activeSort.key];
      const bv = b.sortKeys?.[activeSort.key];
      if (av === undefined || bv === undefined) return 0;
      const delta =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "fr");
      return activeSort.direction === "asc" ? delta : -delta;
    });
  }, [block.rows, block.sorts, block.tabs, query, sort, tab]);

  const hasControls = Boolean(block.search || block.sorts?.length);
  const filteredToNothing = block.rows.length > 0 && rows.length === 0;

  return (
    <section>
      {block.heading ? (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-ink">{block.heading}</h2>
            {block.subheading ? (
              <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
            ) : null}
          </div>
          {block.headingAction ? (
            <ActionLink action={block.headingAction} />
          ) : null}
        </div>
      ) : null}

      {hasControls ? (
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {block.search ? (
            <div className="md:flex-1 md:max-w-xl relative">
              <Search
                size={16}
                strokeWidth={1.8}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={block.search.placeholder}
                aria-label={block.search.placeholder}
                className="w-full h-12 pl-10 pr-4 bg-surface border border-line rounded-full text-[14px] outline-none focus:border-ink transition-colors"
              />
            </div>
          ) : null}

          {/* The select used to carry its name in `aria-label` alone, so
              a sighted user read "Heure" in a box and had to work out
              that it was a sort order and not a filter. */}
          {block.sorts?.length ? (
            <label className="flex items-center gap-2.5 shrink-0">
              <span className="text-meta text-ink-soft whitespace-nowrap">
                Trier par
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-12 px-4 pr-10 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors appearance-none"
                style={SELECT_CHEVRON}
              >
                {block.sorts.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {block.tabs?.length ? (
        <FilterTabs
          className="mb-4"
          layoutId={`entity-list-underline-${block.id}`}
          value={tab}
          onChange={setTab}
          tabs={block.tabs.map((t) => ({
            id: t.id,
            label: t.label,
            count: counts[t.id] ?? 0,
          }))}
        />
      ) : null}

      {block.collapsible && !expanded && block.rows.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between gap-3 bg-canvas-2 border border-line rounded-[var(--radius-lg)] px-4 py-3.5 text-left hover:border-ink/30 transition-colors"
        >
          <span className="text-body font-semibold text-ink">
            {block.collapsible.summary}
          </span>
          <span className="text-meta text-ink-soft font-semibold shrink-0">
            Afficher
          </span>
        </button>
      ) : block.collapsible && block.rows.length === 0 ? (
        <div className="bg-canvas-2 border border-line rounded-[var(--radius-lg)] px-4 py-3.5 text-body font-semibold text-ink-soft">
          {block.collapsible.summary}
        </div>
      ) : block.rows.length === 0 ? (
        <EmptyState
          title={block.empty?.title ?? COPY.empty.nothingToShow}
          description={block.empty?.body}
          cta={
            block.empty?.action?.kind === "link"
              ? { label: block.empty.action.label, href: block.empty.action.href }
              : undefined
          }
        />
      ) : filteredToNothing ? (
        // An empty *result* is a different message from an empty list —
        // conflating them tells a user their book is empty when they have
        // simply typed a name that isn't in it.
        <div className="bg-canvas-2 rounded-[var(--radius-xl)] py-10 px-6 text-center">
          <div className="text-body font-semibold text-ink">
            {block.noMatches?.title ?? COPY.empty.noResults}
          </div>
          <p className="text-meta text-ink-mute mt-1">
            {block.noMatches?.body ?? "Ajustez la recherche ou le filtre."}
          </p>
        </div>
      ) : (
        <>
          <SlotGroups rows={rows} />
          {block.collapsible ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-3 text-meta text-ink-soft font-semibold underline underline-offset-2 hover:text-ink transition-colors"
            >
              Masquer
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

const SELECT_CHEVRON = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%236B7689' stroke-width='1.4' stroke-linecap='round'%3E%3Cpath d='m3 5 3 3 3-3'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  backgroundSize: "12px",
} as const;

function matchesTab(row: EntityRow, tab: NonNullable<Spec["tabs"]>[number]) {
  if (!tab.match) return true;
  const value = row.facets?.[tab.match.facet];
  return value !== undefined && tab.match.values.includes(value);
}

function searchText(row: EntityRow) {
  return [row.title, row.meta, row.keywords, ...(row.badges ?? []).map((b) => b.label)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Rows under the slot they belong to, the way a paper book is ruled off.
 *
 * A host does not read a booking list as a list — they read it as a
 * sequence of sittings, and the question is always "what is coming at
 * half past". Rows that carry no slot fall through as one ungrouped run,
 * so every other screen is unchanged.
 */
function SlotGroups({ rows }: { rows: EntityRow[] }) {
  const groups: { slot: string | null; rows: EntityRow[] }[] = [];
  for (const row of rows) {
    const slot = row.slot ?? null;
    const last = groups[groups.length - 1];
    if (last && last.slot === slot) last.rows.push(row);
    else groups.push({ slot, rows: [row] });
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, i) => (
        <div key={`${group.slot ?? "_"}-${i}`} className="flex flex-col gap-3">
          {group.slot ? (
            <div className={cn("flex items-center gap-3", i > 0 && "mt-4")}>
              <span className="text-host-slot text-ink">{group.slot}</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span className="text-host-detail">
                {group.rows.length}
                {group.rows.length === 1 ? " table" : " tables"}
              </span>
            </div>
          ) : null}
          {group.rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** The left-edge band, and the word it needs so greyscale still reads. */
const STATUS_BAND: Record<
  NonNullable<EntityRow["status"]>["tone"],
  { bar: string; text: string }
> = {
  success: { bar: "bg-success", text: "text-success" },
  warning: { bar: "bg-warning", text: "text-warning" },
  neutral: { bar: "bg-ink-mute", text: "text-ink-soft" },
  danger: { bar: "bg-danger", text: "text-danger" },
};

function Row({ row }: { row: EntityRow }) {
  const run = useCommandRunner();
  const openDetail = useDetailStore((s) => s.open);

  // Host density draws the row differently: the time and the party size
  // lead in the largest type, the name follows, and the state is a band
  // rather than a pill. Everything else about the row — the note strip,
  // the actions, the detail sheet — is the same component.
  const host = Boolean(row.lead);

  const inner = (
    <div className="flex items-center gap-4">
      {host ? null : <Leading row={row} />}

      {host && row.lead ? (
        <div className="shrink-0 text-right w-[104px]">
          <div className="text-host-lead text-ink">{row.lead.time}</div>
          <div className="text-host-lead text-ink mt-0.5">{row.lead.party}</div>
        </div>
      ) : null}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              "text-ink truncate",
              host ? "text-host-name" : "text-h3",
            )}
          >
            {row.title}
          </h4>
          {host && row.status ? (
            <span
              className={cn(
                "text-host-detail font-semibold",
                STATUS_BAND[row.status.tone].text,
              )}
            >
              {row.status.label}
            </span>
          ) : null}
          {/* Under host density the state is the band, so the pill that
              carried it is not drawn a second time. */}
          {(host ? row.badges?.slice(1) : row.badges)?.map((badge, i) => (
            <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
          ))}
        </div>

        {row.meta ? (
          <div
            className={cn(
              "mt-1 num",
              host ? "text-host-detail" : "text-meta text-ink-mute",
            )}
          >
            {row.meta}
          </div>
        ) : null}

        {row.progress ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 max-w-[280px]">
              <ProgressBar
                value={row.progress.value}
                max={row.progress.max}
                tone={row.progress.tone ?? "violet"}
                size="xs"
              />
            </div>
            {row.progressCaption ? (
              <div className="text-meta text-ink-soft num shrink-0">
                {row.progressCaption}
              </div>
            ) : null}
          </div>
        ) : null}

        {row.signal ? (
          <div className="mt-3 inline-flex items-start gap-1.5 max-w-full bg-violet-soft text-violet-deep rounded-[var(--radius-sm)] px-2.5 py-1.5">
            <Icon
              name={row.signal.icon ?? "sparkles"}
              size={12}
              strokeWidth={1.9}
              className="shrink-0 mt-[1px]"
            />
            <span className="text-[12px] leading-snug font-medium truncate">
              {row.signal.text}
            </span>
          </div>
        ) : null}
      </div>

      {row.trailing ? (
        <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
          <div className="text-eyebrow text-ink-mute">{row.trailing.label}</div>
          <div className="text-h3 text-ink num">
            <MetricText metric={row.trailing.metric} />
          </div>
        </div>
      ) : null}

      {/* Reserves the kebab's footprint — the real trigger is positioned
          absolutely so it never nests inside the row's <Link>. */}
      {row.menu?.length ? <div className="w-9 h-9 shrink-0" aria-hidden /> : null}
    </div>
  );

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative bg-surface border border-line rounded-[var(--radius-lg)] hover:shadow-soft transition-shadow overflow-hidden">
        {row.status ? (
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[6px]",
              STATUS_BAND[row.status.tone].bar,
            )}
          />
        ) : null}
        {/* Three row behaviours, in priority order: open the detail sheet,
            navigate, or sit still. A row that does nothing gets no hover
            affordance and no button semantics. */}
        {row.detail ? (
          <button
            type="button"
            onClick={() => row.detail && openDetail(row.detail)}
            className={cn("block w-full text-left p-4", row.status && "pl-6")}
          >
            {inner}
          </button>
        ) : row.href ? (
          <Link href={row.href} className={cn("block p-4", row.status && "pl-6")}>
            {inner}
          </Link>
        ) : (
          <div className={cn("p-4", row.status && "pl-6")}>{inner}</div>
        )}

        {row.actions?.length ? (
          <div className={cn("flex flex-wrap gap-2 px-4 pb-4 -mt-1", row.status && "pl-6")}>
            {row.actions.map((cta, i) => (
              <ActionControl
                key={`${cta.action.label}-${i}`}
                cta={cta}
                size="sm"
                // Full width on a phone: Prévenir and Installer are
                // pressed one-handed at a host stand, and a 96px button
                // beside a queue is a mis-tap waiting to happen.
                className="flex-1 min-w-[8.5rem] md:flex-none justify-center"
              />
            ))}
          </div>
        ) : null}

        {row.menu?.length ? (
          <div className="absolute top-4 right-4">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute transition-colors"
                  aria-label="Actions"
                >
                  <MoreVertical size={16} strokeWidth={1.8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="min-w-[220px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
                >
                  {row.menu.map((item) => (
                    <DropdownMenu.Item
                      key={item.id}
                      onSelect={() => {
                        if (item.action.kind === "command") {
                          run(item.action.command, item.action.payload);
                        } else if (typeof window !== "undefined") {
                          window.location.assign(item.action.href);
                        }
                      }}
                      className={cn(
                        "px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px]",
                        "hover:bg-ink/[0.04] cursor-pointer outline-none",
                        item.destructive ? "text-danger" : "text-ink",
                      )}
                    >
                      {item.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

// Three leading treatments, in priority order: an icon tile, guest-style
// initials, or the gradient placeholder the events list uses for covers.
function Leading({ row }: { row: EntityRow }) {
  if (row.icon) {
    return (
      <div
        className="hidden sm:flex w-14 h-14 rounded-[14px] shrink-0 items-center justify-center bg-violet-soft text-violet-deep"
        aria-hidden
      >
        <Icon name={row.icon} size={20} strokeWidth={1.7} />
      </div>
    );
  }

  if (row.initials) {
    return (
      <div
        className="hidden sm:flex w-14 h-14 rounded-[14px] shrink-0 items-center justify-center bg-violet-soft text-violet-deep font-bold text-[15px]"
        aria-hidden
      >
        {row.initials.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="hidden sm:block w-20 h-20 rounded-chip shrink-0 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--color-violet-soft), var(--color-tint-sky))",
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--color-violet) 35%, transparent), transparent 70%)",
        }}
      />
    </div>
  );
}
