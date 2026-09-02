"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WriteResult } from "./result";
import type { FieldError } from "./validation";

// One hook behind every editable surface.
//
// The contract the brief asks for: apply the change immediately, roll the
// value back if the write fails, and show the user which of those
// happened. The rollback matters most — a UI that keeps showing an edit
// the server refused is telling the user something untrue, and they will
// only find out when they come back tomorrow and it is gone.

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface OptimisticForm<T> {
  value: T;
  /** Local edits, applied immediately. */
  set: <K extends keyof T>(key: K, next: T[K]) => void;
  setAll: (next: T) => void;
  /** True once the value differs from what the server last confirmed. */
  dirty: boolean;
  state: SaveState;
  /** Server-side message when the whole write failed. */
  message: string | null;
  errorFor: (field: keyof T & string) => string | null;
  save: () => Promise<boolean>;
  reset: () => void;
}

const SAVED_VISIBLE_MS = 2_400;

export function useOptimisticForm<T extends object, R>({
  initial,
  submit,
  onSuccess,
}: {
  initial: T;
  submit: (value: T) => Promise<WriteResult<R>>;
  onSuccess?: (data: R) => void;
}): OptimisticForm<T> {
  const [value, setValue] = useState<T>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // The last value the server confirmed. Rollback target, and the
  // baseline `dirty` compares against.
  const committed = useRef<T>(initial);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A fresh payload from the server (a venue switch, someone else's edit)
  // resets the baseline. Compared by value, not identity: a successful
  // save calls revalidatePath, which re-renders this component with a new
  // object carrying the values we just saved. Resetting on identity would
  // wipe the "Enregistré" confirmation the save just earned.
  useEffect(() => {
    if (JSON.stringify(initial) === JSON.stringify(committed.current)) return;
    committed.current = initial;
    setValue(initial);
    setErrors([]);
    setMessage(null);
    setState("idle");
  }, [initial]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const set = useCallback(<K extends keyof T>(key: K, next: T[K]) => {
    setValue((prev) => ({ ...prev, [key]: next }));
    // Clearing the field's error as it is edited keeps a stale complaint
    // from sitting under a field the user has already fixed.
    setErrors((prev) => prev.filter((e) => e.field !== String(key)));
    setState("idle");
    setMessage(null);
  }, []);

  const setAll = useCallback((next: T) => {
    setValue(next);
    setState("idle");
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const attempted = value;
    setState("saving");
    setErrors([]);
    setMessage(null);

    let result: WriteResult<R>;
    try {
      result = await submit(attempted);
    } catch {
      // Network failure is indistinguishable from a rejected write as far
      // as the UI is concerned: neither saved, so neither may be shown as
      // if it had.
      setValue(committed.current);
      setState("error");
      setMessage("La connexion a échoué. Rien n'a été enregistré.");
      return false;
    }

    if (!result.ok) {
      setValue(committed.current);
      setState("error");
      setErrors(result.errors);
      setMessage(
        result.message ??
          (result.errors.length
            ? "Corrigez les champs signalés."
            : "L'enregistrement a échoué."),
      );
      return false;
    }

    committed.current = attempted;
    setState("saved");
    onSuccess?.(result.data);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setState("idle"), SAVED_VISIBLE_MS);
    return true;
  }, [onSuccess, submit, value]);

  const reset = useCallback(() => {
    setValue(committed.current);
    setErrors([]);
    setMessage(null);
    setState("idle");
  }, []);

  const errorFor = useCallback(
    (field: keyof T & string) =>
      errors.find((e) => e.field === field)?.message ?? null,
    [errors],
  );

  return {
    value,
    set,
    setAll,
    dirty: JSON.stringify(value) !== JSON.stringify(committed.current),
    state,
    message,
    errorFor,
    save,
    reset,
  };
}
