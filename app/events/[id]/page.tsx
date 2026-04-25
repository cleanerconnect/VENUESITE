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
      <TopBar title={event.name} showBack />

      {/* Header banner */}
      <div className="border-b border-line bg-surface">
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-content mx-auto">
          {event.status === "rejected" && event.rejectionReason ? (
            <div className="mb-4 bg-error/5 border border-error/30 px-4 py-3 text-sm text-error">
              <strong className="font-semibold">Refusé : </strong>
              {event.rejectionReason}
            </div>
          ) : null}
          {event.status === "pending" ? (
            <div className="mb-4 bg-info/5 border border-info/30 px-4 py-3 text-sm text-info">
              Cet événement est en file de modération. SLA 24 h.
            </div>
          ) : null}

          <div className="grid md:grid-cols-[200px_1fr] gap-6">
            <div
              className="aspect-[4/5] bg-line/40 border border-line"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={event.status} />
                <span className="text-xs text-muted uppercase tracking-badge">
                  {event.category.replace("_", " ")}
                </span>
              </div>
              <h2 className="h-serif text-2xl md:text-3xl text-ink mt-2">
                {event.name}
              </h2>
              <div className="text-sm text-muted mt-1">
                {formatDateTime(event.startsAt)} · {event.venue.name},{" "}
                {event.venue.city}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 num">
                <KeyStat label="Vendus" value={`${sold}`} />
                <KeyStat label="Restants" value={`${cap - sold}`} />
                <KeyStat label="Revenu" value={formatMad(revenue)} />
                <KeyStat
                  label="Conversion"
                  value={`${conversion.toFixed(1)} %`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto">
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

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-badge text-muted">
        {label}
      </div>
      <div className="h-serif text-xl text-ink mt-1">{value}</div>
    </div>
  );
}
