// Tri-lingual review phrase pool for the Bilan tab. Jazzablanca's
// audience is ~38 % international (mostly French and Spanish tourists),
// so pure-French reviews would read inauthentic for a festival of this
// scale. Mix is approximately:
//   - 70 % French
//   - 25 % English
//   -  5 % Arabic transliterated (Moroccan darija in latin script)
//
// The generator is deterministic — seeded by event id — so the same
// event always produces the same review feed across reloads. That
// keeps screenshots stable for investor demos.

import type { ReviewItem, ReviewLanguage } from "@/lib/types/analytics";

interface PoolEntry {
  text: string;
  language: ReviewLanguage;
  /** Ratings this phrase is plausible for. */
  ratings: number[];
  /** Optional cluster tag — used by the review-summary aggregator. */
  cluster?: string;
}

/**
 * Phrase pool. Names of clusters are stable across the pool so the
 * aggregator can count them without parsing the text.
 *
 * Cluster taxonomy (positive):
 *   - "acoustique_stage_21"
 *   - "programmation"
 *   - "lieu"
 *   - "organisation"
 *   - "ambiance"
 * Cluster taxonomy (improvement):
 *   - "files_attente"
 *   - "restauration"
 *   - "prix_boissons"
 */
const POOL: PoolEntry[] = [
  // === 5★ — French ===
  {
    text: "Soirée magnifique, organisation parfaite du début à la fin.",
    language: "fr",
    ratings: [5],
    cluster: "organisation",
  },
  {
    text: "Le son sur le Stage 21 était cristallin, on entendait chaque détail.",
    language: "fr",
    ratings: [5],
    cluster: "acoustique_stage_21",
  },
  {
    text: "Programmation au top, on en redemande pour l'année prochaine.",
    language: "fr",
    ratings: [5],
    cluster: "programmation",
  },
  {
    text: "Anfa Park au coucher du soleil, c'était sublime. Un cadre que peu de festivals offrent.",
    language: "fr",
    ratings: [5],
    cluster: "lieu",
  },
  {
    text: "L'ambiance était à son meilleur, public chaleureux, équipe accueillante.",
    language: "fr",
    ratings: [5],
    cluster: "ambiance",
  },
  {
    text: "Première édition pour moi, je reviens sans hésiter l'année prochaine.",
    language: "fr",
    ratings: [5],
  },
  {
    text: "Files d'attente bien gérées à l'entrée, beaucoup mieux que les éditions précédentes.",
    language: "fr",
    ratings: [5],
    cluster: "files_attente",
  },
  {
    text: "Stage 21 est devenu ma scène préférée, le son y est exceptionnel.",
    language: "fr",
    ratings: [5],
    cluster: "acoustique_stage_21",
  },
  {
    text: "Une organisation impeccable du parking jusqu'à la sortie, bravo.",
    language: "fr",
    ratings: [5],
    cluster: "organisation",
  },
  {
    text: "Le line-up de cette année était au-dessus de tout ce que j'ai vu au Maroc.",
    language: "fr",
    ratings: [5],
    cluster: "programmation",
  },

  // === 4★ — French ===
  {
    text: "Très bonne soirée, juste les boissons un peu chères mais ça vaut le coup.",
    language: "fr",
    ratings: [4],
    cluster: "prix_boissons",
  },
  {
    text: "Set magnifique, j'ai juste trouvé le son un peu fort sur la main stage.",
    language: "fr",
    ratings: [4],
  },
  {
    text: "Belle programmation, expérience globale très agréable.",
    language: "fr",
    ratings: [4],
    cluster: "programmation",
  },
  {
    text: "Ambiance excellente, équipe sécurité pro et discrète.",
    language: "fr",
    ratings: [4],
    cluster: "ambiance",
  },
  {
    text: "Le lieu reste magique. Petit bémol sur les options de restauration.",
    language: "fr",
    ratings: [4],
    cluster: "restauration",
  },
  {
    text: "Soirée réussie. La signalétique pourrait être améliorée pour les nouveaux venus.",
    language: "fr",
    ratings: [4],
  },

  // === 5★ — English ===
  {
    text: "Outstanding production, the sound on Stage 21 was crystal clear.",
    language: "en",
    ratings: [5],
    cluster: "acoustique_stage_21",
  },
  {
    text: "Best festival I've been to in Morocco, period. The lineup was world-class.",
    language: "en",
    ratings: [5],
    cluster: "programmation",
  },
  {
    text: "Smooth entry, great vibes, perfect weather. Coming back next year for sure.",
    language: "en",
    ratings: [5],
    cluster: "organisation",
  },
  {
    text: "Anfa Park is a stunning venue, especially at sunset. Magical setting.",
    language: "en",
    ratings: [5],
    cluster: "lieu",
  },
  {
    text: "The acoustics on Stage 21 are unmatched — every note landed.",
    language: "en",
    ratings: [5],
    cluster: "acoustique_stage_21",
  },
  {
    text: "Loved every minute. Crew was friendly, lines moved fast, music was unreal.",
    language: "en",
    ratings: [5],
    cluster: "organisation",
  },

  // === 4★ — English ===
  {
    text: "Great show overall, drinks were a bit pricey but the festival itself was worth it.",
    language: "en",
    ratings: [4],
    cluster: "prix_boissons",
  },
  {
    text: "Solid lineup, nice atmosphere. Food options could be a bit more varied.",
    language: "en",
    ratings: [4],
    cluster: "restauration",
  },
  {
    text: "Fantastic energy, smooth logistics. Will be back.",
    language: "en",
    ratings: [4],
    cluster: "ambiance",
  },

  // === 5★ — Arabic transliterated (darija) ===
  {
    text: "Mazyan bezzaf, organisation top, tnishan na3awd l3am jay.",
    language: "ar_latin",
    ratings: [5],
    cluster: "organisation",
  },
  {
    text: "Soirée wa3ra, l'ambiance kanet 9wiya. Bravo l'équipe.",
    language: "ar_latin",
    ratings: [5],
    cluster: "ambiance",
  },
  {
    text: "Stage 21 sah l'son mzyan, smaa3t kola note.",
    language: "ar_latin",
    ratings: [5],
    cluster: "acoustique_stage_21",
  },
  {
    text: "Bghit ne3awd l3am jay inshallah, programmation kanet zwina bezzaf.",
    language: "ar_latin",
    ratings: [5],
    cluster: "programmation",
  },

  // === 3★ ===
  {
    text: "Bonne soirée mais l'attente à l'entrée a duré 45 minutes, à améliorer.",
    language: "fr",
    ratings: [3],
    cluster: "files_attente",
  },
  {
    text: "Set sympa, mais difficile de trouver à manger après 22h.",
    language: "fr",
    ratings: [3],
    cluster: "restauration",
  },
  {
    text: "Good atmosphere but the bar lines were really long all night.",
    language: "en",
    ratings: [3],
    cluster: "files_attente",
  },
  {
    text: "Music was great, organisation around the food trucks needs work.",
    language: "en",
    ratings: [3],
    cluster: "restauration",
  },

  // === 2★ ===
  {
    text: "Trop de monde sur la main stage, on n'a presque rien vu.",
    language: "fr",
    ratings: [2],
  },
  {
    text: "L'attente à l'entrée a duré plus d'une heure, expérience gâchée.",
    language: "fr",
    ratings: [2],
    cluster: "files_attente",
  },
];

// Stable name pool for review attribution. Names skew Moroccan with a
// scattering of French and English first names to match the audience mix.
const NAMES = [
  "Yasmine B.",
  "Karim L.",
  "Sophie R.",
  "Hicham E.",
  "Mehdi R.",
  "Layla F.",
  "Anissa T.",
  "Nadia A.",
  "Omar B.",
  "Salma I.",
  "Reda H.",
  "Sami E.",
  "Lina B.",
  "Yasmine C.",
  "Othmane T.",
  "Imane E.",
  "Anas B.",
  "Camille D.",
  "James W.",
  "Emily T.",
  "Marta P.",
  "Léo M.",
  "Sofia G.",
  "Younes K.",
  "Ines B.",
  "Adam Z.",
  "Chloé V.",
  "Ahmed B.",
  "Zineb S.",
  "Nora F.",
];

// Deterministic LCG so the demo data is stable across reloads /
// screenshots without needing a global seed.
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Generate a stable review feed for the given event. The total count
 * defaults to 30 — enough to populate the Bilan reviews list with
 * variety and let the cluster aggregator surface real patterns.
 *
 * Distribution targets:
 *   - language : 70 % fr, 25 % en, 5 % ar_latin
 *   - rating   : 5★ 60 %, 4★ 25 %, 3★ 10 %, 2★ 5 %
 */
export function generateReviews(
  eventId: string,
  reviewCount = 30,
  endedAtIso?: string,
): ReviewItem[] {
  const rng = seededRng(hashString(`reviews:${eventId}`));
  const endTime = endedAtIso ? new Date(endedAtIso).getTime() : Date.now();

  const targetRating = (r: number): number => {
    if (r < 0.6) return 5;
    if (r < 0.85) return 4;
    if (r < 0.95) return 3;
    return 2;
  };

  const targetLanguage = (r: number): ReviewLanguage => {
    if (r < 0.7) return "fr";
    if (r < 0.95) return "en";
    return "ar_latin";
  };

  const reviews: ReviewItem[] = [];
  // Track recently used pool entries so the same phrase doesn't fire
  // back-to-back. Tiny "no immediate repeat" shuffle.
  const recent: number[] = [];

  for (let i = 0; i < reviewCount; i++) {
    const rating = targetRating(rng());
    const language = targetLanguage(rng());

    const candidates = POOL.map((entry, idx) => ({ entry, idx })).filter(
      (c) =>
        c.entry.ratings.includes(rating) &&
        c.entry.language === language &&
        !recent.slice(-3).includes(c.idx),
    );

    // Fall back to the language alone if the (rating, language) pair is
    // empty — covers gaps in the pool without duplicating phrases.
    const fallback =
      candidates.length > 0
        ? candidates
        : POOL.map((entry, idx) => ({ entry, idx })).filter(
            (c) => c.entry.language === language,
          );

    const pick = fallback[Math.floor(rng() * fallback.length)];
    recent.push(pick.idx);

    const name = NAMES[Math.floor(rng() * NAMES.length)];
    // Reviews land between event-end and event-end + 21 days, weighted
    // toward the first 7 days so the Bilan feed feels fresh.
    const daysAfter = Math.floor(rng() * rng() * 21);
    const at = new Date(
      endTime + daysAfter * 24 * 3600_000 + Math.floor(rng() * 8 * 3600_000),
    ).toISOString();

    reviews.push({
      id: `rev_${eventId}_${i}`,
      buyerName: name,
      rating,
      text: pick.entry.text,
      language: pick.entry.language,
      at,
    });
  }

  // Sort newest first so the Bilan reviews list reads naturally.
  reviews.sort((a, b) => (a.at < b.at ? 1 : -1));
  return reviews;
}

/** Map every pool entry by its text — enables cluster lookup post-generation. */
const TEXT_TO_CLUSTER = new Map(
  POOL.filter((p) => p.cluster).map((p) => [p.text, p.cluster!]),
);

const POSITIVE_CLUSTERS = new Set([
  "acoustique_stage_21",
  "programmation",
  "lieu",
  "organisation",
  "ambiance",
]);

const IMPROVEMENT_CLUSTERS = new Set([
  "files_attente",
  "restauration",
  "prix_boissons",
]);

const CLUSTER_LABELS: Record<string, string> = {
  acoustique_stage_21: "Acoustique Stage 21",
  programmation: "Programmation",
  lieu: "Lieu (Anfa Park)",
  organisation: "Organisation",
  ambiance: "Ambiance",
  files_attente: "Files d'attente",
  restauration: "Options de restauration",
  prix_boissons: "Prix des boissons",
};

/**
 * Aggregate a review feed into the summary the Bilan UI needs:
 * average rating, rating histogram, top positive + improvement clusters.
 */
export function summarizeReviews(reviews: ReviewItem[]) {
  const total = reviews.length;
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  const clusterCounts = new Map<string, number>();

  for (const r of reviews) {
    distribution[r.rating - 1] += 1;
    sum += r.rating;
    const cluster = TEXT_TO_CLUSTER.get(r.text);
    if (cluster) {
      clusterCounts.set(cluster, (clusterCounts.get(cluster) ?? 0) + 1);
    }
  }

  const positive = [...clusterCounts.entries()]
    .filter(([k]) => POSITIVE_CLUSTERS.has(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, c]) => ({ name: CLUSTER_LABELS[k] ?? k, count: c }));

  const improvement = [...clusterCounts.entries()]
    .filter(([k]) => IMPROVEMENT_CLUSTERS.has(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, c]) => ({ name: CLUSTER_LABELS[k] ?? k, count: c }));

  return {
    averageRating: total === 0 ? 0 : Math.round((sum / total) * 10) / 10,
    reviewCount: total,
    distribution,
    positiveTags: positive,
    improvementTags: improvement,
  };
}
