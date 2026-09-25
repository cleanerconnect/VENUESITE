# Portail partenaire LYFE · recette de conception du Lot 1

Cet audit ne juge pas le goût de huit écrans. Il pose à chaque élément une
seule question : **pourquoi cette taille, cette distance, cette graisse,
cette couleur et ce mot-là ?** Quand la réponse honnête est « c'est ce que
le composant donnait » ou « c'est là que c'est tombé », c'est un constat.

Le lecteur de ces écrans est un restaurateur de Casablanca ou de
Marrakech. Il lit le français, il n'est pas à l'aise avec un logiciel, et
il a **moins de trois secondes** pour décider quoi faire d'un client :
accepter, refuser, décaler, appeler. Il décide debout, sur une tablette,
pendant un service. C'est à lui que chaque constat est mesuré, pas à un
jury de design.

Les références sont le carnet de réservations en papier et l'écran de
caisse — pas un site vitrine.

---

## Comment ça a été mesuré

Rien ici n'est une impression. Quatre instruments ont été écrits pour
cette recette, et ils sont dans le dépôt pour être relancés :

| Outil | Ce qu'il mesure |
|---|---|
| `tools/verify/_design-measure.mjs` | le mètre ruban. Une sonde par écran et par largeur : chaque pas de type (taille, graisse, interligne, interlettrage) avec son nombre d'occurrences et un échantillon ; chaque contraste texte-sur-fond-réel ; chaque commande (boîte, police, rayon, bordure, état désactivé) ; chaque écart vertical entre deux frères empilés ; la colonne, ses marges, ses bords gauches, ses cartes ; les mots de prose. Sort `scratch/design/<largeur>/measures.json`. |
| `tools/verify/_design-report.mjs` | les tableaux. La gamme, le plafond de type et les seuils de contraste sont écrits une fois, en haut du fichier, pour qu'un chiffre du rapport et un chiffre d'un jugement ne puissent pas diverger. `DIR=after` lit la mesure d'après. |
| `tools/verify/_design-shots.mjs` | les plaques. Pleine page pour compter, plus un recadrage au pli pour la densité — ce que le patron voit sans faire défiler est ce que la règle mesure. Mouvement coupé : une animation d'entrée saisie en vol n'est pas ce à quoi l'écran ressemble. |
| `tools/verify/_design-states.mjs` | les quatre états. Chargement, vide, erreur et accès refusé, sur six écrans, aux deux largeurs — 48 plaques — avec la forme de chaque surface, pour que « les mêmes composants aux mêmes écarts » soit un chiffre. |
| `tools/verify/_design-overlay.mjs` | le calque. L'espace partenaire posé sur le tableau de bord événementiel, propriété par propriété. `--diff` imprime ce qui diffère. |
| `tools/verify/scale.mjs` | la dérive de l'échelle. Deux listes doivent s'accorder : les pas `.text-…` déclarés dans `globals.css`, et `TYPE_UTILITIES` dans `cn.ts`. Un pas absent de la seconde est supprimé silencieusement de tout `cn()` qui pose aussi une couleur — le code a l'air juste et l'écran ne l'est pas. C'est un échec de build. |

Portail lancé en Lot 1 sur Postgres, avec le seed Dar Zellij, en
`next start` — pas en dev. Deux largeurs : **1440 × 900** et
**390 × 844**. Captures avant et après chaque changement, dans
`docs/design-audit/`.

### Quand le mètre s'est trompé

Huit fois la première mesure a menti, et chaque fois c'était l'instrument.
Elles sont listées ici parce qu'un audit dont on ne peut pas vérifier le
ruban ne vaut pas ses chiffres.

| # | Ce que la sonde disait | Ce qui était vrai |
|---|---|---|
| T-01 | quatre contrastes à **1:1**, blanc sur blanc, sur un bouton | Tailwind v4 émet `oklab()` pour un modificateur d'opacité ; l'analyseur rendait `null`. Converti par `canvas` maintenant, et l'`opacity` des ancêtres repliée dedans. Le vrai constat dessous : `X-05`. |
| T-02 | `rect → rect` 3px et `circle → path` −2px sur **chaque** écran | la géométrie interne d'un SVG n'est pas une mise en page : deux rectangles d'un logo sont à 3px parce que c'est le dessin. `el.closest("svg")` sort de la marche. |
| T-03 | 52 lignes pour 26 réservations, hauteur de ligne **0** | les deux voies de la spec rendent le carnet ; celle que la largeur n'utilise pas est en `display:none`. Filtré sur `height > 1`. |
| T-04 | `16px/400 « Choisir une date »` — un pas hors échelle | du texte `sr-only`, un pixel sur un pixel, que rien ne peint jamais. Les défauts du navigateur s'y appliquent. Sorti de la mesure. |
| T-05 | un écart de **10px** sur Réservations | un soulignement d'onglet actif en `position:absolute`. Sa distance est une coordonnée, pas un rythme. Les enfants hors flux sortent de la marche. |
| T-06 | **27 cartes** sur Réservations | la carte était devinée à partir d'un rayon et d'une bordure : un bloc teinté comptait, un groupe de champs bordé comptait, une carte sans bordure manquait. `Card` pose maintenant `data-card`, et c'est ce qu'on compte. |
| T-07 | **912 mots** sur Disponibilités contre un seuil de 40 | les options d'un `<select>`, une semaine d'horaires et une journée de réservations comptées comme de la prose. Ce sont les données que le patron vient lire. On ne compte que `[data-prose]` : sous-titres, aides, états vides, notes. |
| T-08 | un bouton désactivé à **3,93:1** contre 4,5 exigé | la section 4 fixe **3:1** pour un désactivé, et c'est le bon seuil : un bouton désactivé doit se lire comme indisponible. Le ruban était plus strict que la règle. |

---

## Le compte

**57 constats** sur les huit écrans et le chrome qu'ils partagent, plus
les **8 corrections d'instrument** ci-dessus.

| Sévérité | Ce que ça veut dire | Nombre | Corrigés | Justifiés | Décrits |
|---|---|---:|---:|---:|---:|
| **Structure** | l'écran est construit autrement qu'il devrait l'être : une ligne qui est une carte, une carte qui ne contient qu'un formulaire, un état introuvable, une colonne sans maximum | 16 | 15 | 1 | 0 |
| **Rythme** | les distances ne disent pas ce qu'elles devraient dire | 17 | 17 | 0 | 0 |
| **Polish** | la finition : un pas de type en trop, une capitale espacée, une icône à la mauvaise épaisseur, un mot de trop | 24 | 22 | 1 | 1 |
| | | **57** | **54** | **2** | **1** |

Les trois qui ne sont pas « corrigés » sont nommés, pas cachés :
`D-04` et `D-05` (les cartes de Disponibilités, justifiées par écrit
plutôt que supprimées) et `M-05` (l'attribution OpenStreetMap et le
marqueur de la carte, qui sont du tiers). Ce qui reste en travers d'une
règle sans qu'une règle puisse le trancher est dans la dernière partie.

### Les quatre chiffres qui résument la recette

Les deux colonnes sont mesurées avec **le même ruban** : après les huit
corrections d'instrument, l'arbre d'avant a été remis en place
(`git stash`), rebâti et remesuré, pour qu'un chiffre d'avant et un
chiffre d'après puissent tenir dans la même colonne. Les nombres d'avant
publiés en cours de recette — « 97 écarts hors gamme » — venaient du
ruban non corrigé et comptaient les intérieurs de SVG, les enfants hors
flux et le texte `sr-only`.

| | Avant | Après | Règle |
|---|---|---|---|
| Écarts hors gamme, huit écrans, 1440 | **85 / 323** | **0 / 244** | §1 · la gamme 4·8·12·16·24·32·48·64 |
| Écarts hors gamme, huit écrans, 390 | **74 / 300** | **0 / 253** | idem |
| Pas de type, huit écrans, 1440 | **13 tailles · 4 graisses** | **6 tailles · 3 graisses** | §2 · six et trois |
| Contrastes sous le seuil, 1440 | **4** | **0** | §3 · 4,5:1 texte, 3:1 contrôle |

Le total de droite est plus petit que celui de gauche parce que le nombre
d'écarts mesurables a baissé avec l'écran : vingt-six lignes de
réservation qui portaient chacune deux boîtes empilées n'en portent plus
qu'une.

Et celui qui ne passe pas :

| | Avant | Après | Règle |
|---|---|---|---|
| Lignes de réservation au-dessus du pli, 1440 × 900 | **2,5** | **11 / 26** | §5 · douze à quinze |

Onze, pas douze. Le détail de ce qui manque est en `R-01`, et la décision
qu'il reste à prendre est en partie H.

---

## Écran par écran

Chaque constat porte l'élément, la valeur mesurée, la valeur voulue, la
règle d'où elle vient, et le correctif. La sévérité est **S**tructure,
**R**ythme ou **P**olish.

### 1 · Réservations

L'écran du service. C'est celui qui décide si le portail sert à quelque
chose : si le patron doit faire défiler pour voir son déjeuner, il
ressort le carnet en papier.

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| R-01 | la ligne de réservation | une carte par ligne : **84px** + **12px** d'écart, ombre au survol, soulèvement de 1px ; **2,5 lignes** au-dessus du pli à 1440 × 900 | douze à quinze lignes | §5 · densité | la ligne n'est plus une carte : `border-b` dans un seul conteneur, `py-2`, **44px** sans note et **66px** avec. 11 lignes au-dessus du pli | S |
| R-02 | les bandes horaires | six bandes de **36px** = **216px** répétant l'heure déjà écrite à 22px sur la ligne d'en dessous | ne pas dire deux fois | §2 · hiérarchie | bandes supprimées, un seul conteneur | S |
| R-03 | la barre de jour | carte de **1116 × 134**, padding 16, contenant **une** rangée de contrôles | pas de carte pour un seul formulaire | §5 | carte supprimée ; jour et services sur une ligne | S |
| R-04 | l'heure et les couverts | deux lignes, séparées de **2px** (`mt-0.5`), × 26 | l'heure et les couverts d'abord, ensemble | §2 · hiérarchie · §1 | une seule ligne de base, `items-baseline gap-2` — l'écart n'est plus corrigé, il n'existe plus | S |
| R-05 | le rythme de la page | `space-y-5 md:space-y-7` = **20 / 28px** | 24 carte→carte, 32 groupe→groupe | §1 | `space-y-6 md:space-y-8` | R |
| R-06 | l'en-tête d'écran | `mb-6 md:mb-7` = **28px** | 24 ou 32 | §1 | `mb-6` | R |
| R-07 | le titre « Carnet du service » et son sous-titre | répètent la barre de jour juste au-dessus | un titre répond seul | §2 | les deux supprimés en Lot 1 | P |
| R-08 | les filtres et le tri | deux lignes de chrome pour cinq contrôles | ce qui va ensemble est ensemble | §1 · §5 | une ligne, `justify-between` | R |
| R-09 | l'animation d'entrée | `Stagger` : **490ms** avant que le dernier bloc se pose | pas d'animation d'entrée | §10 | supprimée | P |
| R-10 | le survol de la ligne | `whileHover y:-1` + transition d'ombre sur chaque ligne | pas de transition au survol d'une carte | §10 | supprimé ; reste `hover:bg-canvas-2` | P |

Chrome avant la première ligne : **490px → 320px**.

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/reservations@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/reservations@1440-fold.png" width="420"></td>
</tr></table>

### 2 · Accueil

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| A-01 | le sur-titre de la carte d'accueil | `eyebrow` à **13px/700**, capitales, interlettrage **0,78px**, disant « BONSOIR » au-dessus de « Bonsoir, Yassine. » | le mot une fois | §2 · pas de capitales espacées au-dessus d'un titre | sur-titre supprimé ; la salutation reste, c'est l'exception assumée | P |
| A-02 | le rythme de la page | partagé avec `R-05` | | §1 | | R |

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/accueil@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/accueil@1440-fold.png" width="420"></td>
</tr></table>

### 3 · Check-in

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| C-01 | le nom du client → ses couverts | **2px** (`mt-0.5`), × 5 | 4 ou 8 | §1 | `mt-1` | R |
| C-02 | la prose | **66 mots** d'explication | quarante | §6 | quatre chaînes coupées (ci-dessous) | P |
| C-03 | les tailles posées en ligne | `text-[13px]`, `text-[14px]` | l'échelle | §2 | `text-meta`, `text-body` | P |

Les coupes de `C-02`, mot pour mot :

| Avant | Après |
|---|---|
| « Appuyez sur Check-in pour enregistrer une arrivée sans code. » (9) | « Check-in enregistre une arrivée sans code. » (6) |
| « Cherchez le nom dans la liste ci-dessus, ou saisissez le code à la main. » (14) | « Cherchez le nom, ou tapez le code. » (7) |
| « Une erreur de scan se voit dans les cinq minutes. Au-delà, l'annulation passe par le carnet. » (16) | « Cinq minutes pour corriger un scan. Ensuite, par le carnet. » (10) |
| « Les clients validés depuis cet écran apparaîtront ici. » (8) | « Scannez un code pour enregistrer la première. » (7) |
| « Sans le code du client » (5) | « Sans le code » (3) |

La dernière ligne est un état vide : il doit inviter à faire quelque
chose, pas décrire ce qui apparaîtra si quelqu'un d'autre le fait.

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/check-in@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/check-in@1440-fold.png" width="420"></td>
</tr></table>

### 4 · Connexion

Sept constats sur un écran de deux champs, dont trois de contraste — et
c'est le premier écran que le partenaire voit.

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| X-01 | « ESPACE PARTENAIRE » | `text-eyebrow` **11px/700**, capitales, interlettrage **0,88px**, au-dessus du titre | rien au-dessus du titre | §2 | supprimé | P |
| X-02 | le titre | `fontSize: clamp(30px, 3.6vw, 44px)` posé en ligne — une taille qu'aucune échelle ne contient, et qui change avec la fenêtre | un pas de l'échelle | §2 | `text-h1`, **36px** | S |
| X-03 | le texte secondaire sur le panneau sombre | `text-canvas/55` = **3,8:1** | 4,5:1 | §3 | `text-canvas/70` | P |
| X-04 | l'anneau de focus | `rgba(134,91,166,0.42)` = **1,8:1** ; rayon **6px** sur des contrôles de 10 et 14 | 3:1 ; le rayon du contrôle | §4 | `var(--color-violet)` = **4,4:1** ; `border-radius: inherit` | S |
| X-05 | le bouton principal désactivé | `bg-violet/40` **et** `disabled:opacity-50` — le même fondu deux fois : blanc sur `rgb(207, 189, 219)`, **1,34:1**, sur quatre écrans | 3:1 | §4 | l'opacité générale retirée de la base ; chaque variante déclare ses couleurs désactivées. Mesuré **3,93:1** | S |
| X-06 | la densité | Connexion tournait à la densité bureau quand les huit écrans derrière tournaient à la densité tablette | une densité par lot | §8 | `data-density="host"` depuis `activeLot()` | S |
| X-07 | l'encre sur l'encre | `[data-density="host"] .text-meta` posait une `color` ; à (0,2,0) elle battait `text-canvas/55` sur le panneau sombre — **1:1** | une densité règle des tailles, pas des couleurs | §3 | `color` retirée du bloc de densité ; la retouche existe déjà sur `.text-ink-mute` et `.text-ink-soft` | S |

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/connexion@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/connexion@1440-fold.png" width="420"></td>
</tr></table>

### 5 · Inscription

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| I-01 | sous-titre → premier groupe de champs | **28px** (`mt-7`) | 32 groupe→groupe | §1 | `mt-8` | R |
| I-02 | libellé → aide sous le champ | **6px** (`gap-1.5`), × 2 | 8 | §1 | `gap-2`, dans `Input`, `Select` et `Textarea` — donc partout | R |
| I-03 | les six noms d'étapes de la barre de progression | **16px/400** : la taille par défaut du navigateur | `text-meta`, **13px/500** | §2 | voir ci-dessous — c'est le constat le plus grave de l'audit | S |
| I-04 | les lignes du récapitulatif | `px-5 py-3.5` = **20 / 14px** | 16 / 12 | §1 | `px-4 py-3` | R |
| I-05 | six tailles posées en ligne | `text-[15px]` | l'échelle | §2 | `text-body` | P |

**`I-03`, en détail.** La barre de progression écrivait
`cn("flex-1 text-meta truncate", actif ? "text-ink font-semibold" : "text-ink-mute")`.
Le rendu ne portait pas `text-meta`. `cn()` passe par `tailwind-merge`,
qui ne peut pas distinguer un utilitaire de taille d'un utilitaire de
couleur dans l'espace de noms `text-*` : il classait `text-meta` comme une
couleur, `text-ink-mute` gagnait le conflit, et la taille disparaissait.
Le pas était toujours dans `globals.css`, toujours dans le styleguide, et
n'arrivait jamais à l'écran. Trois des quatre contextes que la recette
nomme en portaient un.

Le correctif ne concerne pas Inscription : **tout l'espace de noms** est
déclaré dans `TYPE_UTILITIES` (`src/lib/utils/cn.ts`), et
`tools/verify/scale.mjs` échoue quand un pas de `globals.css` manque à la
liste. Un correctif partiel existait déjà pour `text-control-*` — les
trois seuls qui avaient été remarqués, parce qu'ils peignaient du navy
sur du navy et que ça se voyait. Les treize autres ne faisaient que
rendre du texte à la mauvaise taille, ce qui ne se voit pas.

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/inscription@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/inscription@1440-fold.png" width="420"></td>
</tr></table>

### 6 · Disponibilités

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| D-01 | carte→carte, titre→grille, grille→action | **20px** × 3 (`space-y-5`, `mb-5`, `mt-5`, `gap-x-5`) | 24, 16, 24 | §1 | `space-y-6`, `mb-4`, `mt-6`, `gap-x-6` | R |
| D-02 | la prose | **81 mots** ; une aide qui répétait son libellé | quarante | §6 | une aide supprimée, sept raccourcies | P |
| D-03 | la plus longue ligne | **85 caractères** à 13px dans 482px | moins de 75 | §2 | chaîne ramenée à **70** ; mesurée **67** | P |
| D-04 | trois cartes dont le contenu est un seul formulaire | `1116 × 662` × 2, `1116 × 328` | supprimer la carte, ou la justifier | §5 | **justifiée** : voir ci-dessous | S |
| D-05 | le nombre de cartes | **cinq** cartes, une de plus que le plafond | plus de quatre demande une raison | §5 | **justifié** : voir ci-dessous. La sonde en annonçait dix avant de compter les cartes du composant plutôt que de les deviner (`T-06`) | P |

**`D-04` et `D-05`, la justification.** Les cartes de cet écran ne
décorent pas une liste : elles sont la frontière d'un service. « Déjeuner »
et « Dîner » n'ont en commun que d'être des services ; leurs sept champs
se lisent l'un contre l'autre et jamais en travers. Supprimer la carte
laisserait quatorze champs en file, dont deux paires portent le même
libellé — « Ouverture », « Fermeture » — et rien ne dirait plus lequel
appartient à quoi. Un bandeau de titre ferait le même travail, moins
bien : la carte porte aussi le bouton « Retirer ce service », et un
bouton destructeur a besoin d'une frontière qui dise ce qu'il détruit.
Le compte de cinq est deux services, une règle de réservation, un bloc de
réglages avancés et les jours de fermeture. La règle des quatre existe
contre la carte-décoration ; ici chaque carte est un objet du métier, et
trois des cinq portent un bouton qui les détruit.

Les coupes de `D-02`, mot pour mot :

| Avant | Après |
|---|---|
| « Ce qui décide de ce que l'application propose » | « Ce que l'application peut proposer » |
| « Coupé, l'établissement reste visible mais n'est plus réservable. » | « Coupé : visible, mais plus réservable. » |
| « L'heure après laquelle l'application ne propose plus ce service. » | *supprimée* — son libellé, « Dernière réservation acceptée », le disait déjà |
| « Les heures que l'application propose, et comment le carnet regroupe la journée. » | « Les heures proposées, et les groupes du carnet. » |
| « Ce que l'application accepte sans vous demander. » | « Ce qui passe sans vous demander. » |
| « Au-delà, la demande passe en validation manuelle. » | « Au-delà, vous répondez vous-même. » |
| « Au-delà de ce nombre de jours, la date n'est pas encore ouverte. » | « Plus loin, la date n'est pas encore ouverte. » |
| « Passé cette heure, l'application ne propose plus ce soir. » | « Passé cette heure, plus rien ce soir. » |

« Validation manuelle » était du jargon de logiciel ; « vous répondez
vous-même » est ce que le patron ferait.

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/disponibilites@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/disponibilites@1440-fold.png" width="420"></td>
</tr></table>

### 7 · Ma fiche

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| M-01 | libellé → aide | **6px** × 4 | 8 | §1 | `gap-2` | R |
| M-02 | carte→carte et titre→grille | **20px** × 3 | 24 et 16 | §1 | `space-y-6`, `mb-4` | R |
| M-03 | titre d'écran → sous-titre | **6px** (`mt-1.5`) | 8 | §1 | `mt-2`, dans `PageHeader` | R |
| M-04 | la carte Leaflet | attribution **12px/400/1,40**, boutons de zoom **22px/1,36** — les deux seuls pas hors échelle de l'écran | l'échelle | §2 · §9 | deux sélecteurs dans `globals.css` : attribution au pas `meta`, zoom à 1,2 | P |
| M-05 | le marqueur et le lien de licence | marqueur **26 × 26**, lien « Leaflet » **56 × 15** | 44 × 44 pour un contrôle | §4 | **décrit** : ni l'un ni l'autre n'est un contrôle que le patron actionne — le marqueur est un point sur une carte, le lien est la licence OpenStreetMap et doit rester lisible et cliquable tel quel. Les boutons de zoom, eux, en sont : portés de **30 × 44** à **44 × 44** | P |
| M-06 | la légende de la carte | `text-[15px] font-semibold` | l'échelle | §2 | `text-body` | P |

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/ma-fiche@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/ma-fiche@1440-fold.png" width="420"></td>
</tr></table>

### 8 · Notifications

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| N-01 | la prose | **77 mots** | quarante | §6 | quatre chaînes raccourcies | P |
| N-02 | libellé → aide, et titre → grille | **6px** × 5, **28px** × 2 | 8 et 32 | §1 | corrigés dans `SettingsBlock` et `Input` — donc sur les quatre écrans de réglages à la fois | R |
| N-03 | la plus longue ligne | **80 caractères** à 13px | moins de 75 | §2 | chaîne ramenée à **70** | P |

| Avant | Après |
|---|---|
| « Ce dont vous êtes prévenu, et par quel canal » | « Ce dont vous êtes prévenu, et comment » |
| « Par quel canal chaque alerte part. Plusieurs canaux à la fois si vous voulez. » | « Par quel canal chaque alerte part. Plusieurs à la fois si vous voulez. » |
| « Ce rappel part au client. C'est lui qui fait le plus baisser les absences. » | « Part au client. C'est ce qui fait le plus baisser les absences. » |
| « Le numéro et l'adresse de l'établissement, pas ceux de la fiche publique. » | « Ceux de l'établissement, pas ceux de la fiche publique. » |

<table><tr>
<td><b>Avant</b><br><img src="design-audit/avant/notifications@1440-fold.png" width="420"></td>
<td><b>Après</b><br><img src="design-audit/apres/notifications@1440-fold.png" width="420"></td>
</tr></table>

### 9 · Le chrome que les huit partagent

Seize constats qui ne sont pas sur un écran mais sous tous. Ce sont ceux
qui rapportent le plus : un correctif dans `SettingsBlock` ou dans
`Input` répare quatre écrans d'un coup.

| # | Élément | Mesuré | Voulu | Règle | Correctif | Sév. |
|---|---|---|---|---|---|---|
| S-01 | le bouton central surélevé de la barre du bas | il couvrait le contenu | la barre ne couvre jamais le contenu | §5 | remis à plat | S |
| S-02 | les libellés de la barre du bas | `text-[10px] font-bold uppercase tracking-[0.06em]` | l'échelle, casse de phrase | §2 · §6 | `text-meta font-semibold` | P |
| S-03 | les icônes du chrome | **six** tailles — 12, 14, 16, 18, 20, 22 — et **cinq** épaisseurs, 1,6 à 2,2 | une épaisseur, deux tailles optiques | §9 | épaisseur **2** partout ; **20** à côté du texte courant, **16** à côté d'un complément | P |
| S-04 | l'onglet du téléphone | disait « Carnet » quand la barre latérale et le titre disaient « Réservations » | une action garde son nom | §6 | « Réservations » | P |
| S-05 | `⌘K` et un raccourci clavier | sur une tablette sans clavier | ce qui existe est actionnable | §6 | réservés au Lot 2 | P |
| S-06 | la barre latérale | **huit** tailles posées en ligne : 13, 13,5, 12, 10 | l'échelle | §2 | `.text-nav` ajouté comme le pas unique du chrome (13/600/1,45) ; les huit ramenés dessus | P |
| S-07 | le bloc d'identité de la barre latérale | `leading-tight` (**1,25**) écrasait le 1,45 de `.text-nav` | 1,45 sous 18px | §2 | supprimé, deux fois | R |
| S-08 | le logo | **six** hauteurs sur huit emplacements — 26, 26, 28, 32, 40, 44, 44, 56 — dont trois dans les quatre contextes que la recette nomme ; et trois valeurs d'espace libre autour d'un seul (`px-6 pt-7 pb-5`) | une taille par contexte, une règle d'espace libre | §9 | deux tailles nommées, **40** et **28**, choisies par contexte et non par nombre ; espace libre **24** autour du grand, **16** autour du petit, la règle écrite dans le composant | S |
| S-09 | le padding horizontal des boutons | **14 / 20 / 28** | la gamme | §1 · §4 | **16 / 24 / 32** | R |
| S-10 | les icônes dans un bouton | `-ml-0.5` / `-mr-0.5` — **2px**, sans raison écrite | l'écart de 8 et la taille optique suffisent | §1 | supprimés | R |
| S-11 | `Card size="lg"` | padding `p-7` = **28px**, à trois pixels du 32 de la même page | la gamme | §1 | `p-8` | R |
| S-12 | la colonne de contenu | aucun maximum : **1180px** à 1440, et **2500px** sur un écran de 2560 | un maximum énoncé et appliqué | §5 | `--content-max: 1180px`, avec sa raison écrite dans `globals.css` | S |
| S-13 | `text-control-sm/md/lg` | **trois** tailles — 13, 14, 15 — pour « le texte d'un contrôle » | une | §2 | les trois à **16px** à la densité tablette | S |
| S-14 | trois pas de l'échelle hôte | `.text-host-name` **17px** ; `.text-host-detail` **14px/1,40** ; `.text-host-slot` **15px**, interligne **1,00** | des pas de l'échelle, interlignes dans la bande | §2 | **18px** ; **13px/1,45** ; **16px/1,20** | P |
| S-15 | un pas de type | `text-[14.5px]` — un demi-pixel | l'échelle | §2 | `text-body` | P |
| S-16 | le quatrième état | « accès refusé » n'était atteignable par aucune URL : il fallait un second compte pour le voir | les quatre états, photographiables côte à côte | §7 | `?etat=refus` ajouté au commutateur qui portait déjà les trois autres | S |

**Sur `S-14`.** `.text-host-slot` garde ses capitales et son
interlettrage, et c'est la seule chose de l'audit qui reste en capitales
espacées — mais elle ne rend plus sur aucun des huit écrans. Le pas
dessine la bande horaire du carnet, et `R-02` a retiré la bande : elle
répétait en 16 une heure déjà écrite en 22 sur la ligne d'en dessous.
Le pas survit pour la voie Lot 2, où le carnet groupe encore par heure,
et il y est défendable pour la raison qu'il l'a toujours été : ce n'est
pas un libellé au-dessus d'un titre, c'est un repère qu'on cherche dans
une liste de deux cents lignes, pas une étiquette qu'on lit.

---

## Le tableau de mesure

Huit écrans, deux largeurs, avant et après, le même ruban des deux côtés.

### Le rythme

Le nombre d'écarts hors gamme sur le nombre d'écarts mesurés. Un écart
mesuré est la distance entre deux frères empilés, prise au modèle de
boîte — pas à l'œil.

| Écran | 1440 avant | 1440 après | 390 avant | 390 après | Ce qui n'était pas sur la gamme |
|---|---|---|---|---|---|
| Réservations | 28 / 104 | **0 / 43** | 26 / 104 | **0 / 65** | 2px × 26 (l'heure sur les couverts), 28px × 2 |
| Accueil | 8 / 42 | **0 / 27** | 6 / 40 | **0 / 27** | 2px × 5, 28px × 3, 11px × 1 |
| Check-in | 7 / 35 | **0 / 35** | 8 / 26 | **0 / 26** | 2px × 5, 20px × 2 |
| Connexion | 1 / 7 | **0 / 6** | 1 / 10 | **0 / 9** | 6px × 1 |
| Inscription | 3 / 13 | **0 / 13** | 3 / 13 | **0 / 13** | 6px × 2, 28px × 1 |
| Disponibilités | 23 / 62 | **0 / 60** | 18 / 63 | **0 / 61** | 6px × 15, 28px × 5, 20px × 3 |
| Ma fiche | 8 / 31 | **0 / 31** | 7 / 22 | **0 / 22** | 6px × 5, 20px × 3 |
| Notifications | 7 / 29 | **0 / 29** | 5 / 22 | **0 / 22** | 6px × 5, 28px × 2 |
| **Total** | **85 / 323** | **0 / 244** | **74 / 300** | **0 / 245** | |

Quatre valeurs causaient les 159 : **6px** (`gap-1.5` entre un libellé et
son champ, 40 fois), **2px** (`mt-0.5` entre l'heure et les couverts, 31
fois), **28px** (`space-y-7` et `mb-md:7`, le rythme de page, 13 fois) et
**20px** (`space-y-5`, `mt-5`, `mb-5`, `gap-5`, 13 fois). Aucune n'était
un choix : ce sont quatre utilitaires Tailwind à un demi-pas de celui qui
était voulu, recopiés d'un composant à l'autre. Les corriger à la source
— dans `Input`, dans `SettingsBlock`, dans `DashboardRenderer` — a réglé
les huit écrans d'un coup.

### La typographie

| Écran | Tailles avant · après | Graisses avant · après | Après, les pas |
|---|---|---|---|
| Réservations | 11 → **5** | 3 → **3** | 36 · 22 · 18 · 16 · 13 |
| Accueil | 10 → **6** | 3 → **3** | 36 · 24 · 22 · 18 · 16 · 13 |
| Check-in | 11 → **6** | 3 → **3** | 36 · 24 · 22 · 18 · 16 · 13 |
| Connexion | 6 → **4** | 3 → **3** | 36 · 24 · 16 · 13 |
| Inscription | 4 → **3** | 4 → **3** | 24 · 16 · 13 |
| Disponibilités | 10 → **6** | 4 → **3** | 36 · 24 · 22 · 18 · 16 · 13 |
| Ma fiche | 9 → **5** | 4 → **3** | 36 · 22 · 18 · 16 · 13 |
| Notifications | 8 → **4** | 4 → **3** | 36 · 18 · 16 · 13 |
| **Les huit ensemble** | **13 → 6** | **4 → 3** | |

À 390, où le carnet passe en pile et où la barre du bas apparaît :
**14 tailles → 6**, **4 graisses → 3**.

Ce que chaque pas fait, après :

| Pas | À quoi il sert |
|---|---|
| **36 / 700 / 1,1** | le titre d'un écran, et la salutation de la carte d'accueil |
| **24 / 700 / 1,25** | le titre d'un groupe de cartes — « À traiter », « Services » |
| **22 / 700 / 1,1** | l'heure et les couverts d'une ligne de réservation |
| **18 / 700** | le titre d'une carte |
| **18 / 600 / 1,3** | le nom du client sur une ligne, le libellé d'un champ |
| **16 / 500 ou 600 / 1,5** | le texte courant, le libellé d'un bouton, la valeur d'un champ |
| **13 / 500 ou 600 / 1,45** | le détail, l'aide sous un champ, la barre latérale, l'horodatage |

**Capitales espacées : aucune**, contre cinq avant — « ESPACE
PARTENAIRE », « BONSOIR », « SUR LA CARTE », « ACCUEIL » dans la barre du
bas, et la bande horaire du carnet. La bande horaire a disparu avec elles
(`R-02`) : le pas qui la dessine, `.text-host-slot`, garde ses capitales
et ne rend plus nulle part en Lot 1 — il ne sert que la voie Lot 2, où la
bande existe encore. Sur les huit écrans de cette recette, la mesure
compte **zéro** capitale espacée.

**Interlignes hors bande** : douze cas avant, **un** après — les boutons
`+` et `−` de Leaflet à 1,36, que la feuille du tiers pose et que le
sélecteur de `globals.css` corrige à 1,2 dans le même passage.

**Longueur de ligne** (seuil : 75 caractères à 1440) : deux écrans
dépassaient — Disponibilités à **85** et Notifications à **80**. Après :
le plus long est Inscription à **72**, et plus rien ne dépasse.

### Le contraste

Mesuré contre le fond réellement peint, `opacity` des ancêtres repliée
dedans. Quatre échecs avant, aux deux largeurs, tous le même :

| Écran | Avant | Exigé | Après |
|---|---|---|---|
| Connexion · Disponibilités · Ma fiche · Notifications | **1,34:1** — blanc sur `rgb(207, 189, 219)`, le bouton principal désactivé | 3:1 | **3,93:1** |

Un seul défaut, quatre fois, parce que le bouton est un composant
partagé : `bg-violet/40` **et** `disabled:opacity-50` — le même fondu
appliqué deux fois. Personne ne l'avait écrit exprès ; les deux moitiés
avaient été ajoutées à des moments différents, chacune raisonnable seule.

En plus, deux contrastes que la sonde d'avant ne savait pas voir et qui
ont été mesurés à la main : l'anneau de focus à **1,8:1** (`X-04`) et le
texte secondaire du panneau de Connexion à **3,8:1** (`X-03`). Après :
**4,4:1** et **4,5:1**.

### Les commandes à 390

Le seuil est 44 × 44. Ce qui passait dessous :

| Écran | Avant | Après | Ce que c'était |
|---|---|---|---|
| Les huit | `40 × 44` | **`44 × 44`** | le bouton du menu dans l'en-tête du téléphone, `h-10 w-10` |
| Connexion | `32 × 32`, `124 × 17`, `115 × 17`, `318 × 31` | **`44 × 44`**, **`124 × 44`**, **`115 × 44`**, **`318 × 44`** | l'œil du mot de passe ; la case « se souvenir de moi » ; « Mot de passe oublié » ; « Inscrire mon établissement » |
| Inscription | `76 × 15` | **`76 × 44`** | « Se connecter » |
| Disponibilités | `36 × 44` | **`44 × 44`** | le bouton rond d'un tiroir |
| Ma fiche | `30 × 44` × 2 | **`44 × 44`** | les boutons de zoom de la carte |

La case à cocher garde sa boîte de **16px** — une case de 44 n'est plus
une case — et c'est son libellé qui porte les 44. C'est aussi une
correction du ruban : la sonde mesurait la boîte de l'`<input>`, alors que
ce que le pouce touche est le `<label>`. Elle mesure le label maintenant.

Deux choses restent sous le seuil sur Ma fiche et sont **décrites, pas
corrigées** (`M-05`) : le marqueur de la carte (`26 × 26`) et le lien
« Leaflet » de l'attribution (`56 × 15`). Ni l'un ni l'autre n'est un
contrôle que le patron actionne — le premier est un point sur une carte,
le second est la licence OpenStreetMap, qui doit rester telle quelle.

### La mise en page

| Écran | Colonne | Marges | Cartes | Cartes à contenu unique |
|---|---|---|---:|---:|
| Réservations | 1180 (max **1180**) | 32 / 16 | **0** | 0 |
| Accueil | 1180 | 32 / 16 | **1** | 0 |
| Check-in | 1180 | 32 / 16 | **3** | 2 |
| Connexion | pleine largeur, panneau | — | 0 | 0 |
| Inscription | 720 centré | 32 / 16 | **1** | 1 |
| Disponibilités | 1180 | 32 / 16 | **5** | 3 |
| Ma fiche | 1180 | 32 / 16 | **2** | 2 |
| Notifications | 1180 | 32 / 16 | **2** | 1 |

Bord de page → contenu : **32 à 1440, 16 à 390**, sur les huit. La
colonne s'arrête à **1180px** — avant, elle n'avait pas de maximum du
tout et s'étirait à 2500px sur un écran de 2560 (`S-12`).

Le compte de cartes n'a pas de colonne « avant », et c'est honnête de le
dire : avant, la sonde devinait la carte à partir d'un rayon et d'une
bordure, et annonçait **27 cartes sur Réservations**. C'était faux dans
les deux sens (`T-06`). `Card` pose maintenant `data-card`, et les
chiffres ci-dessus sont ceux du composant. Ce qui est vrai et mesurable :
**la ligne de réservation était une carte et n'en est plus une**, et
Réservations est passé de vingt-six cartes-lignes à zéro carte.

Neuf cartes n'ont pour tout contenu qu'une liste ou qu'un formulaire.
`D-04` justifie les trois de Disponibilités ; le même raisonnement tient
pour les deux de Ma fiche (Identité et Adresse sont deux objets, pas deux
sections d'un même formulaire), les deux de Check-in (la liste des
attendus et la saisie manuelle sont deux gestes différents), celle de
Notifications et celle d'Inscription (une étape d'un parcours est une
carte par définition : elle a un avant et un après).

---

## Les quatre états

Six écrans × quatre états × deux largeurs = **48 plaques**, dans
`docs/design-audit/apres-etats/`. Le quatrième — accès refusé — n'était
atteignable par aucune URL avant cette recette (`S-16`) ; il fallait un
second compte pour le voir, donc personne ne le voyait.

La règle est que les quatre soient les mêmes composants aux mêmes écarts.
La forme de la surface de chaque état, mesurée :

| État | 1440 | 390 | Identique sur les six écrans ? |
|---|---|---|---|
| Chargement | `1116 × 896` | `358 × 1430` | **oui** — le squelette occupe la hauteur de la vue et garde la forme de la mise en page qu'il remplace |
| Erreur | `1116 × 379` | `358 × 408` | **oui**, au pixel |
| Accès refusé | `1116 × 203` | `358 × 228` | **oui**, au pixel |
| Vide | de `1116 × 44` à `1116 × 1489` | de `358 × 44` à `358 × 1818` | **non, et c'est voulu** |

L'état vide varie parce qu'il ne remplace que la liste : sur Ma fiche, le
formulaire reste et c'est la carte qui se vide ; sur Disponibilités, il ne
reste que l'en-tête. Un état vide qui remplacerait l'écran entier
effacerait la navigation dont le patron a besoin pour en sortir.

Les trois autres sont identiques au pixel sur les six écrans, aux deux
largeurs. C'est la mesure de « les mêmes composants, pas huit
interprétations » — et elle ne vient pas d'une relecture, elle vient de
`QueryState`, qui est le seul endroit où ces trois surfaces existent.

---

## Le calque sur le tableau de bord événementiel

L'espace partenaire (Accueil) posé sur le tableau de bord événementiel
(Vue d'ensemble), à 1440, propriété par propriété :
`node tools/verify/_design-overlay.mjs --diff`.

| Élément | Partenaire | Événement | Verdict |
|---|---|---|---|
| barre latérale, largeur | **260px** | **260px** | identique |
| item de barre latérale | **235 × 40**, padding `0/12/0/12`, rayon **10px**, **13 / 600 / 1,45** | idem, au pixel | identique |
| barre du haut | **1180px** | **1180px** | identique |
| colonne de contenu | **1180px**, padding **32** sur les quatre côtés | idem | identique |
| titre d'écran | **36 / 700 / 1,1** | idem | identique |
| carte, rayon et padding | **28px**, **32** | idem | identique |
| bouton, rayon | **10px** | **10px** | identique |

Les différences que `--diff` imprime encore sont des **absences**, pas des
divergences : le Lot 1 d'Accueil ne rend aucun bouton principal violet
(ses raccourcis sont secondaires) et la Vue d'ensemble n'en rend pas non
plus sur cette route, donc le sélecteur ne trouve rien des deux côtés. Le
chrome, lui, se superpose exactement — ce qui est le résultat qu'on
cherchait : un partenaire qui possède les deux espaces ne rencontre pas
deux produits.

Une divergence a été trouvée et corrigée pendant la recette, et elle ne
se voyait pas sur un calque : **la densité**. Connexion tournait à la
densité bureau quand les huit écrans derrière elle tournaient à la
densité tablette (`X-06`). Le même design system, deux densités, c'est la
décision de départ du Lot 1 ; le même écran dans les deux, c'est un
oubli.

---

## La galerie

Les huit écrans, avant et après, aux deux largeurs. Les plaques au pli
(ce que le patron voit sans faire défiler) sont dans les tableaux
écran par écran ci-dessus ; celles-ci sont les pages entières.

Les fichiers sont dans `docs/design-audit/avant/` et
`docs/design-audit/apres/`, nommés `<écran>@<largeur>.png` pour la page
entière et `<écran>@<largeur>-fold.png` pour le pli.

### 1440

| Écran | Avant | Après |
|---|---|---|
| Réservations | <img src="design-audit/avant/reservations@1440.png" width="300"> | <img src="design-audit/apres/reservations@1440.png" width="300"> |
| Accueil | <img src="design-audit/avant/accueil@1440.png" width="300"> | <img src="design-audit/apres/accueil@1440.png" width="300"> |
| Check-in | <img src="design-audit/avant/check-in@1440.png" width="300"> | <img src="design-audit/apres/check-in@1440.png" width="300"> |
| Connexion | <img src="design-audit/avant/connexion@1440.png" width="300"> | <img src="design-audit/apres/connexion@1440.png" width="300"> |
| Inscription | <img src="design-audit/avant/inscription@1440.png" width="300"> | <img src="design-audit/apres/inscription@1440.png" width="300"> |
| Disponibilités | <img src="design-audit/avant/disponibilites@1440.png" width="300"> | <img src="design-audit/apres/disponibilites@1440.png" width="300"> |
| Ma fiche | <img src="design-audit/avant/ma-fiche@1440.png" width="300"> | <img src="design-audit/apres/ma-fiche@1440.png" width="300"> |
| Notifications | <img src="design-audit/avant/notifications@1440.png" width="300"> | <img src="design-audit/apres/notifications@1440.png" width="300"> |

### 390

| Écran | Avant | Après |
|---|---|---|
| Réservations | <img src="design-audit/avant/reservations@390.png" width="180"> | <img src="design-audit/apres/reservations@390.png" width="180"> |
| Accueil | <img src="design-audit/avant/accueil@390.png" width="180"> | <img src="design-audit/apres/accueil@390.png" width="180"> |
| Check-in | <img src="design-audit/avant/check-in@390.png" width="180"> | <img src="design-audit/apres/check-in@390.png" width="180"> |
| Connexion | <img src="design-audit/avant/connexion@390.png" width="180"> | <img src="design-audit/apres/connexion@390.png" width="180"> |
| Inscription | <img src="design-audit/avant/inscription@390.png" width="180"> | <img src="design-audit/apres/inscription@390.png" width="180"> |
| Disponibilités | <img src="design-audit/avant/disponibilites@390.png" width="180"> | <img src="design-audit/apres/disponibilites@390.png" width="180"> |
| Ma fiche | <img src="design-audit/avant/ma-fiche@390.png" width="180"> | <img src="design-audit/apres/ma-fiche@390.png" width="180"> |
| Notifications | <img src="design-audit/avant/notifications@390.png" width="180"> | <img src="design-audit/apres/notifications@390.png" width="180"> |

---

## Le Figma, remis d'accord

`09 Dashboard basique · Dar Zellij` décrivait le portail d'avant la
recette. Il décrit maintenant celui d'après, et ce qui a été fait est
dit ici parce que la moitié de la page a été refaite par script, à
partir du portail, plutôt qu'à la main.

**Les styles de texte portent l'échelle.** Le fichier avait huit styles,
tous à la densité bureau du Lot 2. Il en a maintenant huit de plus, les
six pas de la densité tablette plus le pas de contrôle et celui d'un
état vide — `text-host-lead`, `text-host-name`,
`text-body · densité hôte`, `text-control · densité hôte`, `text-nav`,
`text-meta · densité hôte`, `text-h2 · état vide` — et chacun porte sa
règle dans sa description, y compris `text-eyebrow`, dont la description
dit maintenant qu'il est retiré des écrans du Lot 1 et pourquoi. Le
spécimen d'échelle de `01 Fondations` les montre, sous une ligne qui dit
laquelle des deux densités décrit laquelle des deux moitiés.

**Les 2 081 couches de texte de la page sont reliées à ces styles** —
plus 20 sur les composants de chrome partagés — au lieu de porter une
taille écrite à la main. Le lien n'a pas été deviné : chaque chaîne a été
cherchée dans ce que le navigateur rend réellement, écran par écran, ce
que `_design-measure.mjs` enregistre maintenant sous `strings`. Une
correspondance devinée à partir de « 15px devient probablement 16 »
aurait retypé la bande horaire et le nom d'un client de la même façon.
Seize chaînes que deux écrans rendent à deux pas différents — « Déjeuner »
est un onglet ici et un titre de carte là — ont été écartées de la
correspondance plutôt que tranchées au hasard.

**La réservation n'est plus une carte, dans le Figma non plus.** Trente-
cinq cartes de réservation sur sept frames, aux deux largeurs, sont
devenues des lignes dans un seul conteneur bordé, avec l'heure et les
couverts sur une ligne de base, la bande d'état de 6px à gauche, les
quatre décisions à droite et la note sur la seconde ligne qu'elle gagne.
Les **quarante** bandes horaires ont été retirées. La barre de jour est
sortie de sa carte sur les sept frames. Le frame principal de
Réservations a été reconstruit à partir des vingt-six lignes du portail
plutôt que des cinq qu'il montrait.

**Et le reste du chrome.** Les deux sur-titres en capitales espacées
supprimés ; le titre de Connexion passé au serif que le code rend (le
Figma le dessinait en sans) ; les libellés de la barre du bas sur
`text-nav` et « Carnet » renommé « Réservations » dans le composant, donc
sur les onze instances ; les compteurs de facettes ramenés sur ceux du
portail ; les icônes de décision reposées à la taille et à l'épaisseur
uniques.

**Ce qui n'a pas été touché, et pourquoi.** Les pages `04 Espace
partenaire` et `08 Exemple complet` décrivent le Lot 2 : la recette porte
sur les huit écrans du Lot 1, et retyper le Lot 2 à la densité tablette
serait faux. Les frames de `09` sont des couches dessinées et non des
instances — 6 372 nœuds, dont 47 instances, toutes de chrome — donc rien
ne se propage de `02 Composants` vers leur intérieur, et tout ce qui est
décrit ci-dessus a dû être écrit couche par couche. C'est aussi la raison
pour laquelle la page dérive : la prochaine fois, elle se régénère depuis
`docs/lot1-dar-zellij.json` et `docs/lot1-reference/`, tous deux
re-capturés dans cette branche. La note en est portée sur
`00 Lisez-moi`, sous « La recette de conception ».

---

## Les règles, pour la suite

Ce document est un compte-rendu : il dit ce qui a été trouvé une fois.
Les règles, elles, vivent dans le produit, à deux endroits :

1. **`/styleguide#rules`** — une section « Règles » ajoutée à la route du
   styleguide. Le rythme, l'échelle, les rôles de couleur, les contrôles,
   la mise en page, les mots, les états, les icônes et le mouvement, en
   phrases qu'on peut opposer à un écran. Les autres sections de cette
   page montrent ce que le portail *contient* ; celle-là dit ce qui est
   *permis*. La différence compte : un exemple se recopie, une règle se
   vérifie.
2. **`src/app/globals.css`** — la gamme d'espacement et le maximum de la
   colonne portent maintenant leur règle en commentaire à l'endroit où le
   token est déclaré, avec ce que chaque distance veut dire. Un token sans
   sa raison est un nombre qu'on recopiera de travers.

Et une règle est devenue un test : `tools/verify/scale.mjs` échoue quand
un pas de type déclaré dans `globals.css` manque à `TYPE_UTILITIES`. Le
constat `I-03` ne se voyait ni à la relecture du code ni à la capture
d'écran ; il ne se voyait qu'en mesurant, et maintenant il fait échouer
un build.

---

## Ce qu'une règle n'a pas tranché

Ce qui reste tient en une phrase : **les cinq choses non réglées sont
toutes des arbitrages de produit déguisés en questions de mise en page**,
et les régler au ruban aurait donné des chiffres verts et un écran moins
juste. Le carnet montre onze lignes au lieu de douze non pas parce que la
typographie est trop grosse mais parce que la note du client est sur la
ligne — et savoir si elle doit y être est une question qu'on pose à un
restaurateur, pas à une gamme d'espacement. La ligne fait 200 pixels sur
un téléphone parce que quatre décisions contractuelles ont besoin de
quatre cibles de 44, et choisir laquelle sacrifier revient à modifier ce
que le lot a acheté. Deux écrans de réglages dépassent le seuil de mots
de trois et cinq mots, dont aucun n'est superflu, ce qui dit que le seuil
d'un écran qu'on règle une fois n'est pas celui d'un écran qu'on lit
debout. La clause en italique de la carte d'accueil enfreint deux règles
et est couverte par l'exception que ce document accorde, mais rien dans
le code n'empêche de la recopier ailleurs. Et deux éléments de la carte
Leaflet restent sous le seuil tactile parce qu'appliquer une règle de
contrôle à ce qui n'est pas un contrôle serait obéir à la lettre contre
le lecteur. Chacune est détaillée ci-dessous, avec l'option qu'elle
ouvre, pour être décidée plutôt que corrigée en passant.

Le détail, dans l'ordre d'importance :

**La première est la densité de Réservations à 1440, et c'est la plus
importante.** La règle demande un service de déjeuner entier, douze à
quinze lignes, au-dessus du pli à 900 de haut. La ligne est passée de 84
à 44 pixels, le chrome de 490 à 320, les vingt-six cartes à zéro, et le
compte est de **onze**. Les quatre pixels qui manquent ne sont pas dans
la ligne : ils sont dans les trois lignes de ce jeu d'essai qui portent
une note du client — « Anniversaire, dessert avec bougie », « Sans gluten
pour deux couverts », « Demande une table près de la fontaine » — et qui
font 66 pixels au lieu de 44. Sans note, l'écran en montre treize. Avec
une note sur chaque ligne, huit. Le service réel sera entre les deux, et
la vraie question n'est donc pas typographique : **est-ce que la note du
client doit être sur la ligne, ou derrière la ligne ?** Sur la ligne, elle
coûte un tiers des lignes visibles ; derrière, elle coûte un geste au
moment où le patron installe la table. Aucune règle de ce document ne
tranche ça, et elle se tranche avec un restaurateur, pas avec un ruban.
Le reste — resserrer la typographie, retirer l'état, raccourcir le nom —
rendrait le carnet plus dense et moins lisible, ce qui est le contraire de
l'objectif.

**La deuxième est le carnet à 390.** La ligne de réservation fait
**177 pixels**, ou 200 quand elle porte une note, contre 44 et 66 sur un
portable — et deux lignes tiennent au-dessus du pli. Ce n'est pas de la typographie non plus : c'est
que les quatre décisions contractuelles — accepter, refuser, décaler,
appeler — se replient en deux rangées de deux, à 44 pixels chacune, parce
que 44 est le minimum tactile et que quatre fois 44 ne tient pas sur 358
pixels à côté d'un nom. Les trois règles en jeu se contredisent
franchement : §4 veut 44, §5 veut la densité, et le périmètre du Lot 1
veut les quatre décisions visibles sans geste supplémentaire. Deux sorties
existent — ne montrer les décisions que sur les lignes qui en attendent
une (une ligne confirmée n'a rien à décider), ou les mettre derrière une
seule pression — et les deux touchent à ce que le lot a acheté. Elles sont
décrites ici pour être choisies, pas appliquées en passant.

**La troisième est la règle des quarante mots sur un écran de réglages.**
Six écrans sur huit sont sous le seuil. Disponibilités est à **43** et
Notifications à **45**, et il ne reste sur ni l'un ni l'autre une seule
phrase qui ne gagne pas sa place : « Coupé : visible, mais plus
réservable. » (6 mots) dit ce que le patron risque en coupant son
établissement ; « Une table libérée est une table à remplir. » (8) dit
pourquoi cette alerte-là vaut d'être reçue. Les trois et cinq mots de trop
ne se coupent qu'en supprimant une explication, sur un écran où chaque
champ change ce que l'application propose aux clients. La règle a déjà été
reformulée une fois pendant cette recette pour être mesurable — les titres
et les libellés de champ ne comptent pas, ils nomment au lieu
d'expliquer — et la reformuler une seconde fois pour atteindre le chiffre
serait écrire la règle autour du résultat. **Quarante est le bon seuil pour
un écran qu'on lit debout, et un écran de réglages n'est pas de ceux-là** ;
la version défendable est « quarante sur un écran d'exploitation,
cinquante sur un écran qu'on règle une fois ». Elle n'est pas écrite dans
le styleguide, parce que c'est une décision de produit.

**La quatrième est la clause en italique de la carte d'accueil.** §2
interdit « un seul mot en italique ou en couleur dans un titre » et §3
réserve le violet à l'action principale et à l'état actif. La carte
d'accueil fait les deux : « Bonsoir, Yassine. » en sans, puis la clause du
jour en serif italique violette. Ce document accorde explicitement une
exception à la carte d'accueil, et §8 la renforce — c'est le geste que
partage la Vue d'ensemble événementielle, et un partenaire qui possède les
deux espaces ne doit pas rencontrer deux produits. Donc elle reste. Mais
l'exception est accordée à *un* geste dans *une* carte, et rien dans le
code ne l'empêche d'être recopiée ailleurs : `emphasis` est un champ de
spec que n'importe quel bloc peut remplir. C'est une frontière qui tient
par convention, pas par construction.

**La cinquième est le tiers sur la carte.** L'attribution OpenStreetMap et
le marqueur de Ma fiche restent sous les seuils — 15 pixels de haut pour
un lien, 26 × 26 pour le marqueur. Les deux peuvent être couverts d'un
sélecteur, comme l'ont été l'attribution et les boutons de zoom ; aucun ne
devrait l'être. Le lien est la licence de la cartographie et sa forme
n'appartient pas à ce produit ; le marqueur est un point sur une carte,
pas un bouton. Une règle sur les contrôles appliquée à ce qui n'est pas un
contrôle donne des chiffres verts et un écran moins juste.

---

## Refaire la mesure

```bash
# le portail, en Lot 1, sur le seed Dar Zellij
LYFE_DATA=db DATABASE_URL=postgres://… LYFE_LOT=1 npm run build && \
  LYFE_DATA=db DATABASE_URL=postgres://… LYFE_LOT=1 npx next start -p 3230

# l'échelle ne dérive pas
node tools/verify/scale.mjs

# mesurer, aux deux largeurs
BASE=http://localhost:3230 W=1440 H=900 OUT=scratch/design/after-1440 \
  node tools/verify/_design-measure.mjs
BASE=http://localhost:3230 W=390  H=844 OUT=scratch/design/after-390 \
  node tools/verify/_design-measure.mjs

# les tableaux
DIR=after node tools/verify/_design-report.mjs
DIR=after node tools/verify/_design-report.mjs rhythm --1440

# les plaques, les quatre états, le calque
PHASE=apres BASE=http://localhost:3230 W=1440 H=900 node tools/verify/_design-shots.mjs
PHASE=apres BASE=http://localhost:3230 W=1440 H=900 node tools/verify/_design-states.mjs
BASE=http://localhost:3230 LOT=1 node tools/verify/_design-overlay.mjs
BASE=http://localhost:3230 LOT=2 node tools/verify/_design-overlay.mjs
node tools/verify/_design-overlay.mjs --diff
```

Les seuils sont dans `tools/verify/_design-report.mjs`, en haut, en trois
lignes. Les changer change le rapport ; c'est voulu, et c'est pour ça
qu'ils sont à un seul endroit.
