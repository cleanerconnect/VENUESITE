"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPlus } from "./icons";

// Floating "Create Event" CTA. Sticky top on mobile, bottom-right on desktop.
// Hidden inside the wizard itself.
export function CreateEventFab() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/events/new")) return null;
  return (
    <>
      {/* Mobile — sticky banner at top of scroll area */}
      <Link
        href="/events/new"
        className="md:hidden fixed top-14 right-4 z-30 inline-flex items-center gap-2 h-10 px-4 bg-ink text-white text-sm shadow-card"
      >
        <IconPlus />
        Créer
      </Link>
      {/* Desktop — bottom-right floating */}
      <Link
        href="/events/new"
        className="hidden md:inline-flex fixed bottom-6 right-6 z-30 items-center gap-2 h-14 px-6 bg-ink text-white text-sm font-medium shadow-card hover:bg-ink/90"
      >
        <IconPlus />
        Créer un événement
      </Link>
    </>
  );
}
