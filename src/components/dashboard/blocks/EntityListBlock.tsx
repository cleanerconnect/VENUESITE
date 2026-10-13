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
  // Seeded from the spec so a link can choose the tab, and only where
  // that tab exists: `?filtre=` is user input, and a value no tab
  // answers to would select nothing and show an empty list.
  const [tab, setTab] = useState(
    block.tabs?.some((t) => t.id === block.initialTab)
      ? (block.initialTab as string)
      : (block.tabs?.[0]?.id ?? ""),
  );
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
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-3",
            // 12px rather than 16 above a book: the tabs and the first
            // sitting are the same act of choosing where to look, and
            // the screen is paying for every band above the rows.
            block.coverUnit ? "mb-3" : "mb-4",
          )}
        >
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
          <SlotGroups rows={rows} coverUnit={block.coverUnit} />
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
function SlotGroups({
  rows,
  coverUnit,
}: {
  rows: EntityRow[];
  coverUnit?: { one: string; many: string };
}) {
  const groups: { slot: string | null; rows: EntityRow[] }[] = [];
  for (const row of rows) {
    const slot = row.slot ?? null;
    const last = groups[groups.length - 1];
    if (last && last.slot === slot) last.rows.push(row);
    else groups.push({ slot, rows: [row] });
  }

  // One card per booking, in runs under a band.
  //
  // The sittings used to live inside a single bordered block — the hour
  // a rule across it, the bookings lines under the rule, one hairline
  // between each. That was the page of a paper book, and it was chosen
  // for a measured reason: the gaps between twenty-six cards are 12px
  // each, which is 300px of a 900px screen spent on separation.
  //
  // The review asked for the card back, and the trade is the trade: a
  // booking is now a thing you can point at, with its own edge, its own
  // state band and room for the note — and fewer of them fit on a
  // screen. What the card does *not* get back is the chrome that made
  // the first version expensive: no shadow, no lift, no 20px radius, no
  // 32px of padding. 12px of radius, one hairline, 16px of padding.
  const host = Boolean(rows[0]?.lead);
  if (host) {
    return (
      <div>
        {groups.map((group, i) => (
          <div key={`${group.slot ?? "_"}-${i}`}>
            {group.slot ? (
              <SlotHead
                slot={group.slot}
                covers={group.rows.reduce((n, r) => n + (r.covers ?? 0), 0)}
                unit={coverUnit}
                first={i === 0}
              />
            ) : null}
            {/* 12px between cards, and nothing else between them: the
                edge of a card is already a separator, and a rule as
                well would be two. */}
            <div className="flex flex-col gap-3">
              {group.rows.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </div>
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

/**
 * A sitting's band: the hour on the left, what the sitting is worth on
 * the right.
 *
 * 32px of canvas-2, 15px semibold, both halves in the ink at 70 % —
 * the review's measurements. It is a landmark between runs of cards
 * rather than a rule inside a block, which is why it has a background
 * now and no hairline: a band on a tint does not need a line as well.
 *
 * The covers rather than the tables, as before: a table of two and a
 * table of eight are not the same sitting, and « 6 couverts » beside
 * the hour is the load that reading the cards cannot give without
 * being added up by eye.
 *
 * 24px above and 8px below — except above the first, where there are no
 * cards to separate it from and the block's own margin has already
 * done the work.
 */
function SlotHead({
  slot,
  covers,
  unit,
  first,
}: {
  slot: string;
  covers: number;
  unit?: { one: string; many: string };
  first: boolean;
}) {
  return (
    <div
      // A stable hook for the tape measure: `tools/verify` counts these
      // and checks their height and their spacing.
      data-slot-head=""
      className={cn(
        "flex h-8 items-center justify-between gap-3 bg-canvas-2 px-4 mb-2",
        first ? "" : "mt-6",
      )}
    >
      <span className="text-host-slot num">{slot}</span>
      {covers > 0 && unit ? (
        <span className="text-host-detail num shrink-0">
          {covers} {covers > 1 ? unit.many : unit.one}
        </span>
      ) : null}
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

  // What the line offers at 390. See `onPhone` in the spec.
  const phoneActions = (row.actions ?? []).filter((a) => a.onPhone !== "sheet");

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


  // ── The three lines of a card ──
  //
  // Written out rather than bent out of the Lot 2 row, because the two
  // want different orders: the Lot 2 card leads with its title, and a
  // booking leads with its hour.
  //
  // One · when, how many, who. The hour and the covers at 22px because
  // they decide what happens in the next ten minutes; the name at 17px
  // beside them because it is what a host says out loud, and a step
  // under so it follows rather than competes.
  //
  // Two · the telephone, the zone and how the booking arrived, at 14px
  // in the ink at 70 %. Its own line at every width now. It used to
  // hop onto the first line above 1280 and drop under the name below
  // it, because the line had to hold the decisions too; the card's
  // decisions are in their own column, so the context keeps one line
  // at 390, at 768 and at 1440 and the rule is the same everywhere.
  //
  // Three · the note, when there is one, in violet with its icon. It
  // is the one field that can say « allergy », so it is never
  // truncated, never hidden, and never tucked against the name: 8px of
  // air above it, which is what « never squeezed » costs.
  //
  // The state keeps its word on the first line, after the name, at the
  // meta step in its own tone. The band down the left edge says the
  // same thing in colour, and colour alone is not a statement — a host
  // reading a sunlit screen, or anybody who does not separate green
  // from amber, needs the word. It is 13px rather than the 16px it was
  // on the old line: beside a 17px name, a 16px state read as a second
  // name.
  const hostLine = row.lead ? (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-host-lead text-ink">{row.lead.time}</span>
        <span className="text-host-lead text-ink/70" aria-hidden>
          ·
        </span>
        <span className="text-host-lead text-ink/70">{row.lead.party}</span>

        <h4 className="text-host-name text-ink min-w-0 truncate">
          {row.title}
        </h4>

        {row.status ? (
          <span
            className={cn(
              "text-meta font-semibold shrink-0",
              STATUS_BAND[row.status.tone].text,
            )}
          >
            {row.status.label}
          </span>
        ) : null}

        {/* The state is the band and the word; a second pill saying the
            same thing is not drawn. Anything else the spec attaches
            still shows. */}
        {row.badges?.slice(1).map((badge, i) => (
          <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
        ))}
      </div>

      {row.meta ? (
        <div className="text-host-detail num mt-1 truncate">{row.meta}</div>
      ) : null}

      {row.signal ? (
        <div className="mt-2 flex items-start gap-2 text-violet-deep">
          <Icon
            name={row.signal.icon ?? "sparkles"}
            size={16}
            strokeWidth={2}
            className="mt-[2px] shrink-0"
          />
          <span className="text-meta font-medium">{row.signal.text}</span>
        </div>
      ) : null}
    </>
  ) : null;

  // ── The card ──
  //
  // White, 12px of radius, one hairline of ink at 10 %, 16px of
  // padding, and the state band inside the left edge — the review's
  // measurements, written here because they are the contract and not a
  // preference.
  //
  // `overflow-hidden` is what puts the band *inside* the edge: the band
  // is positioned against the padding box, so it starts just inside the
  // hairline, and the radius clips its corners into the card's own.
  //
  // What the card deliberately does not have: a shadow, a lift on
  // hover, and the 20px radius of its first version. The hover
  // affordance is a background tint — a card that opens a sheet has to
  // say so, and a state is not an animation.
  //
  // Everywhere else the row keeps the Lot 2 card it always had.
  return (
    <div className={host ? "" : "transition-shadow"}>
      <div
        className={cn(
          "relative overflow-hidden",
          host
            ? "bg-surface border border-ink/10 rounded-[12px] hover:bg-canvas-2"
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

            `items-center` is the review's « vertically centred »: the
            decisions sit on the middle of the card, whether the card is
            two lines tall or three. Below 768 they move under it, where
            a thumb can reach them — see the block after this one. */}
        <div className="flex items-center">
          {row.detail ? (
            <button
              type="button"
              // A stable hook for the capture tool: it has to open a row
              // to photograph the detail sheet, and a selector written
              // out of Tailwind classes silently stops matching the day
              // the row's layout changes.
              data-row="open"
              // Opts the card's own open-the-sheet region out of the
              // 44px control floor — see the note in `globals.css`. It
              // is a region the width of the card, sized by its type
              // and its padding, not a target in a row of targets.
              data-book-line={host ? "" : undefined}
              onClick={() => row.detail && openDetail(row.detail)}
              className={cn(
                "flex-1 min-w-0 text-left p-4",
                // 16px from the band, not from the card's edge: the
                // band takes 6px of the left inset, so the text starts
                // at 22 and reads as 16 from the thing beside it.
                row.status && "pl-[22px]",
              )}
            >
              {host ? hostLine : inner}
            </button>
          ) : row.href ? (
            <Link
              href={row.href}
              data-row="open"
              className={cn("flex-1 min-w-0 p-4", row.status && "pl-[22px]")}
            >
              {host ? hostLine : inner}
            </Link>
          ) : (
            <div className={cn("flex-1 min-w-0 p-4", row.status && "pl-[22px]")}>
              {host ? hostLine : inner}
            </div>
          )}

          {/* Right-aligned and vertically centred, from 768 up.
              `shrink-0` and `whitespace-nowrap` on every control are
              what make « the same width per label across all rows »
              true rather than likely: a button sized by its own label
              and never squeezed by its neighbours comes out the same
              width in every card that carries that label, whether that
              card holds two decisions or four.
              `tools/verify/decisions.mjs` measures it. */}
          {row.actions?.length ? (
            <div className="hidden md:flex items-center justify-end gap-2 shrink-0 pl-3 pr-4">
              {row.actions.map((cta, i) => (
                <ActionControl
                  key={`${cta.action.label}-${i}`}
                  cta={cta}
                  size="sm"
                  compact={host}
                  className="shrink-0 whitespace-nowrap"
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Phone only. On a wide screen the same buttons sit on the
            row's right, inside `inner` — see the note there.

            Not all of them: an action marked `onPhone: "sheet"` is left
            off here, because two 44px targets are what a 358px line
            holds without wrapping, and four made the line 200px tall.
            The spec is responsible for putting those actions in the
            row's detail sheet — this only hides them. */}
        {phoneActions.length ? (
          <div
            className={cn(
              "md:hidden flex flex-wrap gap-2 px-4 pb-4",
              row.status && "pl-[22px]",
            )}
          >
            {phoneActions.map((cta, i) => (
              <ActionControl
                key={`${cta.action.label}-${i}`}
                cta={cta}
                size="sm"
                // 40px, the same height as the lane above: the only
                // thing 390 changes is where the decisions sit, not how
                // big they are.
                compact={host}
                // Half the lane, each of them, however many there are.
                //
                // They were `flex-1`, which is why a card with one
                // decision drew it 318px wide and a card with two drew
                // them at 155 — the same label at two widths, which is
                // exactly what « the same width per label across all
                // rows » rules out. A fixed half-lane basis gives every
                // decision on every card the same 151px, and two per
                // line, which is also the most a 358px lane holds
                // without a button becoming a slot.
                className="basis-[calc(50%-0.25rem)] grow-0 shrink-0 md:basis-auto justify-center"
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
