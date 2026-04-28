"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Megaphone,
  MessageCircle,
  MoreVertical,
  PlusCircle,
  Settings,
  Sparkles,
  Tag,
  Ticket,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { Brand } from "./Brand";
import { emitSessionChanged, useProfile, useRole } from "@/lib/auth/role";
import {
  ROLE_LABEL,
  type Role,
  clearSession,
  switchProfile,
  switchRole,
} from "@/lib/auth/session";
import { PROFILES } from "@/lib/mock/profiles";
import { cn } from "@/lib/utils/cn";

interface Item {
  label: string;
  href: string;
  icon: LucideIcon;
  pulse?: boolean;
  /** When set, this nav item is hidden for any role NOT in the allow list. */
  allow?: Role[];
}

// Two groups, no spelled-out labels, separated by a hairline divider.
// The grouping reads visually; the items are obvious enough.
const GROUP_A: Item[] = [
  { label: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mes événements", href: "/events", icon: Ticket },
  { label: "Bilans", href: "/bilans", icon: FileText, allow: ["owner", "admin"] },
  { label: "Support", href: "/support", icon: MessageCircle, allow: ["owner", "admin"] },
  { label: "Audiences", href: "/audiences", icon: Sparkles, allow: ["owner", "admin"] },
  { label: "Visibilité", href: "/visibilite", icon: Megaphone, allow: ["owner", "admin"] },
  { label: "Codes promo", href: "/promo-codes", icon: Tag, allow: ["owner", "admin"] },
  {
    label: "Créer un événement",
    href: "/events/new",
    icon: PlusCircle,
    pulse: true,
    allow: ["owner", "admin"],
  },
];

const GROUP_B: Item[] = [
  { label: "Versements", href: "/settlements", icon: Wallet, allow: ["owner", "admin"] },
  { label: "Équipe", href: "/team", icon: Users, allow: ["owner", "admin"] },
  { label: "Réglages", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();
  const profile = useProfile();

  const handleLogout = () => {
    clearSession();
    router.push("/splash");
  };

  const handleSwitchRole = (next: Role) => {
    switchRole(next);
    emitSessionChanged();
    router.refresh();
  };

  const handleSwitchProfile = (organizerId: string) => {
    switchProfile(organizerId);
    emitSessionChanged();
    router.refresh();
  };

  const groupA = GROUP_A.filter(
    (i) => !i.allow || (role && i.allow.includes(role)),
  );
  const groupB = GROUP_B.filter(
    (i) => !i.allow || (role && i.allow.includes(role)),
  );

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-canvas-2 border-r border-line-soft sticky top-0 h-screen">
      {/* Brand, real wordmark, no accompanying "LYFE" text label.
          44px height ensures the y descender + purple ascender both render
          without clipping. */}
      <div className="px-6 pt-7 pb-5">
        <Brand height={44} />
        <div className="text-meta text-ink-mute mt-2 lowercase">
          organisateur
        </div>
      </div>

      {/* Organizer switcher card — derived from the active demo profile. */}
      <div className="px-4 mb-3">
        <button className="w-full flex items-center gap-3 bg-surface rounded-[var(--radius-md)] p-3.5 text-left hover:shadow-soft transition-shadow">
          <div
            className="h-9 w-9 rounded-[10px] flex items-center justify-center text-violet-deep font-bold text-[13px] shrink-0"
            style={{ background: "var(--color-violet-soft)" }}
          >
            {profile?.initials ?? "JZ"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-ink truncate">
              {profile?.shortName ?? "Jazzablanca"}
            </div>
            <div className="text-meta text-ink-mute truncate">
              {profile?.subline ?? "Festival · Casablanca"}
            </div>
          </div>
          <ChevronRight size={14} className="text-ink-mute shrink-0" />
        </button>
      </div>

      {/* Nav, groups separated by a 1px line-soft divider, no labels */}
      <nav className="flex-1 px-3 overflow-y-auto scroll-thin">
        <NavGroup items={groupA} pathname={pathname} />
        <div
          aria-hidden
          className="my-3 mx-3 h-px bg-line-soft"
        />
        <NavGroup items={groupB} pathname={pathname} />
      </nav>

      {/* User card with kebab dropdown for account actions (logout). */}
      <div className="p-3 border-t border-line-soft">
        <div className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] hover:bg-ink/[0.04] transition-colors">
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
              {role ? ROLE_LABEL[role] : "Directeur"} · Jazzablanca
            </div>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="Options du compte"
                className="h-8 w-8 rounded-full hover:bg-ink/[0.06] flex items-center justify-center text-ink-mute transition-colors"
              >
                <MoreVertical size={14} strokeWidth={1.8} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                align="end"
                sideOffset={8}
                className="min-w-[200px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
                >
                  <CalendarDays size={14} strokeWidth={1.8} className="text-ink-mute" />
                  Calendrier
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-line-soft my-1" />

                {/* Demo-only role switcher. Removed in production. */}
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger
                    className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none data-[state=open]:bg-ink/[0.04]"
                  >
                    <UserCog size={14} strokeWidth={1.8} className="text-ink-mute" />
                    <span className="flex-1">Vue démo</span>
                    <ChevronRight size={12} strokeWidth={2} className="text-ink-mute" />
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={4}
                      className="min-w-[200px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
                    >
                      {(["owner", "admin", "scanner"] as Role[]).map((r) => {
                        const active = role === r;
                        return (
                          <DropdownMenu.Item
                            key={r}
                            onSelect={() => handleSwitchRole(r)}
                            className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
                          >
                            <span className="flex-1">{ROLE_LABEL[r]}</span>
                            {active ? (
                              <Check size={14} strokeWidth={2} className="text-violet-deep" />
                            ) : null}
                          </DropdownMenu.Item>
                        );
                      })}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>

                {/* Demo-only profile switcher (festival vs venue). Drives
                    the conditional rendering of Settings → Détails du
                    lieu and the chrome's org card. */}
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger
                    className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none data-[state=open]:bg-ink/[0.04]"
                  >
                    <Building2 size={14} strokeWidth={1.8} className="text-ink-mute" />
                    <span className="flex-1">Profil démo</span>
                    <ChevronRight size={12} strokeWidth={2} className="text-ink-mute" />
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={4}
                      className="min-w-[260px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
                    >
                      {Object.values(PROFILES).map((p) => {
                        const active = profile?.id === p.id;
                        return (
                          <DropdownMenu.Item
                            key={p.id}
                            onSelect={() => handleSwitchProfile(p.id)}
                            className="flex items-center gap-2 px-3 h-10 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">
                                {p.shortName}
                              </div>
                              <div className="text-meta text-ink-mute truncate">
                                {p.type === "venue" ? "Lieu" : p.type === "festival" ? "Festival" : "Promoteur"} · {p.city}
                              </div>
                            </div>
                            {active ? (
                              <Check size={14} strokeWidth={2} className="text-violet-deep shrink-0" />
                            ) : null}
                          </DropdownMenu.Item>
                        );
                      })}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>

                <DropdownMenu.Separator className="h-px bg-line-soft my-1" />
                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
                >
                  <LogOut size={14} strokeWidth={1.8} className="text-ink-mute" />
                  Se déconnecter
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
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
                className="absolute inset-0 rounded-[10px] bg-violet-soft"
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
