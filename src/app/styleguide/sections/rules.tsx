"use client";

import { Specimen } from "../Shell";

// Les règles.
//
// Les autres sections de cette page montrent ce que le portail contient.
// Celle-ci dit ce qui est permis. La différence compte : un exemple se
// recopie, une règle se vérifie. Chaque ligne ci-dessous est une phrase
// qu'on peut opposer à un écran, et `docs/DESIGN_AUDIT.md` est le
// compte-rendu de ce que ça a donné la première fois qu'on l'a fait.
//
// Deux règles qui se contredisent : celle qui aide le patron à décider
// plus vite gagne. C'est la seule hiérarchie qu'il y a ici.

type Rule = { rule: string; why?: string };

/** Une liste de règles numérotées, pas de puces : on cite un numéro. */
function Rules({ items }: { items: Rule[] }) {
  return (
    <ol className="space-y-3">
      {items.map((r, i) => (
        <li key={r.rule} className="flex gap-3">
          <span className="text-meta num font-semibold text-ink-mute w-6 shrink-0 pt-1">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-body text-ink">{r.rule}</p>
            {r.why ? (
              <p className="text-meta text-ink-mute mt-1">{r.why}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Un tableau à deux colonnes : la relation, sa distance. */
function Table({
  head,
  rows,
}: {
  head: [string, string];
  rows: [string, string][];
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-line">
          <th className="text-meta font-semibold text-ink-mute pb-2">{head[0]}</th>
          <th className="text-meta font-semibold text-ink-mute pb-2">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a} className="border-b border-line-soft last:border-b-0">
            <td className="text-body text-ink py-2 pr-4">{a}</td>
            <td className="text-body num text-ink py-2">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const RHYTHM: [string, string][] = [
  ["Libellé → son champ", "8"],
  ["Champ → champ dans un groupe", "16"],
  ["Groupe → groupe", "32"],
  ["Carte → carte", "24"],
  ["Section → section", "48"],
  ["Bord de page → contenu", "32 à 1440 · 16 à 390"],
];

const SCALE: [string, string][] = [
  ["Titre d'écran, salutation", "36 / 700 / 1,1"],
  ["Titre d'un groupe de cartes", "24 / 700 / 1,25"],
  ["Heure et couverts d'une ligne", "22 / 700 / 1,1 · num"],
  ["Titre de carte", "18 / 700 / 1,3"],
  ["Nom sur une ligne, libellé d'un champ", "18 / 600 / 1,3"],
  ["Texte courant, libellé de bouton", "16 / 500–600 / 1,5"],
  ["Complément : détail, aide, horodatage", "13 / 500–600 / 1,45"],
];

const ROLES: [string, string][] = [
  ["Violet", "l'action principale et l'état actif. Rien d'autre."],
  ["Vert", "réservation confirmée"],
  ["Orange", "réservation en attente"],
  ["Rouge", "réservation refusée, et l'erreur d'un champ"],
  ["Gris", "réservation passée ou annulée"],
  ["Encre à 70 %", "texte secondaire. Jamais une bordure."],
];

export function RulesSection() {
  return (
    <>
      <Specimen name="Le rythme" note="mesuré au modèle de boîte, pas à l'œil">
        <div className="space-y-6">
          <p className="text-body text-ink">
            Les distances permises à l'intérieur d'un écran, en pixels :{" "}
            <strong className="num font-semibold">
              4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
            </strong>
            . Une valeur en dehors est un constat, pas un choix — et six
            pixels à côté de huit disent « sans rapport » deux fois, dans
            deux voix différentes.
          </p>
          <Table head={["Ce qui est séparé", "Par combien"]} rows={RHYTHM} />
          <p className="text-meta text-ink-mute">
            Ce qui va ensemble est plus près que ce qui ne va pas ensemble :
            c'est à ça que sert le tableau. Un écart hors gamme se corrige,
            ou porte par écrit la raison pour laquelle il reste — à
            l'endroit où il est écrit, pas dans un document.
          </p>
          <p className="text-meta text-ink-mute">
            L'alignement optique se vérifie à part du géométrique : les
            lignes de base d'une rangée, le centre d'une icône contre la
            hauteur d'x, les boutons d'une rangée sur une seule ligne de
            base, les nombres alignés sur le chiffre. Au plus{" "}
            <strong className="font-semibold">deux</strong> lignes
            verticales par écran.
          </p>
        </div>
      </Specimen>

      <Specimen name="La typographie" note="une échelle, six tailles, trois graisses">
        <div className="space-y-6">
          <Table head={["À quoi ça sert", "taille / graisse / interligne"]} rows={SCALE} />
          <Rules
            items={[
              {
                rule: "Une taille sert à une chose. Un pas de plus veut dire qu'on n'a pas trouvé lequel des six existants dit ce qu'on veut dire.",
                why: "Les huit écrans en portaient treize, et quatre graisses. La cause n'était pas le goût : `cn()` supprimait silencieusement chaque utilitaire de type combiné à une couleur de texte, donc un pas déclaré n'arrivait pas à l'écran. `tools/verify/scale.mjs` fait maintenant échouer le build quand un pas manque à la liste.",
              },
              {
                rule: "Interligne 1.2–1.3 pour un titre, 1.45–1.55 pour du texte courant, plus serré pour un grand nombre.",
              },
              {
                rule: "Une ligne de texte fait moins de 75 caractères à 1440.",
                why: "Au-delà, l'œil perd le début de la ligne suivante.",
              },
              {
                rule: "Sur une ligne de réservation : l'heure et le nombre de couverts d'abord, le nom ensuite, tout le reste après.",
                why: "C'est l'ordre dans lequel la décision se prend. On le vérifie en plissant les yeux, puis en mesurant.",
              },
              {
                rule: "Un titre d'écran répond seul à « à quoi sert cet écran ». Un sous-titre qui le répète se supprime.",
              },
              {
                rule: "Pas de capitales espacées au-dessus d'un titre, pas de méta-informations enfilées sur des points médians, pas un seul mot en italique ou en couleur dans un titre, pas de flèche collée au texte d'un bouton.",
                why: "Ce sont les tics des interfaces produites à la chaîne. Une seule exception assumée : la bande horaire du carnet, qui est un repère et non un libellé.",
              },
            ]}
          />
        </div>
      </Specimen>

      <Specimen name="La couleur" note="un rôle par couleur, et rien en plus">
        <div className="space-y-6">
          <Table head={["Couleur", "Son seul emploi"]} rows={ROLES} />
          <Rules
            items={[
              {
                rule: "Les quatre couleurs d'état ne servent à rien d'autre sur les écrans de réservation.",
              },
              {
                rule: "4,5:1 pour du texte, 3:1 pour un grand texte, un contrôle, et un contrôle désactivé — mesuré contre le fond réel, pas contre le fond supposé.",
              },
              {
                rule: "Les quatre états restent distinguables en niveaux de gris et en deutéranopie. Si deux se confondent, l'état porte un glyphe.",
              },
            ]}
          />
        </div>
      </Specimen>

      <Specimen name="Les contrôles" note="ce sur quoi on appuie debout, sur une tablette">
        <div className="space-y-6">
          <Rules
            items={[
              { rule: "44 × 44 minimum à 390. Anneau de focus visible, survol sur bureau, état enfoncé, état désactivé à 3:1, état de chargement qui garde la largeur." },
              { rule: "Les boutons d'une même rangée partagent leur hauteur et leur ligne de base. Le principal à droite, le secondaire à gauche, le destructeur à l'écart." },
              { rule: "Un seul bouton principal par région d'écran." },
              { rule: "Le libellé d'un bouton est un verbe que le patron dirait à voix haute." },
              { rule: "Un champ : libellé au-dessus, 8 en dessous, 48 de haut, bordure 1px encre à 20 %, focus violet, erreur rouge avec le message sous le champ. Jamais un texte d'exemple à la place du libellé." },
              { rule: "Un interrupteur : 44 de large, libellé à gauche, état lisible sans la couleur." },
            ]}
          />
        </div>
      </Specimen>

      <Specimen name="La mise en page" note="la densité est une décision, pas un reste">
        <div className="space-y-6">
          <Rules
            items={[
              {
                rule: "La colonne de contenu s'arrête à 1180px.",
                why: "Ce qu'une fenêtre de 1440 laisse à côté de la barre latérale de 260. La ligne de réservation est donc la même sur un portable et sur un grand écran.",
              },
              {
                rule: "Une carte regroupe ce qui va ensemble. Une carte dont le seul contenu est une liste ou un formulaire se supprime, ou se justifie.",
              },
              {
                rule: "Plus de quatre cartes sur un écran demandent une raison.",
              },
              {
                rule: "Réservations montre un service de déjeuner entier — douze à quinze lignes — à 1440 sans descendre sous le pli à 900 de haut. Si ça ne tient pas, on resserre la ligne avant de toucher à la typographie.",
              },
              {
                rule: "À 390 : rien ne défile de côté, rien n'est plus petit qu'à 1440 sauf les marges, l'action principale est à portée de pouce, et la barre du bas ne couvre jamais le contenu.",
              },
            ]}
          />
        </div>
      </Specimen>

      <Specimen name="Les mots" note="lus à voix haute, comme le patron les dirait">
        <div className="space-y-6">
          <Rules
            items={[
              { rule: "Un libellé nomme la chose, pas le système." },
              { rule: "Une action garde son nom du bouton jusqu'à la confirmation." },
              { rule: "Un état vide dit quoi faire ensuite, avec un seul bouton." },
              { rule: "Une erreur dit ce qui s'est passé et comment le réparer, sans s'excuser." },
              { rule: "Casse de phrase partout." },
              { rule: "Pas de jargon : ni « créneau », ni « configuration », ni « seam ». Les mots du métier." },
              {
                rule: "Plus de quarante mots d'explication sur un écran : on coupe.",
                why: "Les titres et les libellés de champ ne comptent pas — ils nomment, ils n'expliquent pas, et raccourcir « Capacité » ne raccourcit pas l'écran. Ce qui compte : les sous-titres, les aides sous les champs, les états vides, les notes. Les données non plus ne comptent pas : une journée de réservations et une semaine d'horaires sont ce que le patron vient lire.",
              },
            ]}
          />
        </div>
      </Specimen>

      <Specimen name="Les états, les icônes, le mouvement">
        <div className="space-y-6">
          <Rules
            items={[
              {
                rule: "Chargement, vide, erreur, accès refusé : les mêmes composants, aux mêmes écarts, sur les quatre. Pas huit interprétations.",
              },
              { rule: "Un squelette garde la forme de la mise en page qu'il remplace." },
              {
                rule: "Une seule famille d'icônes, une seule épaisseur de trait — 2 —, et deux tailles optiques : 20 à côté du texte courant, 16 à côté d'un complément. Pas d'icône sans libellé, sauf dans la barre du bas.",
                why: "Deux tailles et non une, parce qu'une icône de 20 dans une ligne de 13 écrase la ligne. L'audit en a trouvé six — 12, 14, 16, 18, 20, 22 — et cinq épaisseurs, 1,6 à 2,2.",
              },
              {
                rule: "Le logo a une seule règle d'espace libre et une seule taille par contexte — identique sur Connexion, Inscription, la barre latérale et l'en-tête du téléphone.",
              },
              { rule: "Une photo a un seul rapport et un seul rayon." },
              {
                rule: "Du mouvement seulement pour répondre à une action : ouvrir, enregistrer, confirmer. Une durée pour les micro-interactions, une pour les surfaces qui s'ouvrent.",
              },
              {
                rule: "Pas d'animation d'entrée. Pas de transition au survol d'une carte.",
                why: "Un écran qui se met en place pendant une demi-seconde est un écran qu'on ne peut pas lire pendant une demi-seconde.",
              },
              { rule: "« Mouvement réduit » est respecté." },
            ]}
          />
        </div>
      </Specimen>
    </>
  );
}
