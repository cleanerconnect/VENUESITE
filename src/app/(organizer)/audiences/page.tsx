"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/auth/role";
import { getAudiencesByProfileId } from "@/lib/mock/audiences";
import { getInsightsForSurface } from "@/lib/mock/insights";
import type {
  AudienceSegmentDetail,
  BuyerProfile,
  TopClient,
} from "@/lib/types/analytics";
import type { AudienceSegment } from "@/lib/types/visibility";
import { SegmentGrid } from "@/components/audiences/SegmentGrid";
import { SegmentDetailPanel } from "@/components/audiences/SegmentDetailPanel";
import { MoroccoMap } from "@/components/audiences/MoroccoMap";
import { CohortChart } from "@/components/audiences/CohortChart";
import { TopClientsTable } from "@/components/audiences/TopClientsTable";
import { BenchmarksCard } from "@/components/audiences/BenchmarksCard";
import { BuyerProfileSheet } from "@/components/audiences/BuyerProfileSheet";
import { LockedAudiences } from "@/components/audiences/LockedAudiences";
import { BoostWizard } from "@/components/visibility/BoostWizard";
import { getAllSampleBuyers } from "@/lib/mock/audiences";

const FORMATTER = new Intl.NumberFormat("fr-FR");

export default function AudiencesPage() {
  const profile = useProfile();
  const { toast } = useToast();

  const data = useMemo(() => {
    if (!profile) return null;
    return getAudiencesByProfileId(profile.id);
  }, [profile]);

  // Side panel state — segment + buyer profile sheet are independent.
  const [selectedSegment, setSelectedSegment] =
    useState<AudienceSegment | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerProfile | null>(null);
  // BoostWizard state — opened by the sticky CTAs in either side
  // panel. The wizard itself accepts an `initialSegmentId` so the
  // audience step lands pre-selected.
  const [boostSegmentId, setBoostSegmentId] = useState<string | null>(null);

  if (!profile || !data) {
    // SSR / first-paint: render an empty shell that matches the page
    // dimensions to avoid layout shift when the profile resolves.
    return <div className="min-h-[60vh]" />;
  }

  if (data.state === "locked") {
    return <LockedAudiences emptyState={data.emptyState} />;
  }

  const insights = getInsightsForSurface("audiences");

  const segmentDetail: AudienceSegmentDetail | null = selectedSegment
    ? data.segmentDetails[selectedSegment.id] ?? null
    : null;

  const buyers = getAllSampleBuyers();

  const handleTopClientSelect = (client: TopClient) => {
    // Top-clients table feeds into the buyer profile sheet via name
    // match. In production this would carry a buyerId column; for the
    // demo we resolve by full name against the sample buyers list.
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
    // Pre-fill with the segment that matches the buyer's primary tag
    // — handles the "single buyer" case without needing single-user
    // targeting infrastructure.
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

      {/* === Hero strip — 3 Fraunces numbers === */}
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

      {/* === Insights — surface-level audiences engine === */}
      {insights.length > 0 ? (
        <Card variant="violet-soft" size="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {insights.map((ins) => (
              <p
                key={ins.id}
                className="text-[14px] text-ink leading-relaxed"
              >
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

      {/* === Geo + Benchmarks side by side === */}
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

      {/* === Cohort retention === */}
      <Card variant="surface" size="md">
        <div className="mb-4">
          <h3 className="text-h3 text-ink">Rétention par cohorte</h3>
          <p className="text-meta text-ink-soft mt-1">
            % d&apos;acheteurs qui reviennent sur les éditions suivantes
          </p>
        </div>
        <CohortChart cohorts={data.cohorts} />
      </Card>

      {/* === Top clients table === */}
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
