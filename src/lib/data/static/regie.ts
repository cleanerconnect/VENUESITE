// Régie tab mock data. Two anchors:
//
//   - Robbie Williams (evt_jzb_robbie, on_sale, J-67): pre-event mode
//     with a mostly-pending checklist and a sample will-call list.
//   - Jazzablanca 2025 (evt_jzb_2025_full, settled): replay mode with
//     populated live-ops data — 5 747 scans across 4 gates, 12 comps
//     issued at the door, 3 walk-up sales, 2 scanner staff issues.
//
// Other on_sale / live events fall back to a generic pre-event
// checklist (everything pending) so the tab is never empty.

import type {
  ChecklistItem,
  Gate,
  LiveOpsEntry,
  RegieAnomaly,
  RegieData,
  WillCallAttendee,
} from "@/lib/types/regie";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();
const offsetMin = (m: number) => new Date(NOW - m * 60_000).toISOString();
const offsetDays = (d: number) =>
  new Date(NOW - d * 24 * 3600_000).toISOString();

// === Will-call sample pool — used by all events ───────────────────────
const WILL_CALL_SEED: WillCallAttendee[] = [
  {
    id: "wc_yasmine",
    fullName: "Yasmine Bennani",
    initials: "Y. B.",
    tierName: "Carré Or",
    paymentStatus: "paid",
    amountPaidLabel: "1 200 MAD",
    email: "yasmine.b@example.ma",
    phone: "+212 661 23 45 67",
  },
  {
    id: "wc_karim",
    fullName: "Karim Lahlou",
    initials: "K. L.",
    tierName: "Pass Jour · General",
    paymentStatus: "paid",
    amountPaidLabel: "590 MAD",
    email: "karim.l@example.ma",
    phone: "+212 662 11 22 33",
  },
  {
    id: "wc_sophie",
    fullName: "Sophie Renaud",
    initials: "S. R.",
    tierName: "Pass Week-End 2",
    paymentStatus: "paid",
    amountPaidLabel: "980 MAD",
    email: "sophie.r@example.fr",
    phone: "+33 6 12 34 56 78",
  },
  {
    id: "wc_camille",
    fullName: "Camille Moreau",
    initials: "C. M.",
    tierName: "Pass Jour · General",
    paymentStatus: "comp",
    amountPaidLabel: "Comp · Presse",
    email: "camille.moreau@lemonde.fr",
    phone: "+33 6 87 12 34 56",
  },
  {
    id: "wc_hicham",
    fullName: "Hicham El Idrissi",
    initials: "H. E. I.",
    tierName: "Carré Or",
    paymentStatus: "paid",
    amountPaidLabel: "1 200 MAD",
    email: "hicham.e@example.ma",
    phone: "+212 664 12 34 56",
  },
  {
    id: "wc_ram",
    fullName: "Royal Air Maroc",
    initials: "R. A. M.",
    tierName: "Carré Or × 12",
    paymentStatus: "partner",
    amountPaidLabel: "Partenaire titre",
    email: "billetterie@royalairmaroc.com",
    phone: "+212 522 00 99 99",
  },
  {
    id: "wc_anissa",
    fullName: "Anissa Tazi",
    initials: "A. T.",
    tierName: "Pass Semaine 1",
    paymentStatus: "paid",
    amountPaidLabel: "1 400 MAD",
    email: "anissa.t@example.ma",
    phone: "+212 667 33 44 55",
  },
  {
    id: "wc_julien",
    fullName: "Julien Rocher",
    initials: "J. R.",
    tierName: "Pass Jour · General",
    paymentStatus: "comp",
    amountPaidLabel: "Comp · Presse",
    email: "julien.rocher@liberation.fr",
    phone: "+33 6 23 45 67 89",
  },
];

// === Robbie Williams pre-event ─────────────────────────────────────────
const ROBBIE_CHECKLIST: ChecklistItem[] = [
  {
    id: "scanners",
    label: "Scanners affectés",
    description:
      "8 scanners requis sur 4 portes. Affectations + appairage à finaliser.",
    status: "pending",
    details: [
      { label: "Stage 1 · Main — 3 scanners", status: "pending" },
      { label: "Stage 21 — 2 scanners", status: "pending" },
      { label: "Carré Or — 2 scanners", status: "pending" },
      { label: "Presse — 1 scanner", status: "pending" },
    ],
  },
  {
    id: "gate_config",
    label: "Configuration des portes",
    description:
      "Plan de salle, capacités gate par gate, règles d'accès par tarif.",
    status: "in_progress",
    details: [
      { label: "Plan de salle validé", status: "complete" },
      { label: "Capacités par porte saisies", status: "in_progress" },
      { label: "Règles d'accès tarifs croisés", status: "pending" },
    ],
  },
  {
    id: "comps",
    label: "Invitations distribuées",
    description:
      "Liens comp envoyés aux destinataires presse, sponsors, talent, personnel.",
    status: "in_progress",
    details: [
      { label: "Presse · 0 / 100", status: "pending" },
      { label: "Sponsors · 0 / 150", status: "pending" },
      { label: "Talent · 0 / 50", status: "pending" },
      { label: "Personnel · 0 / 30", status: "pending" },
      { label: "Concours · 0 / 10", status: "pending" },
    ],
  },
  {
    id: "staff_brief",
    label: "Briefing équipe terrain",
    description:
      "Briefing scanners, agents d'accueil, sécurité 48h avant le jour J.",
    status: "pending",
    details: [
      { label: "Document briefing rédigé", status: "complete" },
      { label: "Convocation envoyée", status: "pending" },
      { label: "Réunion D-2 planifiée", status: "pending" },
    ],
  },
  {
    id: "comms_dryrun",
    label: "Test de bout-en-bout",
    description: "Achat de test, scan QR, simulation refund — vérification chaîne.",
    status: "complete",
    details: [
      { label: "Achat de test sandbox", status: "complete" },
      { label: "Scan QR validé", status: "complete" },
      { label: "Simulation remboursement", status: "complete" },
    ],
  },
];

// === Jazzablanca 2025 settled — populated replay mode ──────────────────
const JZB_2025_CHECKLIST: ChecklistItem[] = ROBBIE_CHECKLIST.map((item) => ({
  ...item,
  status: "complete" as const,
  details: item.details?.map((d) => ({ ...d, status: "complete" as const })),
}));

const JZB_2025_GATES: Gate[] = [
  {
    id: "g_stage1",
    name: "Stage 1 · Main",
    scansPerMin: 84,
    queueMin: 4,
    staffActive: 6,
    totalScanned: 3_120,
    capacity: 3_400,
    status: "normal",
  },
  {
    id: "g_stage21",
    name: "Stage 21",
    scansPerMin: 38,
    queueMin: 22,
    staffActive: 2,
    totalScanned: 1_640,
    capacity: 1_800,
    status: "alert",
  },
  {
    id: "g_carre",
    name: "Carré Or",
    scansPerMin: 18,
    queueMin: 1,
    staffActive: 2,
    totalScanned: 720,
    capacity: 800,
    status: "normal",
  },
  {
    id: "g_presse",
    name: "Presse",
    scansPerMin: 6,
    queueMin: 8,
    staffActive: 1,
    totalScanned: 267,
    capacity: 320,
    status: "alert",
  },
];

const JZB_2025_ANOMALIES: RegieAnomaly[] = [
  {
    id: "a_queue_21",
    severity: "warning",
    message:
      "File d'attente +18 min vs normal · 22 min sur Stage 21, pic 21h confirmé",
    scope: "Stage 21",
    at: offsetDays(285),
  },
  {
    id: "a_presse_offline",
    severity: "critical",
    message:
      "2 scanners hors-ligne sur Presse · agent de relais à dépêcher, dispo dans 6 min",
    scope: "Presse",
    at: offsetDays(285),
  },
];

const JZB_2025_OPS: LiveOpsEntry[] = [
  {
    id: "ops_1",
    type: "scan_milestone",
    at: offsetDays(285),
    message: "Premier scan jour J · Stage 1, ouverture des portes",
    actorInitials: "H. M.",
  },
  {
    id: "ops_2",
    type: "scan_milestone",
    at: offsetDays(285),
    message: "1 000 scans franchis · Stage 1 mène la cadence",
  },
  {
    id: "ops_3",
    type: "walk_up_sale",
    at: offsetDays(285),
    message: "Vente walk-up · Pass Jour General · 590 MAD encaissé",
    actorInitials: "O. E.",
  },
  {
    id: "ops_4",
    type: "comp_issued",
    at: offsetDays(285),
    message: "Comp door-day · 2 places presse · L'Économiste",
    actorInitials: "I. K.",
  },
  {
    id: "ops_5",
    type: "anomaly_raised",
    at: offsetDays(285),
    message: "Alerte file d'attente Stage 21 · +18 min vs normal",
  },
  {
    id: "ops_6",
    type: "staff_change",
    at: offsetDays(285),
    message: "Renfort scanner dépêché à Stage 21 · 2 → 4 scanners actifs",
    actorInitials: "Y. C.",
  },
  {
    id: "ops_7",
    type: "anomaly_resolved",
    at: offsetDays(285),
    message: "File d'attente Stage 21 normalisée · 22 min → 9 min",
  },
  {
    id: "ops_8",
    type: "scan_milestone",
    at: offsetDays(285),
    message: "5 000 scans franchis · 87 % de la jauge totale",
  },
  {
    id: "ops_9",
    type: "anomaly_raised",
    at: offsetDays(285),
    message: "2 scanners Presse hors-ligne · port USB endommagé",
  },
  {
    id: "ops_10",
    type: "comp_issued",
    at: offsetDays(285),
    message: "Comp door-day · 4 places sponsor · Banque Populaire",
    actorInitials: "S. M.",
  },
  {
    id: "ops_11",
    type: "walk_up_sale",
    at: offsetDays(285),
    message: "Vente walk-up · Carré Or · 1 200 MAD encaissé",
    actorInitials: "O. E.",
  },
  {
    id: "ops_12",
    type: "anomaly_resolved",
    at: offsetDays(285),
    message: "Scanners Presse remplacés · agent de relais opérationnel",
    actorInitials: "Y. C.",
  },
  {
    id: "ops_13",
    type: "scan_milestone",
    at: offsetDays(285),
    message: "Cap 96 % atteint · 5 747 scans / 5 980 inventaire",
  },
];

// === Generic on_sale fallback — empty pre-event ─────────────────────────
const GENERIC_PRE_EVENT_CHECKLIST: ChecklistItem[] = ROBBIE_CHECKLIST.map((c) => ({
  ...c,
  status: "pending" as const,
  details: c.details?.map((d) => ({ ...d, status: "pending" as const })),
}));

// === Builders ───────────────────────────────────────────────────────────
function buildRobbie(): RegieData {
  return {
    eventId: "evt_jzb_robbie",
    defaultMode: "pre_event",
    checklist: ROBBIE_CHECKLIST,
    willCallSample: WILL_CALL_SEED.slice(0, 6),
    totalScanned: 0,
    totalSold: 8420,
    scanRatePct: 0,
    scansLastMinute: 0,
    doorDayLabel: "Vendredi 1er juillet 2026 · 19h00",
    gates: JZB_2025_GATES.map((g) => ({
      ...g,
      scansPerMin: 0,
      queueMin: 0,
      totalScanned: 0,
      status: "offline",
    })),
    anomalies: [],
    liveOpsFeed: [],
  };
}

function buildJazzablanca2025(): RegieData {
  const totalScanned = JZB_2025_GATES.reduce(
    (s, g) => s + g.totalScanned,
    0,
  );
  const totalSold = 5_980;
  return {
    eventId: "evt_jzb_2025_full",
    defaultMode: "live",
    checklist: JZB_2025_CHECKLIST,
    willCallSample: WILL_CALL_SEED,
    totalScanned,
    totalSold,
    scanRatePct: Math.round((totalScanned / totalSold) * 1000) / 10,
    scansLastMinute: JZB_2025_GATES.reduce((s, g) => s + g.scansPerMin, 0),
    doorDayLabel: "Vendredi 11 juillet 2025 · 19h00 · Replay",
    gates: JZB_2025_GATES,
    anomalies: JZB_2025_ANOMALIES,
    liveOpsFeed: JZB_2025_OPS,
  };
}

function buildGenericOnSale(eventId: string): RegieData {
  return {
    eventId,
    defaultMode: "pre_event",
    checklist: GENERIC_PRE_EVENT_CHECKLIST,
    willCallSample: WILL_CALL_SEED.slice(0, 4),
    totalScanned: 0,
    totalSold: 0,
    scanRatePct: 0,
    scansLastMinute: 0,
    doorDayLabel: "Date à venir",
    gates: JZB_2025_GATES.map((g) => ({
      ...g,
      scansPerMin: 0,
      queueMin: 0,
      totalScanned: 0,
      status: "offline",
    })),
    anomalies: [],
    liveOpsFeed: [],
  };
}

const REGISTRY: Record<string, () => RegieData> = {
  evt_jzb_robbie: buildRobbie,
  evt_jzb_2025_full: buildJazzablanca2025,
};

const cache = new Map<string, RegieData>();

export function getRegieByEventId(eventId: string): RegieData | undefined {
  if (cache.has(eventId)) return cache.get(eventId);
  const builder = REGISTRY[eventId] ?? (() => buildGenericOnSale(eventId));
  const data = builder();
  cache.set(eventId, data);
  return data;
}

export { offsetMin };
