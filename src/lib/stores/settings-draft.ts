"use client";

import { create } from "zustand";

// The edits a settings screen is holding but has not sent.
//
// Every settings row used to write on change: move a switch, a command
// goes out, a small "Enregistré" appears beside that one label. Correct,
// and unreadable — a host who has just changed four fields has no way to
// tell which of them took, and nothing on the screen looks like the
// Enregistrer button they were looking for.
//
// So the rows stage instead. Each edit lands here under the row's id, the
// screen grows one filled Enregistrer at the bottom, and pressing it
// dispatches them in the order they were made. Keying by row id means
// changing the same field twice sends one write, not two.
//
// It lives in a store rather than in the renderer's state because the
// rows and the button are in different blocks — on Disponibilités, in
// four of them.

export type DraftValue = string | number | boolean;

export interface DraftEdit {
  command: string;
  payload: Record<string, DraftValue>;
  value: DraftValue;
}

export type DraftState = "idle" | "saving" | "saved";

interface SettingsDraft {
  edits: Record<string, DraftEdit>;
  state: DraftState;
  /** Bumped on discard, so rows re-sync to the server's value. */
  revision: number;
  stage: (id: string, edit: DraftEdit) => void;
  discard: () => void;
  setState: (state: DraftState) => void;
  /** Clears the screen's drafts — on save, and on unmount. */
  clear: () => void;
}

export const useSettingsDraft = create<SettingsDraft>((set) => ({
  edits: {},
  state: "idle",
  revision: 0,
  stage: (id, edit) =>
    set((s) => ({ edits: { ...s.edits, [id]: edit }, state: "idle" })),
  discard: () =>
    set((s) => ({ edits: {}, state: "idle", revision: s.revision + 1 })),
  setState: (state) => set({ state }),
  clear: () => set({ edits: {}, state: "idle" }),
}));
