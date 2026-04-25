"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Toggle, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

const SECTIONS = [
  { id: "profile", label: "Profil" },
  { id: "venue", label: "Lieu" },
  { id: "payout", label: "Coordonnées bancaires" },
  { id: "notifications", label: "Notifications" },
  { id: "language", label: "Langue" },
  { id: "api", label: "API" },
  { id: "danger", label: "Zone sensible" },
];

export default function SettingsPage() {
  const [active, setActive] = useState("profile");

  return (
    <>
      <TopBar title="Réglages" />
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto scroll-thin">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={[
                    "text-left text-sm whitespace-nowrap px-3 py-2 transition-colors",
                    active === s.id
                      ? "bg-ink text-white"
                      : "text-muted hover:text-ink hover:bg-bg",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex flex-col gap-6">
            {active === "profile" ? <ProfileSection /> : null}
            {active === "venue" ? <VenueSection /> : null}
            {active === "payout" ? <PayoutSection /> : null}
            {active === "notifications" ? <NotificationsSection /> : null}
            {active === "language" ? <LanguageSection /> : null}
            {active === "api" ? <ApiSection /> : null}
            {active === "danger" ? <DangerSection /> : null}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileSection() {
  return (
    <Card>
      <CardHeader
        title="Profil organisateur"
        subtitle="Ce que vos clients voient sur la page publique"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Nom" defaultValue="Blend Rooftop" />
        <Input label="Email de contact" type="email" defaultValue="hello@blend.ma" />
        <Input label="Téléphone" defaultValue="+212 522 00 00 00" />
        <Input label="Site web" defaultValue="https://blend.ma" />
      </div>
      <div className="mt-4">
        <Textarea label="Bio" rows={3} defaultValue="Rooftop & club, Casablanca" />
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <Input label="Instagram" defaultValue="@blend.casablanca" />
        <Input label="Facebook" defaultValue="blendrooftop" />
      </div>
      <div className="mt-6">
        <Button>Enregistrer</Button>
      </div>
    </Card>
  );
}

function VenueSection() {
  return (
    <Card>
      <CardHeader
        title="Détails du lieu"
        subtitle="Pour la facturation et la conformité (ICE / RC)"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Adresse" defaultValue="Bd de la Corniche" />
        <Input label="Ville" defaultValue="Casablanca" />
        <Input label="Capacité totale" type="number" defaultValue="420" suffix="pers." />
        <Input label="ICE" defaultValue="002384719000045" />
        <Input label="RC" defaultValue="284711" />
      </div>
      <div className="mt-6">
        <Button>Enregistrer</Button>
      </div>
    </Card>
  );
}

function PayoutSection() {
  const [reauthOpen, setReauthOpen] = useState(false);
  const [rib, setRib] = useState("181 810 0123456789012345 67");
  const [error, setError] = useState<string | undefined>();
  // RIB Maroc = 24 chiffres (sans espaces).
  const validate = (v: string) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 0) setError(undefined);
    else if (digits.length !== 24)
      setError(
        `Votre RIB contient ${digits.length} chiffres, 24 sont attendus.`,
      );
    else setError(undefined);
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Coordonnées bancaires"
          subtitle="Toute modification nécessite une ré-authentification (mot de passe + OTP SMS)"
          action={<Badge tone="warning">SENSIBLE</Badge>}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Bénéficiaire" defaultValue="Blend Rooftop SARL" />
          <Input
            label="RIB (24 chiffres)"
            value={rib}
            onChange={(e) => {
              setRib(e.target.value);
              validate(e.target.value);
            }}
            error={error}
          />
          <Input label="Banque" defaultValue="Bank of Africa" />
          <Input label="Identifiant fiscal (IF)" defaultValue="40287433" />
          <Input label="ICE" defaultValue="002384719000045" />
          <Select
            label="Statut TVA"
            options={[
              { value: "no", label: "Non assujetti" },
              { value: "yes_20", label: "Assujetti — 20 %" },
              { value: "yes_10", label: "Assujetti — 10 %" },
            ]}
            defaultValue="no"
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setReauthOpen(true)} disabled={!!error}>
            Enregistrer les modifications
          </Button>
        </div>
      </Card>

      <Modal
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        title="Confirmer votre identité"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReauthOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setReauthOpen(false)}>Confirmer</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Pour votre sécurité, nous demandons une vérification supplémentaire.
          </p>
          <Input label="Mot de passe" type="password" />
          <Input
            label="Code SMS reçu sur +212 6•• ••22"
            placeholder="6 chiffres"
            inputMode="numeric"
            maxLength={6}
          />
        </div>
      </Modal>
    </>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    saleEmail: true,
    saleSms: false,
    salePush: true,
    refundEmail: true,
    refundPush: true,
    moderationEmail: true,
    settlementEmail: true,
    weeklyDigest: true,
  });
  const set = (k: keyof typeof prefs, v: boolean) =>
    setPrefs({ ...prefs, [k]: v });

  return (
    <Card>
      <CardHeader title="Préférences de notifications" />
      <div className="flex flex-col gap-4">
        <Toggle
          label="Alertes de vente — email"
          description="Un email à chaque achat"
          checked={prefs.saleEmail}
          onChange={(v) => set("saleEmail", v)}
        />
        <Toggle
          label="Alertes de vente — SMS"
          description="Idéal pour les soirées en cours"
          checked={prefs.saleSms}
          onChange={(v) => set("saleSms", v)}
        />
        <Toggle
          label="Alertes de vente — push"
          description="Notification dans l'app"
          checked={prefs.salePush}
          onChange={(v) => set("salePush", v)}
        />
        <Toggle
          label="Demandes de remboursement"
          description="Email + push pour ne rien manquer"
          checked={prefs.refundEmail}
          onChange={(v) => set("refundEmail", v)}
        />
        <Toggle
          label="Mises à jour de modération"
          description="Quand votre événement est approuvé ou nécessite une correction"
          checked={prefs.moderationEmail}
          onChange={(v) => set("moderationEmail", v)}
        />
        <Toggle
          label="Notifications de versement"
          description="Quand un versement est programmé ou exécuté"
          checked={prefs.settlementEmail}
          onChange={(v) => set("settlementEmail", v)}
        />
        <Toggle
          label="Récapitulatif hebdomadaire"
          description="Le lundi matin, un email synthétique"
          checked={prefs.weeklyDigest}
          onChange={(v) => set("weeklyDigest", v)}
        />
      </div>
    </Card>
  );
}

function LanguageSection() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  return (
    <Card>
      <CardHeader title="Langue de l'interface" />
      <div className="grid sm:grid-cols-2 gap-3">
        {(["fr", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={[
              "text-left p-5 border bg-surface transition-colors",
              lang === l
                ? "border-ink shadow-card"
                : "border-line hover:border-ink/40",
            ].join(" ")}
          >
            <div className="h-serif text-xl text-ink">
              {l === "fr" ? "Français" : "English"}
            </div>
            <div className="text-xs text-muted mt-1">
              {l === "fr"
                ? "Langue par défaut du tableau de bord."
                : "Toggle the dashboard to English."}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ApiSection() {
  return (
    <Card>
      <CardHeader
        title="Clés API"
        subtitle="Intégrations en libre-service"
        action={<Badge tone="info">BIENTÔT</Badge>}
      />
      <p className="text-sm text-muted">
        L'accès programmatique sera disponible après le MVP. Vous pourrez gérer
        vos clés ici, créer des webhooks et synchroniser vos systèmes.
      </p>
      <div className="mt-4 opacity-50 pointer-events-none">
        <Button variant="secondary" disabled>
          Générer une clé
        </Button>
      </div>
    </Card>
  );
}

function DangerSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  return (
    <>
      <Card className="border-error/30">
        <CardHeader
          title="Zone sensible"
          subtitle="Actions irréversibles. Procédez avec prudence."
        />
        <div className="border-t border-line pt-4">
          <h4 className="text-sm font-medium text-ink">Supprimer le compte</h4>
          <p className="text-sm text-muted mt-1">
            Toutes les données de l'organisateur seront supprimées. Les
            événements passés et factures restent archivés pour des raisons
            légales (10 ans). Les versements en cours sont menés à terme.
          </p>
          <div className="mt-4">
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setConfirm("");
        }}
        title="Supprimer le compte"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={confirm !== "SUPPRIMER"}
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
            >
              Confirmer la suppression
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink">
            Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous.
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            placeholder="SUPPRIMER"
          />
        </div>
      </Modal>
    </>
  );
}
