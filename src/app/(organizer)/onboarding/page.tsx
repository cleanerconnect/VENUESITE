"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Lock,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Brand } from "@/components/organizer/Brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/auth/role";
import {
  type OnboardingDraft,
  type OnboardingDraftInvite,
  markOnboardingComplete,
  readDraft,
  writeDraft,
} from "@/lib/auth/onboarding";
import { cn } from "@/lib/utils/cn";
import type { OrganizerType } from "@/lib/types/domain";

type StepIdx = 1 | 2 | 3 | 4 | 5;

const STEPS: { idx: StepIdx; label: string }[] = [
  { idx: 1, label: "Bienvenue" },
  { idx: 2, label: "Profil" },
  { idx: 3, label: "Banque" },
  { idx: 4, label: "Payzone" },
  { idx: 5, label: "Équipe" },
];

const MOROCCAN_BANKS = [
  "Attijariwafa Bank",
  "Banque Populaire",
  "BMCE Bank of Africa",
  "BMCI",
  "CIH Bank",
  "Crédit Agricole du Maroc",
  "Crédit du Maroc",
  "Société Générale Maroc",
  "Wafabank",
  "Al Barid Bank",
];

const ORG_TYPES: { id: OrganizerType; label: string }[] = [
  { id: "festival", label: "Festival" },
  { id: "venue", label: "Salle" },
  { id: "promoter", label: "Promoteur" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useProfile();
  const { toast } = useToast();
  const [step, setStep] = useState<StepIdx>(1);
  const [draft, setDraft] = useState<OnboardingDraft>({ lastStep: 0 });

  // Resume on mount: jump to step lastStep + 1, capped at 5.
  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    const existing = readDraft(profileId);
    setDraft(existing);
    if (existing.lastStep > 0) {
      const resume = Math.min(5, existing.lastStep + 1) as StepIdx;
      setStep(resume);
    }
  }, [profileId]);

  if (!profile) {
    return <div className="fixed inset-0 z-40 bg-canvas" aria-hidden />;
  }

  const advance = (nextDraft: OnboardingDraft) => {
    const completedStep = step;
    const merged: OnboardingDraft = {
      ...nextDraft,
      lastStep: Math.max(nextDraft.lastStep ?? 0, completedStep),
    };
    setDraft(merged);
    writeDraft(profile.id, merged);
    if (step < 5) {
      setStep((step + 1) as StepIdx);
    }
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as StepIdx);
  };

  const finish = (finalDraft: OnboardingDraft) => {
    writeDraft(profile.id, { ...finalDraft, lastStep: 5 });
    markOnboardingComplete(profile.id);
    toast({
      tone: "success",
      title: "Tout est prêt.",
      description: "Créez votre premier événement quand vous voulez.",
    });
    router.push("/dashboard?onboarding=done");
  };

  const exit = () => router.push("/dashboard");

  return (
    <div className="fixed inset-0 z-40 bg-canvas overflow-y-auto flex flex-col">
      {/* Header — wordmark + close + progress bar */}
      <header className="sticky top-0 bg-canvas/95 backdrop-blur-md border-b border-line-soft z-10">
        <div className="max-w-3xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-3">
          <Brand height={26} />
          <button
            type="button"
            onClick={exit}
            aria-label="Reprendre plus tard"
            className="h-9 w-9 -mr-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute transition-colors"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
        {/* Progress bar — segments per step */}
        <div className="max-w-3xl mx-auto px-5 md:px-8 pb-4 pt-1 flex items-center gap-1.5">
          {STEPS.map((s) => (
            <span
              key={s.idx}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                s.idx <= step ? "bg-violet" : "bg-canvas-2",
              )}
            />
          ))}
        </div>
        <div className="max-w-3xl mx-auto px-5 md:px-8 pb-3 flex items-baseline justify-between">
          <span className="text-meta text-ink-mute">
            Étape {step} sur 5 · {STEPS[step - 1].label}
          </span>
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 text-meta font-semibold text-ink-soft hover:text-ink transition-colors"
            >
              <ArrowLeft size={11} strokeWidth={2.2} />
              Retour
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 md:px-8 py-8 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 ? (
              <StepWelcome onNext={() => advance(draft)} />
            ) : step === 2 ? (
              <StepProfile
                draft={draft}
                profileSeed={{
                  name: profile.name,
                  type: profile.type,
                  city: profile.city,
                  bio: profile.bio,
                }}
                onNext={(payload) =>
                  advance({ ...draft, profile: payload })
                }
              />
            ) : step === 3 ? (
              <StepBanking
                draft={draft}
                onNext={(payload) =>
                  advance({ ...draft, banking: payload })
                }
              />
            ) : step === 4 ? (
              <StepPayzone
                onSkip={() =>
                  advance({ ...draft, payzoneSkipped: true })
                }
                onConfirm={() =>
                  advance({ ...draft, payzoneSkipped: false })
                }
              />
            ) : (
              <StepTeam
                draft={draft}
                onFinish={(invites) =>
                  finish({ ...draft, invites, lastStep: 5 })
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Step 1 — Bienvenue ─────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center max-w-xl mx-auto py-6">
      <span
        aria-hidden
        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-soft mb-6"
      >
        <Sparkles size={26} strokeWidth={1.5} className="text-violet-deep" />
      </span>
      <h1
        className="text-ink"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(38px, 6vw, 56px)",
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
        }}
      >
        Bienvenue chez LYFE.
      </h1>
      <p className="text-body text-ink-soft mt-5 leading-relaxed">
        Configurons votre espace en 5 minutes pour que vous puissiez créer
        votre premier événement.
      </p>
      <div className="mt-9">
        <Button size="lg" onClick={onNext} iconRight={<ArrowRight size={14} strokeWidth={1.8} />}>
          Commencer
        </Button>
      </div>
      <p className="text-meta text-ink-mute mt-4">
        Vous pourrez fermer cette fenêtre et reprendre plus tard à tout moment.
      </p>
    </div>
  );
}

// ─── Step 2 — Profil organisateur ───────────────────────────────────────

function StepProfile({
  draft,
  profileSeed,
  onNext,
}: {
  draft: OnboardingDraft;
  profileSeed: { name: string; type: OrganizerType; city: string; bio: string };
  onNext: (payload: {
    name: string;
    type: OrganizerType;
    city: string;
    bio: string;
  }) => void;
}) {
  const [name, setName] = useState(draft.profile?.name ?? profileSeed.name);
  const [type, setType] = useState<OrganizerType>(
    (draft.profile?.type as OrganizerType) ?? profileSeed.type,
  );
  const [city, setCity] = useState(draft.profile?.city ?? profileSeed.city);
  const [bio, setBio] = useState(draft.profile?.bio ?? profileSeed.bio);

  const valid = name.trim().length > 1 && city.trim().length > 1;

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Building2 size={18} strokeWidth={1.7} />}
        eyebrow="Profil organisateur"
        title="Quelques infos publiques."
        subtitle="Ces informations apparaissent sur vos pages événement et facilitent la découverte par les acheteurs."
      />

      <div className="space-y-5">
        <Input
          label="Nom de l'organisation"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="organization"
        />

        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Type</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ORG_TYPES.map((opt) => {
              const active = type === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={cn(
                    "rounded-[var(--radius-md)] border p-3 text-center transition-colors",
                    active
                      ? "border-violet bg-violet-soft text-violet-deep font-semibold"
                      : "border-line bg-surface text-ink hover:border-violet-soft",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Ville principale"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
        />

        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Description publique</div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="2-3 phrases sur votre programmation, votre histoire, votre identité musicale."
            className="w-full px-3 py-2.5 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors resize-none"
          />
        </div>
      </div>

      <FooterCTA
        onNext={() => onNext({ name, type, city, bio })}
        disabled={!valid}
      />
    </div>
  );
}

// ─── Step 3 — Informations bancaires ────────────────────────────────────

function StepBanking({
  draft,
  onNext,
}: {
  draft: OnboardingDraft;
  onNext: (payload: {
    holder: string;
    rib: string;
    bank: string;
    ice: string;
  }) => void;
}) {
  const [holder, setHolder] = useState(draft.banking?.holder ?? "");
  const [rib, setRib] = useState(draft.banking?.rib ?? "");
  const [bank, setBank] = useState(draft.banking?.bank ?? "");
  const [ice, setIce] = useState(draft.banking?.ice ?? "");

  // RIB Maroc: 24 digits. ICE: 15 digits. Light validation only —
  // demo doesn't gate on Mod 97 etc.
  const ribDigits = rib.replace(/\D/g, "");
  const iceDigits = ice.replace(/\D/g, "");
  const valid =
    holder.trim().length > 1 &&
    ribDigits.length === 24 &&
    bank.length > 0 &&
    iceDigits.length === 15;

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Landmark size={18} strokeWidth={1.7} />}
        eyebrow="Informations bancaires"
        title="Où LYFE doit verser vos recettes."
        subtitle="Versement automatique sur votre compte 3 jours après chaque événement clôturé."
      />

      <div className="space-y-5">
        <Input
          label="Nom du titulaire du compte"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="Tel qu'il apparaît sur le RIB"
        />

        <Input
          label="RIB (24 chiffres)"
          value={rib}
          onChange={(e) => {
            // Group by 4 for legibility, strip on submit.
            const digits = e.target.value.replace(/\D/g, "").slice(0, 24);
            const grouped = digits.replace(/(.{4})/g, "$1 ").trim();
            setRib(grouped);
          }}
          placeholder="012 345 6789012 3456789012"
          inputMode="numeric"
        />

        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Banque</div>
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="w-full h-11 px-3 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors"
          >
            <option value="">— Choisir votre banque —</option>
            {MOROCCAN_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="ICE (15 chiffres)"
          value={ice}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
            setIce(digits);
          }}
          placeholder="002384719000045"
          inputMode="numeric"
        />
      </div>

      <div className="rounded-[var(--radius-md)] bg-canvas-2 border-l-2 border-violet p-3 flex items-start gap-2.5">
        <Lock size={13} strokeWidth={1.9} className="text-violet-deep mt-0.5 shrink-0" />
        <p className="text-meta text-ink leading-relaxed">
          Ces informations sont chiffrées et utilisées uniquement pour les
          versements J+3 après chaque événement.
        </p>
      </div>

      <FooterCTA
        onNext={() => onNext({ holder, rib: ribDigits, bank, ice })}
        disabled={!valid}
      />
    </div>
  );
}

// ─── Step 4 — Connexion Payzone ─────────────────────────────────────────

function StepPayzone({
  onSkip,
  onConfirm,
}: {
  onSkip: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={<CreditCard size={18} strokeWidth={1.7} />}
        eyebrow="Paiements en ligne"
        title="Connectez Payzone."
        subtitle="Payzone encaisse les paiements de vos acheteurs et les reverse à LYFE pour les versements automatiques. La connexion bouclera la chaîne d'encaissement."
      />

      <div className="rounded-[var(--radius-lg)] bg-violet-soft p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-canvas/70 text-ink text-[12px] font-bold">
            <CreditCard size={13} strokeWidth={1.8} className="text-violet-deep" />
            Payzone Maroc
          </span>
          <Pill tone="neutral">
            <Lock size={11} strokeWidth={2} className="-ml-0.5" />
            À configurer
          </Pill>
        </div>
        <p className="text-[14px] text-ink leading-relaxed">
          Cartes bancaires Maroc, MasterCard et Visa internationales,
          Apple Pay, paiement en plusieurs fois. Onboarding KYC géré
          directement par Payzone — comptez 48h pour la validation.
        </p>
        <div className="mt-5">
          <Button
            variant="secondary"
            size="md"
            iconLeft={<Lock size={13} strokeWidth={1.9} />}
            disabled
          >
            Connecter Payzone
          </Button>
          <p className="text-meta text-ink-mute mt-2">
            Bientôt disponible — l&apos;intégration ouvre fin 2026 pendant la
            phase BETA. Vous pouvez configurer plus tard sans bloquer la
            création de votre premier événement.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-meta font-semibold text-ink-mute hover:text-ink transition-colors"
        >
          Configurer plus tard
        </button>
        <Button
          size="md"
          onClick={onConfirm}
          iconRight={<ArrowRight size={14} strokeWidth={1.8} />}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5 — Inviter votre équipe ──────────────────────────────────────

const ROLE_OPTIONS: { id: OnboardingDraftInvite["role"]; label: string }[] = [
  { id: "owner", label: "Propriétaire" },
  { id: "admin", label: "Admin" },
  { id: "scanner", label: "Scanner" },
];

function StepTeam({
  draft,
  onFinish,
}: {
  draft: OnboardingDraft;
  onFinish: (invites: OnboardingDraftInvite[]) => void;
}) {
  const [invites, setInvites] = useState<OnboardingDraftInvite[]>(
    draft.invites && draft.invites.length > 0
      ? draft.invites
      : [{ id: "i_0", email: "", role: "admin" }],
  );

  const addRow = () =>
    setInvites((rows) => [
      ...rows,
      { id: `i_${rows.length}_${Date.now()}`, email: "", role: "scanner" },
    ]);

  const removeRow = (id: string) =>
    setInvites((rows) => rows.filter((r) => r.id !== id));

  const update = (id: string, patch: Partial<OnboardingDraftInvite>) =>
    setInvites((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );

  const filled = invites.filter((r) => r.email.includes("@"));

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<Mail size={18} strokeWidth={1.7} />}
        eyebrow="Inviter votre équipe"
        title="Optionnel — vous pouvez le faire plus tard."
        subtitle="Donnez accès à votre équipe selon leur rôle. Les invités reçoivent un email avec un lien d'activation."
      />

      <div className="space-y-3">
        {invites.map((row) => (
          <div
            key={row.id}
            className="flex flex-col sm:flex-row gap-2 items-start sm:items-end"
          >
            <div className="flex-1 w-full">
              <Input
                label="Email"
                type="email"
                value={row.email}
                onChange={(e) => update(row.id, { email: e.target.value })}
                placeholder="prenom@example.com"
              />
            </div>
            <div className="w-full sm:w-44">
              <div className="text-eyebrow text-ink-mute mb-2 sm:hidden">Rôle</div>
              <select
                value={row.role}
                onChange={(e) =>
                  update(row.id, {
                    role: e.target.value as OnboardingDraftInvite["role"],
                  })
                }
                className="w-full h-11 px-3 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {invites.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label="Supprimer ce membre"
                className="h-11 w-11 rounded-full hover:bg-tint-rose flex items-center justify-center text-ink-mute hover:text-danger transition-colors shrink-0"
              >
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 text-meta font-semibold text-violet-deep hover:text-ink transition-colors"
        >
          <Plus size={12} strokeWidth={2} />
          Ajouter un autre membre
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => onFinish([])}
          className="text-meta font-semibold text-ink-mute hover:text-ink transition-colors"
        >
          Je m&apos;en occuperai plus tard
        </button>
        <Button
          size="md"
          onClick={() => onFinish(filled)}
          iconRight={<Check size={14} strokeWidth={2} />}
        >
          Terminer
        </Button>
      </div>
    </div>
  );
}

// ─── Shared step header + footer CTA ────────────────────────────────────

function StepHeader({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span
          aria-hidden
          className="h-9 w-9 rounded-[10px] bg-violet-soft flex items-center justify-center text-violet-deep shrink-0"
        >
          {icon}
        </span>
        <span className="text-eyebrow text-violet-deep">{eyebrow}</span>
      </div>
      <h2
        className="text-ink"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(28px, 4vw, 36px)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      <p className="text-body text-ink-soft mt-3 max-w-lg leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function FooterCTA({
  onNext,
  disabled,
}: {
  onNext: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="pt-3">
      <Button
        size="lg"
        fullWidth
        onClick={onNext}
        disabled={disabled}
        iconRight={<ArrowRight size={14} strokeWidth={1.8} />}
      >
        Suivant
      </Button>
    </div>
  );
}

