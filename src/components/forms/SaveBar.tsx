"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SaveState } from "@/lib/forms/useOptimisticForm";
import { COPY } from "@/lib/copy/fr";

// The visible saved state.
//
// Sticky, because a form long enough to scroll should not hide whether it
// has been saved. "Enregistré" is held briefly and then fades — a
// permanent tick stops meaning anything.
export function SaveBar({
  state,
  dirty,
  message,
  onSave,
  onReset,
}: {
  state: SaveState;
  dirty: boolean;
  message: string | null;
  onSave: () => void;
  onReset: () => void;
}) {
  const saving = state === "saving";

  return (
    // `pt-6` rather than `pt-3`: the gradient has to be tall enough that
    // the field above fades out under it instead of being clipped by it.
    <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-1 pt-6 bg-gradient-to-t from-canvas via-canvas to-transparent">
      <div className="flex items-center gap-3 flex-wrap border border-line bg-surface rounded-[var(--radius-md)] px-4 py-3">
        <div className="flex-1 min-w-[180px] text-meta" role="status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {state === "saved" ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="inline-flex items-center gap-1.5 text-success font-semibold"
              >
                <Check size={14} strokeWidth={2.2} /> {COPY.form.saved}
              </motion.span>
            ) : state === "error" ? (
              <motion.span
                key="error"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="inline-flex items-start gap-1.5 text-danger font-semibold"
              >
                <TriangleAlert size={14} strokeWidth={2.2} className="mt-[1px] shrink-0" />
                {message ?? COPY.form.savingFailed}
              </motion.span>
            ) : dirty ? (
              <motion.span
                key="dirty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-ink-mute"
              >
                {COPY.form.unsaved}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-ink-mute"
              >
                À jour
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {dirty ? (
          <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
            {COPY.action.cancel}
          </Button>
        ) : null}
        <Button
          size="sm"
          onClick={onSave}
          disabled={!dirty || saving}
          iconLeft={
            saving ? <Loader2 size={14} strokeWidth={2.2} className="animate-spin" /> : undefined
          }
        >
          {saving ? COPY.action.saving : COPY.action.save}
        </Button>
      </div>
    </div>
  );
}
