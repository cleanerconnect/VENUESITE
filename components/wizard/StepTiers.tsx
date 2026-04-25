"use client";

import { Input, Toggle } from "@/components/ui/Input";
import { computeFee, formatMad } from "@/lib/format";
import { IconClose, IconPlus } from "@/components/layout/icons";

export interface DraftTier {
  id: string;
  name: string;
  faceValueMad: number;
  quantity: number;
  saleStart: string;
  saleEnd: string;
  maxPerOrder: number;
  transferable: boolean;
}

export function emptyTier(): DraftTier {
  return {
    id: `t_${Math.random().toString(36).slice(2, 7)}`,
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
  tiers,
  setTiers,
}: {
  tiers: DraftTier[];
  setTiers: (next: DraftTier[]) => void;
}) {
  const update = (idx: number, patch: Partial<DraftTier>) => {
    const next = [...tiers];
    next[idx] = { ...next[idx], ...patch };
    setTiers(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="h-serif text-2xl text-ink">Tarifs</h2>
        <p className="text-sm text-muted mt-1">
          Définissez vos catégories de billets. Vous recevez la valeur faciale
          intégrale — les frais de service sont visibles et payés par le client.
        </p>
      </div>

      {tiers.map((tier, idx) => {
        const fee = computeFee(tier.faceValueMad, "moroccan");
        return (
          <div
            key={tier.id}
            className="bg-surface border border-line shadow-card p-5 relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-[10px] uppercase tracking-badge text-muted">
                Tarif {idx + 1}
              </div>
              {tiers.length > 1 ? (
                <button
                  onClick={() => setTiers(tiers.filter((_, i) => i !== idx))}
                  className="text-muted hover:text-error"
                  aria-label="Supprimer ce tarif"
                >
                  <IconClose />
                </button>
              ) : null}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Nom du tarif"
                placeholder="ex. Early Bird"
                value={tier.name}
                onChange={(e) => update(idx, { name: e.target.value })}
              />
              <Input
                label="Prix (vous recevez)"
                type="number"
                min={0}
                value={tier.faceValueMad || ""}
                onChange={(e) =>
                  update(idx, { faceValueMad: Number(e.target.value) })
                }
                suffix="MAD"
              />
            </div>

            {tier.faceValueMad > 0 ? (
              <div className="mt-4 bg-bg border border-line p-3 num">
                <div className="text-[10px] uppercase tracking-badge text-muted mb-1">
                  Aperçu côté client
                </div>
                <div className="text-sm text-ink">
                  Le client voit :{" "}
                  <span className="font-semibold">
                    {formatMad(fee.customerPaysMad)}
                  </span>{" "}
                  <span className="text-muted">
                    (dont {formatMad(fee.serviceFeeMad)} de frais sur cartes
                    marocaines)
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Carte internationale : {formatMad(
                    computeFee(tier.faceValueMad, "international").customerPaysMad,
                  )}{" "}
                  (frais 7,0 %)
                </div>
              </div>
            ) : null}

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Quantité disponible"
                type="number"
                min={1}
                value={tier.quantity}
                onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
              />
              <Input
                label="Max par commande"
                type="number"
                min={1}
                value={tier.maxPerOrder}
                onChange={(e) =>
                  update(idx, { maxPerOrder: Number(e.target.value) })
                }
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Début de vente"
                type="datetime-local"
                value={tier.saleStart}
                onChange={(e) => update(idx, { saleStart: e.target.value })}
              />
              <Input
                label="Fin de vente"
                type="datetime-local"
                value={tier.saleEnd}
                onChange={(e) => update(idx, { saleEnd: e.target.value })}
              />
            </div>

            <div className="mt-5">
              <Toggle
                label="Transfert autorisé"
                description="Le client peut transférer son billet à un proche. Le QR est régénéré et les points suivent le nouveau détenteur."
                checked={tier.transferable}
                onChange={(v) => update(idx, { transferable: v })}
              />
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setTiers([...tiers, emptyTier()])}
        className="border border-dashed border-line py-4 text-sm text-muted hover:text-ink hover:border-ink flex items-center justify-center gap-2"
      >
        <IconPlus />
        Ajouter un tarif
      </button>
    </div>
  );
}
