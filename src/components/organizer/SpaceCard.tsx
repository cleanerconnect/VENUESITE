"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CHOOSER_LINE } from "@/lib/nav/dashboards";
import { cn } from "@/lib/utils/cn";

// The identity card above the nav, on both sidebars, and the one
// control in the chrome that moves between spaces.
//
// It used to be two things that looked alike. On the venue side it was
// `VenueSwitcher`: a menu of the account's establishments, plus a row
// to the event space when the account held one — and, under Lot 1,
// a card that did not open at all, because one owner per establishment
// has nothing to switch. On the event side it was a second menu
// listing the two workspaces. Two components, two menus, three states,
// and a partner who pressed the card got a different answer depending
// on which half of the product they were in.
//
// It is one link now, and it goes to `/choisir`. That screen already
// knows what the account holds and what it does not, it is the only
// place that can offer a space the account has *not* got, and a menu
// in a 260px column could never say the three sentences that make the
// choice answerable. The chevron is kept: it is what tells a partner
// the card is a door rather than a label.
//
// `/api/session/venue` is untouched. An account holding several
// establishments of one kind still picks between them where that
// question belongs — the login's own list, see `destinationFor` — and
// the route the switch went through is still the route.

/**
 * One establishment the account holds.
 *
 * Named for what it used to be for — switching between them from the
 * sidebar menu — and kept because it is the shape the shell passes
 * around: which venues an account holds, and which of them the screens
 * are showing. The switch itself is the chooser's now.
 */
export interface SwitchableVenue {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  city: string;
  kind: string;
  role: string;
}

export interface SpaceCardEntity {
  initials: string;
  shortName: string;
  subline: string;
}

export function SpaceCard({
  entity,
  rail = false,
}: {
  entity: SpaceCardEntity;
  /**
   * Whether the card is in the narrow column between 1024 and 1280,
   * where it is the initials and nothing else.
   */
  rail?: boolean;
}) {
  // Nothing behind the card yet.
  //
  // An account that has just been created holds no establishment, so
  // there is no name to print — and the card used to print the
  // *person's* initials with an empty line under them, which reads as
  // an establishment called nothing. It says what is true instead, and
  // the sentence under it is the chooser's own: a partner reads the
  // same words before and after pressing, which is how they know the
  // card and the screen are the same thing.
  const empty = entity.shortName.trim() === "";
  const title = empty ? "Aucun établissement" : entity.shortName;
  const subline = empty ? CHOOSER_LINE : entity.subline;

  return (
    <Link
      href="/choisir"
      data-space-card
      title={rail ? title : undefined}
      className={cn(
        "w-full flex items-center gap-2 bg-surface rounded-[var(--radius-md)] text-left hover:shadow-soft transition-shadow",
        rail ? "justify-center p-2 xl:justify-start xl:p-3" : "p-3",
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-[10px] flex items-center justify-center font-bold text-nav shrink-0",
          empty ? "bg-canvas-2 text-ink-mute" : "text-violet-deep",
        )}
        style={empty ? undefined : { background: "var(--color-violet-soft)" }}
      >
        {empty ? "+" : entity.initials}
      </div>
      <div className={cn("min-w-0 flex-1", rail && "hidden xl:block")}>
        <div className="text-nav text-ink truncate">{title}</div>
        {/* The empty state's line is a sentence rather than a label, so
            it wraps instead of being cut at « Un espace par activité.
            Vous… ». Every other state is a name and a city, which fits. */}
        <div
          className={cn(
            "text-meta text-ink-mute",
            empty ? "leading-snug mt-0.5" : "truncate",
          )}
        >
          {subline}
        </div>
      </div>
      <ChevronRight
        size={20}
        aria-hidden
        className={cn("text-ink-mute shrink-0", rail && "hidden xl:block")}
      />
    </Link>
  );
}
