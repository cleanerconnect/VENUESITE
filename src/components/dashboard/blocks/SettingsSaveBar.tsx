"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/copy/fr";
import { useSettingsDraft } from "@/lib/stores/settings-draft";
import { useCommandRunner } from "../commands";

// One Enregistrer for the screen.
//
// A settings screen is one form even when it is drawn as four cards, and
// a host who has just changed the opening time, the capacity and the
// cut-off is looking for one button, at the bottom, that says the word.
// Per-row writes gave them none: the edits had already left, and the only
// confirmation was a six-word flash beside a label they had scrolled past.
//
// So the rows stage into the draft store and this sends them together.
// Sticky, because a screen long enough to scroll should not hide whether
// it has been saved, and "Enregistré" is held briefly and then fades — a
// permanent tick stops meaning anything.
export function SettingsSaveBar() {
  const run = useCommandRunner();
  const edits = useSettingsDraft((s) => s.edits);
  const state = useSettingsDraft((s) => s.state);
  const setState = useSettingsDraft((s) => s.setState);
  const discard = useSettingsDraft((s) => s.discard);
  const clear = useSettingsDraft((s) => s.clear);

  // Drafts belong to the screen that staged them. Leaving it throws them
  // away rather than carrying them to the next screen's save button.
  useEffect(() => clear, [clear]);

  useEffect(() => {
    if (state !== "saved") return;
    const timer = setTimeout(() => setState("idle"), 2400);
    return () => clearTimeout(timer);
  }, [state, setState]);

  const pending = Object.entries(edits);
  const dirty = pending.length > 0;
  const saving = state === "saving";

  const save = () => {
    setState("saving");
    for (const [, edit] of pending) {
      run(edit.command, { ...edit.payload, value: edit.value });
    }
    clear();
    setState("saved");
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-1 pt-6 bg-gradient-to-t from-canvas via-canvas to-transparent">
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3">
        <div
          className="min-w-[180px] flex-1 text-[14px]"
          role="status"
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            {state === "saved" ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="inline-flex items-center gap-1.5 font-semibold text-success"
              >
                <Check size={16} strokeWidth={2.4} /> {COPY.form.saved}
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
                {pending.length === 1
                  ? "1 modification non enregistrée"
                  : `${pending.length} modifications non enregistrées`}
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
          <Button variant="ghost" onClick={discard} disabled={saving}>
            {COPY.action.cancel}
          </Button>
        ) : null}
        <Button
          onClick={save}
          disabled={!dirty || saving}
          iconLeft={
            saving ? (
              <Loader2 size={16} strokeWidth={2.2} className="animate-spin" />
            ) : undefined
          }
        >
          {saving ? COPY.action.saving : COPY.action.save}
        </Button>
      </div>
    </div>
  );
}
