"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/dashboard/primitives";
import { RoleGate } from "@/lib/auth/role";
import { restaurantHref } from "@/lib/restaurant/slugs";
import { resolveWorkspace } from "@/lib/nav/workspaces";
import { pathInLot } from "@/lib/nav/routes";
import { useWorkspaceAccess } from "@/lib/auth/workspace-access";
import { useChromeCommand } from "@/lib/nav/chrome-commands";
import { useScannerStore } from "@/lib/stores/scanner";
import { useAssistantStore } from "@/lib/stores/assistant";
import { useMobileNavStore } from "@/lib/stores/mobileNav";
import { useSearchStore } from "@/lib/stores/search";

// Search copy, the dark quick-action pill and the primary CTA all come
// from the active workspace. The keyboard shortcuts stay global because
// they are chrome, not product surface.
export function Topbar() {
  const pathname = usePathname();
  const workspace = resolveWorkspace(pathname);
  const { searchPlaceholder, primaryAction: topbarAction } = workspace.topbar;
  // The quick action is a shortcut to somewhere else. On the screen it
  // shortcuts to, it is a button that does what the page already does —
  // and the largest control on Check-in has to be Scanner le code, not a
  // pill in the chrome above it.
  const quickAction =
    workspace.topbar.quickAction?.command === "checkin.open" &&
    pathname.startsWith(restaurantHref("check-in"))
      ? undefined
      : workspace.topbar.quickAction;
  // The venue topbar's primary action opens the new-booking drawer,
  // which Lot 2 buys. It is gated on what it does rather than on where
  // it points: Réservations is a Lot 1 screen, and `?nouvelle=1` is the
  // one thing on it Lot 1 did not buy.
  const { lot } = useWorkspaceAccess();
  const primaryAction =
    topbarAction &&
    (lot === 2 || (pathInLot(topbarAction.href, lot) && !topbarAction.href.includes("nouvelle=")))
      ? topbarAction
      : undefined;

  const openScanner = useScannerStore((s) => s.setOpen);
  const openAssistant = useAssistantStore((s) => s.setOpen);
  const runQuickAction = useChromeCommand();
  const openDrawer = useMobileNavStore((s) => s.setDrawerOpen);

  // The one search box. A screen with a searchable list claims it and
  // supplies the placeholder; where none has, the box says what the
  // workspace searches and is inert, exactly as it was before.
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const scoped = useSearchStore((s) => s.placeholder);

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
      // Lot 1 does not mount the assistant, so the shortcut that opens
      // it would set a store nothing is listening to.
      if (lot === 2 && meta && !e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        openAssistant(true);
      }
      // The kbd hint has always said ⌘K; now there is a box for it to
      // land in.
      if (meta && !e.shiftKey && e.key.toLowerCase() === "k") {
        const box = document.getElementById("chrome-search");
        if (box instanceof HTMLInputElement && !box.disabled) {
          e.preventDefault();
          box.focus();
          box.select();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openScanner, openAssistant, lot]);

  // The topbar lives outside any screen's CommandProvider, so it maps its
  // own verbs — see lib/nav/chrome-commands.ts, where an unknown verb
  // warns rather than opening something arbitrary.

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
          <div className="relative w-full">
            <Search
              size={16}
              strokeWidth={1.8}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
            />
            <input
              id="chrome-search"
              type="search"
              value={scoped ? query : ""}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!scoped}
              placeholder={scoped ?? searchPlaceholder}
              aria-label={scoped ?? searchPlaceholder}
              className="w-full h-11 pl-11 pr-14 bg-surface rounded-full border border-line text-[13px] text-ink outline-none focus:border-ink transition-colors disabled:cursor-default"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-ink-mute bg-canvas-2 border border-line px-1.5 py-0.5 rounded pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 ml-auto">
          {quickAction ? (
            <button
              onClick={() => runQuickAction(quickAction.command)}
              title={quickAction.title ?? quickAction.label}
              className="inline-flex items-center gap-2 h-11 px-4 bg-ink text-canvas rounded-full text-[13px] font-bold hover:bg-ink-soft transition-colors group"
            >
              <Icon name={quickAction.icon} size={16} className="text-violet" />
              {quickAction.label}
              {quickAction.shortcut ? (
                <kbd className="hidden lg:inline text-[10px] font-semibold bg-canvas/10 px-1.5 py-0.5 rounded text-canvas/65 ml-0.5 group-hover:bg-canvas/15">
                  {quickAction.shortcut}
                </kbd>
              ) : null}
            </button>
          ) : null}

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

          {primaryAction ? (
            <RoleGate allow={primaryAction.allow ?? ["owner", "admin"]}>
              <Link href={primaryAction.href} className="ml-1.5">
                <Button size="md">{primaryAction.label}</Button>
              </Link>
            </RoleGate>
          ) : null}
        </div>
      </div>
    </header>
  );
}
