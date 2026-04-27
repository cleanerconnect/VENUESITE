"use client";

import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Pill } from "@/components/ui/Pill";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

const SECTIONS = [
  { id: "profile", label: "Profil" },
  { id: "venue", label: "Détails du lieu" },
  { id: "payout", label: "Coordonnées de versement" },
  { id: "notifications", label: "Notifications" },
  { id: "language", label: "Langue" },
  { id: "api", label: "API" },
  { id: "danger", label: "Zone dangereuse" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("profile");

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-h1 text-ink">Réglages</h1>
        <p className="text-body text-ink-soft mt-1.5">
          Profil, coordonnées de versement, préférences.
        </p>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-8 items-start">
        {/* Vertical tab nav, sticky on desktop */}
        <aside className="lg:sticky lg:top-[88px]">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto scroll-thin no-scrollbar">
            {SECTIONS.map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "text-left text-[13px] font-semibold whitespace-nowrap px-3 h-10 rounded-[10px] transition-colors flex items-center",
                    isActive
                      ? "bg-ink text-canvas"
                      : "text-ink-soft hover:text-ink hover:bg-ink/[0.04]",
                    s.id === "danger" && !isActive && "text-danger/80",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
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
  );
}

function ProfileSection() {
  const { toast } = useToast();
  return (
    <Card variant="surface" size="lg">
      <h2 className="text-h2 text-ink">Profil organisateur</h2>
      <p className="text-body text-ink-soft mt-1.5">
        Ce que vos clients voient sur la page publique.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mt-7">
        <Input label="Nom" defaultValue="Jazzablanca" />
        <Input
          label="Email de contact"
          type="email"
          defaultValue="hello@jazzablanca.com"
        />
        <Input label="Téléphone" defaultValue="+212 522 00 00 00" />
        <Input label="Site web" defaultValue="https://jazzablanca.com" />
      </div>
      <div className="mt-4">
        <Textarea
          label="Bio"
          rows={3}
          defaultValue="Festival international de musique. 19e édition du 02 au 11 juillet 2026 à l'Anfa Park de Casablanca."
        />
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <Input label="Instagram" defaultValue="@jazzablanca" />
        <Input label="Facebook" defaultValue="jazzablanca" />
      </div>
      <div className="mt-7 flex justify-end">
        <Button
          onClick={() =>
            toast({
              tone: "success",
              title: "Profil enregistré",
            })
          }
        >
          Enregistrer
        </Button>
      </div>
    </Card>
  );
}

function VenueSection() {
  return (
    <Card variant="surface" size="lg">
      <h2 className="text-h2 text-ink">Détails du lieu</h2>
      <p className="text-body text-ink-soft mt-1.5">
        Pour la facturation et la conformité (ICE / RC).
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mt-7">
        <Input label="Adresse" defaultValue="Anfa Park" />
        <Input label="Ville" defaultValue="Casablanca" />
        <Input
          label="Capacité totale"
          type="number"
          defaultValue="12000"
          suffix="pers."
        />
        <Input label="ICE" defaultValue="002384719000045" />
        <Input label="RC" defaultValue="284711" />
      </div>
      <div className="mt-7 flex justify-end">
        <Button>Enregistrer</Button>
      </div>
    </Card>
  );
}

function PayoutSection() {
  const [unlocked, setUnlocked] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [rib, setRib] = useState("181 810 0123456789012345 67");
  const [error, setError] = useState<string | undefined>();
  const { toast } = useToast();

  const validate = (v: string) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 0) setError(undefined);
    else if (digits.length !== 24)
      setError(
        `Le RIB doit comporter 24 chiffres. Vous en avez saisi ${digits.length}.`,
      );
    else setError(undefined);
  };

  return (
    <>
      <Card variant="surface" size="lg" className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-h2 text-ink">Coordonnées de versement</h2>
            <p className="text-body text-ink-soft mt-1.5 max-w-xl leading-relaxed">
              Toute modification nécessite une vérification supplémentaire
              (mot de passe + code SMS).
            </p>
          </div>
          <Pill tone="warning" dot>
            SENSIBLE
          </Pill>
        </div>

        {!unlocked ? (
          <div className="mt-7 bg-canvas-2 border border-line rounded-[var(--radius-md)] p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="h-10 w-10 rounded-full bg-ink/[0.05] flex items-center justify-center"
              >
                <Lock size={16} strokeWidth={1.8} className="text-ink-soft" />
              </span>
              <div>
                <div className="text-[14px] font-semibold text-ink">
                  Champs verrouillés
                </div>
                <div className="text-meta text-ink-soft mt-1">
                  Confirmez votre identité pour modifier les coordonnées.
                </div>
              </div>
            </div>
            <Button onClick={() => setAuthOpen(true)}>
              Confirmer mon identité
            </Button>
          </div>
        ) : null}

        <fieldset
          disabled={!unlocked}
          className={cn(
            "mt-7 grid sm:grid-cols-2 gap-4",
            !unlocked && "opacity-50",
          )}
        >
          <Input label="Bénéficiaire" defaultValue="Jazzablanca SAS" />
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
            defaultValue="no"
            options={[
              { value: "no", label: "Non assujetti" },
              { value: "yes_20", label: "Assujetti, 20 %" },
              { value: "yes_10", label: "Assujetti, 10 %" },
            ]}
          />
        </fieldset>

        {unlocked ? (
          <div className="mt-7 flex justify-end">
            <Button
              disabled={!!error}
              onClick={() => {
                toast({
                  tone: "success",
                  title: "Coordonnées enregistrées",
                  description:
                    "Le prochain versement utilisera le nouveau RIB.",
                });
                setUnlocked(false);
              }}
            >
              Enregistrer les modifications
            </Button>
          </div>
        ) : null}
      </Card>

      <Dialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Confirmer votre identité"
        description="Pour votre sécurité, nous demandons une vérification supplémentaire."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAuthOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setAuthOpen(false);
                setUnlocked(true);
                toast({
                  tone: "success",
                  title: "Identité confirmée",
                  description: "Les champs sont déverrouillés pendant 5 minutes.",
                });
              }}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Mot de passe" type="password" />
          <Input
            label="Code SMS reçu sur +212 6•• ••22"
            placeholder="6 chiffres"
            inputMode="numeric"
            maxLength={6}
          />
        </div>
      </Dialog>
    </>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    saleEmail: true,
    saleSms: false,
    salePush: true,
    refundEmail: true,
    moderationEmail: true,
    settlementEmail: true,
    weeklyDigest: true,
  });
  const set = (k: keyof typeof prefs, v: boolean) =>
    setPrefs({ ...prefs, [k]: v });

  return (
    <Card variant="surface" size="lg">
      <h2 className="text-h2 text-ink">Préférences de notifications</h2>
      <div className="mt-7 flex flex-col gap-5">
        <Switch
          label="Alertes de vente, email"
          description="Un email à chaque achat"
          checked={prefs.saleEmail}
          onCheckedChange={(v) => set("saleEmail", v)}
        />
        <Switch
          label="Alertes de vente, SMS"
          description="Idéal pour les soirées en cours"
          checked={prefs.saleSms}
          onCheckedChange={(v) => set("saleSms", v)}
        />
        <Switch
          label="Alertes de vente, push"
          description="Notification dans l'app"
          checked={prefs.salePush}
          onCheckedChange={(v) => set("salePush", v)}
        />
        <Switch
          label="Demandes de remboursement"
          description="Email + push pour ne rien manquer"
          checked={prefs.refundEmail}
          onCheckedChange={(v) => set("refundEmail", v)}
        />
        <Switch
          label="Mises à jour de modération"
          description="Quand votre événement est approuvé ou nécessite une correction"
          checked={prefs.moderationEmail}
          onCheckedChange={(v) => set("moderationEmail", v)}
        />
        <Switch
          label="Notifications de versement"
          description="Quand un versement est programmé ou exécuté"
          checked={prefs.settlementEmail}
          onCheckedChange={(v) => set("settlementEmail", v)}
        />
        <Switch
          label="Récapitulatif hebdomadaire"
          description="Le lundi matin, un email synthétique"
          checked={prefs.weeklyDigest}
          onCheckedChange={(v) => set("weeklyDigest", v)}
        />
      </div>
    </Card>
  );
}

function LanguageSection() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  return (
    <Card variant="surface" size="lg">
      <h2 className="text-h2 text-ink">Langue de l'interface</h2>
      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        {(["fr", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={cn(
              "text-left p-5 border rounded-[var(--radius-md)] bg-canvas transition-all",
              lang === l
                ? "border-violet ring-1 ring-violet/30 bg-violet-soft"
                : "border-line hover:border-ink",
            )}
          >
            <div
              className="text-h3 text-ink"
              style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
            >
              {l === "fr" ? "Français" : "English"}
            </div>
            <div className="text-meta text-ink-soft mt-1.5">
              {l === "fr"
                ? "Langue par défaut du tableau de bord."
                : "Switch the dashboard to English."}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ApiSection() {
  return (
    <Card variant="gold-soft" size="lg">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="h-12 w-12 rounded-[12px] bg-canvas/60 flex items-center justify-center shrink-0"
        >
          <Lock size={20} strokeWidth={1.8} className="text-violet-deep" />
        </span>
        <div>
          <Pill tone="warning">BIENTÔT</Pill>
          <h2 className="text-h2 text-ink mt-3">Clés API</h2>
          <p className="text-body text-ink-soft mt-2 max-w-xl leading-relaxed">
            L'accès programmatique sera disponible après le MVP. Vous pourrez
            gérer vos clés ici, créer des webhooks et synchroniser vos
            systèmes (caisse, fidélisation, CRM).
          </p>
        </div>
      </div>
    </Card>
  );
}

function DangerSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  return (
    <>
      <Card variant="rose" size="lg">
        <div className="flex items-start gap-3 mb-2">
          <Trash2 size={18} strokeWidth={1.8} className="text-danger mt-1" />
          <div>
            <h2 className="text-h2 text-ink">Supprimer le compte</h2>
            <p className="text-body text-ink-soft mt-1.5 max-w-xl leading-relaxed">
              Toutes les données de l'organisateur seront supprimées. Les
              événements passés et les factures restent archivés pour des
              raisons légales (10 ans). Les versements en cours sont menés à
              terme.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Supprimer mon compte
          </Button>
        </div>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirm("");
        }}
        title="Supprimer le compte"
        description="Cette action est irréversible."
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
          <p className="text-[14px] text-ink leading-relaxed">
            Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous.
          </p>
          <Input
            label="Confirmation"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            placeholder="SUPPRIMER"
          />
        </div>
      </Dialog>
    </>
  );
}
