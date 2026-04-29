"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { Reorder } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DraftEvent, DraftTier } from "@/lib/types/domain";
import { computeCustomerPrice, formatMAD } from "@/lib/utils/format";

export function emptyTier(): DraftTier {
  return {
    id: `t_${crypto.randomUUID().slice(0, 8)}`,
    name: "",
    faceValueMad: 0,
    quantity: 100,
    saleStart: "",
    saleEnd: "",
    maxPerOrder: 6,
    transferable: true,
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
                  <Input
                    label="Prix (vous recevez)"
                    type="number"
                    min={0}
                    value={tier.faceValueMad || ""}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        faceValueMad: Number(e.target.value),
                      })
                    }
                    suffix="MAD"
                  />
                </div>

                {tier.faceValueMad > 0 ? (
                  <div className="mt-4 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] p-4 num">
                    <div className="text-eyebrow text-ink-mute mb-2">
                      Aperçu côté client
                    </div>
                    <div className="text-[15px] text-ink leading-snug">
                      Le client verra{" "}
                      <span className="font-bold">
                        {formatMAD(
                          computeCustomerPrice(tier.faceValueMad).customerPaysMad,
                        )}
                      </span>
                      {", "}
                      <span className="text-ink-soft">
                        dont{" "}
                        {formatMAD(
                          computeCustomerPrice(tier.faceValueMad).serviceFeeMad,
                        )}{" "}
                        de frais de service (Maroc).
                      </span>
                    </div>
                    <div className="text-meta text-ink-mute mt-1.5">
                      Carte internationale ·{" "}
                      <span className="font-semibold text-ink-soft">
                        {formatMAD(
                          computeCustomerPrice(
                            tier.faceValueMad,
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
