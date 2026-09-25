"use client";

// The six steps.
//
// One question group per step, because a partner filling this in on a
// phone between two services abandons a form that asks fourteen things
// at once. Every step but the first saves to the draft before it
// advances, so the furthest step reached is a server fact rather than a
// browser one.
//
// What is mandatory: a name, an e-mail and a password to have an
// account; the establishment's name, its type, its city and its
// address, because the app cannot list a place it cannot find. Nothing
// else — the phone, the map pin, the cover photo and the hours all have
// an answer already, and step 4 says out loud that it can be skipped.

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, MapPin } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { cn } from "@/lib/utils/cn";
import {
  ONBOARDING_CITIES,
  ONBOARDING_LAST_STEP,
  ONBOARDING_STEPS,
  ONBOARDING_TYPE_CHOICE,
  ONBOARDING_TYPE_LABEL,
  WEEKDAY_LABEL,
  defaultHours,
  type OnboardingDay,
  type OnboardingDraft,
  type OnboardingVenueType,
} from "@/lib/types/onboarding";
import {
  finishOnboarding,
  requestCoverUpload,
  saveOnboardingStep,
  signUpPartner,
} from "@/app/actions/onboarding";

/** One sentence per step. Any more and nobody reads either. */
const HELP: Record<number, string> = {
  1: "Vos coordonnées, pour que nous sachions à qui écrire. Rien n'est public.",
  2: "Le nom que vos clients verront dans l'application, et où vous êtes.",
  3: "L'adresse sert à vous placer sur la carte. Vous pourrez l'ajuster plus tard.",
  4: "Une photo donne envie de réserver. Vous pouvez passer cette étape et l'ajouter plus tard.",
  5: "Les heures pendant lesquelles vous acceptez des réservations. Modifiables à tout moment.",
  6: "Vérifiez, puis ouvrez votre tableau de bord.",
};

export function InscriptionFlow({
  initialDraft,
}: {
  initialDraft: OnboardingDraft | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<OnboardingDraft | null>(initialDraft);
  // A draft that exists means step 1 is behind us; it carries the
  // furthest step reached, which is where a reopened flow resumes.
  const [step, setStep] = useState(initialDraft ? initialDraft.step : 1);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(
    null,
  );

  // Step 1 — the only values that never reach the draft.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Steps 2 to 5 — seeded from the draft when there is one.
  const [venueName, setVenueName] = useState(initialDraft?.venueName ?? "");
  const [venueType, setVenueType] = useState<OnboardingVenueType>(
    initialDraft?.venueType ?? "restaurant",
  );
  const [city, setCity] = useState(initialDraft?.city ?? "");
  const [address, setAddress] = useState(initialDraft?.address ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialDraft?.latitude != null && initialDraft?.longitude != null
      ? { lat: initialDraft.latitude, lng: initialDraft.longitude }
      : null,
  );
  const [cover, setCover] = useState<{ name: string; objectKey: string } | null>(
    initialDraft?.coverObjectKey
      ? { name: "Photo de couverture", objectKey: initialDraft.coverObjectKey }
      : null,
  );
  const [hours, setHours] = useState<OnboardingDay[]>(
    initialDraft?.hours?.length ? initialDraft.hours : defaultHours(),
  );

  const current = ONBOARDING_STEPS.find((s) => s.n === step) ?? ONBOARDING_STEPS[0];

  const goBack = () => {
    setError(null);
    setFieldError(null);
    setStep((n) => Math.max(1, n - 1));
  };

  /** Saves, then advances. A step that cannot save does not advance. */
  const advance = (patch: Parameters<typeof saveOnboardingStep>[0]) => {
    setError(null);
    start(async () => {
      const result = await saveOnboardingStep({
        ...patch,
        step: Math.min(ONBOARDING_LAST_STEP, step + 1),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDraft(result.draft);
      setStep((n) => Math.min(ONBOARDING_LAST_STEP, n + 1));
    });
  };

  const submitStepOne = () => {
    setError(null);
    setFieldError(null);
    start(async () => {
      const result = await signUpPartner({ fullName, email, phone, password });
      if (!result.ok) {
        if (result.field) setFieldError({ field: result.field, message: result.message });
        else setError(result.message);
        return;
      }
      setDraft(result.draft);
      setStep(2);
    });
  };

  const finish = () => {
    setError(null);
    start(async () => {
      const result = await finishOnboarding();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(result.href);
    });
  };

  const uploadCover = (file: File) => {
    setError(null);
    start(async () => {
      const ticket = await requestCoverUpload({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!ticket.ok) {
        setError(ticket.message);
        return;
      }
      const sent = await fetch(ticket.url, {
        method: ticket.method,
        headers: ticket.headers,
        body: file,
      });
      if (!sent.ok) {
        setError("Le téléversement a échoué. Réessayez.");
        return;
      }
      const saved = await saveOnboardingStep({
        coverObjectKey: ticket.objectKey,
        coverContentType: file.type,
        coverSizeBytes: file.size,
      });
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      setDraft(saved.draft);
      setCover({ name: file.name, objectKey: ticket.objectKey });
    });
  };

  const fieldMessage = (name: string) =>
    fieldError?.field === name ? fieldError.message : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Brand height={40} />
        <span className="text-meta text-ink-mute">
          Étape {step} sur {ONBOARDING_LAST_STEP}
        </span>
      </div>

      <Progress step={step} />

      <Card variant="surface" size="lg" className="mt-6">
        <h1 className="text-h2 text-ink">{current.name}</h1>
        <p className="text-body text-ink-soft mt-2">{HELP[step]}</p>

        <div className="mt-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-4"
            >
              {step === 1 ? (
                <>
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
                  <Input
                    label="Téléphone (facultatif)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={fieldMessage("password")}
                    hint="Huit caractères au minimum."
                    autoComplete="new-password"
                  />
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <Input
                    label="Nom de l'établissement"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    autoComplete="organization"
                  />
                  <div>
                    <div className="text-eyebrow text-ink-mute mb-2">
                      C&apos;est plutôt
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          { value: "restaurant", label: ONBOARDING_TYPE_CHOICE.restaurant },
                          { value: "bar", label: ONBOARDING_TYPE_CHOICE.bar },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setVenueType(option.value)}
                          className={cn(
                            "h-14 rounded-[var(--radius-md)] border text-[15px] font-semibold transition-colors",
                            venueType === option.value
                              ? "border-ink bg-violet-soft text-ink"
                              : "border-line bg-surface text-ink-soft hover:border-ink",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* A list, not a field: see ONBOARDING_CITIES for why
                      five names beat free text here. */}
                  <Select
                    label="Ville"
                    value={city}
                    onChange={setCity}
                    options={[
                      { value: "", label: "Choisissez votre ville" },
                      ...ONBOARDING_CITIES.map((name) => ({ value: name, label: name })),
                    ]}
                  />
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Input
                    label="Adresse"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                  {/* The pin, not a map: a real tile layer is a key and a
                      vendor, and what the flow needs is the point. The
                      partner can move it on Ma fiche afterwards. */}
                  <div className="rounded-[var(--radius-md)] border border-line bg-canvas-2 p-5">
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="text-violet-deep mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-ink">
                          {pin ? "Point placé" : "Placer le point sur la carte"}
                        </div>
                        <p className="text-meta text-ink-mute mt-1">
                          {pin
                            ? `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`
                            : "Facultatif. Sans point, nous plaçons votre établissement sur l'adresse."}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() =>
                          setPin(
                            pin
                              ? null
                              : { lat: 31.6295 + Math.random() / 100, lng: -7.9811 + Math.random() / 100 },
                          )
                        }
                      >
                        {pin ? "Retirer" : "Placer"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}

              {step === 4 ? (
                <div className="rounded-[var(--radius-md)] border border-line bg-canvas-2 p-6 text-center">
                  {cover ? (
                    <>
                      <div className="mx-auto h-12 w-12 rounded-full bg-success-soft flex items-center justify-center">
                        <Check size={22} className="text-success" strokeWidth={2.2} />
                      </div>
                      <div className="text-[15px] font-semibold text-ink mt-3">
                        Photo ajoutée
                      </div>
                      <p className="text-meta text-ink-mute mt-1 truncate">{cover.name}</p>
                      <label className="inline-flex mt-4">
                        <span className="sr-only">Remplacer la photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadCover(file);
                          }}
                        />
                        <span className="h-11 px-5 inline-flex items-center rounded-[var(--radius-sm)] border border-line bg-surface text-[15px] font-semibold text-ink cursor-pointer hover:border-ink transition-colors">
                          Remplacer
                        </span>
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto h-12 w-12 rounded-full bg-violet-soft flex items-center justify-center">
                        <ImagePlus size={22} className="text-violet-deep" />
                      </div>
                      <div className="text-[15px] font-semibold text-ink mt-3">
                        Photo de couverture
                      </div>
                      <p className="text-meta text-ink-mute mt-1">
                        JPEG, PNG ou WebP. 8 Mo au maximum.
                      </p>
                      <label className="inline-flex mt-4">
                        <span className="sr-only">Choisir une photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadCover(file);
                          }}
                        />
                        <span className="h-14 px-7 inline-flex items-center rounded-[var(--radius-md)] bg-ink text-canvas text-[16px] font-semibold cursor-pointer hover:bg-ink-soft transition-colors">
                          Choisir une photo
                        </span>
                      </label>
                    </>
                  )}
                </div>
              ) : null}

              {step === 5 ? <HoursGrid hours={hours} onChange={setHours} /> : null}

              {step === 6 ? (
                <Summary
                  venueName={venueName}
                  venueType={venueType}
                  city={city}
                  address={address}
                  hasCover={Boolean(cover)}
                  hours={hours}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {error ? (
          <p className="text-meta text-danger mt-5" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center gap-3 flex-wrap">
          {step > 1 ? (
            <Button
              variant="secondary"
              size="md"
              iconLeft={<ArrowLeft size={16} />}
              onClick={goBack}
              disabled={pending}
            >
              Précédent
            </Button>
          ) : null}

          {step === 1 ? (
            <Button size="lg" onClick={submitStepOne} disabled={pending}>
              Continuer
            </Button>
          ) : null}
          {step === 2 ? (
            <Button
              size="lg"
              onClick={() => advance({ venueName, venueType, city })}
              disabled={pending || !venueName.trim() || !city.trim()}
            >
              Continuer
            </Button>
          ) : null}
          {step === 3 ? (
            <Button
              size="lg"
              onClick={() =>
                advance({ address, latitude: pin?.lat ?? null, longitude: pin?.lng ?? null })
              }
              disabled={pending || !address.trim()}
            >
              Continuer
            </Button>
          ) : null}
          {step === 4 ? (
            <>
              <Button size="lg" onClick={() => advance({})} disabled={pending}>
                Continuer
              </Button>
              {/* Skipping is a button, not a small grey link: the step
                  says it can be skipped, so it has to be pressable. */}
              <Button variant="ghost" size="md" onClick={() => advance({})} disabled={pending}>
                Passer cette étape
              </Button>
            </>
          ) : null}
          {step === 5 ? (
            <Button size="lg" onClick={() => advance({ hours })} disabled={pending}>
              Continuer
            </Button>
          ) : null}
          {step === 6 ? (
            <Button
              size="lg"
              iconRight={<ArrowRight size={16} />}
              onClick={finish}
              disabled={pending}
            >
              Ouvrir mon tableau de bord
            </Button>
          ) : null}
        </div>
      </Card>

      {draft && step < ONBOARDING_LAST_STEP ? (
        <p className="text-meta text-ink-mute mt-4 text-center">
          Vos réponses sont enregistrées. Vous pouvez fermer cette page et
          reprendre plus tard.
        </p>
      ) : null}
    </div>
  );
}

/** The bar, and what each segment is called. */
function Progress({ step }: { step: number }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-1.5">
        {ONBOARDING_STEPS.map((s) => (
          <span
            key={s.n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s.n < step ? "bg-violet-deep" : s.n === step ? "bg-violet" : "bg-line",
            )}
          />
        ))}
      </div>
      {/* Every name on a wide screen; the one in hand on a phone, where
          six labels would be six truncations. */}
      <div className="mt-2 hidden md:flex items-center gap-1.5">
        {ONBOARDING_STEPS.map((s) => (
          <span
            key={s.n}
            className={cn(
              "flex-1 text-meta truncate",
              s.n === step ? "text-ink font-semibold" : "text-ink-mute",
            )}
          >
            {s.short}
          </span>
        ))}
      </div>
      <div className="mt-2 md:hidden text-meta text-ink font-semibold">
        {ONBOARDING_STEPS.find((s) => s.n === step)?.name}
      </div>
    </div>
  );
}

/**
 * The weekly grid.
 *
 * Seven rows, and the first one carries the shortcut — a venue that
 * opens at the same hours all week is the normal case, and making it
 * seven identical edits is how a partner decides to do it later and
 * never does.
 */
function HoursGrid({
  hours,
  onChange,
}: {
  hours: OnboardingDay[];
  onChange: (next: OnboardingDay[]) => void;
}) {
  const patch = (weekday: number, day: Partial<OnboardingDay>) =>
    onChange(hours.map((h) => (h.weekday === weekday ? { ...h, ...day } : h)));

  const copyToAll = () => {
    const first = hours[0];
    if (!first) return;
    onChange(
      hours.map((h) => ({
        ...h,
        closed: first.closed,
        opensAt: first.opensAt,
        closesAt: first.closesAt,
      })),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-eyebrow text-ink-mute">Semaine type</span>
        <Button variant="secondary" size="md" onClick={copyToAll}>
          Appliquer lundi à tous les jours
        </Button>
      </div>

      {hours.map((day) => (
        <div
          key={day.weekday}
          className="rounded-[var(--radius-md)] border border-line bg-surface p-4 flex flex-wrap items-center gap-3"
        >
          <div className="w-[104px] shrink-0 text-[15px] font-semibold text-ink">
            {WEEKDAY_LABEL[day.weekday]}
          </div>
          <Switch
            checked={!day.closed}
            onCheckedChange={(open) => patch(day.weekday, { closed: !open })}
            ariaLabel={`${WEEKDAY_LABEL[day.weekday]} ouvert`}
          />
          <span className="text-meta text-ink-mute w-[54px]">
            {day.closed ? "Fermé" : "Ouvert"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <TimeSelect
              value={day.opensAt}
              disabled={day.closed}
              ariaLabel={`Ouverture ${WEEKDAY_LABEL[day.weekday]}`}
              onChange={(next) => patch(day.weekday, { opensAt: next })}
            />
            <span className="text-meta text-ink-mute">à</span>
            <TimeSelect
              value={day.closesAt}
              disabled={day.closed}
              ariaLabel={`Fermeture ${WEEKDAY_LABEL[day.weekday]}`}
              onChange={(next) => patch(day.weekday, { closesAt: next })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** What was answered, in the partner's own words. */
function Summary({
  venueName,
  venueType,
  city,
  address,
  hasCover,
  hours,
}: {
  venueName: string;
  venueType: OnboardingVenueType;
  city: string;
  address: string;
  hasCover: boolean;
  hours: OnboardingDay[];
}) {
  const openDays = useMemo(() => hours.filter((h) => !h.closed), [hours]);
  const rows = [
    { label: "Établissement", value: venueName || "—" },
    { label: "Type", value: ONBOARDING_TYPE_LABEL[venueType] },
    { label: "Ville", value: city || "—" },
    { label: "Adresse", value: address || "—" },
    { label: "Photo", value: hasCover ? "Ajoutée" : "À ajouter plus tard" },
    {
      label: "Ouvert",
      value: openDays.length
        ? `${openDays.length} jour${openDays.length > 1 ? "s" : ""} par semaine, ${openDays[0].opensAt} à ${openDays[0].closesAt}`
        : "Aucun jour ouvert",
    },
  ];

  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas-2 divide-y divide-line-soft">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-4 px-5 py-3.5">
          <span className="text-meta text-ink-mute w-[128px] shrink-0">{row.label}</span>
          <span className="text-[15px] font-semibold text-ink min-w-0">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
