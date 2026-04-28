"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  type LucideIcon,
  FileText,
  HelpCircle,
  History,
  LogOut,
  Megaphone,
  MessageCircle,
  Settings,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useProfile } from "@/lib/auth/role";
import { clearSession } from "@/lib/auth/session";

// "Plus" tab — secondary navigation hub on mobile. Section 6 of the
// redesign expands this with a profile switcher card at the top.
// For now, the linear menu list is enough to wire all the secondary
// destinations behind the bottom nav.

interface MenuItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  external?: boolean;
  destructive?: boolean;
  onClick?: () => void;
}

export default function PlusPage() {
  const router = useRouter();
  const profile = useProfile();

  const handleLogout = () => {
    clearSession();
    router.push("/splash");
  };

  const items: MenuItem[] = [
    { label: "Bilans", href: "/bilans", icon: FileText },
    { label: "Visibilité", href: "/visibilite", icon: Megaphone },
    { label: "Versements", href: "/settlements", icon: Wallet },
    { label: "Codes promo", href: "/promo-codes", icon: Tag },
    { label: "Équipe", href: "/team", icon: Users },
    { label: "Réglages", href: "/settings", icon: Settings },
    { label: "Activité", href: "/activity", icon: History },
    { label: "Support", href: "/support", icon: MessageCircle },
    { label: "Aide & FAQ", href: "https://lyfe.ma/aide", icon: HelpCircle, external: true },
    { label: "Se déconnecter", icon: LogOut, destructive: true, onClick: handleLogout },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h1 text-ink">Plus</h1>
        <p className="text-body text-ink-soft mt-1.5">
          Tous vos outils LYFE, en un endroit.
        </p>
      </div>

      {profile ? (
        <Card variant="surface" size="md">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-[12px] flex items-center justify-center text-violet-deep font-bold text-[14px] shrink-0"
              style={{ background: "var(--color-violet-soft)" }}
            >
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink truncate">
                {profile.shortName}
              </div>
              <div className="text-meta text-ink-mute truncate">
                {profile.subline}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card variant="surface" size="md" className="!p-0 !overflow-hidden">
        <ul className="divide-y divide-line-soft">
          {items.map((it) => {
            const Icon = it.icon;
            const inner = (
              <div
                className={
                  "flex items-center gap-3 px-5 h-14 " +
                  (it.destructive
                    ? "text-danger"
                    : "text-ink hover:bg-canvas-2/40 transition-colors")
                }
              >
                <Icon
                  size={18}
                  strokeWidth={1.6}
                  className={it.destructive ? "text-danger" : "text-ink-mute"}
                />
                <span className="flex-1 text-[14px] font-medium">{it.label}</span>
                {it.href ? (
                  <ChevronRight size={14} strokeWidth={1.8} className="text-ink-mute" />
                ) : null}
              </div>
            );
            if (it.onClick) {
              return (
                <li key={it.label}>
                  <button type="button" onClick={it.onClick} className="w-full text-left">
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
        Mido Reffas · {profile?.shortName ?? "Jazzablanca"}
      </div>
    </div>
  );
}
