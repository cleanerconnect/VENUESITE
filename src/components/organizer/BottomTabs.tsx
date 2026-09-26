"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Icon } from "@/components/dashboard/primitives";
import { isActive, itemsInLot, resolveWorkspace } from "@/lib/nav/workspaces";
import { useWorkspaceAccess } from "@/lib/auth/workspace-access";
import { useChromeCommand } from "@/lib/nav/chrome-commands";
import { cn } from "@/lib/utils/cn";

// Five-tab mobile nav with one elevated centre button. Which five, and
// which one is raised, comes from the active workspace — both raise
// door duty: the scanner on events, the arrivals sheet on venues.
//
// A tab either navigates or fires a command. The raised one is usually a
// command: a host checking a guest in should not lose their place on the
// screen behind the sheet.
//
// Hidden on routes that take over the full screen (/scanner, …).

const FULLSCREEN_ROUTES = [
  "/scanner",
  "/scanner-fullscreen",
  "/onboarding",
];

export function BottomTabs() {
  const pathname = usePathname();
  const workspace = resolveWorkspace(pathname);
  // A tab bar with a dead tab is worse than a shorter tab bar: under
  // Lot 1 the queue is not registered, so it is not offered.
  const { lot } = useWorkspaceAccess();
  const tabs = itemsInLot(workspace.tabs, lot);
  const runTabCommand = useChromeCommand();

  // Hide on fullscreen takeover routes.
  if (
    FULLSCREEN_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`))
  ) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line-soft shadow-[0_-4px_16px_color-mix(in oklab, var(--color-ink) 6%, transparent)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      {/* As many columns as there are tabs.
          It was `grid-cols-5` with the tab list filtered by lot: Lot 1
          registers four, so the four sat in five columns — squeezed
          into 78px each with an empty column on the right, and the
          labels ran into one another. */}
      <ul
        className="grid h-16 relative"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => {
          const active = t.href
            ? isActive(pathname, t.href, workspace.home)
            : false;
          // The centre tab is no longer raised.
          //
          // It was a 56px violet circle floating 12px above the bar, and
          // the bar's whole contract is that it does not cover the
          // content — the circle sat on top of the last line of the
          // book. Its label was pinned under it in 10px tracked
          // capitals, which is the only place on the phone where a
          // label was smaller than the floor. It is a tab now, marked
          // by the violet its role earns, in the row with the others.
          const itemClass = cn(
            "h-full w-full flex flex-col items-center justify-center gap-1 transition-colors",
            // 13px, sentence case, no tracking: the bar's labels were
            // 10px bold capitals with 0.06em of tracking — three of the
            // tells this audit removes, on the navigation a phone user
            // touches most.
            "text-meta font-semibold",
            t.raised || active ? "text-violet" : "text-ink-mute",
          );
          const glyph = (
            <>
              <Icon
                name={t.icon}
                size={20}
                strokeWidth={2}
                className={t.raised || active ? "text-violet" : "text-ink-mute"}
              />
              {t.label}
            </>
          );

          return (
            <li key={t.label} className="relative">
              {active ? (
                <motion.span
                  layoutId="bottom-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-violet"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null}
              {t.href ? (
                <Link href={t.href} className={itemClass}>
                  {glyph}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => runTabCommand(t.command)}
                  className={itemClass}
                >
                  {glyph}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
