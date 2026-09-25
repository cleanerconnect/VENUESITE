"use client";

import type { ScreenSpec } from "@/lib/dashboard/spec";
import { containsBlockType } from "@/lib/dashboard/traverse";
import { DashboardRenderer } from "@/components/dashboard/DashboardRenderer";
import { FormDialog } from "@/components/dashboard/FormDialog";
import { useVenueCommands } from "./useVenueCommands";

// A spec screen outside the workspace registry.
//
// Fiche client is built per guest rather than per slug, so it does not
// go through `RestaurantScreen`'s slug lookup and optimistic store. It
// still gets the same renderer, the same command registry and the same
// form dialog — which is what stops a detail route from becoming a
// second, subtly different way of doing all of this.
export function RestaurantSpecScreen({ spec }: { spec: ScreenSpec }) {
  const commands = useVenueCommands(spec);
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
      <FormDialog />
    </>
  );
}
