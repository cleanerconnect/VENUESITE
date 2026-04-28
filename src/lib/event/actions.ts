// Per-state action menus rendered in the kebab on Mes événements rows
// and the Event Detail page. The shape is data-only so the UI layer can
// drive icons + onClick handlers from a single switch.
//
// Adding a new state? Extend the union in domain.ts and add a case here;
// every screen using getEventActions() gets the correct menu for free.

import type { EventState } from "@/lib/types/domain";

export type EventActionId =
  | "view"
  | "edit"
  | "duplicate"
  | "delete"
  | "cancel_submission"
  | "fix_and_resubmit"
  | "view_public"
  | "qr_poster"
  | "cancel_event"
  | "scan"
  | "view_summary"
  | "download_report"
  | "download_statement";

export interface EventAction {
  id: EventActionId;
  label: string;
  /** Treat as destructive — render in danger tone in the menu. */
  destructive?: boolean;
}

export function getEventActions(state: EventState): EventAction[] {
  switch (state) {
    case "draft":
      return [
        { id: "edit", label: "Modifier" },
        { id: "duplicate", label: "Dupliquer" },
        { id: "delete", label: "Supprimer", destructive: true },
      ];
    case "in_review":
      return [
        { id: "view", label: "Voir" },
        { id: "cancel_submission", label: "Annuler la soumission" },
      ];
    case "rejected":
      return [
        { id: "fix_and_resubmit", label: "Corriger et resoumettre" },
        { id: "duplicate", label: "Dupliquer" },
        { id: "delete", label: "Supprimer", destructive: true },
      ];
    case "on_sale":
      return [
        { id: "edit", label: "Modifier" },
        { id: "duplicate", label: "Dupliquer" },
        { id: "view_public", label: "Voir la page publique" },
        { id: "qr_poster", label: "Affiche QR" },
        { id: "cancel_event", label: "Annuler l'événement", destructive: true },
      ];
    case "live":
      return [
        { id: "view", label: "Voir" },
        { id: "scan", label: "Scanner" },
        { id: "cancel_event", label: "Annuler", destructive: true },
      ];
    case "past":
      return [
        { id: "view_summary", label: "Voir le bilan" },
        { id: "download_report", label: "Télécharger le rapport" },
        { id: "duplicate", label: "Dupliquer" },
      ];
    case "settled":
      return [
        { id: "view_summary", label: "Voir le bilan" },
        { id: "download_statement", label: "Télécharger le relevé" },
      ];
    case "cancelled":
      return [
        { id: "view", label: "Voir" },
        { id: "duplicate", label: "Dupliquer" },
      ];
  }
}
