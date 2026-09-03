"use client";

import { useMemo } from "react";
import { useProfile } from "@/lib/auth/role";
import { LockedAudiences } from "@/components/audiences/LockedAudiences";
import { AudiencesReadyView } from "@/components/audiences/AudiencesReadyView";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartSkeleton, KpiGridSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function AudiencesPage() {
  const profile = useProfile();

  const query = useEventQuery(
    (repo) => repo.getAudiences(profile?.id ?? ""),
    [profile?.id],
  );
  const data = profile ? query.data : null;

  if (!profile || query.status !== "ready") {
    // A blank div used to stand in here, which meant a slow or failed
    // read looked identical to an empty page.
    return (
      <QueryState
        query={query}
        label="Chargement de vos audiences"
        skeleton={
          <div className="space-y-6">
            <PageHeaderSkeleton />
            <KpiGridSkeleton count={4} />
            <ChartSkeleton height={240} />
          </div>
        }
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Aucune audience"
        description="Vos audiences se constituent au fil des réservations confirmées."
      />
    );
  }

  if (data.state === "locked") {
    return <LockedAudiences emptyState={data.emptyState} />;
  }

  // compact=true → mobile trims the heavy panels (Geo / Cohort / Top
  // clients / Benchmarks) and surfaces a "Voir plus" CTA pointing to
  // /audiences/details which renders compact=false.
  return <AudiencesReadyView profile={profile} data={data} compact />;
}
