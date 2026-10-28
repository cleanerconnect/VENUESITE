"use client";

// The pieces both onboarding flows draw with.
//
// There used to be one flow, and these lived inside it. The 27 October
// split made two — the account at `/inscription`, the establishment at
// `/restaurant/etablissement/nouveau` — and three of the four pieces
// are the same in both: the progress bar, the drop zone, the weekly
// grid. Copying them would have been three chances for the two flows
// to drift apart on the thing a partner sees most.
//
// `Progress` takes its step table as a prop for the same reason: the
// bars are different lengths now, and a component that reaches for a
// module-level constant can only ever draw one of them.

import { useRef, useState } from "react";
import { Check, FileText, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { cn } from "@/lib/utils/cn";
import { WEEKDAY_LABEL, type OnboardingDay } from "@/lib/types/onboarding";

/**
 * Where `/inscription`'s bar sits.
 *
 * `SAVE_BAR_SHELL` with one value changed: the portal's bars clear the
 * phone tab bar at `bottom-20`, and `/inscription` is outside the
 * dashboard, so it has no tab bar to clear and the bar goes all the way
 * down at every width. Everything else is deliberately identical,
 * including the tall transparent gradient that lets the last field fade
 * under the bar instead of being cut by it.
 *
 * The venue flow uses `SAVE_BAR_SHELL` itself: it lives inside the
 * dashboard, where the tab bar is there to be cleared.
 */
export const ONBOARDING_BAR_SHELL =
  "sticky bottom-0 z-10 -mx-1 px-1 pb-1 pt-6 pointer-events-none " +
  "bg-gradient-to-t from-canvas via-canvas to-transparent";

/** One step of either flow, as both tables spell it. */
export interface FlowStep {
  readonly n: number;
  readonly name: string;
  readonly short: string;
}

/** The bar, and what each segment is called. */
export function Progress({
  step,
  steps,
}: {
  step: number;
  steps: readonly FlowStep[];
}) {
  return (
    // `data-progress` is the segment count, for the verify tools: two
    // for the account, six for the establishment, and a bar that grew
    // a seventh is a step the contract does not have.
    <div className="mt-4 md:mt-6" data-progress={steps.length}>
      <div className="flex items-center gap-2">
        {steps.map((s) => (
          <span
            key={s.n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s.n < step ? "bg-violet-deep" : s.n === step ? "bg-violet" : "bg-line",
            )}
          />
        ))}
      </div>
      {/* Every name on a wide screen; the one in hand on a phone, where
          six labels would be six truncations. */}
      <div className="mt-2 hidden md:flex items-center gap-2">
        {steps.map((s) => (
          <span
            key={s.n}
            className={cn(
              "flex-1 text-meta truncate",
              s.n === step ? "text-ink font-semibold" : "text-ink-mute",
            )}
          >
            {s.short}
          </span>
        ))}
      </div>
      {/* Nothing on a phone.
          It used to name the step in hand here, under the bar — and the
          card's own h1, 40px below, is that same word. Two copies of
          « Vous » cost 27px of a 844px screen the step has to fit in,
          and the one that stays is the heading. */}
    </div>
  );
}

/**
 * One file, chosen or not.
 *
 * The same panel three times on step 4, because the three files differ
 * only in what they accept and what they are called — drawing a bespoke
 * box for each would be three chances for them to drift. `primary` is
 * the cover: the one file worth a full-height button, since a listing
 * with no photo at all is the one that does not get booked.
 */
export function FileDrop({
  title,
  hint,
  accept,
  chosen,
  onFile,
  primary,
  icon = "image",
}: {
  title: string;
  hint: string;
  accept: string;
  chosen: { name: string; objectKey: string } | null;
  onFile: (file: File) => void;
  primary?: boolean;
  icon?: "image" | "document";
}) {
  const Icon = icon === "document" ? FileText : ImagePlus;
  const picker = (label: string, className: string) => (
    <label className="inline-flex mt-4">
      <span className="sr-only">{`${label} — ${title}`}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <span className={className}>{label}</span>
    </label>
  );

  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas-2 p-6 text-center">
      {chosen ? (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-success-soft flex items-center justify-center">
            <Check size={22} className="text-success" strokeWidth={2.2} />
          </div>
          <div className="text-body font-semibold text-ink mt-3">{title}</div>
          <p className="text-meta text-ink-mute mt-1 truncate">{chosen.name}</p>
          {picker(
            "Remplacer",
            "h-11 px-4 inline-flex items-center rounded-[var(--radius-sm)] border border-line bg-surface text-body font-semibold text-ink cursor-pointer hover:border-ink transition-colors",
          )}
        </>
      ) : (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-soft flex items-center justify-center">
            <Icon size={22} className="text-violet-deep" />
          </div>
          <div className="text-body font-semibold text-ink mt-3">{title}</div>
          <p className="text-meta text-ink-mute mt-1">{hint}</p>
          {picker(
            primary ? "Choisir une photo" : "Choisir un fichier",
            primary
              ? "h-14 px-6 inline-flex items-center rounded-[var(--radius-md)] bg-ink text-canvas text-body font-semibold cursor-pointer hover:bg-ink-soft transition-colors"
              : "h-11 px-4 inline-flex items-center rounded-[var(--radius-sm)] border border-line bg-surface text-body font-semibold text-ink cursor-pointer hover:border-ink transition-colors",
          )}
        </>
      )}
    </div>
  );
}

/**
 * The weekly grid.
 *
 * Seven rows, and the first one carries the shortcut — a venue that
 * opens at the same hours all week is the normal case, and making it
 * seven identical edits is how a partner decides to do it later and
 * never does.
 */
export function HoursGrid({
  hours,
  onChange,
}: {
  hours: OnboardingDay[];
  onChange: (next: OnboardingDay[]) => void;
}) {
  const patch = (weekday: number, day: Partial<OnboardingDay>) =>
    onChange(hours.map((h) => (h.weekday === weekday ? { ...h, ...day } : h)));

  const copyToAll = () => {
    const first = hours[0];
    if (!first) return;
    onChange(
      hours.map((h) => ({
        ...h,
        closed: first.closed,
        opensAt: first.opensAt,
        closesAt: first.closesAt,
      })),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-field-label">Semaine type</span>
        <Button variant="secondary" size="md" onClick={copyToAll}>
          Appliquer lundi à tous les jours
        </Button>
      </div>

      {hours.map((day) => (
        <div
          key={day.weekday}
          className="rounded-[var(--radius-md)] border border-line bg-surface p-4 flex flex-wrap items-center gap-3"
        >
          <div className="w-[104px] shrink-0 text-body font-semibold text-ink">
            {WEEKDAY_LABEL[day.weekday]}
          </div>
          <Switch
            checked={!day.closed}
            onCheckedChange={(open) => patch(day.weekday, { closed: !open })}
            ariaLabel={`${WEEKDAY_LABEL[day.weekday]} ouvert`}
          />
          <span className="text-meta text-ink-mute w-[54px]">
            {day.closed ? "Fermé" : "Ouvert"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <TimeSelect
              value={day.opensAt}
              disabled={day.closed}
              ariaLabel={`Ouverture ${WEEKDAY_LABEL[day.weekday]}`}
              onChange={(next) => patch(day.weekday, { opensAt: next })}
            />
            <span className="text-meta text-ink-mute">à</span>
            <TimeSelect
              value={day.closesAt}
              disabled={day.closed}
              ariaLabel={`Fermeture ${WEEKDAY_LABEL[day.weekday]}`}
              onChange={(next) => patch(day.weekday, { closesAt: next })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
