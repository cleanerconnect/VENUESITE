"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PinMap } from "@/components/map/PinMap";
import { SaveBar } from "@/components/forms/SaveBar";
import { useOptimisticForm } from "@/lib/forms/useOptimisticForm";
import { saveVenueIdentity, type VenueIdentityInput } from "@/app/actions/venue";

export function VenueIdentityForm({ initial }: { initial: VenueIdentityInput }) {
  const form = useOptimisticForm({
    initial,
    submit: saveVenueIdentity,
  });

  // The design system's Input owns its own label, hint and error, so the
  // form passes them through rather than wrapping it in a second label.
  const text = (
    key: keyof VenueIdentityInput,
    label: string,
    opts?: { hint?: string },
  ) => (
    <Input
      label={label}
      hint={opts?.hint}
      error={form.errorFor(key) ?? undefined}
      value={String(form.value[key])}
      onChange={(e) => form.set(key, e.target.value as VenueIdentityInput[typeof key])}
    />
  );

  return (
    <div className="space-y-5">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Identité</h2>
        <p className="text-meta text-ink-mute mb-5">
          Ce que les clients voient dans l&apos;application.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text("name", "Nom du lieu")}
          {text("shortName", "Nom court", {
            hint: "Affiché dans les listes de l'application.",
          })}
        </div>

        <div className="mt-4">
          <Textarea
            label="Description"
            error={form.errorFor("description") ?? undefined}
            rows={4}
            value={form.value.description}
            onChange={(e) => form.set("description", e.target.value)}
          />
        </div>

        {/* Restaurant or Bar is not something an owner changes on a
            Tuesday — it decides the vocabulary of the whole portal, and
            it is settled when the venue is created. Two chips asking the
            question again on the fiche only invited a mis-tap that
            renames every screen. The stored value is kept and simply not
            asked for. */}
        <div className="mt-4 md:max-w-[50%]">
          {text("category", "Catégorie", { hint: "Ex. Marocaine contemporaine" })}
        </div>
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-5">Adresse et contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text("address", "Adresse")}
          {text("city", "Ville")}
          {text("contactPhone", "Téléphone")}
          {text("contactEmail", "E-mail")}
        </div>
        <div className="mt-4">
          {text("website", "Site web", { hint: "https://…" })}
        </div>

        {/* A latitude in a text field is a number a restaurant does not
            know about itself. The map is the same two values, asked the
            way a person can answer: find the address, then drag the
            point onto the door. */}
        <div className="mt-6">
          <div className="text-eyebrow text-ink-mute mb-2">Sur la carte</div>
          <PinMap
            latitude={form.value.latitude.trim() === "" ? null : Number(form.value.latitude)}
            longitude={form.value.longitude.trim() === "" ? null : Number(form.value.longitude)}
            address={form.value.address}
            city={form.value.city}
            onChange={(latitude, longitude) => {
              form.set("latitude", latitude == null ? "" : String(latitude));
              form.set("longitude", longitude == null ? "" : String(longitude));
            }}
          />
        </div>
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
