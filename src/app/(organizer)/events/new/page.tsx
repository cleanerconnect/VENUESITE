"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { StepInfo } from "@/components/wizard/StepInfo";
import { StepTiers, emptyTier } from "@/components/wizard/StepTiers";
import { StepRefund } from "@/components/wizard/StepRefund";
import { StepMedia } from "@/components/wizard/StepMedia";
import { StepReview } from "@/components/wizard/StepReview";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useRole } from "@/lib/auth/role";
import type { DraftEvent } from "@/lib/types/domain";

const INITIAL_DRAFT: DraftEvent = {
  // Smart defaults, date pre-fills the next Friday at 23:00 because the
  // mock organizer's history skews to Friday club nights.
  name: "",
  description: "",
  category: "club_night",
  venueId: "v_mansour",
  startDate: nextFridayISO(),
  startTime: "23:00",
  endTime: "04:00",
  agePolicy: "21+",
  dressCode: "",
  tiers: [emptyTier()],
  refundPolicy: "auto",
  coverName: null,
  galleryNames: [],
  artists: [],
  partnerLogos: [],
};

function nextFridayISO() {
  const d = new Date();
  const day = d.getDay();
  const offset = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CreateEventPage() {
  const router = useRouter();
  const role = useRole();
  // Route-level guard: Scanner role can't create events. Bounce to /events.
  useEffect(() => {
    if (role === "scanner") router.replace("/events");
  }, [role, router]);
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [visited, setVisited] = useState(1);
  const [draft, setDraft] = useState<DraftEvent>(INITIAL_DRAFT);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [smartDefaultActive, setSmartDefaultActive] = useState(true);

  // Autosave every 5s, flips the saving badge for ~600ms on each diff.
  const lastSnap = useRef("");
  useEffect(() => {
    const t = setInterval(() => {
      const snap = JSON.stringify(draft);
      if (snap !== lastSnap.current) {
        lastSnap.current = snap;
        setSaving(true);
        setTimeout(() => setSaving(false), 600);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [draft]);

  const next = () => {
    if (step < 5) {
      setStep(step + 1);
      setVisited(Math.max(visited, step + 1));
    } else {
      setConfirmOpen(true);
    }
  };
  const back = () => setStep(Math.max(1, step - 1));

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setConfirmOpen(false);
      toast({
        tone: "success",
        title: "Événement soumis",
        description:
          "L'équipe LYFE répond sous 24 h. Vous recevrez un email à validation.",
      });
      router.push("/events");
    }, 700);
  };

  const stepRender = () => {
    if (step === 1)
      return (
        <StepInfo
          draft={draft}
          setDraft={setDraft}
          smartDefaultActive={smartDefaultActive}
          dismissSmartDefault={() => setSmartDefaultActive(false)}
        />
      );
    if (step === 2) return <StepTiers draft={draft} setDraft={setDraft} />;
    if (step === 3)
      return (
        <StepRefund
          value={draft.refundPolicy}
          onChange={(v) => setDraft({ ...draft, refundPolicy: v })}
        />
      );
    if (step === 4) return <StepMedia draft={draft} setDraft={setDraft} />;
    return <StepReview draft={draft} onJumpTo={(n) => setStep(n)} />;
  };

  return (
    <>
      <WizardLayout
        step={step}
        setStep={(n) => {
          if (n <= visited) setStep(n);
        }}
        visited={visited}
        saving={saving}
        onBack={step > 1 ? back : undefined}
        onNext={next}
        nextLabel={step === 5 ? "Soumettre pour modération" : "Continuer"}
        wide={step === 5}
      >
        {stepRender()}
      </WizardLayout>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Soumettre pour modération"
        description="L'équipe LYFE répond sous 24 h."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Pas encore
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Envoi…" : "Confirmer la soumission"}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-4 bg-violet-soft rounded-[var(--radius-md)] p-5">
          <span
            aria-hidden
            className="h-10 w-10 rounded-full bg-canvas flex items-center justify-center shrink-0"
          >
            <Sparkles size={18} strokeWidth={1.8} className="text-violet-deep" />
          </span>
          <div className="flex-1 text-[14px] text-ink leading-relaxed">
            <p className="font-semibold mb-2">Ce qui va se passer :</p>
            <ol className="space-y-1.5 list-decimal pl-4 text-ink-soft">
              <li>Notre équipe vérifie l'événement (24 h max).</li>
              <li>
                Email + notification dans l'app dès qu'il est approuvé, ou si
                un détail demande un ajustement.
              </li>
              <li>Mise en vente immédiate après validation.</li>
            </ol>
          </div>
        </div>
        <p className="text-meta text-ink-mute mt-4 text-center">
          Aucun billet n'est mis en vente avant l'approbation.
        </p>
      </Dialog>
    </>
  );
}
