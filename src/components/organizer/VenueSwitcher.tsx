"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { ArrowLeftRight, Check, ChevronRight } from "lucide-react";

// The venue switcher.
//
// An account may hold more than one venue, so the shell shows which one
// is active and lets it change. The switch is a server round trip because
// the cookie it writes is re-checked against the user's access on every
// request — a client-only switch would be a suggestion the server ignores.

export interface SwitchableVenue {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  city: string;
  kind: string;
  role: string;
}

export function VenueSwitcher({
  venues,
  activeVenueId,
  eventSpaceHref,
}: {
  venues: SwitchableVenue[];
  activeVenueId: string;
  /** Set when the account also holds the event space. */
  eventSpaceHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = venues.find((v) => v.id === activeVenueId) ?? venues[0];
  if (!active) return null;

  const label = (v: SwitchableVenue) =>
    `${v.kind === "drinks" ? "Bar" : "Restaurant"} · ${v.city}`;

  const switchTo = async (venueId: string) => {
    if (venueId === activeVenueId) return;
    setBusy(true);
    const res = await fetch("/api/session/venue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  };

  // Always a menu, even for one venue. The event sidebar's identity card
  // always carries its chevron and always opens — it is the one control
  // that moves you between spaces — and this is the same card. With a
  // single venue the menu names it, ticked, and offers the other space
  // when the account holds it.
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={busy}
          className="w-full flex items-center gap-2 bg-surface rounded-[var(--radius-md)] p-3 text-left hover:shadow-soft transition-shadow disabled:opacity-60"
          aria-label={`Lieu actif : ${active.shortName}. Changer de lieu.`}
        >
          <Avatar initials={active.initials} />
          <div className="min-w-0 flex-1">
            <div className="text-nav font-semibold text-ink truncate">
              {active.shortName}
            </div>
            <div className="text-meta text-ink-mute truncate">
              {label(active)}
            </div>
          </div>
          <ChevronRight size={20} className="text-ink-mute shrink-0" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="min-w-[248px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
        >
          {venues.map((v) => (
            <DropdownMenu.Item
              key={v.id}
              onSelect={() => switchTo(v.id)}
              className="flex items-center gap-2 px-3 h-11 rounded-[var(--radius-sm)] text-nav text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{v.shortName}</div>
                <div className="text-meta text-ink-mute truncate">{label(v)}</div>
              </div>
              {v.id === activeVenueId ? (
                <Check size={20} strokeWidth={2} className="text-violet-deep shrink-0" />
              ) : null}
            </DropdownMenu.Item>
          ))}
          {eventSpaceHref ? (
            <>
              <DropdownMenu.Separator className="h-px bg-line-soft my-1" />
              <DropdownMenu.Item asChild>
                <Link
                  href={eventSpaceHref}
                  className="flex items-center gap-2 px-3 h-10 rounded-[var(--radius-sm)] text-nav text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
                >
                  <ArrowLeftRight size={20} strokeWidth={2} className="text-ink-mute" />
                  Espace événements
                </Link>
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="h-9 w-9 rounded-[10px] flex items-center justify-center text-violet-deep font-bold text-nav shrink-0"
      style={{ background: "var(--color-violet-soft)" }}
    >
      {initials}
    </div>
  );
}
