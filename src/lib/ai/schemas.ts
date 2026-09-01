// The AI contract.
//
// Every AI surface in the restaurant workspace produces structured data,
// never free text that a component has to parse. These Zod schemas are
// the contract in both directions: they generate the JSON schema Claude
// is constrained to, and they validate what comes back before it reaches
// a screen builder.
//
// That matters more here than in a chat product. A nudge is rendered into
// a card with a CTA; a risk score drives a badge and a sort order. A
// model returning prose where a number was expected must fail loudly at
// the boundary, not paint a broken tile.

import { z } from "zod";

/** Assistant advice for the service in progress — the violet-soft card. */
export const ServiceNudgeSchema = z.object({
  /** Leading bold clause. One sentence, states the observation. */
  headline: z.string(),
  /** The recommendation and its expected effect, with the numbers. */
  body: z.string(),
  /** Imperative CTA label, e.g. "Placer la liste d'attente →". */
  ctaLabel: z.string(),
  /** Which screen resolves it. Must be a slug the workspace serves. */
  target: z.enum(["salle", "reservations", "menu", "avis", "services"]),
  /** 0·1. Below the display threshold the card is suppressed. */
  confidence: z.number().min(0).max(1),
});
export type ServiceNudge = z.infer<typeof ServiceNudgeSchema>;

/** Per-reservation no-show likelihood, driving the badge and the SMS prompt. */
export const NoShowRiskSchema = z.object({
  scores: z.array(
    z.object({
      reservationId: z.string(),
      /** 0·1. The UI badges >= 0.3. */
      risk: z.number().min(0).max(1),
      /** One clause a human can check the model against. */
      rationale: z.string(),
    }),
  ),
});
export type NoShowRisk = z.infer<typeof NoShowRiskSchema>;

/** Themed clustering over guest reviews, for the Avis screen. */
export const ReviewDigestSchema = z.object({
  clusters: z.array(
    z.object({
      theme: z.string(),
      sentiment: z.enum(["positive", "mixed", "negative"]),
      /** How many reviews in the window carry the theme. */
      count: z.number().int().min(0),
      /** A verbatim quote — the operator should see the evidence. */
      exemplar: z.string(),
    }),
  ),
  /** Actionable summary for the operator, two sentences at most. */
  summary: z.string(),
});
export type ReviewDigest = z.infer<typeof ReviewDigestSchema>;

/** Deviations worth a manager's attention, feeding the activity rail. */
export const ServiceAnomalySchema = z.object({
  anomalies: z.array(
    z.object({
      kind: z.enum(["cancellations", "pacing", "turn_time", "covers", "menu"]),
      summary: z.string(),
      severity: z.enum(["info", "warning", "critical"]),
      /** Ids the anomaly concerns — reservations, tables or menu items. */
      affected: z.array(z.string()),
    }),
  ),
});
export type ServiceAnomaly = z.infer<typeof ServiceAnomalySchema>;
