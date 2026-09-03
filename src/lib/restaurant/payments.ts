// Paiements: Acomptes, Annulations, Lyfe Pay.
//
// The three screens that decide when a guest pays, what happens when
// they do not turn up, and where the money actually went.
//
// One rule runs through all three and is the reason Lyfe Pay is last:
// it is the only legitimate source of "spend" anywhere in the portal.
// Where a venue has no transactions, this screen says so plainly and
// every spend tile elsewhere hides itself rather than estimating.

import type { Block, EntityRow, ScreenSpec, SettingRow } from "@/lib/dashboard/spec";
import { COUNT, MAD, PERCENT } from "@/lib/dashboard/formats";
import type {
  CancellationEntry,
  Deposit,
  DepositPolicy,
  MoneyDesk,
  Transaction,
} from "@/lib/types/venue-operations";
import { restaurantHref } from "./slugs";
import { dayLabel, hm, initialsOf, mobileTiles, money, shortDay } from "./format";

const DEPOSIT_STATUS: Record<
  Deposit["status"],
  { label: string; tone: "warning" | "success" | "info" | "danger" | "muted" }
> = {
  demande: { label: "DEMANDÉ", tone: "warning" },
  paye: { label: "PAYÉ", tone: "success" },
  libere: { label: "LIBÉRÉ", tone: "info" },
  capture: { label: "CAPTURÉ", tone: "info" },
  rembourse: { label: "REMBOURSÉ", tone: "muted" },
  echoue: { label: "ÉCHOUÉ", tone: "danger" },
};

const DEPOSIT_MODE: Record<DepositPolicy["mode"], string> = {
  none: "Aucun",
  imprint: "Empreinte de carte",
  per_person: "Acompte par personne",
  full: "Prépaiement intégral",
};

const APPLIES_TO: Record<DepositPolicy["appliesTo"], string> = {
  party_size: "À partir de",
  service: "Sur le service",
  night: "Sur la nuit",
  experience: "Sur les expériences",
  table: "Sur les tables avec minimum",
};

const METHOD_LABEL: Record<Transaction["method"], string> = {
  wallet: "Portefeuille",
  carte: "Carte",
  tpe: "TPE",
};

// ── Acomptes ─────────────────────────────────────────────────

export function buildDepositsScreen(money_: MoneyDesk): ScreenSpec {
  const deposits = money_.deposits;
  const outstanding = deposits.filter(
    (d) => d.status === "demande" || d.status === "echoue",
  );
  const held = deposits.filter((d) => d.status === "paye");

  const kpis: Block = {
    id: "deposit-kpis",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "outstanding",
        label: "Acomptes en attente",
        tone: outstanding.length > 0 ? "peach" : "sage",
        icon: "hourglass",
        metric: { value: outstanding.length, format: COUNT, animate: true },
        hint: outstanding.length
          ? `${money(outstanding.reduce((s, d) => s + d.amountMad, 0))} non réglés`
          : "Tout est réglé",
      },
      {
        id: "held",
        label: "Montants détenus",
        tone: "sand",
        icon: "wallet",
        metric: {
          value: held.reduce((s, d) => s + d.amountMad, 0),
          format: MAD,
          animate: true,
        },
        hint: `${held.length} acomptes payés, en attente de la venue`,
      },
      {
        id: "failed",
        label: "Paiements échoués",
        tone: deposits.some((d) => d.status === "echoue") ? "rose" : "surface",
        icon: "alert",
        metric: {
          value: deposits.filter((d) => d.status === "echoue").length,
          format: COUNT,
          animate: true,
        },
        hint: "À relancer avant la date de la réservation",
      },
    ],
  };

  const policyRows: SettingRow[] = money_.depositPolicies.flatMap(
    (policy): SettingRow[] => [
      {
        id: `${policy.id}-enabled`,
        label: policy.name,
        hint: `${APPLIES_TO[policy.appliesTo]}${
          policy.appliesValue ? ` ${policy.appliesValue}` : ""
        } · ${DEPOSIT_MODE[policy.mode]}${
          policy.amountMad > 0 ? ` de ${money(policy.amountMad)}` : ""
        }.`,
        control: { kind: "toggle", value: policy.enabled },
        command: "depositPolicy.toggle",
        payload: { id: policy.id, version: policy.version },
        badge: { label: `V${policy.version}`, tone: "neutral" },
        allow: ["owner"],
      },
      {
        id: `${policy.id}-amount`,
        label: `Montant · ${policy.name}`,
        hint: "Par personne pour un acompte, ignoré pour une empreinte de carte.",
        control: { kind: "number", value: policy.amountMad, min: 0, step: 50 },
        command: "depositPolicy.amount",
        payload: { id: policy.id, version: policy.version },
        allow: ["owner"],
      },
      {
        id: `${policy.id}-noshow`,
        label: `Frais d'absence · ${policy.name}`,
        hint: "Prélevé si le client ne se présente pas.",
        control: { kind: "number", value: policy.noShowFeeMad, min: 0, step: 50 },
        command: "depositPolicy.noShowFee",
        payload: { id: policy.id, version: policy.version },
        allow: ["owner"],
      },
      {
        id: `${policy.id}-grace`,
        label: `Tolérance · ${policy.name}`,
        hint: "Minutes de retard avant qu'une absence puisse être constatée.",
        control: { kind: "number", value: policy.graceMinutes, min: 0, max: 120, step: 5 },
        command: "depositPolicy.grace",
        payload: { id: policy.id, version: policy.version },
        allow: ["owner"],
      },
    ],
  );

  const policies: Block = {
    id: "deposit-policies",
    type: "settings",
    heading: "Quand un client paie d'avance",
    subheading:
      "Les règles sont évaluées dans l'ordre : la première qui correspond s'applique.",
    banner: {
      tone: "info",
      title: "Chaque enregistrement est versionné",
      body: "Une modification faite depuis un autre écran pendant que celui-ci était ouvert est refusée, pas fusionnée : de l'argent prélevé selon une règle que personne n'a choisie est pire qu'un enregistrement rejeté.",
    },
    rows: policyRows,
    footerActions: [
      {
        action: {
          kind: "command",
          command: "depositPolicy.create",
          label: "Ajouter une règle",
          icon: "plus",
        },
        variant: "secondary",
        allow: ["owner"],
      },
    ],
  };

  const ledger: Block = {
    id: "deposit-ledger",
    type: "entity-list",
    heading: "Registre des acomptes",
    tabs: [
      { id: "all", label: "Tous" },
      {
        id: "outstanding",
        label: "À régler",
        match: { facet: "status", values: ["demande", "echoue"] },
      },
      { id: "paye", label: "Payés", match: { facet: "status", values: ["paye"] } },
      {
        id: "settled",
        label: "Soldés",
        match: { facet: "status", values: ["capture", "libere", "rembourse"] },
      },
    ],
    search: { placeholder: "Rechercher un client, une référence…" },
    sorts: [
      { id: "recent", label: "Plus récents", key: "at", direction: "desc" },
      { id: "amount", label: "Montant", key: "amount", direction: "desc" },
    ],
    rows: deposits.map(depositRow),
    empty: {
      title: "Aucun acompte",
      body: "Activez une règle ci-dessus et les acomptes demandés apparaîtront ici.",
      icon: "wallet",
    },
    noMatches: { title: "Aucun acompte", body: "Aucun acompte dans cet état." },
  };

  return {
    slug: "acomptes",
    title: "Acomptes",
    subtitle: "Ce qu'un client paie d'avance, et ce qu'il en advient",
    blocks: [kpis, ledger, policies],
    mobileBlocks: [
      { ...kpis, id: "deposit-kpis-mobile", columns: 1, tiles: mobileTiles(kpis) },
      ledger,
      policies,
    ],
  };
}

function depositRow(deposit: Deposit): EntityRow {
  const status = DEPOSIT_STATUS[deposit.status];
  const settleable = deposit.status === "paye";

  return {
    id: deposit.id,
    title: deposit.guestName,
    initials: initialsOf(deposit.guestName),
    meta: [
      `demandé le ${shortDay(deposit.requestedAt)}`,
      deposit.paidAt ? `payé le ${shortDay(deposit.paidAt)}` : "non réglé",
      deposit.processorRef ?? "sans référence",
    ].join(" · "),
    badges: [{ label: status.label, tone: status.tone }],
    facets: { status: deposit.status },
    sortKeys: { at: Date.parse(deposit.requestedAt), amount: deposit.amountMad },
    keywords: deposit.processorRef ?? "",
    trailing: { label: "Montant", metric: { value: deposit.amountMad, format: MAD } },
    signal: deposit.failureReason
      ? { text: deposit.failureReason, icon: "alert" }
      : undefined,
    actions:
      deposit.status === "demande" || deposit.status === "echoue"
        ? [
            {
              action: {
                kind: "command",
                command: "deposit.chase",
                payload: { id: deposit.id },
                label: "Relancer",
                icon: "message-square",
              },
              variant: "primary",
            },
          ]
        : undefined,
    menu: settleable
      ? [
          {
            id: "capture",
            label: "Capturer (absence)",
            action: {
              kind: "command",
              command: "deposit.capture",
              payload: { id: deposit.id },
            },
          },
          {
            id: "release",
            label: "Libérer",
            action: {
              kind: "command",
              command: "deposit.release",
              payload: { id: deposit.id },
            },
          },
          {
            id: "refund",
            label: "Rembourser",
            destructive: true,
            action: {
              kind: "command",
              command: "deposit.refund",
              payload: { id: deposit.id },
            },
          },
        ]
      : undefined,
  };
}

// ── Annulations ──────────────────────────────────────────────

export function buildCancellationsScreen(desk: MoneyDesk): ScreenSpec {
  const policy = desk.cancellationPolicy;
  const log = desk.cancellations;
  const charged = log.filter((c) => c.feeMad > 0 && !c.waived);
  const disputed = log.filter((c) => c.disputed);

  const kpis: Block = {
    id: "cancellation-kpis",
    type: "kpi-grid",
    columns: 3,
    tiles: [
      {
        id: "count",
        label: "Annulations et absences",
        tone: "sand",
        icon: "ban",
        metric: { value: log.length, format: COUNT, animate: true },
        hint: `${log.filter((c) => c.kind === "no_show").length} absences constatées`,
      },
      {
        id: "charged",
        label: "Frais appliqués",
        tone: "surface",
        icon: "coins",
        metric: {
          value: charged.reduce((s, c) => s + c.feeMad, 0),
          format: MAD,
          animate: true,
        },
        hint: `${log.filter((c) => c.waived).length} annulés en geste commercial`,
      },
      {
        id: "disputed",
        label: "Litiges ouverts",
        tone: disputed.length > 0 ? "rose" : "sage",
        icon: "alert",
        metric: { value: disputed.length, format: COUNT, animate: true },
      },
    ],
  };

  const editor: Block = {
    id: "cancellation-policy",
    type: "settings",
    heading: "Conditions d'annulation",
    subheading: "Ce que le client accepte au moment où il réserve.",
    rows: [
      {
        id: "free-until",
        label: "Annulation gratuite jusqu'à",
        hint: "Heures avant l'heure de la réservation.",
        control: { kind: "number", value: policy.freeUntilHours, min: 0, max: 168 },
        command: "cancellationPolicy.freeUntil",
        payload: { version: policy.version },
        allow: ["owner"],
      },
      {
        id: "late-fee",
        label: "Frais d'annulation tardive",
        hint: "Prélevé au-delà du délai gratuit.",
        control: { kind: "number", value: policy.lateFeeMad, min: 0, step: 50 },
        command: "cancellationPolicy.lateFee",
        payload: { version: policy.version },
        allow: ["owner"],
      },
      {
        id: "no-show-fee",
        label: "Frais d'absence",
        hint: "Prélevé quand le client ne se présente pas du tout.",
        control: { kind: "number", value: policy.noShowFeeMad, min: 0, step: 50 },
        command: "cancellationPolicy.noShowFee",
        payload: { version: policy.version },
        allow: ["owner"],
      },
      {
        id: "guest-message",
        label: "Message affiché au client",
        hint: "Montré dans l'application au moment de réserver. Prévisualisé ci-dessous.",
        control: { kind: "text", value: policy.guestMessage, multiline: true },
        command: "cancellationPolicy.message",
        payload: { version: policy.version },
        allow: ["owner"],
      },
    ],
  };

  // The preview is the same text the app shows, rendered as the app
  // renders it. A policy nobody can read as the guest reads it is a
  // policy that gets written for the venue and not for the guest.
  const preview: Block = {
    id: "policy-preview",
    type: "nudge",
    eyebrow: "Aperçu dans l'application",
    icon: "phone",
    headline: "Conditions d'annulation",
    body:
      policy.guestMessage ||
      "Aucun message défini : le client verra les conditions par défaut de LYFE.",
  };

  const logBlock: Block = {
    id: "cancellation-log",
    type: "entity-list",
    heading: "Journal",
    tabs: [
      { id: "all", label: "Tout" },
      {
        id: "cancel",
        label: "Annulations",
        match: { facet: "kind", values: ["annulation"] },
      },
      { id: "noshow", label: "Absences", match: { facet: "kind", values: ["no_show"] } },
      {
        id: "disputed",
        label: "Litiges",
        match: { facet: "disputed", values: ["yes"] },
      },
    ],
    rows: log.map(cancellationRow),
    empty: {
      title: "Aucune annulation",
      body: "Les annulations et absences, avec les frais appliqués, apparaîtront ici.",
      icon: "ban",
    },
    noMatches: { title: "Rien à afficher", body: "Aucune entrée dans ce filtre." },
  };

  return {
    slug: "annulations",
    title: "Annulations",
    subtitle: "Les conditions, et ce qui s'est réellement passé",
    blocks: [kpis, editor, preview, logBlock],
  };
}

function cancellationRow(entry: CancellationEntry): EntityRow {
  const actorLabel =
    entry.actor === "guest"
      ? "à l'initiative du client"
      : entry.actor === "venue"
        ? "à l'initiative du lieu"
        : "constatée automatiquement";

  return {
    id: entry.id,
    title: entry.guestName,
    initials: initialsOf(entry.guestName),
    meta: [shortDay(entry.at), actorLabel, entry.reason || "sans motif"].join(" · "),
    badges: [
      entry.kind === "no_show"
        ? { label: "ABSENCE", tone: "danger" }
        : { label: "ANNULATION", tone: "muted" },
      ...(entry.waived ? [{ label: "FRAIS ANNULÉS", tone: "info" as const }] : []),
      ...(entry.disputed ? [{ label: "LITIGE", tone: "warning" as const }] : []),
    ],
    facets: { kind: entry.kind, disputed: entry.disputed ? "yes" : "no" },
    trailing:
      entry.feeMad > 0
        ? { label: entry.waived ? "Frais annulés" : "Frais", metric: { value: entry.feeMad, format: MAD } }
        : undefined,
    menu: [
      ...(entry.feeMad > 0 && !entry.waived
        ? [
            {
              id: "waive",
              label: "Annuler les frais (geste commercial)",
              action: {
                kind: "command" as const,
                command: "cancellation.waive",
                payload: { id: entry.id },
              },
            },
          ]
        : []),
      {
        id: "dispute",
        label: entry.disputed ? "Clore le litige" : "Marquer un litige",
        action: {
          kind: "command",
          command: "cancellation.dispute",
          payload: { id: entry.id, disputed: !entry.disputed },
        },
      },
    ],
  };
}

// ── Lyfe Pay ─────────────────────────────────────────────────

export function buildLyfePayScreen(
  desk: MoneyDesk,
  payouts: {
    id: string;
    reference: string;
    amountMad: number;
    commissionMad: number;
    scheduledFor: string;
    paidAt: string | null;
    state: string;
  }[],
): ScreenSpec {
  // A venue with no transactions is not an error and not an empty list
  // to apologise for — it is a venue that has not connected Lyfe Pay.
  // Saying that plainly is what stops every spend tile elsewhere from
  // looking broken.
  if (!desk.hasTransactionSource) {
    return {
      slug: "lyfe-pay",
      title: "Lyfe Pay",
      subtitle: "Aucune transaction",
      blocks: [
        {
          id: "no-source",
          type: "nudge",
          eyebrow: "Lyfe Pay n'est pas branché ici",
          icon: "wallet",
          headline: "Aucune transaction n'est passée par LYFE dans cet établissement.",
          body:
            "Les écrans qui parlent de panier moyen, de dépense ou de recette encaissée n'affichent donc rien plutôt qu'une estimation. Branchez Lyfe Pay pour que ces chiffres existent, ou continuez à saisir les montants à la main là où c'est proposé.",
          actions: [
            {
              action: {
                kind: "link",
                href: restaurantHref("parametres"),
                label: "Coordonnées bancaires",
                icon: "settings",
              },
              variant: "secondary",
            },
            {
              action: {
                kind: "command",
                command: "support.contact",
                label: "Demander l'activation",
                icon: "message-square",
              },
              variant: "primary",
            },
          ],
        },
        {
          id: "payouts-empty",
          type: "entity-list",
          heading: "Reversements",
          rows: payouts.map(payoutRow),
          empty: {
            title: "Aucun reversement",
            body: "Les virements vers le compte de l'établissement apparaîtront ici.",
            icon: "banknote",
          },
        },
      ],
    };
  }

  const successful = desk.transactions.filter((t) => t.status === "reussie");
  const gross = successful.reduce((s, t) => s + t.amountMad, 0);
  const fees = successful.reduce((s, t) => s + t.feeMad, 0);

  const kpis: Block = {
    id: "pay-kpis",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "gross",
        label: "Encaissé",
        tone: "sand",
        icon: "coins",
        metric: { value: gross, format: MAD, animate: true },
        hint: `${successful.length} transactions réussies`,
      },
      {
        id: "fees",
        label: "Commissions",
        tone: "surface",
        icon: "percent",
        metric: { value: fees, format: MAD, animate: true },
        hint: gross > 0 ? `${((fees / gross) * 100).toFixed(1)} % du brut` : undefined,
      },
      {
        id: "net",
        label: "Net à reverser",
        tone: "surface",
        icon: "banknote",
        metric: { value: gross - fees, format: MAD, animate: true },
      },
      {
        id: "ticket",
        label: "Ticket moyen",
        tone: "surface",
        icon: "receipt",
        // Only computable because transactions exist. Elsewhere this
        // tile is absent, which is the point of the rule.
        metric: {
          value: successful.length > 0 ? Math.round(gross / successful.length) : 0,
          format: MAD,
          animate: true,
        },
      },
    ],
  };

  const byDay = new Map<string, number>();
  for (const t of successful) {
    const day = t.at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + t.amountMad);
  }
  const daily: Block = {
    id: "pay-daily",
    type: "chart",
    heading: "Encaissements par jour",
    subheading: "Transactions réussies passées par Lyfe Pay.",
    variant: "bar",
    valueFormat: MAD,
    series: [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([day, value]) => ({ label: shortDay(`${day}T12:00:00Z`), value })),
  };

  const transactions: Block = {
    id: "transactions",
    type: "entity-list",
    heading: "Transactions",
    tabs: [
      { id: "all", label: "Toutes" },
      { id: "wallet", label: "Portefeuille", match: { facet: "method", values: ["wallet"] } },
      { id: "carte", label: "Carte", match: { facet: "method", values: ["carte"] } },
      { id: "tpe", label: "TPE", match: { facet: "method", values: ["tpe"] } },
      {
        id: "issues",
        label: "Incidents",
        match: { facet: "status", values: ["remboursee", "echouee"] },
      },
    ],
    search: { placeholder: "Rechercher une référence…" },
    sorts: [
      { id: "recent", label: "Plus récentes", key: "at", direction: "desc" },
      { id: "amount", label: "Montant", key: "amount", direction: "desc" },
    ],
    rows: desk.transactions.map(transactionRow),
    empty: {
      title: "Aucune transaction",
      body: "Les paiements passés par Lyfe Pay apparaîtront ici.",
      icon: "wallet",
    },
    noMatches: { title: "Aucune transaction", body: "Aucune transaction dans ce filtre." },
  };

  const payoutList: Block = {
    id: "payouts",
    type: "entity-list",
    heading: "Reversements",
    rows: payouts.map(payoutRow),
    empty: {
      title: "Aucun reversement",
      body: "Les virements vers le compte de l'établissement apparaîtront ici.",
      icon: "banknote",
    },
  };

  return {
    slug: "lyfe-pay",
    title: "Lyfe Pay",
    subtitle: "La seule source de dépense du tableau de bord",
    blocks: [kpis, daily, transactions, payoutList],
    mobileBlocks: [
      { ...kpis, id: "pay-kpis-mobile", columns: 2, tiles: mobileTiles(kpis) },
      transactions,
      payoutList,
    ],
  };
}

function transactionRow(transaction: Transaction): EntityRow {
  return {
    id: transaction.id,
    title: `${METHOD_LABEL[transaction.method]} · ${money(transaction.amountMad)}`,
    icon: transaction.method === "wallet" ? "wallet" : "banknote",
    meta: [
      `${dayLabel(transaction.at)} à ${hm(transaction.at)}`,
      transaction.processorRef ?? "sans référence",
      transaction.reservationId
        ? `liée à ${transaction.reservationId}`
        : "non rattachée à une réservation",
    ].join(" · "),
    badges:
      transaction.status === "reussie"
        ? [{ label: "RÉUSSIE", tone: "success" }]
        : transaction.status === "remboursee"
          ? [{ label: "REMBOURSÉE", tone: "muted" }]
          : [{ label: "ÉCHOUÉE", tone: "danger" }],
    facets: { method: transaction.method, status: transaction.status },
    sortKeys: { at: Date.parse(transaction.at), amount: transaction.amountMad },
    keywords: transaction.processorRef ?? "",
    trailing: { label: "Commission", metric: { value: transaction.feeMad, format: MAD } },
    menu: transaction.reservationId
      ? undefined
      : [
          {
            id: "link",
            label: "Lier à une réservation",
            action: {
              kind: "command",
              command: "transaction.link",
              payload: { id: transaction.id },
            },
          },
        ],
  };
}

function payoutRow(payout: {
  id: string;
  reference: string;
  amountMad: number;
  commissionMad: number;
  scheduledFor: string;
  paidAt: string | null;
  state: string;
}): EntityRow {
  return {
    id: payout.id,
    title: payout.reference,
    icon: "banknote",
    meta: [
      payout.paidAt
        ? `versé le ${shortDay(payout.paidAt)}`
        : `prévu le ${shortDay(payout.scheduledFor)}`,
      `commission ${money(payout.commissionMad)}`,
    ].join(" · "),
    badges:
      payout.paidAt !== null
        ? [{ label: "VERSÉ", tone: "success" }]
        : [{ label: "PROGRAMMÉ", tone: "info" }],
    trailing: { label: "Montant", metric: { value: payout.amountMad, format: MAD } },
    menu: [
      {
        id: "statement",
        label: "Voir le relevé",
        action: {
          kind: "command",
          command: "payout.statement",
          payload: { id: payout.id },
        },
      },
    ],
  };
}

/** Percentage helper shared by the fee tiles. Kept for the styleguide. */
export const PERCENT_FORMAT = PERCENT;
