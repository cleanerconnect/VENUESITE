"use client";

// The seven steps.
//
// One question group per step, because a partner filling this in on a
// phone between two services abandons a form that asks fourteen things
// at once. Every step but the first saves to the draft before it
// advances, so the furthest step reached is a server fact rather than a
// browser one.
//
// What is mandatory: a name, an e-mail, a phone number and a password
// typed twice to have an account — the five details `Détail Sprint `
// row 39 names — then the establishment's name, its type, its city and
// its address, because the app cannot list a place it cannot find.
// Nothing else: the map pin, the photos, the ambience and the hours all
// have an answer already, and steps 4 and 5 say out loud that they can
// be skipped.
//
// Steps 2 to 5 now also collect what the app's restaurant and bar
// detail screens actually draw — the cuisine and the price band beside
// the name, the quarter with the address, a second photo and the carte,
// and the ambience and equipment lists. They were asked for nowhere,
// so a partner finished the flow and their listing opened with a blank
// « Cuisine & Détails » block and six empty equipment rows.

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, FileText, ImagePlus } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";
import {
  AmbienceChips,
  FeatureSwitches,
  PriceBand,
} from "@/components/forms/ListingControls";
import { PinMap } from "@/components/map/PinMap";
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
  requestDraftUpload,
  saveOnboardingStep,
  signUpPartner,
  type DraftUploadSlot,
} from "@/app/actions/onboarding";
import {
  PRICE_RANGE_LABEL,
  VENUE_AMBIENCE,
  VENUE_FEATURE,
  type VenueFeature,
} from "@/lib/types/restaurant";

/** One sentence per step. Any more and nobody reads either. */
const HELP: Record<number, string> = {
  1: "Vos coordonnées, pour que nous sachions à qui écrire. Rien n'est public.",
  2: "Le nom que vos clients verront dans l'application, ce que vous servez et à quel prix.",
  3: "Le quartier et l'adresse. L'application les affiche l'un après l'autre, et la carte vous place.",
  4: "Les photos donnent envie de réserver, la carte évite un appel. Vous pouvez passer cette étape.",
  5: "Ce que l'application affiche sous votre fiche. Rien n'est obligatoire ici.",
  6: "Les heures pendant lesquelles vous acceptez des réservations. Modifiables à tout moment.",
  7: "Vérifiez, puis ouvrez votre tableau de bord.",
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
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Steps 2 to 5 — seeded from the draft when there is one.
  const [venueName, setVenueName] = useState(initialDraft?.venueName ?? "");
  const [venueType, setVenueType] = useState<OnboardingVenueType>(
    initialDraft?.venueType ?? "restaurant",
  );
  const [cuisine, setCuisine] = useState(initialDraft?.cuisine ?? "");
  const [priceRange, setPriceRange] = useState(initialDraft?.priceRange ?? 2);
  const [city, setCity] = useState(initialDraft?.city ?? "");
  const [district, setDistrict] = useState(initialDraft?.district ?? "");
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
  const [photo2, setPhoto2] = useState<{ name: string; objectKey: string } | null>(
    initialDraft?.photo2ObjectKey
      ? { name: "Deuxième photo", objectKey: initialDraft.photo2ObjectKey }
      : null,
  );
  const [menuFile, setMenuFile] = useState<{ name: string; objectKey: string } | null>(
    initialDraft?.menuObjectKey
      ? { name: "Carte", objectKey: initialDraft.menuObjectKey }
      : null,
  );
  const [ambience, setAmbience] = useState<string[]>(initialDraft?.ambience ?? []);
  const [features, setFeatures] = useState<string[]>(initialDraft?.features ?? []);
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

  /**
   * One upload path for the three files step 4 can take.
   *
   * Ticket, PUT, then the draft. The draft is written last on purpose:
   * a key recorded against bytes that never landed is a broken image on
   * the listing, and a file in storage that no row points at is only
   * wasted space.
   */
  const SLOTS: Record<
    DraftUploadSlot,
    { patch: (key: string, file: File) => Parameters<typeof saveOnboardingStep>[0];
      set: (v: { name: string; objectKey: string } | null) => void }
  > = {
    cover: {
      patch: (key, file) => ({
        coverObjectKey: key,
        coverContentType: file.type,
        coverSizeBytes: file.size,
      }),
      set: setCover,
    },
    photo2: {
      patch: (key, file) => ({
        photo2ObjectKey: key,
        photo2ContentType: file.type,
        photo2SizeBytes: file.size,
      }),
      set: setPhoto2,
    },
    menu: {
      patch: (key, file) => ({
        menuObjectKey: key,
        menuContentType: file.type,
        menuSizeBytes: file.size,
      }),
      set: setMenuFile,
    },
  };

  const upload = (slot: DraftUploadSlot, file: File) => {
    setError(null);
    start(async () => {
      const ticket = await requestDraftUpload({
        slot,
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
      const saved = await saveOnboardingStep(SLOTS[slot].patch(ticket.objectKey, file));
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      setDraft(saved.draft);
      SLOTS[slot].set({ name: file.name, objectKey: ticket.objectKey });
    });
  };

  const fieldMessage = (name: string) =>
    fieldError?.field === name ? fieldError.message : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Brand size="lg" />
        <span className="text-meta text-ink-mute">
          Étape {step} sur {ONBOARDING_LAST_STEP}
        </span>
      </div>

      <Progress step={step} />

      <Card variant="surface" size="lg" className="mt-6">
        <h1 className="text-h2 text-ink">{current.name}</h1>
        <p className="text-body text-ink-soft mt-2">{HELP[step]}</p>

        <div className="mt-8">
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
                  {/* Asked for, not optional. `Détail Sprint `, row 39,
                      SP-Prio 02 names « Nom complet, email, téléphone,
                      Mot de passe et confirmation de mot de passe »
                      among the personal details the account is created
                      from, and the same row sends the verification code
                      « à mon mail ou à mon whatsapp » — which needs a
                      number. Prio 02 also buys « Réservation via
                      whatsapp ». */}
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={fieldMessage("phone")}
                    hint="Sur WhatsApp de préférence : c'est là que partent les alertes."
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
                  <Input
                    label="Confirmation du mot de passe"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    error={fieldMessage("passwordConfirm")}
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
                    <div className="text-field-label mb-2">
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
                            "h-14 rounded-[var(--radius-md)] border text-body font-semibold transition-colors",
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
                  {/* « Type de cuisine » on the app's detail screen,
                      and the line under the venue's name. Free text
                      because a kitchen is a sentence — the app prints
                      « Cuisine japonaise traditionnelle moderne &
                      omakase » verbatim — and an enum of forty cuisines
                      would still be missing this one. */}
                  <Input
                    label="Type de cuisine"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    hint={
                      venueType === "bar"
                        ? "Ex. Cocktails d'auteur et petite restauration"
                        : "Ex. Cuisine marocaine contemporaine, tajines et pastilla"
                    }
                  />
                  <div>
                    <div className="text-field-label mb-1">
                      Fourchette de prix
                    </div>
                    <p className="text-meta text-ink-mute mb-3">
                      Ce qu&apos;un client dépense chez vous, par personne. Utilisée
                      par les filtres de recherche.
                    </p>
                    <PriceBand value={priceRange} onChange={setPriceRange} />
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
                  {/* Before the address, because that is the order the
                      app prints them in: its header reads « El cenador,
                      Casablanca » — quartier, then ville — and in
                      Morocco the quarter is how an address is actually
                      given. */}
                  <Input
                    label="Quartier"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    hint={city ? `Ex. Gauthier, Médina, Guéliz — le quartier de ${city}.` : "Le quartier, tel qu'on le dit sur place."}
                  />
                  <Input
                    label="Adresse"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                  {/* The map is OpenStreetMap through Leaflet: no key, no
                      account, and the geocoder is Nominatim behind our
                      own route. The pin is draggable because a geocoder
                      is right about the street and wrong about which
                      side of the courtyard the door is on. */}
                  <PinMap
                    latitude={pin?.lat ?? null}
                    longitude={pin?.lng ?? null}
                    address={address}
                    city={city}
                    height={240}
                    onChange={(latitude, longitude) =>
                      setPin(
                        latitude == null || longitude == null
                          ? null
                          : { lat: latitude, lng: longitude },
                      )
                    }
                  />
                </>
              ) : null}

              {step === 4 ? (
                <div className="flex flex-col gap-4">
                  {/* Two photos and the carte, in the order the app
                      uses them: the first photo is the cover on every
                      list card and the header of the detail screen, the
                      second is what turns that header into a carousel,
                      and the carte is behind the « Menu » pill. All
                      three optional — the step says so, and the button
                      row lets a partner walk past it. */}
                  <FileDrop
                    title="Photo de couverture"
                    hint="JPEG, PNG ou WebP. 8 Mo au maximum."
                    accept="image/jpeg,image/png,image/webp"
                    chosen={cover}
                    onFile={(file) => upload("cover", file)}
                    primary
                  />
                  <FileDrop
                    title="Deuxième photo"
                    hint="Facultative. C'est elle qui fait défiler la fiche dans l'application."
                    accept="image/jpeg,image/png,image/webp"
                    chosen={photo2}
                    onFile={(file) => upload("photo2", file)}
                  />
                  <FileDrop
                    title="Votre carte"
                    hint="PDF ou photo. 20 Mo au maximum. Elle s'ouvre depuis votre fiche."
                    accept="application/pdf,image/jpeg,image/png"
                    icon="document"
                    chosen={menuFile}
                    onFile={(file) => upload("menu", file)}
                  />
                </div>
              ) : null}

              {/* Step 5 · what the app draws under « Cuisine & Détails »
                  and « Equipements ». Skippable, and visibly so: a place
                  that has not decided whether it is « intimiste » should
                  not be stopped from opening its dashboard over it. */}
              {step === 5 ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <div className="text-body font-semibold text-ink mb-1">Ambiance</div>
                    <p className="text-meta text-ink-mute mb-3">
                      Comment la salle se ressent. L&apos;application en affiche
                      trois, sur une ligne.
                    </p>
                    <AmbienceChips value={ambience} onChange={setAmbience} />
                  </div>
                  <div>
                    <div className="text-body font-semibold text-ink mb-1">Équipements</div>
                    <p className="text-meta text-ink-mute mb-3">
                      Listés dans l&apos;application, un par ligne, avec une
                      icône. Ce sont les questions qu&apos;on vous pose au
                      téléphone.
                    </p>
                    <FeatureSwitches value={features} onChange={setFeatures} />
                  </div>
                </div>
              ) : null}

              {step === 6 ? <HoursGrid hours={hours} onChange={setHours} /> : null}

              {step === 7 ? (
                <Summary
                  venueName={venueName}
                  venueType={venueType}
                  cuisine={cuisine}
                  priceRange={priceRange}
                  district={district}
                  city={city}
                  address={address}
                  photoCount={[cover, photo2].filter(Boolean).length}
                  hasMenu={Boolean(menuFile)}
                  ambience={ambience}
                  features={features}
                  hours={hours}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {error ? (
          <p className="text-meta text-danger mt-4" role="alert">
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
              onClick={() => advance({ venueName, venueType, cuisine, priceRange, city })}
              disabled={pending || !venueName.trim() || !city.trim()}
            >
              Continuer
            </Button>
          ) : null}
          {step === 3 ? (
            <Button
              size="lg"
              onClick={() =>
                advance({
                  district,
                  address,
                  latitude: pin?.lat ?? null,
                  longitude: pin?.lng ?? null,
                })
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
            <>
              <Button
                size="lg"
                onClick={() => advance({ ambience, features })}
                disabled={pending}
              >
                Continuer
              </Button>
              {/* Skipping writes nothing: an empty ambience list is the
                  honest record of a question nobody answered, and a
                  default the partner never chose would show up on their
                  listing as a fact about their room. */}
              <Button variant="ghost" size="md" onClick={() => advance({})} disabled={pending}>
                Passer cette étape
              </Button>
            </>
          ) : null}
          {step === 6 ? (
            <Button size="lg" onClick={() => advance({ hours })} disabled={pending}>
              Continuer
            </Button>
          ) : null}
          {step === 7 ? (
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
      <div className="flex items-center gap-2">
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
      <div className="mt-2 hidden md:flex items-center gap-2">
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
 * One file, chosen or not.
 *
 * The same panel three times on step 4, because the three files differ
 * only in what they accept and what they are called — drawing a bespoke
 * box for each would be three chances for them to drift. `primary` is
 * the cover: the one file worth a full-height button, since a listing
 * with no photo at all is the one that does not get booked.
 */
function FileDrop({
  title,
  hint,
  accept,
  chosen,
  onFile,
  primary,
  icon = "image",
}: {
  title: string;
  hint: string;
  accept: string;
  chosen: { name: string; objectKey: string } | null;
  onFile: (file: File) => void;
  primary?: boolean;
  icon?: "image" | "document";
}) {
  const Icon = icon === "document" ? FileText : ImagePlus;
  const picker = (label: string, className: string) => (
    <label className="inline-flex mt-4">
      <span className="sr-only">{`${label} — ${title}`}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <span className={className}>{label}</span>
    </label>
  );

  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas-2 p-6 text-center">
      {chosen ? (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-success-soft flex items-center justify-center">
            <Check size={22} className="text-success" strokeWidth={2.2} />
          </div>
          <div className="text-body font-semibold text-ink mt-3">{title}</div>
          <p className="text-meta text-ink-mute mt-1 truncate">{chosen.name}</p>
          {picker(
            "Remplacer",
            "h-11 px-4 inline-flex items-center rounded-[var(--radius-sm)] border border-line bg-surface text-body font-semibold text-ink cursor-pointer hover:border-ink transition-colors",
          )}
        </>
      ) : (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-soft flex items-center justify-center">
            <Icon size={22} className="text-violet-deep" />
          </div>
          <div className="text-body font-semibold text-ink mt-3">{title}</div>
          <p className="text-meta text-ink-mute mt-1">{hint}</p>
          {picker(
            primary ? "Choisir une photo" : "Choisir un fichier",
            primary
              ? "h-14 px-6 inline-flex items-center rounded-[var(--radius-md)] bg-ink text-canvas text-body font-semibold cursor-pointer hover:bg-ink-soft transition-colors"
              : "h-11 px-4 inline-flex items-center rounded-[var(--radius-sm)] border border-line bg-surface text-body font-semibold text-ink cursor-pointer hover:border-ink transition-colors",
          )}
        </>
      )}
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
        <span className="text-field-label">Semaine type</span>
        <Button variant="secondary" size="md" onClick={copyToAll}>
          Appliquer lundi à tous les jours
        </Button>
      </div>

      {hours.map((day) => (
        <div
          key={day.weekday}
          className="rounded-[var(--radius-md)] border border-line bg-surface p-4 flex flex-wrap items-center gap-3"
        >
          <div className="w-[104px] shrink-0 text-body font-semibold text-ink">
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
  cuisine,
  priceRange,
  district,
  city,
  address,
  photoCount,
  hasMenu,
  ambience,
  features,
  hours,
}: {
  venueName: string;
  venueType: OnboardingVenueType;
  cuisine: string;
  priceRange: number;
  district: string;
  city: string;
  address: string;
  photoCount: number;
  hasMenu: boolean;
  ambience: string[];
  features: string[];
  hours: OnboardingDay[];
}) {
  const openDays = useMemo(() => hours.filter((h) => !h.closed), [hours]);
  const names = (ids: string[], labels: Record<string, string>) =>
    ids.map((id) => labels[id] ?? id).join(", ");
  const rows = [
    { label: "Établissement", value: venueName || "—" },
    { label: "Type", value: ONBOARDING_TYPE_LABEL[venueType] },
    { label: "Cuisine", value: cuisine || "À compléter plus tard" },
    { label: "Prix", value: PRICE_RANGE_LABEL[priceRange] ?? "—" },
    { label: "Quartier", value: district || "—" },
    { label: "Ville", value: city || "—" },
    { label: "Adresse", value: address || "—" },
    {
      label: "Photos",
      value:
        photoCount === 0
          ? "À ajouter plus tard"
          : `${photoCount} photo${photoCount > 1 ? "s" : ""}`,
    },
    { label: "Carte", value: hasMenu ? "Ajoutée" : "À ajouter plus tard" },
    {
      label: "Ambiance",
      value: ambience.length ? names(ambience, VENUE_AMBIENCE) : "Non renseignée",
    },
    {
      label: "Équipements",
      value: features.length
        ? names(features, VENUE_FEATURE as Record<VenueFeature, string>)
        : "Non renseignés",
    },
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
        <div key={row.label} className="flex items-baseline gap-4 px-4 py-3">
          <span className="text-meta text-ink-mute w-[128px] shrink-0">{row.label}</span>
          <span className="text-body font-semibold text-ink min-w-0">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
