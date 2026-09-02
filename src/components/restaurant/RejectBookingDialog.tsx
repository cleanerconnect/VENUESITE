"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  REJECTION_REASONS,
  type RejectionReason,
} from "@/lib/types/business";
import { cn } from "@/lib/utils/cn";

// Refusing a booking captures a coded reason.
//
// The brief asks for a reason field so rejections can feed quality
// analytics. Free text alone cannot be aggregated — "complet", "on est
// plein", "full" are three strings and one fact — so the reason is a code
// and the note is the optional colour on top of it.

export interface RejectTarget {
  id: string;
  guestName: string;
}

export function RejectBookingDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: RejectTarget | null;
  onClose: () => void;
  onConfirm: (reason: RejectionReason, note: string) => void;
}) {
  const [reason, setReason] = useState<RejectionReason>("fully_booked");
  const [note, setNote] = useState("");

  const close = () => {
    setReason("fully_booked");
    setNote("");
    onClose();
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => (open ? null : close())}
      title="Refuser la demande"
      description={
        target
          ? `${target.guestName} sera prévenu dans l'application.`
          : undefined
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="text-eyebrow text-ink-mute mb-2.5">
            Motif du refus
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(REJECTION_REASONS) as RejectionReason[]).map((key) => {
              const active = key === reason;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReason(key)}
                  aria-pressed={active}
                  className={cn(
                    "text-left px-3.5 h-11 rounded-[var(--radius-sm)] border text-[13.5px] font-medium transition-colors",
                    active
                      ? "border-ink bg-violet-soft text-ink"
                      : "border-line bg-surface text-ink-soft hover:border-ink/40",
                  )}
                >
                  {REJECTION_REASONS[key]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="reject-note"
            className="text-eyebrow text-ink-mute block mb-2"
          >
            Précision (facultatif)
          </label>
          <Textarea
            id="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Visible par l'équipe uniquement."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={close}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(reason, note.trim());
              close();
            }}
          >
            Refuser la demande
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
