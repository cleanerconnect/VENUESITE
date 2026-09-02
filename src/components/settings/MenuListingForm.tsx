"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Pill } from "@/components/ui/Pill";
import { ChipSelect } from "@/components/forms/ChipSelect";
import { SaveBar } from "@/components/forms/SaveBar";
import { useOptimisticForm } from "@/lib/forms/useOptimisticForm";
import { saveMenuItem, type MenuItemInput } from "@/app/actions/venue";
import { MENU_CATEGORY } from "@/lib/restaurant/vocabulary";
import { DIETARY_TAG, type DietaryTag } from "@/lib/types/restaurant";
import { formatMAD } from "@/lib/utils/format";

// The card, as a diner sees it before booking.
//
// One accordion row per dish, each its own form. Per-item rather than one
// large form because a partner edits one price at a time and a single
// save bar over twenty dishes makes every edit feel risky.
const DIETARY_OPTIONS = (Object.keys(DIETARY_TAG) as DietaryTag[]).map((id) => ({
  id,
  label: DIETARY_TAG[id],
}));

export function MenuListingForm({ items }: { items: MenuItemInput[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Card variant="surface" size="md">
        <p className="text-body text-ink-soft">
          Aucun plat pour l&apos;instant. Envoyez votre carte dans
          «&nbsp;Photos et carte&nbsp;» — nous la reprenons en ligne.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="surface" size="md" className="!p-0">
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-h3 text-ink">Carte</h2>
        <p className="text-meta text-ink-mute mt-1">
          Ce que le client lit avant de réserver. Un plat masqué reste ici
          mais disparaît de l&apos;application.
        </p>
      </div>
      <ul className="divide-y divide-line-soft border-t border-line-soft">
        {items.map((item) => (
          <MenuRow
            key={item.id}
            item={item}
            open={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
          />
        ))}
      </ul>
    </Card>
  );
}

function MenuRow({
  item,
  open,
  onToggle,
}: {
  item: MenuItemInput;
  open: boolean;
  onToggle: () => void;
}) {
  const form = useOptimisticForm({ initial: item, submit: saveMenuItem });

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-canvas-2 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-ink truncate">
              {form.value.name}
            </span>
            {form.value.signature ? (
              <Pill tone="violet">Signature</Pill>
            ) : null}
            {!form.value.visible ? <Pill tone="draft">Masqué</Pill> : null}
          </div>
          <div className="text-meta text-ink-mute mt-0.5">
            {MENU_CATEGORY[form.value.category].label}
          </div>
        </div>
        <span className="num text-[14px] font-semibold text-ink shrink-0">
          {formatMAD(form.value.priceMad)}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={`text-ink-mute shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom du plat"
                  value={form.value.name}
                  error={form.errorFor("name") ?? undefined}
                  onChange={(e) => form.set("name", e.target.value)}
                />
                <Input
                  label="Prix"
                  suffix="MAD"
                  inputMode="decimal"
                  value={String(form.value.priceMad)}
                  error={form.errorFor("priceMad") ?? undefined}
                  onChange={(e) =>
                    form.set("priceMad", Number(e.target.value) || 0)
                  }
                />
              </div>

              <Textarea
                label="Description"
                rows={3}
                value={form.value.description}
                error={form.errorFor("description") ?? undefined}
                onChange={(e) => form.set("description", e.target.value)}
              />

              <ChipSelect
                label="Régimes"
                options={DIETARY_OPTIONS}
                value={form.value.dietary}
                onChange={(dietary) => form.set("dietary", dietary)}
                hint="Affichés dans l'application sous forme de pastilles."
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <Switch
                  label="Visible dans l'application"
                  checked={form.value.visible}
                  onCheckedChange={(next) => form.set("visible", next)}
                />
                <Switch
                  label="Spécialité de la maison"
                  checked={form.value.signature}
                  onCheckedChange={(next) => form.set("signature", next)}
                />
              </div>

              <SaveBar
                state={form.state}
                dirty={form.dirty}
                message={form.message}
                onSave={form.save}
                onReset={form.reset}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
