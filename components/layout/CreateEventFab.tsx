"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPlus } from "./icons";

// Floating "Create Event" CTA. Sticky pill on mobile, bottom-right on desktop.
// Hidden inside the wizard itself.
export function CreateEventFab() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/events/new")) return null;
  return (
    <>
      {/* Mobile — pill at bottom right above the tab bar */}
      <Link
        href="/events/new"
        className="md:hidden fixed bottom-[78px] right-4 z-30 inline-flex items-center gap-1.5 h-11 px-4 bg-gradient-to-b from-[#1a1a1a] to-ink text-white text-sm font-medium rounded-full shadow-elevated"
      >
        <IconPlus />
        Créer
      </Link>
      {/* Desktop — bottom-right floating, refined elevation */}
      <Link
        href="/events/new"
        className="hidden md:inline-flex fixed bottom-7 right-7 z-30 items-center gap-2 h-12 px-6 bg-gradient-to-b from-[#1a1a1a] to-ink text-white text-sm font-medium rounded-full shadow-elevated hover:from-[#2a2a2a] transition-all duration-200 ease-out-expo hover:translate-y-[-1px]"
      >
        <IconPlus />
        Créer un événement
      </Link>
    </>
  );
}
