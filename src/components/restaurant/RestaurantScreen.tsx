"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { buildScreen } from "@/lib/restaurant/screens";
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
}: {
  slug: string;
  data: RestaurantOverview;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const data = useHydrateRestaurant(serverData);
  const closeDetail = useDetailStore((s) => s.close);

  const spec = useMemo(() => buildScreen(slug, data), [slug, data]);

  const commands = useMemo<Record<string, CommandHandler>>(() => {
    const store = useRestaurantStore.getState;

    // Every mutating verb closes the sheet it may have been fired from,
    // then offers a real undo — the store keeps the prior payload.
    const withUndo = (title: string, tone: "success" | "danger" = "success") => {
      closeDetail();
      toast({ tone, title, undo: () => useRestaurantStore.getState().undo() });
    };

    return {
      "reservation.seat": (payload) => {
        const id = String(payload?.id ?? "");
        const before = store().data;
        store().seatReservation(id);
        if (store().data === before) {
          toast({ tone: "info", title: "Aucune table libre pour cette table" });
          return;
        }
        withUndo("Table installée");
      },

      "reservation.confirm": (payload) => {
        const before = store().data;
        store().confirmReservation(String(payload?.id ?? ""));
        if (store().data === before) return;
        withUndo("Réservation confirmée");
      },

      "reservation.cancel": (payload) => {
        const before = store().data;
        store().cancelReservation(String(payload?.id ?? ""));
        if (store().data === before) return;
        withUndo("Réservation annulée", "danger");
      },

      "reservation.remind": () =>
        toast({ tone: "info", title: "Rappel SMS envoyé au client" }),

      "table.clear": (payload) => {
        const before = store().data;
        store().clearTable(String(payload?.id ?? ""));
        if (store().data === before) return;
        withUndo("Table libérée");
      },

      "floor.seat": () => {
        const result = store().seatNextWaiting();
        if (!result) {
          toast({
            tone: "info",
            title: "Rien à placer",
            description: "Liste d'attente vide ou aucune table assez grande.",
          });
          return;
        }
        withUndo(`${result.seated} installé en ${result.table}`);
      },

      "review.reply": () => toast({ tone: "info", title: "Réponse enregistrée" }),
      "nudge.dismiss": () => toast({ tone: "info", title: "Suggestion ignorée" }),
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
    </>
  );
}
