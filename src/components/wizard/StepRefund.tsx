"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

export function StepRefund({
  value,
  onChange,
}: {
  value: "auto" | "manual";
  onChange: (v: "auto" | "manual") => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="text-eyebrow text-ink-mute mb-2">Étape 3 sur 5</div>
        <h2 className="text-h1 text-ink">
          Politique de remboursement.
        </h2>
        <p className="text-body text-ink-soft mt-2 max-w-xl leading-relaxed">
          Choisissez comment les demandes de remboursement sont traitées. Vous
          pourrez modifier cette politique tant que l'événement n'est pas en
          vente.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <PolicyOption
          active={value === "auto"}
          onSelect={() => onChange("auto")}
          eyebrow="Le plus simple"
          title="Approbation automatique"
          description="Les clients peuvent annuler dans les 48 h suivant l'achat, jusqu'à 7 jours avant l'événement. Aucune action de votre part."
          bullets={[
            "Aucune file d'attente à gérer",
            "Expérience client la plus fluide",
            "Recommandé pour les événements grand public",
          ]}
        />
        <PolicyOption
          active={value === "manual"}
          onSelect={() => onChange("manual")}
          eyebrow="Vous gardez le contrôle"
          title="Approbation manuelle"
          description="Vous validez ou refusez chaque demande. SLA de 48 h. Le client attend votre réponse."
          bullets={[
            "Visibilité sur chaque cas",
            "Adapté aux événements à capacité tendue",
            "Demande une vérification quotidienne",
          ]}
        />
      </div>

      <p
        className="text-meta italic text-ink-soft max-w-2xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Si vous annulez l'événement vous-même, tous les clients reçoivent un
        remboursement intégral (valeur faciale + frais de service). Cette règle
        relève de la politique LYFE et ne peut être modifiée.
      </p>
    </div>
  );
}

function PolicyOption({
  active,
  onSelect,
  eyebrow,
  title,
  description,
  bullets,
}: {
  active: boolean;
  onSelect: () => void;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative text-left p-7 rounded-[var(--radius-lg)] bg-surface transition-all duration-200 min-h-[260px] flex flex-col",
        active
          ? "ring-2 ring-gold border border-gold/0 shadow-lift"
          : "border border-line hover:border-ink",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-eyebrow text-ink-mute">{eyebrow}</span>
        <span
          aria-hidden
          className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
            active ? "bg-gold text-ink" : "border border-line",
          )}
        >
          {active ? <Check size={11} strokeWidth={2.6} /> : null}
        </span>
      </div>
      <h3 className="text-h2 text-ink">{title}</h3>
      <p className="text-[14px] text-ink-soft mt-3 leading-relaxed">
        {description}
      </p>
      <ul className="mt-5 space-y-2 text-[13px] text-ink">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-gold-deep mt-0.5 shrink-0">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </motion.button>
  );
}
