"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconHome,
  IconLogo,
  IconScan,
  IconSettings,
  IconUsers,
  IconWallet,
} from "./icons";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const NAV: NavItem[] = [
  { label: "Vue d'ensemble", href: "/dashboard", icon: IconHome },
  { label: "Mes événements", href: "/events", icon: IconCalendar },
  { label: "Scanner", href: "/scanner", icon: IconScan },
  { label: "Versements", href: "/settlements", icon: IconWallet },
  { label: "Équipe", href: "/team", icon: IconUsers },
  { label: "Réglages", href: "/settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-line bg-surface">
      <div className="px-6 py-6 flex items-center gap-2 border-b border-line">
        <IconLogo />
        <div className="leading-tight">
          <div className="h-serif text-lg text-ink">LYFE</div>
          <div className="text-[10px] uppercase tracking-badge text-muted">
            Organisateur
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-6 py-2.5 text-sm transition-colors",
                active
                  ? "text-ink bg-bg border-l-2 border-ink -ml-px pl-[22px] font-medium"
                  : "text-muted hover:text-ink hover:bg-bg/60",
              ].join(" ")}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-line flex items-center gap-3">
        <div className="h-8 w-8 bg-ink text-white text-xs flex items-center justify-center font-medium">
          YE
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-sm text-ink truncate">Yassine El Khalfi</div>
          <div className="text-xs text-muted truncate">Blend Rooftop</div>
        </div>
      </div>
    </aside>
  );
}
