"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SaveState } from "@/lib/forms/useOptimisticForm";
import { COPY } from "@/lib/copy/fr";

/**
 * Where a save bar sits, on both of the portal's two of them.
 *
 * Pinned to the bottom of the viewport for as long as the form is
 * taller than it, so a partner who has scrolled into the middle of Ma
 * fiche can still see whether their work is saved and still reach the
 * button that saves it.
 *
 * Three details the two bars used to get wrong separately:
 *
 * · `bottom-20` under `md`. The phone shell fixes a 76px tab bar to the
 *   bottom of the window, so a bar pinned at `bottom-0` parks itself
 *   behind it and the partner taps Réservations instead of Enregistrer.
 * · `pointer-events-none` on the gradient, `auto` on the card. The
 *   gradient is tall on purpose — the field above has to fade under it
 *   rather than be clipped by it — but it is transparent, and a
 *   transparent thing that swallows clicks is a field the partner
 *   cannot reach. It swallowed one: `edges.mjs` timed out clicking a
 *   control the bar was lying over.
 * · One string, exported, so the two bars cannot drift apart again.
 */
export const SAVE_BAR_SHELL =
  "sticky bottom-20 md:bottom-0 z-10 -mx-1 px-1 pb-1 pt-6 pointer-events-none " +
  "bg-gradient-to-t from-canvas via-canvas to-transparent";

export const SAVE_BAR_CARD =
  "pointer-events-auto flex items-center gap-3 flex-wrap border border-line " +
  "bg-surface rounded-[var(--radius-md)] px-4 py-3";

// The visible saved state.
//
// Sticky, because a form long enough to scroll should not hide whether it
// has been saved. "Enregistré" is held briefly and then fades — a
// permanent tick stops meaning anything.
export function SaveBar({
  state,
  dirty,
  dirtyCount,
  message,
  onSave,
  onReset,
}: {
  state: SaveState;
  dirty: boolean;
  /**
   * How many fields are waiting. Optional only so a caller that has no
   * count — the styleguide specimen — can still render the bar.
   */
  dirtyCount?: number;
  message: string | null;
  onSave: () => void;
  onReset: () => void;
}) {
  const saving = state === "saving";

  return (
    <div className={SAVE_BAR_SHELL}>
      <div className={SAVE_BAR_CARD}>
        <div className="flex-1 min-w-[180px] text-body" role="status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {state === "saved" ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="inline-flex items-center gap-2 text-success font-semibold"
              >
                <Check size={16} strokeWidth={2} /> {COPY.form.saved}
              </motion.span>
            ) : state === "error" ? (
              <motion.span
                key="error"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="inline-flex items-start gap-2 text-danger font-semibold"
              >
                <TriangleAlert size={16} strokeWidth={2} className="mt-[1px] shrink-0" />
                {message ?? COPY.form.savingFailed}
              </motion.span>
            ) : dirty ? (
              <motion.span
                key="dirty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-ink-soft"
              >
                {typeof dirtyCount === "number"
                  ? COPY.form.unsavedCount(dirtyCount)
                  : COPY.form.unsaved}
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
          <Button variant="ghost" onClick={onReset} disabled={saving}>
            {COPY.action.cancel}
          </Button>
        ) : null}
        {/* 44px and filled: the one button on the screen that commits
            what the host just typed should be the easiest thing on it to
            hit. */}
        <Button
          onClick={onSave}
          disabled={!dirty || saving}
          iconLeft={
            saving ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : undefined
          }
        >
          {saving ? COPY.action.saving : COPY.action.save}
        </Button>
      </div>
    </div>
  );
}
