"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/forms/Field";
import { SaveBar } from "@/components/forms/SaveBar";
import { useOptimisticForm } from "@/lib/forms/useOptimisticForm";
import { saveVenueIdentity, type VenueIdentityInput } from "@/app/actions/venue";
import { cn } from "@/lib/utils/cn";

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
            hint: "Affiché dans les listes et la navigation.",
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {text("category", "Catégorie", { hint: "Ex. Marocaine contemporaine" })}
          <Field label="Type d'établissement" error={form.errorFor("kind")}>
            {() => (
              <div className="flex gap-2" role="radiogroup" aria-label="Type d'établissement">
                {(["restaurant", "drinks"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={form.value.kind === kind}
                    onClick={() => form.set("kind", kind)}
                    className={cn(
                      "flex-1 h-11 rounded-[var(--radius-sm)] border text-[13.5px] font-medium transition-colors",
                      form.value.kind === kind
                        ? "border-ink bg-violet-soft text-ink"
                        : "border-line bg-surface text-ink-soft hover:border-ink/40",
                    )}
                  >
                    {kind === "restaurant" ? "Restaurant" : "Bar"}
                  </button>
                ))}
              </div>
            )}
          </Field>
        </div>
      </Card>

      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-5">Adresse et contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {text("address", "Adresse")}
          {text("city", "Ville")}
          {text("latitude", "Latitude", { hint: "Facultatif — pour la carte." })}
          {text("longitude", "Longitude")}
          {text("contactPhone", "Téléphone")}
          {text("contactEmail", "E-mail")}
        </div>
        <div className="mt-4">
          {text("website", "Site web", { hint: "https://…" })}
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
