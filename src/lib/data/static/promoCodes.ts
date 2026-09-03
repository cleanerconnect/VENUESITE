// Promo codes demo data — six codes seeded for the Jazzablanca demo
// covering the main archetypes:
//   - partner discount (ROYALAIRMAROC25)
//   - influencer (INFLUENCER_SOUKAINA)
//   - press comp (PRESSE2026, kind = "comp")
//   - early-window deal that's now sold out (EARLYJAZZ)
//   - student verified (ETUDIANTS_CASA)
//   - internal partner (VIP_PARTNERS)
//
// Per-code redemption timelines and daily charts are generated
// deterministically off the seeded redemption count so the demo paints
// the same picture every render.

import type {
  PromoCode,
  PromoCodeDetail,
  PromoCodeRedemption,
  PromoCodesAggregate,
} from "@/lib/types/promoCodes";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetDays = (d: number) =>
  new Date(NOW - d * 24 * 3600_000).toISOString();
const futureDays = (d: number) =>
  new Date(NOW + d * 24 * 3600_000).toISOString();

const CODES: PromoCode[] = [
  {
    id: "promo_royalair",
    code: "ROYALAIRMAROC25",
    kind: "percentage",
    valuePct: 15,
    scope: {
      kind: "tier",
      eventId: "evt_jzb_robbie",
      tierId: "t_robbie_carre",
    },
    scopeLabel: "Pass 10 jours · Carré Or",
    maxRedemptions: 200,
    redemptionCount: 47,
    maxPerUser: 2,
    startsAt: offsetDays(40),
    endsAt: futureDays(37),
    revenueGeneratedMad: 423_000,
    combinableNote:
      "Non cumulable avec d'autres réductions. Utilisable sur les billets achetés depuis le portail Royal Air Maroc.",
    notes: "Partenariat compagnie aérienne · contrat #2026-RAM-007.",
    status: "active",
    createdAt: offsetDays(45),
    createdByInitials: "M. T.",
  },
  {
    id: "promo_soukaina",
    code: "INFLUENCER_SOUKAINA",
    kind: "percentage",
    valuePct: 10,
    scope: {
      kind: "tier",
      eventId: "evt_jzb_robbie",
      tierId: "t_robbie_carre",
    },
    scopeLabel: "Carré Or",
    maxRedemptions: 50,
    redemptionCount: 23,
    maxPerUser: 1,
    startsAt: offsetDays(28),
    endsAt: futureDays(60),
    revenueGeneratedMad: 138_000,
    combinableNote: "Single-use par utilisateur — vérification email.",
    notes: "@soukaina_casa, 240k followers Instagram. Brief envoyé le 02/04.",
    status: "active",
    createdAt: offsetDays(30),
    createdByInitials: "M. T.",
  },
  {
    id: "promo_presse",
    code: "PRESSE2026",
    kind: "comp",
    valuePct: 100,
    scope: {
      kind: "tier",
      eventId: "evt_jzb_robbie",
      tierId: "t_robbie_gen",
    },
    scopeLabel: "Pass Jour · General · Comp presse",
    maxRedemptions: 80,
    redemptionCount: 67,
    maxPerUser: 1,
    startsAt: offsetDays(60),
    endsAt: futureDays(20),
    revenueGeneratedMad: 0,
    combinableNote:
      "Code de gracieuseté — distribué sur invitation uniquement, traçabilité complète.",
    notes: "Liste presse validée par direction com. + agence RP Eklectik.",
    status: "active",
    createdAt: offsetDays(62),
    createdByInitials: "S. R.",
  },
  {
    id: "promo_earlyjazz",
    code: "EARLYJAZZ",
    kind: "percentage",
    valuePct: 20,
    scope: { kind: "all_events" },
    scopeLabel: "Tous les événements · Phase 1",
    maxRedemptions: 1500,
    redemptionCount: 1247,
    startsAt: offsetDays(120),
    endsAt: offsetDays(60),
    revenueGeneratedMad: 1_205_400,
    combinableNote:
      "Non cumulable avec d'autres réductions. Réservé Phase 1 (Early Bird + Pré-vente).",
    notes:
      "Code public lancé en grand sur la newsletter — meilleure performance promo de l'édition.",
    status: "depleted",
    createdAt: offsetDays(125),
    createdByInitials: "M. T.",
  },
  {
    id: "promo_etudiants",
    code: "ETUDIANTS_CASA",
    kind: "percentage",
    valuePct: 15,
    scope: { kind: "event", eventId: "evt_jzb_robbie" },
    scopeLabel: "Robbie Williams · Tous tarifs",
    maxRedemptions: 500,
    redemptionCount: 89,
    maxPerUser: 1,
    startsAt: offsetDays(15),
    endsAt: futureDays(67),
    revenueGeneratedMad: 47_300,
    combinableNote:
      "Vérification email .edu obligatoire. Non cumulable avec EARLYJAZZ.",
    notes:
      "Partenariat associations étudiantes UIR, ENCG, ESCA. Push WhatsApp à activer.",
    status: "active",
    createdAt: offsetDays(18),
    createdByInitials: "S. R.",
  },
  {
    id: "promo_vip_partners",
    code: "VIP_PARTNERS",
    kind: "percentage",
    valuePct: 50,
    scope: {
      kind: "tier",
      eventId: "evt_jzb_robbie",
      tierId: "t_robbie_carre",
    },
    scopeLabel: "Carré Or · Internes",
    maxRedemptions: 30,
    redemptionCount: 12,
    maxPerUser: 1,
    startsAt: offsetDays(50),
    endsAt: futureDays(67),
    revenueGeneratedMad: 36_000,
    combinableNote:
      "Réservé partenaires institutionnels et hôtels Anfa. Distribution nominative.",
    notes: "Liste validée par DG. Régénérer un code par partenaire si besoin.",
    status: "active",
    createdAt: offsetDays(55),
    createdByInitials: "M. T.",
  },
];

// Deterministic redemption timeline for the detail drawer. Uses a
// small fixed pool of buyer profiles so initials look realistic. The
// number of rendered redemptions is capped at min(20, redemptionCount).
const BUYER_POOL: { initials: string; city: string }[] = [
  { initials: "Y. B.", city: "Casablanca" },
  { initials: "K. L.", city: "Casablanca" },
  { initials: "S. R.", city: "Paris" },
  { initials: "H. E. I.", city: "Rabat" },
  { initials: "M. R.", city: "Casablanca" },
  { initials: "A. T.", city: "Casablanca" },
  { initials: "L. F.", city: "Casablanca" },
  { initials: "O. B.", city: "Casablanca" },
  { initials: "S. I.", city: "Rabat" },
  { initials: "N. E. A.", city: "Casablanca" },
  { initials: "I. C.", city: "Marrakech" },
  { initials: "R. H.", city: "Casablanca" },
  { initials: "F. B.", city: "Tanger" },
  { initials: "Z. M.", city: "Casablanca" },
  { initials: "T. K.", city: "Agadir" },
];

const TIER_FOR_SCOPE: Record<string, { name: string; price: number }> = {
  t_robbie_carre: { name: "Carré Or", price: 1_200 },
  t_robbie_gen: { name: "Pass Jour · General", price: 590 },
  t_robbie_eb: { name: "Pass Jour · Early Bird", price: 380 },
};

function buildRedemptions(code: PromoCode): PromoCodeRedemption[] {
  const visible = Math.min(20, code.redemptionCount);
  const tier =
    code.scope.kind === "tier"
      ? TIER_FOR_SCOPE[code.scope.tierId] ?? { name: "Tarif standard", price: 590 }
      : { name: "Tarif standard", price: 590 };

  return Array.from({ length: visible }, (_, i) => {
    const buyer = BUYER_POOL[i % BUYER_POOL.length];
    // Spread redemptions across the [start, now] window — most recent first.
    const start = new Date(code.startsAt).getTime();
    const end = Math.min(NOW, new Date(code.endsAt).getTime());
    const t = i / Math.max(1, visible - 1);
    const at = new Date(end - t * (end - start)).toISOString();
    const saved =
      code.kind === "percentage"
        ? Math.round((tier.price * (code.valuePct ?? 0)) / 100)
        : code.kind === "comp"
          ? tier.price
          : code.valueFlatMad ?? 0;
    const paid = code.kind === "comp" ? 0 : tier.price - saved;
    return {
      id: `${code.id}_red_${i}`,
      redeemedAt: at,
      buyerInitials: buyer.initials,
      city: buyer.city,
      tierName: tier.name,
      amountSavedMad: saved,
      amountPaidLabel: paid === 0 ? "Comp" : `${paid.toLocaleString("fr-FR").replace(/,/g, " ")} MAD`,
    };
  });
}

function buildDaily(code: PromoCode): { day: string; count: number }[] {
  const start = new Date(code.startsAt).getTime();
  const end = Math.min(NOW, new Date(code.endsAt).getTime());
  const days = Math.max(1, Math.round((end - start) / (24 * 3600_000)));
  const buckets = Math.min(14, days);
  // Distribute the redemption count across the buckets with a
  // front-loaded curve (most codes peak early).
  const points: { day: string; count: number }[] = [];
  let remaining = code.redemptionCount;
  for (let i = 0; i < buckets; i++) {
    const t = i / buckets;
    const weight = Math.pow(1 - t, 1.4);
    const slice = Math.round(remaining * weight * 0.18);
    points.push({
      day: new Date(end - (buckets - 1 - i) * 24 * 3600_000).toISOString(),
      count: Math.max(0, slice),
    });
    remaining -= slice;
  }
  // Roll the leftover into the latest bucket so totals reconcile.
  if (remaining > 0 && points.length) {
    points[points.length - 1].count += remaining;
  }
  return points;
}

const cache = new Map<string, PromoCodeDetail>();

export function getPromoCodes(): PromoCode[] {
  return CODES;
}

export function getPromoCodeById(id: string): PromoCode | undefined {
  return CODES.find((c) => c.id === id);
}

export function getPromoCodeDetail(id: string): PromoCodeDetail | undefined {
  if (cache.has(id)) return cache.get(id);
  const code = getPromoCodeById(id);
  if (!code) return undefined;
  const detail: PromoCodeDetail = {
    code,
    redemptions: buildRedemptions(code),
    daily: buildDaily(code),
  };
  cache.set(id, detail);
  return detail;
}

export function getPromoCodesAggregate(): PromoCodesAggregate {
  const active = CODES.filter((c) => c.status === "active").length;
  const totalRedemptions = CODES.reduce((s, c) => s + c.redemptionCount, 0);
  const totalRevenue = CODES.reduce((s, c) => s + c.revenueGeneratedMad, 0);
  return {
    activeCount: active,
    totalRedemptions,
    totalRevenueGeneratedMad: totalRevenue,
  };
}
