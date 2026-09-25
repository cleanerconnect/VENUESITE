"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { bookableSlotsForDay } from "@/app/actions/bookings";
import { VENUE_TIME_ZONE } from "@/lib/time/zone";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";

// Décaler. A small sheet, and the point of it is what it does *not*
// offer.
//
// The host picks a day and then a time, and the times are the venue's
// own: read from its service definitions, cut on the grid that service
// seats on, and empty on a day the venue is closed. There is no free
// text hour, because an hour typed by hand is an hour the app would
// refuse — and the guest would arrive to a table that was never held.
//
// Seven days, because moving a booking is a tonight-or-tomorrow
// conversation held with the guest on the phone. A month picker would be
// a different feature for a different problem.

export interface RescheduleTarget {
  id: string;
  guestName: string;
  at: string;
  party: number;
}

const DAYS = 7;

const dayKeys = () => {
  const out: string[] = [];
  for (let i = 0; i < DAYS; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(formatInTimeZone(d, VENUE_TIME_ZONE, "yyyy-MM-dd"));
  }
  return out;
};

export function RescheduleSheet({
  target,
  onClose,
  onConfirm,
}: {
  target: RescheduleTarget | null;
  onClose: () => void;
  onConfirm: (at: string) => void;
}) {
  const days = dayKeys();
  const [day, setDay] = useState(days[0]);
  const [slots, setSlots] = useState<{ at: string; serviceLabel: string }[] | null>(
    null,
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  // The booking's own day opens first: most moves are within the
  // evening, and making the host find today again is a tap for nothing.
  useEffect(() => {
    if (!target) return;
    const own = formatInTimeZone(new Date(target.at), VENUE_TIME_ZONE, "yyyy-MM-dd");
    setDay(days.includes(own) ? own : days[0]);
    setChosen(null);
    // `days` is derived from the clock on every render; depending on it
    // would refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    if (!target) return;
    setSlots(null);
    startLoading(async () => {
      setSlots(await bookableSlotsForDay(day));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, day]);

  if (!target) return null;

  const current = formatInTimeZone(
    new Date(target.at),
    VENUE_TIME_ZONE,
    "EEEE d MMMM 'à' HH'h'mm",
    { locale: fr },
  );

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Décaler la réservation"
      description={`${target.guestName} · ${target.party} ${
        target.party === 1 ? "personne" : "personnes"
      } · ${current}`}
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Le jour</p>
          <div className="flex flex-wrap gap-2">
            {days.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDay(key)}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm",
                  key === day
                    ? "border-violet bg-violet text-canvas"
                    : "border-line text-ink",
                )}
              >
                {formatInTimeZone(
                  new Date(`${key}T12:00:00Z`),
                  VENUE_TIME_ZONE,
                  "EEE d",
                  { locale: fr },
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">L'heure</p>
          {slots === null || loading ? (
            <p className="text-sm text-ink-soft">Lecture des créneaux…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-ink-soft">
              L'établissement ne prend pas de réservation ce jour-là. Choisissez un
              autre jour.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" data-slots={slots.length}>
              {slots.map((slot) => (
                <button
                  key={slot.at}
                  type="button"
                  onClick={() => setChosen(slot.at)}
                  title={slot.serviceLabel}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm tabular-nums",
                    slot.at === chosen
                      ? "border-violet bg-violet text-canvas"
                      : "border-line text-ink",
                  )}
                >
                  {formatInTimeZone(new Date(slot.at), VENUE_TIME_ZONE, "HH'h'mm")}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-ink-soft">
          Le client sera informé du nouvel horaire.
        </p>

        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={!chosen}
            onClick={() => chosen && onConfirm(chosen)}
          >
            Décaler
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
