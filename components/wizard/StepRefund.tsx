"use client";

export function StepRefund({
  value,
  onChange,
}: {
  value: "auto" | "manual";
  onChange: (v: "auto" | "manual") => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="eyebrow text-muted-2 mb-2">Étape 3</div>
        <h2 className="h-hero text-[28px] text-ink">
          Politique de remboursement
        </h2>
        <p className="text-[14px] text-muted mt-2 max-w-xl leading-relaxed">
          Choisissez comment les demandes de remboursement sont traitées. Vous
          pourrez modifier cette politique tant que l'événement n'est pas en
          vente.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <PolicyCard
          active={value === "auto"}
          onSelect={() => onChange("auto")}
          title="Approbation automatique"
          tagline="Le plus simple"
          description="Les clients peuvent annuler dans les 48 h suivant l'achat, jusqu'à 7 jours avant l'événement. Aucune action de votre part."
          bullets={[
            "Aucune file d'attente à gérer",
            "Expérience client la plus fluide",
            "Recommandé pour les événements grand public",
          ]}
        />
        <PolicyCard
          active={value === "manual"}
          onSelect={() => onChange("manual")}
          title="Approbation manuelle"
          tagline="Vous gardez le contrôle"
          description="Vous validez ou refusez chaque demande de remboursement. SLA de 48 h. Le client attend votre réponse."
          bullets={[
            "Visibilité sur chaque cas",
            "Adapté aux événements à capacité tendue",
            "Demande une vérification quotidienne",
          ]}
        />
      </div>

      <p className="text-xs italic text-muted">
        Si vous annulez l'événement vous-même, tous les clients reçoivent un
        remboursement intégral (valeur faciale + frais de service). Cette règle
        relève de la politique LYFE et ne peut être modifiée.
      </p>
    </div>
  );
}

function PolicyCard({
  active,
  onSelect,
  title,
  tagline,
  description,
  bullets,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        "text-left p-6 border rounded-lg bg-surface transition-all duration-200 ease-out-expo",
        active
          ? "border-ink shadow-elevated ring-1 ring-ink/5 -translate-y-0.5"
          : "border-line hover:border-ink/40 hover:-translate-y-0.5 shadow-card",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-badge text-muted">
          {tagline}
        </span>
        <span
          className={[
            "h-4 w-4 border rounded-full",
            active ? "bg-ink border-ink" : "border-line",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>
      <h3 className="h-display text-xl text-ink">{title}</h3>
      <p className="text-sm text-muted mt-2">{description}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-ink">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="text-gold mt-0.5">·</span>
            {b}
          </li>
        ))}
      </ul>
    </button>
  );
}
