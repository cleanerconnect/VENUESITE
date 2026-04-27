"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  ScanLine,
  Ticket,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useScannerStore } from "@/lib/stores/scanner";

// Mobile tab bar, Scanner is the raised gold center button. Tapping it
// opens the global scanner modal (same surface used by the desktop
// topbar pill and ⌘+Shift+S). The other 4 are normal Link tabs.
type Tab = {
  label: string;
  href?: string;
  icon: typeof LayoutDashboard;
  raised?: boolean;
};

const TABS: Tab[] = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Événements", href: "/events", icon: Ticket },
  { label: "Scanner", icon: ScanLine, raised: true },
  { label: "Versements", href: "/settlements", icon: Wallet },
  { label: "Plus", href: "/more", icon: Menu },
];

export function BottomTabs() {
  const pathname = usePathname();
  const openScanner = useScannerStore((s) => s.setOpen);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-canvas/95 backdrop-blur-md border-t border-line-soft pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-5 h-16 relative">
        {TABS.map((t) => {
          const active =
            !!t.href &&
            (pathname === t.href ||
              (t.href !== "/dashboard" && pathname?.startsWith(t.href)));
          const Icon = t.icon;

          if (t.raised) {
            return (
              <li key={t.label} className="relative">
                <button
                  onClick={() => openScanner(true)}
                  className="absolute left-1/2 -translate-x-1/2 -top-2 h-12 w-12 rounded-full bg-violet text-canvas flex items-center justify-center shadow-[0_8px_20px_rgba(134,91,166,0.42)] active:scale-95 transition-transform"
                  aria-label={t.label}
                >
                  <Icon size={22} strokeWidth={1.8} />
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-mute">
                  {t.label}
                </span>
              </li>
            );
          }

          return (
            <li key={t.label}>
              <Link
                href={t.href!}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors",
                  active ? "text-ink" : "text-ink-mute",
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={1.7}
                  className={active ? "text-ink" : "text-ink-mute"}
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
