"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SaveBar } from "@/components/forms/SaveBar";
import { useToast } from "@/components/ui/Toast";
import { saveMenuBoard } from "@/app/actions/venue";
import type { SaveState } from "@/lib/forms/useOptimisticForm";
import {
  MENU_ITEM_LINE_MAX,
  MENU_ITEM_NAME_MAX,
  MENU_SECTION_MAX,
  MENU_SECTION_NAME_MAX,
  type VenueMenu,
} from "@/lib/types/restaurant";
import { cn } from "@/lib/utils/cn";

// The card, typed rather than photographed.
//
// This tab used to be an upload: a PDF, or up to ten photographs of the
// pages. Two things were wrong with that. The app's Menu screen wants a
// menu — a list it can lay out, search, and price in the guest's
// currency — and got a file it could only offer to open. And a
// photograph of a laminated card is the thing a venue changes last, so
// the prices a guest read were routinely a season old while the fiche
// looked complete.
//
// What a section is, is the venue's business: a riad serves mezzés, a
// rooftop serves « À grignoter », a tasting menu has numbered courses.
// So the names are a field, not a list to pick from.
//
// What a dish is, is deliberately three things — a name, one line, a
// price in dirhams. No photograph, because a card of thirty photographs
// is a job nobody finishes and a screen nobody scrolls; no options,
// because « supplément frites » is a point-of-sale concern and this is
// a listing a guest reads before booking.
//
// One save bar for the whole board rather than one per dish: a partner
// retyping a season's prices is making one edit, and twenty buttons to
// find is the pattern `OpeningHoursForm` already moved away from.

type Line = { id: string; name: string; description: string; priceMad: number };
type Section = { id: string; name: string; items: Line[] };

const slug = (name: string, taken: Set<string>) => {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "rubrique";
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
};

const fresh = () => `new_${Math.random().toString(36).slice(2, 10)}`;

export function MenuBoardForm({ initial }: { initial: VenueMenu }) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(() =>
    initial.sections.map((s) => ({
      // A dish whose section was deleted comes back under an empty id.
      // Giving it one here is what lets the partner save it somewhere.
      id: s.id || slug("Sans rubrique", new Set()),
      name: s.name,
      items: s.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        priceMad: i.priceMad,
      })),
    })),
  );
  const [committed, setCommitted] = useState(() => JSON.stringify(sections));
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const dirty = JSON.stringify(sections) !== committed;
  const itemCount = sections.reduce((n, s) => n + s.items.length, 0);

  const edit = (next: Section[]) => {
    setState("idle");
    setMessage(null);
    setSections(next);
  };

  const patchSection = (id: string, patch: Partial<Section>) =>
    edit(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSection = () => {
    const taken = new Set(sections.map((s) => s.id));
    edit([...sections, { id: slug("Nouvelle rubrique", taken), name: "", items: [] }]);
  };

  const addItem = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    patchSection(sectionId, {
      items: [...section.items, { id: fresh(), name: "", description: "", priceMad: 0 }],
    });
  };

  const save = async () => {
    // Named before saved. A section with no name is a heading the app
    // would draw as a blank line, and a dish with no name is a price
    // with nothing attached to it.
    const unnamed = sections.find((s) => !s.name.trim());
    if (unnamed) {
      setState("error");
      setMessage("Chaque rubrique a besoin d'un nom.");
      return;
    }
    const nameless = sections.flatMap((s) => s.items).find((i) => !i.name.trim());
    if (nameless) {
      setState("error");
      setMessage("Chaque plat a besoin d'un nom.");
      return;
    }

    setState("saving");
    setMessage(null);
    const result = await saveMenuBoard({
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        items: s.items.map((i) => ({
          id: i.id,
          name: i.name.trim(),
          description: i.description.trim(),
          priceMad: i.priceMad,
        })),
      })),
    });
    if (!result.ok) {
      setState("error");
      setMessage(result.message ?? result.errors[0]?.message ?? "La carte n'a pas été enregistrée.");
      toast({ tone: "danger", title: "Carte non enregistrée" });
      return;
    }
    // Re-rendered from the response, not from what was sent: the ids of
    // the rows that were only new a moment ago are in it.
    const saved = result.data.sections.map((s) => ({
      id: s.id,
      name: s.name,
      items: s.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        priceMad: i.priceMad,
      })),
    }));
    setSections(saved);
    setCommitted(JSON.stringify(saved));
    setState("saved");
  };

  const reset = () => {
    setSections(JSON.parse(committed) as Section[]);
    setState("idle");
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Votre carte</h2>
        <p data-prose className="text-meta text-ink-mute mb-5 max-w-[62ch]">
          Ce que les clients lisent avant de réserver. Vous nommez vos
          rubriques&nbsp;; chaque plat a un nom, une ligne et un prix en
          dirhams. Glissez pour changer l&apos;ordre&nbsp;: c&apos;est celui de
          l&apos;application.
        </p>

        {sections.length === 0 ? (
          <p className="mb-4 rounded-[var(--radius-sm)] border border-dashed border-line px-4 py-3 text-body text-ink-soft">
            Aucune rubrique pour le moment. Commencez par «&nbsp;Entrées&nbsp;»,
            ou par la manière dont votre carte est réellement organisée.
          </p>
        ) : null}

        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={edit}
          className="flex flex-col gap-4"
        >
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onName={(name) => patchSection(section.id, { name })}
              onItems={(items) => patchSection(section.id, { items })}
              onAddItem={() => addItem(section.id)}
              onRemove={() => edit(sections.filter((s) => s.id !== section.id))}
            />
          ))}
        </Reorder.Group>

        <div className="mt-4">
          <Button
            variant="secondary"
            disabled={sections.length >= MENU_SECTION_MAX}
            onClick={addSection}
            iconLeft={<Plus size={16} strokeWidth={2} />}
          >
            Ajouter une rubrique
          </Button>
          {sections.length >= MENU_SECTION_MAX ? (
            <p className="mt-2 text-meta text-ink-mute">
              {MENU_SECTION_MAX} rubriques au maximum.
            </p>
          ) : null}
        </div>
      </Card>

      <SaveBar
        state={state}
        dirty={dirty}
        dirtyCount={dirty ? itemCount : 0}
        message={message}
        onSave={save}
        onReset={reset}
      />
    </div>
  );
}

function SectionCard({
  section,
  onName,
  onItems,
  onAddItem,
  onRemove,
}: {
  section: Section;
  onName: (name: string) => void;
  onItems: (items: Line[]) => void;
  onAddItem: () => void;
  onRemove: () => void;
}) {
  // The whole card is not the drag handle: a partner editing a section's
  // name inside it would otherwise drag the section every time they
  // tried to select a word.
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      className="rounded-[var(--radius-sm)] border border-line bg-surface p-3.5"
    >
      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={`Déplacer la rubrique ${section.name || "sans nom"}`}
          onPointerDown={(e) => controls.start(e)}
          className="mb-1 flex h-11 w-8 shrink-0 cursor-grab items-center justify-center text-ink-mute active:cursor-grabbing"
        >
          <GripVertical size={16} strokeWidth={1.9} aria-hidden />
        </button>
        <Input
          label="Rubrique"
          className="font-semibold"
          value={section.name}
          maxLength={MENU_SECTION_NAME_MAX}
          placeholder="Entrées, Mezzés, À grignoter…"
          onChange={(e) => onName(e.target.value)}
        />
        <Button
          variant="ghost"
          onClick={onRemove}
          aria-label={`Retirer la rubrique ${section.name || "sans nom"}`}
          iconLeft={<Trash2 size={16} strokeWidth={1.9} />}
        >
          Retirer
        </Button>
      </div>

      <Reorder.Group
        axis="y"
        values={section.items}
        onReorder={onItems}
        className="mt-3 flex flex-col gap-2"
      >
        {section.items.map((item) => (
          <LineRow
            key={item.id}
            item={item}
            onPatch={(patch) =>
              onItems(section.items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
            }
            onRemove={() => onItems(section.items.filter((i) => i.id !== item.id))}
          />
        ))}
      </Reorder.Group>

      <div className="mt-3">
        <Button
          variant="ghost"
          onClick={onAddItem}
          iconLeft={<Plus size={16} strokeWidth={2} />}
        >
          Ajouter un plat
        </Button>
      </div>
    </Reorder.Item>
  );
}

function LineRow({
  item,
  onPatch,
  onRemove,
}: {
  item: Line;
  onPatch: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const left = Math.max(0, MENU_ITEM_LINE_MAX - item.description.length);

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "rounded-[var(--radius-sm)] border border-line bg-canvas-2 p-3",
        "flex items-start gap-2",
      )}
    >
      <button
        type="button"
        aria-label={`Déplacer ${item.name || "ce plat"}`}
        onPointerDown={(e) => controls.start(e)}
        className="mt-9 flex h-11 w-8 shrink-0 cursor-grab items-center justify-center text-ink-mute active:cursor-grabbing"
      >
        <GripVertical size={16} strokeWidth={1.9} aria-hidden />
      </button>

      <div className="min-w-0 flex-1 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <Input
          label="Plat"
          value={item.name}
          maxLength={MENU_ITEM_NAME_MAX}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        <Input
          label="Prix"
          suffix="MAD"
          inputMode="decimal"
          value={String(item.priceMad)}
          onChange={(e) => onPatch({ priceMad: Number(e.target.value) || 0 })}
        />
        <div className="sm:col-span-2">
          <Input
            label="Description"
            value={item.description}
            maxLength={MENU_ITEM_LINE_MAX}
            placeholder="Une ligne, pas un paragraphe."
            hint={`${left} caractère${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}.`}
            onChange={(e) => onPatch({ description: e.target.value })}
          />
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={onRemove}
        aria-label={`Retirer ${item.name || "ce plat"}`}
        className="mt-7 shrink-0"
        iconLeft={<Trash2 size={16} strokeWidth={1.9} />}
      >
        Retirer
      </Button>
    </Reorder.Item>
  );
}
