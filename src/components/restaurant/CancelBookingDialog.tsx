"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  CANCELLATION_REASONS,
  type CancellationReason,
} from "@/lib/types/business";
import { cn } from "@/lib/utils/cn";

// Giving back a table the venue had already accepted.
//
// Beside `RejectBookingDialog` rather than inside it, because the two
// decisions only look alike. Refusing a request answers a question the
// guest asked; cancelling an accepted booking takes back an answer
// already given, so the reason list is different (§ `CancellationReason`),
// the state written is `cancelled` rather than `rejected`, and the guest
// is told rather than merely answered.
//
// Two differences from the refusal dialog, both deliberate:
//
//   · **The reason is required.** The refusal dialog opens with
//     « Complet sur ce créneau » pre-selected, so a reason is always
//     set and nobody has to choose one. Here nothing is selected and
//     the button stays disabled until something is: a venue that
//     cancels an accepted table has to say why, and a default is a way
//     of not saying.
//   · **The confirmation names the guest and the hour.** It is the one
//     decision on this screen the guest did not ask for, and the sheet
//     it is reached from is where their name and telephone number are
//     on screen — which is the whole reason it lives there and not on
//     the line.

export interface CancelTarget {
  id: string;
  guestName: string;
  when?: string;
}

export function CancelBookingDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: CancelTarget | null;
  onClose: () => void;
  onConfirm: (reason: CancellationReason, note: string) => void;
}) {
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [note, setNote] = useState("");

  const close = () => {
    setReason(null);
    setNote("");
    onClose();
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => (open ? null : close())}
      title="Annuler la réservation"
      description={
        target
          ? `${target.guestName}${
              target.when ? ` · ${target.when}` : ""
            } sera prévenu de l'annulation.`
          : undefined
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="text-eyebrow text-ink-mute mb-2">
            Motif de l&apos;annulation
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(CANCELLATION_REASONS) as CancellationReason[]).map(
              (key) => {
                const active = key === reason;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(key)}
                    aria-pressed={active}
                    className={cn(
                      "text-left px-4 h-11 rounded-[var(--radius-sm)] border text-meta font-medium transition-colors",
                      active
                        ? "border-ink bg-violet-soft text-ink"
                        : "border-line bg-surface text-ink-soft hover:border-ink/40",
                    )}
                  >
                    {CANCELLATION_REASONS[key]}
                  </button>
                );
              },
            )}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="cancel-note"
            className="text-eyebrow text-ink-mute block mb-2"
          >
            Précision (facultatif)
          </label>
          <Textarea
            id="cancel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Visible par l'équipe uniquement."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={close}>
            Revenir
          </Button>
          <Button
            variant="destructive"
            // Not « Annuler » beside a « Revenir » that also cancels:
            // the word means two opposite things on this screen, and
            // the destructive one is the booking.
            disabled={reason === null}
            onClick={() => {
              if (reason === null) return;
              onConfirm(reason, note.trim());
              close();
            }}
          >
            Annuler la réservation
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
