"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconHome,
  IconMore,
  IconScan,
  IconWallet,
} from "./icons";

const TABS = [
  { label: "Accueil", href: "/dashboard", icon: IconHome },
  { label: "Événements", href: "/events", icon: IconCalendar },
  { label: "Scanner", href: "/scanner", icon: IconScan },
  { label: "Versements", href: "/settlements", icon: IconWallet },
  { label: "Plus", href: "/more", icon: IconMore },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line z-30"
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active =
            pathname === t.href ||
            (t.href !== "/dashboard" && pathname?.startsWith(t.href));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={[
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-badge",
                  active ? "text-ink" : "text-muted",
                ].join(" ")}
              >
                <Icon />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
