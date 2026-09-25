// The lot the tools check against.
//
// Every tool here walks a list of screens. Which screens exist depends
// on `LYFE_LOT`, so the list is derived from the route index rather than
// typed into each tool — and the same variable has to be set for the
// server under test, or the tool will ask for screens the build does not
// register and call the 404s a failure.
//
//   node tools/verify/walk.mjs                 # lot 1, the default
//   LYFE_LOT=2 node tools/verify/walk.mjs      # the full dashboard
//
// Mirrors `src/lib/lot/index.ts`: anything that is not "2" is lot 1.

import { ROUTES } from "../../src/lib/nav/routes.ts";

export const LOT = process.env.LYFE_LOT?.trim() === "2" ? 2 : 1;

export const LOT_LABEL = LOT === 2 ? "lot 2 · complet" : "lot 1 · contractuel";

/** Whether the build under test registers this route. */
export const inLot = (route) => LOT === 2 || route.lot === 1;

/** Venue screens this lot registers, as `[slugPath, label]` pairs. */
export function venueScreens() {
  return ROUTES.filter((r) => r.workspace === "venue" && inLot(r)).map((r) => [
    r.path.replace(/^\/restaurant/, ""),
    r.label,
  ]);
}

/** The same list as bare paths, for the tools that only need those. */
export function venuePaths() {
  return venueScreens().map(([path]) => path);
}
