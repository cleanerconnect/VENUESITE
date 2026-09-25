"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import type { EntityListBlock as Spec, EntityRow } from "@/lib/dashboard/spec";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { COPY } from "@/lib/copy/fr";
import { useDetailStore } from "@/lib/stores/detail";
import { useSearchStore } from "@/lib/stores/search";
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
  // The query comes from the chrome's box, which this block claims on
  // mount. Two search fields on one screen — a stub above and a real one
  // in the card — made the host guess which one did the work.
  const query = useSearchStore((s) => s.query);
  const claim = useSearchStore((s) => s.claim);
  const release = useSearchStore((s) => s.release);
  const placeholder = block.search?.placeholder;
  useEffect(() => {
    if (!placeholder) return;
    claim(placeholder);
    return () => release();
  }, [placeholder, claim, release]);
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

  // The search box is the chrome's now, so only a sort control still
  // needs a row of its own here.
  const hasControls = Boolean(block.sorts?.length);
  const filteredToNothing = block.rows.length > 0 && rows.length === 0;

  // One control, rendered once and placed by whoever has room for it.
  const sortControl = hasControls ? (
    <>

          {/* The select used to carry its name in `aria-label` alone, so
              a sighted user read "Heure" in a box and had to work out
              that it was a sort order and not a filter. */}
          {block.sorts?.length ? (
            <label className="flex items-center gap-2 shrink-0">
              <span className="text-meta text-ink-soft whitespace-nowrap">
                Trier par
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-12 px-4 pr-10 bg-surface border border-line rounded-[var(--radius-sm)] text-body focus:outline-none focus:border-ink transition-colors appearance-none"
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
    </>
  ) : null;

  return (
    <section>
      {block.heading ? (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-ink">{block.heading}</h2>
            {block.subheading ? (
              <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
            ) : null}
          </div>
          {/* The sort control and the heading action wrap against each
              other too: together they are wider than 390, and a row
              that only wraps against the heading still overflows. */}
          <div className="flex flex-wrap items-center gap-3 max-w-full">
            {sortControl}
            {block.headingAction ? (
              <ActionLink action={block.headingAction} />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* A list with no heading hangs its sort on the tabs' line.
          It used to get a row of its own — 40px of control and 16px of
          gap to hold one select — and the tabs took another. They act
          on the same list, so they share a line: filters on the left,
          the order on the right. */}
      {block.tabs?.length || (!block.heading && sortControl) ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {block.tabs?.length ? (
            <FilterTabs
              layoutId={`entity-list-underline-${block.id}`}
              value={tab}
              onChange={setTab}
              tabs={block.tabs.map((t) => ({
                id: t.id,
                label: t.label,
                count: counts[t.id] ?? 0,
              }))}
            />
          ) : (
            <span />
          )}
          {!block.heading && sortControl ? sortControl : null}
        </div>
      ) : null}

      {block.collapsible && !expanded && block.rows.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between gap-3 bg-canvas-2 border border-line rounded-[var(--radius-lg)] px-4 py-3 text-left hover:border-ink/30 transition-colors"
        >
          <span className="text-body font-semibold text-ink">
            {block.collapsible.summary}
          </span>
          <span className="text-meta text-ink-soft font-semibold shrink-0">
            Afficher
          </span>
        </button>
      ) : block.collapsible && block.rows.length === 0 ? (
        <div className="bg-canvas-2 border border-line rounded-[var(--radius-lg)] px-4 py-3 text-body font-semibold text-ink-soft">
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

  // One book, not a stack of cards.
  //
  // Under host density the sittings live inside a single bordered
  // block: the hour is a band across it, the bookings are lines under
  // the band, and one rule separates each from the next. That is the
  // page of a paper book, and it is also what makes a service fit on a
  // screen — the gaps between twenty-six cards were 12px each and the
  // borders 2px, which is 360px of a 900px screen spent on separation.
  const host = Boolean(rows[0]?.lead);
  if (host) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        {/* No hour band.
            It said « 21H00 » across the page and the line directly
            under it opened with « 21h00 » in the largest type on the
            screen: the same fact twice, 36px apart. It made sense while
            a booking was a card with its time stacked inside it and the
            page needed landmarks; it stopped making sense the moment
            the times became a column of tabular figures a host reads
            straight down. Six bands cost 216px of a 900px screen —
            about four bookings — on the one screen whose whole job is
            how many bookings you can see.

            What is lost with it is the per-sitting count, « 2 tables ».
            Nothing in Lot 1 buys a load reading (that is Pilotage,
            Prio 08), the grouping itself survives — the rows are still
            ordered and grouped by sitting — and the count of the whole
            service is on the filter tabs above. */}
        {groups.map((group, i) => (
          <div key={`${group.slot ?? "_"}-${i}`}>
            {group.rows.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </div>
        ))}
      </div>
    );
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

  // The Lot 2 card row, unchanged: a card stacks its facts, and every
  // other list on the platform — events, tables, menu items — reads
  // that way.
  const inner = (
    <div className="flex items-center gap-4">
      <Leading row={row} />


      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-h3 text-ink truncate">{row.title}</h4>
          {row.badges?.map((badge, i) => (
            <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
          ))}
        </div>

        {row.meta ? (
          <div className="mt-1 num text-meta text-ink-mute">{row.meta}</div>
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
          <div className="mt-3 inline-flex items-start gap-2 max-w-full bg-violet-soft text-violet-deep rounded-[var(--radius-sm)] px-2 py-1">
            <Icon
              name={row.signal.icon ?? "sparkles"}
              size={16}
              strokeWidth={1.9}
              className="shrink-0 mt-[1px]"
            />
            <span className="text-meta leading-snug font-medium truncate">
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


  // ── The host line ──
  //
  // Written out rather than bent out of the Lot 2 row, because the two
  // want opposite things: a card stacks its facts, a line in a book
  // puts them on one baseline and lets the least important one give up
  // its width first.
  //
  // Order left to right is the order a host reads: when (22px, the
  // largest type on the screen), who (18px), what state (16px, in its
  // tone), then the context they only need if they are about to ring
  // the guest (13px, and the first thing to truncate).
  //
  // A note is the exception that earns a second line. It is the one
  // field that can say « allergy », so it is never truncated and never
  // hidden — the lines that carry one are taller than the lines that
  // do not, which is the right way round.
  const hostLine = row.lead ? (
    <>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 md:flex-nowrap">
        <div className="flex shrink-0 items-baseline gap-2 md:w-[188px]">
          <span className="text-host-lead text-ink">{row.lead.time}</span>
          <span className="text-host-lead text-ink/70" aria-hidden>·</span>
          <span className="text-host-lead text-ink/70">{row.lead.party}</span>
        </div>

        <h4 className="text-host-name text-ink truncate shrink-0 max-w-[13rem]">
          {row.title}
        </h4>

        {row.status ? (
          <span
            className={cn(
              "text-body font-semibold shrink-0",
              STATUS_BAND[row.status.tone].text,
            )}
          >
            {row.status.label}
          </span>
        ) : null}

        {row.meta ? (
          <div className="text-host-detail num min-w-0 flex-1 truncate">
            {row.meta}
          </div>
        ) : null}

        {/* The state is the band and the word; a second pill saying the
            same thing is not drawn. Anything else the spec attaches
            still shows. */}
        {row.badges?.slice(1).map((badge, i) => (
          <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
        ))}
      </div>

      {/* The note, on the second line it earns.
          A marker rather than a chip: the violet fill and the 8px of
          padding made it a small card inside a line, and a line in a
          book does not contain cards. The rule down its left says « this
          belongs to the booking above »; the words are the point. */}
      {row.signal ? (
        <div className="mt-1 flex items-start gap-2 border-l-2 border-violet pl-2 text-violet-deep">
          <Icon
            name={row.signal.icon ?? "sparkles"}
            size={16}
            strokeWidth={2}
            className="mt-[1px] shrink-0"
          />
          <span className="text-meta font-medium">{row.signal.text}</span>
        </div>
      ) : null}
    </>
  ) : null;

  // ── A line in a book, or a card ──
  //
  // Under host density a booking is a *line*: no border of its own, no
  // radius, no shadow, no lift on hover — separated from the next one
  // by a single rule, the way a paper reservation book separates two
  // sittings. Twenty-six bookings used to be twenty-six cards, each
  // with a 20px radius and a shadow that grew on hover, and a card is
  // for grouping things that belong together, not for decorating a
  // list. The card chrome also cost 12px of gap and 32px of padding
  // per booking, which is most of the reason a service did not fit on
  // a screen.
  //
  // The hover affordance stays — a line that opens a sheet has to say
  // so — as a background tint, which is a state and not an animation.
  //
  // Everywhere else the row keeps the card it always had.
  return (
    <div className={host ? "" : "transition-shadow"}>
      <div
        className={cn(
          "relative overflow-hidden",
          host
            ? "bg-surface border-b border-line last:border-b-0 hover:bg-canvas-2"
            : "bg-surface border border-line rounded-[var(--radius-lg)] hover:shadow-soft",
        )}
        data-book-row={host ? "" : undefined}
      >
        {row.status ? (
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[6px]",
              STATUS_BAND[row.status.tone].bar,
            )}
          />
        ) : null}
        {/* The clickable region and the decisions sit side by side rather
            than nested: the region is a <button> when it opens a sheet,
            and a button inside a button is invalid HTML that React
            refuses to hydrate.

            The decisions are on the right, level with the time and the
            covers, so a booking is one line tall. Stacked under the row
            they cost ~60px each, and a service of fifteen ran to nearly
            three screens of scrolling to reach the last sitting. Below
            the breakpoint they move under the row, where a thumb can
            reach them — see the block after this one. */}
        <div className="flex items-center">
          {row.detail ? (
            <button
              type="button"
              // A stable hook for the capture tool: it has to open a row
              // to photograph the detail sheet, and a selector written
              // out of Tailwind classes silently stops matching the day
              // the row's layout changes.
              data-row="open"
              onClick={() => row.detail && openDetail(row.detail)}
              className={cn(
                "flex-1 min-w-0 text-left",
                host ? "px-4 py-2" : "p-4",
                row.status && "pl-6",
              )}
            >
              {host ? hostLine : inner}
            </button>
          ) : row.href ? (
            <Link
              href={row.href}
              data-row="open"
              className={cn("flex-1 min-w-0", host ? "px-4 py-2" : "p-4", row.status && "pl-6")}
            >
              {host ? hostLine : inner}
            </Link>
          ) : (
            <div className={cn("flex-1 min-w-0", host ? "px-4 py-2" : "p-4", row.status && "pl-6")}>
              {host ? hostLine : inner}
            </div>
          )}

          {row.actions?.length ? (
            <div className="hidden md:flex items-center gap-2 shrink-0 pl-3 pr-4">
              {row.actions.map((cta, i) => (
                <ActionControl
                  key={`${cta.action.label}-${i}`}
                  cta={cta}
                  size="sm"
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Phone only. On a wide screen the same buttons sit on the
            row's right, inside `inner` — see the note there. */}
        {row.actions?.length ? (
          <div className={cn("md:hidden flex flex-wrap gap-2 px-4 pb-4 -mt-1", row.status && "pl-6")}>
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
                  <MoreVertical size={16} strokeWidth={2} />
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
                        "px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-meta",
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
    </div>
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
        <Icon name={row.icon} size={20} strokeWidth={2} />
      </div>
    );
  }

  if (row.initials) {
    return (
      <div
        className="hidden sm:flex w-14 h-14 rounded-[14px] shrink-0 items-center justify-center bg-violet-soft text-violet-deep font-bold text-body"
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
