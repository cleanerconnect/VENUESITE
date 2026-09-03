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

export interface WorkspaceAccess {
  event: boolean;
  venue: boolean;
}

const Ctx = createContext<WorkspaceAccess>({ event: true, venue: true });

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
