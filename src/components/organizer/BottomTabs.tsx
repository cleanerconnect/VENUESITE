"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Icon } from "@/components/dashboard/primitives";
import { isActive, resolveWorkspace } from "@/lib/nav/workspaces";
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
  const tabs = workspace.tabs;
  const runTabCommand = useChromeCommand();

  // Hide on fullscreen takeover routes.
  if (
    FULLSCREEN_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`))
  ) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line-soft shadow-[0_-4px_16px_rgba(10,31,61,0.06)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-5 h-16 relative">
        {tabs.map((t) => {
          const active = t.href
            ? isActive(pathname, t.href, workspace.home)
            : false;
          const raisedClass =
            "absolute left-1/2 -translate-x-1/2 -top-3 h-14 w-14 rounded-full bg-violet text-canvas flex items-center justify-center shadow-[0_8px_20px_rgba(134,91,166,0.42)] active:scale-95 transition-transform";

          if (t.raised) {
            return (
              <li key={t.label} className="relative">
                {t.href ? (
                  <Link href={t.href} aria-label={t.label} className={raisedClass}>
                    <Icon name={t.icon} size={24} strokeWidth={1.8} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-label={t.label}
                    onClick={() => runTabCommand(t.command)}
                    className={raisedClass}
                  >
                    <Icon name={t.icon} size={24} strokeWidth={1.8} />
                  </button>
                )}
                <span className="absolute left-1/2 -translate-x-1/2 bottom-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-mute">
                  {t.label}
                </span>
              </li>
            );
          }

          const itemClass = cn(
            "h-full w-full flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors",
            active ? "text-violet" : "text-ink-mute",
          );
          const glyph = (
            <>
              <Icon
                name={t.icon}
                size={18}
                strokeWidth={1.7}
                className={active ? "text-violet" : "text-ink-mute"}
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
