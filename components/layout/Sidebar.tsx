"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconHome,
  IconScan,
  IconSettings,
  IconUsers,
  IconWallet,
  Wordmark,
} from "./icons";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Activité",
    items: [
      { label: "Vue d'ensemble", href: "/dashboard", icon: IconHome },
      { label: "Mes événements", href: "/events", icon: IconCalendar },
      { label: "Scanner", href: "/scanner", icon: IconScan },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Versements", href: "/settlements", icon: IconWallet }],
  },
  {
    label: "Compte",
    items: [
      { label: "Équipe", href: "/team", icon: IconUsers },
      { label: "Réglages", href: "/settings", icon: IconSettings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-[248px] shrink-0 border-r border-line bg-sidebar-fade">
      <div className="px-6 pt-6 pb-5 border-b border-line">
        <Wordmark size={24} />
        <div className="eyebrow mt-2.5 text-muted-2">Espace organisateur</div>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto scroll-thin">
        {NAV.map((group, i) => (
          <div key={group.label} className={i > 0 ? "mt-5" : ""}>
            <div className="px-3 mb-1.5 eyebrow text-muted-2">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors duration-150",
                    active
                      ? "text-ink bg-ink/5 font-semibold"
                      : "text-muted hover:text-ink hover:bg-ink/[0.03]",
                  ].join(" ")}
                >
                  <Icon className={active ? "text-ink" : ""} />
                  <span className="flex-1">{item.label}</span>
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-royal"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-line">
        <button className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-ink/[0.03] transition-colors text-left">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-ink to-[#2a2a2a] text-white text-xs flex items-center justify-center font-semibold shadow-xs">
            YE
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[13px] font-medium text-ink truncate">
              Yassine El Khalfi
            </div>
            <div className="text-[11px] text-muted truncate">
              Blend Rooftop · Owner
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="text-muted-2"
          >
            <path
              d="M5 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
