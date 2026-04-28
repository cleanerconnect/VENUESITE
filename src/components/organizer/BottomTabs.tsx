"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  LayoutDashboard,
  MoreHorizontal,
  ScanLine,
  Sparkles,
  Ticket,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

// Five-tab mobile nav. Scanner is the elevated center button — taps
// navigate to the fullscreen /scanner takeover route. Other tabs are
// regular Link navigation. Active tab carries a violet color + a thin
// top border indicator.
//
// Hidden on routes that take over the full screen (/scanner, …).

interface Tab {
  label: string;
  href: string;
  icon: LucideIcon;
  raised?: boolean;
}

const TABS: Tab[] = [
  { label: "Aperçu", href: "/dashboard", icon: LayoutDashboard },
  { label: "Événements", href: "/events", icon: Ticket },
  { label: "Scanner", href: "/scanner", icon: ScanLine, raised: true },
  { label: "Audiences", href: "/audiences", icon: Sparkles },
  { label: "Plus", href: "/plus", icon: MoreHorizontal },
];

const FULLSCREEN_ROUTES = ["/scanner", "/scanner-fullscreen"];

export function BottomTabs() {
  const pathname = usePathname();

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
        {TABS.map((t) => {
          const active =
            pathname === t.href ||
            (t.href !== "/dashboard" && pathname?.startsWith(`${t.href}/`));
          const Icon = t.icon;

          if (t.raised) {
            return (
              <li key={t.label} className="relative">
                <Link
                  href={t.href}
                  aria-label={t.label}
                  className="absolute left-1/2 -translate-x-1/2 -top-3 h-14 w-14 rounded-full bg-violet text-canvas flex items-center justify-center shadow-[0_8px_20px_rgba(134,91,166,0.42)] active:scale-95 transition-transform"
                >
                  <Icon size={24} strokeWidth={1.8} />
                </Link>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-mute">
                  {t.label}
                </span>
              </li>
            );
          }

          return (
            <li key={t.label} className="relative">
              {active ? (
                <motion.span
                  layoutId="bottom-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-violet"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : null}
              <Link
                href={t.href}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors",
                  active ? "text-violet" : "text-ink-mute",
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={1.7}
                  className={active ? "text-violet" : "text-ink-mute"}
                />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
