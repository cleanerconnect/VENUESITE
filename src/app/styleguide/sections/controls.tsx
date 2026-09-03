"use client";

import { useState } from "react";
import { Bell, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { ChipInput, ChipSelect } from "@/components/forms/ChipSelect";
import { Field } from "@/components/forms/Field";
import { SaveBar } from "@/components/forms/SaveBar";
import type { SaveState } from "@/lib/forms/useOptimisticForm";
import { Row, Specimen } from "../Shell";

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "destructive",
  "ghost",
  "ink",
] as const;

const SAVE_STATES: SaveState[] = ["idle", "saving", "saved", "error"];

export function ControlsSection() {
  const [chips, setChips] = useState(["rooftop", "brunch"]);
  const [picked, setPicked] = useState<("terrasse" | "wifi" | "parking")[]>([
    "terrasse",
  ]);
  const [on, setOn] = useState(true);

  return (
    <>
      <Specimen name="Button" note="cinq variantes, trois tailles">
        <div className="space-y-4">
          <Row>
            {BUTTON_VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {v}
              </Button>
            ))}
          </Row>
          <Row>
            <Button size="sm">Petit</Button>
            <Button size="md">Moyen</Button>
            <Button size="lg">Grand</Button>
          </Row>
          <Row>
            <Button iconLeft={<Plus size={16} strokeWidth={2} />}>
              Icône à gauche
            </Button>
            <Button variant="secondary" iconRight={<Bell size={16} strokeWidth={2} />}>
              Icône à droite
            </Button>
            <Button disabled>Désactivé</Button>
            <Button variant="destructive" iconLeft={<Trash2 size={16} strokeWidth={2} />}>
              Supprimer
            </Button>
          </Row>
          <Button fullWidth>Pleine largeur</Button>
        </div>
      </Specimen>

      <Specimen name="Input" note="label flottant, préfixe, suffixe, erreur">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Vide" />
          <Input label="Rempli" defaultValue="Dar Zellij" />
          <Input label="Avec aide" hint="Affiché dans les listes." />
          <Input label="En erreur" defaultValue="12" error="Prix invalide." />
          <Input
            label="Avec préfixe"
            prefix={<Search size={15} strokeWidth={1.8} />}
            defaultValue="Salma"
          />
          <Input label="Avec suffixe" suffix="MAD" defaultValue="240" />
          <Input label="Désactivé" defaultValue="Non modifiable" disabled />
        </div>
      </Specimen>

      <Specimen name="Textarea">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea label="Description" rows={3} />
          <Textarea
            label="En erreur"
            rows={3}
            defaultValue="Trop long…"
            error="280 caractères au maximum."
          />
        </div>
      </Specimen>

      <Specimen name="Select" note="natif — fiable sur tous les appareils">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Catégorie"
            options={[
              { value: "entree", label: "Entrée" },
              { value: "plat", label: "Plat" },
              { value: "dessert", label: "Dessert" },
            ]}
            defaultValue="plat"
          />
          <Select
            label="Avec aide"
            hint="Trié par ordre d'affichage dans l'app."
            options={[{ value: "a", label: "Option A" }]}
          />
        </div>
      </Specimen>

      <Specimen name="Switch">
        <div className="space-y-4">
          <Switch label="Visible dans l'application" checked={on} onCheckedChange={setOn} />
          <Switch
            label="Avec description"
            description="Les clients peuvent réserver ce créneau."
            checked
            onCheckedChange={() => {}}
          />
          <Switch label="Désactivé" checked={false} disabled onCheckedChange={() => {}} />
        </div>
      </Specimen>

      <Specimen name="ChipSelect / ChipInput" note="ensemble fixe / texte libre">
        <div className="space-y-6">
          <ChipSelect
            label="Équipements"
            options={[
              { id: "terrasse", label: "Terrasse" },
              { id: "wifi", label: "Wi-Fi" },
              { id: "parking", label: "Parking" },
            ]}
            value={picked}
            onChange={setPicked}
            hint="Listés dans l'application sous forme d'icônes."
          />
          <ChipInput
            label="Mots-clés"
            max={8}
            value={chips}
            onChange={setChips}
            placeholder="Ajouter…"
            hint="Entrée ou virgule pour valider."
          />
          <ChipInput
            label="En erreur"
            value={["un", "deux"]}
            onChange={() => {}}
            error="8 mots-clés au maximum."
          />
        </div>
      </Specimen>

      <Specimen
        name="Field"
        note="l'erreur passe par aria-describedby, pas seulement par la couleur"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Champ libre" hint="Avec une aide">
            {(props) => (
              <input
                {...props}
                className="w-full h-11 px-3.5 border border-line rounded-[var(--radius-sm)] bg-surface text-[14px] outline-none focus:border-ink"
              />
            )}
          </Field>
          <Field label="En erreur" error="Ce champ est obligatoire." required>
            {(props) => (
              <input
                {...props}
                className="w-full h-11 px-3.5 border border-danger/60 rounded-[var(--radius-sm)] bg-surface text-[14px] outline-none"
              />
            )}
          </Field>
        </div>
      </Specimen>

      <Specimen name="SaveBar" note="les quatre états d'un formulaire">
        <div className="space-y-4">
          {SAVE_STATES.map((state) => (
            <div key={state}>
              <code className="text-[11px] text-ink-mute">{state}</code>
              <SaveBar
                state={state}
                dirty={state !== "idle"}
                message={state === "error" ? "Session expirée. Reconnectez-vous." : null}
                onSave={() => {}}
                onReset={() => {}}
              />
            </div>
          ))}
        </div>
      </Specimen>
    </>
  );
}
