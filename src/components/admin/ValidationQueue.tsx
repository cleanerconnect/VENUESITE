"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PendingVenue } from "@/lib/types/restaurant";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { rejectVenue, validateVenue } from "@/app/actions/validation";
import { VENUE_TIME_ZONE } from "@/lib/time/zone";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

// The queue, and the two decisions.
//
// Refusing asks for the reason inline rather than in a dialog: the
// reviewer is looking at the listing they are refusing, and a modal that
// covers it makes them write the sentence from memory. The sentence is
// the only thing the partner will be shown, so it is worth making easy
// to write well.
export function ValidationQueue({ venues }: { venues: PendingVenue[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [refusing, setRefusing] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (venues.length === 0) return null;

  const run = (label: string, call: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await call();
      toast(
        result.ok
          ? { title: label, tone: "success" }
          : {
              title: "Décision non enregistrée",
              description:
                result.message ?? "La décision n'a pas pu être enregistrée.",
              tone: "danger",
            },
      );
      if (result.ok) {
        setRefusing(null);
        setReason("");
        router.refresh();
      }
    });

  return (
    <ul className="space-y-3">
      {venues.map((venue) => (
        <li
          key={venue.id}
          className="rounded-2xl border border-line bg-surface p-4 md:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{venue.name}</p>
              <p className="text-sm text-ink-soft">
                {venue.kind === "drinks" ? "Bar ou lounge" : "Restaurant"} ·{" "}
                {venue.city}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{venue.address}</p>
              <p className="mt-2 text-sm text-ink-soft">
                {venue.ownerName} · {venue.contactPhone || "pas de téléphone"} ·{" "}
                {venue.contactEmail || "pas d'e-mail"}
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                Inscrit le{" "}
                {formatInTimeZone(
                  new Date(venue.createdAt),
                  VENUE_TIME_ZONE,
                  "d MMMM à HH'h'mm",
                  { locale: fr },
                )}{" "}
                · {venue.hasPhoto ? "photo fournie" : "aucune photo"} ·{" "}
                {venue.openDays === 0
                  ? "aucun horaire"
                  : venue.openDays === 1
                    ? "un jour d'ouverture"
                    : `${venue.openDays} jours d'ouverture`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => run("Établissement validé.", () => validateVenue(venue.id))}
              >
                Valider
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setRefusing(refusing === venue.id ? null : venue.id);
                  setReason("");
                }}
              >
                Refuser
              </Button>
            </div>
          </div>

          {refusing === venue.id ? (
            <div className="mt-4 border-t border-line pt-4">
              <Textarea
                label="Ce que le partenaire verra"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Par exemple : l'adresse ne correspond à aucun établissement que nous avons pu joindre."
              />
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  disabled={pending || reason.trim() === ""}
                  onClick={() =>
                    run("Refus enregistré.", () => rejectVenue(venue.id, reason))
                  }
                >
                  Enregistrer le refus
                </Button>
                <Button variant="ghost" disabled={pending} onClick={() => setRefusing(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
