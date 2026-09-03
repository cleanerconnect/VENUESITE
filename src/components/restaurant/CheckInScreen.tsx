"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { QrViewfinder } from "@/components/scan/QrViewfinder";
import { useQrScanner } from "@/lib/scan/useQrScanner";
import { checkInByCode, markGuestArrived } from "@/app/actions/checkin";
import { coversIn } from "@/lib/restaurant/format";
import { formatTimeFR } from "@/lib/utils/format";
import type { VenueConfiguration } from "@/lib/types/venue-operations";
import { cn } from "@/lib/utils/cn";

// Validating an arrival in under three seconds.
//
// Three ways in, in the order a door actually uses them: the camera,
// because most guests show the code in the app; a typed code, because a
// cracked screen or a flat battery happens every night; and a name
// search, because some guests booked by phone and have no code at all.
//
// Every refusal says which rule it broke. "Code invalide" tells the host
// nothing they can act on, and the guest is standing right there.

const CODE_ERROR: Record<string, string> = {
  unknown_code: "Code inconnu dans cet établissement. Vérifiez la saisie ou cherchez le nom.",
  already_used: "Ce client est déjà enregistré comme arrivé.",
  wrong_venue: "Ce code appartient à un autre établissement.",
  expired: "Cette réservation est annulée ou marquée absente.",
};

export interface ExpectedGuest {
  id: string;
  guestName: string;
  partySize: number;
  at: string;
  state: string;
  zone: string | null;
  note: string | null;
  vip: boolean;
  depositMad: number | null;
}

interface Redeemed {
  id: string;
  name: string;
  partySize: number;
  at: number;
}

/**
 * Arrivals taken while the network was gone.
 *
 * A door with no signal is a door that still has a queue. The
 * specification asks for check-ins to be queued locally and synced, and
 * localStorage is the only store that survives the tab being killed by
 * the phone mid-service.
 */
const QUEUE_KEY = "lyfe.checkin.queue";

type QueuedArrival = { kind: "code" | "id"; value: string; at: number };

function readQueue(): QueuedArrival[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedArrival[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedArrival[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // A private window with storage blocked. The queue is a convenience,
    // not a guarantee — the arrival is still on screen either way.
  }
}

export function CheckInScreen({
  venueName,
  configuration,
  expected,
}: {
  venueName: string;
  configuration: VenueConfiguration;
  expected: ExpectedGuest[];
}) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [recent, setRecent] = useState<Redeemed[]>([]);
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  const [queued, setQueued] = useState<QueuedArrival[]>([]);
  const [online, setOnline] = useState(true);

  const waiting = expected.filter(
    (g) => !arrived.has(g.id) && (g.state === "confirmed" || g.state === "requested"),
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return waiting.slice(0, 8);
    return waiting.filter((g) => g.guestName.toLowerCase().includes(needle));
  }, [query, waiting]);

  // Drains the queue whenever the connection comes back. Failures stay
  // queued rather than being dropped: a lost arrival is a guest asked to
  // check in twice, which is exactly what the door is trying to avoid.
  const flush = useCallback(async () => {
    const pendingItems = readQueue();
    if (pendingItems.length === 0) return;
    const left: QueuedArrival[] = [];
    for (const item of pendingItems) {
      const result =
        item.kind === "code"
          ? await checkInByCode(item.value).then((r) => r.ok).catch(() => false)
          : await markGuestArrived(item.value).then((r) => r.ok).catch(() => false);
      if (!result) left.push(item);
    }
    writeQueue(left);
    setQueued(left);
    if (left.length < pendingItems.length) {
      toast({
        tone: "success",
        title: `${pendingItems.length - left.length} arrivée(s) synchronisée(s)`,
      });
    }
  }, [toast]);

  useEffect(() => {
    setQueued(readQueue());
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      void flush();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    if (navigator.onLine) void flush();
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [flush]);

  const enqueue = (item: QueuedArrival) => {
    const next = [...readQueue(), item];
    writeQueue(next);
    setQueued(next);
  };

  const succeed = (id: string, name: string, partySize: number) => {
    setArrived((s) => new Set(s).add(id));
    setRecent((r) => [{ id, name, partySize, at: Date.now() }, ...r].slice(0, 12));
    setError(null);
    setCode("");
    toast({ tone: "success", title: `${name} · arrivé` });
  };

  const redeem = async (raw: string) => {
    if (pending || raw.trim().length < 4) return;
    setPending(true);
    setError(null);
    try {
      const result = await checkInByCode(raw);
      if (!result.ok) {
        setError(CODE_ERROR[result.error ?? "unknown_code"]);
        return;
      }
      succeed(
        result.bookingId ?? raw,
        result.guestName ?? "Client",
        result.partySize ?? 1,
      );
    } catch {
      // The network is the likeliest cause at a door. Queue it and let
      // the guest through — the sync will confirm or surface it later.
      enqueue({ kind: "code", value: raw.trim(), at: Date.now() });
      succeed(raw.trim(), "Arrivée en attente de synchronisation", 1);
      setOnline(false);
    } finally {
      setPending(false);
    }
  };

  const arriveByName = async (guest: ExpectedGuest) => {
    setPending(true);
    const result = await markGuestArrived(guest.id).catch(() => null);
    setPending(false);
    if (result === null) {
      enqueue({ kind: "id", value: guest.id, at: Date.now() });
      setOnline(false);
      succeed(guest.id, guest.guestName, guest.partySize);
      return;
    }
    if (!result.ok) {
      setError(result.message ?? "L'enregistrement a échoué.");
      return;
    }
    succeed(guest.id, guest.guestName, guest.partySize);
  };

  // The camera is released the moment it is switched off: a stream left
  // running keeps the phone's indicator lit and drains the battery
  // through a whole service.
  const scanner = useQrScanner({
    active: cameraOn,
    onScan: (scanned) => {
      setCode(scanned);
      void redeem(scanned);
    },
  });

  /** Five minutes, which is how long a mis-scan takes to notice. */
  const undoable = (entry: Redeemed) => Date.now() - entry.at < 5 * 60_000;

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-h1 text-ink">Check-in</h1>
        <p className="text-body text-ink-soft mt-2">
          {venueName} · {waiting.length} arrivées encore attendues
        </p>
      </header>

      {!online || queued.length > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-canvas-2 p-3"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              {online ? "Synchronisation en attente" : "Hors ligne"}
            </p>
            <p className="text-meta text-ink-mute mt-0.5">
              {queued.length} arrivée(s) enregistrée(s) sur cet appareil.
              {online
                ? " La synchronisation reprend automatiquement."
                : " Elles partiront dès le retour du réseau ; continuez à valider."}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void flush()}>
            Synchroniser maintenant
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5 min-w-0">
          <Card variant="surface" size="md">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h2 className="text-h3 text-ink">Scanner le code</h2>
                <p className="text-meta text-ink-mute mt-1">
                  Le code vient de l'application du client. Le portail le valide,
                  il ne le fabrique jamais.
                </p>
              </div>
              <Button
                variant={cameraOn ? "secondary" : "ink"}
                size="sm"
                onClick={() => setCameraOn((on) => !on)}
              >
                {cameraOn ? "Éteindre la caméra" : "Allumer la caméra"}
              </Button>
            </div>

            {cameraOn ? (
              <QrViewfinder scanner={scanner} hint={`Billet · ${venueName}`} />
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-8 text-center">
                <p className="text-meta text-ink-mute">
                  La caméra est éteinte. La saisie manuelle et la recherche par
                  nom fonctionnent sans elle.
                </p>
              </div>
            )}

            <form
              className="mt-4 flex gap-2 flex-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                void redeem(code);
              }}
            >
              <Input
                label="Code de réservation"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="LYFE-…"
                className="flex-1 min-w-[12rem] font-mono"
              />
              <Button type="submit" variant="ink" disabled={pending}>
                {pending ? "Vérification…" : "Valider"}
              </Button>
            </form>

            {error ? (
              <p role="alert" className="text-meta text-danger mt-3">
                {error}
              </p>
            ) : null}
          </Card>

          <Card variant="surface" size="md">
            <h2 className="text-h3 text-ink mb-1">Chercher par nom</h2>
            <p className="text-meta text-ink-mute mb-4">
              Pour un client qui a réservé par téléphone et n'a pas de code.
            </p>
            <Input
              label="Nom du client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom du client…"
            />

            <div className="mt-4 space-y-2">
              {matches.length === 0 ? (
                <EmptyState
                  title="Personne ne correspond"
                  description="Aucune réservation en attente à ce nom sur ce service."
                />
              ) : (
                matches.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-ink truncate">
                          {guest.guestName}
                        </span>
                        {guest.vip ? <Pill tone="violet">Habitué</Pill> : null}
                        {guest.depositMad ? (
                          <Pill tone="info">Acompte {guest.depositMad} MAD</Pill>
                        ) : null}
                      </div>
                      <p className="text-meta text-ink-mute num mt-0.5">
                        {formatTimeFR(guest.at)} ·{" "}
                        {coversIn(configuration, guest.partySize)}
                        {guest.zone ? ` · ${guest.zone}` : ""}
                      </p>
                      {guest.note ? (
                        <p className="text-meta text-ink-soft mt-1">{guest.note}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ink"
                      size="sm"
                      disabled={pending}
                      onClick={() => void arriveByName(guest)}
                    >
                      Confirmer
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card variant="surface" size="md" className="h-fit">
          <h2 className="text-h3 text-ink mb-1">Trente dernières minutes</h2>
          <p className="text-meta text-ink-mute mb-4">
            Une erreur de scan se voit dans les cinq minutes. Au-delà,
            l'annulation passe par le carnet.
          </p>

          {recent.length === 0 ? (
            <EmptyState
              title="Aucune arrivée"
              description="Les clients validés depuis cet écran apparaîtront ici."
            />
          ) : (
            <ul className="space-y-2">
              {recent.map((entry) => (
                <li
                  key={`${entry.id}-${entry.at}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[var(--radius-sm)]",
                    "border border-line px-3 py-2",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink truncate">
                      {entry.name}
                    </p>
                    <p className="text-meta text-ink-mute num">
                      {coversIn(configuration, entry.partySize)} ·{" "}
                      {formatTimeFR(new Date(entry.at).toISOString())}
                    </p>
                  </div>
                  {undoable(entry) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRecent((r) => r.filter((x) => x.at !== entry.at));
                        setArrived((s) => {
                          const next = new Set(s);
                          next.delete(entry.id);
                          return next;
                        });
                        toast({ tone: "info", title: "Check-in annulé" });
                      }}
                    >
                      Annuler
                    </Button>
                  ) : (
                    <span className="text-meta text-ink-mute">Verrouillé</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
