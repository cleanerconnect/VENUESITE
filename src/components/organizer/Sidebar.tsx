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

interface Group {
  label: string;
  items: Item[];
}

const NAV: Group[] = [
  {
    label: "Manage",
    items: [
      { label: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
      { label: "Mes événements", href: "/events", icon: Ticket },
      { label: "Créer un événement", href: "/events/new", icon: PlusCircle, pulse: true },
    ],
  },
  {
    label: "Money & Team",
    items: [
      { label: "Versements", href: "/settlements", icon: Wallet },
      { label: "Équipe", href: "/team", icon: Users },
      { label: "Réglages", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-canvas-2 border-r border-line-soft sticky top-0 h-screen">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5">
        <Brand />
      </div>

      {/* Venue switcher card */}
      <div className="px-4 mb-3">
        <button className="w-full flex items-center gap-3 bg-surface rounded-[var(--radius-md)] p-3.5 text-left hover:shadow-soft transition-shadow">
          <div
            className="h-9 w-9 rounded-[10px] flex items-center justify-center text-ink font-bold text-[13px] shrink-0"
            style={{ background: "var(--color-gold-soft)" }}
          >
            RM
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-ink truncate">
              Rooftop Mansour
            </div>
            <div className="text-meta text-ink-mute truncate">
              Owner · Casablanca
            </div>
          </div>
          <ChevronRight size={14} className="text-ink-mute shrink-0" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto scroll-thin">
        {NAV.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-3 mb-1.5 text-eyebrow text-ink-mute">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname?.startsWith(item.href));
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
                  <span className="relative z-10 flex-1 truncate">
                    {item.label}
                  </span>
                  {item.pulse && active ? (
                    <span className="relative z-10 live-pulse" aria-hidden />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
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
              mido@mansour.ma
            </div>
          </div>
          <CalendarDays size={14} className="text-ink-mute shrink-0" />
        </button>
      </div>
    </aside>
  );
}
