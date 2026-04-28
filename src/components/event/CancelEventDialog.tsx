"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatMAD } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";

// Anti-misclick cancellation flow. Organizer must type the event's
// exact name to confirm. The total refund amount is computed live from
// the event's actual sales so the cost of the action is unmistakable.
export function CancelEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: LyfeEvent;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");

  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  // Customer-facing total = face value + 5.8% Moroccan service fee. This
  // is what gets refunded if the organizer cancels.
  const refundTotalMad = event.tiers.reduce(
    (s, t) => s + Math.round(t.sold * t.faceValueMad * 1.058),
    0,
  );

  const canConfirm = confirmName.trim() === event.name.trim();

  const handleConfirm = () => {
    onOpenChange(false);
    setConfirmName("");
    setReason("");
    toast({
      tone: "danger",
      title: `${sold} remboursements en cours de traitement`,
      description: `Annulation : ${event.name}.`,
    });
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setConfirmName("");
          setReason("");
        }
      }}
      title="Annuler cet événement ?"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Garder l&apos;événement
          </Button>
          <Button
            variant="destructive"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Annuler définitivement
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="h-9 w-9 rounded-[12px] bg-tint-rose flex items-center justify-center shrink-0"
          >
            <AlertTriangle
              size={18}
              strokeWidth={1.8}
              className="text-danger"
            />
          </span>
          <p className="text-[14px] text-ink leading-relaxed">
            En annulant cet événement, vous déclenchez le remboursement
            automatique de tous les billets vendus — montant nominal plus
            frais de service — pour un total de{" "}
            <strong className="text-ink num">
              {formatMAD(refundTotalMad)}
            </strong>{" "}
            sur <strong className="text-ink num">{sold} acheteurs</strong>.
            Cette action est irréversible.
          </p>
        </div>

        <Input
          label={`Tapez « ${event.name} » pour confirmer`}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={event.name}
        />

        <Textarea
          label="Motif (optionnel)"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Inclus dans l'email de notification envoyé aux acheteurs."
        />
      </div>
    </Dialog>
  );
}
