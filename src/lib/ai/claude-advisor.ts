import "server-only";

// Claude adapter.
//
// Notes on the choices here, since they are the ones a reviewer will ask
// about:
//
// · Structured outputs, not prompt-and-parse. `messages.parse()` with a
//   Zod schema constrains the response, so a nudge either validates or
//   throws at the boundary — it never reaches a card half-formed.
// · The system prompt is frozen and cached. It is the same bytes on every
//   request, so it sits before the cache breakpoint and the per-service
//   payload goes after it. Caching is a prefix match: a timestamp in the
//   system prompt would silently cost the whole discount.
// · Adaptive thinking, effort tuned per call. Scoring no-show risk over a
//   handful of reservations is not the same problem as reading a service
//   and deciding what a manager should do next.
// · Failures return null or empty rather than throwing. A dashboard whose
//   floor plan won't render because the advice model timed out is a worse
//   product than one that quietly drops the suggestion card.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { RestaurantOverview } from "@/lib/types/restaurant";
import type { AiAdvisor } from "./advisor";
import type { VenueConfig } from "@/lib/venue/config";
import {
  NoShowRiskSchema,
  ReviewDigestSchema,
  ServiceAnomalySchema,
  ServiceNudgeSchema,
  type NoShowRisk,
  type ReviewDigest,
  type ServiceAnomaly,
  type ServiceNudge,
} from "./schemas";

const MODEL = "claude-opus-5";

/**
 * Frozen per configuration. Every byte is identical on every request for
 * a given venue kind, which is what keeps it cacheable — see the note
 * above; anything that varies per service belongs in the user turn.
 *
 * It varies by configuration because it has to: a prompt that tells the
 * model it is advising « un restaurant » and to quantify in « couverts »
 * gets back a sentence about covers, and a lounge has none. Two venue
 * kinds means two cache entries, each still byte-stable.
 */
const systemPrompt = (config: VenueConfig) =>
  `Tu es l'assistant d'exploitation de LYFE pour ${
    config.kind === "drinks" ? "un bar" : "un restaurant"
  }.

Ton rôle : lire l'état d'un ${config.service.one} en cours et dire à l'équipe ce qui
mérite son attention maintenant. Tu parles à un directeur de salle
pendant le coup de feu, pas à un analyste.

Règles :
- Chaque affirmation s'appuie sur un chiffre présent dans les données.
  Aucune extrapolation, aucune moyenne du secteur, aucune invention.
- Quantifie l'effet attendu d'une recommandation (${config.cover.many}, MAD, minutes).
- Une seule recommandation à la fois : celle qui a le plus d'effet.
- Ton calme et direct. Jamais enthousiaste, jamais désolé.
- Si les données ne justifient aucune action, dis-le : une confiance
  basse vaut mieux qu'un conseil inventé.
- Vocabulaire imposé : « ${config.service.one} » pour une séance de la salle,
  « ${config.cover.one} » pour une place réservée. Aucun synonyme.
- Français, vouvoiement, montants en MAD.`;

export class ClaudeAdvisor implements AiAdvisor {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    // Omitting apiKey lets the SDK resolve ANTHROPIC_API_KEY, an auth
    // token, or an `ant auth login` profile — all valid in deployment.
    this.client = new Anthropic(apiKey ? { apiKey } : {});
  }

  async serviceNudge(
    data: RestaurantOverview,
    config: VenueConfig,
  ): Promise<ServiceNudge | null> {
    const result = await this.parse(
      config,
      ServiceNudgeSchema,
      `Voici l'état du ${config.service.one}. Identifie l'action qui a le plus d'effet
maintenant, et exprime son gain attendu en ${config.cover.many} et en MAD.

${serviceContext(data, config)}`,
      "high",
    );

    // Low-confidence advice is worse than none: it trains the team to
    // ignore the card, and then they miss the one that mattered.
    if (!result || result.confidence < 0.5) return null;
    return result;
  }

  async noShowRisk(
    data: RestaurantOverview,
    config: VenueConfig,
  ): Promise<NoShowRisk> {
    const reservations = [...data.upcomingReservations, ...data.waitlist];
    if (reservations.length === 0) return { scores: [] };

    const result = await this.parse(
      config,
      NoShowRiskSchema,
      `Estime le risque d'absence de chaque réservation à partir de
l'historique de visites, du canal, de l'acompte et de l'heure.

Réservations :
${reservations
  .map(
    (r) =>
      `- ${r.id} · ${r.guestName} · ${r.partySize} ${config.cover.many} · ${r.at} · canal ${r.channel} · ${r.visits} visites · acompte ${r.depositMad ?? 0} MAD`,
  )
  .join("\n")}`,
      // Scoring a short list against explicit features doesn't need the
      // depth that reading a whole service does.
      "low",
    );

    return result ?? { scores: [] };
  }

  async reviewDigest(
    data: RestaurantOverview,
    config: VenueConfig,
  ): Promise<ReviewDigest> {
    if (data.reviews.length === 0) {
      return { clusters: [], summary: "" };
    }

    const result = await this.parse(
      config,
      ReviewDigestSchema,
      `Regroupe ces avis par thème récurrent. Cite un extrait verbatim par
thème pour que l'équipe puisse vérifier.

${data.reviews
  .map((r) => `- [${r.rating}/5 · ${r.channel}] ${r.comment}`)
  .join("\n")}`,
      "medium",
    );

    return result ?? { clusters: [], summary: "" };
  }

  async anomalies(
    data: RestaurantOverview,
    config: VenueConfig,
  ): Promise<ServiceAnomaly> {
    const result = await this.parse(
      config,
      ServiceAnomalySchema,
      `Repère les écarts qui méritent l'attention du directeur de salle :
cadence d'annulations, rotation anormalement longue, créneau au-dessus de
la capacité, plat en rupture qui pèse sur la marge.

${serviceContext(data, config)}`,
      "medium",
    );

    return result ?? { anomalies: [] };
  }

  async *assistant(
    prompt: string,
    data: RestaurantOverview,
    config: VenueConfig,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const stream = this.client.messages.stream(
      {
        model: MODEL,
        max_tokens: 4096,
        // Cached prefix: system prompt first, volatile service state
        // after, question last.
        system: [
          {
            type: "text",
            text: systemPrompt(config),
            cache_control: { type: "ephemeral" },
          },
        ],
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        messages: [
          {
            role: "user",
            content: `${serviceContext(data, config)}\n\nQuestion : ${prompt}`,
          },
        ],
      },
      { signal },
    );

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }

  /**
   * One structured call. Returns null on any failure — see the note at
   * the top about why the dashboard must survive a bad AI response.
   */
  private async parse<S extends z.ZodType>(
    config: VenueConfig,
    schema: S,
    userContent: string,
    effort: "low" | "medium" | "high",
  ): Promise<z.infer<S> | null> {
    try {
      const response = await this.client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: [
          {
            type: "text",
            text: systemPrompt(config),
            cache_control: { type: "ephemeral" },
          },
        ],
        thinking: { type: "adaptive" },
        output_config: {
          effort,
          format: zodOutputFormat(schema),
        },
        messages: [{ role: "user", content: userContent }],
      });

      // A safety decline is not an exception — check before reading.
      if (response.stop_reason === "refusal") return null;

      return (response.parsed_output as z.infer<S> | null) ?? null;
    } catch (error) {
      console.error("[ai] structured call failed", error);
      return null;
    }
  }
}

/**
 * The service, as text the model can reason over. Deliberately compact:
 * this goes in the user turn on every call, so every line costs tokens on
 * every request.
 */
function serviceContext(data: RestaurantOverview, config: VenueConfig): string {
  const service = data.currentService;
  const unit = config.cover.many;
  // « Service » at a restaurant, « Créneau » at a bar — the venue's own
  // word for a sitting, sentence-cased for the head of the line.
  const sitting =
    config.service.one.charAt(0).toUpperCase() + config.service.one.slice(1);

  return `Établissement : ${data.restaurant.name} (${data.restaurant.city}), ${data.restaurant.capacity} ${unit}.
${sitting} : ${service.label}, ${service.opensAt} → ${service.closesAt}, état ${service.state}.
Réservé ${service.bookedCovers} / ${service.capacity} · arrivés ${service.arrivedCovers} · absences ${service.noShowCovers}.
Recette ${service.revenueMad} MAD.
Liste d'attente ${data.waitlist.reduce((n, r) => n + r.partySize, 0)} ${unit}.
Créneaux : ${service.slotLoad.map((s) => `${s.at.slice(11, 16)}=${s.covers}`).join(" ")}`;
}
