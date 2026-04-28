"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

// Tabs with sliding gold underline indicator. Content cross-fades between
// tabs over 200ms.
export interface TabDef {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function Tabs({
  tabs,
  defaultId,
  className,
}: {
  tabs: TabDef[];
  defaultId?: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-tabid="${active}"]`,
    );
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active]);

  return (
    <RadixTabs.Root
      value={active}
      onValueChange={setActive}
      className={className}
    >
      <div
        ref={listRef}
        className="relative border-b border-line-soft overflow-x-auto scroll-thin no-print"
      >
        <RadixTabs.List className="inline-flex gap-1 min-w-max">
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <RadixTabs.Trigger
                key={t.id}
                value={t.id}
                data-tabid={t.id}
                className={cn(
                  "relative px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                  isActive
                    ? "text-ink"
                    : "text-ink-mute hover:text-ink",
                )}
              >
                {t.label}
                {typeof t.count === "number" ? (
                  <span
                    className={cn(
                      "ml-2 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] rounded-full num",
                      isActive
                        ? "bg-ink text-canvas"
                        : "bg-ink/[0.06] text-ink-soft",
                    )}
                  >
                    {t.count}
                  </span>
                ) : null}
              </RadixTabs.Trigger>
            );
          })}
        </RadixTabs.List>
        <motion.span
          aria-hidden
          className="absolute bottom-0 h-[2px] bg-violet rounded-full"
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {tabs.map((t) => (
        <RadixTabs.Content key={t.id} value={t.id} className="mt-6 outline-none">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.content}
          </motion.div>
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
