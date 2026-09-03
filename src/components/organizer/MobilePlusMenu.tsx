"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Check,
  ChevronRight,
  HelpCircle,
  LogOut,
  UserCog,
  X,
} from "lucide-react";
import { Icon } from "@/components/dashboard/primitives";
import type { IconKey } from "@/lib/dashboard/icons";
import { resolveWorkspace, visibleItems } from "@/lib/nav/workspaces";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { emitSessionChanged, useProfile, useRole, useUser } from "@/lib/auth/role";
import {
  ROLE_LABEL,
  type Role,
  clearSession,
  switchProfile,
  switchRole,
} from "@/lib/auth/session";
import { PROFILES } from "@/lib/data/static/profiles";
import { useMobileNavStore } from "@/lib/stores/mobileNav";
import { cn } from "@/lib/utils/cn";

// Single source of truth for the mobile secondary nav. Used by both
// the /plus full-route screen and the hamburger MobileSidebarDrawer
// so the two surfaces stay aligned: tap a row in either, advance to
// the same destination, dismiss on success.
//
// The component owns:
//   - The profile switcher card at the top — tap opens a bottom
//     sheet listing every demo profile + the role switcher.
//   - The vertical nav list (10 rows including external + logout).
//   - A footer line with the signed-in user, their role and the active
//     workspace, so identity is always visible.

interface MenuItem {
  label: string;
  href?: string;
  /** Registry key, or a raw node for the two chrome rows below. */
  icon: IconKey;
  node?: React.ReactNode;
  external?: boolean;
  destructive?: boolean;
  onClick?: () => void;
}

export function MobilePlusMenu({
  /** When true, suppresses the page-style header so the drawer can
   *  render its own framing. */
  bareHeader = false,
}: {
  bareHeader?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const profile = useProfile();
  const role = useRole();
  const user = useUser();
  const workspace = resolveWorkspace(pathname);
  const orgName = workspace.entity?.shortName ?? profile?.shortName ?? "";
  const closeDrawer = useMobileNavStore((s) => s.setDrawerOpen);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    closeDrawer(false);
    router.push("/splash");
  };

  // Product rows come from the active workspace; help and logout are
  // chrome and belong to every workspace, so they are appended here.
  const items: MenuItem[] = [
    ...visibleItems(workspace.secondary, role),
    {
      label: "Aide & FAQ",
      href: "https://lyfe.ma/aide",
      icon: "info",
      node: <HelpCircle size={18} strokeWidth={1.6} className="text-ink-mute" />,
      external: true,
    },
    {
      label: "Se déconnecter",
      icon: "info",
      node: <LogOut size={18} strokeWidth={1.6} className="text-danger" />,
      destructive: true,
      onClick: handleLogout,
    },
  ];

  const handlePickProfile = (organizerId: string) => {
    switchProfile(organizerId);
    emitSessionChanged();
    router.refresh();
    setPickerOpen(false);
    toast({ tone: "success", title: "Profil changé" });
  };

  const handlePickRole = (next: Role) => {
    switchRole(next);
    emitSessionChanged();
    router.refresh();
    setPickerOpen(false);
    toast({ tone: "success", title: `Rôle ${ROLE_LABEL[next]}` });
  };

  return (
    <div className="space-y-5">
      {!bareHeader ? (
        <div>
          <h1 className="text-h1 text-ink">Plus</h1>
          <p className="text-body text-ink-soft mt-1.5">
            Tous vos outils LYFE, en un endroit.
          </p>
        </div>
      ) : null}

      {/* Profile switcher card — tap to open the picker sheet */}
      {profile ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full text-left bg-surface border border-line hover:border-violet-soft rounded-[var(--radius-lg)] p-4 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-[12px] flex items-center justify-center text-violet-deep font-bold text-[14px] shrink-0"
              style={{ background: "var(--color-violet-soft)" }}
            >
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-eyebrow text-ink-mute">Profil actif</div>
              <div className="text-[14px] font-semibold text-ink truncate mt-0.5">
                {profile.shortName}
              </div>
              <div className="text-meta text-ink-mute truncate">
                {profile.subline}
              </div>
            </div>
            <ChevronRight
              size={14}
              strokeWidth={1.8}
              className="text-ink-mute shrink-0"
            />
          </div>
        </button>
      ) : null}

      {/* Vertical menu list */}
      <Card variant="surface" size="md" className="!p-0 !overflow-hidden">
        <ul className="divide-y divide-line-soft">
          {items.map((it) => {
            const inner = (
              <div
                className={cn(
                  "flex items-center gap-3 px-5 h-14",
                  it.destructive
                    ? "text-danger"
                    : "text-ink hover:bg-canvas-2/40 transition-colors",
                )}
              >
                {it.node ?? (
                  <Icon
                    name={it.icon}
                    size={18}
                    strokeWidth={1.6}
                    className={it.destructive ? "text-danger" : "text-ink-mute"}
                  />
                )}
                <span className="flex-1 text-[14px] font-medium">{it.label}</span>
                {it.href ? (
                  <ChevronRight
                    size={14}
                    strokeWidth={1.8}
                    className="text-ink-mute"
                  />
                ) : null}
              </div>
            );
            if (it.onClick) {
              return (
                <li key={it.label}>
                  <button
                    type="button"
                    onClick={it.onClick}
                    className="w-full text-left"
                  >
                    {inner}
                  </button>
                </li>
              );
            }
            if (it.external && it.href) {
              return (
                <li key={it.label}>
                  <a href={it.href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                </li>
              );
            }
            return (
              <li key={it.label}>
                <Link href={it.href!}>{inner}</Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="text-meta text-ink-mute text-center pt-2 pb-2">
        {[user?.name, role ? ROLE_LABEL[role] : null, orgName]
          .filter(Boolean)
          .join(" · ")}
      </div>

      {/* Profile + role picker bottom sheet */}
      <ProfilePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentProfileId={profile?.id ?? null}
        currentRole={role}
        onPickProfile={handlePickProfile}
        onPickRole={handlePickRole}
      />
    </div>
  );
}

function ProfilePicker({
  open,
  onOpenChange,
  currentProfileId,
  currentRole,
  onPickProfile,
  onPickRole,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  currentProfileId: string | null;
  currentRole: Role | null;
  onPickProfile: (id: string) => void;
  onPickRole: (role: Role) => void;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ y: "20%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "20%", opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="fixed bottom-0 inset-x-0 z-[60] bg-surface text-ink rounded-t-[var(--radius-xl)] max-h-[80vh] overflow-hidden flex flex-col"
              >
                <header className="px-5 pt-5 pb-3 border-b border-line-soft flex items-start justify-between gap-3">
                  <div>
                    <RadixDialog.Title asChild>
                      <h2
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontWeight: 600,
                          fontSize: "20px",
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Changer de profil
                      </h2>
                    </RadixDialog.Title>
                    <p className="text-meta text-ink-soft mt-1">
                      Profils + rôles démo — recharge l&apos;app sur la sélection.
                    </p>
                  </div>
                  <RadixDialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Fermer"
                      className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute shrink-0 transition-colors"
                    >
                      <X size={16} strokeWidth={1.8} />
                    </button>
                  </RadixDialog.Close>
                </header>
                <div className="overflow-y-auto scroll-thin">
                  <div className="px-5 pt-4">
                    <div className="text-eyebrow text-ink-mute mb-2 inline-flex items-center gap-1.5">
                      <Building2 size={11} strokeWidth={1.9} />
                      Profil organisateur
                    </div>
                  </div>
                  <ul>
                    {Object.values(PROFILES).map((p) => {
                      const active = p.id === currentProfileId;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => onPickProfile(p.id)}
                            className={cn(
                              "w-full px-5 h-16 flex items-center gap-3 text-left transition-colors",
                              active
                                ? "bg-violet-soft/60"
                                : "hover:bg-canvas-2/40",
                            )}
                          >
                            <div
                              className="h-9 w-9 rounded-[10px] flex items-center justify-center text-violet-deep font-bold text-[12px] shrink-0"
                              style={{ background: "var(--color-violet-soft)" }}
                            >
                              {p.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[14px] font-semibold text-ink truncate">
                                {p.shortName}
                              </div>
                              <div className="text-meta text-ink-mute truncate">
                                {p.type === "venue"
                                  ? "Lieu"
                                  : p.type === "festival"
                                    ? "Festival"
                                    : "Promoteur"}{" "}
                                · {p.city}
                              </div>
                            </div>
                            {active ? (
                              <Check
                                size={16}
                                strokeWidth={2.2}
                                className="text-violet-deep shrink-0"
                              />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="px-5 pt-5 mt-2 border-t border-line-soft">
                    <div className="text-eyebrow text-ink-mute mb-2 inline-flex items-center gap-1.5">
                      <UserCog size={11} strokeWidth={1.9} />
                      Vue démo
                    </div>
                  </div>
                  <ul>
                    {(["owner", "admin", "scanner"] as Role[]).map((r) => {
                      const active = r === currentRole;
                      return (
                        <li key={r}>
                          <button
                            type="button"
                            onClick={() => onPickRole(r)}
                            className={cn(
                              "w-full px-5 h-12 flex items-center gap-3 text-left transition-colors",
                              active
                                ? "bg-violet-soft/60"
                                : "hover:bg-canvas-2/40",
                            )}
                          >
                            <span className="flex-1 text-[14px] text-ink">
                              {ROLE_LABEL[r]}
                            </span>
                            {active ? (
                              <Check
                                size={16}
                                strokeWidth={2.2}
                                className="text-violet-deep shrink-0"
                              />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
