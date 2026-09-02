"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { saveSlot, saveClosure, deleteClosure } from "@/app/actions/venue";
import type { AvailabilitySlot, VenueAvailability } from "@/lib/types/business";
import { validateSlot } from "@/lib/forms/validation";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Opening hours, per slot.
//
// Each row saves on its own rather than the page saving as a whole: this
// is the edit that changes what customers can book right now, and a
// page-wide save would rewrite fourteen slots to change one — which is
// exactly how a colleague's concurrent edit gets clobbered.
export function OpeningHoursForm({ initial }: { initial: VenueAvailability }) {
  const [availability, setAvailability] = useState(initial);

  return (
    <div className="space-y-5">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Horaires d&apos;ouverture</h2>
        <p className="text-meta text-ink-mute mb-5">
          Chaque créneau est enregistré séparément. Les modifications sont
          répercutées immédiatement sur ce que l&apos;application propose.
        </p>

        <div className="flex flex-col gap-2.5">
          {availability.slots.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              onSaved={(next) => setAvailability(next)}
            />
          ))}
        </div>
      </Card>

      <ClosuresCard
        availability={availability}
        onChanged={(next) => setAvailability(next)}
      />
    </div>
  );
}

function SlotRow({
  slot,
  onSaved,
}: {
  slot: AvailabilitySlot;
  onSaved: (next: VenueAvailability) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(slot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    draft.opensAt !== slot.opensAt ||
    draft.closesAt !== slot.closesAt ||
    draft.capacity !== slot.capacity ||
    draft.enabled !== slot.enabled;

  const commit = async (next: AvailabilitySlot) => {
    const problems = validateSlot(next);
    if (problems.length) {
      setError(problems[0].message);
      return;
    }
    setError(null);
    setSaving(true);
    // Optimistic: the row already shows `next`.
    const result = await saveSlot({
      slotId: next.id,
      opensAt: next.opensAt,
      closesAt: next.closesAt,
      capacity: next.capacity,
      enabled: next.enabled,
    });
    setSaving(false);

    if (!result.ok) {
      // Roll back to what the server last confirmed.
      setDraft(slot);
      setError(result.message ?? result.errors[0]?.message ?? "Échec.");
      toast({ tone: "danger", title: "Créneau non enregistré", description: result.message });
      return;
    }
    onSaved(result.data);
    toast({ tone: "success", title: "Créneau enregistré" });
  };

  return (
    <div
      className={cn(
        "border rounded-[var(--radius-sm)] p-3 transition-colors",
        error ? "border-danger/50" : "border-line",
        draft.enabled ? "bg-surface" : "bg-canvas-2",
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-24 shrink-0 text-[13.5px] font-semibold text-ink">
          {WEEKDAYS[draft.weekday - 1]}
        </div>

        <div className="w-[110px]">
          <Input
            label="Ouverture"
            value={draft.opensAt}
            onChange={(e) => setDraft({ ...draft, opensAt: e.target.value })}
          />
        </div>
        <div className="w-[110px]">
          <Input
            label="Fermeture"
            value={draft.closesAt}
            onChange={(e) => setDraft({ ...draft, closesAt: e.target.value })}
          />
        </div>
        <div className="w-[108px]">
          <Input
            label="Couverts"
            type="number"
            value={String(draft.capacity)}
            onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            aria-pressed={draft.enabled}
            onClick={() => commit({ ...draft, enabled: !draft.enabled })}
            disabled={saving}
            className="text-meta font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            {draft.enabled ? (
              <Pill tone="success" dot>OUVERT</Pill>
            ) : (
              <Pill tone="draft" dot>FERMÉ</Pill>
            )}
          </button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!dirty || saving}
            onClick={() => commit(draft)}
          >
            {saving ? "…" : "Enregistrer"}
          </Button>
        </div>
      </div>
      {error ? <p className="text-meta text-danger mt-2">{error}</p> : null}
    </div>
  );
}

function ClosuresCard({
  availability,
  onChanged,
}: {
  availability: VenueAvailability;
  onChanged: (next: VenueAvailability) => void;
}) {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    const result = await saveClosure({ date, reason });
    setBusy(false);
    if (!result.ok) {
      setError(result.errors[0]?.message ?? result.message ?? "Échec.");
      return;
    }
    setError(null);
    setDate("");
    setReason("");
    onChanged(result.data);
    toast({ tone: "success", title: "Fermeture ajoutée" });
  };

  const remove = async (id: string) => {
    const before = availability;
    onChanged({ ...availability, closures: availability.closures.filter((c) => c.id !== id) });
    const result = await deleteClosure(id);
    if (!result.ok) {
      onChanged(before);
      toast({ tone: "danger", title: "Suppression impossible" });
      return;
    }
    onChanged(result.data);
  };

  return (
    <Card variant="surface" size="md">
      <h2 className="text-h3 text-ink mb-5">Fermetures exceptionnelles</h2>

      <div className="flex flex-col gap-2 mb-5">
        {availability.closures.length === 0 ? (
          <p className="text-meta text-ink-mute">Aucune fermeture programmée.</p>
        ) : (
          availability.closures.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 border border-line rounded-[var(--radius-sm)] px-3 h-12"
            >
              <span className="num text-[13.5px] font-semibold text-ink">{c.date}</span>
              <span className="text-meta text-ink-mute flex-1 truncate">{c.reason}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                Retirer
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-[186px]">
          <Input
            label="Date"
            type="date"
            error={error ?? undefined}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Motif"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button size="md" onClick={add} disabled={!date || busy}>
          Ajouter
        </Button>
      </div>
    </Card>
  );
}
