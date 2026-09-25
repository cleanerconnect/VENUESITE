// The forms the venue's commands open.
//
// A spec is JSON, so a button carries a command name rather than a
// dialog. This is where a command name becomes the fields it asks for —
// declared once, attached to whichever screen actually references it.
//
// Everything here is data. A backend serving these screens would send
// the same objects, and the client would open the same dialogs, because
// there is no form component per verb anywhere in the codebase.

import type { FormSpec } from "@/lib/dashboard/spec";

const today = () => new Date().toISOString().slice(0, 10);

export const VENUE_FORMS: Record<string, FormSpec> = {
  // ── Service floor ──
  "waitlist.add": {
    title: "Ajouter à la liste d'attente",
    description: "Le groupe reçoit un message dès que sa table est prête.",
    submitLabel: "Ajouter",
    command: "waitlist.add",
    fields: [
      { kind: "text", name: "guestName", label: "Nom", required: true },
      { kind: "number", name: "partySize", label: "Nombre de personnes", value: 2, min: 1, max: 40, required: true },
      {
        kind: "tel",
        name: "guestPhone",
        label: "Téléphone",
        hint: "Sans numéro, il faudra appeler le groupe à voix haute.",
        placeholder: "+212 6…",
      },
      {
        kind: "number",
        name: "quotedMinutes",
        label: "Délai annoncé",
        hint: "En minutes. C'est ce que le groupe entend, et ce sur quoi il vous jugera.",
        value: 20,
        min: 0,
        max: 180,
        step: 5,
        required: true,
      },
    ],
  },

  "waitlist.requote": {
    title: "Modifier le délai",
    description: "Le groupe est prévenu du nouveau délai.",
    submitLabel: "Mettre à jour",
    command: "waitlist.requote",
    fields: [
      { kind: "number", name: "quotedMinutes", label: "Nouveau délai (minutes)", value: 30, min: 0, max: 180, step: 5, required: true },
    ],
  },

  "waitlist.remove": {
    title: "Retirer de la liste",
    description: "La raison est enregistrée : c'est elle qui rend la porte analysable.",
    submitLabel: "Retirer",
    destructive: true,
    command: "waitlist.remove",
    fields: [
      {
        kind: "select",
        name: "reason",
        label: "Raison",
        value: "parti",
        options: [
          { value: "parti", label: "Le groupe est parti" },
          { value: "no_show", label: "Ne s'est pas présenté" },
          { value: "doublon", label: "Doublon" },
        ],
      },
    ],
  },

  "waitlist.convert": {
    title: "Convertir en réservation",
    description: "Le groupe quitte la file et prend une table à l'heure choisie.",
    submitLabel: "Créer la réservation",
    command: "waitlist.convert",
    fields: [
      { kind: "date", name: "date", label: "Date", value: today(), required: true },
      { kind: "time", name: "time", label: "Heure", value: "20:00", required: true },
    ],
  },

  "briefing.addNote": {
    title: "Ajouter une note de service",
    description: "Lue par toute l'équipe au briefing, et sur le téléphone en salle.",
    submitLabel: "Ajouter",
    command: "briefing.addNote",
    fields: [
      {
        kind: "textarea",
        name: "body",
        label: "Note",
        placeholder: "Fontaine en réparation — ne pas placer les tables 4 et 5.",
        required: true,
        rows: 3,
      },
      { kind: "toggle", name: "pinned", label: "Épingler en haut", value: false },
    ],
  },

  "calendar.close": {
    title: "Fermer une journée",
    description: "L'application cesse immédiatement de proposer des créneaux ce jour-là.",
    submitLabel: "Fermer",
    destructive: true,
    command: "calendar.close",
    fields: [
      { kind: "date", name: "date", label: "Date", value: today(), required: true },
      { kind: "text", name: "reason", label: "Raison", placeholder: "Privatisation" },
    ],
  },

  "calendar.capacity": {
    title: "Capacité exceptionnelle",
    description: "Remplace la capacité normale pour cette journée seulement.",
    submitLabel: "Enregistrer",
    command: "calendar.capacity",
    fields: [
      { kind: "date", name: "date", label: "Date", value: today(), required: true },
      { kind: "number", name: "capacity", label: "Capacité", value: 60, min: 0, required: true },
      { kind: "text", name: "note", label: "Note", placeholder: "Équipe réduite" },
    ],
  },

  // ── Guest vocabulary ──
  "tag.create": {
    title: "Créer une étiquette",
    submitLabel: "Créer",
    command: "tag.create",
    fields: [
      { kind: "text", name: "label", label: "Nom", required: true, placeholder: "Presse" },
      {
        kind: "select",
        name: "colour",
        label: "Couleur",
        value: "violet",
        options: [
          { value: "violet", label: "Violet" },
          { value: "sky", label: "Bleu" },
          { value: "sage", label: "Vert" },
          { value: "rose", label: "Rose" },
          { value: "peach", label: "Orange" },
          { value: "sand", label: "Sable" },
        ],
      },
      {
        kind: "toggle",
        name: "staffVisible",
        label: "Visible par l'équipe en salle",
        hint: "Décochez pour une étiquette réservée à la direction.",
        value: true,
      },
    ],
  },

  "tag.edit": {
    title: "Modifier l'étiquette",
    submitLabel: "Enregistrer",
    command: "tag.edit",
    fields: [
      { kind: "text", name: "label", label: "Nom", required: true },
      {
        kind: "select",
        name: "colour",
        label: "Couleur",
        value: "violet",
        options: [
          { value: "violet", label: "Violet" },
          { value: "sky", label: "Bleu" },
          { value: "sage", label: "Vert" },
          { value: "rose", label: "Rose" },
          { value: "peach", label: "Orange" },
          { value: "sand", label: "Sable" },
        ],
      },
      { kind: "toggle", name: "staffVisible", label: "Visible par l'équipe", value: true },
    ],
  },

  "segment.create": {
    title: "Créer un segment",
    description: "Réutilisable dans Liste clients et dans Campagnes.",
    submitLabel: "Créer",
    command: "segment.create",
    fields: [
      { kind: "text", name: "name", label: "Nom", required: true, placeholder: "Habitués du week-end" },
      { kind: "text", name: "description", label: "Description" },
      {
        kind: "text",
        name: "tags",
        label: "Étiquettes",
        hint: "Identifiants séparés par des virgules. Laissez vide pour toute la base.",
      },
    ],
  },

  // ── Growth ──
  "offer.create": {
    title: "Créer une offre",
    description: "L'offre apparaît sur la fiche dans l'application et s'applique à la réservation.",
    submitLabel: "Créer",
    command: "offer.create",
    fields: [
      { kind: "text", name: "name", label: "Nom", required: true, placeholder: "Déjeuner découverte -20 %" },
      {
        kind: "select",
        name: "offerKind",
        label: "Type",
        value: "percent",
        options: [
          { value: "percent", label: "Pourcentage sur l'addition" },
          { value: "amount", label: "Montant fixe" },
          { value: "free_item", label: "Produit offert" },
          { value: "set_menu", label: "Menu à prix fixe" },
        ],
      },
      {
        kind: "number",
        name: "value",
        label: "Valeur",
        hint: "Points de pourcentage, ou MAD selon le type.",
        value: 20,
        min: 0,
      },
      { kind: "text", name: "freeItemLabel", label: "Produit offert", hint: "Uniquement pour le type « Produit offert »." },
      {
        kind: "text",
        name: "weekdays",
        label: "Jours",
        hint: "1 = lundi. Par exemple 1,2,3,4 pour du lundi au jeudi.",
        value: "1,2,3,4,5,6,7",
      },
      { kind: "date", name: "startsOn", label: "Début", value: today(), required: true },
      { kind: "date", name: "endsOn", label: "Fin", value: today(), required: true },
      {
        kind: "number",
        name: "coverCap",
        label: "Plafond de couverts",
        hint: "0 pour aucun plafond.",
        value: 0,
        min: 0,
      },
      { kind: "number", name: "minParty", label: "Groupe minimum", value: 1, min: 1 },
      { kind: "toggle", name: "prepaymentRequired", label: "Prépaiement obligatoire", value: false },
      {
        kind: "select",
        name: "status",
        label: "État",
        value: "draft",
        options: [
          { value: "draft", label: "Brouillon" },
          { value: "scheduled", label: "Planifiée" },
          { value: "active", label: "Active" },
        ],
      },
    ],
  },

  "experience.create": {
    title: "Créer une expérience",
    description: "Une soirée, un atelier, un brunch : vendu à la place — pas à la table.",
    submitLabel: "Créer",
    command: "experience.create",
    fields: [
      { kind: "text", name: "title", label: "Titre", required: true },
      { kind: "textarea", name: "description", label: "Description", rows: 3 },
      { kind: "date", name: "date", label: "Date", value: today(), required: true },
      { kind: "time", name: "time", label: "Début", value: "19:00", required: true },
      { kind: "time", name: "endTime", label: "Fin", value: "23:00", required: true },
      { kind: "number", name: "capacity", label: "Places", value: 20, min: 1, required: true },
      { kind: "number", name: "priceMad", label: "Prix par personne (MAD)", value: 500, min: 0, required: true },
      {
        kind: "number",
        name: "prepayPercent",
        label: "Part payée d'avance",
        hint: "0 = rien d'avance, 100 = prépaiement intégral.",
        value: 50,
        min: 0,
        max: 100,
        step: 10,
      },
      { kind: "textarea", name: "cancellationTerms", label: "Conditions d'annulation", rows: 2 },
    ],
  },

  // ── Vie nocturne ──
  "guestList.addEntry": {
    title: "Ajouter une entrée",
    submitLabel: "Ajouter",
    command: "guestList.addEntry",
    fields: [
      { kind: "text", name: "guestName", label: "Nom", required: true },
      { kind: "number", name: "partySize", label: "Nombre de personnes", value: 1, min: 1, max: 30 },
      { kind: "tel", name: "guestPhone", label: "Téléphone" },
      {
        kind: "select",
        name: "source",
        label: "Origine",
        value: "sur_place",
        options: [
          { value: "sur_place", label: "Sur place" },
          { value: "promoteur", label: "Promoteur" },
          { value: "app", label: "Application" },
        ],
      },
      {
        kind: "text",
        name: "promoterId",
        label: "Promoteur",
        hint: "Identifiant du promoteur, si l'entrée lui est attribuée.",
      },
    ],
  },

  "tableType.create": {
    title: "Ajouter un type de table",
    submitLabel: "Ajouter",
    command: "tableType.create",
    fields: [
      { kind: "text", name: "name", label: "Nom", required: true, placeholder: "Banquette Lounge" },
      { kind: "number", name: "count", label: "Nombre de tables", value: 4, min: 1 },
      { kind: "number", name: "minGuests", label: "Personnes minimum", value: 4, min: 1 },
      { kind: "number", name: "maxGuests", label: "Personnes maximum", value: 10, min: 1 },
      {
        kind: "number",
        name: "depositPercent",
        label: "Acompte",
        hint: "Pourcentage du minimum de consommation.",
        value: 30,
        min: 0,
        max: 100,
        step: 5,
      },
      { kind: "text", name: "packageLabel", label: "Prestation incluse", placeholder: "Deux bouteilles, softs, service" },
      { kind: "number", name: "cancellationHours", label: "Annulation gratuite (heures avant)", value: 48, min: 0 },
    ],
  },

  "tableOffer.edit": {
    title: "Définir un minimum",
    submitLabel: "Enregistrer",
    command: "tableOffer.edit",
    fields: [
      { kind: "text", name: "tableTypeId", label: "Type de table", required: true },
      {
        kind: "select",
        name: "nightKind",
        label: "Type de nuit",
        value: "weekend",
        options: [
          { value: "semaine", label: "Semaine" },
          { value: "weekend", label: "Week-end" },
          { value: "evenement", label: "Événement spécial" },
        ],
      },
      { kind: "number", name: "minimumMad", label: "Minimum (MAD)", value: 5000, min: 0, required: true },
    ],
  },

  "table.markReached": {
    title: "Minimum atteint",
    description: "Sans source de paiement branchée, ce montant est saisi à la main.",
    submitLabel: "Enregistrer",
    command: "table.markReached",
    fields: [
      { kind: "number", name: "amountMad", label: "Montant consommé (MAD)", value: 0, min: 0, required: true },
    ],
  },

  "promoter.create": {
    title: "Ajouter un promoteur",
    description: "Un lien de partage lui est attribué : les réservations faites depuis ce lien lui reviennent.",
    submitLabel: "Ajouter",
    command: "promoter.create",
    fields: [
      { kind: "text", name: "fullName", label: "Nom", required: true },
      { kind: "tel", name: "phone", label: "Téléphone" },
      { kind: "number", name: "commissionPercent", label: "Commission (%)", value: 0, min: 0, max: 50 },
    ],
  },

  // ── Paiements ──
  "depositPolicy.create": {
    title: "Ajouter une règle d'acompte",
    submitLabel: "Ajouter",
    command: "depositPolicy.create",
    fields: [
      { kind: "text", name: "name", label: "Nom de la règle", required: true, placeholder: "Groupes de 8 et plus" },
      {
        kind: "select",
        name: "appliesTo",
        label: "S'applique à",
        value: "party_size",
        options: [
          { value: "party_size", label: "Une taille de groupe" },
          { value: "service", label: "Un service" },
          { value: "night", label: "Une nuit" },
          { value: "experience", label: "Les expériences" },
          { value: "table", label: "Les tables avec minimum" },
        ],
      },
      { kind: "text", name: "appliesValue", label: "Valeur", hint: "La taille de groupe, ou l'identifiant concerné." },
      {
        kind: "select",
        name: "mode",
        label: "Forme",
        value: "per_person",
        options: [
          { value: "none", label: "Aucun" },
          { value: "imprint", label: "Empreinte de carte" },
          { value: "per_person", label: "Acompte par personne" },
          { value: "full", label: "Prépaiement intégral" },
        ],
      },
      { kind: "number", name: "amountMad", label: "Montant (MAD)", value: 100, min: 0 },
      { kind: "number", name: "noShowFeeMad", label: "Frais d'absence (MAD)", value: 200, min: 0 },
    ],
  },

  "deposit.capture": {
    title: "Capturer l'acompte",
    description:
      "Le montant est prélevé. L'opération porte une clé d'idempotence : un double envoi est refusé, pas rejoué.",
    submitLabel: "Capturer",
    destructive: true,
    command: "deposit.capture",
    fields: [
      {
        kind: "note",
        name: "warning",
        label: "Cette action prélève réellement le client.",
        hint: "Elle n'est justifiée qu'après une absence constatée, passé le délai de tolérance.",
      },
    ],
  },

  "deposit.refund": {
    title: "Rembourser l'acompte",
    submitLabel: "Rembourser",
    command: "deposit.refund",
    fields: [
      {
        kind: "note",
        name: "warning",
        label: "Le montant est rendu au client.",
        hint: "Le remboursement peut mettre plusieurs jours à apparaître sur son relevé.",
      },
    ],
  },

  "transaction.link": {
    title: "Lier à une réservation",
    submitLabel: "Lier",
    command: "transaction.link",
    fields: [
      {
        kind: "text",
        name: "reservationId",
        label: "Identifiant de la réservation",
        required: true,
        hint: "Visible dans le carnet, sur la fiche de la réservation.",
      },
    ],
  },

  // ── Marketing ──
  "campaign.create": {
    title: "Créer une campagne",
    description: "Le coût par destinataire est rappelé avant l'envoi.",
    submitLabel: "Enregistrer le brouillon",
    command: "campaign.create",
    fields: [
      { kind: "text", name: "name", label: "Nom interne", required: true },
      {
        kind: "select",
        name: "channel",
        label: "Canal",
        value: "email",
        options: [
          { value: "email", label: "E-mail — 0,02 MAD par envoi" },
          { value: "whatsapp", label: "WhatsApp — 0,18 MAD par envoi" },
          { value: "sms", label: "SMS — 0,35 MAD par envoi" },
        ],
      },
      {
        kind: "select",
        name: "template",
        label: "Gabarit",
        value: "newsletter",
        options: [
          { value: "offre", label: "Offre" },
          { value: "evenement", label: "Événement" },
          { value: "newsletter", label: "Newsletter" },
          { value: "anniversaire", label: "Anniversaire" },
          { value: "win_back", label: "Reconquête" },
        ],
      },
      {
        kind: "text",
        name: "segmentId",
        label: "Segment",
        hint: "Identifiant du segment. Vide = toute la base consentante.",
      },
      { kind: "text", name: "subject", label: "Objet", required: true },
      {
        kind: "textarea",
        name: "body",
        label: "Message",
        hint: "{{prenom}} est remplacé par le prénom du destinataire.",
        rows: 5,
        required: true,
      },
      { kind: "date", name: "scheduledFor", label: "Programmer pour", hint: "Vide pour garder en brouillon." },
    ],
  },

  "campaign.test": {
    title: "Envoyer un test",
    submitLabel: "Envoyer",
    command: "campaign.test",
    fields: [
      {
        kind: "text",
        name: "recipient",
        label: "Destinataire",
        hint: "Une adresse ou un numéro. Le test est journalisé comme un envoi réel.",
        required: true,
      },
    ],
  },

  "suppression.add": {
    title: "Ajouter à la liste noire",
    description: "Ce contact ne recevra plus rien, quel que soit le segment.",
    submitLabel: "Ajouter",
    destructive: true,
    command: "suppression.add",
    fields: [
      { kind: "text", name: "contact", label: "Adresse ou numéro", required: true },
      { kind: "text", name: "reason", label: "Raison" },
    ],
  },

  // ── Disponibilités ──
  "service.create": {
    title: "Ajouter un service",
    description: "Ce que l'application propose à la réservation change dès l'enregistrement.",
    submitLabel: "Ajouter",
    command: "service.create",
    fields: [
      { kind: "text", name: "name", label: "Nom", required: true, placeholder: "Dîner" },
      {
        kind: "text",
        name: "weekdays",
        label: "Jours",
        hint: "1 = lundi. Par exemple 3,4,5,6,7.",
        value: "1,2,3,4,5,6,7",
      },
      { kind: "time", name: "startsAt", label: "Ouverture", value: "19:00", required: true },
      { kind: "time", name: "endsAt", label: "Fermeture", value: "23:00", required: true },
      {
        kind: "time",
        name: "lastBookingAt",
        label: "Dernière réservation acceptée",
        value: "22:00",
        required: true,
      },
      { kind: "number", name: "capacityCovers", label: "Capacité", value: 60, min: 1 },
      {
        kind: "number",
        name: "coversPerQuarter",
        label: "Couverts par quart d'heure",
        hint: "Le plafond d'arrivées, pour que la cuisine tienne.",
        value: 10,
        min: 1,
      },
      { kind: "number", name: "turnMinutesSmall", label: "Durée d'une petite table (min)", value: 90, min: 15, step: 15 },
      { kind: "number", name: "turnMinutesLarge", label: "Durée d'une grande table (min)", value: 120, min: 15, step: 15 },
      { kind: "toggle", name: "enabled", label: "Actif", value: true },
    ],
  },

  // ── Support ──
  "support.contact": {
    title: "Ouvrir un ticket",
    description: "Réponse sous un jour ouvré. Pour un service en cours, WhatsApp est plus rapide.",
    submitLabel: "Envoyer",
    command: "support.contact",
    fields: [
      {
        kind: "select",
        name: "category",
        label: "Catégorie",
        value: "Réservations",
        options: [
          { value: "Réservations", label: "Réservations" },
          { value: "Paiements", label: "Paiements" },
          { value: "Application", label: "Fiche et application" },
          { value: "Abonnement", label: "Abonnement et facturation" },
          { value: "Général", label: "Autre" },
        ],
      },
      { kind: "text", name: "subject", label: "Sujet", required: true },
      { kind: "textarea", name: "body", label: "Détail", rows: 5, required: true },
    ],
  },
};

/**
 * The forms a spec actually references.
 *
 * Attached per screen rather than shipped whole: a spec that carries
 * thirty dialogs it never opens is thirty dialogs a backend would have
 * to serialise for nothing.
 */
export function formsFor(spec: unknown): Record<string, FormSpec> | undefined {
  const serialised = JSON.stringify(spec);
  const used: Record<string, FormSpec> = {};
  for (const [command, form] of Object.entries(VENUE_FORMS)) {
    if (serialised.includes(`"${command}"`)) used[command] = form;
  }
  return Object.keys(used).length > 0 ? used : undefined;
}
