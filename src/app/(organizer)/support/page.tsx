"use client";

import { Lock, Mail, MessageCircle, Phone, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Boîte de réception participants"
          badge={
            <Pill tone="neutral">
              <Lock size={11} strokeWidth={2} className="-ml-0.5" />
              Bientôt disponible
            </Pill>
          }
        />
        <p className="text-body text-ink-soft mt-1.5">
          Centralisez tous les échanges avec vos participants — au même endroit
          que vos événements et vos versements.
        </p>
      </div>

      {/* Hero illustration card */}
      <Card variant="violet-soft" size="hero" className="text-center !p-10 md:!p-14">
        <span
          aria-hidden
          className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-canvas/60 mb-6"
        >
          <MessageCircle
            size={28}
            strokeWidth={1.5}
            className="text-violet-deep"
          />
        </span>
        <h2
          className="text-ink"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(28px, 4vw, 40px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Une seule inbox pour tous vos canaux participant.
        </h2>
        <p className="text-body text-ink-soft mt-4 max-w-xl mx-auto leading-relaxed">
          Email, SMS, WhatsApp et formulaire de contact convergent dans une
          messagerie unique scoped à chaque événement et à chaque billet.
          Plus besoin de jongler entre cinq outils.
        </p>
      </Card>

      {/* What it will do — three blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureBlock
          icon={<Mail size={16} strokeWidth={1.7} className="text-violet-deep" />}
          title="Conversations centralisées"
          body="Toutes les questions participant remontent dans une inbox unifiée. Réponse en un clic, historique attaché au billet, attribution automatique au membre de l'équipe le plus pertinent."
        />
        <FeatureBlock
          icon={<Sparkles size={16} strokeWidth={1.7} className="text-violet-deep" />}
          title="Réponses automatiques"
          body="Templates auto-déclenchés sur les questions récurrentes — accès, parking, dress code, transferts. Suggestions de réponse alimentées par l'IA pour les cas plus complexes."
        />
        <FeatureBlock
          icon={<Phone size={16} strokeWidth={1.7} className="text-violet-deep" />}
          title="Email + SMS via Twilio"
          body="Connexion native à Twilio pour envoi groupé d'annonces (changement d'horaire, météo, parking saturé). Plafonds anti-spam et opt-out automatique respectent la conformité CNDP."
        />
      </div>

      <Card variant="canvas-2" size="md">
        <div className="flex items-start gap-3">
          <Lock
            size={14}
            strokeWidth={1.9}
            className="text-ink-mute mt-0.5 shrink-0"
          />
          <div>
            <div className="text-[13.5px] font-semibold text-ink">
              Disponible courant 2026
            </div>
            <p className="text-meta text-ink-soft mt-1 leading-relaxed">
              En attendant, vos participants peuvent vous contacter via le
              formulaire LYFE (réponse routée vers votre email organisateur).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FeatureBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card variant="surface" size="md">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 rounded-[10px] bg-violet-soft items-center justify-center mb-3"
      >
        {icon}
      </span>
      <h3 className="text-[15px] font-semibold text-ink leading-tight">
        {title}
      </h3>
      <p className="text-meta text-ink-soft mt-2 leading-relaxed">{body}</p>
    </Card>
  );
}
