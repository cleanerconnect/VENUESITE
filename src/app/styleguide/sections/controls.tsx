"use client";

import { useState } from "react";
import { Bell, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { Switch } from "@/components/ui/Switch";
import { ChipInput, ChipSelect } from "@/components/forms/ChipSelect";
import { Field } from "@/components/forms/Field";
import {
  AmbienceChips,
  CuisineFields,
  FeatureSwitches,
  PriceBand,
} from "@/components/forms/ListingControls";
import { SaveBar } from "@/components/forms/SaveBar";
import { PinMap } from "@/components/map/PinMap";
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
  const [opensAt, setOpensAt] = useState("19:00");
  const [oddHour, setOddHour] = useState("19:05");
  const [cuisine, setCuisine] = useState("marocaine");
  const [specialties, setSpecialties] = useState("Tanjia, pastilla au pigeon");
  const [band, setBand] = useState(3);
  const [ambience, setAmbience] = useState<string[]>(["elegant", "moderne"]);
  const [features, setFeatures] = useState<string[]>(["terrasse", "wifi"]);
  const [pin, setPin] = useState<[number | null, number | null]>([
    31.6258, -7.9891,
  ]);

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

      <Specimen name="Input" note="label au-dessus, préfixe, suffixe, erreur">
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
          {/* The case the floating label could not draw: a placeholder
              and a label at once. It used to hide one of the two. */}
          <Input label="Avec exemple" placeholder="+212 6…" />
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

      <Specimen
        name="TimeSelect"
        note="les quarts d'heure, en français — jamais une saisie d'heure native, qui se dessine dans la langue du navigateur"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeSelect
            ariaLabel="Ouverture du service"
            value={opensAt}
            onChange={setOpensAt}
          />
          <TimeSelect
            ariaLabel="Une heure hors de la grille"
            value={oddHour}
            onChange={setOddHour}
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
                dirtyCount={state !== "idle" ? 3 : 0}
                message={state === "error" ? "Session expirée. Reconnectez-vous." : null}
                onSave={() => {}}
                onReset={() => {}}
              />
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="ListingControls"
        note="les quatre questions de la fiche — même dessin sur Ma fiche · Détails et à l'étape 2 de l'inscription"
      >
        <div className="space-y-6">
          <CuisineFields
            cuisine={cuisine}
            specialties={specialties}
            onCuisine={setCuisine}
            onSpecialties={setSpecialties}
          />
          <PriceBand value={band} onChange={setBand} />
          <AmbienceChips value={ambience} onChange={setAmbience} />
          <FeatureSwitches value={features} onChange={setFeatures} />
        </div>
      </Specimen>

      <Specimen
        name="PinMap"
        note="Leaflet et des tuiles OpenStreetMap — la punaise se déplace, et le bloc s'empile sous 640px"
      >
        <PinMap
          latitude={pin[0]}
          longitude={pin[1]}
          address="Rue Riad Zitoun Jdid"
          city="Marrakech"
          onChange={(latitude, longitude) => setPin([latitude, longitude])}
        />
      </Specimen>
    </>
  );
}
