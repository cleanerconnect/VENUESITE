"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { SaveBar } from "@/components/forms/SaveBar";
import { useToast } from "@/components/ui/Toast";
import { saveSlot, saveClosure, deleteClosure } from "@/app/actions/venue";
import type { AvailabilitySlot, VenueAvailability } from "@/lib/types/business";
import { validateSlot } from "@/lib/forms/validation";
import type { SaveState } from "@/lib/forms/useOptimisticForm";
import { dayLabel } from "@/lib/restaurant/format";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * One card per day, its windows inside it.
 *
 * A venue with a lunch and a dinner service has two slots on Monday, and
 * listing them flat gave the screen fourteen cards, seven of them headed
 * "Lundi" and none saying which was which. A day with two windows is how
 * an opening-hours sign reads — "Lundi 12h00–15h00, 19h00–23h30" — so
 * the day is the card and the windows are its rows.
 */
function byWeekday(slots: AvailabilitySlot[]): [number, AvailabilitySlot[]][] {
  const days = new Map<number, AvailabilitySlot[]>();
  for (const slot of slots) {
    const list = days.get(slot.weekday) ?? [];
    list.push(slot);
    days.set(slot.weekday, list);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, list]) => [day, list.sort((a, b) => a.opensAt.localeCompare(b.opensAt))]);
}

// Opening hours, as seven days of fields.
//
// Every slot is still written on its own — this is the edit that changes
// what customers can book right now, and one page-wide rewrite of
// fourteen slots to change one is exactly how a colleague's concurrent
// edit gets clobbered. What changed is the button: there was one
// Enregistrer per row, seven of them down the screen, and a host who had
// just retyped three closing times had three buttons to find. Now the
// screen has one, at the foot, and it sends only the days that moved.
//
// Open or closed is a switch. It used to be a green pill reading OUVERT,
// which says where the day stands and gives no sign that pressing it
// changes anything.
export function OpeningHoursForm({ initial }: { initial: VenueAvailability }) {
  const { toast } = useToast();
  const [availability, setAvailability] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, AvailabilitySlot>>({});
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const slotOf = (slot: AvailabilitySlot) => drafts[slot.id] ?? slot;
  const dirty = Object.keys(drafts).length > 0;

  const edit = (slot: AvailabilitySlot, patch: Partial<AvailabilitySlot>) => {
    const next = { ...slotOf(slot), ...patch };
    const clean =
      next.opensAt === slot.opensAt &&
      next.closesAt === slot.closesAt &&
      next.capacity === slot.capacity &&
      next.enabled === slot.enabled;
    setState("idle");
    setMessage(null);
    setDrafts((prev) => {
      const copy = { ...prev };
      if (clean) delete copy[slot.id];
      else copy[slot.id] = next;
      return copy;
    });
  };

  const save = async () => {
    const pending = Object.values(drafts);
    const problem = pending.flatMap((slot) => validateSlot(slot))[0];
    if (problem) {
      setState("error");
      setMessage(problem.message);
      return;
    }

    setState("saving");
    setMessage(null);
    let latest = availability;
    for (const slot of pending) {
      const result = await saveSlot({
        slotId: slot.id,
        opensAt: slot.opensAt,
        closesAt: slot.closesAt,
        capacity: slot.capacity,
        enabled: slot.enabled,
      });
      if (!result.ok) {
        setAvailability(latest);
        setState("error");
        setMessage(
          result.message ??
            result.errors[0]?.message ??
            `${WEEKDAYS[slot.weekday - 1]} n'a pas été enregistré.`,
        );
        toast({ tone: "danger", title: "Horaires non enregistrés" });
        return;
      }
      latest = result.data;
    }
    setAvailability(latest);
    setDrafts({});
    setState("saved");
  };

  return (
    <div className="space-y-5">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Horaires d&apos;ouverture</h2>
        <p className="text-meta text-ink-mute mb-5">
          Ce que l&apos;application propose à la réservation, jour par jour.
        </p>

        <div className="flex flex-col gap-3">
          {byWeekday(availability.slots).map(([weekday, slots]) => (
            <div
              key={weekday}
              className="rounded-[var(--radius-sm)] border border-line bg-surface p-3.5"
            >
              <p className="mb-3 text-[15px] font-bold text-ink">
                {WEEKDAYS[weekday - 1]}
              </p>

              <div className="flex flex-col gap-3">
                {slots.map((slot) => {
                  const draft = slotOf(slot);
                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "rounded-[var(--radius-sm)] border p-3 transition-colors",
                        draft.enabled ? "border-line" : "border-line bg-canvas-2",
                      )}
                    >

                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <label className="block">
                    <span className="mb-1.5 block text-[14px] font-semibold text-ink">
                      Ouverture
                    </span>
                    <TimeSelect
                      value={draft.opensAt}
                      onChange={(opensAt) => edit(slot, { opensAt })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[14px] font-semibold text-ink">
                      Fermeture
                    </span>
                    <TimeSelect
                      value={draft.closesAt}
                      onChange={(closesAt) => edit(slot, { closesAt })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[14px] font-semibold text-ink">
                      Couverts
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={String(draft.capacity)}
                      onChange={(e) => edit(slot, { capacity: Number(e.target.value) })}
                      className="block h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 num text-body text-ink transition-colors focus:border-ink focus:outline-none"
                    />
                  </label>
                  {/* On the same line as the window it opens or closes:
                      a switch a row above its own fields reads as if it
                      belonged to the row below. */}
                  <span className="flex h-11 items-center gap-2.5 sm:justify-end">
                    <span className="text-[14px] font-semibold text-ink-soft">
                      {draft.enabled ? "Ouvert" : "Fermé"}
                    </span>
                    <Switch
                      checked={draft.enabled}
                      ariaLabel={`${WEEKDAYS[weekday - 1]} ${draft.opensAt} · ouvert`}
                      onCheckedChange={(enabled) => edit(slot, { enabled })}
                    />
                  </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ClosuresCard
        availability={availability}
        onChanged={(next) => setAvailability(next)}
      />

      <SaveBar
        state={state}
        dirty={dirty}
        message={message}
        onSave={() => void save()}
        onReset={() => {
          setDrafts({});
          setState("idle");
          setMessage(null);
        }}
      />
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

  // A closure is added and removed on the spot rather than staged: it is
  // not an edit to a field, it is a day taken out of the book, and the
  // list beside the form is the confirmation.
  return (
    <Card variant="surface" size="md">
      <h2 className="text-h3 text-ink mb-1">Jours de fermeture</h2>
      <p className="text-meta text-ink-mute mb-5">
        Fériés, privatisations, congés : ce qui retire une journée du carnet.
      </p>

      <div className="flex flex-col gap-2 mb-5">
        {availability.closures.length === 0 ? (
          <p className="text-[14px] text-ink-mute">Aucune fermeture programmée.</p>
        ) : (
          availability.closures.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 border border-line rounded-[var(--radius-sm)] px-3.5 min-h-12"
            >
              <span className="num text-[15px] font-semibold text-ink">
                {dayLabel(c.date)}
              </span>
              <span className="text-[14px] text-ink-mute flex-1 truncate">{c.reason}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                Rouvrir
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* A native date input draws its own value and its own placeholder
            inside the border, so a floating label lands on top of
            `mm/dd/yyyy`. This one names the field above it and leaves the
            picker the whole box. */}
        <label className="block w-[200px]">
          <span className="mb-1.5 block text-[14px] font-semibold text-ink">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(
              "block h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 num",
              "text-body text-ink transition-colors focus:border-ink focus:outline-none",
              error ? "border-danger/60" : "border-line",
            )}
          />
        </label>
        <label className="block min-w-[200px] flex-1">
          <span className="mb-1.5 block text-[14px] font-semibold text-ink">
            Motif
          </span>
          <input
            type="text"
            value={reason}
            placeholder="Privatisation, congés…"
            onChange={(e) => setReason(e.target.value)}
            className="block h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 text-body text-ink transition-colors placeholder:text-ink-mute focus:border-ink focus:outline-none"
          />
        </label>
        <Button onClick={add} disabled={!date || busy}>
          Fermer une journée
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-meta text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
