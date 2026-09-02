"use client";

import { Card } from "@/components/ui/Card";
import { ChipInput, ChipSelect } from "@/components/forms/ChipSelect";
import { SaveBar } from "@/components/forms/SaveBar";
import { useOptimisticForm } from "@/lib/forms/useOptimisticForm";
import { saveVenueListing, type VenueListingInput } from "@/app/actions/venue";
import {
  PRICE_RANGE_LABEL,
  VENUE_FEATURE,
  type VenueFeature,
} from "@/lib/types/restaurant";
import { cn } from "@/lib/utils/cn";

// The listing, as the consumer app renders it: price band, search
// keywords, facilities, ambience. Everything on this screen is
// app-facing — nothing here is an internal note.
const FEATURE_OPTIONS = (
  Object.keys(VENUE_FEATURE) as VenueFeature[]
).map((id) => ({ id, label: VENUE_FEATURE[id] }));

const PRICE_BANDS = [1, 2, 3, 4];

export function VenueListingForm({ initial }: { initial: VenueListingInput }) {
  const form = useOptimisticForm({ initial, submit: saveVenueListing });

  return (
    <div className="space-y-5">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Gamme de prix</h2>
        <p className="text-meta text-ink-mute mb-5">
          Affichée dans l&apos;application et utilisée par les filtres de
          recherche.
        </p>
        <div
          role="radiogroup"
          aria-label="Gamme de prix"
          className="grid grid-cols-2 md:grid-cols-4 gap-2"
        >
          {PRICE_BANDS.map((band) => {
            const on = form.value.priceRange === band;
            return (
              <button
                key={band}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => form.set("priceRange", band)}
                className={cn(
                  "h-14 rounded-[var(--radius-sm)] border text-[13.5px] font-medium transition-colors px-3",
                  on
                    ? "border-ink bg-violet-soft text-ink"
                    : "border-line bg-surface text-ink-soft hover:border-ink/40",
                )}
              >
                {PRICE_RANGE_LABEL[band]}
              </button>
            );
          })}
        </div>
        {form.errorFor("priceRange") ? (
          <p className="text-meta text-danger mt-2">
            {form.errorFor("priceRange")}
          </p>
        ) : null}
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-5">Mots-clés</h2>
        <ChipInput
          label="Mots-clés"
          max={8}
          value={form.value.tags}
          onChange={(tags) => form.set("tags", tags)}
          placeholder="Ajouter un mot-clé…"
          hint="Ce sur quoi un client vous trouve. Entrée ou virgule pour valider."
          error={form.errorFor("tags") ?? undefined}
        />
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-5">Équipements</h2>
        <ChipSelect
          label="Équipements"
          options={FEATURE_OPTIONS}
          value={form.value.features}
          onChange={(features) => form.set("features", features)}
          hint="Listés dans l'application sous forme d'icônes."
          error={form.errorFor("features") ?? undefined}
        />
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-5">Ambiance</h2>
        <ChipInput
          label="Ambiance"
          max={5}
          value={form.value.ambience}
          onChange={(ambience) => form.set("ambience", ambience)}
          placeholder="Romantique, familial, rooftop…"
          hint="Comment la salle se ressent. Trois suffisent."
          error={form.errorFor("ambience") ?? undefined}
        />
      </Card>

      <SaveBar
        state={form.state}
        dirty={form.dirty}
        message={form.message}
        onSave={form.save}
        onReset={form.reset}
      />
    </div>
  );
}
