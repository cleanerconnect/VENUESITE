"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { getEventById } from "@/lib/mock/events";
import { useRole } from "@/lib/auth/role";
import { formatDateFR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";

// Edit / Corriger et resoumettre flow. When opened with ?reason=rejected,
// surfaces the rejection reason in a tint-rose callout and highlights every
// rejected field with a 2px danger border + inline message.
//
// Submission rolls the lifecycle back to in_review with a fresh 24h SLA.
// In the real product this reuses the new-event wizard; for the spec
// lock-in we ship a focused subset that proves the highlight + resubmit
// flow without requiring the full wizard surface.
export default function EditEventPage() {
  return (
    <Suspense fallback={null}>
      <EditEventInner />
    </Suspense>
  );
}

function EditEventInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const role = useRole();
  const { toast } = useToast();

  const event = useMemo(
    () => (params.id ? getEventById(params.id) : undefined),
    [params.id],
  );

  // Route guard — Scanner can't edit.
  useEffect(() => {
    if (role === "scanner") router.replace("/events");
  }, [role, router]);

  const isFromRejection = search.get("reason") === "rejected";
  const rejectedFields =
    event?.status.state === "rejected" ? event.status.reason : null;
  const rejectedFieldList =
    event?.status.state === "rejected" ? event.status.rejectedFields : [];
  const rejectedAt =
    event?.status.state === "rejected" ? event.status.rejectedAt : null;

  const [name, setName] = useState(event?.name ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [coverFile, setCoverFile] = useState<string | null>(null);

  if (!event) {
    return (
      <Card variant="surface" size="lg">
        <p className="text-body text-ink">Événement introuvable.</p>
      </Card>
    );
  }

  const isFieldRejected = (field: string) =>
    rejectedFieldList.includes(field);

  const handleSubmit = () => {
    toast({
      tone: "success",
      title: "Soumis à modération",
      description: "Réponse de l'équipe LYFE sous 24 heures.",
    });
    router.push(`/events/${event.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader eyebrow="Édition" title={event.name} />

      {isFromRejection && rejectedFields ? (
        <Card variant="rose" size="md">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="h-9 w-9 rounded-[12px] bg-canvas/60 flex items-center justify-center shrink-0"
            >
              <AlertTriangle
                size={18}
                strokeWidth={1.8}
                className="text-danger"
              />
            </span>
            <div className="flex-1">
              <div className="text-eyebrow text-danger">
                Motif du refus · {rejectedAt ? formatDateFR(rejectedAt) : "—"}
              </div>
              <p className="text-[14px] text-ink mt-2 leading-relaxed">
                {rejectedFields}
              </p>
              <p className="text-meta text-ink-soft mt-3">
                Les champs signalés sont surlignés ci-dessous. Corrigez-les
                puis soumettez à nouveau pour modération.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card variant="surface" size="lg">
        <div className="flex flex-col gap-5">
          <FieldShell flagged={isFieldRejected("description")}>
            <Textarea
              label="Description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {isFieldRejected("description") ? (
              <FieldFlag />
            ) : null}
          </FieldShell>

          <FieldShell flagged={isFieldRejected("name")}>
            <Input
              label="Nom de l'événement"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {isFieldRejected("name") ? <FieldFlag /> : null}
          </FieldShell>

          <FieldShell flagged={isFieldRejected("cover_image")}>
            <label className="text-eyebrow text-ink-soft block mb-1.5">
              Photo de couverture
            </label>
            <label
              className={cn(
                "block border-2 border-dashed rounded-[var(--radius-md)] p-6 cursor-pointer transition-colors",
                isFieldRejected("cover_image")
                  ? "border-danger bg-danger/[0.04]"
                  : "border-line hover:border-ink",
              )}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setCoverFile(e.target.files?.[0]?.name ?? null)
                }
              />
              <div className="text-[14px] text-ink font-semibold">
                {coverFile ?? "Choisir une image (1080×1350 recommandé)"}
              </div>
              <div className="text-meta text-ink-mute mt-1">
                JPEG ou PNG · max 4 Mo · ratio portrait préféré.
              </div>
            </label>
            {isFieldRejected("cover_image") ? <FieldFlag /> : null}
          </FieldShell>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button onClick={handleSubmit}>
          {isFromRejection ? "Resoumettre à modération" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

function FieldShell({
  flagged,
  children,
}: {
  flagged: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={flagged ? "rounded-[var(--radius-md)]" : ""}>
      <div
        className={cn(
          flagged
            ? "border-2 border-danger rounded-[var(--radius-md)] p-3 bg-danger/[0.03]"
            : "",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function FieldFlag() {
  return (
    <div className="text-meta text-danger mt-2 flex items-center gap-1.5">
      <AlertTriangle size={12} strokeWidth={2} />
      Ce champ a été signalé par l&apos;équipe LYFE.
    </div>
  );
}
