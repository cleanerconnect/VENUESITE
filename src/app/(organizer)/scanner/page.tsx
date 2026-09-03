"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ScanLine,
  Settings2,
  Sliders,
  X,
} from "lucide-react";
import type { LyfeEvent } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { useEventQuery } from "@/lib/data/useQuery";
import { COPY } from "@/lib/copy/fr";
import { useEventRepository } from "@/lib/data/useQuery";
import { useQrScanner, type QrScanner } from "@/lib/scan/useQrScanner";

// Fullscreen scanner takeover for mobile. Replaces the previous stub
// with a camera viewfinder, event selector pill, live counter, recent
// scan strip, and a bottom action bar (mode toggle + stats sheet +
// Régie deep-link).
//
// Mock scans cycle every 2.4 s — a name pool rotates, with one in
// twelve scans flagged invalid to keep the demo honest.

type ScanStatus = "valid" | "invalid";

interface RecentScan {
  id: string;
  initials: string;
  tierName: string;
  status: ScanStatus;
  at: number;
}

type Mode = "standard" | "express" | "exit";

const MODE_LABEL: Record<Mode, string> = {
  standard: "Standard",
  express: "Express",
  exit: "Sortie",
};

export default function ScannerPage() {
  const eventsQuery = useEventQuery((repo) => repo.listEvents(), []);
  const allEvents = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const eligible = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          e.status.state === "on_sale" ||
          e.status.state === "live" ||
          e.status.state === "past" ||
          e.status.state === "settled",
      ),
    [allEvents],
  );

  const [selectedId, setSelectedId] = useState<string>(
    () => eligible[0]?.id ?? "",
  );
  const event = eligible.find((e) => e.id === selectedId) ?? eligible[0];

  const totalCapacity = event?.tiers.reduce((s, t) => s + t.quantity, 0) ?? 0;
  const seededScanned = event ? Math.floor(totalCapacity * 0.029) : 0;

  const [count, setCount] = useState(seededScanned);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [mode, setMode] = useState<Mode>("standard");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Reset on event change.
  useEffect(() => {
    setCount(seededScanned);
    setRecent([]);
  }, [selectedId, seededScanned]);

  // Real redemption. The code comes off the camera (or the manual
  // fallback) and is resolved by the repository, which records it — so a
  // ticket presented twice is refused the second time even on this
  // device. The loop that used to invent a scan every 2.4 seconds is
  // gone: a simulated scan in a handover teaches the wrong thing.
  const repo = useEventRepository();
  const handleCode = useCallback(
    async (raw: string) => {
      if (!event) return;
      const result = await repo.scanTicket(event.id, raw);
      const at = Date.now();
      const name = result.attendee?.name ?? raw.toUpperCase();
      setRecent((r) =>
        [
          {
            id: `${at}_${raw}`,
            initials: name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase(),
            tierName:
              result.attendee?.tierName ??
              (result.error === "unknown_code" ? "Code inconnu" : "Billet"),
            status: result.ok ? ("valid" as const) : ("invalid" as const),
            at,
          },
          ...r,
        ].slice(0, 5),
      );
      if (result.ok) setCount((c) => Math.min(totalCapacity, c + 1));
    },
    [event, repo, totalCapacity],
  );

  const scanner = useQrScanner({ active: true, onScan: handleCode });

  // The scanner is a full-screen dark takeover, so its states live on
  // that surface rather than in a Card — a white error card here would
  // blind a host in a dark venue.
  if (eventsQuery.status !== "ready") {
    return (
      <div
        className="fixed inset-0 z-40 bg-ink text-canvas flex flex-col items-center justify-center px-6 text-center"
        role={eventsQuery.status === "error" ? "alert" : "status"}
        aria-live="polite"
        aria-busy={eventsQuery.status === "loading"}
      >
        {eventsQuery.status === "loading" ? (
          <>
            <span className="sr-only">Chargement des événements</span>
            <div
              aria-hidden
              className="h-10 w-40 rounded-full bg-canvas/10 animate-pulse"
            />
          </>
        ) : (
          <>
            <p className="text-canvas/65 text-body max-w-xs">
              {eventsQuery.error?.message ?? COPY.error.body}
            </p>
            <button
              type="button"
              onClick={eventsQuery.retry}
              className="mt-6 inline-flex items-center gap-1.5 text-meta font-bold uppercase tracking-[0.08em] text-violet"
            >
              {COPY.action.retry}
            </button>
          </>
        )}
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 text-meta font-bold uppercase tracking-[0.08em] text-canvas/50"
        >
          <ArrowLeft size={12} strokeWidth={2.2} /> Retour
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="fixed inset-0 z-40 bg-ink text-canvas flex flex-col items-center justify-center px-6 text-center">
        <p className="text-canvas/65 text-body">
          Aucun événement actif à scanner pour le moment.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 text-meta font-bold uppercase tracking-[0.08em] text-violet"
        >
          <ArrowLeft size={12} strokeWidth={2.2} /> Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-ink text-canvas flex flex-col">
      {/* === Header — back + event selector === */}
      <header className="h-14 px-3 flex items-center gap-2 border-b border-canvas/10 shrink-0">
        <Link
          href="/dashboard"
          aria-label="Retour"
          className="h-10 w-10 rounded-full hover:bg-canvas/10 flex items-center justify-center text-canvas transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={1.7} />
        </Link>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex-1 flex items-center gap-2 h-10 px-3 rounded-full bg-canvas/10 hover:bg-canvas/15 transition-colors min-w-0"
          aria-label="Changer d'événement"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-canvas/55 shrink-0">
            Événement
          </span>
          <span className="text-[13px] font-semibold text-canvas truncate flex-1 text-left">
            {event.name}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            className="text-canvas/55 shrink-0"
          />
        </button>
      </header>

      {/* === Viewfinder, fills the remaining vertical space (~60 %) === */}
      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-8 py-6 min-h-0">
        <Viewfinder mode={mode} scanner={scanner} />

        {/* Manual entry, always available and promoted when the camera
            cannot run. A door does not stop working because a phone
            refused a permission. */}
        {scanner.status !== "scanning" ? (
          <CameraTrouble status={scanner.status} onRetry={scanner.start} />
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim().length < 4) return;
            void handleCode(manualCode);
            setManualCode("");
          }}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Saisir le code du billet"
            aria-label="Saisir le code du billet"
            autoComplete="off"
            className="h-11 flex-1 rounded-full border border-canvas/15 bg-canvas/[0.06] px-4 text-[13px] text-canvas placeholder:text-canvas/40 outline-none focus:border-violet"
          />
          <button
            type="submit"
            disabled={manualCode.trim().length < 4}
            className="h-11 shrink-0 rounded-full bg-violet px-5 text-[13px] font-bold text-canvas transition-opacity disabled:opacity-40"
          >
            Valider
          </button>
        </form>
      </main>

      {/* === Counter + recent scans === */}
      <section className="px-5 pb-3 shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div
              className="num text-canvas"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "32px",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {count.toLocaleString("fr-FR").replace(/,/g, " ")}
              <span className="text-canvas/55 text-h3 ml-1.5 font-bold">
                / {totalCapacity.toLocaleString("fr-FR").replace(/,/g, " ")}
              </span>
            </div>
            <div className="text-meta text-canvas/55 mt-1">
              scannés · {Math.round((count / Math.max(1, totalCapacity)) * 100)}{" "}
              %
            </div>
          </div>
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-canvas/10 text-canvas text-[10px] font-bold uppercase tracking-[0.08em]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-violet"
            />
            Live
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto scroll-thin -mx-5 px-5 pb-1">
          {recent.length === 0 ? (
            <span className="text-meta text-canvas/40 italic">
              En attente de scans…
            </span>
          ) : (
            recent.map((s) => <RecentScanChip key={s.id} scan={s} />)
          )}
        </div>
      </section>

      {/* === Bottom action bar — mode toggle + stats + Régie === */}
      <footer className="border-t border-canvas/10 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shrink-0 flex items-center gap-2">
        <ModeToggle mode={mode} onChange={setMode} />
        <button
          type="button"
          onClick={() => setStatsOpen(true)}
          className="h-10 px-3 rounded-full bg-canvas/10 hover:bg-canvas/15 transition-colors text-[12px] font-semibold text-canvas inline-flex items-center gap-1.5"
        >
          <Sliders size={13} strokeWidth={1.8} />
          Statistiques
        </button>
        <Link
          href={`/events/${event.id}?tab=regie`}
          className="h-10 px-3 rounded-full bg-violet hover:bg-violet-deep transition-colors text-[12px] font-semibold text-canvas inline-flex items-center gap-1.5"
        >
          Régie
          <ArrowUpRight size={13} strokeWidth={1.9} />
        </Link>
      </footer>

      <EventPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        events={eligible}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setPickerOpen(false);
        }}
      />

      <StatsSheet
        open={statsOpen}
        onOpenChange={setStatsOpen}
        eventId={event.id}
        eventName={event.name}
      />
    </div>
  );
}

// ─── Viewfinder ────────────────────────────────────────────────────────

function Viewfinder({
  mode,
  scanner,
}: {
  mode: Mode;
  scanner: QrScanner;
}) {
  // The camera fills the frame once it is running; the decorative
  // brackets and sweep stay on top of it so the surface still reads as a
  // scanner while the stream warms up or when it cannot start.
  return (
    <div className="relative w-full max-w-sm aspect-square">
      {/* Always mounted. The hook attaches the stream to this element
          before the status flips, and a video that mounts only once
          scanning has started is never there to receive it. */}
      <video
        ref={scanner.videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Aperçu de la caméra"
        className={cn(
          "absolute inset-0 h-full w-full rounded-[var(--radius-xl)] object-cover transition-opacity duration-200",
          scanner.status === "scanning" ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Dark frame backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[var(--radius-xl)]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(134,91,166,0.22), transparent 70%), rgba(10,31,61,0.45)",
          border: "1px solid rgba(250,247,240,0.08)",
        }}
      />

      {/* Animated scanning line */}
      <motion.div
        aria-hidden
        initial={{ y: "10%", opacity: 0.4 }}
        animate={{ y: "85%", opacity: [0.4, 0.95, 0.4] }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "reverse",
        }}
        className="absolute inset-x-8 h-[2px] rounded-full"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--color-violet), transparent)",
          boxShadow: "0 0 18px rgba(134,91,166,0.7)",
        }}
      />

      {/* Corner brackets */}
      <Bracket position="tl" />
      <Bracket position="tr" />
      <Bracket position="bl" />
      <Bracket position="br" />

      {/* Center icon + mode label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-canvas/60 pointer-events-none">
        <ScanLine size={36} strokeWidth={1.4} />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] mt-3 text-canvas/55">
          Mode {MODE_LABEL[mode]}
        </span>
      </div>
    </div>
  );
}

function Bracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const positionClasses = {
    tl: "top-3 left-3",
    tr: "top-3 right-3 rotate-90",
    bl: "bottom-3 left-3 -rotate-90",
    br: "bottom-3 right-3 rotate-180",
  }[position];
  return (
    <span
      aria-hidden
      className={cn("absolute pointer-events-none", positionClasses)}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M2 12 V2 H12"
          stroke="var(--color-violet)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

// ─── Camera trouble ────────────────────────────────────────────────────
//
// Says which problem it is, because the remedy differs: a refused
// permission is retried, a missing camera is not, and an insecure origin
// is a deploy setting the host cannot change from here.

const TROUBLE: Record<string, { text: string; retry: boolean }> = {
  idle: { text: "Caméra en veille.", retry: true },
  starting: { text: "Ouverture de la caméra…", retry: false },
  denied: {
    text: "Accès à la caméra refusé. Autorisez-le, ou saisissez le code ci-dessous.",
    retry: true,
  },
  no_camera: {
    text: "Aucune caméra sur cet appareil. Saisissez le code ci-dessous.",
    retry: false,
  },
  insecure: {
    text: "La caméra exige une connexion HTTPS. Saisissez le code ci-dessous.",
    retry: false,
  },
  error: { text: "La caméra n'a pas démarré.", retry: true },
};

function CameraTrouble({
  status,
  onRetry,
}: {
  status: string;
  onRetry: () => void;
}) {
  const info = TROUBLE[status] ?? TROUBLE.error;
  return (
    <div
      role={status === "starting" ? "status" : "alert"}
      aria-live="polite"
      className="flex w-full max-w-sm flex-col items-center gap-2 text-center"
    >
      <p className="text-[12.5px] leading-snug text-canvas/60">{info.text}</p>
      {info.retry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-meta font-bold uppercase tracking-[0.08em] text-violet"
        >
          Activer la caméra
        </button>
      ) : null}
    </div>
  );
}

// ─── Recent scan chip ──────────────────────────────────────────────────

function RecentScanChip({ scan }: { scan: RecentScan }) {
  const valid = scan.status === "valid";
  const ageS = Math.max(0, Math.round((Date.now() - scan.at) / 1000));
  return (
    <div
      className={cn(
        "shrink-0 inline-flex items-center gap-2 rounded-full px-3 h-9 text-[12px] num",
        valid
          ? "bg-success/15 text-success"
          : "bg-danger/20 text-danger",
      )}
    >
      <span
        aria-hidden
        className="h-5 w-5 rounded-full bg-canvas/10 flex items-center justify-center text-[10px] font-bold"
      >
        {valid ? (
          <Check size={11} strokeWidth={2.4} />
        ) : (
          <X size={11} strokeWidth={2.4} />
        )}
      </span>
      <span className="font-semibold text-canvas">{scan.initials}</span>
      <span className="text-canvas/55">·</span>
      <span className="text-canvas/65 truncate max-w-[120px]">{scan.tierName}</span>
      <span className="text-canvas/45">{ageS}s</span>
    </div>
  );
}

// ─── Mode toggle ───────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (next: Mode) => void;
}) {
  return (
    <div className="flex-1 inline-flex items-center bg-canvas/10 rounded-full p-1">
      {(["standard", "express", "exit"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 h-8 rounded-full text-[11.5px] font-semibold transition-colors",
            mode === m
              ? "bg-canvas text-ink"
              : "text-canvas/65 hover:text-canvas",
          )}
        >
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

// ─── Event picker bottom sheet ─────────────────────────────────────────

function EventPicker({
  open,
  onOpenChange,
  events,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  events: LyfeEvent[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ y: "20%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "20%", opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="fixed bottom-0 inset-x-0 z-50 bg-surface text-ink rounded-t-[var(--radius-xl)] max-h-[80vh] overflow-hidden flex flex-col"
              >
                <header className="px-5 pt-5 pb-3 border-b border-line-soft">
                  <RadixDialog.Title asChild>
                    <h2
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 600,
                        fontSize: "20px",
                        lineHeight: 1.15,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Choisir un événement
                    </h2>
                  </RadixDialog.Title>
                  <p className="text-meta text-ink-soft mt-1">
                    Le scanner se ré-initialise sur l&apos;événement sélectionné.
                  </p>
                </header>
                <ul className="overflow-y-auto scroll-thin">
                  {events.map((e) => {
                    const active = e.id === selectedId;
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(e.id)}
                          className={cn(
                            "w-full px-5 h-16 flex items-center gap-3 text-left transition-colors",
                            active ? "bg-violet-soft/60" : "hover:bg-canvas-2/40",
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-ink truncate">
                              {e.name}
                            </div>
                            <div className="text-meta text-ink-mute truncate num">
                              {e.venue.name}
                            </div>
                          </div>
                          {active ? (
                            <Check
                              size={16}
                              strokeWidth={2.2}
                              className="text-violet-deep shrink-0"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

// ─── Stats sheet ───────────────────────────────────────────────────────

function StatsSheet({
  open,
  onOpenChange,
  eventId,
  eventName,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  eventId: string;
  eventName: string;
}) {
  const regieQuery = useEventQuery(
    (repo) => repo.getRegie(eventId),
    [eventId],
  );
  const data = regieQuery.data;

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ y: "20%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "20%", opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="fixed bottom-0 inset-x-0 z-50 bg-surface text-ink rounded-t-[var(--radius-xl)] max-h-[80vh] overflow-hidden flex flex-col"
              >
                <header className="px-5 pt-5 pb-3 border-b border-line-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <RadixDialog.Title asChild>
                        <h2
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontWeight: 600,
                            fontSize: "20px",
                            lineHeight: 1.15,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          Statistiques live
                        </h2>
                      </RadixDialog.Title>
                      <p className="text-meta text-ink-soft mt-1 truncate">
                        {eventName}
                      </p>
                    </div>
                    <RadixDialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Fermer"
                        className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute shrink-0 transition-colors"
                      >
                        <X size={16} strokeWidth={1.8} />
                      </button>
                    </RadixDialog.Close>
                  </div>
                </header>
                <div className="overflow-y-auto scroll-thin p-5 space-y-3">
                  {data && data.gates.some((g) => g.status !== "offline") ? (
                    data.gates.map((g) => (
                      <div
                        key={g.id}
                        className={cn(
                          "rounded-[var(--radius-md)] px-4 py-3 border",
                          g.status === "alert"
                            ? "bg-tint-peach/40 border-warning/30"
                            : "bg-canvas-2 border-line-soft",
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-2">
                          <span className="text-[13px] font-semibold text-ink">
                            {g.name}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center h-6 px-2 rounded-full text-[10px] font-bold uppercase tracking-[0.08em]",
                              g.status === "alert"
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success",
                            )}
                          >
                            {g.status === "alert" ? "Alerte" : "Nominal"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-meta num">
                          <div>
                            <div className="text-ink-mute">Scans/min</div>
                            <div className="font-bold text-ink">
                              {g.scansPerMin}
                            </div>
                          </div>
                          <div>
                            <div className="text-ink-mute">Queue</div>
                            <div className="font-bold text-ink">
                              {g.queueMin} min
                            </div>
                          </div>
                          <div>
                            <div className="text-ink-mute">Staff</div>
                            <div className="font-bold text-ink">
                              {g.staffActive}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <Settings2
                        size={26}
                        strokeWidth={1.5}
                        className="text-ink-mute mx-auto"
                      />
                      <p className="text-meta text-ink-soft mt-3">
                        La régie live s&apos;ouvre le jour J. Aucune cadence
                        gate-par-gate à afficher pour le moment.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
