// Mock advisor — the behaviour the demo ships with.
//
// It reads the same payload the real adapter does and derives its advice
// arithmetically. That is on purpose: the mock stays truthful as the demo
// data changes, and it documents what the model is being asked to work
// out. Anything the mock cannot compute is what the model is actually for.

import type { RestaurantOverview } from "@/lib/types/restaurant";
import type { AiAdvisor } from "./advisor";
import type {
  NoShowRisk,
  ReviewDigest,
  ServiceAnomaly,
  ServiceNudge,
} from "./schemas";
import { mockResponse, makeStream } from "@/lib/mock/assistant";

export class MockAdvisor implements AiAdvisor {
  async serviceNudge(data: RestaurantOverview): Promise<ServiceNudge | null> {
    const waiting = data.waitlist.reduce((n, r) => n + r.partySize, 0);
    if (waiting === 0) return null;

    // Remaining capacity on the service, not free tables: LYFE knows how
    // many covers are bookable, not which table is occupied.
    const seatable = Math.max(
      0,
      data.currentService.capacity - data.currentService.bookedCovers,
    );
    const recoverable = Math.min(waiting, seatable);
    const value = Math.round(recoverable * data.averageTicket.amountMad);

    return {
      headline: `${waiting} couverts en liste d'attente.`,
      body: `${seatable} couverts encore disponibles sur ce service. Les confirmer récupère ${recoverable} couverts, soit ≈ ${value.toLocaleString("fr-FR")} MAD.`,
      ctaLabel: "Traiter la liste d'attente →",
      target: "reservations",
      confidence: recoverable > 0 ? 0.82 : 0.2,
    };
  }

  async noShowRisk(data: RestaurantOverview): Promise<NoShowRisk> {
    return {
      scores: [...data.upcomingReservations, ...data.waitlist].map((r) => ({
        reservationId: r.id,
        risk: r.noShowRisk ?? 0,
        rationale:
          r.visits === 0
            ? "Premier passage, aucun acompte"
            : `${r.visits} visites précédentes`,
      })),
    };
  }

  async reviewDigest(data: RestaurantOverview): Promise<ReviewDigest> {
    const byTheme = new Map<string, typeof data.reviews>();
    for (const review of data.reviews) {
      for (const tag of review.tags) {
        byTheme.set(tag, [...(byTheme.get(tag) ?? []), review]);
      }
    }

    return {
      clusters: [...byTheme.entries()].map(([theme, reviews]) => {
        const avg =
          reviews.reduce((n, r) => n + r.rating, 0) / Math.max(1, reviews.length);
        return {
          theme,
          sentiment: avg >= 4 ? "positive" : avg >= 3 ? "mixed" : "negative",
          count: reviews.length,
          exemplar: reviews[0]?.comment ?? "",
        };
      }),
      summary: `${data.reviews.length} avis sur la période, note moyenne ${data.rating.average.toFixed(1).replace(".", ",")} / 5.`,
    };
  }

  async anomalies(data: RestaurantOverview): Promise<ServiceAnomaly> {
    const anomalies: ServiceAnomaly["anomalies"] = [];
    const service = data.currentService;

    const perSlot = Math.round(service.capacity / 4);
    const over = service.slotLoad.filter((s) => s.covers > perSlot);
    if (over.length > 0) {
      anomalies.push({
        kind: "covers",
        summary: `${over.length} créneau(x) au-dessus de ${perSlot} couverts.`,
        severity: "warning",
        affected: over.map((s) => s.at),
      });
    }

    const pending = data.upcomingReservations.filter(
      (r) => r.state === "requested",
    );
    if (pending.length > 0) {
      anomalies.push({
        kind: "pacing",
        summary: `${pending.length} demande(s) en attente de réponse.`,
        severity: "info",
        affected: pending.map((r) => r.id),
      });
    }

    return { anomalies };
  }

  async *assistant(prompt: string): AsyncIterable<string> {
    // Reuses the existing canned streamer so the typing UI behaves the
    // same whether or not a key is configured.
    const next = makeStream(mockResponse(prompt));
    for (;;) {
      const { chunk, done } = next();
      if (chunk) yield chunk;
      if (done) return;
      await new Promise((r) => setTimeout(r, 14));
    }
  }
}
