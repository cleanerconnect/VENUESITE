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

    const seatable = data.tables
      .filter((t) => t.state === "free")
      .reduce((n, t) => n + t.seats, 0);
    const recoverable = Math.min(waiting, seatable);
    const value = Math.round(recoverable * data.averageTicket.amountMad);

    return {
      headline: `${waiting} couverts en liste d'attente.`,
      body: `${seatable} places libres immédiatement. Les placer récupère ${recoverable} couverts, soit ≈ ${value.toLocaleString("fr-FR")} MAD sur ce service.`,
      ctaLabel: "Placer la liste d'attente →",
      target: "salle",
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

    const overrun = data.tables.filter((t) => {
      if (!t.seatedAt) return false;
      const min = (Date.now() - new Date(t.seatedAt).getTime()) / 60_000;
      return min > data.currentService.avgTurnMinutes;
    });
    if (overrun.length > 0) {
      anomalies.push({
        kind: "turn_time",
        summary: `${overrun.length} table(s) au-delà de ${data.currentService.avgTurnMinutes} min de rotation.`,
        severity: "warning",
        affected: overrun.map((t) => t.id),
      });
    }

    const perSlot = Math.round(
      data.currentService.capacity /
        Math.max(1, Math.ceil(data.currentService.avgTurnMinutes / 30)),
    );
    const over = data.currentService.slotLoad.filter((s) => s.covers > perSlot);
    if (over.length > 0) {
      anomalies.push({
        kind: "covers",
        summary: `${over.length} créneau(x) au-dessus de ${perSlot} couverts.`,
        severity: "warning",
        affected: over.map((s) => s.at),
      });
    }

    const soldOut = data.topItems.filter((i) => i.state === "sold_out");
    if (soldOut.length > 0) {
      anomalies.push({
        kind: "menu",
        summary: `${soldOut.length} plat(s) en rupture sur la carte.`,
        severity: "info",
        affected: soldOut.map((i) => i.id),
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
