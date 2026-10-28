"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { Reorder } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DraftEvent, DraftTier } from "@/lib/types/domain";
import { computeCustomerPrice, formatMAD } from "@/lib/utils/format";
import {
  ON_SITE_MESSAGE_MAX,
  appAmount,
  defaultOnSiteMessage,
  onSiteAmount,
} from "@/lib/event/partial-payment";

export function emptyTier(): DraftTier {
  return {
    id: `t_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    faceValueMad: 0,
    quantity: 100,
    saleStart: "",
    saleEnd: "",
    maxPerOrder: 6,
    transferable: true,
    // Off. A tier whose whole price is paid in the application is what
    // every event in this repository sells, and a default that split
    // the price would quietly change what a new tier means.
    partialPayment: false,
    appAmountMad: 0,
    onSiteMessage: "",
  };
}

export function StepTiers({
  draft,
  setDraft,
}: {
  draft: DraftEvent;
  setDraft: (next: DraftEvent) => void;
}) {
  const tiers = draft.tiers;
  const setTiers = (next: DraftTier[]) => setDraft({ ...draft, tiers: next });

  const updateTier = (id: string, patch: Partial<DraftTier>) =>
    setTiers(tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const removeTier = (id: string) => setTiers(tiers.filter((t) => t.id !== id));

  // ── Keeping the sentence true ──
  //
  // « Message affiché au client » is prefilled from the two amounts, so
  // it has to follow them: a sentence saying « il reste 300 MAD » over a
  // tier whose remainder is now 150 is worse than no sentence at all.
  // It follows them only while it is still the generated one — the
  // moment the organiser writes their own, the amounts stop touching
  // it, which is why the comparison is against what *this* tier's
  // amounts would have produced and not against a flag.
  const withMessage = (tier: DraftTier, patch: Partial<DraftTier>) => {
    const next = { ...tier, ...patch };
    const wasDefault =
      tier.onSiteMessage === "" ||
      tier.onSiteMessage === defaultOnSiteMessage(tier);
    return wasDefault
      ? { ...patch, onSiteMessage: defaultOnSiteMessage(next) }
      : patch;
  };

  const priceChange = (tier: DraftTier, faceValueMad: number) =>
    updateTier(tier.id, withMessage(tier, { faceValueMad }));

  const appChange = (tier: DraftTier, appAmountMad: number) =>
    updateTier(tier.id, withMessage(tier, { appAmountMad }));

  // Switching it on with no amount yet proposes half the ticket,
  // rounded to ten dirhams: an organiser who wants a different split
  // changes one number, and one who opens the switch to see what it
  // does is not left with a « 0 MAD sur l'appli » tier.
  const togglePartial = (tier: DraftTier, on: boolean) => {
    if (!on) {
      updateTier(tier.id, { partialPayment: false });
      return;
    }
    const proposed =
      tier.appAmountMad > 0
        ? tier.appAmountMad
        : Math.round(tier.faceValueMad / 2 / 10) * 10;
    updateTier(
      tier.id,
      withMessage({ ...tier, partialPayment: true }, {
        partialPayment: true,
        appAmountMad: proposed,
      }),
    );
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="text-eyebrow text-ink-mute mb-2">Étape 2 sur 5</div>
        <h2 className="text-h1 text-ink">Définissez vos tarifs.</h2>
        <p className="text-body text-ink-soft mt-2 max-w-xl leading-relaxed">
          Vous recevez la valeur faciale intégrale. Les frais de service sont
          payés par le client, jamais par vous. Glissez pour réordonner.
        </p>
      </header>

      <Reorder.Group
        axis="y"
        values={tiers}
        onReorder={setTiers}
        className="flex flex-col gap-3"
      >
        {tiers.map((tier, idx) => (
          <Reorder.Item
            key={tier.id}
            value={tier}
            className="bg-surface border border-line rounded-[var(--radius-md)] overflow-hidden"
          >
            <div className="flex items-stretch">
              {/* Drag handle */}
              <div className="flex items-center justify-center w-10 bg-canvas-2/50 cursor-grab active:cursor-grabbing text-ink-mute hover:text-ink transition-colors">
                <GripVertical size={16} strokeWidth={1.6} />
              </div>

              <div className="flex-1 p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-eyebrow text-ink-mute">
                    Tarif {idx + 1}
                  </div>
                  {tiers.length > 1 ? (
                    <button
                      onClick={() => removeTier(tier.id)}
                      className="h-8 w-8 -mr-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute hover:text-danger transition-colors"
                      aria-label="Supprimer ce tarif"
                    >
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  ) : null}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Nom du tarif"
                    value={tier.name}
                    onChange={(e) =>
                      updateTier(tier.id, { name: e.target.value })
                    }
                  />
                  {/* The total, under two names.
                      One number, and the label says what it is for: the
                      whole price when the application collects all of
                      it, « Montant total du billet » when it does not —
                      ligne 45's own words, and the first of the three
                      amounts it asks for. A second field for the total
                      would have been two inputs on one value, which is
                      a disagreement waiting to happen. */}
                  <Input
                    label={
                      tier.partialPayment
                        ? "Montant total du billet"
                        : "Prix (vous recevez)"
                    }
                    type="number"
                    min={0}
                    value={tier.faceValueMad || ""}
                    onChange={(e) =>
                      priceChange(tier, Number(e.target.value))
                    }
                    suffix="MAD"
                  />
                </div>

                {/* === « Paiement partiel » — ligne 45 === */}
                <div className="mt-5">
                  <Switch
                    checked={tier.partialPayment}
                    onCheckedChange={(v) => togglePartial(tier, v)}
                    label="Paiement partiel"
                    description="Le client règle une partie du billet dans l'application et le reste sur place, à l'entrée."
                  />
                </div>

                {tier.partialPayment ? (
                  <div
                    data-partial-payment
                    className="mt-4 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] p-4"
                  >
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Montant payé sur l'application"
                        type="number"
                        min={0}
                        max={tier.faceValueMad || undefined}
                        value={tier.appAmountMad || ""}
                        onChange={(e) =>
                          appChange(tier, Number(e.target.value))
                        }
                        suffix="MAD"
                        invalid={tier.appAmountMad > tier.faceValueMad}
                        error={
                          tier.appAmountMad > tier.faceValueMad
                            ? "Ce montant dépasse le total du billet."
                            : undefined
                        }
                      />
                      {/* Computed, and read-only for that reason. The
                          third amount is the subtraction of the first
                          two; a field that let it be typed would be a
                          way to make the three disagree. */}
                      <Input
                        label="Reste à payer sur place"
                        value={formatMAD(onSiteAmount(tier), false)}
                        readOnly
                        suffix="MAD"
                        hint="Calculé : total moins le montant payé sur l'application."
                      />
                    </div>

                    {/* The sentence the client reads — ligne 54. It is
                        prefilled from the two amounts and refilled
                        while they move, and the moment the organiser
                        types their own it stops being touched. */}
                    <div className="mt-4">
                      <Input
                        label="Message affiché au client"
                        value={tier.onSiteMessage}
                        maxLength={ON_SITE_MESSAGE_MAX}
                        onChange={(e) =>
                          updateTier(tier.id, {
                            onSiteMessage: e.target.value,
                          })
                        }
                        hint={`${tier.onSiteMessage.length} / ${ON_SITE_MESSAGE_MAX} caractères · affiché à l'écran de réservation.`}
                      />
                    </div>
                  </div>
                ) : null}

                {/* The fee is on what the card is charged, which with
                    a split is the application's part and not the ticket.
                    Computing it on the total would have shown a client
                    paying service fees on money they hand over at the
                    door in cash. */}
                {appAmount(tier) > 0 ? (
                  <div className="mt-4 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] p-4 num">
                    <div className="text-eyebrow text-ink-mute mb-2">
                      Aperçu côté client
                    </div>
                    <div className="text-[15px] text-ink leading-snug">
                      Le client verra{" "}
                      <span className="font-bold">
                        {formatMAD(
                          computeCustomerPrice(appAmount(tier)).customerPaysMad,
                        )}
                      </span>
                      {", "}
                      <span className="text-ink-soft">
                        dont{" "}
                        {formatMAD(
                          computeCustomerPrice(appAmount(tier)).serviceFeeMad,
                        )}{" "}
                        de frais de service (Maroc).
                      </span>
                    </div>
                    {tier.partialPayment ? (
                      <div className="text-[15px] text-ink leading-snug mt-1.5">
                        Puis{" "}
                        <span className="font-bold">
                          {formatMAD(onSiteAmount(tier))}
                        </span>{" "}
                        <span className="text-ink-soft">
                          sur place, sans frais de service.
                        </span>
                      </div>
                    ) : null}
                    <div className="text-meta text-ink-mute mt-1.5">
                      Carte internationale ·{" "}
                      <span className="font-semibold text-ink-soft">
                        {formatMAD(
                          computeCustomerPrice(
                            appAmount(tier),
                            "international",
                          ).customerPaysMad,
                        )}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Quantité disponible"
                    type="number"
                    min={1}
                    value={tier.quantity}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Max par commande"
                    type="number"
                    min={1}
                    value={tier.maxPerOrder}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        maxPerOrder: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Début de vente"
                    type="datetime-local"
                    value={tier.saleStart}
                    onChange={(e) =>
                      updateTier(tier.id, { saleStart: e.target.value })
                    }
                  />
                  <Input
                    label="Fin de vente"
                    type="datetime-local"
                    value={tier.saleEnd}
                    onChange={(e) =>
                      updateTier(tier.id, { saleEnd: e.target.value })
                    }
                  />
                </div>

                <div className="mt-5 pt-5 border-t border-line-soft">
                  <Switch
                    checked={tier.transferable}
                    onCheckedChange={(v) =>
                      updateTier(tier.id, { transferable: v })
                    }
                    label="Transfert autorisé"
                    description="Le client peut transférer son billet à un proche. Le QR est régénéré et les points suivent le nouveau détenteur."
                  />
                </div>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <Card
        variant="canvas-2"
        size="md"
        className="!p-0 border-2 border-dashed !border-line"
      >
        <button
          onClick={() => setTiers([...tiers, emptyTier()])}
          className="w-full py-5 inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          <Plus size={16} strokeWidth={2} />
          Ajouter un tarif
        </button>
      </Card>
    </div>
  );
}
