"use client";

import { create } from "zustand";
import type { FormSpec } from "@/lib/dashboard/spec";

// The open form, if any.
//
// One store per screen's worth of dialogs rather than a dialog per
// command: every form is the same surface with different fields, and
// mounting thirty of them so that one can open is thirty subscriptions
// for nothing.

export type FormPayload = Record<string, string | number | boolean>;

interface FormDialogState {
  spec: FormSpec | null;
  /** The button's own payload — an id, a date — merged under the values. */
  payload: FormPayload;
  open: (spec: FormSpec, payload?: FormPayload) => void;
  close: () => void;
}

export const useFormDialog = create<FormDialogState>((set) => ({
  spec: null,
  payload: {},
  open: (spec, payload = {}) => set({ spec, payload }),
  close: () => set({ spec: null, payload: {} }),
}));
