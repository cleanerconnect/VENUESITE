"use client";

// Which workspaces the signed-in account holds.
//
// Resolved server-side in the layout and published here, because three
// separate pieces of chrome need it — the desktop sidebar, the mobile
// drawer and the "Plus" sheet — and prop-drilling it through all three
// would mean the mobile ones silently kept the old, wrong default.
//
// The wrong default mattered: the switcher used to offer both
// workspaces unconditionally, so an event-only organiser was one click
// from a venue portal holding no venue of theirs.

import { createContext, useContext } from "react";
import type { VenueConfiguration } from "@/lib/types/venue-operations";
import type { Role } from "@/lib/auth/session";
import { DEFAULT_LOT, type Lot } from "@/lib/lot/shared";

export interface WorkspaceAccess {
  event: boolean;
  venue: boolean;
  /**
   * The active venue's configuration. Published here for the same reason
   * as the rest: the sidebar, the drawer and the Plus sheet all need it
   * to decide whether Vie nocturne exists, and a prop drilled through
   * three components is a prop two of them get wrong.
   */
  configuration: VenueConfiguration;
  /**
   * The lot this deployment runs. Published for the same reason as the
   * configuration — every piece of chrome filters its links on it, and
   * a link the router will 404 is worse than no link.
   */
  lot: Lot;
  /**
   * The signed-in viewer's role, as the server resolved it.
   *
   * Published for a sharper reason than the other three. Half the nav
   * declares `allow`, so a null role renders a nav with the middle cut
   * out of it — which is what the server used to send, because the
   * client hook that owns the role reads it in an effect and starts at
   * null. The two renders agreed on that null and the first paint was
   * correct, so the bug hid: the effect lands *during* hydration on a
   * slow connection, React re-renders a sidebar it has not finished
   * hydrating, and the tree it is matching against was built without a
   * role. That is the intermittent `#418` on Accueil and Réservations.
   *
   * The server knows the role — it is the same value `SessionSync` is
   * handed below. Giving it to the hook as its starting state makes the
   * first client render equal the server's, and the effect then has
   * nothing to change.
   */
  role: Role | null;
  /**
   * The active establishment, as an identity card.
   *
   * Published for the plainest of the four reasons: the phone « Plus »
   * screen draws an identity card and had no way to name the venue, so
   * it fell back to the organizer profile and named a festival at a
   * restaurant partner. The desktop sidebar gets the same facts as
   * props, from the same layout.
   */
  venueEntity: { initials: string; shortName: string; subline: string } | null;
}

const Ctx = createContext<WorkspaceAccess>({
  event: true,
  venue: true,
  configuration: "restaurant",
  lot: DEFAULT_LOT,
  role: null,
  venueEntity: null,
});

export function WorkspaceAccessProvider({
  value,
  children,
}: {
  value: WorkspaceAccess;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaceAccess(): WorkspaceAccess {
  return useContext(Ctx);
}
