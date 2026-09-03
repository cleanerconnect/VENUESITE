"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import {
  BOOST_LABEL,
  BoostFormatIcon,
} from "@/components/visibility/BoostFormatIcon";
import {
  getAudienceSegments,
  getBoostFormats,
  type BoostFormat,
} from "@/lib/data/static/visibility";
import type { BoostType } from "@/lib/types/visibility";
import { formatMAD } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;
type StepIdx = 0 | 1 | 2;

const STEP_TITLES = [
  "Choisir le format",
  "Cibler l'audience",
  "Budget et durée",
] as const;

// Time-based vs impression-based vs notification-based formats. Drives
// which controls render in step 3 and how the estimate math runs.
const TIME_BASED: BoostType[] = ["splash_welcome", "feed_top"];
const IMPRESSION_BASED: BoostType[] = ["sponsored_card", "geo_popup"];
const NOTIFICATION_BASED: BoostType[] = ["targeted_notification"];

const DURATION_PRESETS: Record<string, number[]> = {
  splash_welcome: [1, 3, 7],
  feed_top: [1, 3, 7],
};

// Average attributed-ticket value, MAD. Used to translate spend → tickets
// → revenue → ROAS estimate. Real product reads this from event tier mix.
const AVG_TICKET_MAD = 820;

// Conversion rate per format, captured in % of impressions / sends that
// turn into tickets. Mirrors what we see in the demo campaigns.
const CONVERSION_RATE: Record<BoostType, number> = {
  splash_welcome: 0.022, // 2.2 %
  feed_top: 0.014,
  sponsored_card: 0.008,
  targeted_notification: 0.018,
  geo_popup: 0.011,
};

interface WizardState {
  step: StepIdx;
  format: BoostType | null;
  segmentId: string | null;
  budgetMad: number;
  durationDays: number;
  impressionsK: number; // thousands of impressions, for CPM formats
  notifications: number;
  dayParting: boolean;
}

const INITIAL: WizardState = {
  step: 0,
  format: null,
  segmentId: null,
  budgetMad: 8000,
  durationDays: 3,
  impressionsK: 20,
  notifications: 2000,
  dayParting: false,
};

export function BoostWizard({
  open,
  onOpenChange,
  initialSegmentId,
  initialFormat,
  eventName,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  initialSegmentId?: string;
  initialFormat?: BoostType;
  /** When opened from an event's Promote tab, surfaces this in the header. */
  eventName?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const segments = useMemo(() => getAudienceSegments(), []);
  const formats = useMemo(() => getBoostFormats(), []);

  const [state, setState] = useState<WizardState>(() => ({
    ...INITIAL,
    segmentId: initialSegmentId ?? null,
    format: initialFormat ?? null,
  }));

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => setState(INITIAL);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const goBack = () => set("step", Math.max(0, state.step - 1) as StepIdx);
  const goNext = () => set("step", Math.min(2, state.step + 1) as StepIdx);

  const canAdvance =
    (state.step === 0 && state.format !== null) ||
    (state.step === 1 && state.segmentId !== null) ||
    (state.step === 2 && state.budgetMad > 0);

  const launch = () => {
    toast({
      tone: "success",
      title: "Campagne lancée",
      description:
        "Votre boost est en cours de validation. Diffusion sous 30 minutes.",
    });
    handleClose(false);
    // Mock: refresh the visibility page so the user sees their portfolio update.
    router.refresh();
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={handleClose}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.26, ease: EASE }}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
                  "w-[calc(100%-2rem)] max-w-[760px] max-h-[90vh] flex flex-col",
                  "bg-surface rounded-[var(--radius-xl)] shadow-deep border border-line",
                )}
              >
                {/* Header with step indicator */}
                <div className="px-6 pt-5 pb-4 border-b border-line-soft flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-eyebrow text-violet-deep">
                      Étape {state.step + 1} sur 3
                      {eventName ? (
                        <>
                          <span className="text-ink-mute mx-1.5">·</span>
                          <span className="text-ink-mute normal-case tracking-normal font-medium">
                            {eventName}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <RadixDialog.Title className="text-h3 text-ink mt-1">
                      {STEP_TITLES[state.step]}
                    </RadixDialog.Title>
                  </div>
                  <RadixDialog.Close
                    aria-label="Fermer"
                    className="h-8 w-8 -mr-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute shrink-0"
                  >
                    <X size={16} strokeWidth={1.8} />
                  </RadixDialog.Close>
                </div>

                {/* Step progress bar */}
                <div className="h-1 bg-canvas-2 relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-violet"
                    initial={false}
                    animate={{ width: `${((state.step + 1) / 3) * 100}%` }}
                    transition={{ duration: 0.32, ease: EASE }}
                  />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto scroll-thin">
                  <AnimatePresence mode="wait">
                    {state.step === 0 ? (
                      <StepFormat
                        key="step-0"
                        formats={formats}
                        value={state.format}
                        onChange={(v) => set("format", v)}
                      />
                    ) : null}
                    {state.step === 1 ? (
                      <StepAudience
                        key="step-1"
                        segments={segments}
                        value={state.segmentId}
                        onChange={(v) => set("segmentId", v)}
                      />
                    ) : null}
                    {state.step === 2 ? (
                      <StepBudget
                        key="step-2"
                        state={state}
                        set={set}
                        format={state.format!}
                        segmentName={
                          segments.find((s) => s.id === state.segmentId)?.name ??
                          ""
                        }
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-line-soft bg-canvas-2/50 flex items-center justify-between gap-3 rounded-b-[var(--radius-xl)]">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={goBack}
                    disabled={state.step === 0}
                    iconLeft={<ArrowLeft size={14} strokeWidth={1.8} />}
                  >
                    Précédent
                  </Button>
                  {state.step < 2 ? (
                    <Button
                      size="md"
                      onClick={goNext}
                      disabled={!canAdvance}
                      iconRight={<ArrowRight size={14} strokeWidth={1.8} />}
                    >
                      Suivant
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      onClick={launch}
                      disabled={!canAdvance}
                      iconLeft={<CheckCircle2 size={14} strokeWidth={1.8} />}
                    >
                      Lancer la campagne
                    </Button>
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

// Convenience launcher: trigger button + state-managed wizard. Use this
// from anywhere a "Lancer un boost" CTA needs to appear. For the audience
// cards, pass initialSegmentId to pre-select that segment.
export function BoostWizardLauncher({
  initialSegmentId,
  eventName,
  className,
  children,
}: {
  initialSegmentId?: string;
  eventName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      <BoostWizard
        open={open}
        onOpenChange={setOpen}
        initialSegmentId={initialSegmentId}
        eventName={eventName}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 1 — Format picker
// ──────────────────────────────────────────────────────────────────────

function StepFormat({
  formats,
  value,
  onChange,
}: {
  formats: BoostFormat[];
  value: BoostType | null;
  onChange: (next: BoostType) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="px-6 py-6"
    >
      <p className="text-body text-ink-soft max-w-xl">
        Cinq formats, du plus visible au plus ciblé. Le tarif s&apos;applique
        tel quel, sans surprise.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {formats.map((f) => {
          const selected = value === f.type;
          return (
            <button
              key={f.type}
              type="button"
              onClick={() => onChange(f.type)}
              className={cn(
                "text-left p-4 rounded-[var(--radius-md)] border bg-surface transition-all",
                "hover:border-ink",
                selected
                  ? "border-violet ring-1 ring-violet/30 bg-violet-soft/50"
                  : "border-line",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "h-10 w-10 rounded-[10px] flex items-center justify-center shrink-0",
                    selected ? "bg-violet text-canvas" : "bg-violet-soft text-violet-deep",
                  )}
                >
                  <BoostFormatIcon type={f.type} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] font-semibold text-ink">
                      {f.label}
                    </div>
                    {selected ? (
                      <Check size={14} strokeWidth={2.2} className="text-violet shrink-0" />
                    ) : null}
                  </div>
                  <div className="text-meta text-ink-soft mt-1 leading-relaxed">
                    {f.tagline}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-meta">
                    <span className="font-bold text-violet-deep num">
                      {f.pricing}
                    </span>
                    <span className="text-ink-mute">·</span>
                    <span className="text-ink-mute">{f.reachLabel}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 2 — Audience targeting
// ──────────────────────────────────────────────────────────────────────

function StepAudience({
  segments,
  value,
  onChange,
}: {
  segments: ReturnType<typeof getAudienceSegments>;
  value: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="px-6 py-6"
    >
      <p className="text-body text-ink-soft max-w-xl">
        Sélectionnez une audience sauvegardée. Plus l&apos;audience est
        précise, meilleur le ROAS.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {segments.map((s) => {
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={cn(
                "text-left p-4 rounded-[var(--radius-md)] border bg-surface transition-all",
                "hover:border-ink",
                selected
                  ? "border-violet ring-1 ring-violet/30 bg-violet-soft/50"
                  : "border-line",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Target size={14} strokeWidth={1.8} className="text-violet-deep shrink-0" />
                <div className="text-[14px] font-semibold text-ink">
                  {s.name}
                </div>
                {selected ? (
                  <Check size={14} strokeWidth={2.2} className="text-violet ml-auto" />
                ) : null}
              </div>
              <div className="text-meta text-ink-soft leading-relaxed">
                {s.description}
              </div>
              <div className="text-meta text-ink-mute num mt-3">
                {s.memberCount.toLocaleString("fr-FR").replace(/,/g, " ")}{" "}
                personnes
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-5 p-3 rounded-[var(--radius-sm)] bg-canvas-2 border border-line-soft text-meta text-ink-soft">
        Besoin d&apos;une audience plus fine ? Créez un segment depuis l&apos;onglet
        Audiences, puis revenez ici.
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 3 — Budget + duration with live ROAS preview
// ──────────────────────────────────────────────────────────────────────

function StepBudget({
  state,
  set,
  format,
  segmentName,
}: {
  state: WizardState;
  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  format: BoostType;
  segmentName: string;
}) {
  const isTime = TIME_BASED.includes(format);
  const isImpressions = IMPRESSION_BASED.includes(format);
  const isNotif = NOTIFICATION_BASED.includes(format);

  // Estimate volume from spend + format pricing.
  const estimatedImpressions = useMemo(() => {
    if (isTime) {
      // Approximate impressions per day per format.
      const perDay: Record<BoostType, number> = {
        splash_welcome: 12_000,
        feed_top: 6_400,
        sponsored_card: 0,
        targeted_notification: 0,
        geo_popup: 0,
      };
      return perDay[format] * state.durationDays;
    }
    if (isImpressions) return state.impressionsK * 1_000;
    if (isNotif) return state.notifications;
    return 0;
  }, [isTime, isImpressions, isNotif, format, state]);

  const estimatedTickets = Math.round(
    estimatedImpressions * CONVERSION_RATE[format],
  );
  const estimatedRevenue = estimatedTickets * AVG_TICKET_MAD;
  const estimatedRoas = state.budgetMad > 0
    ? estimatedRevenue / state.budgetMad
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="px-6 py-6"
    >
      <div className="flex items-center gap-2 text-meta text-ink-soft">
        <BoostFormatIcon type={format} size={14} className="text-violet-deep" />
        {BOOST_LABEL[format]}
        {segmentName ? (
          <>
            <span className="text-ink-mute">·</span>
            <span>{segmentName}</span>
          </>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <Input
          label="Budget total"
          type="number"
          value={state.budgetMad.toString()}
          onChange={(e) =>
            set("budgetMad", Math.max(0, parseInt(e.target.value, 10) || 0))
          }
          suffix="MAD"
        />

        {isTime ? (
          <div>
            <label className="text-eyebrow text-ink-soft block mb-1.5">
              Durée
            </label>
            <div className="flex gap-2">
              {DURATION_PRESETS[format].map((d) => {
                const selected = state.durationDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("durationDays", d)}
                    className={cn(
                      "flex-1 h-12 rounded-[var(--radius-sm)] border text-[14px] font-semibold transition-all",
                      selected
                        ? "border-violet bg-violet-soft text-violet-deep"
                        : "border-line text-ink-soft hover:border-ink",
                    )}
                  >
                    {d} {d > 1 ? "jours" : "jour"}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {isImpressions ? (
          <Input
            label="Impressions visées"
            type="number"
            value={state.impressionsK.toString()}
            onChange={(e) =>
              set("impressionsK", Math.max(1, parseInt(e.target.value, 10) || 0))
            }
            suffix="× 1 000"
          />
        ) : null}

        {isNotif ? (
          <Input
            label="Notifications à envoyer"
            type="number"
            value={state.notifications.toString()}
            onChange={(e) =>
              set("notifications", Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            hint="Cap quotidien : 5 000."
          />
        ) : null}
      </div>

      <div className="mt-5 pt-5 border-t border-line-soft">
        <Switch
          label="Limiter la diffusion à 19h-23h"
          description="Le créneau soirée capte la majorité des conversions sur l'app."
          checked={state.dayParting}
          onCheckedChange={(v) => set("dayParting", v)}
        />
      </div>

      {/* Live preview, the screen that closes the deal */}
      <div className="mt-6 bg-surface-ink text-canvas rounded-[var(--radius-md)] p-5 relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(134,91,166,0.36), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-eyebrow text-canvas/55">
            Estimation
            <Pill tone="info">DÉMO</Pill>
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 mt-4">
            <Stat
              label="Impressions"
              value={estimatedImpressions.toLocaleString("fr-FR").replace(/,/g, " ")}
            />
            <Stat
              label="Billets"
              value={estimatedTickets.toLocaleString("fr-FR").replace(/,/g, " ")}
            />
            <Stat
              label="ROAS"
              value={
                <>
                  {estimatedRoas.toFixed(1).replace(".", ",")}
                  <span className="text-canvas/60 ml-0.5">×</span>
                </>
              }
              accent
            />
          </div>
          <div className="text-meta text-canvas/60 mt-4">
            Revenu attribué estimé :{" "}
            <span className="text-canvas font-semibold num">
              {formatMAD(estimatedRevenue)}
            </span>
            . Calcul basé sur le ticket moyen de 820 MAD et la conversion
            historique du format.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-eyebrow text-canvas/55">{label}</div>
      <div
        className={cn(
          "num mt-1.5",
          accent ? "text-violet" : "text-canvas",
        )}
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(22px, 3vw, 30px)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
