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
}

const Ctx = createContext<WorkspaceAccess>({
  event: true,
  venue: true,
  configuration: "restaurant",
  lot: DEFAULT_LOT,
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
