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
import { itemsInLot, resolveWorkspace, visibleItems } from "@/lib/nav/workspaces";
import { useWorkspaceAccess } from "@/lib/auth/workspace-access";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { emitSessionChanged, useProfile, useRole, useUser } from "@/lib/auth/role";
import {
  ROLE_LABEL,
  type Role,
  clearSession,
} from "@/lib/auth/session";
import { PROFILES } from "@/lib/auth/static/profiles";
import { useMobileNavStore } from "@/lib/stores/mobileNav";
import { cn } from "@/lib/utils/cn";
import { signOut } from "@/app/actions/auth";

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
  const { lot } = useWorkspaceAccess();
  const workspace = resolveWorkspace(pathname);
  const orgName = workspace.entity?.shortName ?? profile?.shortName ?? "";
  const closeDrawer = useMobileNavStore((s) => s.setDrawerOpen);

  const handleLogout = () => {
    // Clears the client mirror and the server cookies. Clearing only the
    // mirror left the server still signed in, so the next navigation
    // walked straight back into the portal.
    clearSession();
    closeDrawer(false);
    void signOut().then(() => router.replace("/login"));
  };

  // Product rows come from the active workspace; help and logout are
  // chrome and belong to every workspace, so they are appended here.
  const items: MenuItem[] = [
    ...visibleItems(itemsInLot(workspace.secondary, lot), role),
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

      {/* The active profile, stated. It used to open a sheet that swapped
          profile and role at will — a switch that exists in no signed-in
          product and let a reviewer land in a role they were never
          granted. */}
      {profile ? (
        <div className="w-full bg-surface border border-line rounded-[var(--radius-lg)] p-4">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-chip flex items-center justify-center text-violet-deep font-bold text-[14px] shrink-0"
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
          </div>
        </div>
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

    </div>
  );
}
