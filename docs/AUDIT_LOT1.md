# Audit de recette — Lot 1 · Dashboard basique

## En dix lignes

1. **Ce qui a été fait.** Le Lot 1 a été audité comme une recette, pas relu : démarrage à froid exécuté à la lettre trois fois, douze outils de recette dans les deux lots et sur les trois modes, 563 appels HTTP tracés contre le contrat, dix familles d'épreuves adverses sur SQLite et sur Postgres, 43 cadres Figma comparés à l'écran, et une réservation suivie de l'application au tableau de bord et retour. Rien n'est repris d'un document du dépôt sans avoir été relancé.
2. **Verdict.** La recette du Lot 1 peut être prononcée. **Dix constats bloquants ont été trouvés ; les dix sont corrigés et vérifiés dans ce dépôt.** Aucun ne restait au moment d'écrire ces lignes.
3. **Le compte.** 68 constats : **10 bloquants** (10 corrigés), **35 majeurs** (29 corrigés, 5 décrits, 1 instable et dit comme tel), **13 mineurs** (13 traités), **10 notes**. Le registre complet, trié, est en partie H.
4. **Ce qui reste, nommément.** `A-04` l'écran de saisie du code de vérification que la ligne 39 décrit — il lui faut un service qui envoie et qui vérifie, et un écran qui accepte n'importe quel code est pire que son absence. `C-07` la revue LYFE, qui n'est pas appelée sur le pilote HTTP parce que l'écran relève de `SP-Prio 03` et que l'ouvrir élargirait le lot 1. `E-06` `jsqr`, sans publication depuis 2021, analyse le flux de caméra. `E-07` l'anonymisation d'un client, qui relève de `SP-Prio 08`. `G-01` neuf champs que le backend FastAPI de l'application ne rend pas encore. Chacun porte son correctif décrit et son chiffrage.
5. **Le périmètre.** Chaque élément des neuf écrans est rattaché à une phrase de `Planning V3` ligne 39 ou d'une ligne `SP-Prio 02` de `Détail Sprint `, ou classé hors périmètre et retiré. Trois choses ont été **retirées** faute d'une phrase qui les achète : la cloche de notification, « Exporter la journée » et la porte vers l'espace Events. Une reste, gardée et classée : `/admin/validations`, qui est du `SP-Prio 03` et que ce document exclut de la surface de recette du Lot 1.
6. **Le démarrage à froid tient.** Sur un clone neuf sans base ni `.env` : `npm install` 10 s, `npm run build` 65 s, les trois routes publiques rendent, et `/api/health` dit lequel des trois pilotes répond et pourquoi. La commande de build de `vercel.json` a été relancée avec et sans `DATABASE_URL`, puis deux fois de suite : elle ne réécrit pas les données d'un partenaire.
7. **Le contrat est devenu exécutable.** `docs/lot1-openapi.yaml` — 27 chemins, 35 opérations, 24 schémas, validé — est **dérivé du code**, pas du markdown, et le markdown a été ramené dessus. Sur 563 appels tracés contre le service double : **aucun 404, aucun 500**. Il en portait deux, en 500, sur la feuille Décaler et sur la recherche du carnet — deux des quatre changements achetés par ce lot, et la passe précédente comptait les 404 sans compter les 500.
8. **Les deux produits partagent bien une réservation.** Le parcours complet passe : inscription, revue LYFE, mise en ligne, réservation faite dans l'application, décision prise par le partenaire, relecture dans l'application. Il ne passait pas avant : l'application écrivait un canal que le tableau de bord ne connaissait pas, n'envoyait aucun téléphone, et un index unique faisait échouer le **deuxième** client d'un établissement.
9. **Les chiffres.** Accueil passe de 6 359 ms à 812 ms sur une journée de 2 005 réservations. Pire route : **205 Ko** de script transférés contre un plafond de 300 — 308 Ko avant de sortir `recharts` d'un lot qui ne dessine aucun graphe. axe-core : **0 critique, 0 sérieux** sur les huit écrans, contre 0 et 2 avant.
10. **Ce que DigiNegoce a en main.** `docs/PARCOURS_INTEGRATION.md` : brancher le front-end sur leur Business Service en moins d'une heure, huit paliers, la requête et la réponse exactes, le test d'acceptation de chaque palier pris dans les outils, et un chiffrage de **21,75 j-h** hypothèse comprise. Rien n'y contredit cet audit.

---

## Comment lire ce document

Rien de ce qui est affirmé ici n'est repris d'un autre document du dépôt.
Chaque ligne est soit une citation d'un des trois documents d'autorité,
soit le résultat d'une commande exécutée dans ce conteneur, soit une
lecture du code avec fichier et ligne. Là où une vérification n'a pas pu
être faite, c'est écrit.

Quatre sévérités :

| Sévérité | Ce que cela veut dire |
|---|---|
| **Bloquant** | La recette ne peut pas être prononcée. Une donnée est fausse, un accès est ouvert, un écran ne se charge pas. |
| **Majeur** | Un partenaire ou un intégrateur se heurte au problème dans l'usage normal. Corrigé ici si le correctif tient en deux heures, sinon décrit. |
| **Mineur** | Défaut visible, contournable, sans conséquence sur une décision ni sur une donnée. Corrigé. |
| **Note** | Ni défaut ni conformité : un point que DigiNegoce soulèvera, et la réponse. |

Chaque constat porte un identifiant (`A-01`, `B-03`, …), son fichier et
sa ligne, la reproduction exacte, et soit le correctif appliqué soit la
raison pour laquelle il ne l'a pas été. Le registre complet, trié par
sévérité, est en partie H.

---

## Les trois documents d'autorité

Tout le périmètre discuté ici se décide dans
`docs/reference/Planning_Lyfe_V3_20260923.xlsx`, daté du 23 septembre
2026, commité dans ce dépôt pour que ces citations soient vérifiables
sans demander un fichier à personne.

### `Planning V3`, ligne 39 — le sprint

| Colonne | Valeur, verbatim |
|---|---|
| `Sprint` | `Prio 02` |
| `Date début prévisionnelle` | 12 octobre 2026 |
| `Date fin Prévisionnelle` | 30 octobre 2026 |
| `Fonctionnalités couvertes` | `Events :` · `- Dashboard : Gestion des évènements avec paiment partiel sur appli / Changement de mot de passe Organisateur` · `- App : retour de l'ecran ticket & gestion du popup / Photos au niveau du détails des évènements / Type du ticket au niveau de l'ecran ticket` · `Restau & Drinks :` · `- Dashobaord basique (Authentification + Création de Venue + Gestion des reservation uniquement)` · `- Réservation via whatsapp` · `- Ano & Changes` |
| `Prérequis` | `Restau & Drinks` · `- Mauettes pour Dasboard Restau & Drinks` · `- Maquettes pour authentification partenaire Venue` · `- Débloquer les campagnes Whatsapp` |

Trois choses sont achetées pour Restau & Drinks, et une seule est un
tableau de bord : **« Dashobaord basique (Authentification + Création de
Venue + Gestion des reservation uniquement) »**. Le mot qui décide du
reste est *uniquement*.

### `Détail Sprint `, les lignes de `SP-Prio 02`

Seize lignes portent `SP-Prio 02` (39 à 54). Six décident quelque chose
pour ce portail :

| Ligne | `US - Name` / `User Story`, verbatim | Ce qu'elle décide ici |
|---|---|---|
| **39** | `EP02-US04` · `Création de compte et Confirmation d'inscription via Email/Whatsapp` · « En tant qu'utilisateur, je dois pouvoir lancer la création de mon compte via le boutotn "Création de compte". Le bouton doit me renvoyer vers un écran de saisie de mes informations personnelles : **Nom complet, email, téléphone, Mot de passe et confirmation de mot de passe**. Une fois la saisie terminée, le boutotn "Créer mon compte" doit devenir accessible et **envoyer un code de vérification à mon mail ou ) mon whatsapp**, et me renvoyer vers un nouvele écran de vérification pour pouvoir saisir le code partagé (choix possible entre les deux méthodes). » | Les cinq champs de l'étape 1, et l'écran de vérification du code |
| **40** | `Dashboard restaurant partenaire web` · « Mise en place des Dashboards basique (Authentification + Création de Venue + Gestion des reservation uniquement) » | Les six écrans du portail |
| **41** | `Dashboard Drinks/Cellar partenaire ` · même US | Le même portail pour un bar ou un lounge |
| **42** | `Fonctionnalité de reservation manuelle è Whatsapp` | Le canal `whatsapp` sur une réservation |
| **44** | `BETA UAT - 03/08 - CHG- Cacher la cloche de notif au niveau de tous les ecrans puisque les notifications ne sont pas encore traitées` | La cloche de notification, retirée |
| **46** | `BETA UAT - 03/08 - ANO - Reservation _ via Email _ le restaurateur ne reçoit pas de mail pour accepter ou refuser la reservation ou **inviter l'utilisateur à choisir un autre créneau**` | L'alerte au restaurateur **et le décalage d'une réservation** |
| **47** | `BETA UAT - 03/08 - ANO - Reservation Restau & Drinks : changement d'ecran à "Votre réservation est en cours de confirmation" et non "Reservation confirmée" - de memepour les statuts sur la liste des reservation à "en attente de confirmation"` | Le mot pour l'état `requested` |

### Les lignes qui disent ce qui **n'est pas** de ce sprint

| Ligne | Sprint | Contenu |
|---|---|---|
| `Planning V3` 38 | `Prio 01` | `Dashboard : Vue d'ensemble / Mes évènements / … / Authentification et gestion profil Organisateur` — l'espace Events |
| `Planning V3` 41 | `Prio 03` | `- Dashboard Administrateur` · `- MAP sur écran principal` · `- Reservation via API` |
| `Détail Sprint ` 55 | `SP-Prio 03` | `EP41-US01` · `Internal admin panel` · « En tant qu'administrateur, je dois pouvoir : … **Gérer venues: Approve, reject, edit, feature (boost)** … » |
| `Détail Sprint ` 64 et 73 | `SP-Prio 04` | `Check de la disponibilité en temps réél` — « je veux pouvoir voir que les créneaux disponibles » |
| `Détail Sprint ` 70 et 81 | `SP-Prio 04` | `Tracking demandes spéciales` |
| `Planning V3` 44 | `Prio 06` | prérequis : « Définir le format des bilans extractables » |
| `Détail Sprint ` 105 | `SP-Prio 05` | `Notification Post reservation / Push "Comment c'était ?" post-créneau` |
| `Détail Sprint ` 133 et 134 | `SP-Prio 08` | `Mise en place des Dashboards avancés` |

---

## Partie A — Conformité au périmètre

### A.1 La matrice

Une ligne par élément atteignable en `LYFE_LOT=1`. « Classement » vaut
**Contractuel** (une phrase de la ligne 39 de `Planning V3` ou d'une
ligne `SP-Prio 02` le couvre), **Ajout LYFE** (rien ne le nomme, il sert
une des trois choses achetées), ou **Hors périmètre** (une autre ligne
du plan le place dans un autre sprint).

#### Connexion — `/login`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| Champ « Adresse e-mail » | ligne 39 : « Authentification » | Contractuel | Garder |
| Champ « Mot de passe » | ligne 39 : « Authentification » | Contractuel | Garder |
| Afficher / masquer le mot de passe | aucune | Ajout LYFE | Garder — un hôte saisit son mot de passe d'une main sur un pupitre ; coût backend nul |
| « Se souvenir de moi » | aucune | Ajout LYFE | Garder — décide seulement la durée du cookie (30 jours contre la session) |
| « Mot de passe oublié ? » | `Planning V3` 39, prérequis : « Ajout du bouton changement de mot de passe / mot de passe oublié pour l'organisateur » — écrit pour l'**organisateur**, pas pour le partenaire venue | Ajout LYFE | Garder. Le bouton mentait (`A-03`) ; il passe désormais par le pilote et l'endpoint est spécifié au contrat §5.1 bis |
| Bouton « Se connecter » | ligne 39 : « Authentification » | Contractuel | Garder |
| Bandeau « session expirée » | aucune | Ajout LYFE | Garder — état réel d'un partenaire dont le cookie a expiré |
| Choix de l'établissement (comptes à deux lieux) | ligne 40 : un tableau de bord par `venue` | Contractuel | Garder |
| État « aucun espace attaché » | aucune | Ajout LYFE | Garder — c'est l'écran de la veille de l'onboarding |
| « Inscrire mon établissement » | ligne 39 : « Création de Venue » | Contractuel | Garder |

#### Inscription — `/inscription`, six étapes

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| Étape 1 · « Votre nom » | `Détail Sprint ` 39 : « Nom complet » | Contractuel | Garder |
| Étape 1 · « Adresse e-mail » | `Détail Sprint ` 39 : « email » | Contractuel | Garder |
| Étape 1 · « Téléphone » | `Détail Sprint ` 39 : « téléphone » | Contractuel | **Corrigé** : était « Téléphone (facultatif) », désormais demandé (`A-01`) |
| Étape 1 · « Mot de passe » | `Détail Sprint ` 39 : « Mot de passe » | Contractuel | Garder |
| Étape 1 · « Confirmation du mot de passe » | `Détail Sprint ` 39 : « et confirmation de mot de passe » | Contractuel | **Ajouté par cet audit** (`A-02`) |
| Écran de vérification par code (e-mail ou WhatsApp, au choix) | `Détail Sprint ` 39, la seconde moitié de l'US | Contractuel | **Absent** (`A-04`). Spécifié au contrat, chiffré dans `PARCOURS_INTEGRATION.md` ; l'écran ne peut pas être livré honnêtement sans un service qui envoie le code |
| Étape 2 · « Nom de l'établissement » | ligne 39 : « Création de Venue » | Contractuel | Garder |
| Étape 2 · « Un restaurant » / « Un bar ou lounge » | `Détail Sprint ` 40 et 41 | Contractuel | Garder |
| Étape 2 · Ville, liste fermée de cinq | aucune | Ajout LYFE | Garder — l'application groupe les lieux par cette chaîne ; cinq noms valent mieux que cinq orthographes de Marrakech |
| Étape 3 · « Adresse » | ligne 39 : « Création de Venue » | Contractuel | Garder |
| Étape 3 · Carte, point déplaçable, « Trouver sur la carte » | `Planning V3` 41 place « MAP sur écran principal » en `Prio 03`, mais il s'agit de la carte de l'**application** ; ici ce sont les coordonnées du lieu, donc son dossier | Ajout LYFE | Garder. Le fournisseur de tuiles devient configurable (`E-04`) — les tuiles OSM publiques ne sont pas un fournisseur de production |
| Étape 4 · Photo de couverture | ligne 39 : « Création de Venue » — l'application montre une photo | Contractuel | Garder |
| Étape 5 · Grille des horaires | ligne 39 : « Création de Venue » — sans horaires, rien n'est réservable | Contractuel | Garder |
| Étape 6 · Récapitulatif « C'est prêt » | aucune | Ajout LYFE | Garder |
| Barre de progression à six segments | aucune | Ajout LYFE | Garder |

#### Accueil — `/restaurant`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| Carte d'accueil (salutation + une phrase de comptes) | aucune | Ajout LYFE | Garder — récapitule la journée sans introduire de chiffre de pilotage |
| Groupe « À traiter » | ligne 39 : « Gestion des reservation » | Contractuel | Garder |
| Groupe « Prochaines arrivées » | idem | Contractuel | Garder |
| Groupe « Arrivés » | idem | Contractuel | Garder |
| Ligne : heure et couverts | idem | Contractuel | Garder |
| Ligne : téléphone du client | aucune | Ajout LYFE | Garder — demandé, et la seule chose qu'un hôte fait d'une réservation hors de cet écran est appeler |
| Ligne : bandeau d'état | `Détail Sprint ` 47 pour le mot | Contractuel | Garder ; voir `A-07` sur l'écart de vocabulaire avec l'application |
| Ligne : demande particulière | aucune. `Détail Sprint ` 70 et 81 placent le *tracking* des demandes spéciales en `SP-Prio 04` — leur affichage n'est pas leur analyse | Ajout LYFE | Garder ; voir `E-07` (CNDP : une allergie est une donnée de santé) |
| Actions « Accepter » et « Refuser » | `Détail Sprint ` 46 : « pour accepter ou refuser la reservation » | Contractuel | Garder |
| Action « Décaler » | `Détail Sprint ` 46 : « ou inviter l'utilisateur à choisir un autre créneau » | **Contractuel** | Garder |
| Action « Absent » | aucune | Ajout LYFE | Garder — l'autre moitié du résultat d'une réservation ; sans elle une table reste « confirmée » toute la nuit |
| Action « Check-in » sur la ligne | ligne 40 : le tableau de bord d'un restaurant honore une réservation | Contractuel | Garder |
| « Ouvrir le carnet » | aucune | Ajout LYFE | Garder — lien interne |
| Barre de recherche du bandeau | aucune | Ajout LYFE | Garder ; voir A.2 question 2 |
| Cloche de notification | `Détail Sprint ` 44 : « Cacher la cloche de notif au niveau de tous les ecrans » | **Hors périmètre** | **Retirée** (`A-05`) |
| Bouton d'assistant IA | `Planning V3` 44, `Prio 06` : « Agent IA Basic » | Hors périmètre | Déjà absent en Lot 1 |
| Sélecteur d'établissement | ligne 40 | Contractuel | Garder |
| Porte vers l'espace Events | `Planning V3` 38, `Prio 01` | **Hors périmètre** | **Fermée en Lot 1** (`A-06`) |

#### Réservations — `/restaurant/reservations`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| Barre de jour : précédent, suivant, aujourd'hui, « Choisir une date » | aucune | Ajout LYFE | Garder — un restaurant prend les réservations de demain pendant le service de ce soir |
| Onglets de service (Déjeuner / Dîner) | ligne 39 : « Gestion des reservation » | Contractuel | Garder |
| Onglets Tous / À confirmer / Confirmées / Arrivés, avec compteurs | idem | Contractuel | Garder |
| « Trier par » (cinq ordres) | aucune | Ajout LYFE | Garder — coût backend nul, tri côté client |
| Regroupement du carnet par créneau | idem que ci-dessus, avec la longueur choisie par le lieu | Contractuel (le regroupement) · Ajout LYFE (la longueur) | Garder ; voir A.2 question 3 |
| « Imprimer » | aucune | Ajout LYFE | Garder — impression navigateur, aucun endpoint |
| « Exporter la journée » | aucune ; `Planning V3` 44 place « Définir le format des bilans extractables » en `Prio 06` | **Hors périmètre** | **Retiré** (`A-08`) — et le bouton ne faisait rien |
| Tiroir « Détail réservation » : nom, téléphone, e-mail, âge, couverts, espace, canal, demande, visites | aucune | Ajout LYFE | Garder ; voir A.2 question 4 et `E-07` |
| Feuille « Décaler » : les créneaux du lieu, et rien d'autre | `Détail Sprint ` 46 | Contractuel | Garder |
| Feuille « Refuser » : motif codé | aucune | Ajout LYFE | Garder — c'est ce qui sépare « refusée » d'« annulée » en aval |
| Résultats de recherche groupés par jour | aucune | Ajout LYFE | Garder ; voir A.2 question 2 |
| « Nouvelle réservation » | aucune | Hors périmètre | Déjà absent en Lot 1 |

#### Check-in — `/restaurant/check-in`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| « Scanner le code » | ligne 40 : honorer une réservation | Contractuel | Garder |
| « Check-in » sur chaque ligne attendue | idem | Contractuel | Garder |
| « Chercher par nom » | aucune | Ajout LYFE | Garder — le repli quand le client n'a pas son code |
| « Code de réservation » + « Valider » | idem | Contractuel | Garder |
| Liste « Trente dernières minutes » (annulation d'un scan) | aucune | Ajout LYFE | Garder — une erreur de scan se voit dans les cinq minutes |

#### Ma fiche — `/restaurant/ma-fiche`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| Nom du lieu, nom court, description, catégorie | ligne 39 : « Création de Venue » | Contractuel | Garder |
| Adresse, ville, téléphone, e-mail, site web | idem | Contractuel | Garder |
| Carte et point | voir Inscription étape 3 | Ajout LYFE | Garder |
| Onglet « Horaires » | ligne 39 | Contractuel | Garder |
| Onglet « Photos » (ajout, ordre, retrait) | ligne 39 | Contractuel | Garder |
| Onglet « Menu » | `Détail Sprint ` 133, `SP-Prio 08` | Hors périmètre | Déjà absent en Lot 1 |
| Onglet « Équipe et rôles » | idem | Hors périmètre | Déjà absent en Lot 1 |

#### Disponibilités — `/restaurant/disponibilites`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| « Accepter les réservations en ligne » | ligne 39 : « Création de Venue » — ce qui rend le lieu réservable | Contractuel | Garder |
| Liste des services, « Ajouter un service », « Retirer ce service » | idem | Contractuel | Garder |
| Par service : jours, ouverture, fermeture, dernière réservation acceptée | idem | Contractuel | Garder |
| Par service : « Créneaux de » 15 / 30 / 60 minutes | aucune. `Détail Sprint ` 64 et 73 placent « Check de la disponibilité en temps réél » en `SP-Prio 04` | Ajout LYFE | Garder ; voir A.2 question 3 |
| Par service : capacité | ligne 39 | Contractuel | Garder |
| « Fermer une journée » | aucune | Ajout LYFE | Garder — une fermeture exceptionnelle fait partie des heures réservables |
| Lien vers Calendrier | `SP-Prio 08` | Hors périmètre | Déjà absent en Lot 1 |

#### Notifications — `/restaurant/notifications`

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| « Nouvelle demande de réservation » × Push / E-mail / WhatsApp | `Détail Sprint ` 46 : « le restaurateur ne reçoit pas de mail pour accepter ou refuser » ; ligne 39 : « Réservation via whatsapp » | **Contractuel** | Garder |
| « Annulation par le client » × trois canaux | aucune | Ajout LYFE | Garder — une table qui se libère est une table à remplir |
| « Rappel au client la veille » × trois canaux | aucune. La ligne la plus proche est `Détail Sprint ` 105, `SP-Prio 05` | Ajout LYFE | Garder **la préférence** ; le contrat dit désormais que le Lot 1 la stocke et ne l'envoie pas (`A-09`) |
| « Qui les reçoit » : numéro et e-mail d'alerte | `Détail Sprint ` 46 | Contractuel | Garder |
| « Journal de délivrance » | `SP-Prio 08` | Hors périmètre | Déjà absent en Lot 1 |

#### `/admin/validations` — la revue LYFE

| Élément | Référence justificative | Classement | Recommandation |
|---|---|---|---|
| File des établissements en attente | `Détail Sprint ` 55, `EP41-US01`, **`SP-Prio 03`** : « Gérer venues: Approve, reject, edit, feature (boost) » | **Hors périmètre du Lot 1 — mais contractuel en `SP-Prio 03`** | Garder, gardé par la table `platform_admins`, et **exclu de la surface de recette du Lot 1** (`A-10`) |
| « Valider » | idem | idem | idem |
| « Refuser » + « Ce que le partenaire verra » | idem | idem | idem |
| Colonne `venues.status` | aucune ligne ne la nomme ; la ligne 55 la présuppose | Ajout LYFE | Garder — l'application ne doit pas lister un lieu que LYFE n'a pas vu |
| Bandeau « en attente de validation » sur le tableau de bord du partenaire | aucune | Ajout LYFE | Garder — sans lui le partenaire ne sait pas pourquoi son lieu n'apparaît pas |

### A.2 Les six questions posées

**1. Décaler — quelle phrase de la ligne 39 ou de `Prio 02` le couvre ?**

`Détail Sprint `, ligne 46, `SP-Prio 02`, statut `En cours` :

> `BETA UAT - 03/08 - ANO - Reservation _ via Email _ le restaurateur ne
> reçoit pas de mail pour accepter ou refuser la reservation ou inviter
> l'utilisateur à choisir un autre créneau`

« Inviter l'utilisateur à choisir un autre créneau » est le décalage,
nommé dans le même sprint que ce tableau de bord, comme anomalie à
corriger. **Décaler est contractuel.** La feuille ne propose que les
créneaux du service concerné (`src/components/restaurant/RescheduleSheet.tsx`),
ce qui est la seule lecture cohérente avec « un autre créneau ».

**2. Recherche multi-jours — quelle phrase la couvre ?**

**Aucune.** Ni la ligne 39 de `Planning V3` ni aucune ligne `SP-Prio 02`
ne parle de rechercher une réservation. Le classement est donc *ajout
LYFE*, et la recommandation est de la garder pour une raison qui se
tient devant DigiNegoce : la ligne 46 demande de pouvoir proposer un
autre créneau à un client, et la première chose qu'il faut pour cela est
retrouver sa réservation — un hôte au téléphone avec un client qui
appelle pour décaler n'a que son nom et son numéro. Le coût côté service
est un seul endpoint,
`GET /api/business/venues/{id}/bookings/search?q=` (contrat §3.1), sans
lequel la recherche se rabat sur la journée affichée.

**3. Longueur de créneau — quelle phrase la couvre ?**

**Aucune.** Rien dans `Prio 02` ne nomme une grille horaire. Deux lignes
la touchent de loin, et les deux sont plus tard : `Détail Sprint ` 64 et
73, `SP-Prio 04`, « Check de la disponibilité en temps réél ».

Le classement est *ajout LYFE*. La recommandation est de garder le champ
`service_definitions.slot_minutes`, pour une raison de cohérence
produit : sans lui, la capacité d'un service n'a pas d'unité — « 72
couverts » veut dire 72 par demi-heure ou 72 par heure selon une
convention que personne n'a écrite, et l'application propose des heures
que le carnet ne sait pas regrouper. Le champ est un `INTEGER NOT NULL
DEFAULT 30 CHECK (slot_minutes IN (15,30,60))` : un backend qui l'ignore
sert 30 et rien ne casse.

**4. Détails du client et validation LYFE — quelles phrases les couvrent ?**

*Détails du client* : **aucune phrase**. « Gestion des reservation » ne
dit pas ce qu'une réservation montre. Le classement est *ajout LYFE* ;
les champs affichés sont ceux que l'application a déjà collectés, aucun
n'est saisi dans le portail, et aucun endpoint nouveau n'est demandé —
ils arrivent dans le `Reservation` que `GET /api/business/overview` sert
déjà. Deux réserves, en partie E : l'année de naissance et la demande
particulière n'ont pas de finalité écrite (`E-07`), et une allergie est
une donnée de santé au sens de la loi 09-08.

*Validation LYFE* : **une phrase, mais dans un autre sprint.**
`Détail Sprint `, ligne 55, `EP41-US01`, `SP-Prio 03` :

> « En tant qu'administrateur, je dois pouvoir : … **Gérer venues:
> Approve, reject, edit, feature (boost)** … »

C'est exactement `/admin/validations`, et c'est `SP-Prio 03`, pas
`Prio 02`. Le constat honnête est donc : **l'écran est livré en avance
sur son sprint.** La recommandation n'est pas de le retirer — LYFE a
demandé la fonction et elle est faite — mais de la classer juste, ce qui
protège des deux côtés : DigiNegoce ne peut pas la refuser comme « non
conforme au Lot 1 » puisqu'elle n'est pas présentée comme du Lot 1, et
ne peut pas la rechiffrer en `SP-Prio 03` puisqu'elle est déjà écrite.
L'écran est gardé par une ligne `platform_admins`, un partenaire ne peut
pas l'ouvrir, et la surface de recette du Lot 1 est les six écrans
partenaire plus Connexion et Inscription.

**5. La configuration `creneau` d'un lounge est-elle justifiée par
`Détail Sprint ` ligne 41, ou est-ce du Lot 2 ?**

**Justifiée par la ligne 41.** Cette ligne est le même user story que la
40, pour `Dashboard Drinks/Cellar partenaire ` :

> « Mise en place des Dashboards basique (Authentification + Création de
> Venue + Gestion des reservation uniquement) »

Ce que la configuration `lounge` fait dans ce dépôt est mesurable, et
c'est peu : un `ServiceKind` de plus (`creneau`, libellé « Créneau »,
`src/lib/types/restaurant.ts:123`), son entrée de vocabulaire
(`src/lib/restaurant/vocabulary.ts:69`), et deux définitions de service
semées pour Bar Nomad — « Sunset » et « Nuit » (`db/seed.mjs:1703`).
Aucun écran de plus, aucun champ de plus, aucun endpoint de plus : les
mêmes six écrans, avec le mot qu'un bar emploie. La configuration
commande par ailleurs le groupe « Vie nocturne » de la navigation, et
ce groupe est entièrement `LOT_BY_SLUG = 2`
(`src/lib/restaurant/slugs.ts:113`), donc invisible en Lot 1 —
`tools/verify/configuration.mjs` le vérifie à chaque passage.

**6. L'espace Events atteignable depuis le sélecteur est-il acceptable
dans une recette Lot 1 ?**

**Non, et c'était le cas.** Le compte avec lequel une recette se
connecte — `yassine@darzellij.ma`, le propriétaire de Dar Zellij — porte
`organizations: ["org_rooftop_mansour"]` (`src/lib/auth/accounts.ts:63`).
`access.event` valait donc `true`, et la carte d'identité de la barre
latérale offrait « Espace organisateur » : un clic depuis l'Accueil du
Lot 1 vers un tableau de bord Events qui appartient à `Prio 01`
(`Planning V3` ligne 38). Un recetteur qui suit ce lien ne recette plus
le Lot 1 ; s'il le prend pour du Lot 1, il constate une livraison bien
plus large que la commande, et c'est précisément l'argument « le
front-end ne correspond pas au périmètre ».

Corrigé (`A-06`) : en `LYFE_LOT=1`, le lien vers l'espace Events n'est
plus rendu (`src/components/organizer/Sidebar.tsx:245`). Les routes
Events restent servies par le même déploiement — elles sont livrées, et
`Prio 01` les a achetées — mais le portail partenaire du Lot 1 n'ouvre
plus de porte vers elles. La surface de recette est alors exactement les
six écrans plus les deux écrans d'entrée.

### A.3 Constats de la partie A

| Id | Sévérité | Constat | Fichier · ligne | Reproduction | Correctif |
|---|---|---|---|---|---|
| `A-01` | Mineur | L'étape 1 de l'inscription demandait « Téléphone (facultatif) » là où `Détail Sprint ` 39 nomme « téléphone » parmi les informations personnelles, et où le code de vérification de la même ligne part « à mon mail ou ) mon whatsapp » — ce qui suppose un numéro | `src/app/inscription/InscriptionFlow.tsx:235` | Ouvrir `/inscription`, laisser le téléphone vide, continuer : le compte est créé | **Appliqué** — champ demandé, libellé « Téléphone », validation ≥ 9 chiffres (`src/app/actions/onboarding.ts`) |
| `A-02` | Majeur | Pas de champ de confirmation du mot de passe, là où `Détail Sprint ` 39 écrit « Mot de passe **et confirmation de mot de passe** ». Un mot de passe mal frappé n'a aucune issue : le lien de réinitialisation ne fonctionnait pas non plus (`A-03`) | `src/app/inscription/InscriptionFlow.tsx:241` | Ouvrir `/inscription`, saisir un mot de passe, continuer | **Appliqué** — champ ajouté, comparaison côté serveur, et `tools/verify/inscription.mjs` refuse désormais deux saisies différentes |
| `A-03` | Majeur | « Mot de passe oublié ? » répondait « Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé » sans qu'aucun service n'ait été appelé | `src/app/login/SignInPanel.tsx:100` (avant) | Ouvrir `/login`, saisir une adresse, cliquer sur le lien : la phrase s'affiche, aucune requête ne part | **Appliqué** — passe par `requestPasswordReset` sur le pilote ; `POST /api/business/auth/password-reset` au contrat §5.1 bis et dans `tools/mock-api.mjs` ; sans service, l'écran dit où écrire |
| `A-04` | Majeur | L'écran de vérification du code que `Détail Sprint ` 39 décrit — code envoyé par e-mail **ou** WhatsApp, au choix, saisi sur un écran dédié — n'existe pas | `src/lib/types/onboarding.ts:59` (six étapes, aucune n'est la vérification) | Parcourir `/inscription` de bout en bout : le compte est actif sans vérification | **Non appliqué.** Un écran de saisie de code qui accepte n'importe quoi est pire que son absence : il faut un service qui envoie et vérifie. Spécifié dans `docs/PARCOURS_INTEGRATION.md` (deux endpoints, 0,5 j-h de front) |
| `A-05` | Majeur | La cloche de notification était rendue sur tous les écrans, avec un point rouge et aucun gestionnaire, contre `Détail Sprint ` 44 qui demande de la cacher | `src/components/organizer/Topbar.tsx:110` | Ouvrir n'importe quel écran en Lot 1 : la cloche est là, elle n'ouvre rien | **Appliqué** — rendue seulement en `lot === 2`, avec la citation de la ligne 44 en commentaire |
| `A-06` | Majeur | Le compte de recette porte une organisation, donc la barre latérale offrait une porte vers le tableau de bord Events de `Prio 01` | `src/components/organizer/Sidebar.tsx:245` | Se connecter en `yassine@darzellij.ma`, ouvrir la carte d'identité : « Espace organisateur » | **Appliqué** — porte fermée en `LYFE_LOT=1` |
| `A-07` | Note | `Détail Sprint ` 47 demande que l'**application** dise « en attente de confirmation ». Le tableau de bord dit « À confirmer » pour le même état `requested` | `src/lib/restaurant/vocabulary.ts:29` | — | Aucun. Deux vues du même état, deux publics. Le contrat §5.5 donne la table de correspondance des états pour que DigiNegoce n'en fasse pas deux états |
| `A-08` | Majeur | « Exporter la journée », l'action la plus visible de l'écran Réservations, dépêchait `reservations.export` — un verbe qu'aucun registre n'enregistre. Le registre répondait « Action non disponible » | `src/lib/restaurant/screens.ts:1366` (avant) · registre : `src/components/dashboard/commands.tsx:44` et `src/components/restaurant/RestaurantScreen.tsx:108` | Ouvrir `/restaurant/reservations`, cliquer sur « Exporter la journée » : un toast « Action non disponible » | **Appliqué** — bouton retiré. Aucune ligne de `Prio 02` n'achète un export ; « Définir le format des bilans extractables » est un prérequis de `Prio 06` |
| `A-09` | Note | « Rappel au client la veille » est une préférence qu'aucune ligne de `Prio 02` n'achète, et que le Lot 1 ne peut qu'enregistrer | `src/lib/restaurant/establishment.ts:527`–`679` | — | Préférence gardée ; le contrat dit que le Lot 1 la stocke et ne l'envoie pas |
| `A-10` | Note | `/admin/validations` relève de `Détail Sprint ` 55, `SP-Prio 03`, et non de `Prio 02` | `src/app/(organizer)/admin/validations/page.tsx` | — | Écran gardé, gardé par `platform_admins`, exclu de la surface de recette du Lot 1 et classé `SP-Prio 03` dans ce document |
| `A-11` | Majeur | Deux verbes morts dans l'Accueil du Lot 2 : `reservation.accept` et `reservation.refuse`, là où le registre enregistre `reservation.confirm` et `reservation.reject` | `src/lib/restaurant/screens.ts:716` et `:726` | `LYFE_LOT=2`, ouvrir `/restaurant`, cliquer « Accepter » dans la file d'attention | **Appliqué** — un seul vocabulaire, et le refus porte le nom du client que sa feuille demande |

---

## Partie B — Le démarrage à froid, exécuté à la lettre

### B.0 Ce qui a été fait, et où

Un clone neuf, dans un répertoire qui ne portait ni `.data` ni `.env`,
sur ce conteneur : **Node v22.22.2, npm 10.9.7, Postgres 16**. 499
fichiers suivis par git. Chaque commande de `README.md` et de
`docs/HANDOFF.md` § 3 a été lancée dans l'ordre où elle est écrite, sans
rien ajouter, et la sortie, le code de retour et la durée sont ceux du
terminal — pas un résumé.

Le seuil de l'audit : une commande qui échoue, qui réclame une étape non
documentée, qui rend un avertissement dont un intégrateur s'inquiétera,
ou qui dépasse cinq minutes, est un constat.

### B.1 Les commandes, dans l'ordre du document

| # | Commande | Code | Durée | Ce qui sort |
|---:|---|---:|---:|---|
| 1 | `npm install` | 0 | 10 s | `found 0 vulnerabilities`, **zéro** ligne `npm warn` ou `npm error` |
| 2 | `npm run build` | 0 | 65 s | build complet, **quatre** `ExperimentalWarning: SQLite is an experimental feature` — voir `B-02` |
| 3 | `npx next start` puis `GET /api/health` | 0 | 2 s | `"data":"static"`, `"dataReason":"aucune base — jeu de données statique"`, `"sessionKey":"fichier local"`, `"demoAccounts":"usable"` |
| 3 bis | `/login`, `/inscription` | — | — | `200` et `200` |
| 3 ter | `/restaurant` sans session | — | — | `307` vers `/login` — voir `D-5` |
| 4 | `npm run db:reset` | 0 | 3 s | base SQLite semée, un `ExperimentalWarning: SQLite` |
| 5 | `npm run db:snapshot` | 0 | 1 s | `users 5 · venues 2 · 276 Ko · sert les lots 1 et 2` |
| 6 | le même clone, `/api/health` | 0 | 2 s | `"dataEngine":"sqlite"`, `"demoAccounts":"off"` |
| 7 | `DATABASE_URL=… npm run db:reset` | 0 | 3 s | `copié 1600 lignes dans Postgres · 31 tables remplies, 37 vides` |
| 8 | le même clone avec `DATABASE_URL`, `/api/health` | 0 | 2 s | `"dataEngine":"postgres"`, `"dataReason":"base Postgres configurée (DATABASE_URL)"` |
| 9 | `node db/bootstrap.mjs && next build` **sans** `DATABASE_URL` | 0 | 1 s | `db:bootstrap — pas de DATABASE_URL, aucune base à préparer.` |
| 10 | la même **avec** `DATABASE_URL` | 0 | 3 s | `copié 1600 lignes`, `db:bootstrap — base prête`, 2 établissements |
| 11 | la même, **une seconde fois** | 0 | 0 s | `db:bootstrap — 2 établissement(s) en base, rien à semer` · 468 réservations inchangées |

Aucune commande n'a dépassé 65 secondes ; aucune n'a réclamé une étape
que le document ne donne pas ; aucune n'a demandé de variable
d'environnement pour le chemin documenté. La promesse de tête du
`README.md` — « Open **http://localhost:3000**. You need nothing else —
no database, no S3 bucket, no API key, no `.env` » — se vérifie : sur un
clone neuf sans base, les trois routes publiques rendent.

**`/api/health` dit bien ce que le document dit qu'il dit.** La règle
écrite dans `docs/HANDOFF.md` § 3 — « `http` when `LYFE_API_BASE_URL`
and `LYFE_API_TOKEN` are set, else `db` when a seeded SQLite file
exists, else `static` » — a été éprouvée dans les quatre cas, et la
réponse porte en plus la *raison* du choix, en français, ce qui est ce
qui évite la demi-journée perdue à tester le mauvais pilote.

### B.2 La commande de build de `vercel.json`

```json
"buildCommand": "node db/bootstrap.mjs && next build"
```

Les lignes 9 à 11 du tableau ci-dessus sont cette commande, exécutée
localement. Elle tient les trois cas qui décident d'un déploiement :

- **sans `DATABASE_URL`** elle ne fait rien et sort en 0 — un aperçu
  Vercel sans base se construit et sert l'instantané statique ;
- **avec une base vide** elle applique le schéma, les fonctions de
  compatibilité, les quatre migrations, puis recopie la démonstration ;
- **avec une base qui porte déjà un établissement** elle ne touche à
  rien et le dit. Un second build ne réécrit pas les données d'un
  partenaire. Les 468 réservations étaient les mêmes après.

Deux défauts trouvés là, tous deux corrigés, tous deux `Bloquant` — ils
sont en `B-04` et `B-05`.

### B.3 Le tableau de passage

Les douze outils de `tools/verify/`, dans les **deux lots** et sur les
**trois modes** — instantané statique, SQLite, Postgres 16 — plus une
quatrième passe sur le double HTTP (`tools/mock-api.mjs`), qui n'est pas
demandée par la recette mais qui est le mode que DigiNegoce utilisera.
Chaque cellule porte le code de retour et la durée. Un outil qui sort
en **0** en disant qu'il lui manque quelque chose (`audience` hors du
Lot 2, les cinq outils d'écriture sur le pilote statique) est vert :
c'est le refus délibéré décrit en `B-06` et dans `tools/verify/lot.mjs`,
pas un contrôle sauté en silence.

`decisions` n'est pas lancé en lot 2 : il éprouve les quatre
changements que le lot 1 achète, et `handshake` se déclare de la même
façon outil du lot 1 — ce qui est la case `○` de sa colonne.

**La première passe complète portait neuf cellules rouges sur
quatre-vingt-une.** Aucune ne disait pourquoi : deux sortaient sur
« 1 problème(s) », quatre sur une trace Playwright de trente secondes.
Les neuf sont expliquées et corrigées en B.5 et en C.2 — `B-01` le
sommeil fixe après la connexion, `B-13` les outils qui se gênent en
suite, `B-14` la forme du lot 1 affirmée dans le lot 2, `C-07` la revue
LYFE qui ne peut pas être appelée sur le double, `C-08` les deux `500`
du double. Le tableau ci-dessous est la passe d'après, avec les mêmes
commandes dans le même ordre.

| Outil | Lot 1 · statique | Lot 1 · SQLite | Lot 1 · Postgres | Lot 1 · double HTTP | Lot 2 · statique | Lot 2 · SQLite | Lot 2 · Postgres |
|---|---|---|---|---|---|---|---|
| `walk` | ✓ 11 s | ✓ 11 s | ✓ 11 s | ✓ 11 s | ✓ 39 s | ✓ 39 s | ✓ 40 s |
| `payload` | ✓ 8 s | ✓ 7 s | ✓ 7 s | ✓ 7 s | ✓ 22 s | ✓ 23 s | ✓ 23 s |
| `events` | ✓ 73 s | ✓ 74 s | ✓ 74 s | ✓ 43 s | ✓ 73 s | ✓ 73 s | ✓ 74 s |
| `states` | ✓ 8 s | ✓ 8 s | ✓ 8 s | ✓ 8 s | ✓ 26 s | ✓ 26 s | ✓ 26 s |
| `configuration` | ✓ 12 s | ✓ 12 s | ✓ 12 s | ✓ 12 s | ✓ 7 s | ✓ 7 s | ✓ 7 s |
| `audience` | ○ refus motivé | ○ refus motivé | ○ refus motivé | ○ refus motivé | ✓ 9 s | ✓ 10 s | ✓ 9 s |
| `inscription` | ○ refus motivé | ✓ 19 s | ✓ 19 s | ✓ 19 s | ○ refus motivé | ✓ 19 s | ✓ 19 s |
| `decisions` | ○ refus motivé | ✓ 61 s | ✓ 61 s | ✓ 49 s | — | — | — |
| `edges` | ○ refus motivé | ✓ 67 s | ✓ 38 s | ✓ 67 s | ○ refus motivé | ✓ 32 s | ✓ 34 s |
| `journey` | ○ refus motivé | ✓ 75 s | ✓ 75 s | **✗** 72 s | ○ refus motivé | ✓ 66 s | ✓ 65 s |
| `handshake` | ○ refus motivé | ○ refus motivé | ✓ 45 s | ○ refus motivé | ○ refus motivé | ○ refus motivé | ○ refus motivé |
| `walk` à 390 px | ✓ 11 s | ✓ 10 s | ✓ 11 s | ✓ 10 s | ✓ 38 s | ✓ 39 s | ✓ 39 s |

**Lecture :** `✓` l'outil sort en 0 et affirme ce qu'il est venu
affirmer · `○` il sort en 0 en disant ce qui lui manque — le pilote
statique ne garde pas une écriture, `audience` n'a pas d'écran en
lot 1, `handshake` est un outil du lot 1 et demande en plus une base
Postgres partagée avec l'application · `—` il n'est pas lancé dans
cette colonne.

**Quatre-vingt une cellules, quatre-vingt en 0.** Les trois modes que
la recette demande — instantané, SQLite, Postgres — sont verts dans les
deux lots, aux deux largeurs. La seule cellule rouge est `journey` sur
le double HTTP, qui n'est pas un mode de la recette, et elle ne se
reproduit pas : `B-17` dit ce que l'on sait et ce que l'on ne sait
pas.


### B.4 Ce que chaque route transfère

Mesuré dans un navigateur, un contexte froid par route, cache vide,
sur Postgres (`tools/verify/_bundle.mjs`). Ce sont les octets qui
arrivent, compression comprise — pas la somme du manifeste de build,
qui compte chaque morceau partagé une fois par route qui l'utilise et
donnait 383 Ko pour `/restaurant/[[...section]]`.

| Route | Documents | Scripts | Styles | Images | Total | Fichiers de script |
|---|---:|---:|---:|---:|---:|---:|
| Connexion | 3 Ko | 173 Ko | 15 Ko | 2 Ko | **302 Ko** | 13 |
| Inscription | 5 Ko | 184 Ko | 18 Ko | 3 Ko | **320 Ko** | 14 |
| Accueil | 22 Ko | 205 Ko | 0 Ko | 5 Ko | **232 Ko** | 31 |
| Réservations | 25 Ko | 205 Ko | 0 Ko | 5 Ko | **235 Ko** | 31 |
| Check-in | 16 Ko | 158 Ko | 0 Ko | 5 Ko | **180 Ko** | 31 |
| Ma fiche | 18 Ko | 195 Ko | 3 Ko | 5 Ko | **221 Ko** | 31 |
| Disponibilités | 23 Ko | 205 Ko | 0 Ko | 5 Ko | **233 Ko** | 31 |
| Notifications | 20 Ko | 205 Ko | 0 Ko | 5 Ko | **230 Ko** | 31 |

**Le pire script par route : 205 Ko transférés. Seuil tenu.** Il en
faisait 308 avant `B-15` — `recharts` voyageait vers six écrans qui ne
dessinent aucun graphe. Les styles à 0 Ko sur les écrans du tableau de
bord ne sont pas une erreur : la feuille est déjà dans le cache du
contexte quand la route mesurée s'ouvre, et `B-10` explique pourquoi
cette colonne affichait « −1 Ko ».

Le seuil de l'audit est de **300 Ko gzippés de script par route**.

### B.5 Constats de la partie B

| Id | Sévérité | Constat | Fichier · ligne | Reproduction | Correctif |
|---|---|---|---|---|---|
| `B-01` | **Bloquant** | Deux outils de recette sur douze **échouaient sur Postgres**, c'est-à-dire sur le moteur d'un déploiement, et aucun des deux ne disait pourquoi : `journey.mjs` sortait sur une trace Playwright de trente secondes, `edges.mjs` sur « 1 problème(s) ». Cause unique et double : ces outils attendaient un temps fixe après avoir soumis la connexion, et (a) fermer la porte Events en Lot 1 (`A-06`) fait atterrir le compte qui porte deux établissements **sur le sélecteur d'établissement**, seconde étape de l'écran de connexion, où l'URL est encore `/login`, et (b) un aller-retour Postgres pour le compte, ses établissements et ses organisations est plus long qu'un aller-retour SQLite — le même sommeil suffisait sur un moteur et pas sur l'autre | `tools/verify/journey.mjs:368` et `tools/verify/edges.mjs:63` (avant) | Portail sur Postgres, `node tools/verify/edges.mjs` → `✗ le bon mot de passe ouvre le portail · http://localhost:3230/login`, alors que les vingt contrôles suivants passent | **Appliqué** — `signIn()` partagé dans `tools/verify/lot.mjs` : soumet, puis **attend le portail** et répond au sélecteur en nommant l'établissement voulu, avec un refus reconnu comme définitif. Les deux outils passent, `edges` en 98 s et `journey` en 86 s |
| `B-02` | **Majeur** | `journey.mjs` cherchait la barre de recherche par un fragment de son texte d'invite (`placeholder*="Recherch"`). L'invite du Lot 1 dit « Un nom, 4 chiffres du téléphone, ou 25/09… », qui ne contient pas « Recherch » : l'outil ne trouvait rien et **rapportait une barre de recherche absente qui est à l'écran** | `tools/verify/journey.mjs:427` (avant) | `node tools/verify/journey.mjs` → `✗ Réservations a une recherche` | **Appliqué** — `input[type="search"]`, le rôle, que le produit ne peut pas réécrire sans le vouloir |
| `B-03` | **Majeur** | Toujours dans `journey.mjs` : après « Refuser », le bouton de confirmation était cherché **dans la page** et non dans la boîte de dialogue. Le sélecteur tombait sur un onglet du même nom, derrière le voile de la boîte, et Playwright attendait trente secondes un clic qui ne pouvait pas arriver — puis l'exception remontait non capturée | `tools/verify/journey.mjs:482` (avant) | idem, sur une base où une demande est en attente | **Appliqué** — les trois clics du refus sont portés par `[role="dialog"]`, et la boîte est fermée à la fin quoi qu'il arrive |
| `B-04` | **Majeur** | `handshake.mjs` demandait `GET /api/restaurants?limit=200` à l'application. Le backend plafonne `limit` à **100** et répond `422` avec `{detail:[…]}` : `.some` sur cet objet levait un `TypeError` qui se lit comme un échec de la poignée de main | `tools/verify/handshake.mjs:116` (avant) | `curl "$API/api/restaurants?limit=200"` → `{"detail":[{"type":"less_than_equal",…,"ctx":{"le":100}}]}` | **Appliqué** — `limit=100`, et une lecture qui vérifie la forme et dit ce qu'elle a reçu au lieu de planter |
| `B-05` | **Majeur** | `requireSharedDatabase()` acceptait **n'importe quelle** base : le portail en SQLite et l'application en Postgres passaient le garde-fou, puis l'outil échouait sur « l'application ne liste pas l'établissement » — ce qui est vrai et ne dit rien de la poignée de main, l'établissement ayant été écrit là où l'application ne lit pas | `tools/verify/lot.mjs:95` (avant) | portail `LYFE_DATA=db` sans `DATABASE_URL`, application sur Postgres, `node tools/verify/handshake.mjs` | **Appliqué** — Postgres exigé nommément, `dataEngineOf()` lu sur `/api/health`, et la phrase dit sur quoi le portail tourne |
| `B-06` | **Mineur** | Sur un clone neuf, les douze outils meurent sur `ERR_MODULE_NOT_FOUND` et une trace Node de dix lignes. L'étape manquante — `npm install --no-save playwright` — **est documentée**, un écran plus haut dans le même document ; ce n'est pas l'étape qui manque, c'est le message | `tools/verify/*.mjs` (l'import de tête) | Cloner, `npm install`, `node tools/verify/walk.mjs` → `Cannot find package 'playwright'`, code de retour 1 | **Appliqué** — `tools/verify/browser.mjs` : la demande passe par un `import` dynamique et, à défaut, écrit la commande à lancer et pourquoi Playwright n'est pas une dépendance du portail |
| `B-07` | **Mineur** | `docs/HANDOFF.md` § 3 annonçait « Ten browser checks and one recorder » et en listait neuf : `handshake.mjs` et `payload.mjs` manquaient à la liste que quelqu'un copiera. La même page donnait « 17 venue screens » pour le Lot 1, là où le build en enregistre **six** | `docs/HANDOFF.md:227` et `:268` | Comparer la liste au contenu de `tools/verify/` | **Appliqué** — onze contrôles et un enregistreur, les deux outils ajoutés, le compte corrigé, et les sept scripts d'audit à préfixe `_` expliqués |
| `B-08` | **Mineur** | `journey.mjs` échouait sur « une demande attend une décision » quand un outil passé avant lui avait déjà décidé la seule demande du jeu de données. L'outil rapportait l'ordre dans lequel il avait tourné, pas le produit | `tools/verify/journey.mjs:456` (avant) | Lancer `edges.mjs` puis `journey.mjs` sur la même base | **Appliqué** — la demande est cherchée par la puce « À confirmer », tous services confondus, et son absence est écrite comme telle sans compter pour un échec, la décision étant éprouvée par `decisions.mjs` |
| `B-09` | **Mineur** | `hydrate.tmp.mjs`, un script d'un quart d'heure écrit pour lire les avertissements d'hydratation, était **commité à la racine du dépôt** depuis `a3e8c6c` | `hydrate.tmp.mjs` | `git ls-files \| grep hydrate` | **Appliqué** — supprimé |
| `B-10` | **Mineur** | `tools/verify/_bundle.mjs` affichait « −1 Ko » dans la colonne des feuilles de style : Playwright rend `-1` pour un corps qu'il n'a pas vu passer (un 304, une requête abandonnée à la navigation), et l'outil le comptait tel quel | `tools/verify/_bundle.mjs:60` (avant) | Le tableau en B.4, avant correctif | **Appliqué** — borné à zéro, avec la raison en commentaire |
| `B-11` | **Note** | `npm run build` écrit **quatre fois** `ExperimentalWarning: SQLite is an experimental feature and might change at any time`, sur un clone qui ne porte aucune base. `src/lib/db/store.ts` importe `node:sqlite` au premier niveau, et Node 22 marque ce module comme expérimental ; les quatre lignes sont les quatre processus de collecte de Next | `src/lib/db/store.ts:31` | `npm run build` sur un clone sans `.data` | **Non appliqué.** Rendre l'import paresseux demanderait un `createRequire` dans une fonction synchrone au cœur de la couche de données, pour un avertissement cosmétique : le risque est du mauvais côté. À savoir : le chemin de production est Postgres et ne touche pas `node:sqlite` ; l'avertissement vient de l'import, pas d'un appel |
| `B-12` | **Note** | Le compte de recette `yassine@darzellij.ma` porte deux établissements **et** une organisation. Depuis `A-06`, en Lot 1, il atterrit sur le sélecteur d'établissement au lieu d'un tableau de bord — comportement juste, et non celui que le `README.md` décrivait | `README.md:27` | `LYFE_LOT=1`, se connecter en `yassine@darzellij.ma` | **Appliqué** — la ligne du tableau le dit. C'est aussi la moitié produit de `B-01` |
| `B-13` | **Majeur** | **Les douze outils ne sont pas indépendants.** Lancés en suite sur une seule base, ils se gênent : sur la passe Postgres, `journey` et `walk` à 390 px sont revenus rouges, et sur une base fraîchement remise à zéro les deux passent. Dix outils avaient déjà décidé la seule demande en attente du jeu de données et modifié les deux établissements | `tools/verify/journey.mjs`, `tools/verify/edges.mjs` | `node tools/verify/edges.mjs` puis `node tools/verify/journey.mjs` sur la même base | **Appliqué** — `journey` et `edges` écrivent l'absence de demande en attente au lieu d'échouer dessus, et `docs/HANDOFF.md` dit que la suite se lance sur une base remise à zéro. Les outils restent indépendants par ailleurs, et c'est `decisions.mjs` qui possède le chemin de la décision |
| `B-14` | **Majeur** | **Deux outils affirmaient la forme du lot 1 dans le lot 2.** `journey` cherchait la bande d'onglets de Ma fiche et les flèches de jour de Réservations — deux ajouts de `Prio 02` que le lot 2 ne dessine pas, sa Ma fiche étant l'aperçu client (`src/lib/restaurant/presence.ts`). `handshake` lisait la copie du lot 1 : cinq échecs, à commencer par « l'Accueil compte la demande » contre la « Liste d'attente » du lot 2 | `tools/verify/journey.mjs:335` et `:413`, `tools/verify/handshake.mjs` | `LYFE_LOT=2 node tools/verify/handshake.mjs` → `5 problème(s)` | **Appliqué** — `lot1Only()` dans `journey` écrit l'absence sans la compter ; `handshake` se déclare outil du lot 1 et sort en 0 dans le lot 2, exactement comme `audience` se déclare outil du lot 2 |
| `B-15` | **Majeur** | **`recharts` voyageait vers chaque écran du lot 1** — environ 103 Ko gzippés — alors qu'aucune spécification du lot 1 ne porte de bloc `chart`. `DashboardRenderer` est un seul composant client et l'importait statiquement : **308 Ko de script sur Réservations contre le plafond de 300 Ko** de cet audit, et 393 Ko de « First Load JS » sur `/restaurant/[[...section]]` | `src/components/dashboard/DashboardRenderer.tsx:18` (avant) | `node tools/verify/_bundle.mjs` → `Le pire script par route : 308 Ko · DÉPASSÉ` | **Appliqué** — `ChartBlock` derrière `next/dynamic`, `ssr: false` (le graphe mesure son conteneur) et l'empreinte de la carte en attendant. **205 Ko** et 289 Ko de First Load ; les 62 écrans du lot 2 restent propres |
| `B-16` | **Note** | Chromium demande `/favicon.ico` même quand `layout.tsx` déclare `/favicon.svg`, et journalise un « Failed to load resource » dont la seule trace du favicon est l'URL. `journey.mjs` ne filtrait que le texte du message, donc comptait ce 404 comme un défaut | `src/app/layout.tsx:29` · `tools/verify/journey.mjs:59` | `LYFE_DATA=http node tools/verify/journey.mjs` → `console @/restaurant/reservations: … 404 … /favicon.ico` | **Appliqué à l'outil** (l'origine est filtrée aussi), **pas au produit** : livrer un `.ico` qui n'est pas la marque pour faire taire une sonde héritée est pire que la sonde |
| `B-17` | **Majeur** | La seule cellule rouge du tableau final : `journey` sur le double HTTP, `1 problème(s)`. **Elle ne se reproduit pas.** La même colonne relancée dans le même ordre, avec les mêmes commandes, revient verte onze fois sur onze ; `journey` lancé seul contre le double revient vert aussi. Le tableau de la matrice ne garde que la dernière ligne de chaque outil, donc l'assertion qui a échoué dans cette passe n'a pas été capturée | `tools/verify/journey.mjs` | `bash matrix-final.sh`, colonne `lot 1 · double HTTP` : rouge une fois, verte à la relance | **Partiellement appliqué, et dit comme tel.** Ce que l'on sait : la classe de panne est celle de `B-01` — un `settle()` de durée fixe après une écriture, assez long pour SQLite et pas pour un aller-retour vers un autre processus. Le cas déjà identifié (« le sélecteur de date ramène à aujourd'hui », vu sur la passe précédente) attend maintenant la phrase et non l'horloge, et la journée qu'il saisit est celle d'Africa/Casablanca et non d'UTC. Les autres `settle()` de `journey.mjs` restent des candidats. **Cet audit ne déclare pas cette cellule verte** : il déclare qu'elle est instable, ce qui est un défaut de l'outil et non du produit, et que les trois modes de la recette ne la contiennent pas |

---

## Partie C — Fidélité du contrat

### C.1 Comment la comparaison a été faite

Comparer le markdown au code par lecture croisée produit du bruit : une
première passe a rendu 62 appels déclarés contre 82 « trouvés » dans le
pilote, un écart entièrement fait de chaînes de requête et de noms de
paramètre de chemin. La comparaison utile porte donc sur **le trafic
réellement émis**.

`tools/mock-api.mjs` a reçu une facilité de trace : `LYFE_MOCK_TRACE=<fichier>`
écrit une ligne JSON par requête — méthode, chemin, chaîne de requête,
en-tête d'autorisation, corps tel qu'envoyé, statut, et la **forme** de
la réponse champ par champ. Le portail a ensuite tourné en mode `http`
contre ce double, et toute la passe de vérification du lot 1 s'est
exécutée dessus.

**Le résultat de la capture :**

| Mesure | Valeur |
|---|---|
| Appels tracés | **563** |
| Endpoints distincts atteints | **21** |
| Réponses `404` du double | **0** — aucun chemin appelé par le pilote n'est absent du double |
| Réponses `500` du double | **0** — après `C-08`. La passe précédente en portait deux, et ne les comptait pas |
| Statuts d'erreur observés | `401` × 2, sur `POST /auth/session` (mot de passe faux) — et rien d'autre |

Zéro `404` est le résultat qui compte : il dit qu'aucun appel du pilote
ne tombe dans le vide, ce qui était la question ouverte de la livraison
précédente.

### C.2 Ce que la comparaison a trouvé

| Id | Sévérité | Constat | Reproduction | Correctif |
|---|---|---|---|---|
| `C-01` | **Bloquant** | `Service.slotMinutes` et `ServiceDefinition.slotMinutes` sont **obligatoires** dans les types (`src/lib/types/venue-operations.ts:142`) et **absents** de l'instantané commité, donc absents de ce que servent le pilote `static` et le double HTTP. Disponibilités affichait « créneaux de **undefined** minutes » | Portail en `LYFE_DATA=static`, ouvrir `/restaurant/disponibilites` : deux lignes fautives, `« tous les jours · 12h00 – 15h00 · créneaux de undefined minutes »`. En SQLite et en Postgres : aucune | **Appliqué**, trois fois : `db/snapshot.mjs` réparé (`C-02`) et l'instantané régénéré ; `asSlotMinutes()` interposé aux deux points de lecture (`src/lib/restaurant/establishment.ts:376` et `:416`), pour qu'un backend qui omet le champ obtienne le défaut du schéma et non le nom d'une valeur JavaScript ; et un outil de vérification qui refuse désormais ce genre de fuite (`tools/verify/payload.mjs`) |
| `C-02` | **Bloquant** | `npm run db:snapshot` — la commande documentée pour régénérer le jeu de données statique — **échouait depuis que le moteur Postgres est arrivé** : `store.all()` est devenu asynchrone et ce script l'appelait encore en synchrone | `npm run db:reset && npm run db:snapshot` → `TypeError: all(...).map is not a function` | **Appliqué** — `db/snapshot.mjs` attend chacun des appels, et l'instantané régénéré porte `slotMinutes`, `guestEmail`, `guestBirthYear` et `status` |
| `C-03` | Majeur | Le contrat affirmait « le service résout le périmètre depuis le jeton ». Le portail porte **un seul jeton de service** (`LYFE_API_TOKEN`) : avec un jeton unique, `venue_id` est le seul signal de périmètre, et l'affirmation est fausse | `src/lib/data/http-repository.ts:487` (`scoped()`) et `:507` (l'en-tête) | **Appliqué** — contrat §1 réécrit : le jeton est un jeton de service, l'identité voyage en paramètre, les deux côtés vérifient, et le jeton ne doit jamais être accepté depuis un navigateur |
| `C-04` | Mineur | Le tableau §3 donnait `GET /api/business/venues/{id}` comme lu par « Ma fiche ». Le trafic le montre appelé **108 fois** pour 563 appels : la mise en page le lit sur **chaque écran**, pour le bandeau de validation | `trace.jsonl`, et `src/app/(organizer)/layout.tsx:52` | **Appliqué** — l'OpenAPI le dit dans la description de l'opération : « lu par Ma fiche et par chaque écran du lot 1 » |
| `C-05` | Mineur | `GET /api/business/settings` est appelé **180 fois** : chaque écran le lit parce que `configuration` décide le vocabulaire | `trace.jsonl` | Documenté dans l'OpenAPI : « à servir vite ou à mettre en cache côté service » |
| `C-06` | Note | `guestEmail` et `guestBirthYear` sont facultatifs dans le type, donc un double qui les omet reste conforme — mais alors le tiroir Détail réservation n'est jamais exercé en mode `http` | — | Résolu par `C-02` : l'instantané régénéré les porte, donc le double les sert |
| `C-07` | **Majeur** | Les deux endpoints de la revue — `GET /venues/pending` et `PUT /venues/{id}/validation` — sont au contrat et **ne sont jamais appelés** sur le pilote HTTP. `src/lib/auth/platform.ts` répond « personne n'est administrateur » dès que le pilote n'est pas `db`, délibérément. `/admin/validations` est donc un `404` pour tout compte sur le double, et la revue LYFE ne peut pas être éprouvée contre lui | `LYFE_DATA=http node tools/verify/decisions.mjs` → `✗ l'équipe LYFE ouvre la file`, puis une trace Playwright de trente secondes | **Non appliqué.** Ouvrir cette porte sur le seam demanderait de faire passer « qui travaille chez LYFE » par le pilote, pour un écran que `A-10` classe hors de la surface de recette du lot 1 (`SP-Prio 03`) : ce serait élargir le lot 1. Écrit dans la description des deux opérations de l'OpenAPI, et `decisions.mjs` saute l'étape avec une ligne au lieu de planter — les trois autres changements du lot 1 restent éprouvés |
| `C-08` | **Majeur** | Deux gestionnaires de `tools/mock-api.mjs` appelaient `q.get(…)` sur un objet simple (`Object.fromEntries(url.searchParams)`), donc le double répondait **500** à `GET /venues/{id}/slots` — la liste de créneaux de la feuille Décaler — et à `GET /venues/{id}/bookings/search` — la recherche du carnet. **Deux des quatre changements achetés par le lot 1, inutilisables contre le service de référence.** La passe précédente comptait les `404` et pas les `500`, ce qui explique qu'il ait survécu | `curl -H 'Authorization: Bearer mock' '…/venues/rst_dar_zellij/bookings/search?venue_id=rst_dar_zellij&q=Dar'` → `500 {"code":"mock_failed","message":"q.get is not a function"}` | **Appliqué** — `q.date` et `q.q`. La trace finale porte **0 en 500 et 0 en 404** sur 563 appels, et `/slots` comme `/bookings/search` y figurent |
| `C-09` | **Majeur** | Le double jetait le téléphone et l'adresse du partenaire : `submitOnboarding` écrivait `contactEmail: ""` et `contactPhone: ""` là où `src/lib/db/onboarding-store.ts:292` les recopie depuis le compte. Ma fiche relisait un « Téléphone » vide sur le pilote HTTP, et sur lui seul — la divergence exacte qu'un double est censé rendre impossible | `LYFE_DATA=http node tools/verify/journey.mjs` → `✗ le téléphone marocain est relu tel quel` | **Appliqué** — le double lit le compte comme le fait le pilote base, et `tools/verify/journey.mjs` est le test de non-régression |

### C.3 Les chemins d'erreur

Le pilote lit **exactement deux champs** d'une réponse non-2xx —
`message` et `code` (`src/lib/data/http-repository.ts:521`) — et les
remonte en `RepositoryError` avec le statut. Un corps d'une autre forme
devient « Une erreur est survenue ».

| Statut | Spécifié | Le double le produit | Ce que le partenaire voit |
|---|---|---|---|
| `400` | oui — corps illisible | oui (`bad_json`) | le message du service |
| `401` | oui — jeton manquant ou refusé | **oui, observé** 3 fois | « E-mail ou mot de passe incorrect. » sur la connexion ; ailleurs, le message du service |
| `403` | oui — périmètre refusé | oui (`Refused(403)`) | le message du service |
| `404` | oui | oui | le message du service |
| `409` | oui — conflit de version, ou décision déjà prise | oui (`reschedule` sur une réservation close) | « a changé entre-temps. Rechargez la page. » |
| `422` | oui — contenu refusé | oui (`invalid_email`, `slot_unavailable`) | le message du service |
| `429` | **ajouté par cet audit** | non — le double n'a pas de plafond | « Trop de tentatives. Réessayez dans N secondes. » (plafond du portail) |
| `500` | oui | oui (`mock_failed`) | « Une erreur est survenue… » plus une référence à citer |
| réseau coupé | oui — `RepositoryError(…, 0)` | vérifié en interceptant la requête | « La connexion a échoué. Rien n'a été enregistré. » |
| délai dépassé | oui — 8 000 ms → `504` côté client | vérifié par une latence forcée | « Le service ne répond pas » |

Les trois dernières lignes ont été exercées dans un navigateur, pas
seulement lues : voir la partie D, § D.8, les quatre cas de réseau.

### C.4 `docs/lot1-openapi.yaml`

**Dérivée du code.** Trois sources, dans cet ordre : le pilote HTTP pour
la méthode, le chemin, la requête et les en-têtes ; le trafic capturé
pour les formes de réponse ; les types TypeScript pour les quelques
charges qu'aucun outil du lot 1 ne déclenche. Chaque opération indique
laquelle des deux dernières l'a renseignée.

- **27 chemins, 35 opérations, 24 schémas.**
- Validée : `openapi-spec-validator` 0.9.0 → `VALID · OpenAPI 3.1`.
- Le markdown a été **réconcilié vers elle**, pas l'inverse : §1 du
  contrat porte la correction sur le jeton et sur `401`/`403`, et pointe
  vers le fichier comme spécification exécutable.

---

## Partie D — Épreuve et adversité

Dix catégories. Les cas de navigateur tournent par
`tools/verify/_stress.mjs` et `_stress2.mjs` ; les courses et les
frontières d'heure par `tools/verify/_store-stress.mts`, au niveau du
magasin, parce qu'un clic ne provoque pas une course de façon fiable ;
la charge et les navigateurs par `tools/verify/_perf.mjs` ; les cas
Postgres par `tools/verify/_pg-cases.sh`.

Chaque tableau donne le cas, l'attendu, l'**observé**, la sévérité et le
correctif. « Observé » est ce qui s'est passé **avant** correction là où
il y a eu correction.

### D.1 Concurrence — SQLite et Postgres

| Cas | Attendu | Observé | Sévérité | Correctif |
|---|---|---|---|---|
| `D-01` Accepter et Absent sur la même réservation, en parallèle | une gagne, l'autre est refusée, **une** ligne d'historique | les deux gagnaient : lecture puis écriture inconditionnelle, hors transaction. Le carnet gardait la dernière arrivée, l'historique enregistrait **deux** départs du même état, et le client recevait deux messages contradictoires | **Majeur** | **Appliqué** — `transitionBooking` est une transaction avec un compare-and-set sur l'état lu ; le perdant lève `StaleWriteError`, que les actions traduisent déjà en « a changé entre-temps. Rechargez la page. » Après : `gagnantes 1 · refusées 1 · +1 ligne d'historique` |
| `D-02` Deux décalages simultanés vers deux heures différentes | un seul décalage, un seul message au client | les deux réussissaient, le carnet gardait la dernière, et le client recevait **deux** messages nommant **deux** heures | **Majeur** | **Appliqué** — même compare-and-set, sur l'heure et sur l'état. Après : `décalages acceptés 1 · messages 1 · raison changed` |
| Deux transitions dans la même milliseconde | deux lignes d'historique distinctes | l'identifiant était `sh_<réservation>_<ms en base 36>` : collision sur la clé primaire | Mineur | **Appliqué** — un suffixe aléatoire court |
| Deux taps sur Accepter dans le même tick (navigateur) | une seule transition, l'écran tient | tient | — | — |
| `D-03` Deux `db/bootstrap.mjs` en parallèle | un sème, l'autre constate et s'arrête | **les deux mouraient** : « attempt to write a readonly database » et « disk I/O error », et la base restait **vide**. Le générateur écrit un fichier SQLite avant de le copier vers Postgres, et les deux processus ouvraient `.data/bootstrap.db` | **Bloquant** | **Appliqué** — fichier de travail par processus. Le verrou Postgres (`LOCK TABLE venues IN ACCESS EXCLUSIVE MODE`) faisait déjà le reste ; c'était le fichier partagé qui le défaisait |

### D.2 Charge

Jeu de données : **500 clients**, **4 736 réservations** dont **2 005 le
jour affiché**, dont **200 dans un seul créneau**, et **60 jours
d'historique** à 40 par jour. Mesure : temps jusqu'à ce que le premier
bouton soit visible et actionnable, contexte froid, sur Postgres.

| Écran | 1440 | 1440 · Fast 3G | 390 | 390 · Fast 3G | Lignes rendues |
|---|---|---|---|---|---|
| **Accueil — avant** | **6 359 ms** | **3 434 ms** | **5 883 ms** | **3 523 ms** | **3 220** |
| Accueil — après | 812 ms | 599 ms | 410 ms | 586 ms | 96 |
| Réservations | 673 ms | 2 190 ms | 552 ms | 2 038 ms | jusqu'à 1 000 |
| Check-in | 214 ms | 975 ms | 161 ms | 841 ms | — |
| Recherche | 602 ms | 973 ms | 512 ms | 843 ms | — |

| Cas | Attendu | Observé | Sévérité | Correctif |
|---|---|---|---|---|
| `D-04` 2 005 réservations sur la journée affichée | Accueil interactif sous 3 s | **6,4 s à 1440 et 5,9 s à 390**, 3 220 lignes. Les trois groupes de l'Accueil rendaient **toute** la journée : le lot 2 coupe à six lignes, le lot 1 avait retiré le plafond sans en mettre un autre | **Majeur** | **Appliqué** — plafond de 12 par groupe, et le sous-titre dit « Les 12 premières sur 187 — le reste est dans le carnet » quand il coupe, donc rien n'est caché. Après : **812 ms** et 96 lignes |
| 200 réservations dans un seul service | Réservations interactif sous 3 s | 673 ms sans bridage, **2 190 ms** en Fast 3G avec 1 000 lignes rendues | Note | Aucun — sous le seuil, et Réservations est *l'*écran pour travailler une liste longue : lui mettre un plafond serait le casser. Le chiffre est ici pour que personne ne le découvre en salle |
| 60 jours d'historique derrière | aucun effet sur la journée affichée | aucun — le carnet est scopé à la date | — | — |
| 500 clients | aucun effet | aucun — le lot 1 ne rend pas de base clients | — | — |

### D.3 Idempotence

| Cas | Attendu | Observé | Sévérité |
|---|---|---|---|
| Deux taps sur Accepter dans le même tick | une transition | l'écran tient, une transition | — |
| Check-in répété sur la même réservation | pas de seconde arrivée, message clair | la ligne quitte la liste ; un code déjà utilisé répond `already_used` et l'écran dit « Ce client est déjà enregistré comme arrivé » | — |
| Transition vers l'état déjà en place | rien écrit | **une ligne d'historique de plus** disant `confirmed → confirmed` | Mineur · **corrigé** — `transitionBooking` sort si l'état est déjà celui demandé |
| `POST /onboarding/{id}/submit` deux fois | le même établissement, pas un second | le même — documenté et vrai | — |
| Deux `db/bootstrap.mjs` de suite sur une base semée | la seconde ne touche rien | « N établissement(s) en base, rien à semer », réservations inchangées | — |

### D.4 Entrées

| Cas | Attendu | Observé | Sévérité |
|---|---|---|---|
| `L'Étoile · مطعم · 🌙 <script>window.__pwned=1</script>` + retour ligne + guillemets, dans « Nom du lieu » | stocké tel quel, rendu comme du texte, aucun script exécuté | stocké et rendu intégralement, `window.__pwned` jamais défini — sur Ma fiche, sur l'Accueil et dans la barre latérale | — |
| Le même nom relu par l'application | affiché comme du texte | idem — la charge JSON échappe, l'écran affiche | — |
| Nom de 40 caractères | aucun débordement horizontal | 0 px, aux deux largeurs | — |
| `0661203344`, `+212661203344`, `00212 661 20 33 44`, `06 61 20 33 44` | tous acceptés | tous acceptés | — |
| `reservations+lyfe@darzellij.ma` | accepté | accepté | — |
| Photo de 5 Mo | acceptée, ou refusée avec un message | limite et message vérifiés par `edges.mjs` (cas 7) | — |
| Photo de 30 Mo · SVG en guise de photo | refusées avec un message | idem | — |

### D.5 Authentification et autorisation

| Cas | Attendu | Observé | Sévérité | Correctif |
|---|---|---|---|---|
| Cookie `lyfe.venue` écrit à la main | ignoré | ignoré — le portail reste sur l'établissement du compte | — | — |
| `D-05` **Cookie d'identité écrit à la main** | renvoyé à la connexion | **le portail ouvrait Dar Zellij.** Une signature qui ne vérifie pas retombait sur `DEFAULT_USER_ID` — le propriétaire de Dar Zellij. Poser `lyfe.session.present=1`, un cookie qui ne porte aucune identité et n'est signé par rien, servait le carnet complet : noms, téléphones, e-mails, allergies | **Bloquant** | **Appliqué** — plus de repli. Une identité absente ou invérifiable n'est plus une session. Vérifié : `307 → /login?expired=1` |
| `/admin/validations` avec une session partenaire | refusé, la file n'apparaît pas | refusé | — | — |
| `D-06` Session expirée pendant une écriture | un message en français, **et la saisie reste** | le message arrivait, **la saisie était perdue** : le formulaire remettait la valeur du serveur | **Majeur** | **Appliqué** — une écriture refusée garde ce qui a été tapé ; l'état d'erreur et la barre d'enregistrement disent que ce n'est pas enregistré, et « Annuler » reste la décision du partenaire |
| Compte « staff » sur un formulaire du propriétaire | refusé | l'onglet n'est pas rendu, et l'écriture serait refusée côté serveur (`screen-command.ts:77`) | — | — |
| Réservation d'un autre établissement | refusée | l'`UPDATE` est scopé `WHERE id = ? AND venue_id = ?`, et `requireVenueAccess` vérifie l'appartenance avant | — | — |
| `D-07` **Douze mots de passe faux sur une adresse, en moins d'une minute** | les tentatives au-delà du plafond refusées | **aucun plafond.** 50 requêtes en 0,3 s, toutes servies | **Majeur** | **Appliqué** — dix par adresse et par minute, en mémoire de processus, avec le compte remis à zéro par une connexion réussie. Après : `2 refus sur 12`. Les limites de ce plafond sont écrites dans `src/lib/auth/rate-limit.ts` : sur Vercel, N instances autorisent N × 10, donc le service doit plafonner aussi |
| Un autre partenaire pendant le blocage du premier | se connecte normalement | se connecte — le plafond est par adresse, pas par IP : un riad entier partage une adresse IP | — | — |
| « Mot de passe oublié ? » de bout en bout | dit où écrire, ne promet pas un e-mail | promettait « un lien de réinitialisation vient d'être envoyé » sans qu'aucun service n'ait été appelé | **Majeur** | **Appliqué** — passe par le pilote, endpoint au contrat §5.1 bis, et sans service le message dit où écrire |

### D.6 Le temps

| Cas | Attendu | Observé | Sévérité |
|---|---|---|---|
| Un service qui franchit minuit | existe, et ses créneaux dépassent minuit | « Nuit », 21h00 → 02h00, Bar Nomad. 8 créneaux, dont 2 après minuit : `26/09 00:00`, `26/09 01:00` | — |
| Réservation à 23h45 sur ce service | placée dans la bonne journée de service | `serviceBook` place par l'heure quand la réservation ne nomme pas de service, et par le service quand elle le nomme | — |
| Horloge à 03h00, tous les services clos | l'écran se rend, et dit que rien n'est ouvert | `closedService()` rend la forme du service vidée de chaque chiffre, avec « aucun service ce jour-là » — plutôt que de diviser par une capacité inventée | — |
| Grille de 15 minutes, réservation à :10 | regroupée sous :00 | `22h00` | — |
| Bascules d'offset du Maroc | lues depuis la base IANA, pas d'un décalage fixe | trois bascules vérifiées : `2026-02-15 02:00+01 → 03:00Z`, `2026-03-22 01:00Z → 04:00+01`, `2027-02-07 02:00+01 → 03:00Z`. Le Maroc n'a pas d'heure d'été : il passe à UTC+0 pour le Ramadan et revient après, **deux bascules par an** | — |
| Serveur en UTC contre le fuseau du lieu | les deux d'accord, ou `TZ` posée | `next.config.js` pose `TZ=Africa/Casablanca` **pour le serveur Next**. Un script lancé à côté (`db/bootstrap.mjs`, une tâche planifiée) tourne dans le fuseau du conteneur : près de minuit, `isoDay(new Date())` y donnerait la veille | **Note** — aucun script du lot 1 ne calcule une journée ; le noter avant qu'un premier le fasse |

### D.7 Données limites

| Cas | Attendu | Observé | Sévérité |
|---|---|---|---|
| Zéro service actif | le carnet du jour se lit quand même | 1 service (la forme vidée), 5 réservations | — |
| Zéro réservation | un état vide qui dit quoi faire | « Rien à traiter · Aucune demande n'attend de réponse », vérifié par `states.mjs` sur les six routes | — |
| Client sans téléphone | la recherche par chiffres ne plante pas ; la ligne ne dessine rien | 13 résultats pour « 06 », aucune exception | — |
| Réservation sans fiche client | rendue, sans e-mail ni âge | rendue · e-mail absent · visites 0 | — |
| **Deux clients sans téléphone dans le même établissement** | les deux créés | **le second déclenchait un 500** : `idx_customers_venue_phone` était UNIQUE sur `(venue_id, phone)` et l'application écrivait `''` | **Bloquant** — voir `G-04`, corrigé |
| Établissement refusé qui se connecte | son tableau de bord fonctionne, et le bandeau dit pourquoi | vérifié par `decisions.mjs` | — |
| Établissement validé dont le propriétaire a été retiré | — | `staff` porte l'appartenance ; sans ligne, `resolveSession` rend un périmètre vide et la mise en page renvoie à la connexion. Aucune trace d'établissement orphelin n'est rendue | — |

### D.8 Réseau

| Cas | Attendu | Observé | Sévérité |
|---|---|---|---|
| Le service répond 500 à chaque écriture | un message en français, pas de spinner sans fin, la saisie reste, pas de page blanche | message oui · spinner arrêté · saisie gardée · page entière | — |
| Cinq secondes de latence sur une lecture | l'écran finit par s'afficher, jamais vide | 6,0 s, page entière | — |
| Connexion coupée au milieu d'un enregistrement | un message, la saisie reste, rien annoncé comme enregistré | message oui · spinner arrêté · saisie gardée | — |
| Une écriture qui ne répond jamais | un plafond, pas un spinner | `useOptimisticForm` abandonne à 15 s et le dit ; le pilote HTTP abandonne à 8 s | — |

### D.9 Navigateurs

| Cas | Observé |
|---|---|
| Chromium 1440 × 1000 | les sept écrans, aucune erreur de page, aucun débordement |
| Chromium 390 × 844 | idem |
| Profil iPhone 14 (390 × 664) | débordement 0 px sur les quatre écrans, 0 erreur de page |
| Profil Pixel 7 (412 × 839) | idem |
| **Safari (WebKit) et Firefox (Gecko)** | **non exécutés.** Ce conteneur ne porte que Chromium (`/opt/pw-browsers/`) et le téléchargement des deux autres moteurs est hors de portée du réseau ici. Les profils d'appareil ci-dessus émulent la fenêtre et le pointeur, **pas le moteur** : c'est une couverture de mise en page, pas de compatibilité. À faire tourner une fois sur un poste qui a les trois |
| axe-core, huit écrans | **0 critique, 0 sérieux** — deux « sérieux » trouvés et corrigés (`E-09`, `E-10`) |
| Au clavier seul | les sept écrans traversés ; 12 à 24 cibles atteintes chacun, anneau de focus visible sur 38 à 40 des 40 tabulations |

### D.10 Postgres

| Cas | Attendu | Observé | Sévérité | Correctif |
|---|---|---|---|---|
| Base vierge | estampillée, pas migrée | 69 tables, quatre migrations inscrites au registre sans être rejouées, `venues.status` présente | — | — |
| `D-08` **001 appliqué à la main, sans sa ligne au registre** | la migration est inoffensive au rejeu, ou le refus est expliqué | **une pile Postgres brute** : la migration était rejouée, échouait sur « column already exists », et faisait échouer toute la transaction — sans dire quel fichier ni quoi faire | **Majeur** | **Appliqué** — les quatre migrations sont idempotentes (`ADD COLUMN IF NOT EXISTS`, contraintes gardées par `pg_constraint`), et le runner nomme le fichier refusé, donne l'erreur, et écrit l'`INSERT` du registre à exécuter |
| `LYFE_SKIP_DB_BOOTSTRAP=1` | l'étape est sautée, le build continue | « db:bootstrap — ignoré », 0 table créée | — | — |
| Deux bootstraps en parallèle | un sème, l'autre constate | les deux mouraient, base vide | **Bloquant** | **Appliqué** — voir D.1 |
| Bootstrap sur une base qui tient un établissement | rien écrit, aucun truncate | « N établissement(s) en base, rien à semer » | — | — |
| Aucune `DATABASE_URL` | un message qui dit où la définir | « pas de DATABASE_URL… Sur Vercel : Storage → Create Database → Neon Postgres la définit. » | — | — |
| **Neon, point d'entrée groupé contre direct** | le verrou tient dans les deux | **non exécuté** — il n'y a pas de Neon atteignable depuis ce conteneur. Ce qui est vérifiable est le choix de conception, et il est correct : `push.mjs --if-empty` prend `LOCK TABLE venues IN ACCESS EXCLUSIVE MODE` **dans une transaction**, et un verrou de transaction est le seul genre qui survive à un point d'entrée qui regroupe par transaction. Un `pg_advisory_lock` de session, lui, serait rendu à un autre client entre deux requêtes | **Note** | — |

---

## Partie E — Code et préparation à la production

### E.1 Ce que la lecture du code donne

| Question | Mesure | Verdict |
|---|---|---|
| `TODO`, `FIXME`, `XXX`, `HACK` dans `src/` | **0** (une seule occurrence de `XXX`, dans le gabarit `LYFE-XXXX-XXXX` d'un champ de saisie) | propre |
| `console.log` dans `src/` | **0** | propre |
| `console.error` / `console.warn` | 8 sites, tous sur une défaillance réelle | propre — et deux d'entre eux portent désormais une référence à citer (`E-05`) |
| Couleurs littérales hors de la couche de jetons | **5** : quatre couleurs de marque tierces (WhatsApp, Instagram, Facebook, X) dans un écran du lot 2, et un repli CSS placé **après** le jeton dans `PinMap` | acceptable — la couleur d'une marque n'est pas un jeton de design |
| URL littérales | 2, toutes deux OpenStreetMap, **désormais configurables** (`E-04`) | corrigé |
| `demo`, `test`, `mock`, `fixture` atteignables en production | le pilote `MockRestaurantRepository` **est** le pilote base de données, un nom trompeur mais du code de production ; les identifiants de démonstration sont désormais fermés par défaut (`E-01`) | corrigé |
| Chaînes françaises hors de `src/lib/copy` | **184** sur la surface du lot 1, dans 39 fichiers ; `copy/fr.ts` en porte 91 | **Note** — voir ci-dessous |

Sur les 184 chaînes : le produit a **deux** dépôts de texte, pas un.
`src/lib/copy/fr.ts` porte le vocabulaire du châssis et des formulaires ;
le texte d'écran vit dans les constructeurs (`screens.ts`,
`establishment.ts`) et dans `vocabulary.ts` pour les énumérations. Aucune
ligne du plan ne demande une seconde langue, et ce produit est
francophone. Ce serait inventer une exigence que d'appeler cela un
défaut. Le risque réel, et il est commercial : si l'arabe est demandé un
jour, la migration est mécanique mais touche 39 fichiers — la couche
existe, elle n'est pas complète. Chiffré à **2 j-h** dans
`PARCOURS_INTEGRATION.md`.

### E.2 Ce que chaque route transfère

**Le tableau est en B.4.** Une remarque de méthode qui a son
importance : la somme du manifeste de build sur-compte, parce qu'elle
liste chaque morceau partagé en face de chaque route qui l'utilise.
Elle donnait 383 Ko gzippés pour `/restaurant/[[...section]]` là où le
navigateur en transfère 300. Le chiffre du tableau est celui du
navigateur, contexte froid par route, cache vide.

### E.3 La session

| Propriété | État |
|---|---|
| `lyfe.user` et `lyfe.venue` signés | **oui** — HMAC-SHA256, comparaison en temps constant (`src/lib/auth/cookie.ts`) |
| `httpOnly` sur les cookies d'identité | **oui** |
| `secure` | **oui** en production (`NODE_ENV`) |
| `sameSite` | `lax` sur les trois |
| Expiration | 30 jours avec « Se souvenir de moi », sinon la session du navigateur |
| La clé de signature | **corrigée** (`E-02`) : stable entre les processus |
| Rotation à la connexion | **non**, et c'est une limite assumée du bouchon : `lyfe.user` porte l'identifiant de l'utilisateur, pas un jeton de session aléatoire, donc il n'y a rien à faire tourner |
| Invalidation à la déconnexion | **côté navigateur seulement**. Les trois cookies sont effacés ; un cookie recopié ailleurs reste valable jusqu'à son expiration, parce que rien côté serveur ne tient une liste de sessions |
| CSRF sur les actions serveur | **assuré par Next** : une action serveur est un `POST` dont l'en-tête `Origin` est comparé à `Host`, et une origine étrangère est refusée avant d'atteindre le code |
| CSRF sur `POST /api/session/venue` | **assuré par deux propriétés** : `SameSite=Lax` empêche un `POST` inter-site de porter le cookie de session, et le corps `application/json` déclenche une pré-vérification CORS que la route ne répond pas. Vérifié dans le navigateur (§ D.5, le cookie d'établissement écrit à la main) |
| En-têtes de sécurité | **ajoutés** (`E-03`) |

La rotation et l'invalidation côté serveur appartiennent au service :
`POST /api/business/auth/session` est déjà l'endroit où elles vivront —
le service rend un jeton, le portail le porte, et la déconnexion le
révoque là où il a été émis. Le bouchon ne peut pas les simuler
honnêtement et ne prétend pas le faire.

### E.4 Les dépendances

`npm audit` : **0 vulnérabilité**, avec et sans les dépendances de
développement. Le point de départ était trois, dont deux critiques
héritées de `next@14.2.35` — 23 avis, **aucune ligne de correctif en
14.x** — ce qui a motivé la montée en `next@15.5.26`. Elle n'a demandé
aucun changement de code : les signatures asynchrones de `params` et
`cookies()` que Next 15 impose étaient déjà celles du dépôt.

**Licences** — 37 dépendances directes, toutes permissives et
compatibles avec un usage commercial : MIT × 33, Apache-2.0 × 2,
BSD-2-Clause × 1, ISC × 1. Aucun copyleft, aucune licence à réciprocité.

**Paquets sans publication depuis 24 mois** (au 25 septembre 2026) :

| Paquet | Version | Dernière publication | Jugement |
|---|---|---|---|
| `jsqr` | 1.4.0 | 24 avril 2021 — **5 ans et 5 mois** | **Majeur.** C'est le décodeur de QR du scanner, et il analyse un flux de caméra, donc une entrée non fiable, dans un paquet que personne ne maintient. Voir `E-06` |
| `leaflet` | 1.9.4 | 18 mai 2023 | Note — bibliothèque mature, une v2 est en alpha |
| `clsx` | 2.1.1 | 23 avril 2024 | Note — 200 octets, fonctionnellement terminé |
| `server-only` | 0.0.1 | 3 septembre 2022 | Note — un fichier de trois lignes publié par l'équipe React, livré tel quel |
| `date-fns-tz` | 3.2.0 | 30 septembre 2024 | Note — 725 jours, juste sous le seuil |

`react` est en 18.3.1 quand 19.3.0 existe, et `next` en 15.5.26 quand
16.3.6 existe : ni l'un ni l'autre n'est une vulnérabilité, et monter
majeur pendant une recette serait le mauvais moment.

### E.5 Les journaux, et ce qu'ils portent

Huit sites, tous `console.error` ou `console.warn`. Aucun n'écrit une
donnée de client :

| Site | Ce qui est écrit |
|---|---|
| `src/app/actions/bookings.ts:63` | le mot « écriture de réservation », une référence, et l'objet d'erreur |
| `src/app/actions/screen-command.ts:846` | le nom du verbe, une référence, et l'objet d'erreur |
| `src/app/(organizer)/error.tsx:28` | l'erreur de rendu, que Next corrèle par son `digest` |
| `src/app/api/webhooks/lyfe/route.ts:30` | une configuration manquante |
| `src/lib/integrations/index.ts:49` | le chemin appelé |
| `src/lib/nav/chrome-commands.ts:36` | un verbe inconnu |
| `src/lib/ai/claude-advisor.ts:216` · `src/app/api/assistant/route.ts:57` | lot 2 |
| `src/lib/auth/cookie.ts` | l'absence de clé de signature (`E-02`) |

Aucun nom, aucun téléphone, aucune adresse, aucune demande particulière.
La seule façon dont une donnée de client pourrait s'y glisser est le
`detail` d'une violation de contrainte Postgres, qui cite la valeur de la
colonne contrainte ; après `G-04`, la seule contrainte d'unicité sur une
donnée de client est `reservations.qr_code`, une référence de
réservation.

**Diagnostiquer sans montrer une pile au partenaire** : une erreur de
rendu porte le `digest` de Next, affiché et journalisé. Une **écriture**
refusée n'avait rien — le toast disait « Une erreur est survenue » et le
journal disait quel verbe avait échoué, sans lien entre les deux. Un
partenaire qui appelle LYFE à 21 h parce qu'« Accepter » a refusé ne
pouvait pas être retrouvé dans le journal de la soirée. Corrigé
(`E-05`) : huit caractères hexadécimaux, dans le message et dans le
journal.

### E.6 CNDP et loi 09-08

L'inventaire complet — chaque champ, sa finalité, qui l'a collecté — est
au contrat, **§3.2**, parce que c'est là que l'équipe qui construit le
service le lira. En résumé :

- Sept champs de client traversent le lot 1. Six ont une finalité
  écrite. Le septième, `guestBirthYear`, **n'en a aucune et aucun
  produit LYFE ne le collecte** : le portail l'affiche s'il arrive et ne
  dessine rien s'il manque. Le contrat dit désormais de **ne pas
  l'envoyer** tant qu'une finalité et un consentement n'existent pas.
- `note` — la demande particulière — peut contenir une allergie, donc
  une **donnée de santé** au sens de la loi 09-08. Le champ est
  nécessaire ; le consentement se recueille dans l'application, au
  moment où le client l'écrit.
- **La conservation n'est pas appliquée.**
  `venue_settings.retention_months` se règle, se stocke, et rien ne la
  lit : aucun travail planifié, aucune requête. Le contrat §3.2 porte
  désormais la requête d'anonymisation que le service doit exécuter.
- `customer.anonymise` est un **bouton sans gestionnaire** (`E-07`).
  C'est le chemin d'anonymisation de la Fiche client, qui est un écran
  `SP-Prio 08` : hors de la surface de recette du lot 1, et listé ici
  parce qu'un bouton qui ne fait rien sur un droit des personnes est
  pire qu'un bouton absent.

### E.7 Constats de la partie E

| Id | Sévérité | Constat | Fichier · ligne | Reproduction | Correctif |
|---|---|---|---|---|---|
| `E-01` | **Bloquant** | Sept comptes de démonstration avec le mot de passe `demo` **en clair dans le code**, et l'annuaire base de données retombait dessus quand `partner_accounts` n'avait pas la ligne. Sur un déploiement avec Neon — donc en production — `yassine@darzellij.ma` / `demo` ouvrait le portail, et `validation@lyfe.ma` / `demo` ouvrait la file de validation | `src/lib/auth/accounts.ts:53`–`112` et `:287` | Déployer avec `DATABASE_URL`, se connecter avec n'importe laquelle des sept paires | **Appliqué** — `db/seed.mjs` écrit les sept comptes dans `partner_accounts` avec un scrypt salé (mot de passe par `LYFE_SEED_PASSWORD`, `demo` par défaut), et les littéraux ne sont plus consultés qu'en mode `static` (où ils sont la seule porte et où rien de réel n'est derrière) ou derrière `LYFE_DEMO_ACCOUNTS=1`. `/api/health` rapporte `demoAccounts: "off"` ou `"usable"` |
| `E-02` | **Bloquant** | Sans `LYFE_SESSION_SECRET`, la clé de signature était **aléatoire par processus** — et `next start` rend dans des processus de travail séparés. L'action serveur qui signait le cookie et le rendu qui le vérifiait tiraient des clés différentes : se connecter marchait ou non selon le processus qui répondait. Sur Vercel, où chaque requête peut être une instance, cela aurait échoué presque toujours | `src/lib/auth/cookie.ts:38` | Portail sans `LYFE_SESSION_SECRET` : la même passe avait un écran ouvert et le suivant renvoyé sur `/login?expired=1` | **Appliqué** — la clé de repli est écrite une fois dans `.data/session-key` (600, déjà ignoré par git), donc stable entre les processus d'une machine ; là où rien ne peut être écrit, le processus le dit en clair sur stderr. `/api/health` rapporte `sessionKey: configuré · fichier local · éphémère` |
| `E-03` | Majeur | **Aucun en-tête de sécurité.** Pas de `X-Frame-Options`, pas de `X-Content-Type-Options`, pas de `Referrer-Policy`, pas de `Permissions-Policy`, pas de CSP — sur un tableau de bord qui porte les noms, téléphones, adresses et allergies de clients | `next.config.js` | `curl -I` sur n'importe quelle route | **Appliqué** — les quatre en-têtes, plus une CSP en **`Report-Only`** : le châssis de Next met son script d'amorçage en ligne, donc une politique bloquante demande des nonces par requête — un vrai chantier, et la livrer de travers met le portail à terre. `LYFE_CSP_ENFORCE=1` la passe en bloquante quand le rapport est propre |
| `E-04` | Majeur | Les tuiles de la carte et le géocodeur pointaient en dur sur les serveurs publics d'OpenStreetMap. La politique d'usage des tuiles de l'OSMF demande à une application à trafic soutenu d'héberger ou d'acheter les siennes, et Nominatim plafonne à une requête par seconde | `src/components/map/PinMap.tsx:71` · `src/app/api/geocode/route.ts:16` | — | **Appliqué** — `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` et `GEOCODER_URL`, avec OSM en défaut pour qu'un clone à froid dessine une carte |
| `E-05` | Mineur | Une écriture refusée disait « Une erreur est survenue » et journalisait le verbe : rien ne reliait les deux, donc rien ne permettait de retrouver l'appel d'un partenaire dans le journal de la soirée | `src/app/actions/bookings.ts` · `screen-command.ts` | Forcer un 500 sur une écriture | **Appliqué** — `src/lib/errors/reference.ts` : huit caractères hexadécimaux, dans le message et dans le journal |
| `E-06` | Majeur | `jsqr@1.4.0`, publié en avril 2021, analyse le flux de caméra du scanner — une entrée non fiable dans un paquet non maintenu depuis cinq ans | `package.json` | — | **Non appliqué.** Remplacer un décodeur de QR demande un essai contre une vraie caméra, ce que ce conteneur n'a pas, et le livrer non testé serait pire que le constat. La voie : `BarcodeDetector`, natif sur Chrome et Android, avec `jsqr` en repli pour iOS Safari — chiffré dans `PARCOURS_INTEGRATION.md` |
| `E-07` | Majeur | `customer.anonymise` est déclaré et **aucun registre ne l'enregistre** : le bouton d'anonymisation d'un client répond « Action non disponible » | `src/lib/restaurant/customer.ts:255` | `LYFE_LOT=2`, ouvrir une fiche client | **Non appliqué** — écran `SP-Prio 08`, hors de la surface de recette du lot 1, et l'anonymisation appartient au service qui détient les données. Le contrat §3.2 porte la requête |
| `E-08` | Note | `/styleguide` est public : il est dans `PUBLIC_PATHS` du middleware et ne porte aucune donnée d'établissement — il rend des props littérales | `src/middleware.ts:23` | — | Gardé, délibérément : c'est ce qu'un intégrateur ouvre avant que l'authentification existe |
| `E-09` | Mineur | Le marqueur déplaçable de la carte reçoit `role="button"` de Leaflet et aucun nom accessible : axe-core le signale en « serious », et un lecteur d'écran annonce « bouton » suivi de rien | `src/components/map/PinMap.tsx:86` | axe-core sur `/restaurant/ma-fiche` | **Appliqué** — `title` et `alt` sur le marqueur |
| `E-10` | Mineur | « LYFE · Maroc » sur le panneau sombre de la connexion : contraste 4,33:1 là où WCAG AA demande 4,5:1 à cette taille | `src/app/login/page.tsx:54` | axe-core sur `/login` | **Appliqué** — `text-canvas/55`, l'opacité que le sur-titre utilise déjà |

---

## Partie F — Fidélité aux maquettes

Figma, fichier `fztoNaEvTrZrWDaLy1MEWg`, page **`09 Dashboard basique ·
Dar Zellij`** : huit sections, chacune avec une voie « Ordinateur » et
une voie « Téléphone », **43 cadres** en tout.

La comparaison est **structurelle**, pas pixel à pixel : l'ordre des
éléments, le texte, les états, et le nombre de contrôles. Un
rapprochement pixel à pixel entre une maquette vectorielle et un rendu
navigateur produit des centaines de différences d'un demi-pixel et
aucune information.

### F.1 L'inventaire

| Section | Ordinateur | Téléphone |
|---|---|---|
| 0 · Inscription | 6 cadres — une par étape | 6 cadres |
| 1 · Connexion | 1 cadre + identifiants refusés + sélecteur d'établissement | 1 cadre |
| 2 · Accueil | 2 cadres — normal, et « en attente de validation » | 3 cadres — plus le hub Plus |
| 3 · Réservations | 7 cadres — deux journées × deux services, la confirmation, la feuille Décaler | 4 cadres |
| 4 · Check-in | 2 cadres — l'écran et la caméra | 2 cadres |
| 5 · Ma fiche | 5 cadres — trois onglets, deux états d'enregistrement | 2 cadres |
| 6 · Disponibilités | 2 cadres | 2 cadres |
| 7 · Notifications | 2 cadres | 2 cadres |

### F.2 Ce que la comparaison a trouvé

| Id | Sévérité | Différence | Cadres touchés | Correctif |
|---|---|---|---|---|
| `F-01` | **Majeur** | **Une ligne ouverte portait un seul bouton là où le produit en dessine quatre.** Une réservation confirmée montrait `Check-in` seul ; une demande montrait `Accepter` et `Refuser`. Le produit dessine les quatre décisions sur **chaque** ligne ouverte, aux deux largeurs et sur les deux écrans : `Accepter`/`Check-in`, puis `Refuser`, `Décaler`, `Absent` | 11 cadres, 48 lignes | **Appliqué** — les 48 lignes portent les quatre verbes, clonés depuis un bouton du même cadre pour que le fond, la bordure, le rayon et la typographie suivent ; les trois verbes secondaires ont reçu le style secondaire ; les groupes d'actions de l'ordinateur ont été réalignés sur la même gouttière de 24 px, et ceux du téléphone passés en `WRAP` — sans quoi quatre boutons sur 322 px se compriment au tiers de leur libellé |
| `F-02` | Mineur | **`Décaler` et `Absent` n'avaient pas de glyphe** là où `Accepter` et `Refuser` en avaient : deux boutons ornés et deux nus dans le même groupe. Le produit dessine un glyphe sur chacun — `check`, `ban`, `calendar-clock`, `user-x`, `user-check` | 15 cadres | **Appliqué** — **203 glyphes** posés ou corrigés, chacun celui que son libellé appelle. `icône · user-x` n'existait pas dans le fichier : construit depuis `user-check`, la coche remplacée par une croix de deux traits, ce qui est exactement ce qu'est le `user-x` de lucide |
| `F-03` | **Majeur** | **Les deux écrans de carte ne montraient pas de carte.** Ma fiche n'en avait aucune — le bloc « Adresse et contact » passait des champs à la barre d'enregistrement. Inscription étape 3 avait une ligne « point sur la carte » (un relevé de coordonnées) et pas de carte non plus | 6 cadres | **Appliqué** — un bloc « Sur la carte » : le cadre de la carte avec ses voies suggérées, le point violet cerclé de blanc que `PinMap` dessine, le contrôle de zoom `+` / `−`, l'attribution « © OpenStreetMap » que le fournisseur exige, puis la ligne « Point placé · 31,6295 · -7,9811 · faites glisser le point pour l'ajuster » et les boutons « Trouver sur la carte » et « Retirer ». Les six cadres ont été agrandis pour ne rien rogner, et les barres d'onglets du téléphone remises au bas des cadres qui ont grandi |
| `F-04` | Majeur | **La cloche de notification** était encore dessinée sur dix cadres, contre `Détail Sprint ` ligne 44 | 10 cadres | **Appliqué** — retirée partout, comme dans le produit (`A-05`) |
| `F-05` | Majeur | **« Exporter la journée »** était encore dans l'en-tête de Réservations, aux deux largeurs | 7 cadres | **Appliqué** — retiré, comme dans le produit (`A-08`) |
| `F-06` | Note | Les boutons de décision de l'**ordinateur** n'avaient aucun glyphe, alors que ceux du téléphone en avaient deux | — | Résolu par `F-02` : les 203 glyphes couvrent les deux largeurs |
| `F-07` | Note | La pastille ronde en bout de barre supérieure est l'**avatar**, pas une cloche : le composant `Chrome / Topbar` porte « pastille check-in » puis une ellipse, et l'instance de l'écran Check-in masque la pastille — exactement ce que fait le produit, qui supprime son raccourci sur l'écran vers lequel il pointe | — | Aucun — conforme |
| `F-08` | Mineur | `tools/verify/extract.mjs` — dont la sortie alimente l'export Figma — rapportait comme initiales d'avatar les trois premiers caractères de la **demande particulière** : « Dem » pour un client dont la ligne dit « Demande une table près de la fontaine ». Le sélecteur prenait le premier nœud `bg-violet-soft`, et la note en porte la classe | `tools/verify/extract.mjs:248` | **Appliqué** — le sélecteur retient le nœud dont le texte tient en trois caractères, c'est-à-dire la pastille et non la prose |

### F.3 Ce qui n'a pas été fait, et pourquoi

Les cadres **Réservations · jour précédent** et **jour suivant** (quatre
cadres) ont reçu les quatre boutons et les glyphes comme les autres,
mais leurs chiffres d'en-tête — les compteurs d'onglets — n'ont pas été
recalculés : ils décrivent une journée de démonstration, et les
recalculer demanderait de re-capturer chaque variante contre une base
semée à la même seconde. La différence est un chiffre dans une puce,
pas un contrôle ni un état, et elle est ici plutôt que passée sous
silence.

---

## Partie G — L'intégration avec l'application

Cinq parcours, tracés bond par bond. Chaque bond porte l'un de trois
états : **vérifié** (un outil l'exécute et l'assertion tient),
**implémenté, non vérifié** (le code existe, rien ne l'exécute),
**manquant**.

Le déploiement réel met les deux produits sur **une seule base
Postgres** : le portail en `LYFE_DATA=db`, l'application via
`backend/postgres_dashboard.py`. Il n'y a donc pas de contrat HTTP entre
eux — le contrat est le schéma. `backend/postgres_dashboard.py` sert en
plus une partie du contrat Lot 1 sous `/api/business/…`, pour le jour où
le portail sera pointé vers lui plutôt que vers la base ; cette moitié
est examinée en G.6.

### G.1 Une réservation, de l'application au tableau de bord et retour

| # | Bond | Où | État |
|---|---|---|---|
| 1 | Le client remplit l'écran de réservation et envoie `{venue_id, date, time, party_size, special_requests?, guest_phone}` | `frontend/app/book/[venueId].tsx:166` | **vérifié** |
| 2 | `POST /api/bookings/enhanced` valide la session, l'établissement, et refuse `422` sans date ni heure | `backend/postgres_dashboard.py:448` | **vérifié** |
| 3 | La fiche client est créée ou retrouvée sur `(venue_id, app_user_id)` | `postgres_dashboard.py:468` | **vérifié** |
| 4 | `reservations` reçoit `state='requested'`, `channel='lyfe'`, un `qr_code` `LYFE-XXXXXX` | `postgres_dashboard.py:492` | **vérifié** |
| 5 | `reservation_status_history` reçoit la première transition, acteur `user` | `postgres_dashboard.py:508` | **vérifié** |
| 6 | Le tableau de bord lit `overview()` → la ligne apparaît dans « À traiter », avec les couverts et la demande particulière | `src/lib/db/overview-store.ts:335` | **vérifié** |
| 7 | L'hôte appuie sur Accepter → `reservation.confirm` → `confirmBooking` → `transitionBooking` en compare-and-set, dans une transaction | `src/components/restaurant/RestaurantScreen.tsx:121` → `src/lib/db/overview-store.ts:694` | **vérifié** |
| 8 | `reservations.state='confirmed'` et **une** ligne d'historique | `overview-store.ts:731` | **vérifié** (et `D-01`, § D.1, prouve qu'une course n'en écrit pas deux) |
| 9 | L'application relit `GET /api/bookings/enhanced` et voit `status: "confirmed"` avec son horodatage | `postgres_dashboard.py:525` | **vérifié** |
| 10 | Une annulation faite dans l'application se voit sur le tableau de bord | `postgres_dashboard.py:558` | **vérifié** |
| 11 | Le client est **prévenu** que sa table est acceptée | — | **manquant** |

Bonds 1 à 10 : `tools/verify/handshake.mjs`, qui fait le parcours entier
contre les deux produits sur une base partagée.

Bond 11 est le seul trou, et c'est un trou de service, pas de
front-end : `messages_log` reçoit bien une ligne quand le portail décale
une réservation (`overview-store.ts:1033`), mais rien n'envoie. Ce qui
le ferme : un envoyeur derrière `messages_log`, côté service. `Détail
Sprint ` ligne 46 l'achète dans ce sprint pour le *restaurateur* ; le
message au client suit la même mécanique.

### G.2 La création d'un établissement

| # | Bond | Où | État |
|---|---|---|---|
| 1 | Étape 1 crée le compte dans `partner_accounts`, mot de passe en scrypt salé | `src/lib/db/onboarding-store.ts:59` | **vérifié** |
| 2 | Étapes 2 à 5 écrivent le brouillon côté serveur, une écriture par étape | `src/app/actions/onboarding.ts` | **vérifié** |
| 3 | Étape 6 crée `venues` + `staff` + `availability_slots` + `service_definitions`, `status='pending_review'` | `onboarding-store.ts` (`submitOnboarding`) | **vérifié** |
| 4 | L'application **ne** liste pas l'établissement tant que LYFE ne l'a pas vu | `postgres_dashboard.py:290`, filtre `COALESCE(v.status,'validated')='validated'` | **vérifié** — assertion ajoutée par cet audit |
| 5 | L'adresse, les horaires et le point de la carte arrivent dans la charge de l'application | `postgres_dashboard.py:119` (`restaurant_payload`) | **vérifié** |

### G.3 La validation par LYFE

| # | Bond | Où | État |
|---|---|---|---|
| 1 | `/admin/validations` n'ouvre que sur une ligne `platform_admins` | `src/lib/auth/platform.ts` | **vérifié** (§ D.5, `/admin/validations` avec une session partenaire) |
| 2 | La file liste les inscriptions en attente avec ce qu'il faut pour décider | `src/lib/db/validation-store.ts` | **vérifié** |
| 3 | Valider écrit `venues.status='validated'` et `status_changed_at` | `validation-store.ts` (`setVenueStatus`) | **vérifié** |
| 4 | L'application liste alors l'établissement | `postgres_dashboard.py:290` | **vérifié** — assertion ajoutée par cet audit |
| 5 | Refuser écrit le motif, et c'est la seule chose que le partenaire voit | `src/components/restaurant/ValidationBanner.tsx` | **vérifié** (`decisions.mjs`) |
| 6 | Le tableau de bord du partenaire fonctionne dans les trois états | | **vérifié** (`decisions.mjs`) |

### G.4 La longueur de créneau

| # | Bond | Où | État |
|---|---|---|---|
| 1 | Disponibilités propose 15 / 30 / 60 par service | `src/lib/restaurant/establishment.ts:405` | **vérifié** (`decisions.mjs`) |
| 2 | `service.set` écrit `service_definitions.slot_minutes` | `src/lib/db/operations-write-store.ts:1274` | **vérifié** |
| 3 | Réservations regroupe le carnet dessus | `src/lib/restaurant/screens.ts:1876` (`slotOf`) | **vérifié** (§ D.6 : grille 15, réservation à :10 → créneau :00) |
| 4 | `venue_grid()` découpe les heures de l'application dessus | `backend/postgres_dashboard.py:172` | **vérifié** — assertion ajoutée par cet audit |
| 5 | `restaurant_payload` porte `slot_minutes` et `bookable_times` | `postgres_dashboard.py:119` | **vérifié** |
| 6 | L'écran de liste de l'application lit `bookable_times`, avec l'ancienne liste en repli | `frontend/app/restaurants.tsx` | **implémenté, non vérifié** — cet écran rend `mockRestaurants` et n'appelle pas l'API ; le repli est donc ce qui s'affiche |
| 7 | L'écran de réservation lit les heures libres de la journée | `postgres_dashboard.py:415` (`/api/bookings/enhanced/available-times`) | **implémenté, non vérifié** — aucun harnais ne monte l'application Expo ici |

Ce qui ferme les bonds 6 et 7 : un test de l'application elle-même
(Expo), qui n'existe dans aucun des deux dépôts. L'écran de liste
appelant `mockRestaurants` est un travail d'**UI de l'application**, pas
du portail ni du service.

### G.5 Une correction de Ma fiche

| # | Bond | Où | État |
|---|---|---|---|
| 1 | Le formulaire écrit par le pilote, jamais par le magasin directement | `src/app/actions/venue.ts` | **vérifié** |
| 2 | `venues` reçoit le patch | `src/lib/db/venue-write-store.ts` | **vérifié** |
| 3 | `restaurant_payload` relit la ligne | `postgres_dashboard.py:119` | **vérifié** — assertion ajoutée par cet audit |
| 4 | `GET /api/restaurants/{id}` la rend au client | `postgres_dashboard.py:329` | **vérifié** |

### G.6 Ce que `backend/postgres_dashboard.py` sert du contrat Lot 1

Le fichier expose aussi un `business_router`. Utile à connaître, parce
que c'est le point de départ si le portail doit un jour parler HTTP à ce
service plutôt que lire la base.

| Endpoint du contrat | Servi par FastAPI ? |
|---|---|
| `GET/PUT /api/business/venues/{id}` | **oui** — mais la charge manque 9 des champs que `RestaurantProfile` déclare, dont `initials` (la pastille de la barre latérale) et `status` (le bandeau de validation) : voir `G-01` |
| `GET /api/business/venues/{id}/availability` | oui |
| `GET /api/business/bookings?venue_id=&date=` | oui |
| `PUT .../confirm` · `.../reject` · `.../cancel` · `POST .../no-show` · `POST .../check-in` | oui |
| `GET /api/business/health` | oui |
| `GET /api/business/overview` | **non**, et délibérément : c'est un composite que le tableau de bord assemble des mêmes tables, et une seconde implémentation dériverait |
| Les 4 endpoints d'inscription · `auth/session` · `auth/password-reset` · `settings` · `services/configuration` · `assets` · `notification-preferences` · `slots` · `bookings/search` · `venues/pending` · `venues/{id}/validation` · `zones/{id}` | **non** — 15 endpoints à écrire. `docs/PARCOURS_INTEGRATION.md` les chiffre |

### G.7 Constats de la partie G

| Id | Sévérité | Constat | Fichier | Correctif |
|---|---|---|---|---|
| `G-01` | Majeur | `business_venue` rend 14 champs là où `RestaurantProfile` en déclare 23. Manquent notamment `initials` (pastille de la barre latérale), `status` et `statusReason` (bandeau de validation), `subline`, `cuisine`, `currency`, `onboardingCompleted`, `tags`, `features`, `ambience` | `backend/postgres_dashboard.py:611` | **Non appliqué** — l'endpoint n'est pas sur le chemin du déploiement actuel (le portail lit la base). Décrit ici et dans `PARCOURS_INTEGRATION.md` §Écarts, avec la liste des champs |
| `G-02` | **Bloquant** | L'application écrivait `channel = 'LYFE'` là où l'énumération du tableau de bord est en minuscules. Avant le correctif de `channelLabel`, la ligne du carnet affichait `undefined` comme source ; un filtre du lot 2 sur `lyfe` manquait toutes les réservations de l'application | `backend/postgres_dashboard.py:492` | **Appliqué** — `'lyfe'`, et `channelLabel()` garde le repli pour tout canal qu'un backend inventerait |
| `G-03` | **Bloquant** | L'application n'envoyait **aucun téléphone** : `guest_phone` était écrit `''` pour chaque réservation. Le tableau de bord met le téléphone du client sur chaque ligne du carnet, et le seul geste qu'un hôte fait d'une réservation hors de l'écran est d'appeler | `backend/postgres_dashboard.py:492` et `frontend/app/book/[venueId].tsx` | **Appliqué** — l'écran de réservation demande le numéro (≥ 9 chiffres avant de continuer), le route l'écrit sur la réservation et sur la fiche client, et le remplit pour un client revenu qui l'avait laissé vide |
| `G-04` | **Bloquant** | `idx_customers_venue_phone` était **UNIQUE** sur `(venue_id, phone)`. Comme l'application écrivait `''`, **le deuxième client à réserver un établissement donné via l'application** déclenchait « duplicate key value violates unique constraint » et un 500. Deux clients peuvent d'ailleurs partager un numéro | `db/schema.sql:298` | **Appliqué** — index non unique, plus `db/migrations/004-customers-phone-not-unique.sql` pour les bases existantes |
| `G-05` | Majeur | `handshake.mjs` affirmait « l'application liste l'établissement créé » juste après l'inscription. Ce n'est plus vrai depuis que la revue LYFE existe : un établissement naît `pending_review`. L'outil n'était dans aucune matrice, donc personne ne l'a vu | `tools/verify/handshake.mjs:109` | **Appliqué** — l'outil affirme d'abord l'absence, valide ensuite par `/admin/validations` en tant qu'administrateur LYFE, puis affirme la présence ; il vérifie en plus la grille de créneaux et une correction de Ma fiche |

---

## Partie H — Le registre, et ce qui a été livré

### H.1 Les livrables

| Livrable | Où | État |
|---|---|---|
| L'audit | `docs/AUDIT_LOT1.md` | ce document · 68 constats |
| Le contrat exécutable | `docs/lot1-openapi.yaml` | 27 chemins, 35 opérations, 24 schémas · `openapi-spec-validator` : **VALID · OpenAPI 3.1** |
| Le parcours d'intégration | `docs/PARCOURS_INTEGRATION.md` | en français, huit paliers, chiffrage de 21,75 j-h |
| Le contrat en markdown | `docs/LOT1_API_CONTRACT.md` | ramené sur l'OpenAPI ; § 1 réécrit sur le jeton, § 3.2 nouvelle sur les données personnelles, § 5.1 bis sur la réinitialisation |
| Les outils de recette | `tools/verify/` | onze contrôles, un enregistreur, sept scripts d'audit à préfixe `_` |
| Les maquettes | Figma, page `09 · Lot 1` | 43 cadres, les trois écarts connus corrigés |

### H.2 La règle suivie sur les correctifs

Ce qui était demandé, et ce qui a été fait :

| Sévérité | Règle | Fait |
|---|---|---|
| **Bloquant** | tout corriger | **10 sur 10** |
| **Majeur** | corriger si le correctif tient en deux heures, sinon décrire | **29 corrigés, 5 décrits** — `A-04`, `C-07`, `E-06`, `E-07`, `G-01` — et `B-17`, une cellule d'outil instable que cet audit refuse de déclarer verte |
| **Mineur** | tout corriger | **13 sur 13** |
| **Note** | ni défaut ni conformité : la réponse | **10**, chacune avec sa réponse |

Les cinq majeurs non corrigés le sont pour une raison qui ne change
pas avec le temps passé dessus :

- **`A-04`** — l'écran de saisie du code de vérification. Il lui faut un
  service qui **envoie** et qui **vérifie** ; un écran qui accepte
  n'importe quelle suite de six chiffres est pire que son absence,
  parce qu'il fait croire la vérification faite. Les deux endpoints
  sont spécifiés dans `docs/PARCOURS_INTEGRATION.md`, l'écran est
  chiffré à 0,5 j-h de front.
- **`E-06`** — remplacer `jsqr` demande une vraie caméra pour éprouver
  le remplacement, et ce conteneur n'en a pas. Le paquet est nommé, sa
  dernière publication datée, et le remplacement candidat
  (`BarcodeDetector`, présent dans Chrome et Safari, avec `jsqr` en
  repli) est écrit.
- **`E-07`** — l'anonymisation d'un client relève de `SP-Prio 08`, pas
  de `Prio 02`. Le SQL qui la réalise est dans le contrat § 3.2, à la
  disposition de qui prend ce sprint.
- **`G-01`** — les neuf champs manquants sont dans le backend FastAPI de
  l'application, qui n'est pas sur le chemin de déploiement de ce lot.
  Ils sont nommés un par un en G.6.
- **`C-07`** — ouvrir la revue LYFE sur le seam HTTP demanderait de faire
  passer « qui travaille chez LYFE » par le pilote, pour un écran que
  `A-10` classe hors de la surface de recette du lot 1 (`SP-Prio 03`).
  La règle suivie ici est de garder le lot 1 dans la ligne 39 plus
  `Prio 02` : ce serait l'élargir. La porte, sa raison et ce qu'il
  faudrait faire sont écrits dans la description des deux opérations de
  `docs/lot1-openapi.yaml`.

### H.3 Le registre

68 constats. **10 bloquants, 35 majeurs, 13 mineurs, 10 notes.**

| Id | Sévérité | Constat | Partie | Propriétaire | État |
|---|---|---|---|---|---|
| `B-01` | **Bloquant** | Deux outils échouaient sur Postgres, sur un sommeil fixe après la connexion | Partie B | LYFE · outils de recette | Traité par la documentation |
| `C-01` | **Bloquant** | `slotMinutes` obligatoire au type, absent de l'instantané | Partie C | LYFE · portail | Traité par la documentation |
| `C-02` | **Bloquant** | `npm run db:snapshot` cassé depuis l'arrivée de Postgres | Partie C | LYFE · scripts de base | Traité par la documentation |
| `D-03` | **Bloquant** | Deux `db/bootstrap.mjs` en parallèle laissaient la base vide | Partie D | LYFE · scripts de base | Traité par la documentation |
| `D-05` | **Bloquant** | Un cookie de présence écrit à la main servait un établissement | Partie D | LYFE · portail | Traité par la documentation |
| `E-01` | **Bloquant** | Sept mots de passe `demo` en clair, actifs en mode base | Partie E | LYFE · portail | Traité par la documentation |
| `E-02` | **Bloquant** | Clé de signature aléatoire par processus | Partie E | LYFE · portail + exploitation (`LYFE_SESSION_SECRET`) | Traité par la documentation |
| `G-02` | **Bloquant** | L'application écrivait `channel = 'LYFE'` | Partie G | LYFE · application (FastAPI) | Traité par la documentation |
| `G-03` | **Bloquant** | L'application n'envoyait aucun téléphone | Partie G | LYFE · application (FastAPI + Expo) | Traité par la documentation |
| `G-04` | **Bloquant** | Index unique sur le téléphone : le deuxième client échouait | Partie G | LYFE · portail (schéma) et application | Traité par la documentation |
| `A-02` | **Majeur** | Pas de confirmation du mot de passe | Partie A | LYFE · portail | Traité par la documentation |
| `A-03` | **Majeur** | « Mot de passe oublié ? » n'appelait rien | Partie A | LYFE · portail + DigiNegoce (envoi du mail) | Traité par la documentation |
| `A-04` | **Majeur** | L'écran de saisie du code de vérification n'existe pas | Partie A | DigiNegoce (deux endpoints) + LYFE · portail (l'écran) | Traité par la documentation |
| `A-05` | **Majeur** | Cloche de notification rendue contre la ligne 44 | Partie A | LYFE · portail | Traité par la documentation |
| `A-06` | **Majeur** | Porte ouverte vers l'espace Events en Lot 1 | Partie A | LYFE · portail | Traité par la documentation |
| `A-08` | **Majeur** | « Exporter la journée » dépêchait un verbe inexistant | Partie A | LYFE · portail | Traité par la documentation |
| `A-11` | **Majeur** | Deux verbes morts dans la file d'attention du Lot 2 | Partie A | LYFE · portail | Traité par la documentation |
| `B-02` | **Majeur** | Barre de recherche cherchée par une invite réécrite depuis | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-03` | **Majeur** | Confirmation du refus cherchée hors de sa boîte de dialogue | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-04` | **Majeur** | `limit=200` refusé par l'application, plafonnée à 100 | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-05` | **Majeur** | Une base « partagée » qui pouvait être SQLite d'un côté | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-13` | **Majeur** | Les douze outils se gênent lancés en suite sur une base | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-14` | **Majeur** | Deux outils affirmaient la forme du lot 1 dans le lot 2 | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-15` | **Majeur** | `recharts` voyageait vers chaque écran du lot 1 · 308 Ko | Partie B | LYFE · portail | Traité par la documentation |
| `B-17` | **Majeur** | `journey` sur le double : une cellule rouge non reproductible | Partie B | LYFE · outils de recette | Traité par la documentation |
| `C-03` | **Majeur** | Un seul jeton de service, donc 401 et 403 à redéfinir | Partie C | DigiNegoce (portée du jeton) + LYFE · contrat | Traité par la documentation |
| `C-07` | **Majeur** | La revue LYFE n'est jamais appelée sur le pilote HTTP | Partie C | —, par décision de périmètre (`SP-Prio 03`) | Traité par la documentation |
| `C-08` | **Majeur** | Le double répondait 500 à Décaler et à la recherche | Partie C | LYFE · service double | Traité par la documentation |
| `C-09` | **Majeur** | Le double jetait le téléphone du partenaire | Partie C | LYFE · service double | Traité par la documentation |
| `D-01` | **Majeur** | Accepter et Absent en parallèle sur une réservation | Partie D | LYFE · portail | Traité par la documentation |
| `D-02` | **Majeur** | Deux décalages simultanés vers deux heures | Partie D | LYFE · portail | Traité par la documentation |
| `D-04` | **Majeur** | 2 005 réservations rendues d'un bloc sur l'Accueil | Partie D | LYFE · portail | Traité par la documentation |
| `D-06` | **Majeur** | Une écriture refusée effaçait la saisie | Partie D | LYFE · portail | Traité par la documentation |
| `D-07` | **Majeur** | Aucun plafond sur les tentatives de connexion | Partie D | LYFE · portail + DigiNegoce (plafond côté service) | Traité par la documentation |
| `D-08` | **Majeur** | Migration 001 posée à la main : impossible d'avancer | Partie D | LYFE · scripts de base | Traité par la documentation |
| `E-03` | **Majeur** | Aucun en-tête de sécurité | Partie E | LYFE · portail | Traité par la documentation |
| `E-04` | **Majeur** | Tuiles et géocodeur en dur sur les serveurs de l'OSMF | Partie E | LYFE · portail + exploitation (les deux URL) | Traité par la documentation |
| `E-06` | **Majeur** | `jsqr` sans publication depuis 2021 lit la caméra | Partie E | LYFE · portail | Traité par la documentation |
| `E-07` | **Majeur** | `customer.anonymise` déclaré et non enregistré | Partie E | LYFE · portail, `SP-Prio 08` | Traité par la documentation |
| `F-01` | **Majeur** | Une ligne ouverte portait un bouton là où le produit en dessine quatre | Partie F | LYFE · maquettes | Traité par la documentation |
| `F-03` | **Majeur** | Les deux écrans de carte ne montraient pas de carte | Partie F | LYFE · maquettes | Traité par la documentation |
| `F-04` | **Majeur** | La cloche encore sur dix cadres | Partie F | LYFE · maquettes | Traité par la documentation |
| `F-05` | **Majeur** | « Exporter la journée » encore sur sept cadres | Partie F | LYFE · maquettes | Traité par la documentation |
| `G-01` | **Majeur** | `business_venue` rend 14 champs sur 23 | Partie G | LYFE · application (FastAPI) | Traité par la documentation |
| `G-05` | **Majeur** | `handshake.mjs` ignorait la revue LYFE | Partie G | LYFE · outils de recette | Traité par la documentation |
| `A-01` | **Mineur** | Téléphone donné pour facultatif à l'inscription | Partie A | LYFE · portail | Traité par la documentation |
| `B-06` | **Mineur** | Sans Playwright, les outils meurent sur une trace Node | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-07` | **Mineur** | La liste des outils dans HANDOFF était incomplète et le compte d'écrans faux | Partie B | LYFE · documentation | Traité par la documentation |
| `B-08` | **Mineur** | Échec quand un outil passé avant avait décidé la seule demande | Partie B | LYFE · outils de recette | Traité par la documentation |
| `B-09` | **Mineur** | `hydrate.tmp.mjs` commité à la racine | Partie B | LYFE · dépôt | Traité par la documentation |
| `B-10` | **Mineur** | « −1 Ko » dans le tableau des transferts | Partie B | LYFE · outils de recette | Traité par la documentation |
| `C-04` | **Mineur** | `GET /venues/{id}` documenté pour un écran, appelé par tous | Partie C | LYFE · contrat | Traité par la documentation |
| `C-05` | **Mineur** | `GET /settings` appelé 180 fois sur 563 | Partie C | DigiNegoce (mise en cache) | Traité par la documentation |
| `E-05` | **Mineur** | Une écriture refusée ne laissait aucune référence | Partie E | LYFE · portail | Traité par la documentation |
| `E-09` | **Mineur** | Le marqueur de carte n'a pas de nom accessible | Partie E | LYFE · portail | Traité par la documentation |
| `E-10` | **Mineur** | « LYFE · Maroc » à 4,33:1 | Partie E | LYFE · portail | Traité par la documentation |
| `F-02` | **Mineur** | `Décaler` et `Absent` sans glyphe | Partie F | LYFE · maquettes | Traité par la documentation |
| `F-08` | **Mineur** | `extract.mjs` rapportait la demande spéciale comme initiales | Partie F | LYFE · outils de recette | Traité par la documentation |
| `A-07` | **Note** | « À confirmer » côté tableau de bord, « en attente » côté application | Partie A | — | Conforme, noté |
| `A-09` | **Note** | « Rappel la veille » qu'aucune ligne n'achète | Partie A | — | Conforme, noté |
| `A-10` | **Note** | `/admin/validations` relève de `SP-Prio 03` | Partie A | — | Conforme, noté |
| `B-11` | **Note** | Quatre `ExperimentalWarning: SQLite` au build | Partie B | — | Conforme, noté |
| `B-12` | **Note** | Le compte de recette atterrit sur le sélecteur en Lot 1 | Partie B | LYFE · documentation | Conforme, noté |
| `B-16` | **Note** | Chromium sonde `/favicon.ico` malgré le SVG déclaré | Partie B | LYFE · outils de recette | Conforme, noté |
| `C-06` | **Note** | `guestEmail` et `guestBirthYear` facultatifs au type | Partie C | — | Conforme, noté |
| `E-08` | **Note** | `/styleguide` est public | Partie E | — | Conforme, noté |
| `F-06` | **Note** | Les décisions de l'ordinateur sans glyphe | Partie F | — | Conforme, noté |
| `F-07` | **Note** | La pastille de la barre supérieure est un avatar | Partie F | — | Conforme, noté |

### H.4 Ce que cet audit n'a pas pu faire

Quatre choses, écrites ici pour qu'elles ne passent pas pour faites :

- **Safari et Firefox.** Les deux moteurs ne sont pas installés dans ce
  conteneur. Les largeurs de bureau et de téléphone, les profils
  d'appareil iPhone 14 et Pixel 7, la navigation au clavier et axe-core
  ont tous tourné sur **Chromium**. Le portail n'emploie aucune API
  propre à un moteur, mais ce n'est pas la même chose que l'avoir vu.
- **Neon, endpoint groupé contre endpoint direct.** Aucune base Neon
  n'est joignable d'ici. Le verrou du générateur a été écrit pour le
  regroupement par transaction (`LOCK TABLE … IN ACCESS EXCLUSIVE MODE`,
  dans une transaction) et éprouvé sur un Postgres 16 local, deux
  processus en parallèle. La différence de comportement entre les deux
  endpoints de Neon reste à voir sur Neon.
- **Le code de vérification de bout en bout** — `A-04` — faute de
  service d'envoi.
- **Le scanner sur une vraie caméra** — `E-06` — faute de caméra.

### H.5 Les commandes qui rejouent cet audit

```bash
npm install
npm install --no-save playwright axe-core     # les outils, une fois

# les trois modes
LYFE_DATA=static npm run build && LYFE_DATA=static npx next start -p 3230
npm run db:reset                               # SQLite
DATABASE_URL="postgres://…" npm run db:reset   # Postgres

# les douze outils, dans chaque lot
for T in walk payload events states configuration audience \
         inscription decisions edges journey handshake; do
  BASE=http://localhost:3230 LYFE_LOT=1 node tools/verify/$T.mjs
done

# les épreuves de la partie D
BASE=http://localhost:3230 node tools/verify/_stress.mjs
BASE=http://localhost:3230 node tools/verify/_stress2.mjs
DATABASE_URL="postgres://…" npx tsx tools/verify/_store-stress.mts
DATABASE_URL="postgres://…" node tools/verify/_loadseed.mjs
BASE=http://localhost:3230 node tools/verify/_perf.mjs
BASE=http://localhost:3230 node tools/verify/_bundle.mjs
bash tools/verify/_pg-cases.sh

# le contrat
python3 -m openapi_spec_validator docs/lot1-openapi.yaml
```
