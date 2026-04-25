"use client";

import { notFound, useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { SalesTab } from "@/components/event/SalesTab";
import { AttendeesTab } from "@/components/event/AttendeesTab";
import { RefundsTab } from "@/components/event/RefundsTab";
import { ScannerTab } from "@/components/event/ScannerTab";
import { PromoteTab } from "@/components/event/PromoteTab";
import { getEventById } from "@/lib/mockData";
import { formatDateTime, formatMad } from "@/lib/format";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const event = getEventById(params.id);
  if (!event) notFound();

  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  const revenue = event.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );
  const conversion = event.pageViews > 0 ? (sold / event.pageViews) * 100 : 0;

  return (
    <>
      <TopBar
        title={event.name}
        eyebrow="Événement"
        showBack
        liveDot={event.status === "live"}
      />

      {/* Header banner — full-bleed with gradient warmth */}
      <div className="relative bg-surface bg-hero-warm border-b border-line">
        <div className="px-4 md:px-8 py-7 md:py-9 max-w-content mx-auto fade-up">
          {event.status === "rejected" && event.rejectionReason ? (
            <div className="mb-5 bg-error/[0.04] border border-error/20 rounded-md px-4 py-3 text-[13px] text-error/90 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v4M8 11v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <strong className="font-semibold">Événement refusé. </strong>
                {event.rejectionReason}
              </div>
            </div>
          ) : null}
          {event.status === "pending" ? (
            <div className="mb-5 bg-info/[0.04] border border-info/20 rounded-md px-4 py-3 text-[13px] text-info flex items-center gap-2.5">
              <span className="live-dot" style={{ background: "#253E86" }} />
              Cet événement est en file de modération. SLA 24 heures.
            </div>
          ) : null}

          <div className="grid md:grid-cols-[220px_1fr] gap-6 md:gap-8">
            <div
              className="aspect-[4/5] bg-gradient-to-br from-line/40 to-line/80 border border-line rounded-lg overflow-hidden relative"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-hero-royal opacity-60" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={event.status} />
                <span className="chip uppercase tracking-badge text-muted text-[10px]">
                  {event.category.replace("_", " ")}
                </span>
                <span className="chip uppercase tracking-badge text-muted text-[10px]">
                  {event.agePolicy}
                </span>
              </div>
              <h2 className="h-hero text-[28px] md:text-[40px] text-ink mt-3 max-w-3xl">
                {event.name}
              </h2>
              <div className="text-[13px] text-muted mt-2 num flex items-center gap-2 flex-wrap">
                <span>{formatDateTime(event.startsAt)}</span>
                <span className="text-line-strong">·</span>
                <span>
                  {event.venue.name}, {event.venue.city}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-10 gap-y-4 mt-7 num pt-5 border-t border-line">
                <KeyStat label="Vendus" value={`${sold}`} accent />
                <KeyStat label="Restants" value={`${cap - sold}`} />
                <KeyStat label="Revenu" value={formatMad(revenue)} />
                <KeyStat
                  label="Conversion"
                  value={`${conversion.toFixed(1)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-8 py-7 max-w-content mx-auto">
        <Tabs
          tabs={[
            { id: "sales", label: "Ventes", content: <SalesTab event={event} /> },
            {
              id: "attendees",
              label: "Participants",
              count: sold,
              content: <AttendeesTab />,
            },
            {
              id: "refunds",
              label: "Remboursements",
              content: <RefundsTab event={event} />,
            },
            { id: "scanner", label: "Scanner", content: <ScannerTab /> },
            {
              id: "promote",
              label: "Promouvoir",
              content: <PromoteTab event={event} />,
            },
          ]}
        />
      </div>
    </>
  );
}

function KeyStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="eyebrow text-muted-2">{label}</div>
      <div
        className={[
          "h-display text-[22px] md:text-[26px] mt-1.5",
          accent ? "text-ink" : "text-ink",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
