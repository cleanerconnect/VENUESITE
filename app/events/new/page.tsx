"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { StepInfo, type InfoState } from "@/components/wizard/StepInfo";
import {
  StepTiers,
  emptyTier,
  type DraftTier,
} from "@/components/wizard/StepTiers";
import { StepRefund } from "@/components/wizard/StepRefund";
import { StepMedia, type MediaState } from "@/components/wizard/StepMedia";
import { StepReview } from "@/components/wizard/StepReview";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [info, setInfo] = useState<InfoState>({
    name: "",
    description: "",
    category: "club_night",
    venueId: "v_blend",
    startDate: "",
    startTime: "",
    endTime: "",
    agePolicy: "18+",
    dressCode: "",
  });
  const [tiers, setTiers] = useState<DraftTier[]>([emptyTier()]);
  const [refundPolicy, setRefundPolicy] = useState<"auto" | "manual">("auto");
  const [media, setMedia] = useState<MediaState>({
    coverName: null,
    galleryNames: [],
    artists: [],
    partnerLogos: [],
  });

  // Auto-save every 5 s. Real impl: PATCH /events/{draftId} with the snapshot.
  const lastSnapshot = useRef("");
  useEffect(() => {
    const t = setInterval(() => {
      const snap = JSON.stringify({ info, tiers, refundPolicy, media });
      if (snap !== lastSnapshot.current) {
        setSaving(true);
        lastSnapshot.current = snap;
        setTimeout(() => setSaving(false), 600);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [info, tiers, refundPolicy, media]);

  const next = () => setStep((s) => Math.min(5, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setConfirmOpen(false);
      router.push("/events/evt_jardin_may"); // demo redirect to a pending event
    }, 800);
  };

  return (
    <WizardLayout
      step={step}
      saving={saving}
      onBack={step > 1 ? back : undefined}
      onNext={step < 5 ? next : () => setConfirmOpen(true)}
      nextLabel={step === 5 ? "Soumettre pour modération" : "Continuer"}
    >
      {step === 1 ? <StepInfo state={info} setState={setInfo} /> : null}
      {step === 2 ? <StepTiers tiers={tiers} setTiers={setTiers} /> : null}
      {step === 3 ? (
        <StepRefund value={refundPolicy} onChange={setRefundPolicy} />
      ) : null}
      {step === 4 ? <StepMedia state={media} setState={setMedia} /> : null}
      {step === 5 ? (
        <StepReview
          info={info}
          tiers={tiers}
          refundPolicy={refundPolicy}
          media={media}
          onJumpTo={setStep}
        />
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Soumettre pour modération"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Envoi…" : "Confirmer"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Votre événement sera examiné par l'équipe LYFE sous{" "}
          <strong>24 heures</strong>. Vous recevrez un email et une notification
          dans l'app dès qu'il sera approuvé — ou si nous avons besoin
          d'ajustements.
        </p>
        <p className="text-sm text-muted mt-3">
          Aucun billet ne sera mis en vente avant l'approbation.
        </p>
      </Modal>
    </WizardLayout>
  );
}
