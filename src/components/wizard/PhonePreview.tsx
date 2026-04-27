"use client";

import { motion } from "motion/react";
import type { DraftEvent } from "@/lib/types/domain";
import { computeCustomerPrice, formatMAD } from "@/lib/utils/format";

const VENUE_NAMES: Record<string, string> = {
  v_mansour: "Rooftop Mansour",
  v_theatre_m6: "Théâtre Mohammed VI",
  v_scene_casa: "La Scène Casa",
  v_jardin: "Le Jardin Sonore",
};

const VENUE_CITIES: Record<string, string> = {
  v_mansour: "Casablanca",
  v_theatre_m6: "Casablanca",
  v_scene_casa: "Casablanca",
  v_jardin: "Marrakech",
};

const CATEGORY_LABEL: Record<string, string> = {
  concert: "Concert",
  club_night: "Soirée",
  festival: "Festival",
  workshop: "Atelier",
  comedy: "Comédie",
  sports: "Sport",
  other: "Événement",
};

// Live phone-frame mockup of the public event page. Updates as the draft
// changes. Sticky on desktop so it stays visible while the user scrolls
// the recap on the left.
export function PhonePreview({ draft }: { draft: DraftEvent }) {
  const venue = VENUE_NAMES[draft.venueId] ?? "Lieu";
  const city = VENUE_CITIES[draft.venueId] ?? "";
  const lowestTier = draft.tiers
    .filter((t) => t.faceValueMad > 0)
    .sort((a, b) => a.faceValueMad - b.faceValueMad)[0];

  return (
    <div className="lg:sticky lg:top-[180px]">
      <div className="text-eyebrow text-ink-mute text-center mb-3">
        Aperçu live · LYFE.ma
      </div>
      <motion.div
        layout
        className="mx-auto bg-ink rounded-[44px] p-3 shadow-deep"
        style={{ width: 320, height: 656 }}
      >
        <div className="relative h-full w-full bg-canvas rounded-[34px] overflow-hidden flex flex-col">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 h-6 w-28 bg-ink rounded-b-2xl" />

          {/* Cover */}
          <div className="relative h-[200px] shrink-0 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, #0A1F3D 0%, #2C3E5C 60%, #C9A64C 130%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 70% 30%, rgba(201,166,76,0.5), transparent 60%)",
              }}
            />
            <div className="absolute top-12 left-4 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-canvas/15 backdrop-blur-sm">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-canvas">
                LYFE
              </span>
              <span className="text-[9px] text-canvas/80">·</span>
              <span className="text-[9px] font-bold text-canvas">
                {city || "—"}
              </span>
            </div>
          </div>

          {/* Body */}
          <motion.div layout className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold-deep">
              {CATEGORY_LABEL[draft.category] ?? "Événement"}
            </div>
            <h1
              className="mt-1.5 text-ink leading-tight"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: "-0.02em",
              }}
            >
              {draft.name || "Nom de votre événement"}
            </h1>
            <div className="text-meta text-ink-mute mt-1.5 num">
              {draft.startDate
                ? `${formatPreviewDate(draft.startDate)} · ${draft.startTime || "—"}`
                : "Date à définir"}
            </div>
            <div className="text-meta text-ink-mute num">
              {venue}
              {city ? `, ${city}` : ""}
            </div>

            {draft.description ? (
              <p className="text-[12px] text-ink-soft mt-4 leading-relaxed">
                {draft.description.length > 220
                  ? draft.description.slice(0, 220) + "…"
                  : draft.description}
              </p>
            ) : (
              <p className="text-[12px] text-ink-mute mt-4 italic">
                Description à venir…
              </p>
            )}

            {/* Tier list preview */}
            {draft.tiers.length > 0 ? (
              <div className="mt-5 space-y-2">
                {draft.tiers.map((t) => {
                  const customer = t.faceValueMad
                    ? formatMAD(computeCustomerPrice(t.faceValueMad).customerPaysMad)
                    : "—";
                  return (
                    <div
                      key={t.id}
                      className="bg-canvas-2/70 rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div
                          className="text-[12px] font-semibold text-violet-deep truncate"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {t.name || "Tarif sans nom"}
                        </div>
                        <div className="text-[10px] text-ink-mute mt-0.5 num">
                          {t.quantity > 0 ? `${t.quantity} dispo` : "—"}
                        </div>
                      </div>
                      <div className="text-[12px] font-bold text-ink num shrink-0">
                        {customer}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </motion.div>

          {/* Sticky bottom CTA */}
          <div className="border-t border-line-soft px-4 py-3 bg-canvas">
            <button
              className="w-full h-11 rounded-full bg-gold text-ink text-[13px] font-bold flex items-center justify-center gap-2 num"
              disabled
            >
              {lowestTier
                ? `Réserver — à partir de ${formatMAD(
                    computeCustomerPrice(lowestTier.faceValueMad).customerPaysMad,
                  )}`
                : "Réserver"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatPreviewDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}
