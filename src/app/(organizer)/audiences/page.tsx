"use client";

import { useMemo } from "react";
import { useProfile } from "@/lib/auth/role";
import { LockedAudiences } from "@/components/audiences/LockedAudiences";
import { AudiencesReadyView } from "@/components/audiences/AudiencesReadyView";
import { useEventQuery } from "@/lib/data/useQuery";

export default function AudiencesPage() {
  const profile = useProfile();

  const query = useEventQuery(
    (repo) => repo.getAudiences(profile?.id ?? ""),
    [profile?.id],
  );
  const data = profile ? query.data : null;

  if (!profile || !data) {
    // SSR / first-paint: render an empty shell that matches the page
    // dimensions to avoid layout shift when the profile resolves.
    return <div className="min-h-[60vh]" />;
  }

  if (data.state === "locked") {
    return <LockedAudiences emptyState={data.emptyState} />;
  }

  // compact=true → mobile trims the heavy panels (Geo / Cohort / Top
  // clients / Benchmarks) and surfaces a "Voir plus" CTA pointing to
  // /audiences/details which renders compact=false.
  return <AudiencesReadyView profile={profile} data={data} compact />;
}
