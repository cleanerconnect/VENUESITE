"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  getAllSampleBuyers,
} from "@/lib/data/static/audiences";
import { getInsightsForSurface } from "@/lib/data/static/insights";
import type {
  AudienceSegmentDetail,
  AudiencesData,
  BuyerProfile,
  TopClient,
} from "@/lib/types/analytics";
import type { OrganizerProfile } from "@/lib/types/domain";
import type { AudienceSegment } from "@/lib/types/visibility";
import { SegmentGrid } from "./SegmentGrid";
import { SegmentDetailPanel } from "./SegmentDetailPanel";
import { MoroccoMap } from "./MoroccoMap";
import { CohortChart } from "./CohortChart";
import { TopClientsTable } from "./TopClientsTable";
import { BenchmarksCard } from "./BenchmarksCard";
import { BuyerProfileSheet } from "./BuyerProfileSheet";
import { BoostWizard } from "@/components/visibility/BoostWizard";

const FORMATTER = new Intl.NumberFormat("fr-FR");

// Shared "ready"-state view for /audiences. Drives both the main
// route (compact=true on mobile, full on desktop via .hidden md:block)
// and the /audiences/details route which always renders the full
// stack regardless of breakpoint.
//
// Extract decision: kept all state + handlers here so the two routes
// stay symmetric and the BoostWizard / panels work identically across
// surfaces. Only difference: compact branches the hero into stacked
// cards and gates the heavy panels behind hidden md:block + a "Voir
// plus" CTA pointing at /audiences/details.
//
// Type narrowing — the route-level page already discriminated against
// the "locked" variant, so by the time we get here `data` is the
// "ready" branch. We type-narrow at the destructure to keep the
// component self-documenting.
type ReadyData = Extract<AudiencesData, { state: "ready" }>;

export function AudiencesReadyView({
  profile,
  data,
  compact,
}: {
  profile: OrganizerProfile;
  data: ReadyData;
  compact: boolean;
}) {
  const { toast } = useToast();
  const [selectedSegment, setSelectedSegment] =
    useState<AudienceSegment | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerProfile | null>(null);
  const [boostSegmentId, setBoostSegmentId] = useState<string | null>(null);

  const insights = getInsightsForSurface("audiences");
  const segmentDetail: AudienceSegmentDetail | null = selectedSegment
    ? data.segmentDetails[selectedSegment.id] ?? null
    : null;
  const buyers = getAllSampleBuyers();

  const handleTopClientSelect = (client: TopClient) => {
    const match = buyers.find((b) => b.name === client.fullName);
    if (match) setSelectedBuyer(match);
    else
      toast({
        tone: "info",
        title: "Profil détaillé indisponible en démo",
      });
  };

  const handleLaunchBoostFromSegment = (segment: AudienceSegment) => {
    setSelectedSegment(null);
    setBoostSegmentId(segment.id);
  };

  const handleLaunchBoostFromBuyer = (buyer: BuyerProfile) => {
    setSelectedBuyer(null);
    setBoostSegmentId(buyer.primarySegmentId);
  };

  return (
    <div className="space-y-6">
      {/* === Header === */}
      <div>
        <h1 className="text-h1 text-ink">Vos audiences</h1>
        <p className="text-body text-ink-soft mt-1.5">
          {profile.shortName} · données agrégées sur 24 mois
        </p>
      </div>

      {/* === Hero strip — 3 Fraunces numbers ===
          Mobile (compact): three separate cards stacked vertically.
          Desktop: single card with a 3-column grid + dividers. */}
      {compact ? (
        <div className="md:hidden space-y-3">
          <HeroCard
            label="Acheteurs uniques"
            value={data.heroStats.totalBuyersLabel}
            sub="Identifiés sur la base événements LYFE"
          />
          <HeroCard
            label="Segments actifs"
            value={String(data.heroStats.activeSegments)}
            sub="Mis à jour automatiquement chaque jour"
          />
          <HeroCard
            label="LTV moyenne"
            value={data.heroStats.ltvLabel}
            sub="Sur 24 mois, post-fees"
          />
        </div>
      ) : null}
      <div className={compact ? "hidden md:block" : ""}>
        <Card variant="surface" size="md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
            <HeroNumber
              label="Acheteurs uniques"
              value={data.heroStats.totalBuyersLabel}
              sub="Identifiés sur la base événements LYFE"
            />
            <HeroNumber
              label="Segments actifs"
              value={String(data.heroStats.activeSegments)}
              sub="Mis à jour automatiquement chaque jour"
              divider
            />
            <HeroNumber
              label="LTV moyenne"
              value={data.heroStats.ltvLabel}
              sub="Sur 24 mois, post-fees"
              divider
            />
          </div>
        </Card>
      </div>

      {/* === Insights — surface-level audiences engine === */}
      {insights.length > 0 ? (
        <Card variant="violet-soft" size="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {insights.map((ins) => (
              <p key={ins.id} className="text-[14px] text-ink leading-relaxed">
                {ins.body}
              </p>
            ))}
          </div>
        </Card>
      ) : null}

      {/* === Segments grid === */}
      <section>
        <h2 className="text-h2 text-ink mb-4">Segments</h2>
        <SegmentGrid segments={data.segments} onSelect={setSelectedSegment} />
      </section>

      {/* === Heavy panels — gated on compact ===
          When compact, mobile hides them entirely (and reveals the
          "Voir plus" CTA at the bottom); desktop still renders them.
          When !compact, they always render regardless of breakpoint. */}
      <div className={compact ? "hidden md:block space-y-5" : "space-y-5"}>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <Card variant="surface" size="md">
            <div className="mb-4">
              <h3 className="text-h3 text-ink">Répartition géographique</h3>
              <p className="text-meta text-ink-soft mt-1">
                {FORMATTER.format(data.heroStats.totalBuyers).replace(/,/g, " ")}{" "}
                acheteurs · données agrégées 24 mois
              </p>
            </div>
            <MoroccoMap geo={data.geo} />
          </Card>

          <BenchmarksCard rows={data.benchmarks} />
        </div>

        <Card variant="surface" size="md">
          <div className="mb-4">
            <h3 className="text-h3 text-ink">Rétention par cohorte</h3>
            <p className="text-meta text-ink-soft mt-1">
              % d&apos;acheteurs qui reviennent sur les éditions suivantes
            </p>
          </div>
          <CohortChart cohorts={data.cohorts} />
        </Card>

        <Card variant="surface" size="md">
          <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-h3 text-ink">Top clients</h3>
              <p className="text-meta text-ink-soft mt-1">
                Classement par valeur cumulée sur 24 mois
              </p>
            </div>
          </div>
          <TopClientsTable
            clients={data.topClients}
            onSelect={handleTopClientSelect}
          />
        </Card>
      </div>

      {/* === Mobile-only "Voir plus" CTA — opens /audiences/details === */}
      {compact ? (
        <div className="md:hidden">
          <Link
            href="/audiences/details"
            className="block bg-violet-soft hover:bg-violet-soft/80 transition-colors rounded-[var(--radius-lg)] p-5 text-center"
          >
            <div className="text-eyebrow text-violet-deep mb-2">
              Voir plus
            </div>
            <p className="text-[14px] text-ink leading-relaxed">
              Carte du Maroc, cohortes de rétention, top clients et
              benchmarks plateforme — la vue détaillée pour les analyses
              approfondies.
            </p>
            <span className="inline-flex items-center gap-1 mt-3 text-meta font-bold uppercase tracking-[0.08em] text-violet-deep">
              Ouvrir la vue détaillée
              <ArrowRight size={11} strokeWidth={2.2} />
            </span>
          </Link>
        </div>
      ) : null}

      {/* === Side panels === */}
      <SegmentDetailPanel
        segment={selectedSegment}
        detail={segmentDetail}
        onClose={() => setSelectedSegment(null)}
        onLaunchBoost={handleLaunchBoostFromSegment}
      />
      <BuyerProfileSheet
        buyer={selectedBuyer}
        onClose={() => setSelectedBuyer(null)}
        onLaunchBoost={handleLaunchBoostFromBuyer}
      />
      <BoostWizard
        open={boostSegmentId !== null}
        onOpenChange={(open) => {
          if (!open) setBoostSegmentId(null);
        }}
        initialSegmentId={boostSegmentId ?? undefined}
      />
    </div>
  );
}

// ─── Mobile single-stat card ───────────────────────────────────────────

function HeroCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card variant="surface" size="md">
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className="text-violet-deep num mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(34px, 9vw, 44px)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div className="text-meta text-ink-soft mt-2">{sub}</div>
    </Card>
  );
}

// ─── Desktop divided-grid stat ─────────────────────────────────────────

function HeroNumber({
  label,
  value,
  sub,
  divider = false,
}: {
  label: string;
  value: string;
  sub: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? "md:border-l md:border-line-soft md:pl-8" : ""}>
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className="text-violet-deep num mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(36px, 5vw, 52px)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div className="text-meta text-ink-soft mt-2.5">{sub}</div>
    </div>
  );
}
