"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "@/lib/auth/role";
import { LockedAudiences } from "@/components/audiences/LockedAudiences";
import { AudiencesReadyView } from "@/components/audiences/AudiencesReadyView";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartSkeleton, KpiGridSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

// /audiences/details — full layout always, even on mobile. Reached
// via the "Voir plus" CTA on the compact mobile view of /audiences.
export default function AudiencesDetailsPage() {
  const profile = useProfile();

  const query = useEventQuery(
    (repo) => repo.getAudiences(profile?.id ?? ""),
    [profile?.id],
  );
  const data = profile ? query.data : null;

  if (!profile || !data) return <div className="min-h-[60vh]" />;
  if (data.state === "locked") {
    return <LockedAudiences emptyState={data.emptyState} />;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/audiences"
        className="inline-flex items-center gap-1.5 text-meta font-semibold text-violet-deep hover:text-ink transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2.2} />
        Retour aux audiences
      </Link>
      <AudiencesReadyView profile={profile} data={data} compact={false} />
    </div>
  );
}
