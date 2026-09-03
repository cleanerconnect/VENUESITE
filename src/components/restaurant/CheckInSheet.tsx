"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ScanLine, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { SideSheet } from "@/components/ui/SideSheet";
import { useToast } from "@/components/ui/Toast";
import { useCheckInStore } from "@/lib/stores/checkin";
import { useRestaurantStore } from "@/lib/restaurant/store";
import { checkInByCode, markGuestArrived } from "@/app/actions/checkin";
import { useQrScanner } from "@/lib/scan/useQrScanner";
import { QrViewfinder } from "@/components/scan/QrViewfinder";
import { COPY } from "@/lib/copy/fr";
import { formatTimeFR } from "@/lib/utils/format";

// Door duty, one-handed.
//
// Two ways in, because a host has both: scan the code the guest shows in
// the app, or tap the name off the list of who is due. The sheet is
// bottom-anchored on a phone and everything interactive sits in the
// lower two thirds, which is the half a thumb reaches.
//
// The portal validates the QR; it never mints one. `checkInByCode` hands
// the scanned string to the backend untouched — the code is opaque here
// by design, and the venue is taken from the session so a code cannot be
// redeemed against a venue the user does not hold.

const CODE_ERROR: Record<string, string> = {
  unknown_code: "Code inconnu. Vérifiez la saisie.",
  already_used: "Ce client est déjà enregistré comme arrivé.",
  wrong_venue: "Ce code ne concerne pas votre lieu.",
  expired: "Ce code a expiré.",
};

export function CheckInSheet() {
  const open = useCheckInStore((s) => s.open);
  const setOpen = useCheckInStore((s) => s.setOpen);
  const data = useRestaurantStore((s) => s.data);
  const markArrived = useRestaurantStore((s) => s.markArrived);
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  // A hardware scanner types into whatever has focus, so the field takes
  // it as soon as the sheet opens. That is also the right place for a
  // thumb on a phone.
  useEffect(() => {
    if (!open) return;
    setError(null);
    const t = setTimeout(() => field.current?.focus(), 260);
    return () => clearTimeout(t);
  }, [open]);

  // Who is still expected: confirmed or requested, not yet arrived.
  //
  // The book is only in the client store on a screen that hydrated it —
  // the settings route does not. There, the code field still works (it
  // resolves server-side) and the list says so, rather than claiming
  // everyone has arrived.
  const bookLoaded = data !== null;
  const expected = (data?.upcomingReservations ?? []).filter(
    (r) => r.state === "confirmed" || r.state === "requested",
  );

  // One redemption path for both inputs: a scanned code and a typed one
  // are the same string arriving by different routes, and the portal
  // never parses either — the backend resolves it.
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
      if (result.bookingId) markArrived(result.bookingId);
      toast({
        tone: "success",
        title: `${result.guestName ?? "Client"} · ${COPY.toast.arrived}`,
        undo: () => useRestaurantStore.getState().undo(),
      });
      setCode("");
    } catch {
      setError(COPY.form.savingFailed);
    } finally {
      setPending(false);
    }
  };

  const submit = () => redeem(code);

  // Camera runs only while the sheet is open and the door tab is
  // showing, so closing the sheet releases the camera — a stream left
  // running keeps the phone's indicator lit and drains the battery.
  const scanner = useQrScanner({
    active: open && scanOpen,
    onScan: (scanned) => {
      setCode(scanned);
      void redeem(scanned);
    },
  });

  // Optimistic first, then persist. If the server refuses, the snapshot
  // the store took goes back — an arrival that only ever existed in one
  // browser would let the same guest through twice.
  const arrive = async (id: string, name: string) => {
    markArrived(id);
    toast({
      tone: "success",
      title: `${name} · ${COPY.toast.arrived}`,
      undo: () => useRestaurantStore.getState().undo(),
    });
    const result = await markGuestArrived(id);
    if (!result.ok) {
      useRestaurantStore.getState().undo();
      toast({
        tone: "danger",
        title: result.message ?? COPY.form.savingFailed,
      });
    }
  };

  return (
    <SideSheet
      open={open}
      onOpenChange={setOpen}
      title="Arrivées"
      description={
        !bookLoaded
          ? "Saisissez le code de réservation"
          : expected.length
            ? `${expected.length} ${expected.length > 1 ? "clients attendus" : "client attendu"}`
            : "Personne en attente d'arrivée"
      }
    >
      <div className="space-y-6">
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-eyebrow text-ink-soft">
              Code de réservation
            </span>
            <button
              type="button"
              onClick={() => setScanOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-meta font-bold uppercase tracking-[0.06em] text-violet-deep transition-colors hover:text-ink"
            >
              <Camera size={13} strokeWidth={2.2} />
              {scanOpen ? "Fermer la caméra" : "Scanner"}
            </button>
          </div>

          {scanOpen ? (
            <QrViewfinder
              scanner={scanner}
              hint="Visez le QR du client"
              className="mb-4"
            />
          ) : null}

          <Input
            ref={field}
            label="Scanner ou saisir le code"
            value={code}
            error={error ?? undefined}
            autoComplete="off"
            prefix={<ScanLine size={16} strokeWidth={1.8} />}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button
            fullWidth
            size="lg"
            className="mt-3"
            disabled={pending || code.trim().length < 4}
            onClick={() => void submit()}
            iconLeft={<Check size={16} strokeWidth={2.2} />}
          >
            {pending ? "Vérification…" : "Enregistrer l'arrivée"}
          </Button>
        </div>

        <div>
          <div className="text-eyebrow text-ink-soft mb-2.5">Attendus</div>
          {!bookLoaded ? (
            <p className="text-body text-ink-soft">
              Ouvrez le carnet pour voir qui est attendu. Le code
              fonctionne depuis n&apos;importe quel écran.
            </p>
          ) : expected.length === 0 ? (
            <p className="text-body text-ink-soft">
              Tous les clients confirmés sont arrivés.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft border-t border-line-soft">
              {expected.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-ink truncate">
                        {r.guestName}
                      </span>
                      {r.state === "requested" ? (
                        <Pill tone="pending">À confirmer</Pill>
                      ) : null}
                      {r.vip ? <Pill tone="violet">Habitué</Pill> : null}
                    </div>
                    <div className="text-meta text-ink-mute mt-0.5 num">
                      {formatTimeFR(r.at)} · {COPY.booking.party(r.partySize)}
                    </div>
                  </div>
                  {/* 44px tall, right-hand edge — thumb reach on a phone. */}
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => void arrive(r.id, r.guestName)}
                  >
                    Arrivé
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? (
          <p className="flex items-start gap-2 text-meta text-danger">
            <TriangleAlert size={14} strokeWidth={2} className="mt-[1px] shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </SideSheet>
  );
}
