"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { computeCustomerPrice, formatMAD } from "@/lib/utils/format";
import type { DraftEvent } from "@/lib/types/domain";
import { PhonePreview } from "./PhonePreview";

const VENUE_NAMES: Record<string, string> = {
  v_mansour: "Rooftop Mansour",
  v_theatre_m6: "Théâtre Mohammed VI",
  v_scene_casa: "La Scène Casa",
  v_jardin: "Le Jardin Sonore",
};

export function StepReview({
  draft,
  onJumpTo,
}: {
  draft: DraftEvent;
  onJumpTo: (step: number) => void;
}) {
  return (
    <div>
      <header className="mb-7">
        <div className="text-eyebrow text-ink-mute mb-2">Étape 5 sur 5</div>
        <h2 className="text-h1 text-ink">Vérification finale.</h2>
        <p className="text-body text-ink-soft mt-2 max-w-xl leading-relaxed">
          Relisez tout, corrigez ce qu'il faut, puis soumettez. La modération
          LYFE répond sous 24 h.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-10 items-start">
        {/* Left, accordion summary */}
        <Accordion.Root
          type="multiple"
          defaultValue={["info", "tiers", "refund", "media"]}
          className="space-y-3"
        >
          <SummarySection
            id="info"
            title="Informations"
            onEdit={() => onJumpTo(1)}
          >
            <KV label="Nom" value={draft.name || "·"} />
            <KV label="Catégorie" value={draft.category} />
            <KV
              label="Lieu"
              value={VENUE_NAMES[draft.venueId] ?? "·"}
            />
            <KV
              label="Date"
              value={
                draft.startDate
                  ? `${draft.startDate} · ${draft.startTime || "·"} → ${
                      draft.endTime || "·"
                    }`
                  : "·"
              }
            />
            <KV label="Politique d'âge" value={draft.agePolicy} />
            {draft.dressCode ? (
              <KV label="Tenue" value={draft.dressCode} />
            ) : null}
          </SummarySection>

          <SummarySection
            id="tiers"
            title={`Tarifs · ${draft.tiers.length}`}
            onEdit={() => onJumpTo(2)}
          >
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-[13px] num">
                <thead className="text-eyebrow text-ink-mute text-left border-b border-line-soft">
                  <tr>
                    <th className="px-5 py-2 font-semibold">Tarif</th>
                    <th className="px-5 py-2 font-semibold text-right">
                      Vous recevez
                    </th>
                    <th className="px-5 py-2 font-semibold text-right">
                      Client paie
                    </th>
                    <th className="px-5 py-2 font-semibold text-right">
                      Quantité
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draft.tiers.map((t) => {
                    const customer = computeCustomerPrice(t.faceValueMad);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-line-soft last:border-0"
                      >
                        <td className="px-5 py-2.5 text-ink font-semibold">
                          {t.name || "·"}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {formatMAD(t.faceValueMad)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {formatMAD(customer.customerPaysMad)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {t.quantity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SummarySection>

          <SummarySection
            id="refund"
            title="Remboursements"
            onEdit={() => onJumpTo(3)}
          >
            <KV
              label="Politique"
              value={
                draft.refundPolicy === "auto"
                  ? "Approbation automatique"
                  : "Approbation manuelle"
              }
            />
          </SummarySection>

          <SummarySection
            id="media"
            title="Médias"
            onEdit={() => onJumpTo(4)}
          >
            <KV label="Photo de couverture" value={draft.coverName ?? "Manquante"} />
            <KV
              label="Galerie"
              value={`${draft.galleryNames.length} / 6 photos`}
            />
            <KV label="Artistes" value={`${draft.artists.length} ajoutés`} />
            <KV label="Partenaires" value={`${draft.partnerLogos.length} logos`} />
          </SummarySection>
        </Accordion.Root>

        {/* Right, phone preview, sticky on desktop */}
        <div className="hidden lg:block">
          <PhonePreview draft={draft} />
        </div>
      </div>

      {/* Mobile-only preview, below the recap */}
      <div className="lg:hidden mt-8">
        <PhonePreview draft={draft} />
      </div>
    </div>
  );
}

function SummarySection({
  id,
  title,
  onEdit,
  children,
}: {
  id: string;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item
      value={id}
      className="bg-surface border border-line rounded-[var(--radius-md)] overflow-hidden"
    >
      <div className="flex items-center justify-between pr-2">
        <Accordion.Trigger className="flex-1 flex items-center justify-between px-5 py-4 text-left group">
          <h3 className="text-h3 text-ink">{title}</h3>
          <ChevronDown
            size={16}
            strokeWidth={1.8}
            className="text-ink-mute group-data-[state=open]:rotate-180 transition-transform"
          />
        </Accordion.Trigger>
        <button
          onClick={onEdit}
          className="text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors px-3 py-1 inline-flex items-center gap-1"
        >
          <Pencil size={11} strokeWidth={2} />
          Modifier
        </button>
      </div>
      <Accordion.Content className="overflow-hidden data-[state=open]:animate-[accordion-open_220ms_ease-out] data-[state=closed]:animate-[accordion-close_180ms_ease-out]">
        <div className="px-5 pb-5 flex flex-col gap-2">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-[13px] py-1">
      <div className="text-ink-mute">{label}</div>
      <div className="text-ink num">{value}</div>
    </div>
  );
}
