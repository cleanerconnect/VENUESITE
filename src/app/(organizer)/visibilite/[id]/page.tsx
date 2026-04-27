"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Square,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LivePulse } from "@/components/motion/LivePulse";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Sparkline } from "@/components/cards/Sparkline";
import {
  BOOST_LABEL,
  BoostFormatIcon,
} from "@/components/visibility/BoostFormatIcon";
import { CampaignStatusPill } from "@/components/visibility/CampaignStatusPill";
import { getCampaignById } from "@/lib/mock/visibility";
import { formatMAD, formatRelativeFR } from "@/lib/utils/format";

export default function CampaignPerformancePage() {
  const params = useParams<{ id: string }>();
  const campaign = getCampaignById(params.id);
  if (!campaign) notFound();

  const isActive = campaign.status === "active";
  const isCompleted = campaign.status === "completed";
  const burnPct = campaign.spentMad / Math.max(1, campaign.budgetMad);
  const remainingBudget = campaign.budgetMad - campaign.spentMad;
  const dailyBurn = burnPct > 0 && campaign.daysRemaining > 0
    ? Math.round(remainingBudget / Math.max(1, campaign.daysRemaining))
    : 0;
  const roasUnder = campaign.roas < 3;

  return (
    <Stagger className="space-y-5 md:space-y-6">
      {/* === Back link === */}
      <StaggerItem>
        <Link
          href="/visibilite"
          className="inline-flex items-center gap-1.5 text-meta font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Toutes les campagnes
        </Link>
      </StaggerItem>

      {/* === Header === */}
      <StaggerItem>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                aria-hidden
                className="h-9 w-9 rounded-[12px] bg-violet-soft flex items-center justify-center shrink-0"
              >
                <BoostFormatIcon
                  type={campaign.boostType}
                  size={18}
                  className="text-violet-deep"
                />
              </span>
              <CampaignStatusPill status={campaign.status} />
              <span className="text-meta text-ink-mute">
                {BOOST_LABEL[campaign.boostType]}
              </span>
            </div>
            <h1 className="text-h1 text-ink">{campaign.name}</h1>
            <Link
              href={`/events/${campaign.eventId}`}
              className="inline-flex items-center gap-1 text-meta text-ink-soft hover:text-ink transition-colors mt-1.5"
            >
              {campaign.eventName}
              <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </div>

          {/* Action cluster */}
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft={<Pause size={14} strokeWidth={1.8} />}
                >
                  Mettre en pause
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft={<Square size={12} strokeWidth={2} />}
                >
                  Terminer
                </Button>
              </>
            ) : campaign.status === "paused" ? (
              <Button
                size="md"
                iconLeft={<Play size={14} strokeWidth={1.8} />}
              >
                Reprendre
              </Button>
            ) : null}
          </div>
        </div>
      </StaggerItem>

      {/* === Bento grid === */}
      <StaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 (2-col) — dark hero with billets générés as headline */}
          <div className="md:col-span-2">
            <Card variant="ink" size="hero" glow className="h-full">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isActive ? (
                      <LivePulse label="EN COURS" />
                    ) : (
                      <span className="text-eyebrow text-canvas/55">
                        Performance
                      </span>
                    )}
                  </div>
                  <div className="text-eyebrow text-canvas/55 mt-3">
                    Billets générés par la campagne
                  </div>
                  <div
                    className="text-canvas mt-3 num"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      fontSize: "clamp(56px, 8vw, 96px)",
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    <AnimatedNumber value={campaign.ticketsAttributed} />
                  </div>
                  <div className="text-meta text-canvas/65 mt-2 num">
                    {formatMAD(campaign.revenueAttributedMad)} de revenu
                    attribué
                  </div>
                </div>

                <div className="text-right">
                  <Sparkline
                    data={campaign.conversionsByHour}
                    width={180}
                    height={60}
                    stroke="#B388D6"
                  />
                  <div className="text-meta text-canvas/55 mt-1 num">
                    Conversions / h, 24 dernières
                  </div>
                </div>
              </div>

              <div className="mt-7 pt-6 border-t border-canvas/10 grid grid-cols-2 gap-x-8 gap-y-3 num">
                <div>
                  <div className="text-eyebrow text-canvas/55">
                    Coût par acquisition
                  </div>
                  <div className="text-h1 text-canvas mt-2">
                    {formatMAD(campaign.cpaMad)}
                  </div>
                </div>
                <div>
                  <div className="text-eyebrow text-canvas/55">ROAS</div>
                  <div
                    className={`text-h1 mt-2 ${
                      roasUnder ? "text-warning" : "text-violet"
                    }`}
                  >
                    {campaign.roas.toFixed(1).replace(".", ",")}×
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Card 2 — dépense + burn rate */}
          <Card variant="surface" size="md">
            <div className="text-eyebrow text-ink-soft">Dépense</div>
            <div className="mt-3 num">
              <span className="h-display text-[36px] text-ink">
                {formatMAD(campaign.spentMad, false)}
              </span>
              <span className="text-ink-mute text-h3 ml-1">
                / {formatMAD(campaign.budgetMad, false)} MAD
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar
                value={campaign.spentMad}
                max={campaign.budgetMad}
                tone="violet"
                size="sm"
              />
              <div className="flex items-center justify-between text-meta text-ink-mute mt-2 num">
                <span>{Math.round(burnPct * 100)} % consommé</span>
                <span>{formatMAD(remainingBudget)} restant</span>
              </div>
            </div>
            {!isCompleted && dailyBurn > 0 ? (
              <div className="mt-4 pt-4 border-t border-line-soft text-meta text-ink-soft num">
                Rythme prévu ·{" "}
                <span className="font-semibold text-ink">
                  {formatMAD(dailyBurn)}
                </span>{" "}
                / jour pour finir le budget
              </div>
            ) : null}
          </Card>

          {/* Card 3 — portée (sand) */}
          <Card variant="sand" size="md">
            <div className="text-eyebrow text-ink-soft">Portée</div>
            <div className="mt-3 grid grid-cols-3 gap-x-4 num">
              <ReachStat
                label="Impressions"
                value={campaign.impressions}
              />
              <ReachStat
                label="Uniques"
                value={campaign.uniqueReach}
              />
              <ReachStat
                label="Fréquence"
                value={campaign.frequency.toFixed(2).replace(".", ",")}
                isString
              />
            </div>
            <p className="text-meta text-ink-soft mt-4 leading-relaxed">
              {campaign.uniqueReach
                .toLocaleString("fr-FR")
                .replace(/,/g, " ")}{" "}
              personnes uniques ont vu votre campagne en moyenne{" "}
              {campaign.frequency.toFixed(1).replace(".", ",")} fois.
            </p>
          </Card>

          {/* Card 4 (2-col) — audience profile (violet-soft) */}
          <div className="md:col-span-2">
            <AudienceProfileCard
              profile={campaign.audienceProfile}
              uniqueReach={campaign.uniqueReach}
            />
          </div>

          {/* Card 5 — recent attributed tickets */}
          <Card variant="surface" size="md" className="!p-0">
            <div className="px-6 pt-6 pb-2">
              <div className="text-eyebrow text-ink-soft">
                Billets attribués
              </div>
              <div className="text-meta text-ink-mute mt-1">
                Derniers achats provenant de cette campagne
              </div>
            </div>
            <ul className="divide-y divide-line-soft">
              {campaign.recentTickets.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className="px-6 py-2.5 flex items-center justify-between gap-3 text-[13px]"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate">
                      {t.name}
                    </div>
                    <div className="text-meta text-ink-mute truncate">
                      {t.tierName}
                    </div>
                  </div>
                  <div className="text-right shrink-0 num">
                    <div className="text-ink font-semibold">
                      {formatMAD(t.amountMad)}
                    </div>
                    <div className="text-meta text-ink-mute">
                      {formatRelativeFR(t.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {campaign.recentTickets.length > 6 ? (
              <div className="px-6 py-3 border-t border-line-soft">
                <button className="text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors">
                  Voir les {campaign.recentTickets.length} billets attribués
                </button>
              </div>
            ) : null}
          </Card>
        </div>
      </StaggerItem>

      {/* === Variantes A/B === */}
      {campaign.abVariants && campaign.abVariants.length > 0 ? (
        <StaggerItem>
          <Card variant="surface" size="md">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-h3 text-ink">Variantes A/B</h2>
              {campaign.abVariants.some((v) => v.winner) ? (
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-success/10 text-success text-meta font-bold uppercase tracking-[0.08em]">
                  <CheckCircle2 size={11} strokeWidth={2.4} />
                  Gagnant détecté · 95 % CI
                </span>
              ) : null}
            </div>
            <p className="text-meta text-ink-soft mb-5">
              Test automatique de deux créatifs, le gagnant est isolé une
              fois la significativité statistique atteinte.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {campaign.abVariants.map((v) => {
                const conversionRate = (v.conversions / v.impressions) * 100;
                return (
                  <div
                    key={v.id}
                    className={`relative rounded-[var(--radius-md)] border p-5 ${
                      v.winner
                        ? "border-violet ring-1 ring-violet/30 bg-violet-soft/40"
                        : "border-line bg-canvas-2/40"
                    }`}
                  >
                    {v.winner ? (
                      <span
                        className="absolute top-3 right-3 inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-violet text-canvas text-meta font-bold uppercase tracking-[0.08em]"
                      >
                        <Check size={11} strokeWidth={2.6} />
                        Gagnant
                      </span>
                    ) : null}
                    <div className="text-eyebrow text-ink-mute mb-2">
                      {v.label}
                    </div>
                    <div className="num">
                      <div className="text-h2 text-ink">
                        {conversionRate.toFixed(2).replace(".", ",")} %
                      </div>
                      <div className="text-meta text-ink-soft mt-1">
                        {v.conversions} conversions sur{" "}
                        {v.impressions
                          .toLocaleString("fr-FR")
                          .replace(/,/g, " ")}{" "}
                        impressions
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </StaggerItem>
      ) : null}

      {/* === Optimisations suggérées === */}
      {campaign.optimizations.length > 0 ? (
        <StaggerItem>
          <Card variant="sand" size="md">
            <div className="flex items-start gap-3 mb-4">
              <span
                aria-hidden
                className="h-9 w-9 rounded-[12px] bg-surface/70 flex items-center justify-center shrink-0"
              >
                <Sparkles
                  size={16}
                  strokeWidth={1.8}
                  className="text-violet-deep"
                />
              </span>
              <div>
                <div className="text-eyebrow text-violet-deep">
                  Optimisations suggérées
                </div>
                <h3 className="text-h3 text-ink mt-1.5">
                  {roasUnder
                    ? "Trois ajustements pour remettre la campagne dans les clous."
                    : "Trois pistes pour gagner encore quelques pourcents."}
                </h3>
              </div>
            </div>
            <ul className="space-y-2">
              {campaign.optimizations.map((o) => (
                <li
                  key={o.id}
                  className="bg-surface/60 rounded-[var(--radius-sm)] p-4 flex items-start gap-3"
                >
                  <TrendingUp
                    size={14}
                    strokeWidth={1.8}
                    className="text-violet-deep mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink leading-relaxed">
                      {o.text}
                    </p>
                  </div>
                  <button className="text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink transition-colors shrink-0 self-center">
                    {o.actionLabel ?? "Appliquer"}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </StaggerItem>
      ) : null}
    </Stagger>
  );
}

function ReachStat({
  label,
  value,
  isString = false,
}: {
  label: string;
  value: number | string;
  isString?: boolean;
}) {
  const display =
    typeof value === "number"
      ? value.toLocaleString("fr-FR").replace(/,/g, " ")
      : value;
  return (
    <div>
      <div className="text-meta text-ink-mute">{label}</div>
      <div className="h-display text-[20px] text-ink mt-1">
        {isString ? display : display}
      </div>
    </div>
  );
}

function AudienceProfileCard({
  profile,
  uniqueReach,
}: {
  profile: import("@/lib/types/visibility").AudienceProfile;
  uniqueReach: number;
}) {
  return (
    <Card variant="violet-soft" size="md">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-eyebrow text-violet-deep">
            Profil de l'audience touchée
          </div>
          <h3 className="text-h3 text-ink mt-1.5">
            Qui a vu votre campagne
          </h3>
        </div>
        <span className="text-meta text-ink-soft num">
          {uniqueReach.toLocaleString("fr-FR").replace(/,/g, " ")} uniques
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        {/* Top cities */}
        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Top villes</div>
          <ul className="space-y-2">
            {profile.topCities.map((c) => (
              <DistRow key={c.city} label={c.city} pct={c.pct} />
            ))}
          </ul>
        </div>

        {/* Age distribution */}
        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Âge</div>
          <ul className="space-y-2">
            {profile.ageDistribution.map((a) => (
              <DistRow key={a.range} label={a.range} pct={a.pct} />
            ))}
          </ul>
        </div>

        {/* Interests */}
        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Intérêts</div>
          <ul className="space-y-2">
            {profile.interests.map((i) => (
              <DistRow key={i.name} label={i.name} pct={i.pct} />
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function DistRow({ label, pct }: { label: string; pct: number }) {
  return (
    <li className="text-[13px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-ink truncate pr-2">{label}</span>
        <span className="num text-ink-soft font-medium shrink-0">{pct} %</span>
      </div>
      <div className="h-1 bg-canvas-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-violet rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </li>
  );
}
