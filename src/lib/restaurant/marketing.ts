// Campagnes.
//
// The marketing surface, and the one screen where a mistake is expensive
// in a way the others are not: a badly aimed WhatsApp blast costs money
// per recipient and burns a consent the venue cannot get back. So three
// things are on screen before anything can be sent — who it goes to,
// what it costs, and who must never be contacted.

import type { Block, EntityRow, ScreenSpec } from "@/lib/dashboard/spec";
import { COUNT, MAD, PERCENT } from "@/lib/dashboard/formats";
import type { Campaign, Marketing } from "@/lib/types/venue-operations";
import { restaurantHref } from "./slugs";
import { hm, mobileTiles, money, shortDay } from "./format";

const CHANNEL_LABEL: Record<Campaign["channel"], string> = {
  email: "E-mail",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const TEMPLATE_LABEL: Record<Campaign["template"], string> = {
  offre: "Offre",
  evenement: "Événement",
  newsletter: "Newsletter",
  anniversaire: "Anniversaire",
  win_back: "Reconquête",
};

const AUTOMATION_LABEL: Record<
  Exclude<Campaign["automation"], "">,
  { label: string; trigger: string }
> = {
  bienvenue: { label: "Bienvenue", trigger: "après la première visite" },
  remerciement: {
    label: "Remerciement",
    trigger: "après chaque visite, avec l'invitation à laisser un avis",
  },
  win_back: { label: "Reconquête", trigger: "quatre-vingt-dix jours sans visite" },
  anniversaire: { label: "Anniversaire", trigger: "le jour de l'anniversaire" },
};

const STATUS: Record<
  Campaign["status"],
  { label: string; tone: "success" | "info" | "warning" | "muted" | "live" }
> = {
  envoyee: { label: "ENVOYÉE", tone: "success" },
  programmee: { label: "PROGRAMMÉE", tone: "info" },
  envoi: { label: "EN COURS", tone: "live" },
  en_pause: { label: "EN PAUSE", tone: "warning" },
  brouillon: { label: "BROUILLON", tone: "muted" },
};

export function buildCampaignsScreen(marketing: Marketing): ScreenSpec {
  const oneOff = marketing.campaigns.filter((c) => c.automation === "");
  const automations = marketing.campaigns.filter((c) => c.automation !== "");
  const sent = marketing.campaigns.filter((c) => c.status === "envoyee");

  const delivered = sent.reduce((s, c) => s + c.delivered, 0);
  const opened = sent.reduce((s, c) => s + c.opened, 0);
  const attributed = sent.reduce((s, c) => s + c.reservationsAttributed, 0);

  const kpis: Block = {
    id: "campaign-kpis",
    type: "kpi-grid",
    columns: 4,
    tiles: [
      {
        id: "contactable",
        label: "Clients contactables",
        tone: "sand",
        icon: "users",
        metric: { value: marketing.consent.optedIn, format: COUNT, animate: true },
        hint: `${marketing.consent.optedOut} refus · ${marketing.consent.suppressed} en liste noire`,
      },
      {
        id: "delivered",
        label: "Messages délivrés",
        tone: "surface",
        icon: "message-square",
        metric: { value: delivered, format: COUNT, animate: true },
      },
      {
        id: "open",
        label: "Taux d'ouverture",
        tone: "surface",
        icon: "trend-up",
        metric: {
          value: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
          format: PERCENT,
          animate: true,
        },
        hint: "Les SMS ne remontent pas d'ouverture : la moyenne porte sur les canaux qui le font.",
      },
      {
        id: "attributed",
        label: "Réservations attribuées",
        tone: "surface",
        icon: "calendar-clock",
        metric: { value: attributed, format: COUNT, animate: true },
      },
    ],
  };

  const list: Block = {
    id: "campaigns",
    type: "entity-list",
    heading: "Campagnes",
    headingAction: {
      kind: "command",
      command: "campaign.create",
      label: "Créer une campagne",
      icon: "plus",
    },
    tabs: [
      { id: "all", label: "Toutes" },
      { id: "sent", label: "Envoyées", match: { facet: "status", values: ["envoyee"] } },
      {
        id: "scheduled",
        label: "Programmées",
        match: { facet: "status", values: ["programmee", "envoi"] },
      },
      {
        id: "draft",
        label: "Brouillons",
        match: { facet: "status", values: ["brouillon"] },
      },
    ],
    search: { placeholder: "Rechercher une campagne…" },
    sorts: [
      { id: "recent", label: "Plus récentes", key: "at", direction: "desc" },
      { id: "attributed", label: "Réservations attribuées", key: "attributed", direction: "desc" },
    ],
    rows: oneOff.map(campaignRow),
    empty: {
      title: "Aucune campagne",
      body: "Écrivez au bon segment plutôt qu'à toute la base : les segments se définissent dans Tags et segments.",
      icon: "megaphone",
      action: {
        kind: "link",
        href: restaurantHref("segments"),
        label: "Voir les segments",
      },
    },
    noMatches: { title: "Aucune campagne", body: "Aucune campagne dans cet état." },
  };

  const automationList: Block = {
    id: "automations",
    type: "entity-list",
    heading: "Automatisations",
    // The reconfirmation reminders deliberately are not here: they are
    // service messages, they live in Notifications, and a venue that
    // pauses "marketing" must not silence a J-1 reminder by accident.
    rows: automations.map(campaignRow),
    empty: {
      title: "Aucune automatisation",
      body: "Bienvenue, remerciement, reconquête, anniversaire : quatre messages qui partent tout seuls.",
      icon: "repeat",
    },
  };

  const consent: Block = {
    id: "consent",
    type: "table",
    heading: "Consentement",
    headingAction: {
      kind: "command",
      command: "suppression.add",
      label: "Ajouter à la liste noire",
      icon: "ban",
    },
    columns: [
      { key: "state", label: "État" },
      { key: "count", label: "Clients", align: "right", format: COUNT },
      { key: "note", label: "Ce que cela veut dire", hideOnMobile: true },
    ],
    rows: [
      {
        id: "in",
        cells: {
          state: { value: "Consentement donné", badge: { label: "OK", tone: "success" } },
          count: { value: marketing.consent.optedIn },
          note: { value: "Peuvent recevoir des campagnes." },
        },
      },
      {
        id: "out",
        cells: {
          state: { value: "Refus", badge: { label: "REFUS", tone: "warning" } },
          count: { value: marketing.consent.optedOut },
          note: { value: "Exclus de toute campagne, quel que soit le segment." },
        },
      },
      {
        id: "suppressed",
        cells: {
          state: { value: "Liste noire", badge: { label: "BLOQUÉ", tone: "danger" } },
          count: { value: marketing.consent.suppressed },
          note: {
            value: "Adresses à ne jamais recontacter, même sur demande du lieu.",
          },
        },
      },
    ],
  };

  const suppression: Block = {
    id: "suppression",
    type: "entity-list",
    heading: "Liste noire",
    rows: marketing.suppressions.map((s) => ({
      id: s.contact,
      title: s.contact,
      icon: "ban" as const,
      meta: `${s.reason || "sans motif"} · ${shortDay(s.at)}`,
      badges: [{ label: "BLOQUÉ", tone: "danger" as const }],
    })),
    empty: {
      title: "Liste noire vide",
      body: "Aucune adresse bloquée. Une désinscription y ajoute automatiquement le contact.",
      icon: "ban",
    },
  };

  const log: Block = {
    id: "messages-log",
    type: "entity-list",
    heading: "Journal des envois",
    tabs: [
      { id: "all", label: "Tout" },
      { id: "failed", label: "Échecs", match: { facet: "status", values: ["echoue"] } },
    ],
    rows: marketing.messages.slice(0, 60).map((m) => ({
      id: m.id,
      title: m.recipient,
      icon: (m.channel === "email"
        ? "message"
        : m.channel === "push"
          ? "bell"
          : "message-square") as "message" | "bell" | "message-square",
      meta: [m.kind, `${shortDay(m.at)} à ${hm(m.at)}`, m.preview]
        .filter(Boolean)
        .join(" · "),
      badges: [
        { label: m.channel.toUpperCase(), tone: "neutral" as const },
        m.status === "echoue"
          ? { label: "ÉCHEC", tone: "danger" as const }
          : m.status === "lu"
            ? { label: "LU", tone: "success" as const }
            : { label: m.status.toUpperCase(), tone: "info" as const },
      ],
      facets: { status: m.status, channel: m.channel },
      signal: m.failureReason ? { text: m.failureReason, icon: "alert" as const } : undefined,
    })),
    empty: {
      title: "Aucun message",
      body: "Chaque message envoyé à un client — campagne, rappel, table prête — apparaît ici.",
      icon: "message-square",
    },
    noMatches: { title: "Aucun message", body: "Aucun message dans ce filtre." },
  };

  return {
    slug: "campagnes",
    title: "Campagnes",
    subtitle: "Écrire à ses clients, dans les limites du consentement",
    blocks: [kpis, list, automationList, consent, suppression, log],
    mobileBlocks: [
      { ...kpis, id: "campaign-kpis-mobile", columns: 2, tiles: mobileTiles(kpis) },
      list,
      automationList,
      consent,
      suppression,
      log,
    ],
  };
}

function campaignRow(campaign: Campaign): EntityRow {
  const status = STATUS[campaign.status];
  const automation =
    campaign.automation === "" ? null : AUTOMATION_LABEL[campaign.automation];
  // Quoted before sending, as the spec requires: a WhatsApp blast to
  // four hundred people is a real invoice, and the number belongs on the
  // row rather than in a confirmation nobody reads.
  const cost = campaign.recipients * campaign.unitCostMad;

  return {
    id: campaign.id,
    title: campaign.name,
    icon: campaign.channel === "email" ? "message" : "message-square",
    meta: [
      CHANNEL_LABEL[campaign.channel],
      TEMPLATE_LABEL[campaign.template],
      campaign.segmentName ?? "toute la base consentante",
      automation
        ? `déclenchée ${automation.trigger}`
        : campaign.sentAt
          ? `envoyée le ${shortDay(campaign.sentAt)}`
          : campaign.scheduledFor
            ? `programmée le ${shortDay(campaign.scheduledFor)}`
            : "jamais envoyée",
    ].join(" · "),
    badges: [
      { label: status.label, tone: status.tone },
      ...(automation ? [{ label: "AUTOMATIQUE", tone: "violet" as const }] : []),
    ],
    facets: { status: campaign.status, channel: campaign.channel },
    sortKeys: {
      at: Date.parse(campaign.sentAt ?? campaign.scheduledFor ?? "1970-01-01"),
      attributed: campaign.reservationsAttributed,
    },
    trailing:
      campaign.status === "envoyee"
        ? {
            label: "Réservations",
            metric: { value: campaign.reservationsAttributed, format: COUNT },
          }
        : { label: "Coût estimé", metric: { value: cost, format: MAD } },
    progress:
      campaign.recipients > 0
        ? { value: campaign.opened, max: campaign.recipients, tone: "violet" }
        : undefined,
    progressCaption:
      campaign.recipients > 0
        ? `${campaign.delivered} délivrés · ${campaign.opened} ouverts · ${campaign.clicked} clics · ${campaign.unsubscribed} désinscriptions`
        : undefined,
    detail: {
      title: campaign.name,
      subtitle: `${CHANNEL_LABEL[campaign.channel]} · ${campaign.segmentName ?? "toute la base"}`,
      badges: [{ label: status.label, tone: status.tone }],
      sections: [
        {
          label: "Résultats",
          items: [
            { label: "Destinataires", metric: { value: campaign.recipients, format: COUNT } },
            { label: "Délivrés", metric: { value: campaign.delivered, format: COUNT } },
            { label: "Ouverts", metric: { value: campaign.opened, format: COUNT } },
            { label: "Clics", metric: { value: campaign.clicked, format: COUNT } },
            {
              label: "Réservations attribuées",
              metric: { value: campaign.reservationsAttributed, format: COUNT },
            },
            {
              label: "Désinscriptions",
              metric: { value: campaign.unsubscribed, format: COUNT },
            },
          ],
        },
        {
          label: "Coût",
          items: [
            {
              label: "Par destinataire",
              metric: { value: campaign.unitCostMad, format: MAD },
            },
            { label: "Total", metric: { value: cost, format: MAD } },
          ],
        },
      ],
      notes: [
        { label: "Objet", text: campaign.subject || "—", icon: "note" },
        { label: "Message", text: campaign.body, icon: "message-square" },
      ],
      actions: [
        {
          action: {
            kind: "command",
            command: "campaign.test",
            payload: { id: campaign.id },
            label: "Envoyer un test",
            icon: "message-square",
          },
          variant: "secondary",
        },
        {
          action: {
            kind: "command",
            command: "campaign.edit",
            payload: { id: campaign.id },
            label: "Modifier",
            icon: "settings",
          },
          variant: "primary",
        },
      ],
    },
    menu: [
      {
        id: "duplicate",
        label: "Dupliquer",
        action: {
          kind: "command",
          command: "campaign.duplicate",
          payload: { id: campaign.id },
        },
      },
      {
        id: "test",
        label: "Envoyer un test",
        action: {
          kind: "command",
          command: "campaign.test",
          payload: { id: campaign.id },
        },
      },
      campaign.status === "en_pause"
        ? {
            id: "resume",
            label: "Reprendre",
            action: {
              kind: "command",
              command: "campaign.status",
              payload: { id: campaign.id, status: "programmee" },
            },
          }
        : {
            id: "pause",
            label: "Mettre en pause",
            action: {
              kind: "command",
              command: "campaign.status",
              payload: { id: campaign.id, status: "en_pause" },
            },
          },
      {
        id: "export",
        label: "Exporter les résultats",
        action: {
          kind: "command",
          command: "campaign.export",
          payload: { id: campaign.id },
        },
      },
    ],
  };
}

/** Money helper kept exported for the styleguide's campaign sample. */
export const campaignCost = (campaign: Campaign) =>
  money(campaign.recipients * campaign.unitCostMad);
