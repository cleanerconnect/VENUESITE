"use client";

import { Input, Select, Textarea } from "@/components/ui/Input";
import { venues } from "@/lib/mockData";
import type { AgePolicy, Category } from "@/lib/types";

export interface InfoState {
  name: string;
  description: string;
  category: Category;
  venueId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  agePolicy: AgePolicy;
  dressCode: string;
}

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
  state,
  setState,
}: {
  state: InfoState;
  setState: (next: InfoState) => void;
}) {
  const set = <K extends keyof InfoState>(key: K, value: InfoState[K]) =>
    setState({ ...state, [key]: value });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="h-display text-2xl text-ink">Informations</h2>
        <p className="text-sm text-muted mt-1">
          Décrivez votre événement. Tous les champs marqués d'une étoile sont
          obligatoires.
        </p>
      </div>

      <Input
        label="Nom de l'événement *"
        value={state.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="ex. Blend Sunset Sessions · vol. 13"
      />

      <Textarea
        label="Description * (500 caractères minimum)"
        value={state.description}
        onChange={(e) => set("description", e.target.value)}
        rows={6}
        hint={`${state.description.length} / 500`}
        error={
          state.description.length > 0 && state.description.length < 500
            ? `Encore ${500 - state.description.length} caractères`
            : undefined
        }
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Catégorie"
          value={state.category}
          onChange={(e) => set("category", e.target.value as Category)}
          options={CATEGORIES}
        />
        <Select
          label="Lieu"
          value={state.venueId}
          onChange={(e) => set("venueId", e.target.value)}
          options={[
            ...venues.map((v) => ({
              value: v.id,
              label: `${v.name} — ${v.city}`,
            })),
            { value: "__new", label: "+ Ajouter un nouveau lieu" },
          ]}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Input
          label="Date *"
          type="date"
          value={state.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
        <Input
          label="Heure début *"
          type="time"
          value={state.startTime}
          onChange={(e) => set("startTime", e.target.value)}
        />
        <Input
          label="Heure fin *"
          type="time"
          value={state.endTime}
          onChange={(e) => set("endTime", e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Politique d'âge"
          value={state.agePolicy}
          onChange={(e) => set("agePolicy", e.target.value as AgePolicy)}
          options={[
            { value: "all", label: "Tout public" },
            { value: "18+", label: "18 ans et plus" },
            { value: "21+", label: "21 ans et plus" },
          ]}
        />
        <Input
          label="Code vestimentaire (optionnel)"
          value={state.dressCode}
          onChange={(e) => set("dressCode", e.target.value)}
          placeholder="ex. Smart casual"
        />
      </div>
    </div>
  );
}
