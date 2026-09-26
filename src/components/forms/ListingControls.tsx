"use client";

// The three listing controls the app's detail screen is built from, in
// one file because Ma fiche and the onboarding both draw them and a
// price band that looks like a radio group on one screen and a select on
// the other is two designs for one question.
//
// What the app shows, read off `827:237` and `1904:2016`:
//
//   Fourchette de prix : Environ + 500 MAD par personne   → PriceBand
//   Ambiance : Elégant, minimaliste, moderne              → AmbienceChips
//   Equipements : six rows with icons                     → FeatureSwitches
//
// The band is four levels because the app prints four ranges and nothing
// in between; the ambience is a closed list because the app groups on
// the string; the equipment is switches rather than chips because each
// one is a yes-or-no fact about the room, and a chip that is simply
// absent does not read as « no ».

import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils/cn";
import {
  APP_FEATURES,
  PRICE_RANGE_LABEL,
  VENUE_AMBIENCE,
  VENUE_FEATURE,
  type VenueAmbience,
  type VenueFeature,
} from "@/lib/types/restaurant";

export const PRICE_BANDS = [1, 2, 3, 4];

/**
 * What the band means for a table of one.
 *
 * The range itself moved up into `PRICE_RANGE_LABEL`, where the euro
 * glyphs used to be — a partner choosing a band is choosing a number of
 * dirhams, so the number is the label. What is left under it is the
 * unit, which is the one thing the range on its own does not say.
 */
export const PRICE_BAND_HINT = "par personne";

export function PriceBand({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (next: number) => void;
  error?: string;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Fourchette de prix"
        className="grid grid-cols-2 md:grid-cols-4 gap-2"
      >
        {PRICE_BANDS.map((band) => {
          const on = value === band;
          return (
            <button
              key={band}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(band)}
              className={cn(
                "min-h-[72px] rounded-[var(--radius-sm)] border px-3 py-2",
                "flex flex-col items-start justify-center gap-0.5 text-left transition-colors",
                on
                  ? "border-ink bg-violet-soft text-ink"
                  : "border-line bg-surface text-ink-soft hover:border-ink/40",
              )}
            >
              <span className="text-body font-semibold">{PRICE_RANGE_LABEL[band]}</span>
              <span className="text-meta text-ink-mute">{PRICE_BAND_HINT}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-meta text-danger mt-2">{error}</p> : null}
    </div>
  );
}

const AMBIENCE_OPTIONS = (Object.keys(VENUE_AMBIENCE) as VenueAmbience[]).map((id) => ({
  id,
  label: VENUE_AMBIENCE[id],
}));

export const AMBIENCE_MAX = 5;

export function AmbienceChips({
  value,
  onChange,
  error,
}: {
  value: readonly string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    // Refused rather than silently dropped: the app shows three, the
    // form allows five, and a sixth tap that appears to do nothing is
    // read as a broken chip.
    if (value.length >= AMBIENCE_MAX) return;
    onChange([...value, id]);
  };

  return (
    <fieldset>
      <legend className="sr-only">Ambiance</legend>
      <div className="flex flex-wrap gap-2">
        {AMBIENCE_OPTIONS.map((option) => {
          const on = value.includes(option.id);
          const full = !on && value.length >= AMBIENCE_MAX;
          return (
            <button
              key={option.id}
              type="button"
              role="switch"
              aria-checked={on}
              aria-disabled={full || undefined}
              onClick={() => toggle(option.id)}
              className={cn(
                "inline-flex items-center h-11 px-4 rounded-full border",
                "text-body font-medium transition-colors",
                on
                  ? "border-ink bg-violet-soft text-ink"
                  : full
                    ? "border-line bg-surface text-ink-mute"
                    : "border-line bg-surface text-ink-soft hover:border-ink/40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-meta text-ink-mute mt-2">
        {value.length} sur {AMBIENCE_MAX}. L&apos;application en affiche trois.
      </p>
      {error ? <p className="text-meta text-danger mt-1">{error}</p> : null}
    </fieldset>
  );
}

export function FeatureSwitches({
  value,
  onChange,
  error,
}: {
  value: readonly string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (id: VenueFeature, on: boolean) => {
    // The five values that are not offered here — climatisation, vue and
    // the rest — are kept rather than dropped: this control does not
    // draw them, so it has no business deciding they are false.
    const others = value.filter((v) => !APP_FEATURES.includes(v as VenueFeature));
    const chosen = APP_FEATURES.filter((f) => (f === id ? on : value.includes(f)));
    onChange([...chosen, ...others]);
  };

  return (
    <fieldset>
      <legend className="sr-only">Équipements</legend>
      <div className="rounded-[var(--radius-md)] border border-line bg-surface divide-y divide-line-soft">
        {APP_FEATURES.map((id) => (
          <label
            key={id}
            className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer"
          >
            <span className="text-body text-ink">{VENUE_FEATURE[id]}</span>
            <Switch
              checked={value.includes(id)}
              onCheckedChange={(on) => toggle(id, on)}
              ariaLabel={VENUE_FEATURE[id]}
            />
          </label>
        ))}
      </div>
      {error ? <p className="text-meta text-danger mt-2">{error}</p> : null}
    </fieldset>
  );
}
