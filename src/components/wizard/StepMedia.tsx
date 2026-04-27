"use client";

import { Plus, Sparkles, Wand2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Dialog } from "@/components/ui/Dialog";
import type { DraftEvent } from "@/lib/types/domain";

const SUGGESTED_DESCRIPTIONS = [
  "Une nuit afrobeats sur le rooftop. Line-up local et international, vue sur la Corniche, énergie qui dure jusqu'au lever du soleil. Tenue smart casual, ambiance festive et bienveillante. Capacity limited — nos éditions affichent complet à chaque fois. Réservez tôt pour l'Early Bird, profitez du Lounge VIP pour une expérience plus intime avec service à table et entrée prioritaire au cœur du dancefloor.",
  "Soirée signature au Rooftop Mansour. Trois sets enchaînés, des artistes triés sur le volet, et une mise en scène pensée pour le coucher de soleil sur Casablanca. La piste est ouverte dès 22h, avec un cocktail bar travaillé et une cuisine légère disponible toute la nuit. Tarif Early Bird limité aux 80 premiers billets — au-delà, passage en tarif General. VIP Lounge inclut champagne et accès porte sans file.",
  "Nuit afro-électronique dans un cadre intimiste. Trois heures de DJ set live mixé avec des invités surprises, dans l'ambiance feutrée du rooftop. Cocktail signature offert pour les détenteurs de billet VIP. Dress code soigné, line-up confidentiel jusqu'à la veille. Cette édition est la dernière avant la pause estivale — capacity limitée à 320 personnes pour préserver l'expérience que nos habitués connaissent et reviennent chercher chaque mois.",
];

export function StepMedia({
  draft,
  setDraft,
}: {
  draft: DraftEvent;
  setDraft: (next: DraftEvent) => void;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [pickedAi, setPickedAi] = useState<number | null>(null);

  const set = <K extends keyof DraftEvent>(k: K, v: DraftEvent[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="text-eyebrow text-ink-mute mb-2">Étape 4 sur 5</div>
        <h2 className="text-h1 text-ink">Identité visuelle.</h2>
        <p className="text-body text-ink-soft mt-2 max-w-xl leading-relaxed">
          Photo de couverture, galerie, line-up et partenaires — ce qui
          apparaîtra sur la page publique de l'événement.
        </p>
      </header>

      {/* Cover */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="p-6 pb-3">
          <div className="text-eyebrow text-ink-soft">
            Photo de couverture · 1080 × 1350 recommandé
          </div>
        </div>
        <div className="px-6 pb-6">
          <label className="block border-2 border-dashed border-line rounded-[var(--radius-md)] aspect-[4/5] max-w-xs hover:border-ink transition-colors cursor-pointer overflow-hidden">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) =>
                set("coverName", e.target.files?.[0]?.name ?? null)
              }
            />
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-canvas-2/40">
              {draft.coverName ? (
                <>
                  <Sparkles
                    size={20}
                    strokeWidth={1.8}
                    className="text-gold-deep mb-2"
                  />
                  <span className="text-[14px] font-semibold text-ink truncate max-w-full">
                    {draft.coverName}
                  </span>
                  <span className="text-meta text-ink-mute mt-1.5">
                    Cliquer pour remplacer
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="text-h3 text-ink"
                    style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
                  >
                    Glissez une photo ici
                  </span>
                  <span className="text-meta text-ink-mute mt-1.5">
                    ou cliquez pour choisir un fichier
                  </span>
                </>
              )}
            </div>
          </label>
        </div>
      </Card>

      {/* Task generator — violet-soft surface + outlined-violet ghost button.
          Same intelligence as the inline nudges and the global assistant,
          three different surfaces; voice and visual treatment match. */}
      <Card variant="violet-soft" size="md">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="h-9 w-9 rounded-[12px] bg-surface/70 flex items-center justify-center shrink-0"
          >
            <Wand2 size={16} strokeWidth={1.8} className="text-violet-deep" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-eyebrow text-violet-deep">Suggestion</div>
            <div className="text-[14px] text-ink mt-2 leading-relaxed">
              Vous bloquez sur la description ? On peut générer trois
              variantes adaptées à votre type d'événement.
            </div>
            <div className="mt-3">
              <button
                onClick={() => setAiOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 text-[13px] font-semibold border border-violet text-violet-deep rounded-[var(--radius-sm)] hover:bg-violet hover:text-canvas transition-colors"
              >
                <Wand2 size={14} strokeWidth={1.8} />
                Générer des variantes
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Gallery */}
      <Card variant="surface" size="md">
        <div className="text-eyebrow text-ink-soft mb-4">
          Galerie · jusqu'à 6 photos additionnelles
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const name = draft.galleryNames[i];
            return (
              <label
                key={i}
                className="aspect-square border-2 border-dashed border-line rounded-[var(--radius-sm)] bg-canvas-2/40 hover:border-ink transition-colors cursor-pointer flex items-center justify-center text-meta text-ink-mute text-center px-1"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const next = [...draft.galleryNames];
                    next[i] = e.target.files?.[0]?.name ?? "";
                    set("galleryNames", next.filter(Boolean));
                  }}
                />
                {name ? (
                  <span className="text-ink truncate font-semibold">
                    {name}
                  </span>
                ) : (
                  <Plus size={14} strokeWidth={1.8} />
                )}
              </label>
            );
          })}
        </div>
      </Card>

      {/* Lineup */}
      <Card variant="surface" size="md">
        <div className="flex items-center justify-between mb-4">
          <div className="text-eyebrow text-ink-soft">
            Programmation · artistes
          </div>
          <button
            onClick={() =>
              set("artists", [
                ...draft.artists,
                {
                  id: `a_${Math.random().toString(36).slice(2, 6)}`,
                  name: "",
                  role: "",
                },
              ])
            }
            className="text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors flex items-center gap-1"
          >
            <Plus size={14} strokeWidth={2} />
            Ajouter
          </button>
        </div>
        {draft.artists.length === 0 ? (
          <p className="text-meta text-ink-mute">
            Aucun artiste pour l'instant.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {draft.artists.map((a, i) => (
              <div
                key={a.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
              >
                <Input
                  label="Nom"
                  value={a.name}
                  onChange={(e) => {
                    const next = [...draft.artists];
                    next[i] = { ...a, name: e.target.value };
                    set("artists", next);
                  }}
                />
                <Input
                  label="Rôle"
                  value={a.role}
                  onChange={(e) => {
                    const next = [...draft.artists];
                    next[i] = { ...a, role: e.target.value };
                    set("artists", next);
                  }}
                />
                <button
                  onClick={() =>
                    set(
                      "artists",
                      draft.artists.filter((_, idx) => idx !== i),
                    )
                  }
                  className="h-12 w-12 flex items-center justify-center text-ink-mute hover:text-danger transition-colors"
                  aria-label="Supprimer"
                >
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI generator dialog */}
      <Dialog
        open={aiOpen}
        onOpenChange={(o) => {
          setAiOpen(o);
          if (!o) setPickedAi(null);
        }}
        title="Variantes de description"
        description="Cliquez pour copier dans le champ description."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAiOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={pickedAi === null}
              onClick={() => {
                if (pickedAi !== null) {
                  set("description", SUGGESTED_DESCRIPTIONS[pickedAi]);
                }
                setAiOpen(false);
                setPickedAi(null);
              }}
            >
              Utiliser cette variante
            </Button>
          </>
        }
      >
        <AnimatePresence>
          <div className="flex flex-col gap-3">
            {SUGGESTED_DESCRIPTIONS.map((desc, i) => (
              <motion.button
                key={i}
                onClick={() => setPickedAi(i)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.22 }}
                className={`text-left p-4 rounded-[var(--radius-sm)] border transition-all ${
                  pickedAi === i
                    ? "border-violet bg-violet-soft"
                    : "border-line hover:border-ink"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-eyebrow text-ink-mute">
                    Variante {i + 1}
                  </span>
                  {pickedAi === i ? (
                    <span className="text-eyebrow text-violet-deep">
                      Sélectionnée
                    </span>
                  ) : null}
                </div>
                <p className="text-[13px] text-ink leading-relaxed">{desc}</p>
              </motion.button>
            ))}
          </div>
        </AnimatePresence>
      </Dialog>
    </div>
  );
}
