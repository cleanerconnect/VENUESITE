"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  type LucideIcon,
  PlusCircle,
  Settings,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { Brand } from "./Brand";
import { cn } from "@/lib/utils/cn";

interface Item {
  label: string;
  href: string;
  icon: LucideIcon;
  pulse?: boolean;
}

// Two groups, no spelled-out labels — separated by a hairline divider.
// The grouping reads visually; the items are obvious enough.
const GROUP_A: Item[] = [
  { label: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mes événements", href: "/events", icon: Ticket },
  { label: "Créer un événement", href: "/events/new", icon: PlusCircle, pulse: true },
];

const GROUP_B: Item[] = [
  { label: "Versements", href: "/settlements", icon: Wallet },
  { label: "Équipe", href: "/team", icon: Users },
  { label: "Réglages", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-canvas-2 border-r border-line-soft sticky top-0 h-screen">
      {/* Brand — real wordmark, no accompanying "LYFE" text label.
          44px height ensures the y descender + purple ascender both render
          without clipping. */}
      <div className="px-6 pt-7 pb-5">
        <Brand height={44} />
        <div className="text-meta text-ink-mute mt-2 lowercase">
          organisateur
        </div>
      </div>

      {/* Organizer switcher card — Jazzablanca demo */}
      <div className="px-4 mb-3">
        <button className="w-full flex items-center gap-3 bg-surface rounded-[var(--radius-md)] p-3.5 text-left hover:shadow-soft transition-shadow">
          <div
            className="h-9 w-9 rounded-[10px] flex items-center justify-center text-violet-deep font-bold text-[13px] shrink-0"
            style={{ background: "var(--color-violet-soft)" }}
          >
            JZ
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-ink truncate">
              Jazzablanca
            </div>
            <div className="text-meta text-ink-mute truncate">
              Festival · Casablanca
            </div>
          </div>
          <ChevronRight size={14} className="text-ink-mute shrink-0" />
        </button>
      </div>

      {/* Nav — groups separated by a 1px line-soft divider, no labels */}
      <nav className="flex-1 px-3 overflow-y-auto scroll-thin">
        <NavGroup items={GROUP_A} pathname={pathname} />
        <div
          aria-hidden
          className="my-3 mx-3 h-px bg-line-soft"
        />
        <NavGroup items={GROUP_B} pathname={pathname} />
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-line-soft">
        <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] hover:bg-ink/[0.04] transition-colors text-left">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-ink font-bold text-[12px] shrink-0"
            style={{ background: "var(--color-tint-peach)" }}
          >
            MR
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-ink truncate">
              Mido Reffas
            </div>
            <div className="text-meta text-ink-mute truncate">
              Directeur · Jazzablanca
            </div>
          </div>
          <CalendarDays size={14} className="text-ink-mute shrink-0" />
        </button>
      </div>
    </aside>
  );
}

function NavGroup({
  items,
  pathname,
}: {
  items: Item[];
  pathname: string | null;
}) {
  return (
    <div>
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 px-3 h-10 rounded-[10px] text-[13.5px] font-medium",
              "transition-colors duration-150",
              active
                ? "text-ink"
                : "text-ink-soft hover:text-ink hover:bg-ink/[0.04]",
            )}
          >
            {active ? (
              <motion.span
                layoutId="sidebar-active-pill"
                className="absolute inset-0 rounded-[10px] bg-gold-soft"
                style={{ zIndex: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <Icon
              size={18}
              strokeWidth={1.6}
              className={cn(
                "relative z-10 shrink-0",
                active ? "text-ink" : "text-ink-mute",
              )}
            />
            <span className="relative z-10 flex-1 truncate">{item.label}</span>
            {item.pulse && active ? (
              <span className="relative z-10 live-pulse" aria-hidden />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
