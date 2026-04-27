"use client";

import Link from "next/link";
import { Bell, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 h-[72px] bg-canvas/80 backdrop-blur-md border-b border-line-soft">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center gap-4">
        {/* Search pill — desktop only */}
        <div className="hidden md:flex flex-1 max-w-[480px]">
          <button className="group w-full h-11 px-4 bg-surface rounded-full border border-line flex items-center gap-3 text-left hover:border-ink/40 transition-colors">
            <Search size={16} className="text-ink-mute" strokeWidth={1.8} />
            <span className="flex-1 text-[13px] text-ink-mute">
              Rechercher un événement, un participant, une transaction…
            </span>
            <kbd className="text-[11px] font-semibold text-ink-mute bg-canvas-2 border border-line px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex-1 md:hidden" />

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button
            aria-label="Messages"
            className="relative h-10 w-10 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink transition-colors"
          >
            <MessageSquare size={18} strokeWidth={1.6} />
          </button>
          <button
            aria-label="Notifications"
            className="relative h-10 w-10 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink transition-colors"
          >
            <Bell size={18} strokeWidth={1.6} />
            <span
              aria-hidden
              className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-gold"
            />
          </button>
          <Link href="/events/new" className="ml-1.5 hidden md:block">
            <Button size="md">Créer un événement</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
