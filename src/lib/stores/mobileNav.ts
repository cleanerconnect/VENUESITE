import { create } from "zustand";

// Mobile sidebar drawer — opened by the topbar hamburger on screens
// below 768px. Lives in a global store so the trigger (Topbar) and
// the surface (SidebarMobileDrawer) can be in different parts of the
// tree without prop drilling.
interface MobileNavState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useMobileNavStore = create<MobileNavState>((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggle: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
}));
