"use client";

// The demo state switch.
//
// An external team reproducing this portal has to be able to *see* what
// a failed load looks like, and what an empty reservation day looks
// like. Those states are unreachable in a healthy demo, so without a way
// to force them they get built once, never looked at, and rot.
//
// `?etat=` on any route forces one for the whole page:
//
//   ?etat=chargement   every query stays pending
//   ?etat=vide         every list comes back empty
//   ?etat=erreur       every query fails
//
// French in the URL because the audience is the same French-speaking
// partner the rest of the portal addresses, and a debug affordance in a
// second language is a second vocabulary to learn.
//
// This is a demo affordance, not a feature flag: it is read from the URL
// only, never persisted, and it cannot change what a real backend
// returns.

export const DEMO_STATES = ["chargement", "vide", "erreur"] as const;
export type DemoState = (typeof DEMO_STATES)[number];

export const DEMO_STATE_PARAM = "etat";

export const DEMO_STATE_LABEL: Record<DemoState, string> = {
  chargement: "Chargement",
  vide: "Vide",
  erreur: "Erreur",
};

export function parseDemoState(value: string | null | undefined): DemoState | null {
  return DEMO_STATES.includes(value as DemoState) ? (value as DemoState) : null;
}
