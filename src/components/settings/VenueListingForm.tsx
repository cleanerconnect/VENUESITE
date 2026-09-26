"use client";

import { Card } from "@/components/ui/Card";
import { ChipInput } from "@/components/forms/ChipSelect";
import {
  AmbienceChips,
  FeatureSwitches,
  PriceBand,
} from "@/components/forms/ListingControls";
import { SaveBar } from "@/components/forms/SaveBar";
import { useOptimisticForm } from "@/lib/forms/useOptimisticForm";
import { useWorkspaceAccess } from "@/lib/auth/workspace-access";
import { saveVenueListing, type VenueListingInput } from "@/app/actions/venue";

// The listing, as the consumer app renders it.
//
// Three of the four labelled lines the app's detail screen draws under
// « Cuisine & Détails » are here — the price band, the ambience, and the
// equipment list it shows as icon rows underneath. The other two, the
// cuisine and the category, are text and live on Identité with the rest
// of the words.
//
// « Mots-clés » is Lot 2's: a tag is a concept a basique deployment has
// no screen for, and asking for eight of them on a fiche that cannot
// show one is asking a partner to do filing.

export function VenueListingForm({ initial }: { initial: VenueListingInput }) {
  const form = useOptimisticForm({ initial, submit: saveVenueListing });
  const { lot } = useWorkspaceAccess();

  return (
    <div className="space-y-6">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Fourchette de prix</h2>
        <p className="text-meta text-ink-mute mb-5">
          Ce qu&apos;un client dépense chez vous, par personne. L&apos;application
          affiche la fourchette telle quelle et s&apos;en sert pour filtrer.
        </p>
        <PriceBand
          value={form.value.priceRange}
          onChange={(band) => form.set("priceRange", band)}
          error={form.errorFor("priceRange") ?? undefined}
        />
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Ambiance</h2>
        <p className="text-meta text-ink-mute mb-5">
          Comment la salle se ressent. L&apos;application en affiche trois, sur
          une ligne.
        </p>
        <AmbienceChips
          value={form.value.ambience}
          onChange={(ambience) => form.set("ambience", ambience)}
          error={form.errorFor("ambience") ?? undefined}
        />
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Équipements</h2>
        <p className="text-meta text-ink-mute mb-5">
          Listés dans l&apos;application, un par ligne, avec une icône. Ce sont
          les questions qu&apos;on vous pose au téléphone.
        </p>
        <FeatureSwitches
          value={form.value.features}
          onChange={(features) =>
            form.set("features", features as VenueListingInput["features"])
          }
          error={form.errorFor("features") ?? undefined}
        />
      </Card>

      {lot === 2 ? (
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
      ) : null}

      <SaveBar
        state={form.state}
        dirty={form.dirty}
        dirtyCount={form.dirtyCount}
        message={form.message}
        onSave={form.save}
        onReset={form.reset}
      />
    </div>
  );
}
