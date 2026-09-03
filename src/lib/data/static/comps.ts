// Comp / invitation demo data. Two anchors:
//
//   - Jazzablanca 2025 (settled): 280 issued across 5 categories, 247
//     redeemed (89 % scan rate). Demonstrates a fully populated
//     invitations ledger.
//
//   - Robbie Williams (on_sale): zero issued. Drives the empty-state
//     "Lancer une campagne d'invitations" CTA + best-practices tip.
//
// Other on_sale / live / past events with no seeded data return
// undefined and the tab renders the empty state.

import {
  COMP_CATEGORY_LABEL,
  type CompAllocation,
  type CompAuditEntry,
  type CompCategory,
  type CompCategoryStat,
  type InvitationsData,
} from "@/lib/types/comps";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetDays = (d: number) =>
  new Date(NOW - d * 24 * 3600_000).toISOString();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();

// === Sample recipient pool ──────────────────────────────────────────
// One realistic name per slot per category. The factory cycles through
// these for sample allocations; the seeded `used` count drives how
// many rows render per category.

interface RecipientSeed {
  initials: string;
  fullName: string;
  organization: string;
  tickets: number;
}

const PRESS: RecipientSeed[] = [
  { initials: "C. M.", fullName: "Camille Moreau", organization: "Le Monde Afrique", tickets: 2 },
  { initials: "K. B.", fullName: "Karim Benhaddou", organization: "Telquel", tickets: 2 },
  { initials: "S. L.", fullName: "Sara Lemaire", organization: "Jeune Afrique", tickets: 2 },
  { initials: "M. A.", fullName: "Mehdi Amine", organization: "L'Économiste", tickets: 4 },
  { initials: "J. R.", fullName: "Julien Rocher", organization: "Libération", tickets: 2 },
  { initials: "F. K.", fullName: "Fatima Kassimi", organization: "Hespress", tickets: 4 },
  { initials: "T. B.", fullName: "Tarik Bensalem", organization: "Le Reporter", tickets: 2 },
  { initials: "N. S.", fullName: "Nora Slaoui", organization: "Médi 1 Radio", tickets: 4 },
  { initials: "A. F.", fullName: "Adam Fournier", organization: "France Inter", tickets: 2 },
  { initials: "L. E.", fullName: "Léa Estrade", organization: "RFI Maroc", tickets: 2 },
];

const SPONSORS: RecipientSeed[] = [
  { initials: "R. A. M.", fullName: "Royal Air Maroc", organization: "Compagnie aérienne · partenaire titre", tickets: 12 },
  { initials: "B. P.", fullName: "Banque Populaire", organization: "Sponsor banque · co-titre", tickets: 10 },
  { initials: "M. T.", fullName: "Maroc Telecom", organization: "Sponsor télécom", tickets: 10 },
  { initials: "C. F. C.", fullName: "Casa Finance City", organization: "Sponsor institutionnel", tickets: 8 },
  { initials: "L. O. H.", fullName: "Le Opera Hôtel", organization: "Hôtel partenaire", tickets: 8 },
  { initials: "F. G.", fullName: "Four Seasons Anfa", organization: "Hôtel partenaire premium", tickets: 8 },
  { initials: "R. M.", fullName: "Renault Maroc", organization: "Sponsor automobile", tickets: 8 },
  { initials: "M. O. F.", fullName: "Mutandis Foundation", organization: "Sponsor RSE", tickets: 6 },
  { initials: "C. B. M.", fullName: "Crédit du Maroc", organization: "Sponsor bancaire", tickets: 6 },
];

const TALENT: RecipientSeed[] = [
  { initials: "R. W.", fullName: "Robbie Williams Touring Co.", organization: "Tournée artiste", tickets: 12 },
  { initials: "R. L.", fullName: "Rilès Label", organization: "Label artiste", tickets: 8 },
  { initials: "J. S.", fullName: "Jorja Smith Mgmt", organization: "Management", tickets: 8 },
  { initials: "D. K. M.", fullName: "Diana Krall Mgmt", organization: "Management invité", tickets: 4 },
  { initials: "B. B.", fullName: "Backline + Tour Crew", organization: "Équipe technique invités", tickets: 18 },
];

const STAFF: RecipientSeed[] = [
  { initials: "Y. C.", fullName: "Younes Cherkaoui", organization: "Production interne", tickets: 2 },
  { initials: "I. K.", fullName: "Imane Kabbaj", organization: "Communication", tickets: 2 },
  { initials: "H. M.", fullName: "Hamza Mehdaoui", organization: "Sécurité", tickets: 2 },
  { initials: "L. A.", fullName: "Leila Anouar", organization: "Logistique", tickets: 2 },
  { initials: "O. E.", fullName: "Othmane Erraji", organization: "Régie billetterie", tickets: 2 },
  { initials: "S. M.", fullName: "Salma Marrakchi", organization: "Direction", tickets: 4 },
  { initials: "A. K.", fullName: "Amine Kouider", organization: "Direction artistique", tickets: 2 },
  { initials: "N. B.", fullName: "Nadia Benabdelhadi", organization: "Partenariats", tickets: 4 },
];

const CONTEST: RecipientSeed[] = [
  { initials: "H. R.", fullName: "Hit Radio Listener", organization: "Concours Hit Radio · gagnant 1", tickets: 2 },
  { initials: "M. R.", fullName: "Médi 1 Radio Listener", organization: "Concours Médi 1 · gagnant 1", tickets: 2 },
  { initials: "I. P.", fullName: "Instagram Giveaway", organization: "Concours Instagram · gagnant", tickets: 2 },
  { initials: "T. P.", fullName: "Tiktok Giveaway", organization: "Concours TikTok · gagnant", tickets: 4 },
];

const POOL: Record<CompCategory, RecipientSeed[]> = {
  press: PRESS,
  sponsors: SPONSORS,
  talent: TALENT,
  staff: STAFF,
  contest: CONTEST,
};

interface CategorySpec {
  category: CompCategory;
  allocated: number;
  used: number;
  redeemed: number;
}

interface CompCore {
  /** Window during which invitations were issued. */
  issuanceWindowDays: { start: number; end: number };
  perCategory: CategorySpec[];
}

const CORE: Record<string, CompCore> = {
  evt_jzb_2025_full: {
    issuanceWindowDays: { start: 360, end: 285 },
    perCategory: [
      { category: "press", allocated: 100, used: 80, redeemed: 73 },
      { category: "sponsors", allocated: 150, used: 120, redeemed: 108 },
      { category: "talent", allocated: 50, used: 50, redeemed: 50 },
      { category: "staff", allocated: 30, used: 20, redeemed: 14 },
      { category: "contest", allocated: 10, used: 10, redeemed: 2 },
    ],
  },
};

// Allocations are generated deterministically per (eventId, category):
//   - Sample seeds rotate through the recipient pool.
//   - Total ticket count across rendered samples sums to roughly
//     `used` so the expanded category view reads correctly. We
//     truncate the pool at 10 rows per category and label any
//     remainder via the "+ N autres" footer in the UI.

function buildAllocations(
  eventId: string,
  spec: CategorySpec,
  windowStart: number,
  windowEnd: number,
): CompAllocation[] {
  const seeds = POOL[spec.category];
  const out: CompAllocation[] = [];
  let issuedTickets = 0;
  let redeemedTickets = 0;
  // Sample up to 10 rows for visual density.
  const sampleCount = Math.min(seeds.length, 10);
  for (let i = 0; i < sampleCount; i++) {
    const seed = seeds[i];
    if (issuedTickets >= spec.used) break;
    const tickets = Math.min(seed.tickets, spec.used - issuedTickets);
    issuedTickets += tickets;
    // Determine status — bias so total redeemed sums to ~spec.redeemed.
    const willRedeem =
      redeemedTickets + tickets <= spec.redeemed && spec.redeemed > redeemedTickets;
    const status: CompAllocation["status"] = willRedeem
      ? "scanned"
      : issuedTickets <= spec.used * 0.6
        ? "delivered"
        : i % 2 === 0
          ? "delivered"
          : "no_show";
    if (status === "scanned") redeemedTickets += tickets;
    const t = i / Math.max(1, sampleCount - 1);
    const issuedAt = new Date(
      NOW - (windowStart - t * (windowStart - windowEnd)) * 24 * 3600_000,
    ).toISOString();
    out.push({
      id: `${eventId}_${spec.category}_${i}`,
      category: spec.category,
      recipientInitials: seed.initials,
      recipientName: seed.fullName,
      organization: seed.organization,
      ticketCount: tickets,
      status,
      issuedAt,
      issuedByInitials: i % 3 === 0 ? "M. T." : i % 3 === 1 ? "S. R." : "I. K.",
      scannedAt: status === "scanned"
        ? new Date(NOW - (windowEnd - 1) * 24 * 3600_000 + i * 60_000 * 7).toISOString()
        : undefined,
    });
  }
  return out;
}

function buildAuditTrail(
  eventId: string,
  allocations: CompAllocation[],
): CompAuditEntry[] {
  // 12 most recent issuance entries for the trail. In production this
  // would include redistributes and revokes too; for the demo we focus
  // on the issuance log because that's the data visible in the tab.
  return [...allocations]
    .sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1))
    .slice(0, 12)
    .map((a, i) => ({
      id: `${eventId}_audit_${i}`,
      at: a.issuedAt,
      action: "issued" as const,
      actorInitials: a.issuedByInitials,
      recipientInitials: a.recipientInitials,
      category: a.category,
      ticketCount: a.ticketCount,
    }));
}

const cache = new Map<string, InvitationsData>();

export function getInvitationsByEventId(
  eventId: string,
): InvitationsData | undefined {
  if (cache.has(eventId)) return cache.get(eventId);
  const core = CORE[eventId];
  if (!core) return undefined;

  const allocations: CompAllocation[] = [];
  let totalIssued = 0;
  let totalDelivered = 0;
  let totalScanned = 0;
  let totalAllocation = 0;

  const categories: CompCategoryStat[] = core.perCategory.map((spec) => {
    const built = buildAllocations(
      eventId,
      spec,
      core.issuanceWindowDays.start,
      core.issuanceWindowDays.end,
    );
    allocations.push(...built);
    totalIssued += spec.used;
    totalDelivered += spec.used; // demo: all issued are also delivered
    totalScanned += spec.redeemed;
    totalAllocation += spec.allocated;
    return {
      category: spec.category,
      label: COMP_CATEGORY_LABEL[spec.category],
      allocated: spec.allocated,
      used: spec.used,
      redeemed: spec.redeemed,
    };
  });

  const data: InvitationsData = {
    eventId,
    totalIssued,
    totalDelivered,
    totalScanned,
    scanRatePct:
      totalIssued > 0 ? Math.round((totalScanned / totalIssued) * 1000) / 10 : 0,
    totalAllocation,
    remainingAllocation: totalAllocation - totalIssued,
    categories,
    allocations,
    auditTrail: buildAuditTrail(eventId, allocations),
  };

  cache.set(eventId, data);
  return data;
}

export function hasInvitationsData(eventId: string): boolean {
  return eventId in CORE;
}

export { offsetMin };
