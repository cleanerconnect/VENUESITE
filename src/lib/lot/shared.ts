// The lot, client side.
//
// Split from `index.ts` because that module reads `process.env`, which
// does not exist in the browser: importing it into the chrome would have
// made every client component quietly resolve to Lot 1 whatever the
// server was running. What the client needs is the value the layout
// hands it, and the type to hold it in — both of which live here.

import type { Lot } from "@/lib/restaurant/slugs";

export type { Lot };

export const DEFAULT_LOT: Lot = 1;

export const LOT_LABEL: Record<Lot, string> = {
  1: "Lot 1 · périmètre contractuel",
  2: "Lot 2 · tableau de bord complet",
};
