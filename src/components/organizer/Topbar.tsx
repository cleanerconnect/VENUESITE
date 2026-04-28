"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bell, Menu, ScanLine, Search } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/Button";
import { RoleGate } from "@/lib/auth/role";
import { useScannerStore } from "@/lib/stores/scanner";
import { useAssistantStore } from "@/lib/stores/assistant";
import { useMobileNavStore } from "@/lib/stores/mobileNav";

export function Topbar() {
  const openScanner = useScannerStore((s) => s.setOpen);
  const openAssistant = useAssistantStore((s) => s.setOpen);
  const openDrawer = useMobileNavStore((s) => s.setDrawerOpen);

  // Global keyboard shortcuts:
  // ⌘+Shift+S  → scanner
  // ⌘+J         → AI assistant (⌘+K is already the search-bar shortcut)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        openScanner(true);
      }
      if (meta && !e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        openAssistant(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openScanner, openAssistant]);

  return (
    <header className="sticky top-0 z-20 h-14 md:h-[72px] bg-canvas/80 backdrop-blur-md border-b border-line-soft">
      <div className="h-full max-w-[1440px] mx-auto px-4 md:px-8 flex items-center gap-3 md:gap-4">
        {/* === MOBILE: hamburger + centered wordmark + bell === */}
        <button
          type="button"
          onClick={() => openDrawer(true)}
          aria-label="Ouvrir le menu"
          className="md:hidden h-10 w-10 -ml-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink transition-colors"
        >
          <Menu size={20} strokeWidth={1.7} />
        </button>

        <div className="md:hidden flex-1 flex justify-center">
          <Brand height={26} />
        </div>

        <button
          aria-label="Notifications"
          className="md:hidden relative h-10 w-10 -mr-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink transition-colors"
        >
          <Bell size={18} strokeWidth={1.6} />
          <span
            aria-hidden
            className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-canvas"
          />
        </button>

        {/* === DESKTOP: search + scanner + bell + create CTA === */}
        <div className="hidden md:flex flex-1 max-w-[480px]">
          <button className="group w-full h-11 px-4 bg-surface rounded-full border border-line flex items-center gap-3 text-left hover:border-ink/40 transition-colors">
            <Search size={16} className="text-ink-mute" strokeWidth={1.8} />
            <span className="flex-1 text-[13px] text-ink-mute">
              Rechercher un événement, un participant…
            </span>
            <kbd className="text-[11px] font-semibold text-ink-mute bg-canvas-2 border border-line px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 ml-auto">
          <button
            onClick={() => openScanner(true)}
            title="Scanner, ⌘ + Shift + S"
            className="inline-flex items-center gap-2 h-11 px-4 bg-ink text-canvas rounded-full text-[13px] font-bold hover:bg-ink-soft transition-colors group"
          >
            <ScanLine size={16} strokeWidth={1.8} className="text-violet" />
            Scanner
            <kbd className="hidden lg:inline text-[10px] font-semibold bg-canvas/10 px-1.5 py-0.5 rounded text-canvas/65 ml-0.5 group-hover:bg-canvas/15">
              ⌘⇧S
            </kbd>
          </button>

          <button
            aria-label="Notifications"
            className="relative h-10 w-10 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink transition-colors"
          >
            <Bell size={18} strokeWidth={1.6} />
            <span
              aria-hidden
              className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-violet"
            />
          </button>

          <RoleGate>
            <Link href="/events/new" className="ml-1.5">
              <Button size="md">Créer un événement</Button>
            </Link>
          </RoleGate>
        </div>
      </div>
    </header>
  );
}
