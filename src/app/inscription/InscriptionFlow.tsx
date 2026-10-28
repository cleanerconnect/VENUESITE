"use client";

// « Inscription » — the account, and nothing else.
//
// Two screens: who you are, then the account exists. It used to be
// seven, and the other five now live at
// `/restaurant/etablissement/nouveau` — DigiNegoce, 27 October.
//
// The reason is not screen count. A partner typing their name here has
// not yet decided what they want LYFE for; the old road made them
// invent an establishment to find out, and a partner who manages
// events had to walk five restaurant screens to reach a product that
// was never going to ask for a cuisine. Creating the account and
// choosing what to manage are two questions, so they are two screens.
//
// What is mandatory here is what `Détail Sprint ` row 39 names: a
// name, an e-mail, a phone number, and a password typed twice.
// Nothing else — there is nothing else to ask until the partner has
// said what they are building.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";
import { SAVE_BAR_CARD } from "@/components/forms/SaveBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  ACCOUNT_LAST_STEP,
  ACCOUNT_STEPS,
  type OnboardingDraft,
} from "@/lib/types/onboarding";
import {
  ONBOARDING_BAR_SHELL,
  Progress,
} from "@/components/onboarding/pieces";
import {
  finishAccountCreation,
  signUpPartner,
} from "@/app/actions/onboarding";

/** One sentence per step. Any more and nobody reads either. */
const HELP: Record<number, string> = {
  1: "Vos coordonnées, pour que nous sachions à qui écrire. Rien n'est public.",
  2: "Il reste à choisir ce que vous voulez gérer.",
};

export function InscriptionFlow({
  initialDraft,
}: {
  initialDraft: OnboardingDraft | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // A draft that exists means the account does too: step 1 made both,
  // and reopening the page lands on the confirmation rather than
  // asking for an address that is already taken.
  const [step, setStep] = useState(initialDraft ? 2 : 1);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(
    null,
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const current = ACCOUNT_STEPS.find((s) => s.n === step) ?? ACCOUNT_STEPS[0];

  const submitStepOne = () => {
    setError(null);
    setFieldError(null);
    start(async () => {
      const result = await signUpPartner({
        fullName,
        email,
        phone,
        password,
        passwordConfirm,
      });
      if (!result.ok) {
        if (result.field) setFieldError({ field: result.field, message: result.message });
        else setError(result.message);
        return;
      }
      setStep(2);
    });
  };

  /** Signs in on the new account and goes to the chooser. */
  const choose = () => {
    setError(null);
    start(async () => {
      const result = await finishAccountCreation();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(result.href);
    });
  };

  const fieldMessage = (name: string) =>
    fieldError?.field === name ? fieldError.message : undefined;

  return (
    <div>
      {/* The small cut on a phone, like the topbar and the drawer: at
          390 the step has to fit a screen, and 40px of wordmark above a
          form of five fields is 12px of the budget spent on the one
          thing already on every other screen. */}
      <div className="flex items-center justify-between">
        <span className="md:hidden">
          <Brand size="sm" />
        </span>
        <span className="hidden md:block">
          <Brand size="lg" />
        </span>
        <span className="text-meta text-ink-mute">
          Étape {step} sur {ACCOUNT_LAST_STEP}
        </span>
      </div>

      <Progress step={step} steps={ACCOUNT_STEPS} />

      <Card
        variant="surface"
        size="lg"
        className="mt-4 md:mt-5 max-md:p-4 md:p-6"
      >
        <h1 className="text-h2 text-ink">{current.name}</h1>
        <p className="text-body text-ink-soft mt-2">{HELP[step]}</p>

        <div className="mt-4 md:mt-6">
          {/* `initial={false}` — the fields have to be *visible* on the
              first paint, not merely present in the HTML.
              `motion.div` writes its `initial` into the server-rendered
              markup, so `opacity: 0` shipped in the document and the
              step's content was painted invisible until JavaScript
              arrived and animated it in. On a fast machine that is a
              flicker; on 3G it is a card with a title, a sentence and
              several hundred pixels of nothing, for as long as the
              bundle takes. The step-to-step transition still animates —
              this disables the enter animation on mount only. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2.5 md:gap-4"
            >
              {step === 1 ? (
                // Two columns from 768.
                //
                // Five fields stacked put « Continuer » at 871px, and a
                // tablet held in landscape is 768px tall: the one
                // button the step exists for was under the fold on the
                // two shortest screens in the list. Paired, the step
                // ends at 657 and the whole of it is on screen. The
                // pairs are the ones a reader expects together — the
                // two halves of who you are, then the two halves of a
                // password — and the phone keeps the single column,
                // where a two-column form is two narrow columns.
                <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                  <Input
                    label="Votre nom"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={fieldMessage("fullName")}
                    autoComplete="name"
                  />
                  <Input
                    label="Adresse e-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldMessage("email")}
                    autoComplete="email"
                  />
                  {/* Asked for, not optional. `Détail Sprint `, row 39,
                      SP-Prio 02 names « Nom complet, email, téléphone,
                      Mot de passe et confirmation de mot de passe »
                      among the personal details the account is created
                      from, and the same row sends the verification code
                      « à mon mail ou à mon whatsapp » — which needs a
                      number. Prio 02 also buys « Réservation via
                      whatsapp ». */}
                  {/* Across both columns: the hint under it is a
                      sentence, and a sentence in half a card wraps to
                      three lines and gives the height back. `Input`
                      puts `className` on the field itself, so the span
                      belongs to a wrapper. */}
                  <div className="md:col-span-2">
                    <Input
                      label="Téléphone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={fieldMessage("phone")}
                      hint="Sur WhatsApp de préférence : c'est là que partent les alertes."
                      autoComplete="tel"
                    />
                  </div>
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={fieldMessage("password")}
                    hint="Huit caractères au minimum."
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirmation du mot de passe"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    error={fieldMessage("passwordConfirm")}
                    autoComplete="new-password"
                  />
                </div>
              ) : null}

              {step === 2 ? (
                // The confirmation, and it confirms one thing.
                //
                // The old step 7 read six venue answers back before
                // creating anything. There is no venue yet, so there is
                // nothing to recap: what this screen owes the partner
                // is that the account exists, that it is theirs, and
                // where the next decision is made.
                <div className="flex flex-col items-start gap-4">
                  <span
                    aria-hidden
                    className="grid h-12 w-12 place-items-center rounded-full bg-violet-soft text-ink"
                  >
                    <Check size={24} strokeWidth={2.5} />
                  </span>
                  <p className="text-body text-ink">
                    Votre compte est créé. Vous pouvez vous connecter avec
                    cette adresse à tout moment.
                  </p>
                  <p className="text-meta text-ink-mute">
                    Un espace par activité : un restaurant, un bar ou lounge,
                    des événements. Vous en ajouterez d&apos;autres plus tard
                    si besoin.
                  </p>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      {/* « Continuer » is pinned, not placed, for the reason the venue
          flow pins its own: the action a step exists for stays in the
          first viewport whatever the step's own height does. The shell
          is this flow's, because `/inscription` is outside the
          dashboard and has no phone tab bar to clear. */}
      <div className={ONBOARDING_BAR_SHELL}>
        {error ? (
          <p
            className="pointer-events-auto mb-2 rounded-[var(--radius-md)] border border-danger bg-surface px-4 py-2 text-meta text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className={SAVE_BAR_CARD}>
          {step === 1 ? (
            <Button size="lg" onClick={submitStepOne} disabled={pending}>
              Continuer
            </Button>
          ) : (
            <Button
              size="lg"
              iconRight={<ArrowRight size={16} />}
              onClick={choose}
              disabled={pending}
            >
              Choisir mon espace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
