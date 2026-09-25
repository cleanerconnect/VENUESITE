import { create } from "zustand";
import type { DetailSpec } from "@/lib/dashboard/spec";

// Which detail sheet is open, if any.
//
// A store rather than props because the trigger lives arbitrarily deep
// inside a rendered spec — a row in a list inside a split inside a
// group — and threading a callback down that tree would put presentation
// state back into the block components the renderer works to keep dumb.
interface DetailState {
  spec: DetailSpec | null;
  open: (spec: DetailSpec) => void;
  close: () => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  spec: null,
  open: (spec) => set({ spec }),
  close: () => set({ spec: null }),
}));
