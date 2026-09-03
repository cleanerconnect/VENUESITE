"use client";

import Link from "next/link";
import { ArrowRight, LogOut, Settings, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const ITEMS = [
  {
    href: "/team",
    label: "Équipe",
    description: "Membres et invitations",
    icon: Users,
  },
  {
    href: "/settings",
    label: "Réglages",
    description: "Profil, paiement, notifications",
    icon: Settings,
  },
];

// Mobile-only "Plus" sheet, Team / Settings / Logout.
export default function MorePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Plus" subtitle="Équipe, réglages, et déconnexion." />

      <Card variant="surface" size="md" className="!p-0">
        <ul className="divide-y divide-line-soft">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-canvas/40 transition-colors"
                >
                  <span
                    aria-hidden
                    className="h-10 w-10 rounded-chip bg-canvas-2/60 flex items-center justify-center shrink-0"
                  >
                    <Icon size={16} strokeWidth={1.8} className="text-ink" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-ink">
                      {it.label}
                    </div>
                    <div className="text-meta text-ink-mute">
                      {it.description}
                    </div>
                  </div>
                  <ArrowRight size={16} strokeWidth={1.8} className="text-ink-mute shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <button className="w-full flex items-center gap-4 px-5 py-4 bg-surface border border-line rounded-[var(--radius-md)] text-danger hover:bg-tint-rose/40 transition-colors">
        <span
          aria-hidden
          className="h-10 w-10 rounded-chip bg-tint-rose flex items-center justify-center shrink-0"
        >
          <LogOut size={16} strokeWidth={1.8} className="text-danger" />
        </span>
        <div className="flex-1 text-left text-[15px] font-semibold">
          Se déconnecter
        </div>
      </button>
    </div>
  );
}
