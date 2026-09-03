"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as RadixDialog from "@radix-ui/react-dialog";
import {
  Camera,
  CameraOff,
  Check,
  ChevronRight,
  KeyboardIcon,
  ScanLine,
  X,
} from "lucide-react";
import { useScannerStore } from "@/lib/stores/scanner";
import { getAllEvents } from "@/lib/data/static/events";
import { LivePulse } from "@/components/motion/LivePulse";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useToast } from "@/components/ui/Toast";
import { formatDateTimeFR, formatRelativeFR } from "@/lib/utils/format";

// Global scanner, opens from the topbar pill, the bottom-tab raised FAB,
// and ⌘+Shift+S. Two screens inside: event picker (if multi-live), then
// scanner view. State persists across opens so reopening goes straight
// back into scan mode.
const MOCK_RECENT = [
  { code: "LYFE-7821-AC9D", staff: "Hamza", at: new Date(Date.now() - 30_000).toISOString(), name: "Karim Lahlou" },
  { code: "LYFE-7821-7H2K", staff: "Hamza", at: new Date(Date.now() - 90_000).toISOString(), name: "Hicham El Idrissi" },
  { code: "LYFE-7821-2V8L", staff: "Imane", at: new Date(Date.now() - 240_000).toISOString(), name: "Reda Hammoumi" },
];

export function ScannerModal() {
  const {
    open,
    setOpen,
    selectedEventId,
    selectEvent,
    scannedCount,
    totalCount,
    registerScan,
    cameraAvailable,
    setCameraAvailable,
  } = useScannerStore();
  const liveEvents = getAllEvents().filter(
    (e) => e.status.state === "on_sale" || e.status.state === "live",
  );
  const selected = liveEvents.find((e) => e.id === selectedEventId);
  const [manualCode, setManualCode] = useState("");
  const { toast } = useToast();

  // Camera detection on first open. If getUserMedia rejects (no camera /
  // no permission / on a laptop) we default to manual entry.
  useEffect(() => {
    if (!open || cameraAvailable !== null) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setCameraAvailable(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setCameraAvailable(true);
      })
      .catch(() => setCameraAvailable(false));
  }, [open, cameraAvailable, setCameraAvailable]);

  const handleManual = () => {
    if (manualCode.trim().length < 6) return;
    registerScan();
    toast({
      tone: "success",
      title: `Billet vérifié, ${manualCode.toUpperCase()}`,
      description: "Entrée enregistrée.",
    });
    setManualCode("");
  };

  // If the user opens without picking an event yet, but only one is live,
  // auto-select it.
  useEffect(() => {
    if (open && !selected && liveEvents.length === 1) {
      selectEvent(
        liveEvents[0].id,
        liveEvents[0].tiers.reduce((s, t) => s + t.quantity, 0) || 500,
      );
    }
  }, [open, selected, liveEvents, selectEvent]);

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-[60] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(92vw,920px)] md:max-h-[88vh] bg-canvas md:rounded-[var(--radius-xl)] overflow-hidden flex flex-col"
              >
                <RadixDialog.Title className="sr-only">
                  Scanner LYFE
                </RadixDialog.Title>

                {/* Header */}
                <div className="flex items-center justify-between px-5 md:px-6 h-[60px] border-b border-line-soft shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden
                      className="h-9 w-9 rounded-full bg-ink text-canvas flex items-center justify-center shrink-0"
                    >
                      <ScanLine size={16} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-ink truncate">
                        {selected ? selected.name : "Scanner LYFE"}
                      </div>
                      {selected ? (
                        <div className="text-meta text-ink-mute truncate">
                          {selected.venue.name} ·{" "}
                          {formatDateTimeFR(selected.startsAt)}
                        </div>
                      ) : (
                        <div className="text-meta text-ink-mute">
                          Choisissez l'événement à scanner
                        </div>
                      )}
                    </div>
                  </div>
                  <RadixDialog.Close
                    aria-label="Fermer"
                    className="h-9 w-9 -mr-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute"
                  >
                    <X size={16} strokeWidth={1.8} />
                  </RadixDialog.Close>
                </div>

                {/* Body */}
                {!selected ? (
                  <EventPicker liveEvents={liveEvents} onPick={selectEvent} />
                ) : (
                  <ScannerView
                    eventName={selected.name}
                    scannedCount={scannedCount}
                    totalCount={totalCount}
                    cameraAvailable={cameraAvailable}
                    onChangeEvent={() => selectEvent(null, 0)}
                    manualCode={manualCode}
                    setManualCode={setManualCode}
                    onManualSubmit={handleManual}
                    setCameraAvailable={setCameraAvailable}
                  />
                )}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

function EventPicker({
  liveEvents,
  onPick,
}: {
  liveEvents: ReturnType<typeof getAllEvents>;
  onPick: (id: string, total: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-6">
      <div className="text-eyebrow text-ink-mute mb-3">
        Pour quel événement scannez-vous ?
      </div>
      <div className="flex flex-col gap-3">
        {liveEvents.map((e) => (
          <button
            key={e.id}
            onClick={() =>
              onPick(
                e.id,
                e.tiers.reduce((s, t) => s + t.quantity, 0) || 500,
              )
            }
            className="text-left bg-surface border border-line rounded-[var(--radius-md)] p-5 hover:border-ink hover:shadow-soft transition-all flex items-center gap-4"
          >
            <div
              aria-hidden
              className="h-12 w-12 rounded-[12px] bg-gradient-to-br from-tint-sand to-violet-soft flex items-center justify-center shrink-0"
            >
              <ScanLine size={18} strokeWidth={1.8} className="text-ink-soft" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-ink truncate">
                {e.name}
              </div>
              <div className="text-meta text-ink-mute mt-0.5 num">
                {formatDateTimeFR(e.startsAt)} · {e.venue.name}
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-mute shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ScannerView({
  eventName,
  scannedCount,
  totalCount,
  cameraAvailable,
  onChangeEvent,
  manualCode,
  setManualCode,
  onManualSubmit,
  setCameraAvailable,
}: {
  eventName: string;
  scannedCount: number;
  totalCount: number;
  cameraAvailable: boolean | null;
  onChangeEvent: () => void;
  manualCode: string;
  setManualCode: (s: string) => void;
  onManualSubmit: () => void;
  setCameraAvailable: (b: boolean) => void;
}) {
  void eventName;
  return (
    <div className="flex-1 grid lg:grid-cols-[1.2fr_1fr] overflow-hidden min-h-0">
      {/* Left column: camera viewport (or manual fallback) */}
      <div className="bg-ink relative flex items-center justify-center p-6 min-h-[280px]">
        {cameraAvailable ? <CameraViewport /> : <ManualFallback />}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <LivePulse />
            <span className="text-eyebrow text-canvas/65">En direct</span>
          </div>
          <button
            onClick={onChangeEvent}
            className="text-meta font-bold uppercase tracking-[0.08em] text-canvas/70 hover:text-canvas transition-colors"
          >
            Changer
          </button>
        </div>
      </div>

      {/* Right column: counter + manual + recent scans */}
      <div className="flex flex-col overflow-hidden min-h-0">
        <div className="px-5 md:px-6 pt-5 pb-4 border-b border-line-soft">
          <div className="text-eyebrow text-ink-mute">Avancement</div>
          <div className="flex items-baseline gap-2 mt-2 num">
            <span
              className="font-extrabold text-ink"
              style={{ fontSize: 40, lineHeight: 1, letterSpacing: "-0.03em" }}
            >
              <AnimatedNumber value={scannedCount} duration={0.6} />
            </span>
            <span className="text-ink-mute text-h3">/ {totalCount}</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={scannedCount} max={totalCount} tone="gold" size="sm" />
          </div>
          <div className="text-meta text-ink-mute mt-2 num">
            Encore {totalCount - scannedCount} billets à scanner
          </div>
        </div>

        <div className="px-5 md:px-6 py-4 border-b border-line-soft">
          <div className="text-eyebrow text-ink-mute mb-2">
            {cameraAvailable ? "Ou entrez le code manuellement" : "Saisie manuelle"}
          </div>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="LYFE-XXXX-XXXX"
              className="flex-1 h-11 px-3.5 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] text-ink text-[14px] num outline-none focus:border-ink"
            />
            <button
              onClick={onManualSubmit}
              disabled={manualCode.length < 6}
              className="h-11 px-4 bg-ink text-canvas text-[13px] font-bold rounded-[var(--radius-sm)] disabled:opacity-40 hover:bg-ink-soft transition-colors inline-flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2} />
              Valider
            </button>
          </div>
          {cameraAvailable === false ? (
            <button
              onClick={() => setCameraAvailable(true)}
              className="mt-3 text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors flex items-center gap-1"
            >
              <Camera size={12} strokeWidth={1.8} />
              Activer la caméra
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin">
          <div className="px-5 md:px-6 py-3 sticky top-0 bg-canvas/90 backdrop-blur-sm">
            <div className="text-eyebrow text-ink-mute">Derniers scans</div>
          </div>
          <ul className="px-5 md:px-6 pb-4 divide-y divide-line-soft">
            {MOCK_RECENT.map((s) => (
              <li
                key={s.code}
                className="py-3 flex items-center justify-between gap-3 text-[13px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden
                    className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(47,107,61,0.14)",
                      color: "var(--color-success)",
                    }}
                  >
                    <Check size={13} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">
                      {s.name}
                    </div>
                    <div className="text-meta text-ink-mute num truncate">
                      {s.code}
                    </div>
                  </div>
                </div>
                <div className="text-meta text-ink-mute num shrink-0">
                  par {s.staff} · {formatRelativeFR(s.at)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CameraViewport() {
  return (
    <div className="relative w-full max-w-[420px] aspect-square rounded-[var(--radius-md)] overflow-hidden bg-black">
      {/* Corner brackets */}
      <div className="absolute inset-6 rounded-[var(--radius-md)]">
        <Bracket position="top-left" />
        <Bracket position="top-right" />
        <Bracket position="bottom-left" />
        <Bracket position="bottom-right" />
        <motion.div
          className="absolute left-2 right-2 h-px bg-violet"
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-canvas/85 px-4 text-center">
        <ScanLine size={32} strokeWidth={1.6} />
        <p className="text-[13px] mt-2">
          Centrer le QR du billet dans le cadre
        </p>
      </div>
    </div>
  );
}

function ManualFallback() {
  return (
    <div className="text-center text-canvas px-6 max-w-sm">
      <div
        aria-hidden
        className="h-12 w-12 rounded-full bg-canvas/10 flex items-center justify-center mx-auto"
      >
        <CameraOff size={20} strokeWidth={1.8} className="text-canvas/70" />
      </div>
      <div className="text-h3 text-canvas mt-4">Caméra indisponible</div>
      <p className="text-[13px] text-canvas/65 mt-2 leading-relaxed">
        Saisissez les codes manuellement à droite. Tous les scans se
        synchronisent dès retour de la connexion.
      </p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-meta text-canvas/55">
        <KeyboardIcon size={12} strokeWidth={1.8} />
        Tab pour passer au champ de saisie
      </div>
    </div>
  );
}

function Bracket({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const map: Record<typeof position, string> = {
    "top-left": "top-0 left-0 border-t-2 border-l-2",
    "top-right": "top-0 right-0 border-t-2 border-r-2",
    "bottom-left": "bottom-0 left-0 border-b-2 border-l-2",
    "bottom-right": "bottom-0 right-0 border-b-2 border-r-2",
  };
  return (
    <span
      aria-hidden
      className={`absolute h-6 w-6 border-violet ${map[position]}`}
    />
  );
}
