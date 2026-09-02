"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";

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
}: {
  venues: SwitchableVenue[];
  activeVenueId: string;
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

  // One venue is not a choice — render the card without the menu.
  if (venues.length === 1) {
    return (
      <div className="w-full flex items-center gap-3 bg-surface rounded-[var(--radius-md)] p-3.5">
        <Avatar initials={active.initials} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[13px] font-semibold text-ink truncate">
            {active.shortName}
          </div>
          <div className="text-meta text-ink-mute truncate">{label(active)}</div>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={busy}
          className="w-full flex items-center gap-3 bg-surface rounded-[var(--radius-md)] p-3.5 text-left hover:shadow-soft transition-shadow disabled:opacity-60"
          aria-label={`Lieu actif : ${active.shortName}. Changer de lieu.`}
        >
          <Avatar initials={active.initials} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-ink truncate">
              {active.shortName}
            </div>
            <div className="text-meta text-ink-mute truncate">{label(active)}</div>
          </div>
          <ChevronRight size={14} className="text-ink-mute shrink-0" />
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
              className="flex items-center gap-2 px-3 h-11 rounded-[var(--radius-sm)] text-[13.5px] text-ink hover:bg-ink/[0.04] cursor-pointer outline-none"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{v.shortName}</div>
                <div className="text-meta text-ink-mute truncate">{label(v)}</div>
              </div>
              {v.id === activeVenueId ? (
                <Check size={14} strokeWidth={2} className="text-violet-deep shrink-0" />
              ) : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="h-9 w-9 rounded-[10px] flex items-center justify-center text-violet-deep font-bold text-[13px] shrink-0"
      style={{ background: "var(--color-violet-soft)" }}
    >
      {initials}
    </div>
  );
}
