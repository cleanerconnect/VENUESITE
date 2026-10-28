"use client";

// « Créer mon établissement » — the six steps of the venue.
//
// Steps 2 to 6 are the old inscription flow's, unchanged and under the
// same numbers: the establishment, the address, the photos, the
// ambience, the hours. What changed is the step in front of them and
// the ground under them.
//
// In front: « Mode de gestion des réservations ». A partner who is
// going to answer bookings on WhatsApp should be told so before being
// asked for four photographs, and the answer decides what the rest of
// the product does with a reservation — so it is asked first, not
// buried in a settings screen nobody opens.
//
// Under: this flow runs *inside* the dashboard it builds for. The
// partner is already signed in, the chrome is around them, and if they
// stop halfway there is somewhere to come back to — which is the whole
// reason the 27 October split moved it here out of /inscription, where
// stopping halfway meant an account with no way back in.
//
// Every step saves to the draft before it advances, so the furthest
// step reached is a server fact rather than a browser one.

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  AmbienceChips,
  CuisineFields,
  FeatureSwitches,
  PriceBand,
} from "@/components/forms/ListingControls";
import { SAVE_BAR_CARD } from "@/components/forms/SaveBar";
import { PinMap } from "@/components/map/PinMap";
import { cropToSquare } from "@/lib/assets/square";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_MANAGEMENT_MODE,
  MANAGEMENT_MODES,
  MANAGEMENT_MODE_CHOICE,
  ONBOARDING_CITIES,
  ONBOARDING_TYPE_CHOICE,
  VENUE_LAST_STEP,
  VENUE_STEPS,
  defaultHours,
  type ManagementMode,
  type OnboardingDay,
  type OnboardingDraft,
  type OnboardingVenueType,
} from "@/lib/types/onboarding";
import {
  FileDrop,
  HoursGrid,
  Progress,
} from "@/components/onboarding/pieces";
import { SAVE_BAR_SHELL } from "@/components/forms/SaveBar";
import {
  createVenueFromFlow,
  requestDraftUpload,
  saveOnboardingStep,
  type DraftUploadSlot,
} from "@/app/actions/onboarding";


/** One sentence per step. Any more and nobody reads either. */
const HELP: Record<number, string> = {
  1: "Où arrive une réservation. C'est la seule réponse qui change ce que le reste du produit en fait.",
  2: "Le nom que vos clients verront dans l'application, ce que vous servez et à quel prix.",
  3: "Le quartier et l'adresse. L'application les affiche l'un après l'autre, et la carte vous place.",
  4: "Les photos donnent envie de réserver, la carte évite un appel. Vous pouvez passer cette étape.",
  5: "Ce que l'application affiche sous votre fiche. Rien n'est obligatoire ici.",
  6: "Les heures pendant lesquelles vous acceptez des réservations. Modifiables à tout moment.",
};


export function VenueFlow({
  initialDraft,
}: {
  /** Always present: the page makes one before it renders this. */
  initialDraft: OnboardingDraft;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  // The draft carries the furthest step reached, which is where a
  // partner who closed the tab comes back to.
  const [step, setStep] = useState(
    Math.min(VENUE_LAST_STEP, Math.max(1, initialDraft.step)),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(
    null,
  );

  // Step 1 — the one answer with a default, because a default that
  // needs a second integration before a booking can be answered is not
  // a default. See `MANAGEMENT_MODE_CHOICE`.
  const [managementMode, setManagementMode] = useState<ManagementMode>(
    initialDraft.managementMode ?? DEFAULT_MANAGEMENT_MODE,
  );

  // Steps 2 to 5 — seeded from the draft.
  const [venueName, setVenueName] = useState(initialDraft.venueName ?? "");
  const [venueType, setVenueType] = useState<OnboardingVenueType>(
    initialDraft.venueType ?? "restaurant",
  );
  const [cuisine, setCuisine] = useState(initialDraft.cuisine ?? "");
  const [specialties, setSpecialties] = useState(initialDraft.specialties ?? "");
  const [priceRange, setPriceRange] = useState(initialDraft.priceRange ?? 2);
  const [city, setCity] = useState(initialDraft.city ?? "");
  const [district, setDistrict] = useState(initialDraft.district ?? "");
  const [address, setAddress] = useState(initialDraft.address ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialDraft.latitude != null && initialDraft.longitude != null
      ? { lat: initialDraft.latitude, lng: initialDraft.longitude }
      : null,
  );
  const [cover, setCover] = useState<{ name: string; objectKey: string } | null>(
    initialDraft.coverObjectKey
      ? { name: "Photo de couverture", objectKey: initialDraft.coverObjectKey }
      : null,
  );
  const [photo2, setPhoto2] = useState<{ name: string; objectKey: string } | null>(
    initialDraft.photo2ObjectKey
      ? { name: "Deuxième photo", objectKey: initialDraft.photo2ObjectKey }
      : null,
  );
  const [menuFile, setMenuFile] = useState<{ name: string; objectKey: string } | null>(
    initialDraft.menuObjectKey
      ? { name: "Carte", objectKey: initialDraft.menuObjectKey }
      : null,
  );
  const [thumbnail, setThumbnail] = useState<{ name: string; objectKey: string } | null>(
    initialDraft.thumbnailObjectKey
      ? { name: "Vignette", objectKey: initialDraft.thumbnailObjectKey }
      : null,
  );
  const [ambience, setAmbience] = useState<string[]>(initialDraft.ambience ?? []);
  const [features, setFeatures] = useState<string[]>(initialDraft.features ?? []);
  const [hours, setHours] = useState<OnboardingDay[]>(
    initialDraft.hours?.length ? initialDraft.hours : defaultHours(),
  );

  const current = VENUE_STEPS.find((s) => s.n === step) ?? VENUE_STEPS[0];

  const goBack = () => {
    setError(null);
    setFieldError(null);
    setStep((n) => Math.max(1, n - 1));
  };

  /** Saves, then advances. A step that cannot save does not advance. */
  const advance = (patch: Parameters<typeof saveOnboardingStep>[0]) => {
    setError(null);
    start(async () => {
      // The draft's id travels with every write: this flow is behind a
      // session, so the server checks the id against it rather than
      // trusting a cookie — and a page's render cannot set one anyway.
      const result = await saveOnboardingStep(
        { ...patch, step: Math.min(VENUE_LAST_STEP, step + 1) },
        draft.id,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDraft(result.draft);
      setStep((n) => Math.min(VENUE_LAST_STEP, n + 1));
    });
  };

  /**
   * The last step's button: save the hours, then create the venue.
   *
   * One press rather than two. The old flow had a « C'est prêt » recap
   * between them, reading six answers back before anything was
   * created; the answers are each one step behind the partner and they
   * have been saved as they went, so the recap was a screen whose only
   * content was a second copy of what they had just typed.
   */
  const finish = () => {
    setError(null);
    start(async () => {
      const saved = await saveOnboardingStep({ hours }, draft.id);
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      setDraft(saved.draft);
      const result = await createVenueFromFlow(draft.id);
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
    thumbnail: {
      patch: (key, file) => ({
        thumbnailObjectKey: key,
        thumbnailContentType: file.type,
        thumbnailSizeBytes: file.size,
      }),
      set: setThumbnail,
    },
  };

  const upload = (slot: DraftUploadSlot, picked: File) => {
    setError(null);
    start(async () => {
      // The vignette is square before it leaves the browser, so what
      // the partner is shown here is what the app's list tile will
      // hold. Everything else goes up as chosen.
      let file = picked;
      if (slot === "thumbnail") {
        try {
          file = await cropToSquare(picked);
        } catch {
          setError("Ce fichier n'a pas pu être lu comme une image.");
          return;
        }
      }
      const ticket = await requestDraftUpload(
        {
          slot,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        },
        draft.id,
      );
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
      {/* No wordmark. /inscription draws one because it is a page
          outside the portal; this flow runs inside the dashboard, and
          the chrome above it already carries the brand. A second one
          here is 40px of a phone screen spent twice on the same word. */}
      <div className="flex items-center justify-between">
        <h1 className="text-h2 text-ink">Créer mon établissement</h1>
        <span className="text-meta text-ink-mute shrink-0 ml-3">
          Étape {step} sur {VENUE_LAST_STEP}
        </span>
      </div>

      <Progress step={step} steps={VENUE_STEPS} />

      <Card
        variant="surface"
        size="lg"
        className="mt-4 md:mt-5 max-md:p-4 md:p-6"
      >
        <h2 className="text-h3 text-ink">{current.name}</h2>
        <p className="text-body text-ink-soft mt-2">{HELP[step]}</p>

        <div className="mt-4 md:mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2.5 md:gap-4"
            >
              {step === 1 ? (
                // Radio cards, not a select.
                //
                // Three answers that each do something different to a
                // booking, and a select would hide two of them behind a
                // tap while showing none of the three sentences that
                // make the choice answerable. One card per answer, the
                // sentence inside the card, and the whole row readable
                // before anything is pressed.
                //
                // `role="radiogroup"` and `aria-checked` rather than
                // real inputs: the hit target is the card, and a
                // 14px circle inside a 96px box is the one place a
                // pointer must not have to be accurate.
                <div
                  role="radiogroup"
                  aria-label="Mode de gestion des réservations"
                  className="flex flex-col gap-3"
                >
                  {MANAGEMENT_MODES.map((mode) => {
                    const chosen = managementMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        onClick={() => setManagementMode(mode)}
                        className={cn(
                          "flex items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left transition-colors",
                          chosen
                            ? "border-ink bg-violet-soft"
                            : "border-line bg-surface hover:border-ink/40",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                            chosen ? "border-ink" : "border-line",
                          )}
                        >
                          {chosen ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-body font-semibold text-ink">
                            {MANAGEMENT_MODE_CHOICE[mode].label}
                          </span>
                          <span className="block text-meta text-ink-soft mt-1">
                            {MANAGEMENT_MODE_CHOICE[mode].line}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Two columns from `md` up.
                  One column at 1440 put « Continuer » 113px under the
                  fold — the action of the step, below the window, on
                  the width the whole handoff is drawn at. The five
                  blocks are not equal, so the pairing is by meaning
                  rather than by order: the name beside the city, the
                  kitchen beside the sentence about it, and the two that
                  are already rows of their own — the type pair and the
                  price band — spanning both columns. */}
              {step === 2 ? (
                <div className="contents md:grid md:grid-cols-2 md:gap-4">
                  <Input
                    label="Nom de l'établissement"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    autoComplete="organization"
                  />
                  <div className="md:col-span-2">
                    <div className="text-field-label mb-2">
                      C&apos;est plutôt
                    </div>
                    {/* Two answers, one of them true: a radio group, as
                        the management mode above it is. It was two bare
                        buttons whose chosen state was a background
                        colour and nothing else — so a screen reader was
                        told neither that the pair was one question nor
                        which half was answered, and the chooser's
                        `?type=` hint could not be read back at all. */}
                    <div
                      role="radiogroup"
                      aria-label="C'est plutôt"
                      className="grid grid-cols-2 gap-3"
                    >
                      {(
                        [
                          { value: "restaurant", label: ONBOARDING_TYPE_CHOICE.restaurant },
                          { value: "bar", label: ONBOARDING_TYPE_CHOICE.bar },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={venueType === option.value}
                          onClick={() => setVenueType(option.value)}
                          className={cn(
                            "h-12 md:h-14 rounded-[var(--radius-md)] border text-body font-semibold transition-colors",
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
                  {/* The app's own filter row, and a line of your own
                      under it. It was one free-text field here too, on
                      the reasoning that a kitchen is a sentence — true,
                      and it left a brand-new venue behind none of the
                      ten taps a guest actually searches with. The
                      sentence is the second field now. */}
                  <div className="md:col-span-2">
                    <CuisineFields
                      cuisine={cuisine}
                      specialties={specialties}
                      onCuisine={setCuisine}
                      onSpecialties={setSpecialties}
                      bar={venueType === "bar"}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-field-label mb-1">
                      Fourchette de prix
                    </div>
                    <p className="text-meta text-ink-mute mb-2">
                      Par personne, et les filtres de recherche s&apos;en servent.
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
                </div>
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
                // Two columns from 640: four drop zones stacked put
                // « Continuer » at 1115px, and a phone screen is 844.
                // At 390 they stay in one column — a drop zone 170px
                // wide with a sentence under it is two columns of
                // nothing — so this step is the one that still asks a
                // small phone to scroll, and `inscription.mjs` says so
                // by name rather than letting it pass unmeasured.
                <div className="grid gap-4 sm:grid-cols-2">
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
                  {/* The square tile the app draws in its lists. A
                      carousel photo is 16:9, so without this the tile
                      was a centre crop of a wide picture chosen for a
                      different shape — a logo in it lost its own
                      edges. Cropped 1:1 here, before it is sent. */}
                  <FileDrop
                    title="Vignette"
                    hint="Facultative. Votre logo ou une photo carrée : elle est recadrée au centre, en carré, avant l'envoi."
                    accept="image/png,image/jpeg,image/webp"
                    chosen={thumbnail}
                    onFile={(file) => upload("thumbnail", file)}
                  />
                  {/* A PDF, and only a PDF.
                      Ma fiche stopped accepting photographs of the
                      pages at the LYFE review — the typed list is the
                      carte, and a photograph of it was a second,
                      unsearchable copy — and this step was still
                      offering what the screen behind it refuses. One
                      answer per question, in both places. */}
                  <FileDrop
                    title="Votre carte"
                    hint="PDF, 20 Mo au maximum. Elle s'ouvre depuis votre fiche."
                    accept="application/pdf"
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
              {/* Side by side from `md` up, for the same reason as step 2:
                  stacked, the two lists put « Continuer » 179px under a
                  900px window. They are two independent multiple
                  choices, so nothing is lost by reading them across
                  instead of down. */}
              {step === 5 ? (
                <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8">
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

            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      {/* « Continuer » is pinned, not placed.

          The rule the seven steps are held to is that the action the
          step exists for is in the first viewport, and two of them
          cannot keep it by growing shorter: step 4 offers four drop
          zones and step 6 seven days of opening hours, and both are as
          short as the thing they ask for. Shaving them got étape 2 from
          1035 to 915 and étape 5 from 1079 to 992 against a 900px
          window, and no further.

          So the button leaves the scroll box instead. It is the pattern
          Ma fiche and Disponibilités already use for the same problem —
          a form taller than the window whose one commit button must
          stay reachable — and `SAVE_BAR_CARD` is literally theirs, so
          the bar cannot drift from them.

          It had to come out of the `<Card>` to work at all: the card is
          `relative overflow-hidden`, which makes it the sticky box and
          would have pinned the bar to the bottom of the card rather
          than the bottom of the screen.

          The error moves with it. It is the answer to pressing the
          button, so it belongs where the button is; left behind at the
          bottom of the card it would have been announced to a screen
          reader and invisible to everybody else. */}
      {/* `SAVE_BAR_SHELL`, not the onboarding one: this flow is inside
          the dashboard, so a phone has the tab bar under it and a bar
          at `bottom-0` would sit beneath the navigation. `/inscription`
          has no tab bar, which is the one value the two shells
          differ on. */}
      <div className={SAVE_BAR_SHELL}>
        {error ? (
          <p
            className="pointer-events-auto mb-2 rounded-[var(--radius-md)] border border-danger bg-surface px-4 py-2 text-meta text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className={SAVE_BAR_CARD}>
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
            <Button
              size="lg"
              onClick={() => advance({ managementMode })}
              disabled={pending}
            >
              Continuer
            </Button>
          ) : null}
          {step === 2 ? (
            <Button
              size="lg"
              onClick={() =>
                advance({ venueName, venueType, cuisine, specialties, priceRange, city })
              }
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
            <Button
              size="lg"
              iconRight={<ArrowRight size={16} />}
              onClick={finish}
              disabled={pending}
            >
              Créer mon établissement
            </Button>
          ) : null}
        </div>
      </div>

      {step < VENUE_LAST_STEP ? (
        <p className="text-meta text-ink-mute mt-4 text-center">
          Vos réponses sont enregistrées. Vous pouvez fermer cette page et
          reprendre plus tard.
        </p>
      ) : null}
    </div>
  );
}
