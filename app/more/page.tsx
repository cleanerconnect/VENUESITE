"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import {
  IconSettings,
  IconUsers,
} from "@/components/layout/icons";

const ITEMS = [
  { href: "/team", label: "Équipe", icon: IconUsers },
  { href: "/settings", label: "Réglages", icon: IconSettings },
];

// Mobile-only "More" sheet (rendered as a full page).
// Desktop users reach Team/Settings via the sidebar instead.
export default function MorePage() {
  return (
    <>
      <TopBar title="Plus" />
      <div className="px-4 py-6 max-w-content mx-auto">
        <ul className="bg-surface border border-line shadow-card divide-y divide-line">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className="flex items-center gap-3 px-5 py-4 text-ink hover:bg-bg/60"
                >
                  <Icon />
                  <span>{it.label}</span>
                  <span className="ml-auto text-muted">→</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button className="w-full flex items-center gap-3 px-5 py-4 text-error hover:bg-error/5">
              <span>Se déconnecter</span>
              <span className="ml-auto">→</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}
