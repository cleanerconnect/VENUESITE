import { create } from "zustand";

// Venue check-in sheet, open/closed.
//
// Separate from the event scanner store: that one counts tickets against
// an event's quota, this one resolves a code against the day's book.
// Sharing one store would mean one of the two carrying fields the other
// has no use for.
interface CheckInState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCheckInStore = create<CheckInState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
