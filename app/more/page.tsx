"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { IconSettings, IconUsers } from "@/components/layout/icons";

const ITEMS = [
  { href: "/team", label: "Équipe", description: "Membres et invitations", icon: IconUsers },
  { href: "/settings", label: "Réglages", description: "Profil, paiement, notifications", icon: IconSettings },
];

export default function MorePage() {
  return (
    <>
      <TopBar title="Plus" eyebrow="Compte" />
      <div className="px-4 py-6 max-w-content mx-auto fade-up">
        <div className="bg-surface border border-line rounded-lg shadow-card overflow-hidden divide-y divide-line">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex items-center gap-3 px-5 py-4 hover:bg-bg-soft/50 transition-colors"
              >
                <span className="h-9 w-9 rounded-md bg-bg-soft border border-line flex items-center justify-center text-ink">
                  <Icon />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-ink">
                    {it.label}
                  </div>
                  <div className="text-[12px] text-muted">
                    {it.description}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-2">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            );
          })}
        </div>

        <button className="mt-4 w-full text-left bg-surface border border-line rounded-lg px-5 py-4 text-error font-medium hover:bg-error/[0.03] transition-colors">
          Se déconnecter
        </button>
      </div>
    </>
  );
}
