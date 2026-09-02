"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildScreen, type ScreenContext } from "@/lib/restaurant/screens";
import type { RestaurantOverview } from "@/lib/types/restaurant";
import { containsBlockType } from "@/lib/dashboard/traverse";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";
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
  context = {},
}: {
  slug: string;
  data: RestaurantOverview;
  /** Business Service slices this screen needs, fetched server-side. */
  context?: Omit<ScreenContext, "overview">;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const data = useHydrateRestaurant(serverData);
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

  const commands = useMemo<Record<string, CommandHandler>>(() => {
    const store = useRestaurantStore.getState;

    // Every mutating verb closes the sheet it may have been fired from,
    // then offers a real undo — the store keeps the prior payload.
    const withUndo = (title: string, tone: "success" | "danger" = "success") => {
      closeDetail();
      toast({ tone, title, undo: () => useRestaurantStore.getState().undo() });
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
        void markGuestArrived(id).then((result) => {
          if (result.ok) return;
          useRestaurantStore.getState().undo();
          toast({ tone: "danger", title: result.message ?? COPY.form.savingFailed });
        });
      },

      "reservation.confirm": (payload) => {
        const before = store().data;
        store().confirmReservation(String(payload?.id ?? ""));
        if (store().data === before) return;
        withUndo(COPY.toast.confirmed);
      },

      "reservation.cancel": (payload) => {
        const before = store().data;
        store().cancelReservation(String(payload?.id ?? ""));
        if (store().data === before) return;
        withUndo(COPY.toast.cancelled, "danger");
      },

      "reservation.reject": (payload) =>
        setRejectTarget({
          id: String(payload?.id ?? ""),
          guestName: String(payload?.name ?? "Ce client"),
        }),

      "reservation.noShow": (payload) => {
        const before = store().data;
        store().reportNoShow(String(payload?.id ?? ""));
        if (store().data === before) return;
        withUndo(COPY.toast.noShow, "danger");
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

      "review.reply": () => toast({ tone: "info", title: COPY.toast.replySaved }),
      "nudge.dismiss": () => toast({ tone: "info", title: COPY.toast.nudgeDismissed }),
      "route.refresh": () => router.refresh(),
    };
  }, [closeDetail, router, toast]);

  if (!spec) return null;

  // A screen that opens with its own greeting card supplies the heading
  // itself; anything else gets the standard page header. Checked against
  // the whole tree because the greeting usually sits inside a split.
  const selfTitled = containsBlockType(spec.blocks, "greeting");

  return (
    <>
      {selfTitled ? null : (
        <header className="mb-6 md:mb-7">
          <h1 className="text-h1 text-ink">{spec.title}</h1>
          {spec.subtitle ? (
            <p className="text-body text-ink-soft mt-2">{spec.subtitle}</p>
          ) : null}
        </header>
      )}
      <DashboardRenderer spec={spec} commands={commands} />

      <RejectBookingDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          const before = useRestaurantStore.getState().data;
          useRestaurantStore
            .getState()
            .rejectReservation(rejectTarget.id, REJECTION_REASONS[reason]);
          if (useRestaurantStore.getState().data === before) return;
          closeDetail();
          toast({
            tone: "danger",
            title: COPY.toast.rejected,
            description: REJECTION_REASONS[reason],
            undo: () => useRestaurantStore.getState().undo(),
          });
        }}
      />
    </>
  );
}
