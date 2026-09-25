// Shared insight engine — the single source of truth for AI-generated
// observations. Consumed by InsightOfTheDay (Vue d'ensemble) and by the
// Analyses tab callouts. In production this would be a query against
// the analytics warehouse keyed by (organizerId, surface, eventId?).

import type { Insight, InsightSurface } from "@/lib/types/analytics";

const INSIGHTS: Insight[] = [
  // ── Of the day · 3 rotating variants for the dashboard
  {
    id: "ins_otd_1",
    surface: "of_the_day",
    body: "Vos acheteurs Pass Semaine 1 ont 73 % de chance d'acheter aussi un Pass Week-End 2. Pensez à leur proposer le bundle au moment du checkout.",
    accent: "73 %",
  },
  {
    id: "ins_otd_2",
    surface: "of_the_day",
    body: "Les ventes 19h-22h représentent 64 % de votre revenu quotidien, et la conversion y est 2,3× supérieure. Concentrer vos boosts sur ce créneau ferait baisser votre CPA.",
    accent: "2,3×",
  },
  {
    id: "ins_otd_3",
    surface: "of_the_day",
    body: "L'audience Rabat-Salé est encore peu sollicitée (12 % de votre base) mais convertit à 4,1 % vs 3,2 % en moyenne. Un boost géolocalisé pourrait y libérer un segment latent.",
    accent: "4,1 %",
  },

  // ── Analyses · per-event insights
  {
    id: "ins_robbie_phase",
    surface: "analyses_phase",
    eventId: "evt_jzb_robbie",
    body: "Votre Phase 1 Blind a saturé en 11 jours, plus rapidement que les éditions précédentes. Considérez d'allouer plus de stock à cette phase l'année prochaine.",
  },
  {
    id: "ins_robbie_funnel",
    surface: "analyses_funnel",
    eventId: "evt_jzb_robbie",
    body: "Votre taux de complétion checkout est 23 % en dessous de la moyenne plateforme. Friction principale identifiée : le formulaire de paiement sur mobile (38 % d'abandons à l'étape Payzone).",
    cta: { label: "Voir les détails", href: "#funnel-details" },
  },
  {
    id: "ins_robbie_pace",
    surface: "analyses_pace",
    eventId: "evt_jzb_robbie",
    body: "Cadence de ventes 18 % au-dessus de la projection — pic à 22h confirmé. Un boost Splash de bienvenue vendredi soir pourrait sécuriser le sell-out.",
  },
  {
    id: "ins_robbie_reviews",
    surface: "analyses_reviews",
    eventId: "evt_jzb_robbie",
    body: "Les mentions « son » dominent les avis positifs (47 mentions, sentiment +0,84). La file d'attente reste le principal frein cité (18 mentions, −0,42).",
  },

  {
    id: "ins_riles_pace",
    surface: "analyses_pace",
    eventId: "evt_jzb_riles",
    body: "Cadence légèrement en avance après 7 jours. La Phase 2 démarre dans 5 jours, profitez de la dynamique pour annoncer la transition tarifaire.",
  },
  {
    id: "ins_riles_reviews",
    surface: "analyses_reviews",
    eventId: "evt_jzb_riles",
    body: "Cluster de mentions positives sur l'acoustique du Stage 21 — votre choix de salle se confirme comme un argument de vente.",
  },
  {
    id: "ins_riles_funnel",
    surface: "analyses_funnel",
    eventId: "evt_jzb_riles",
    body: "Le tunnel de conversion performe 4 % au-dessus de la moyenne plateforme. Pas d'action recommandée — la friction est déjà minimale.",
  },

  {
    id: "ins_jorja_funnel",
    surface: "analyses_funnel",
    eventId: "evt_jzb_jorja",
    body: "Pré-vente non encore ouverte. Une fois la modération validée, les premiers signaux funnel apparaîtront sous 24h.",
  },

  // ── Audiences
  {
    id: "ins_aud_segments",
    surface: "audiences",
    body: "Le segment « Anciens acheteurs Jazzablanca » convertit 5,2× mieux que la moyenne. Tout boost retargeting ce segment a un ROAS estimé > 8×.",
    accent: "5,2×",
  },
  {
    id: "ins_aud_geo",
    surface: "audiences",
    body: "Votre audience Rabat-Salé représente 14 % des achats mais 22 % du revenu. Les Pass Premium se vendent disproportionnellement bien dans la capitale.",
  },
];

export function getInsightOfTheDay(): Insight {
  // Rotate by the current hour so the card visibly varies between
  // sessions without breaking SSR hydration (deterministic per render).
  const otd = INSIGHTS.filter((i) => i.surface === "of_the_day");
  const idx = new Date().getHours() % otd.length;
  return otd[idx];
}

export function getInsightsForSurface(
  surface: InsightSurface,
  eventId?: string,
): Insight[] {
  return INSIGHTS.filter(
    (i) =>
      i.surface === surface && (eventId ? i.eventId === eventId : !i.eventId),
  );
}

export function getInsightForEventSurface(
  surface: InsightSurface,
  eventId: string,
): Insight | undefined {
  return INSIGHTS.find((i) => i.surface === surface && i.eventId === eventId);
}
