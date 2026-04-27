"use client";

import { notFound, useParams } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill, Pill } from "@/components/ui/Pill";
import { SalesTab } from "@/components/event/SalesTab";
import { AttendeesTab } from "@/components/event/AttendeesTab";
import { RefundsTab } from "@/components/event/RefundsTab";
import { ScannerTab } from "@/components/event/ScannerTab";
import { PromoteTab } from "@/components/event/PromoteTab";
import { getEventById, getAllEvents } from "@/lib/mock/events";
import { formatDateTimeFR, formatMAD } from "@/lib/utils/format";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const event = getEventById(params.id) ?? getAllEvents().find((e) => e.id === params.id);
  if (!event) notFound();

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
      <div className="relative overflow-hidden border-b border-line-soft">
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
              "radial-gradient(circle, rgba(201,166,76,0.32), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 80% 100%, rgba(220,232,242,0.10), transparent 60%)",
          }}
        />

        <div className="relative px-4 md:px-8 py-10 md:py-14 max-w-[1440px] mx-auto">
          {event.status === "rejected" && event.rejectionReason ? (
            <div
              className="mb-6 rounded-[var(--radius-md)] p-4 max-w-2xl"
              style={{ background: "rgba(161,44,44,0.18)", color: "#FAF7F0" }}
            >
              <div className="text-eyebrow mb-1.5" style={{ color: "#F2DDD6" }}>
                Refusé par LYFE
              </div>
              <p className="text-[14px] leading-relaxed">
                {event.rejectionReason}
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
        <Tabs
          tabs={[
            {
              id: "sales",
              label: "Ventes",
              content: <SalesTab event={event} />,
            },
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
    </div>
  );
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
        style={{ color: "rgba(250,247,240,0.55)" }}
      >
        {label}
      </div>
      <div className="text-h2 text-canvas mt-1.5">{value}</div>
    </div>
  );
}
