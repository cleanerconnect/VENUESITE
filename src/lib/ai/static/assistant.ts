// Mock the LLM. Voice = calm, concise, hospitality-industry confident.
// Never enthusiastic, never apologetic, never "Sure! I'd be happy to help!"
// When we wire this to a real /api/assistant endpoint later, the streaming
// UI stays identical, the consumer just calls a different generator.

const RESPONSES: { match: RegExp; reply: string }[] = [
  {
    match: /(hier|veille|soir.*derni)/i,
    reply:
      "Hier soir, 318 entrées sur 320 prévues, deux no-shows tardifs sur du VIP Lounge, sans incidence sur le service. Pic à 22h17, encaissement total 84 200 MAD. Le tarif Early Bird s'est écoulé en moins d'une heure. Si vous voulez, on peut comparer aux trois dernières éditions de la même soirée.",
  },
  {
    match: /(meilleur|fid.le|client|habitu.|top)/i,
    reply:
      "Sur les 30 derniers jours, vos 5 meilleurs clients par nombre de billets : Mehdi Raji (12), Anissa Tazi (8), Karim Lahlou (7), Layla Fassi (6), Hicham El Idrissi (6). Trois d'entre eux ont déjà acheté pour ce soir. Voulez-vous que je prépare un message WhatsApp personnalisé pour les remercier ?",
  },
  {
    match: /(brouillon|cr.er|nouvelle|comme.*derni)/i,
    reply:
      "Brouillon créé en reprenant la fiche de votre dernière Soirée Afrobeats : trois tarifs (Early Bird 200 MAD, General 280 MAD, VIP Lounge 600 MAD), politique de remboursement automatique, 21+, code vestimentaire smart casual. Date suggérée : vendredi prochain à 23h. Vous pouvez l'ouvrir et l'éditer avant soumission.",
  },
  {
    match: /(scanner|porte|qr|entr.e)/i,
    reply:
      "Hamza est connecté en mode scanner depuis 19h12, Imane depuis 19h28. 247 billets scannés sur 500. Le rythme est conforme à l'historique, vous devriez atteindre 90 % de remplissage vers 23h30.",
  },
  {
    match: /(rembours|annul|refund)/i,
    reply:
      "Trois demandes de remboursement en attente, dont une à moins de 2h de SLA (Salma Idrissi, certificat médical). Je peux les ouvrir dans l'onglet Remboursements pour validation manuelle, ou résumer chaque cas si vous préférez décider sans changer d'écran.",
  },
  {
    match: /(versement|paiement|argent|payout)/i,
    reply:
      "Prochain versement programmé pour le 27 avril : 12 450 MAD couvrant 286 billets de la Soirée Afrobeats au Rooftop Mansour. Référence LYFE-PAY-2026-04-29-001. Tous vos versements sont à jour, aucune retenue en cours.",
  },
  {
    match: /(insta|story|promo|partage|whatsapp|facebook)/i,
    reply:
      "Pic prévu à 22h ce soir, c'est la fenêtre idéale pour relancer une story. Je peux pré-remplir le visuel avec le compteur en direct et un lien direct vers la billetterie. Mot d'ordre court, tonalité de votre dernière story qui a converti à 9,2 % : « Ça commence dans 2h, on serre les rangs. »",
  },
  {
    match: /(.*)/,
    reply:
      "Je peux vous aider à analyser vos ventes, préparer un nouvel événement, gérer les remboursements ou répondre à des questions sur vos versements. Posez-moi une question précise, par exemple sur la soirée d'hier, vos meilleurs clients, ou le prochain versement.",
  },
];

export function mockResponse(prompt: string): string {
  for (const r of RESPONSES) {
    if (r.match.test(prompt)) return r.reply;
  }
  return RESPONSES[RESPONSES.length - 1].reply;
}

// Stream a string character-by-character with the timing baked in.
// 28ms/char per the brief. Returns a function that, when called, advances
// one chunk and reports whether streaming is done.
export function makeStream(text: string) {
  let cursor = 0;
  return function next(): { chunk: string; done: boolean } {
    if (cursor >= text.length) return { chunk: "", done: true };
    // Stream a few characters per tick, feels more natural than 1.
    const step = 3;
    const chunk = text.slice(cursor, cursor + step);
    cursor += step;
    return { chunk, done: cursor >= text.length };
  };
}

export const SUGGESTED_PROMPTS = [
  "Comment s'est passée ma soirée d'hier ?",
  "Qui sont mes meilleurs clients ce mois-ci ?",
  "Crée un brouillon comme mon dernier événement",
];
