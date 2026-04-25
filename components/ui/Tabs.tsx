"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function Tabs({
  tabs,
  defaultId,
}: {
  tabs: TabDef[];
  defaultId?: string;
}) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Slide an underline pill under the active tab — refined Linear-style.
  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab="${active}"]`,
    );
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active]);

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        className="relative flex gap-1 border-b border-line overflow-x-auto scroll-thin"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              data-tab={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={[
                "relative px-3.5 py-3 text-[13px] whitespace-nowrap transition-colors",
                isActive ? "text-ink font-semibold" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {t.label}
              {typeof t.count === "number" ? (
                <span
                  className={[
                    "ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[11px] rounded num",
                    isActive
                      ? "bg-ink text-white"
                      : "bg-ink/5 text-muted",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="absolute bottom-0 h-[2px] bg-ink transition-all duration-300 ease-out-expo"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
      <div className="mt-6 fade-up">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
