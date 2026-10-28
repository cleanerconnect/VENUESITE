"use client";

import { motion } from "motion/react";
import type { DraftEvent } from "@/lib/types/domain";
import { appAmount } from "@/lib/event/partial-payment";
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
  // « à partir de » is what the application asks for first, so the
  // cheapest *entry* and not the cheapest ticket: a Carré Or at 1 200
  // with 400 paid online is a cheaper first screen than a 590 pass.
  const lowestTier = draft.tiers
    .filter((t) => appAmount(t) > 0)
    .sort((a, b) => appAmount(a) - appAmount(b))[0];

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
                  "linear-gradient(160deg, var(--color-ink) 0%, var(--color-ink-soft) 60%, var(--color-violet) 130%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 70% 30%, color-mix(in oklab, var(--color-violet) 50%, transparent), transparent 60%)",
              }}
            />
            <div className="absolute top-12 left-4 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-canvas/15 backdrop-blur-sm">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-canvas">
                LYFE
              </span>
              <span className="text-[9px] text-canvas/80">·</span>
              <span className="text-[9px] font-bold text-canvas">
                {city || "·"}
              </span>
            </div>
          </div>

          {/* Body */}
          <motion.div layout className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-deep">
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
                ? `${formatPreviewDate(draft.startDate)} · ${draft.startTime || "·"}`
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
                  // The application charges the card for its own part,
                  // so with a split this is the app amount and not the
                  // ticket — the same figure the editor previews.
                  const customer = appAmount(t)
                    ? formatMAD(computeCustomerPrice(appAmount(t)).customerPaysMad)
                    : "·";
                  return (
                    <div
                      key={t.id}
                      className="bg-canvas-2/70 rounded-[10px] px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="text-[12px] font-semibold text-violet-deep truncate"
                            style={{ fontFamily: "var(--font-serif)" }}
                          >
                            {t.name || "Tarif sans nom"}
                          </div>
                          <div className="text-[10px] text-ink-mute mt-0.5 num">
                            {t.quantity > 0 ? `${t.quantity} dispo` : "·"}
                          </div>
                        </div>
                        <div className="text-[12px] font-bold text-ink num shrink-0">
                          {customer}
                        </div>
                      </div>
                      {/* `Détail Sprint ` ligne 54: the client is told
                          about the balance on the booking screen. This
                          is a picture of that screen, so the organiser
                          reads their own sentence where the client will
                          read it, while they are still writing it. */}
                      {t.partialPayment && t.onSiteMessage ? (
                        <div className="text-[10px] text-ink-soft mt-1.5 leading-snug border-t border-line-soft pt-1.5">
                          {t.onSiteMessage}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </motion.div>

          {/* Sticky bottom CTA */}
          <div className="border-t border-line-soft px-4 py-3 bg-canvas">
            {/* A picture of the app's CTA, not a control. Rendered as a
                div so it never takes focus — a disabled button here read
                to a screen reader as a broken button on this page. */}
            <div
              aria-hidden
              className="w-full h-11 rounded-full bg-violet text-canvas text-[13px] font-bold flex items-center justify-center gap-2 num"
            >
              {lowestTier
                ? `Réserver, à partir de ${formatMAD(
                    computeCustomerPrice(appAmount(lowestTier)).customerPaysMad,
                  )}`
                : "Réserver"}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatPreviewDate(iso: string) {
  if (!iso) return "·";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}
