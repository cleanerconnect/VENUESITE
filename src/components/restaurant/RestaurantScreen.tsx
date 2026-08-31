"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { ScreenSpec } from "@/lib/dashboard/spec";
import { containsBlockType } from "@/lib/dashboard/traverse";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";
import type { CommandHandler } from "@/components/dashboard/commands";
import { useToast } from "@/components/ui/Toast";

// Client boundary for the restaurant workspace.
//
// The spec arrives from the server as plain JSON; this supplies the
// verbs its buttons refer to. Floor actions are optimistic in the real
// build (seat the party, then reconcile) — here they resolve to the same
// toast vocabulary the rest of the demo uses, which keeps the command
// surface honest about what is wired and what isn't.
export function RestaurantScreen({ spec }: { spec: ScreenSpec }) {
  const router = useRouter();
  const { toast } = useToast();

  const commands = useMemo<Record<string, CommandHandler>>(
    () => ({
      "reservation.seat": () => {
        toast({ tone: "success", title: "Table installée" });
        router.refresh();
      },
      "reservation.remind": () =>
        toast({ tone: "info", title: "Rappel SMS envoyé au client" }),
      "reservation.cancel": () =>
        toast({ tone: "danger", title: "Réservation annulée" }),
      "table.seat": () => {
        toast({ tone: "success", title: "Prochaine arrivée placée" });
        router.refresh();
      },
      "table.clear": () => {
        toast({ tone: "success", title: "Table marquée comme débarrassée" });
        router.refresh();
      },
      "review.reply": () =>
        toast({ tone: "info", title: "Réponse enregistrée" }),
      "nudge.dismiss": () =>
        toast({ tone: "info", title: "Suggestion ignorée" }),
      "floor.seat": () =>
        toast({ tone: "info", title: "Aucune arrivée en attente" }),
    }),
    [router, toast],
  );

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
