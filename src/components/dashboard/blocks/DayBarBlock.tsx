"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { DayBarBlock as Spec } from "@/lib/dashboard/spec";
import { useCommandRunner } from "../commands";
import { cn } from "@/lib/utils/cn";

// The day, as a page-turn rather than a form.
//
// Everything here acts on one value — which day the book below is
// showing — so it is one row: back, the day itself, forward, a picker,
// and the day's services as tabs. The settings card this replaced asked
// a host to read two labelled rows and four footer buttons to do the
// same thing.
//
// The picker shows a calendar and no text: a native date input formats
// its own value from the browser's locale rather than the page's, so on
// a French portal it renders `09/25/2026` beside a day already spelled
// "vendredi 25 septembre".

const shift = (date: string, by: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export function DayBarBlock({ block }: { block: Spec }) {
  const run = useCommandRunner();
  const go = (value: string) => run(block.command, { value });

  const step =
    "h-11 w-11 shrink-0 rounded-[var(--radius-sm)] border border-line bg-surface " +
    "flex items-center justify-center text-ink hover:border-ink/40 transition-colors";

  // No card around it.
  //
  // This is a toolbar acting on one value, and a card is for grouping
  // things that belong together — it was a border and 32px of padding
  // around a strip of controls, about 135px of a 900px screen spent
  // before the first booking. The services sit on the same line as the
  // day on a wide screen for the same reason.
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(shift(block.value, -1))}
          aria-label="Jour précédent"
          title="Jour précédent"
          className={step}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>

        <div className="min-w-0">
          <div className="text-h3 text-ink truncate">{block.label}</div>
          {block.hint ? (
            <div className="text-meta text-ink-mute">{block.hint}</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => go(shift(block.value, 1))}
          aria-label="Jour suivant"
          title="Jour suivant"
          className={step}
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>

        <label className={cn(step, "relative cursor-pointer")}>
          <Calendar size={20} strokeWidth={2} aria-hidden />
          <span className="sr-only">Choisir une date</span>
          <input
            type="date"
            value={block.value}
            min={block.min}
            max={block.max}
            onChange={(e) => e.target.value && go(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>

      {/* The day's services. One service is a statement, not a choice,
          so it is not drawn as a pair of tabs with nothing to switch to. */}
      {block.services.length > 1 ? (
        <div className="flex gap-2 flex-wrap">
          {block.services.map((s) => {
            const active = s.id === block.activeServiceId;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => run(block.serviceCommand, { value: s.id })}
                className={cn(
                  "h-11 px-4 rounded-[var(--radius-sm)] border text-control-md font-semibold transition-colors",
                  active
                    ? "border-ink bg-violet-soft text-ink"
                    : "border-line bg-surface text-ink-soft hover:border-ink/40",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
