"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildScreen, type ScreenContext } from "@/lib/restaurant/screens";
import type { RestaurantOverview } from "@/lib/types/restaurant";
import { containsBlockType } from "@/lib/dashboard/traverse";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";
import { ActionControl } from "@/components/dashboard/primitives";
import type { CommandHandler } from "@/components/dashboard/commands";
import { useDetailStore } from "@/lib/stores/detail";
import {
  useHydrateRestaurant,
  useRestaurantStore,
} from "@/lib/restaurant/store";
import { useToast } from "@/components/ui/Toast";
import {
  RejectBookingDialog,
  type RejectTarget,
} from "./RejectBookingDialog";
import { REJECTION_REASONS } from "@/lib/types/business";
import { COPY } from "@/lib/copy/fr";
import { markGuestArrived } from "@/app/actions/checkin";
import {
  cancelBooking,
  confirmBooking,
  rejectBooking,
  reportNoShowBooking,
} from "@/app/actions/bookings";
import { FormDialog } from "@/components/dashboard/FormDialog";
import { useVenueCommands } from "./useVenueCommands";

// Client boundary for the restaurant workspace.
//
// The server renders the first paint from its own payload; from there the
// client owns an optimistic copy, and the screen is re-derived from it by
// the same pure builder. So an action doesn't patch a widget — it changes
// the data, and every surface reading that data moves at once: seating a
// party turns the table orange on the plan, drops the free-seat count,
// raises seated covers in the hero ring, and pushes a line onto the
// activity feed, in one render.
export function RestaurantScreen({
  slug,
  data: serverData,
  context,
}: {
  slug: string;
  data: RestaurantOverview;
  /** Business Service slices this screen needs, fetched server-side. */
  context: Omit<ScreenContext, "overview">;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const data = useHydrateRestaurant(serverData, context.configuration);
  const closeDetail = useDetailStore((s) => s.close);

  // Business slices are fetched server-side and passed through unchanged;
  // only the service payload is re-derived from the optimistic copy.
  // Refusal needs a reason before it can be applied, so the command opens
  // a dialog instead of mutating; the store call happens on confirm.
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);

  const spec = useMemo(
    () => buildScreen(slug, { ...context, overview: data }),
    [slug, context, data],
  );

  const serverCommands = useVenueCommands(spec);

  const commands = useMemo<Record<string, CommandHandler>>(() => {
    const store = useRestaurantStore.getState;

    // Every mutating verb closes the sheet it may have been fired from,
    // then offers a real undo — the store keeps the prior payload.
    const withUndo = (title: string, tone: "success" | "danger" = "success") => {
      closeDetail();
      toast({ tone, title, undo: () => useRestaurantStore.getState().undo() });
    };

    // The write goes out behind the optimistic update; if the server
    // refuses it, the store's own undo snapshot puts the row back and
    // the host is told why. Without this the four decisions on a row
    // lived in one browser until the next reload.
    const persist = (pending: Promise<{ ok: boolean; message?: string }>) => {
      void pending.then((result) => {
        if (result.ok) return;
        useRestaurantStore.getState().undo();
        toast({
          tone: "danger",
          title: result.message ?? COPY.form.savingFailed,
        });
      });
    };

    return {
      "reservation.arrive": (payload) => {
        const id = String(payload?.id ?? "");
        const before = store().data;
        store().markArrived(id);
        if (store().data === before) return;
        withUndo(COPY.toast.arrived);
        // Persist behind the optimistic update, and roll back if the
        // server refuses. A check-in that lives only in this browser
        // would let the same guest through twice.
        persist(markGuestArrived(id));
      },

      "reservation.confirm": (payload) => {
        const id = String(payload?.id ?? "");
        const before = store().data;
        store().confirmReservation(id);
        if (store().data === before) return;
        withUndo(COPY.toast.confirmed);
        persist(confirmBooking(id));
      },

      "reservation.cancel": (payload) => {
        const id = String(payload?.id ?? "");
        const before = store().data;
        store().cancelReservation(id);
        if (store().data === before) return;
        withUndo(COPY.toast.cancelled, "danger");
        persist(cancelBooking(id));
      },

      "reservation.reject": (payload) =>
        setRejectTarget({
          id: String(payload?.id ?? ""),
          guestName: String(payload?.name ?? "Ce client"),
        }),

      "reservation.noShow": (payload) => {
        const id = String(payload?.id ?? "");
        const before = store().data;
        store().reportNoShow(id);
        if (store().data === before) return;
        withUndo(COPY.toast.noShow, "danger");
        persist(reportNoShowBooking(id));
      },

      "reservation.remind": () =>
        toast({ tone: "info", title: COPY.toast.reminderSent }),

      "customers.export": () =>
        toast({
          tone: "info",
          title: COPY.toast.exportQueued,
          description: COPY.toast.exportQueuedBody,
        }),

      "customer.call": (payload) => {
        const phone = String(payload?.phone ?? "");
        if (phone && typeof window !== "undefined") {
          window.location.href = `tel:${phone.replace(/\s/g, "")}`;
        }
      },

      "availability.toggleSlot": () => {
        toast({ tone: "success", title: COPY.toast.slotUpdated });
        router.refresh();
      },

      "availability.removeClosure": () => {
        toast({ tone: "success", title: COPY.toast.closureRemoved });
        router.refresh();
      },

      "boost.start": () =>
        toast({ tone: "success", title: COPY.toast.boostStarted }),

      "boost.stop": () =>
        toast({ tone: "info", title: COPY.toast.boostStopped }),

      "waitlist.admitNext": () => {
        const result = store().admitNextWaiting();
        if (!result) {
          toast({
            tone: "info",
            title: COPY.toast.nothingToConfirm,
            description: "Liste d'attente vide ou service complet.",
          });
          return;
        }
        withUndo(
          `${result.admitted} confirmé · ${result.partySize} couverts`,
        );
      },

      // Walking the book. The day lives in the URL rather than in
      // component state, so the back button steps through the days a
      // partner looked at and a link to one opens on that day.
      "reservations.day": (payload) => {
        const value = String(payload?.value ?? "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
        const params = new URLSearchParams(window.location.search);
        params.set("jour", value);
        // A service id names the day it was resolved for, so carrying
        // one across a day change would point at a service that day
        // does not run. Dropping it lets the new day choose its own.
        params.delete("service");
        router.push(`${window.location.pathname}?${params.toString()}`);
      },

      // Picking one of the day's services. Same reasoning as the day:
      // it belongs in the URL, so the book a partner is reading is a
      // thing they can link to and step back out of.
      "reservations.service": (payload) => {
        const value = String(payload?.value ?? "");
        if (!value) return;
        const params = new URLSearchParams(window.location.search);
        params.set("service", value);
        router.push(`${window.location.pathname}?${params.toString()}`);
      },

      "review.reply": () => toast({ tone: "info", title: COPY.toast.replySaved }),
      "nudge.dismiss": () => toast({ tone: "info", title: COPY.toast.nudgeDismissed }),
      "route.refresh": () => router.refresh(),

      // The server-backed verbs the venue perimeter added, shared with
      // the detail routes so a button behaves the same wherever it is.
      // Listed last, so the optimistic handlers above win where both
      // define a name.
      ...serverCommands,
    };
  }, [closeDetail, router, serverCommands, toast]);

  if (!spec) return null;

  // A screen that opens with its own greeting card supplies the heading
  // itself; anything else gets the standard page header. Checked against
  // the whole tree because the greeting usually sits inside a split.
  const selfTitled = containsBlockType(spec.blocks, "greeting");

  return (
    <>
      {selfTitled ? null : (
        <header className="mb-6 md:mb-7 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h1 text-ink">{spec.title}</h1>
            {spec.subtitle ? (
              <p className="text-body text-ink-soft mt-2">{spec.subtitle}</p>
            ) : null}
          </div>
          {spec.headerActions?.length ? (
            <div className="flex flex-wrap gap-2 shrink-0">
              {spec.headerActions.map((cta, i) => (
                <ActionControl key={`${cta.action.label}-${i}`} cta={cta} size="sm" />
              ))}
            </div>
          ) : null}
        </header>
      )}
      <DashboardRenderer spec={spec} commands={commands} />

      {/* Mounted once per screen, like the detail drawer. Any button
          whose command the spec declared a form for raises it. */}
      <FormDialog />

      <RejectBookingDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          const id = rejectTarget.id;
          const before = useRestaurantStore.getState().data;
          useRestaurantStore
            .getState()
            .rejectReservation(id, REJECTION_REASONS[reason]);
          if (useRestaurantStore.getState().data === before) return;
          closeDetail();
          toast({
            tone: "danger",
            title: COPY.toast.rejected,
            description: REJECTION_REASONS[reason],
            undo: () => useRestaurantStore.getState().undo(),
          });
          // The coded reason travels, not the label: `fully_booked`
          // aggregates, "Complet sur ce créneau" does not.
          void rejectBooking(id, reason).then((result) => {
            if (result.ok) return;
            useRestaurantStore.getState().undo();
            toast({
              tone: "danger",
              title: result.message ?? COPY.form.savingFailed,
            });
          });
        }}
      />
    </>
  );
}
