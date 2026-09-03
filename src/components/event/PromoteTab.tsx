"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Plus,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  BOOST_LABEL,
  BoostFormatIcon,
} from "@/components/visibility/BoostFormatIcon";
import { BoostWizardLauncher } from "@/components/visibility/BoostWizard";
import { CampaignStatusPill } from "@/components/visibility/CampaignStatusPill";
import type { LyfeEvent } from "@/lib/types/domain";
import { formatDateTimeFR, formatMAD } from "@/lib/utils/format";
import { useEventQuery } from "@/lib/data/useQuery";

export function PromoteTab({ event }: { event: LyfeEvent }) {
  // Active campaigns scoped to this event — what already runs.
  const campaignsQuery = useEventQuery((repo) => repo.listCampaigns(), []);
  const eventCampaigns = (campaignsQuery.data ?? []).filter(
    (c) => c.eventId === event.id && c.status !== "completed",
  );

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────────
         Mettre en avant — paid promotion. The screen Phase 2 brought.
         Appears first because it's the higher-leverage action. */}
      <section>
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h2 text-ink">Mettre en avant</h2>
              <Pill tone="info">PAYANT</Pill>
            </div>
            <p className="text-body text-ink-soft mt-1.5 max-w-xl">
              Lancez une campagne payante ciblée sur cet événement. ROAS
              moyen sur la plateforme : 5,2×.
            </p>
          </div>
          <BoostWizardLauncher
            eventName={event.name}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 text-[14px] rounded-[var(--radius-sm)] font-semibold bg-violet text-canvas hover:bg-violet-deep transition-colors"
          >
            <Plus size={16} strokeWidth={2} />
            Lancer un boost
          </BoostWizardLauncher>
        </div>

        {eventCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventCampaigns.map((c) => {
              const roasUnder = c.roas < 3;
              return (
                <Link
                  key={c.id}
                  href={`/visibilite/${c.id}`}
                  className="block"
                >
                  <Card
                    variant="surface"
                    size="md"
                    className="hover:border-ink/40 transition-colors h-full"
                  >
                    <div className="flex items-start gap-3">
                      <span className="h-10 w-10 rounded-[10px] bg-violet-soft flex items-center justify-center shrink-0">
                        <BoostFormatIcon
                          type={c.boostType}
                          size={18}
                          className="text-violet-deep"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[14px] font-semibold text-ink truncate">
                            {BOOST_LABEL[c.boostType]}
                          </div>
                          <CampaignStatusPill status={c.status} />
                        </div>
                        <div className="text-meta text-ink-mute mt-0.5 truncate">
                          {c.name}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <Metric
                        label="Dépensé"
                        value={formatMAD(c.spentMad, false)}
                        suffix="MAD"
                      />
                      <Metric
                        label="Billets"
                        value={c.ticketsAttributed.toLocaleString("fr-FR")}
                      />
                      <Metric
                        label="ROAS"
                        value={`${c.roas.toFixed(1).replace(".", ",")}×`}
                        accent={roasUnder ? "warning" : "success"}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-meta text-ink-soft mb-1.5">
                        <span>Budget consommé</span>
                        <span className="num">
                          {Math.round((c.spentMad / Math.max(1, c.budgetMad)) * 100)}{" "}
                          %
                        </span>
                      </div>
                      <ProgressBar
                        value={c.spentMad}
                        max={c.budgetMad}
                        tone="violet"
                        size="xs"
                      />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card variant="violet-soft" size="md">
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="h-12 w-12 rounded-[12px] bg-canvas/60 flex items-center justify-center shrink-0"
              >
                <Sparkles
                  size={20}
                  strokeWidth={1.7}
                  className="text-violet-deep"
                />
              </span>
              <div className="flex-1">
                <h3 className="text-h3 text-ink">Aucun boost actif</h3>
                <p className="text-body text-ink-soft mt-2 leading-relaxed max-w-xl">
                  Cet événement n&apos;a aucune campagne en cours. À 67 jours
                  du début, un Splash de bienvenue ou une campagne en tête
                  de liste produit le meilleur rendement.
                </p>
                <BoostWizardLauncher
                  eventName={event.name}
                  className="mt-4 inline-flex items-center gap-2 text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink transition-colors"
                >
                  Lancer la première campagne
                  <ArrowRight size={12} strokeWidth={2} />
                </BoostWizardLauncher>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-3 flex items-center justify-end">
          <Link
            href="/visibilite"
            className="text-meta font-semibold text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1"
          >
            Voir toutes vos campagnes
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </div>
      </section>

      <div aria-hidden className="h-px bg-line-soft" />

      {/* ──────────────────────────────────────────────────────────────
         Partager — organic distribution. The original 4 tools, kept
         intact under a clearer subhead. */}
      <section>
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h2 text-ink">Partager</h2>
              <Pill tone="neutral">GRATUIT</Pill>
            </div>
            <p className="text-body text-ink-soft mt-1.5 max-w-xl">
              Vos canaux organiques. Lien public, aperçu, QR, et embed.
            </p>
          </div>
        </div>

        <ShareGrid event={event} />
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: "success" | "warning";
}) {
  return (
    <div>
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className={
          "num font-bold mt-1 " +
          (accent === "success"
            ? "text-success"
            : accent === "warning"
              ? "text-warning"
              : "text-ink")
        }
      >
        {value}
        {suffix ? (
          <span className="text-meta text-ink-mute ml-1 font-medium">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ShareGrid({ event }: { event: LyfeEvent }) {
  const [copied, setCopied] = useState(false);
  const url = `https://lyfe.ma/e/${event.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* === Public link + share === */}
      <Card variant="surface" size="md">
        <h3 className="text-h3 text-ink">Lien public</h3>
        <p className="text-meta text-ink-soft mt-1 mb-5">
          À partager sur tous vos canaux
        </p>
        <div className="flex bg-canvas-2/60 border border-line rounded-full overflow-hidden h-12 items-center pl-4">
          <span className="text-[13px] text-ink num truncate flex-1">
            {url}
          </span>
          <button
            onClick={copy}
            className="h-12 px-5 bg-ink text-canvas text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-ink-soft transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <Check size={14} strokeWidth={2} />
                  Copié
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <Copy size={14} strokeWidth={1.8} />
                  Copier
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SHARE_CHANNELS.map((p) => (
            <button
              key={p.name}
              className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold border border-line rounded-full hover:border-ink transition-colors"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      {/* === Social card preview === */}
      <Card variant="canvas-2" size="md">
        <h3 className="text-h3 text-ink">Aperçu carte sociale</h3>
        <p className="text-meta text-ink-soft mt-1 mb-5">
          OpenGraph / WhatsApp / Instagram
        </p>
        <div
          className="aspect-[1.91/1] rounded-[var(--radius-md)] overflow-hidden relative"
          style={{
            background:
              "linear-gradient(135deg, var(--color-ink), var(--color-ink-soft))",
          }}
        >
          <div
            className="absolute -top-12 -right-8 w-72 h-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(134,91,166,0.42), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <div className="text-eyebrow text-violet">
              LYFE · {event.venue.city}
            </div>
            <div
              className="text-h2 text-canvas mt-1.5 leading-tight max-w-md"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {event.name}
            </div>
            <div className="text-meta text-canvas/70 mt-2 num">
              {formatDateTimeFR(event.startsAt)}
            </div>
          </div>
        </div>
      </Card>

      {/* === QR poster === */}
      <Card variant="surface" size="md">
        <h3 className="text-h3 text-ink">Affiche QR</h3>
        <p className="text-meta text-ink-soft mt-1 mb-5">
          PDF imprimable, prêt pour vos vitrines
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["A4", "A3"] as const).map((size) => (
            <button
              key={size}
              className="bg-canvas-2/60 border border-line rounded-[var(--radius-md)] p-4 hover:border-ink transition-colors text-left"
            >
              <div
                className="aspect-[1/1.414] rounded-[var(--radius-sm)] mb-3 flex items-center justify-center bg-surface"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 30%, rgba(10,31,61,0.05), transparent 60%)",
                }}
              >
                <QrSvg />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-ink">
                  Format {size}
                </span>
                <Download size={14} className="text-ink-mute" strokeWidth={1.8} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* === Embed === */}
      <Card variant="ink" size="md">
        <h3 className="text-h3 text-canvas">Code à intégrer</h3>
        <p className="text-meta text-canvas/60 mt-1 mb-4">
          Affichez la billetterie sur votre propre site
        </p>
        <pre className="text-[12px] bg-black/40 text-canvas/85 p-4 rounded-[var(--radius-sm)] overflow-x-auto scroll-thin num leading-relaxed">
          {`<iframe
  src="${url}/embed"
  width="100%"
  height="540"
  style="border:0">
</iframe>`}
        </pre>
      </Card>
    </div>
  );
}

// Mock QR, geometric placeholder. Real impl uses qrcode.react.
/**
 * Third-party brand colours, deliberately literal. These are not design
 * tokens and must not be themed — WhatsApp green is WhatsApp green.
 */
const SHARE_CHANNELS = [
  { name: "WhatsApp", color: "#25D366" },
  { name: "Instagram", color: "#E1306C" },
  { name: "Facebook", color: "#1877F2" },
  { name: "X", color: "#0F0F0F" },
] as const;

function QrSvg() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
      {[
        [4, 4],
        [60, 4],
        [4, 60],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="16" height="16" fill="var(--color-ink)" rx="2" />
          <rect x={x + 4} y={y + 4} width="8" height="8" fill="var(--color-on-ink)" rx="1" />
          <rect x={x + 6} y={y + 6} width="4" height="4" fill="var(--color-ink)" />
        </g>
      ))}
      {Array.from({ length: 32 }).map((_, i) => {
        const x = (i % 8) * 7 + 24;
        const y = Math.floor(i / 8) * 7 + 24;
        if ((i * 31) % 5 === 0) return null;
        return (
          <rect key={i} x={x} y={y} width="5" height="5" fill="var(--color-ink)" />
        );
      })}
    </svg>
  );
}
