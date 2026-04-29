"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "@/lib/auth/role";
import { getAudiencesByProfileId } from "@/lib/mock/audiences";
import { LockedAudiences } from "@/components/audiences/LockedAudiences";
import { AudiencesReadyView } from "@/components/audiences/AudiencesReadyView";

// /audiences/details — full layout always, even on mobile. Reached
// via the "Voir plus" CTA on the compact mobile view of /audiences.
export default function AudiencesDetailsPage() {
  const profile = useProfile();

  const data = useMemo(() => {
    if (!profile) return null;
    return getAudiencesByProfileId(profile.id);
  }, [profile]);

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
