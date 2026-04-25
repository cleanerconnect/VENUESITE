"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function Tabs({ tabs, defaultId }: { tabs: TabDef[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  return (
    <div>
      <div
        role="tablist"
        className="flex gap-6 border-b border-line overflow-x-auto scroll-thin"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={[
                "py-3 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors",
                isActive
                  ? "border-ink text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink",
              ].join(" ")}
            >
              {t.label}
              {typeof t.count === "number" ? (
                <span className="ml-2 text-xs text-muted num">({t.count})</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
