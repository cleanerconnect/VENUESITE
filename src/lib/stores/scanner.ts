import { create } from "zustand";

// Global scanner state, open/closed, currently chosen event, scanned count.
// Persists through navigation so reopening the modal jumps straight back
// into scanning the same event for the rest of the session.
interface ScannerState {
  open: boolean;
  selectedEventId: string | null;
  scannedCount: number;
  totalCount: number;
  cameraAvailable: boolean | null; // null = not yet detected
  setOpen: (open: boolean) => void;
  toggle: () => void;
  selectEvent: (id: string | null, total: number) => void;
  registerScan: () => void;
  setCameraAvailable: (available: boolean) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  open: false,
  selectedEventId: null,
  scannedCount: 247, // mock starting count
  totalCount: 500,
  cameraAvailable: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  selectEvent: (id, total) =>
    set({ selectedEventId: id, totalCount: total, scannedCount: 247 }),
  registerScan: () =>
    set((s) => ({
      scannedCount: Math.min(s.totalCount, s.scannedCount + 1),
    })),
  setCameraAvailable: (cameraAvailable) => set({ cameraAvailable }),
}));
