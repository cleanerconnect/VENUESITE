"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Tag, X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { getAllEvents } from "@/lib/mock/events";
import { cn } from "@/lib/utils/cn";
import type { PromoCodeKind, PromoCodeScope } from "@/lib/types/promoCodes";

type StepIdx = 0 | 1 | 2 | 3;
const STEPS: { idx: StepIdx; label: string }[] = [
  { idx: 0, label: "Type & valeur" },
  { idx: 1, label: "Périmètre" },
  { idx: 2, label: "Limites" },
  { idx: 3, label: "Récap" },
];

interface DraftCode {
  step: StepIdx;
  code: string;
  kind: PromoCodeKind;
  valuePct: number;
  valueFlatMad: number;
  combinable: boolean;
  scopeKind: "all_events" | "event" | "tier";
  eventId: string | null;
  tierId: string | null;
  maxRedemptions: number;
  maxPerUser: number; // 0 = unlimited
  startsAtDays: number; // days from today
  endsAtDays: number; // days from today
  notes: string;
}

const INITIAL: DraftCode = {
  step: 0,
  code: "",
  kind: "percentage",
  valuePct: 10,
  valueFlatMad: 50,
  combinable: false,
  scopeKind: "all_events",
  eventId: null,
  tierId: null,
  maxRedemptions: 100,
  maxPerUser: 1,
  startsAtDays: 0,
  endsAtDays: 30,
  notes: "",
};

export function CreatePromoCodeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { toast } = useToast();
  const events = useMemo(() => getAllEvents(), []);
  const [state, setState] = useState<DraftCode>(INITIAL);

  const set = <K extends keyof DraftCode>(key: K, value: DraftCode[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => setState(INITIAL);
  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const goBack = () =>
    set("step", Math.max(0, state.step - 1) as StepIdx);
  const goNext = () =>
    set("step", Math.min(3, state.step + 1) as StepIdx);

  const codeValid = /^[A-Z0-9_]{3,}$/.test(state.code);
  const valueValid =
    state.kind === "percentage"
      ? state.valuePct > 0 && state.valuePct <= 100
      : state.kind === "flat"
        ? state.valueFlatMad > 0
        : true;
  const scopeValid =
    state.scopeKind === "all_events" ||
    (state.scopeKind === "event" && Boolean(state.eventId)) ||
    (state.scopeKind === "tier" &&
      Boolean(state.eventId) &&
      Boolean(state.tierId));
  const limitsValid =
    state.maxRedemptions > 0 && state.endsAtDays > state.startsAtDays;

  const canAdvance =
    (state.step === 0 && codeValid && valueValid) ||
    (state.step === 1 && scopeValid) ||
    (state.step === 2 && limitsValid) ||
    state.step === 3;

  const launch = () => {
    toast({
      tone: "success",
      title: `Code ${state.code} créé`,
      description: "Le code est actif et peut être partagé immédiatement.",
    });
    handleClose(false);
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
                className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: "8%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "12%" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="fixed z-50 bg-surface shadow-deep border border-line
                  inset-x-0 bottom-0 w-full rounded-t-[var(--radius-xl)]
                  max-h-[92vh] overflow-hidden
                  md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto
                  md:-translate-x-1/2 md:-translate-y-1/2
                  md:w-[640px] md:max-w-[92vw] md:rounded-[var(--radius-xl)] md:max-h-[88vh]
                  flex flex-col"
              >
                <header className="flex items-start gap-3 p-6 border-b border-line-soft">
                  <span
                    aria-hidden
                    className="h-10 w-10 rounded-[12px] bg-violet-soft flex items-center justify-center shrink-0"
                  >
                    <Tag size={18} strokeWidth={1.7} className="text-violet-deep" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <RadixDialog.Title asChild>
                      <h2
                        className="text-ink"
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontWeight: 600,
                          fontSize: "20px",
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Créer un code promo
                      </h2>
                    </RadixDialog.Title>
                    <RadixDialog.Description asChild>
                      <p className="text-meta text-ink-soft mt-1">
                        Étape {state.step + 1} sur 4 · {STEPS[state.step].label}
                      </p>
                    </RadixDialog.Description>
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
                </header>

                {/* Stepper */}
                <div className="px-6 pt-4 pb-2 flex items-center gap-1.5">
                  {STEPS.map((s) => (
                    <span
                      key={s.idx}
                      className={cn(
                        "flex-1 h-1 rounded-full transition-colors",
                        s.idx <= state.step ? "bg-violet" : "bg-canvas-2",
                      )}
                    />
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto scroll-thin p-6">
                  {state.step === 0 ? (
                    <StepValue state={state} set={set} />
                  ) : state.step === 1 ? (
                    <StepScope state={state} set={set} events={events} />
                  ) : state.step === 2 ? (
                    <StepLimits state={state} set={set} />
                  ) : (
                    <StepRecap state={state} events={events} />
                  )}
                </div>

                <footer className="border-t border-line-soft p-4 flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="md"
                    iconLeft={<ArrowLeft size={14} strokeWidth={1.8} />}
                    onClick={goBack}
                    disabled={state.step === 0}
                  >
                    Retour
                  </Button>
                  {state.step < 3 ? (
                    <Button
                      size="md"
                      iconRight={<ArrowRight size={14} strokeWidth={1.8} />}
                      onClick={goNext}
                      disabled={!canAdvance}
                    >
                      Continuer
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      iconLeft={<Check size={14} strokeWidth={1.8} />}
                      onClick={launch}
                    >
                      Créer le code
                    </Button>
                  )}
                </footer>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

// ─── Step 1 — type & valeur ────────────────────────────────────────────

type SetFn = <K extends keyof DraftCode>(key: K, value: DraftCode[K]) => void;

function StepValue({ state, set }: { state: DraftCode; set: SetFn }) {
  return (
    <div className="space-y-5">
      <Input
        label="Code (UPPER_SNAKE_CASE)"
        value={state.code}
        onChange={(e) =>
          set(
            "code",
            e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
          )
        }
        placeholder="EX. ETUDIANTS_CASA"
        autoComplete="off"
      />

      <div>
        <div className="text-eyebrow text-ink-mute mb-2">Type de réduction</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              { id: "percentage", label: "Pourcentage", sub: "% sur le tarif" },
              { id: "flat", label: "Montant fixe", sub: "MAD soustraits" },
              { id: "comp", label: "Comp / Gratuit", sub: "100 % gracieux" },
            ] as const
          ).map((opt) => {
            const active = state.kind === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => set("kind", opt.id)}
                className={cn(
                  "text-left rounded-[var(--radius-md)] border p-3 transition-colors",
                  active
                    ? "border-violet bg-violet-soft"
                    : "border-line bg-surface hover:border-violet-soft",
                )}
              >
                <div className="text-[13.5px] font-semibold text-ink">
                  {opt.label}
                </div>
                <div className="text-meta text-ink-soft mt-0.5">{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {state.kind === "percentage" ? (
        <Input
          label="Réduction (%)"
          type="number"
          min={1}
          max={100}
          value={state.valuePct}
          onChange={(e) => set("valuePct", Number(e.target.value))}
        />
      ) : state.kind === "flat" ? (
        <Input
          label="Réduction (MAD)"
          type="number"
          min={1}
          value={state.valueFlatMad}
          onChange={(e) => set("valueFlatMad", Number(e.target.value))}
        />
      ) : (
        <div className="rounded-[var(--radius-md)] bg-canvas-2 border-l-2 border-violet p-3">
          <p className="text-meta text-ink leading-relaxed">
            Les codes Comp / Gratuits offrent 100 % de réduction. Ils
            consomment l'inventaire mais ne génèrent pas de revenu — utilisez
            l'onglet Invitations pour la gestion détaillée presse / sponsors.
          </p>
        </div>
      )}

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={state.combinable}
          onChange={(e) => set("combinable", e.target.checked)}
          className="mt-1 h-4 w-4 accent-violet"
        />
        <div>
          <div className="text-[13.5px] text-ink">
            Cumulable avec d&apos;autres codes
          </div>
          <div className="text-meta text-ink-soft mt-0.5">
            Par défaut, un seul code peut s&apos;appliquer par achat.
          </div>
        </div>
      </label>
    </div>
  );
}

// ─── Step 2 — scope ────────────────────────────────────────────────────

function StepScope({
  state,
  set,
  events,
}: {
  state: DraftCode;
  set: SetFn;
  events: ReturnType<typeof getAllEvents>;
}) {
  const eligibleEvents = events.filter(
    (e) =>
      e.status.state === "on_sale" ||
      e.status.state === "live" ||
      e.status.state === "in_review",
  );
  const selectedEvent = state.eventId
    ? eligibleEvents.find((e) => e.id === state.eventId)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-eyebrow text-ink-mute mb-2">Périmètre</div>
        <div className="space-y-2">
          {(
            [
              {
                id: "all_events",
                label: "Tous mes événements",
                sub: "Le code s'applique à n'importe quel événement actif.",
              },
              {
                id: "event",
                label: "Un événement spécifique",
                sub: "Limité à l'événement sélectionné, tous tarifs.",
              },
              {
                id: "tier",
                label: "Un tarif spécifique",
                sub: "Limité à un seul tarif d'un événement.",
              },
            ] as const
          ).map((opt) => {
            const active = state.scopeKind === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  set("scopeKind", opt.id);
                  if (opt.id === "all_events") {
                    set("eventId", null);
                    set("tierId", null);
                  }
                }}
                className={cn(
                  "w-full text-left rounded-[var(--radius-md)] border p-3.5 transition-colors",
                  active
                    ? "border-violet bg-violet-soft"
                    : "border-line bg-surface hover:border-violet-soft",
                )}
              >
                <div className="text-[14px] font-semibold text-ink">
                  {opt.label}
                </div>
                <div className="text-meta text-ink-soft mt-0.5 leading-relaxed">
                  {opt.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {state.scopeKind !== "all_events" ? (
        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Événement</div>
          <select
            value={state.eventId ?? ""}
            onChange={(e) => {
              set("eventId", e.target.value || null);
              set("tierId", null);
            }}
            className="w-full h-11 px-3 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors"
          >
            <option value="">— Choisir un événement —</option>
            {eligibleEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {state.scopeKind === "tier" && selectedEvent ? (
        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Tarif</div>
          <select
            value={state.tierId ?? ""}
            onChange={(e) => set("tierId", e.target.value || null)}
            className="w-full h-11 px-3 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors"
          >
            <option value="">— Choisir un tarif —</option>
            {selectedEvent.tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.faceValueMad.toLocaleString("fr-FR").replace(/,/g, " ")} MAD
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

// ─── Step 3 — limites ──────────────────────────────────────────────────

function StepLimits({ state, set }: { state: DraftCode; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Redemptions maximum (total)"
          type="number"
          min={1}
          value={state.maxRedemptions}
          onChange={(e) => set("maxRedemptions", Number(e.target.value))}
        />
        <Input
          label="Par utilisateur (0 = illimité)"
          type="number"
          min={0}
          value={state.maxPerUser}
          onChange={(e) => set("maxPerUser", Number(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Démarrage (jours à partir d'aujourd'hui)"
          type="number"
          min={0}
          value={state.startsAtDays}
          onChange={(e) => set("startsAtDays", Number(e.target.value))}
        />
        <Input
          label="Expiration (jours à partir d'aujourd'hui)"
          type="number"
          min={1}
          value={state.endsAtDays}
          onChange={(e) => set("endsAtDays", Number(e.target.value))}
        />
      </div>

      <div>
        <div className="text-eyebrow text-ink-mute mb-2">Note interne</div>
        <textarea
          value={state.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Visible uniquement par votre équipe — partenaire, brief, contexte."
          className="w-full px-3 py-2.5 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 4 — récap ────────────────────────────────────────────────────

function StepRecap({
  state,
  events,
}: {
  state: DraftCode;
  events: ReturnType<typeof getAllEvents>;
}) {
  const valueLabel =
    state.kind === "percentage"
      ? `−${state.valuePct} %`
      : state.kind === "flat"
        ? `−${state.valueFlatMad.toLocaleString("fr-FR").replace(/,/g, " ")} MAD`
        : "Comp · gratuit";

  const scopeLabel =
    state.scopeKind === "all_events"
      ? "Tous mes événements"
      : (() => {
          const e = events.find((ev) => ev.id === state.eventId);
          if (!e) return "Événement";
          if (state.scopeKind === "event") return e.name;
          const t = e.tiers.find((tier) => tier.id === state.tierId);
          return t ? `${e.name} · ${t.name}` : e.name;
        })();

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-md)] bg-canvas-2 border-l-2 border-violet p-4">
        <div className="text-eyebrow text-violet-deep mb-2">
          Récapitulatif
        </div>
        <dl className="space-y-2.5 text-[13.5px]">
          <Row label="Code" value={<code className="font-mono text-ink num">{state.code || "—"}</code>} />
          <Row label="Type" value={state.kind === "comp" ? "Comp · gratuit" : state.kind === "percentage" ? "Pourcentage" : "Montant fixe"} />
          <Row label="Réduction" value={<span className="font-semibold text-ink num">{valueLabel}</span>} />
          <Row label="Périmètre" value={scopeLabel} />
          <Row
            label="Quota"
            value={
              <span className="num text-ink">
                {state.maxRedemptions} redemptions max
                {state.maxPerUser > 0 ? ` · ${state.maxPerUser}/utilisateur` : " · illimité par user"}
              </span>
            }
          />
          <Row
            label="Validité"
            value={
              <span className="num text-ink">
                J{state.startsAtDays === 0 ? "" : `+${state.startsAtDays}`} → J+
                {state.endsAtDays}
              </span>
            }
          />
          <Row
            label="Cumul"
            value={
              <Pill tone={state.combinable ? "success" : "neutral"}>
                {state.combinable ? "Cumulable" : "Non cumulable"}
              </Pill>
            }
          />
        </dl>
      </div>

      <p className="text-meta text-ink-soft leading-relaxed">
        Une fois créé, le code est immédiatement actif et apparaît dans la
        liste. Vous pouvez le partager via lien, email ou QR code depuis sa
        page de détail.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-baseline">
      <dt className="text-meta text-ink-mute">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
