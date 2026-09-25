"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { CalendarBlock as Spec, CalendarCell } from "@/lib/dashboard/spec";
import { ActionLink, Icon } from "../primitives";
import { useCommandRunner } from "../commands";
import { cn } from "@/lib/utils/cn";

// Load across days, as a week strip or a month grid.
//
// Deliberately not a chart. The question a manager brings here is "what
// is Friday like, and can I close Monday" — both of which need a day you
// can click and act on, which a series of bars cannot offer.
//
// One cell list feeds both views, so the week and the month can never
// disagree about what a Tuesday holds.

const WEEKDAY = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

/** ISO weekday, 1 = Monday, from a YYYY-MM-DD string. */
function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

const MONTH_LABEL = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export function CalendarBlock({ block }: { block: Spec }) {
  const [view, setView] = useState<"week" | "month">(block.view ?? "week");
  const [page, setPage] = useState(0);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const cells = block.cells;

  // The window the current page shows. Weeks step seven days; months
  // step by calendar month, both anchored on the day containing today so
  // page 0 is always "now" rather than the start of the dataset.
  const pages = useMemo(() => buildPages(cells, view, today), [cells, view, today]);
  const clamped = Math.min(Math.max(page, 0), Math.max(0, pages.length - 1));
  const current = pages[clamped];

  if (cells.length === 0) {
    return (
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink">{block.heading}</h2>
        <div className="py-10 text-center">
          <Icon
            name={block.empty?.icon ?? "calendar"}
            size={22}
            className="mx-auto text-ink-mute"
          />
          <p className="text-h3 text-ink mt-3">
            {block.empty?.title ?? "Rien à afficher"}
          </p>
          {block.empty?.body ? (
            <p className="text-meta text-ink-mute mt-1">{block.empty.body}</p>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card variant="surface" size="md">
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-h3 text-ink">{block.heading}</h2>
          {block.subheading ? (
            <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
          ) : null}
        </div>
        {block.headingAction ? <ActionLink action={block.headingAction} /> : null}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-[var(--radius-sm)] border border-line overflow-hidden">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setPage(0);
              }}
              className={cn(
                "px-3 h-9 text-[13px] font-semibold transition-colors",
                view === v ? "bg-ink text-on-ink" : "bg-surface text-ink-mute hover:text-ink",
              )}
            >
              {v === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <PageButton
            label="Période précédente"
            disabled={clamped === 0}
            onClick={() => setPage(clamped - 1)}
            glyph="‹"
          />
          <span className="text-meta text-ink num min-w-[9rem] text-center">
            {current ? MONTH_LABEL(current.cells[0]?.date ?? today) : ""}
          </span>
          <PageButton
            label="Période suivante"
            disabled={clamped >= pages.length - 1}
            onClick={() => setPage(clamped + 1)}
            glyph="›"
          />
        </div>
      </div>

      {/* Scrolls inside itself: seven columns do not fit a 360px phone,
          and the page body must never scroll sideways. */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAY.map((d) => (
              <div
                key={d}
                className="text-eyebrow text-ink-mute text-center uppercase tracking-[0.08em]"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {current?.leading.map((i) => (
              <div key={`pad-${i}`} aria-hidden className="min-h-[92px]" />
            ))}
            {current?.cells.map((cell) => (
              <Day
                key={cell.date}
                cell={cell}
                unitLabel={block.unitLabel}
                today={cell.date === today}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PageButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-9 w-9 rounded-full border border-line text-ink flex items-center justify-center",
        "transition-colors hover:border-ink disabled:opacity-35 disabled:hover:border-line",
      )}
    >
      <span aria-hidden className="text-[17px] leading-none">
        {glyph}
      </span>
    </button>
  );
}

function Day({
  cell,
  unitLabel,
  today,
}: {
  cell: CalendarCell;
  unitLabel: string;
  today: boolean;
}) {
  const run = useCommandRunner();
  const fill = cell.capacity > 0 ? Math.min(1, cell.value / cell.capacity) : 0;
  // Over capacity is worth seeing before it happens, so the bar changes
  // colour rather than clipping silently at 100 %.
  const over = cell.capacity > 0 && cell.value > cell.capacity;
  const dayNumber = Number(cell.date.slice(8, 10));

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-1">
        <span
          className={cn(
            "text-[13px] font-bold num",
            cell.closed ? "text-ink-mute" : "text-ink",
          )}
        >
          {dayNumber}
        </span>
        {!cell.closed ? (
          <span className="text-[11px] text-ink-mute num">
            {cell.value}
            <span className="text-ink-mute/60">/{cell.capacity}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-ink/[0.07] overflow-hidden">
        {cell.closed ? (
          <div className="h-full w-full bg-[repeating-linear-gradient(45deg,var(--color-ink-mute)_0_2px,transparent_2px_5px)] opacity-40" />
        ) : (
          <div
            className={cn("h-full rounded-full", over ? "bg-peach-deep" : "bg-violet")}
            style={{ width: `${Math.max(fill * 100, cell.value > 0 ? 6 : 0)}%` }}
          />
        )}
      </div>

      {cell.markers?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {cell.markers.slice(0, 3).map((m, i) => (
            <span
              key={`${m.label}-${i}`}
              title={m.label}
              className="inline-flex items-center gap-1 rounded-full bg-ink/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-ink-mute"
            >
              {m.icon ? <Icon name={m.icon} size={9} strokeWidth={2.2} /> : null}
              <span className="max-w-[5.5rem] truncate">{m.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  const shell = cn(
    "relative block min-h-[92px] w-full text-left rounded-[var(--radius-sm)] border p-2 transition-colors",
    cell.closed ? "bg-canvas-2 border-line" : "bg-surface border-line hover:border-ink",
    (cell.highlight || today) && "ring-2 ring-violet/45",
  );

  return (
    <div className="relative">
      {cell.href ? (
        <Link href={cell.href} className={shell}>
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}

      {cell.menu?.length ? (
        <div className="absolute top-1 right-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="h-6 w-6 rounded-full hover:bg-ink/[0.06] flex items-center justify-center text-ink-mute"
                aria-label={`Actions du ${cell.date}`}
              >
                <MoreVertical size={13} strokeWidth={1.8} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[190px] rounded-[var(--radius-sm)] border border-line bg-surface p-1 shadow-soft"
              >
                {cell.menu.map((item) => (
                  <DropdownMenu.Item
                    key={item.id}
                    onSelect={() => {
                      if (item.action.kind === "command") {
                        run(item.action.command, item.action.payload);
                      }
                    }}
                    className={cn(
                      "cursor-pointer rounded-[6px] px-2.5 py-2 text-[13px] outline-none",
                      "data-[highlighted]:bg-ink/[0.05]",
                      item.destructive ? "text-danger" : "text-ink",
                    )}
                    asChild={item.action.kind === "link"}
                  >
                    {item.action.kind === "link" ? (
                      <Link href={item.action.href}>{item.label}</Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      ) : null}
    </div>
  );
}

interface Page {
  /** Blank cells before the first day, so a month starts on its weekday. */
  leading: number[];
  cells: CalendarCell[];
}

/**
 * Slices the cell list into weeks or months.
 *
 * Anchored on the page containing today, so page 0 is always "now"
 * rather than wherever the dataset happens to begin.
 */
function buildPages(
  cells: CalendarCell[],
  view: "week" | "month",
  today: string,
): Page[] {
  if (cells.length === 0) return [];

  const groups = new Map<string, CalendarCell[]>();
  for (const cell of cells) {
    const key =
      view === "month" ? cell.date.slice(0, 7) : weekKey(cell.date);
    groups.set(key, [...(groups.get(key) ?? []), cell]);
  }

  const ordered = [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const anchorKey = view === "month" ? today.slice(0, 7) : weekKey(today);
  const anchor = ordered.findIndex(([key]) => key === anchorKey);
  const from = anchor >= 0 ? anchor : 0;

  return ordered.slice(from).map(([, group]) => ({
    leading: Array.from({ length: isoWeekday(group[0].date) - 1 }, (_, i) => i),
    cells: group,
  }));
}

/** The Monday of the week a date falls in, as a sortable key. */
function weekKey(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (isoWeekday(date) - 1));
  return d.toISOString().slice(0, 10);
}
