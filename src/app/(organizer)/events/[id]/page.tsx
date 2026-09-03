"use client";

import { Suspense } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill, Pill } from "@/components/ui/Pill";
import { SalesTab } from "@/components/event/SalesTab";
import { AnalysesTab } from "@/components/event/AnalysesTab";
import { AttendeesTab } from "@/components/event/AttendeesTab";
import { BilanTab } from "@/components/event/BilanTab";
import { InvitationsTab } from "@/components/event/InvitationsTab";
import { RefundsTab } from "@/components/event/RefundsTab";
import { RegieTab } from "@/components/event/RegieTab";
import { PromoteTab } from "@/components/event/PromoteTab";
import { formatDateTimeFR, formatMAD } from "@/lib/utils/format";
import type { TabDef } from "@/components/ui/Tabs";
import type { LyfeEvent } from "@/lib/types/domain";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { EntityListSkeleton, KpiGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function EventDetailPage() {
  // useSearchParams must live under a Suspense boundary in Next 14.
  return (
    <Suspense fallback={null}>
      <EventDetailInner />
    </Suspense>
  );
}

function EventDetailInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const initialTab = search.get("tab") ?? undefined;
  const eventQuery = useEventQuery(
    (repo) => repo.getEvent(params.id),
    [params.id],
  );
  const analysesIds = useEventQuery((repo) => repo.listAnalysesEventIds(), []);
  const bilanIds = useEventQuery((repo) => repo.listBilanEventIds(), []);
  const event = eventQuery.data;

  // Loading and failure are not "not found" — 404-ing before the read
  // resolves would break every deep link into an event.
  if (eventQuery.status !== "ready") {
    return (
      <div className="space-y-6">
        <QueryState
          query={eventQuery}
          label="Chargement de l'événement"
          skeleton={
            <div className="space-y-6">
              <Skeleton shape="card" className="h-56 w-full" />
              <KpiGridSkeleton count={4} />
              <EntityListSkeleton rows={4} />
            </div>
          }
        />
      </div>
    );
  }
  if (!event) notFound();

  const has = {
    analyses: (analysesIds.data ?? []).includes(event.id),
    bilan: (bilanIds.data ?? []).includes(event.id),
  };

  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  const revenue = event.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );
  const conversion = event.pageViews > 0 ? (sold / event.pageViews) * 100 : 0;

  return (
    <div className="-mx-4 md:-mx-8 -mt-6 md:-mt-8">
      {/* === Header === */}
      <div className="relative overflow-hidden border-b border-line-soft no-print">
        {/* Gradient cover backdrop */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, var(--color-ink), var(--color-ink-soft))",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-gold) 32%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 80% 100%, color-mix(in oklab, var(--color-on-ink-cool) 10%, transparent), transparent 60%)",
          }}
        />

        <div className="relative px-4 md:px-8 py-10 md:py-14 max-w-[1440px] mx-auto">
          {event.status.state === "rejected" ? (
            <div
              className="mb-6 rounded-[var(--radius-md)] p-4 max-w-2xl"
              style={{ background: "color-mix(in oklab, var(--color-danger) 18%, transparent)", color: "var(--color-on-ink)" }}
            >
              <div className="text-eyebrow mb-1.5" style={{ color: "var(--color-on-ink-mute)" }}>
                Refusé par LYFE
              </div>
              <p className="text-[14px] leading-relaxed">
                {event.status.reason}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={event.status} />
            <Pill tone="neutral" className="!bg-canvas/15 !text-canvas">
              {event.category.replace("_", " ").toUpperCase()}
            </Pill>
            <Pill tone="neutral" className="!bg-canvas/15 !text-canvas">
              {event.agePolicy.toUpperCase()}
            </Pill>
          </div>

          <h1
            className="text-canvas mt-4 max-w-3xl"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {event.name}
          </h1>
          <div className="text-[14px] text-canvas/70 mt-3 num">
            {formatDateTimeFR(event.startsAt)} · {event.venue.name},{" "}
            {event.venue.city}
          </div>

          {/* Stats strip */}
          {cap > 0 ? (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-y-5 num max-w-3xl">
              <KeyStat label="Vendus" value={String(sold)} divider />
              <KeyStat
                label="Restants"
                value={String(cap - sold)}
                divider
              />
              <KeyStat label="Revenu" value={formatMAD(revenue)} divider />
              <KeyStat label="Conv." value={`${conversion.toFixed(1)} %`} />
            </div>
          ) : null}
        </div>
      </div>

      {/* === Tabs === */}
      <div className="px-4 md:px-8 py-7 md:py-9 max-w-[1440px] mx-auto">
        <Tabs tabs={buildTabs(event, sold, has)} defaultId={initialTab} />
      </div>
    </div>
  );
}

// Tab builder — Analyses sits right after Ventes when the event has
// analytics seeded (on_sale + in_review). For past / settled events,
// Bilan replaces Scanner since door-day is over and what matters is
// the post-event recap. Cancelled events keep the existing rose
// ribbon, no Bilan.
function buildTabs(
  event: LyfeEvent,
  sold: number,
  // Which optional tabs exist is a data question, so the answer is
  // passed in rather than looked up from a fixture at render time.
  has: { analyses: boolean; bilan: boolean },
): TabDef[] {
  const tabs: TabDef[] = [
    {
      id: "sales",
      label: "Ventes",
      content: <SalesTab event={event} />,
    },
  ];
  if (has.analyses) {
    tabs.push({
      id: "analyses",
      label: "Analyses",
      content: <AnalysesTab event={event} />,
    });
  }
  tabs.push({
    id: "attendees",
    label: "Participants",
    count: sold,
    content: <AttendeesTab eventId={event.id} />,
  });
  // Invitations tab — visible on every event except draft / in_review.
  // It tracks comp / press allocations, with an empty-state pitch on
  // events that haven't issued any invitations yet.
  if (
    event.status.state !== "draft" &&
    event.status.state !== "in_review"
  ) {
    tabs.push({
      id: "invitations",
      label: "Invitations",
      content: <InvitationsTab event={event} />,
    });
  }
  tabs.push({
    id: "refunds",
    label: "Remboursements",
    content: <RefundsTab event={event} />,
  });
  // Bilan tab on past / settled events only.
  if (has.bilan) {
    tabs.push({
      id: "bilan",
      label: "Bilan",
      content: <BilanTab event={event} />,
    });
  }
  // Régie ("door operations") replaces the older Scanner tab. Visible
  // on every event past the gating phase — on_sale onwards. Past +
  // settled keep the tab so the door-day data can be replayed.
  const RÉGIE_STATES = ["on_sale", "live", "past", "settled"] as const;
  if (RÉGIE_STATES.includes(event.status.state as (typeof RÉGIE_STATES)[number])) {
    tabs.push({
      id: "regie",
      label: "Régie",
      content: <RegieTab event={event} />,
    });
  }
  tabs.push({
    id: "promote",
    label: "Promouvoir",
    content: <PromoteTab event={event} />,
  });
  return tabs;
}

function KeyStat({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? "border-r border-canvas/15 pr-6" : "pr-6"}>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "color-mix(in oklab, var(--color-on-ink) 55%, transparent)" }}
      >
        {label}
      </div>
      <div className="text-h2 text-canvas mt-1.5">{value}</div>
    </div>
  );
}
