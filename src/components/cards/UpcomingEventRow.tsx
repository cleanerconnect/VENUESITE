"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Megaphone, MoreVertical } from "lucide-react";
import type { LyfeEvent } from "@/lib/types/domain";
import { Pill, StatusPill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { CancelEventDialog } from "@/components/event/CancelEventDialog";
import { getCampaigns } from "@/lib/mock/visibility";
import { getEventActions, type EventActionId } from "@/lib/event/actions";
import { formatDateTimeFR, formatMAD } from "@/lib/utils/format";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

// 96px-tall row card. Hover lifts. Click goes to event detail.
export function UpcomingEventRow({ event }: { event: LyfeEvent }) {
  const router = useRouter();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);

  const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = event.tiers.reduce((s, t) => s + t.quantity, 0);
  const revenue = event.tiers.reduce(
    (s, t) => s + t.sold * t.faceValueMad,
    0,
  );
  const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0;
  // Whether at least one paid campaign is currently active for this event.
  const activeBoosts = getCampaigns().filter(
    (c) => c.eventId === event.id && c.status === "active",
  ).length;
  const actions = getEventActions(event.status.state);

  const handleAction = (id: EventActionId) => {
    switch (id) {
      case "view":
      case "edit":
        // Edit reuses the wizard scaffolding via the /edit route.
        if (id === "edit") router.push(`/events/${event.id}/edit`);
        else router.push(`/events/${event.id}`);
        return;
      case "fix_and_resubmit":
        router.push(`/events/${event.id}/edit?reason=rejected`);
        return;
      case "duplicate":
        router.push(`/events/new?duplicateFrom=${event.id}`);
        return;
      case "cancel_event":
        setCancelOpen(true);
        return;
      case "scan":
        // Real wiring: open ScannerModal scoped to this event. For demo
        // we just navigate to the detail page where the Scanner tab lives.
        router.push(`/events/${event.id}#scanner`);
        return;
      case "view_summary":
        router.push(`/events/${event.id}#bilan`);
        return;
      default:
        toast({ tone: "info", title: "Action non disponible en démo" });
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative bg-surface border border-line rounded-[var(--radius-lg)] hover:shadow-soft transition-shadow">
          <Link
            href={`/events/${event.id}`}
            className="block p-4"
          >
            <div className="flex items-center gap-4">
              {/* Thumbnail, 80x80, gradient placeholder */}
              <div
                className="hidden sm:block w-20 h-20 rounded-[12px] shrink-0 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-violet-soft), var(--color-tint-sky))",
                }}
                aria-hidden
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(201,166,76,0.45), transparent 70%)",
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-h3 text-ink truncate">{event.name}</h4>
                  <StatusPill status={event.status} />
                  {activeBoosts > 0 ? (
                    <Pill tone="info">
                      <Megaphone size={11} strokeWidth={2} className="-ml-0.5" />
                      Boost actif
                    </Pill>
                  ) : null}
                </div>
                <div className="text-meta text-ink-mute mt-1 num">
                  {formatDateTimeFR(event.startsAt)} · {event.venue.name},{" "}
                  {event.venue.city}
                </div>

                {cap > 0 ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 max-w-[280px]">
                      <ProgressBar value={sold} max={cap} tone="gold" size="xs" />
                    </div>
                    <div className="text-meta text-ink-soft num shrink-0">
                      <span className="font-bold text-ink">{sold}</span>
                      <span className="text-ink-mute"> / {cap}</span>
                      <span className="ml-2 text-ink-mute">·</span>
                      <span className="ml-2 font-semibold">{pct}%</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                <div className="text-eyebrow text-ink-mute">Revenu</div>
                <div className="text-h3 text-ink num">{formatMAD(revenue)}</div>
              </div>

              {/* Spacer where the kebab visually sits — actual kebab is
                  rendered absolutely outside the Link to avoid nested
                  interactive elements. */}
              <div className="w-9 h-9 shrink-0" aria-hidden />
            </div>
          </Link>

          {/* Kebab menu, absolutely positioned so it lives outside the
              <Link>. Actions list is data-driven from getEventActions. */}
          <div className="absolute top-4 right-4">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute transition-colors"
                  aria-label="Actions"
                >
                  <MoreVertical size={16} strokeWidth={1.8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="min-w-[220px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
                >
                  {actions.map((a) => (
                    <DropdownMenu.Item
                      key={a.id}
                      onSelect={() => handleAction(a.id)}
                      className={cn(
                        "px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px] hover:bg-ink/[0.04] cursor-pointer outline-none",
                        a.destructive ? "text-danger" : "text-ink",
                      )}
                    >
                      {a.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </motion.div>

      <CancelEventDialog
        event={event}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
    </>
  );
}
