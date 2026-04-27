"use client";

import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import type { AgePolicy, Category, DraftEvent } from "@/lib/types/domain";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "concert", label: "Concert" },
  { value: "club_night", label: "Soirée club" },
  { value: "festival", label: "Festival" },
  { value: "workshop", label: "Atelier" },
  { value: "comedy", label: "Comédie" },
  { value: "sports", label: "Sport" },
  { value: "other", label: "Autre" },
];

export function StepInfo({
  draft,
  setDraft,
  smartDefaultActive,
  dismissSmartDefault,
}: {
  draft: DraftEvent;
  setDraft: (next: DraftEvent) => void;
  smartDefaultActive: boolean;
  dismissSmartDefault: () => void;
}) {
  const set = <K extends keyof DraftEvent>(key: K, value: DraftEvent[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="text-eyebrow text-ink-mute mb-2">Étape 1 sur 5</div>
        <h2 className="text-h1 text-ink">Décrivez votre événement.</h2>
        <p className="text-body text-ink-soft mt-2 max-w-xl leading-relaxed">
          Ce que les gens verront en premier sur la page publique. Vous
          pourrez tout modifier avant la mise en vente.
        </p>
      </header>

      {smartDefaultActive ? (
        <div className="bg-gold-soft rounded-[var(--radius-sm)] px-4 py-3 flex items-start gap-3">
          <Sparkles
            size={14}
            strokeWidth={1.8}
            className="text-gold-deep mt-0.5 shrink-0"
          />
          <div className="flex-1 text-[13px] text-ink leading-relaxed">
            <strong className="font-bold">Pré-rempli selon votre historique.</strong>{" "}
            Date suggérée : prochain vendredi à 23h00.
          </div>
          <button
            onClick={dismissSmartDefault}
            className="text-[18px] leading-none text-ink-mute hover:text-ink transition-colors -mt-0.5"
            aria-label="Ignorer la suggestion"
          >
            ×
          </button>
        </div>
      ) : null}

      <Card variant="surface" size="lg" className="!p-7 md:!p-10">
        <div className="flex flex-col gap-5">
          <Input
            label="Nom de l'événement"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder=""
          />

          <Textarea
            label="Description"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            count={draft.description.length}
            error={
              draft.description.length > 0 && draft.description.length < 500
                ? `Encore ${500 - draft.description.length} caractères`
                : undefined
            }
            hint="500 caractères minimum"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Catégorie"
              value={draft.category}
              onChange={(v) => set("category", v as Category)}
              options={CATEGORIES}
            />
            <Select
              label="Lieu"
              value={draft.venueId}
              onChange={(v) => set("venueId", v)}
              options={[
                { value: "v_mansour", label: "Rooftop Mansour — Casablanca" },
                { value: "v_theatre_m6", label: "Théâtre Mohammed VI" },
                { value: "v_scene_casa", label: "La Scène Casa" },
                { value: "v_jardin", label: "Le Jardin Sonore — Marrakech" },
                { value: "__new", label: "+ Ajouter un nouveau lieu" },
              ]}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Date"
              type="date"
              value={draft.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            <Input
              label="Heure début"
              type="time"
              value={draft.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
            <Input
              label="Heure fin"
              type="time"
              value={draft.endTime}
              onChange={(e) => set("endTime", e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Politique d'âge"
              value={draft.agePolicy}
              onChange={(v) => set("agePolicy", v as AgePolicy)}
              options={[
                { value: "all", label: "Tout public" },
                { value: "18+", label: "18 ans et plus" },
                { value: "21+", label: "21 ans et plus" },
              ]}
            />
            <Input
              label="Code vestimentaire"
              value={draft.dressCode}
              onChange={(e) => set("dressCode", e.target.value)}
              hint="Optionnel"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
