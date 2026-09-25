"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

// The count-badged filter row with the sliding violet underline.
//
// Four copies of this existed — /events, /promo-codes, the `entity-list`
// block and a fourth inside the audiences view — and three of them were
// character-identical. This is the surviving one.
//
// Distinct from `ui/Tabs`: `Tabs` owns its panels and is for navigating
// between *views*; `FilterTabs` is a controlled segmented control that
// narrows one list and renders no content of its own.
export interface FilterTabDef<Id extends string = string> {
  id: Id;
  label: string;
  /** Omit to render the tab without a count badge. */
  count?: number;
}

export function FilterTabs<Id extends string>({
  tabs,
  value,
  onChange,
  /** Must be unique per mounted instance — it drives the shared layout
      animation, and two rows sharing an id will fight over the underline. */
  layoutId,
  className,
}: {
  tabs: readonly FilterTabDef<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "border-b border-line-soft overflow-x-auto scroll-thin",
        className,
      )}
    >
      <div className="flex gap-1 min-w-max">
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                active ? "text-ink" : "text-ink-mute hover:text-ink",
              )}
            >
              {tab.label}
              {typeof tab.count === "number" ? (
                <span
                  className={cn(
                    "ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] rounded-full num",
                    active ? "bg-ink text-canvas" : "bg-ink/[0.06] text-ink-soft",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
              {active ? (
                <motion.span
                  layoutId={layoutId}
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-violet rounded-full"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
