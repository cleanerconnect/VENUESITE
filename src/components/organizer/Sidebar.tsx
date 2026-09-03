"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as RadixDialog from "@radix-ui/react-dialog";
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  LogOut,
  MoreVertical,
  UserCog,
} from "lucide-react";
import { Icon } from "@/components/dashboard/primitives";
import { VenueSwitcher, type SwitchableVenue } from "./VenueSwitcher";
import {
  WORKSPACES,
  type NavItem,
  type Workspace,
  isActive,
  resolveWorkspace,
  visibleItems,
} from "@/lib/nav/workspaces";
import { Brand } from "./Brand";
import { MobilePlusMenu } from "./MobilePlusMenu";
import { emitSessionChanged, useProfile, useRole, useUser } from "@/lib/auth/role";
import {
  ROLE_LABEL,
  type Role,
  clearSession,
  switchProfile,
  switchRole,
} from "@/lib/auth/session";
import { PROFILES } from "@/lib/auth/static/profiles";
import { useMobileNavStore } from "@/lib/stores/mobileNav";
import { cn } from "@/lib/utils/cn";
import { signOut } from "@/app/actions/auth";
import { useWorkspaceAccess } from "@/lib/auth/workspace-access";

const PORTAL_ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  staff: "Équipe",
};

export function Sidebar({
  venues = [],
  activeVenueId = "",
  viewerName = "",
  viewerRole,
}: {
  venues?: SwitchableVenue[];
  activeVenueId?: string;
  viewerName?: string;
  viewerRole?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();
  const profile = useProfile();
  const user = useUser();

  const handleLogout = () => {
    // Clears the client mirror and the server cookies. Clearing only the
    // mirror left the server still signed in, so the next navigation
    // walked straight back into the portal.
    clearSession();
    void signOut().then(() => router.replace("/login"));
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

  // Which product this route belongs to decides the whole sidebar:
  // caption, identity card, nav groups. Nothing below knows the names of
  // any of them.
  const workspace = resolveWorkspace(pathname);
  const groups = workspace.groups
    .map((group) => visibleItems(group, role))
    .filter((group) => group.length > 0);

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-canvas-2 border-r border-line-soft sticky top-0 h-screen">
      <SidebarBody
        pathname={pathname}
        role={role}
        profile={profile}
        user={user}
        workspace={workspace}
        groups={groups}
        venues={venues}
        activeVenueId={activeVenueId}
        viewerName={viewerName}
        viewerRole={viewerRole}
        handleSwitchRole={handleSwitchRole}
        handleSwitchProfile={handleSwitchProfile}
        handleLogout={handleLogout}
      />
    </aside>
  );
}

// Mobile drawer — same content as the desktop sidebar, slides in from
// the left. Triggered by the topbar hamburger.
export function MobileSidebarDrawer() {
  const pathname = usePathname();
  const workspace = resolveWorkspace(pathname);
  const open = useMobileNavStore((s) => s.drawerOpen);
  const setOpen = useMobileNavStore((s) => s.setDrawerOpen);

  // Close the drawer whenever the pathname changes — tapping any nav
  // link should advance + dismiss in one motion.
  useCloseOnPathChange(pathname, setOpen);

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm md:hidden"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="fixed top-0 left-0 bottom-0 z-50 w-[300px] max-w-[88vw] bg-canvas border-r border-line-soft shadow-deep flex flex-col md:hidden"
                aria-label="Navigation principale"
              >
                <RadixDialog.Title className="sr-only">
                  Menu principal
                </RadixDialog.Title>
                <header className="px-5 pt-5 pb-3 border-b border-line-soft shrink-0">
                  <Brand height={32} />
                  <div className="text-meta text-ink-mute mt-2 lowercase">
                    {workspace.caption}
                  </div>
                </header>
                <div className="flex-1 overflow-y-auto scroll-thin p-5">
                  <MobilePlusMenu bareHeader />
                </div>
              </motion.aside>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

function useCloseOnPathChange(
  pathname: string | null,
  setOpen: (open: boolean) => void,
) {
  // Close drawer when route changes. Skips initial mount.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (seen.current && seen.current !== pathname) {
      setOpen(false);
    }
    seen.current = pathname;
  }, [pathname, setOpen]);
}

// Inner sidebar content — shared between the desktop aside wrapper and
// the mobile drawer surface. Pure presentation; all state + handlers
// flow in via props so the surfaces stay decoupled.
function SidebarBody({
  pathname,
  role,
  profile,
  user,
  workspace,
  groups,
  venues,
  activeVenueId,
  viewerName,
  viewerRole,
  handleSwitchRole,
  handleSwitchProfile,
  handleLogout,
}: {
  pathname: string | null;
  role: Role | null;
  profile: ReturnType<typeof useProfile>;
  user: ReturnType<typeof useUser>;
  workspace: Workspace;
  groups: NavItem[][];
  venues: SwitchableVenue[];
  activeVenueId: string;
  viewerName: string;
  viewerRole?: string;
  handleSwitchRole: (next: Role) => void;
  handleSwitchProfile: (organizerId: string) => void;
  handleLogout: () => void;
}) {
  // The workspace supplies its own identity when it has one (the
  // restaurant); otherwise the signed-in organizer profile fills it.
  const entity = workspace.entity ?? {
    initials: profile?.initials ?? "",
    shortName: profile?.shortName ?? "",
    subline: profile?.subline ?? "",
  };

  // Read from context rather than props: the mobile drawer renders
  // this same body without going through <Sidebar>.
  const workspaces = useWorkspaceAccess();

  return (
    <>
      {/* Brand, real wordmark, no accompanying "LYFE" text label.
          44px height ensures the y descender + purple ascender both render
          without clipping. */}
      <div className="px-6 pt-7 pb-5">
        <Brand height={44} />
        <div className="text-meta text-ink-mute mt-2 lowercase">
          {workspace.caption}
        </div>
      </div>

      {/* Venue switcher on the venue side, organisation switcher on the
          event side. Either way, a link to the other workspace appears
          only when the account holds it. */}
      <div className="px-4 mb-3">
        {venues.length > 0 && workspace.id === "restaurant" ? (
          <>
            <VenueSwitcher venues={venues} activeVenueId={activeVenueId} />
            {workspaces.event ? (
              <Link
                href={WORKSPACES[0].home}
                className="mt-2 flex items-center gap-2 px-3 h-9 rounded-[var(--radius-sm)] text-meta font-semibold text-ink-mute hover:text-ink hover:bg-ink/[0.04] transition-colors"
              >
                <ArrowLeftRight size={13} strokeWidth={2} />
                Espace événements
              </Link>
            ) : null}
          </>
        ) : (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="w-full flex items-center gap-3 bg-surface rounded-[var(--radius-md)] p-3.5 text-left hover:shadow-soft transition-shadow">
                <div
                  className="h-9 w-9 rounded-[10px] flex items-center justify-center text-violet-deep font-bold text-[13px] shrink-0"
                  style={{ background: "var(--color-violet-soft)" }}
                >
                  {entity.initials}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] font-semibold text-ink truncate">
                    {entity.shortName}
                  </div>
                  <div className="text-meta text-ink-mute truncate">
                    {entity.subline}
                  </div>
                </div>
                <ChevronRight size={14} className="text-ink-mute shrink-0" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="bottom"
                align="start"
                sideOffset={6}
                className="min-w-[228px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
              >
                {WORKSPACES.filter((w) =>
                  w.id === "restaurant" ? workspaces.venue : workspaces.event,
                ).map((w) => (
                  <DropdownMenu.Item key={w.id} asChild>
                    <Link
                      href={w.home}
                      className="flex items-center gap-2 px-3 h-10 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
                    >
                      <span className="flex-1">{w.switcherLabel}</span>
                      {w.id === workspace.id ? (
                        <Check size={14} strokeWidth={2} className="text-violet-deep" />
                      ) : null}
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      {/* Groups render with a hairline between them and no spelled-out
          labels — the grouping reads visually. Any number of groups. */}
      <nav className="flex-1 px-3 overflow-y-auto scroll-thin">
        {groups.map((items, i) => (
          <div key={items[0]?.href ?? i}>
            {i > 0 ? (
              <div aria-hidden className="my-3 mx-3 h-px bg-line-soft" />
            ) : null}
            <NavGroup items={items} pathname={pathname} home={workspace.home} />
          </div>
        ))}
      </nav>

      {/* User card with kebab dropdown for account actions (logout). */}
      <div className="p-3 border-t border-line-soft">
        <div className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] hover:bg-ink/[0.04] transition-colors">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-ink font-bold text-[12px] shrink-0"
            style={{ background: "var(--color-tint-peach)" }}
          >
            {(viewerName || user?.name || "")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-ink truncate">
              {viewerName || user?.name}
            </div>
            {/* Role from the session, organisation from the workspace —
                so the restaurant workspace stops claiming the festival. */}
            <div className="text-meta text-ink-mute truncate">
              {[
                viewerRole ? PORTAL_ROLE_LABEL[viewerRole] ?? viewerRole : role ? ROLE_LABEL[role] : null,
                venues.find((v) => v.id === activeVenueId)?.shortName ?? entity.shortName,
              ]
                .filter(Boolean)
                .join(" · ")}
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
    </>
  );
}

function NavGroup({
  items,
  pathname,
  home,
}: {
  items: NavItem[];
  pathname: string | null;
  home: string;
}) {
  return (
    <div>
      {items.map((item) => {
        const active = isActive(pathname, item.href, home);
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
              name={item.icon}
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
