"use client";

import { computeFee, formatMad } from "@/lib/format";
import { venues } from "@/lib/mockData";
import type { DraftTier } from "./StepTiers";
import type { InfoState } from "./StepInfo";
import type { MediaState } from "./StepMedia";

export function StepReview({
  info,
  tiers,
  refundPolicy,
  media,
  onJumpTo,
}: {
  info: InfoState;
  tiers: DraftTier[];
  refundPolicy: "auto" | "manual";
  media: MediaState;
  onJumpTo: (step: number) => void;
}) {
  const venue = venues.find((v) => v.id === info.venueId);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow text-muted-2 mb-2">Étape 5</div>
        <h2 className="h-hero text-[28px] text-ink">Vérification finale</h2>
        <p className="text-[14px] text-muted mt-2 max-w-xl leading-relaxed">
          Relisez attentivement. Une fois soumis, l'événement passe en
          modération sous 24 h.
        </p>
      </div>

      <Section title="Informations" onEdit={() => onJumpTo(1)}>
        <KV label="Nom" value={info.name || "—"} />
        <KV label="Catégorie" value={info.category} />
        <KV
          label="Lieu"
          value={venue ? `${venue.name}, ${venue.city}` : "—"}
        />
        <KV
          label="Date"
          value={
            info.startDate
              ? `${info.startDate} de ${info.startTime} à ${info.endTime}`
              : "—"
          }
        />
        <KV label="Politique d'âge" value={info.agePolicy} />
        {info.dressCode ? <KV label="Tenue" value={info.dressCode} /> : null}
      </Section>

      <Section title="Tarifs" onEdit={() => onJumpTo(2)}>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm num">
            <thead className="text-xs uppercase tracking-badge text-muted text-left border-b border-line">
              <tr>
                <th className="px-5 py-2">Tarif</th>
                <th className="px-5 py-2 text-right">Vous recevez</th>
                <th className="px-5 py-2 text-right">Client paie (MA)</th>
                <th className="px-5 py-2 text-right">Quantité</th>
                <th className="px-5 py-2 text-right">Transfert</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => {
                const fee = computeFee(t.faceValueMad);
                return (
                  <tr key={t.id} className="border-b border-line/50">
                    <td className="px-5 py-2.5 text-ink">{t.name || "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatMad(t.faceValueMad)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {formatMad(fee.customerPaysMad)}
                    </td>
                    <td className="px-5 py-2.5 text-right">{t.quantity}</td>
                    <td className="px-5 py-2.5 text-right">
                      {t.transferable ? "Oui" : "Non"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Remboursements" onEdit={() => onJumpTo(3)}>
        <KV
          label="Politique"
          value={
            refundPolicy === "auto" ? "Approbation automatique" : "Approbation manuelle"
          }
        />
      </Section>

      <Section title="Médias" onEdit={() => onJumpTo(4)}>
        <KV
          label="Photo de couverture"
          value={media.coverName ?? "Manquante"}
        />
        <KV
          label="Galerie"
          value={`${media.galleryNames.length} / 6 photos`}
        />
        <KV label="Artistes" value={`${media.artists.length} ajoutés`} />
        <KV label="Partenaires" value={`${media.partnerLogos.length} logos`} />
      </Section>
    </div>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-line rounded-lg shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <h3 className="h-display text-[15px] text-ink">{title}</h3>
        <button
          onClick={onEdit}
          className="text-[11px] uppercase tracking-badge font-semibold text-muted hover:text-ink transition-colors"
        >
          Modifier
        </button>
      </div>
      <div className="p-5 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <div className="text-muted">{label}</div>
      <div className="text-ink num">{value}</div>
    </div>
  );
}
