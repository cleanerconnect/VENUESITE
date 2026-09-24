// Which lot this deployment is running, resolved server side.
//
// The portal ships in two lots. Lot 1 is the *Dashboard basique* of
// Planning Lyfe V3, sprint Prio 02, 12 to 30 October 2026 —
// « Authentification + Création de Venue + Gestion des reservation
// uniquement », `docs/reference/Planning_Lyfe_V3_20260923.xlsx`. Lot 2
// is the rest of the venue dashboard: designed, built and rendered in
// this repo, but handed over as front-end and design for the advanced
// dashboards of sprint Prio 08.
//
// `LYFE_LOT` decides which of the two a running instance is. It
// defaults to 1, so a cold clone shows the contracted product and a
// reviewer has to opt in to see the rest — the opposite default would
// mean every demo silently over-promises.
//
// One rule, resolved once:
//
//   1  Lot 2 routes are not registered, their nav entries do not
//      render, and the sidebar shows the four groups holding the seven
//      Prio 02 screens
//   2  everything renders
//
// Deliberately not a per-venue setting. The lot is a commercial fact
// about the delivery, not a property of an establishment, and putting it
// in `venue_settings` would have invited one venue to be sold Lot 2
// while the Business Service answered for Lot 1.

import "server-only";

import { DEFAULT_LOT, type Lot } from "./shared";

export { DEFAULT_LOT, LOT_LABEL } from "./shared";
export type { Lot };

/**
 * The lot in force.
 *
 * Anything other than `2` is Lot 1, including an unset, empty or
 * misspelt value: a typo in an environment variable must not be the
 * thing that publishes fourteen unsold screens.
 */
export function activeLot(): Lot {
  return process.env.LYFE_LOT?.trim() === "2" ? 2 : DEFAULT_LOT;
}

/** Human-readable reason, for /api/health and the dev banner. */
export function activeLotReason(): string {
  const raw = process.env.LYFE_LOT?.trim();
  if (raw === "2") return "LYFE_LOT=2 — tableau de bord complet";
  if (raw && raw !== "1") {
    return `LYFE_LOT=${raw} non reconnu — lot 1 par défaut`;
  }
  return raw === "1" ? "LYFE_LOT=1 — périmètre contractuel" : "lot 1 par défaut";
}
