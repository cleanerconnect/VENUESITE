# Parcours d'intégration — Portail Partenaire ↔ Business Service

Pour l'équipe qui construit le service. Ce document dit comment faire
tourner le front-end contre votre service **en moins d'une heure**, puis
dans quel ordre écrire les endpoints pour que le tableau de bord
devienne utilisable par paliers plutôt qu'en une seule fois.

Rien ici ne contredit `docs/AUDIT_LOT1.md` : les deux sont écrits à
partir du même code et de la même passe de vérification. Là où l'audit
signale un écart, il est repris ici sous le même identifiant.

**Les trois documents et ce qu'ils sont :**

| Fichier | Ce qu'il est |
|---|---|
| `docs/lot1-openapi.yaml` | La spécification, en OpenAPI 3.1, validée. 27 chemins, 35 opérations. Dérivée du pilote HTTP et du trafic observé, pas du markdown. |
| `docs/LOT1_API_CONTRACT.md` | La même chose en prose, écran par écran, avec le *pourquoi* de chaque champ. |
| `tools/mock-api.mjs` | Une implémentation exécutable du contrat. Ce que votre service doit remplacer, et ce contre quoi vous pouvez mesurer votre progression. |

---

## 1. Faire tourner le front-end contre votre service — 40 minutes

### 1.1 Le portail, en cinq minutes

```bash
git clone <ce dépôt> && cd venuesite
npm install            # 10 s, 0 vulnérabilité
npm run build          # 65 s
npx next start -p 3210
```

`GET /api/health` dit sur quel pilote il tourne. Sans configuration il
répond `"data":"static"` : il sert l'instantané commité et les six
écrans se rendent. Vous avez maintenant le front-end sous les yeux,
sans avoir écrit une ligne.

### 1.2 Le double, pour voir le seam bouger

```bash
node tools/mock-api.mjs &        # :3311, GET /__health sans jeton
LYFE_LOT=1 LYFE_DATA=http \
  LYFE_API_BASE_URL=http://localhost:3311 \
  LYFE_API_TOKEN=mock \
  npx next start -p 3210
```

Vérifiez `GET /api/health` : il doit dire `"data":"http"`. Un serveur
oublié sur le même port répondra à sa place, et vous croirez tester le
double.

À ce stade le portail fait **563 appels sur 21 endpoints** pour une
passe complète de vérification, et le double y répond sans un seul
`404` **et sans un seul `500`**. C'est la cible, et les deux comptes
importent : l'audit a trouvé deux `500` que la passe précédente n'avait
pas vus parce qu'elle ne comptait que les `404` — la liste de créneaux
de Décaler et la recherche du carnet, deux des quatre choses que ce lot
achète. Comptez les deux.

### 1.3 Votre service, à la place du double

Deux variables, et rien d'autre :

```bash
LYFE_API_BASE_URL=https://api.votredomaine.ma
LYFE_API_TOKEN=<le jeton de service>
```

Les chemins de l'OpenAPI s'ajoutent tels quels à `LYFE_API_BASE_URL`.
Le portail n'ajoute ni préfixe ni version.

### 1.4 Ce qu'il faut savoir du jeton avant d'écrire quoi que ce soit

Le portail est un **client serveur à serveur**. Il porte **un seul**
jeton de service et l'identité du partenaire voyage en paramètre :
`user_id` sur la session, `venue_id` sur les appels scopés. Il n'existe
pas de jeton par partenaire.

Trois conséquences, et la troisième est une obligation :

1. Le périmètre ne peut pas être résolu « depuis le jeton » : avec un
   jeton unique, `venue_id` est le seul signal. Le portail vérifie
   lui-même, à chaque écriture, que le partenaire connecté détient
   l'établissement (`requireVenueAccess`). **Votre service doit vérifier
   aussi**, parce qu'un seul contrôle est un contrôle qu'on oublie.
2. `401` et `403` ne veulent pas dire la même chose ici. `401` = « le
   service ne nous connaît pas ». `403` = « ce partenaire n'a pas le
   droit ». Le portail les traite différemment.
3. **Ce jeton ne doit jamais être accepté depuis un navigateur.** Il
   n'est lu que dans du code `server-only`, il n'atteint jamais le
   client. Refusez une origine navigateur sur ces routes.

### 1.5 La forme d'une erreur

Le portail lit **exactement deux champs** d'une réponse ≥ 400 :

```json
{ "code": "venue_forbidden", "message": "Cet établissement n'est pas le vôtre." }
```

`message` est affiché tel quel au partenaire quand le portail n'a pas
de phrase plus précise. Un corps d'une autre forme devient « Une erreur
est survenue ». Un `204` est accepté comme réponse vide.

Le pilote abandonne à **8 000 ms** et lève un `504` côté client, avec
« Le service ne répond pas ». Ce n'est pas un code que vous renvoyez :
c'est ce que le portail produit quand vous ne répondez pas.

---

## 2. L'ordre dans lequel écrire les endpoints

Huit paliers. Chacun rend le tableau de bord **plus utilisable que le
précédent**, et chacun a un test qui passe ou ne passe pas.

Les estimations sont en **j-h** (jours-homme) et supposent, à chaque
fois :

> un développeur qui connaît sa pile, avec les tables déjà en place,
> chiffrant **l'endpoint et son test** — pas le modèle de données, pas
> l'infrastructure, pas la revue.

### Palier 1 — Le portail s'ouvre · 1,5 j-h

Sans ces trois-là, rien ne se rend.

| Méthode · chemin | Réponse | Prouvé par le double ? | j-h |
|---|---|---|---|
| `POST /api/business/auth/session` | `BusinessAccount` | **oui, observé** | 0,5 |
| `GET /api/business/auth/session?user_id=` | `BusinessAccount` | **oui, observé** (45 appels) | 0,5 |
| `GET /api/business/settings?venue_id=` | `VenueSettings` | **oui, observé** (166 appels) | 0,5 |

**Requête de connexion :**

```http
POST /api/business/auth/session
Authorization: Bearer <jeton de service>
Content-Type: application/json

{ "email": "yassine@darzellij.ma", "password": "…" }
```

**Réponse :**

```json
{
  "userId": "usr_yassine",
  "fullName": "Yassine Alami",
  "email": "yassine@darzellij.ma",
  "venues": [
    { "id": "rst_dar_zellij", "name": "Dar Zellij", "shortName": "Dar Zellij",
      "initials": "DZ", "city": "Marrakech", "kind": "restaurant", "role": "owner" }
  ]
}
```

**Une adresse inconnue et un mot de passe faux répondent le même
`401`.** Deux réponses différentes feraient de ce formulaire l'annuaire
des partenaires de LYFE.

`GET` avec `user_id` est appelé **à chaque requête** du portail. Le
pilote mémorise la réponse cinq secondes ; au-delà, c'est votre latence
multipliée par chaque navigation.

**Test d'acceptation** — `tools/verify/walk.mjs` :

```bash
npm run build && npx next start -p 3210 &
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/walk.mjs
```

Attendu : `12/12 screens clean at 1440×900`. L'outil se connecte,
change d'établissement par `POST /api/session/venue`, et ouvre les six
écrans aux deux largeurs en refusant une erreur de console, une page
quasi vide ou un débordement horizontal.

### Palier 2 — Les six écrans portent des données · 3 j-h

| Méthode · chemin | Réponse | Prouvé par le double ? | j-h |
|---|---|---|---|
| `GET /api/business/overview?venue_id=` | `RestaurantOverview` | **oui, observé** (73 appels) | 3 |

C'est le plus gros morceau du contrat, et le seul composite : un appel,
et l'Accueil, Réservations, Check-in, Ma fiche, Disponibilités et
Notifications ont ce qu'il leur faut.

**Les tranches que seul le lot 2 rend peuvent être servies vides** —
`topItems`, `reviews`, `payouts`, `averageTicket`, `occupancy`,
`revenueWeek`, `rating`, `nextPayout`. Aucun écran contractuel ne les
affiche. Cela retire environ un tiers du travail de ce palier.

**Deux champs qui ne sont pas optionnels :**

- `currentService.slotMinutes` — `15`, `30` ou `60`. Sans lui,
  Réservations ne sait pas sur quelle grille regrouper la journée.
  Omis, le portail retombe sur 30 ; c'est un défaut, pas un contrat.
- `upcomingReservations[].channel` — **en minuscules** : `lyfe`,
  `phone`, `whatsapp`, `walk_in`, `partner`, `instagram`. `LYFE` n'est
  pas une valeur. C'est exactement l'erreur que l'application faisait
  (`G-02` de l'audit).

**Test d'acceptation** — `tools/verify/states.mjs` et
`configuration.mjs` :

```bash
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/states.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/configuration.mjs
```

Attendu : `All three states forceable on all 6 routes` et
`Configuration behaves as specified`. Le premier force le chargement,
le vide et l'erreur sur chaque route ; le second vérifie que le
vocabulaire suit `settings.configuration` (« couverts » pour un
restaurant, « personnes » pour un lounge) et qu'aucun montant
n'apparaît sur les sept écrans.

Et l'outil que cet audit a ajouté, qui refuse qu'un champ manquant se
rende comme le nom d'une valeur JavaScript :

```bash
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/payload.mjs
```

Attendu : `Aucune valeur JavaScript rendue sur 6 écrans`. C'est ce qui
a attrapé « créneaux de **undefined** minutes » (`C-01`).

### Palier 3 — Le carnet se promène · 1 j-h

| Méthode · chemin | Réponse | Prouvé par le double ? | j-h |
|---|---|---|---|
| `GET /api/business/bookings?venue_id=&date=` | `DayBook` | **oui, observé** (19 appels) | 1 |

`date` est `AAAA-MM-JJ` **dans le calendrier du lieu**
(`Africa/Casablanca`), pas en UTC. La fenêtre que le portail propose est
de sept jours en arrière et trente en avant.

**Un jour sans service répond `200` avec des tableaux vides, jamais
`404`.** Une journée de fermeture est une information, pas une erreur.

**Test d'acceptation** : `walk.mjs` couvre la navigation ; `decisions.mjs`
(palier 6) vérifie le regroupement par créneau.

### Palier 4 — Le partenaire décide · 2,5 j-h

C'est le palier après lequel le tableau de bord **sert à quelque chose** :
avant lui, le partenaire regarde ; après, il travaille.

| Méthode · chemin | Requête | Réponse | Prouvé ? | j-h |
|---|---|---|---|---|
| `PUT /api/business/bookings/{id}/confirm` | — | `RestaurantOverview` | **oui, observé** | 0,5 |
| `PUT /api/business/bookings/{id}/reject` | `{ reason, note? }` | `RestaurantOverview` | oui, non observé | 0,5 |
| `PUT /api/business/bookings/{id}/cancel` | — | `RestaurantOverview` | oui, non observé | 0,25 |
| `POST /api/business/bookings/{id}/no-show` | — | `RestaurantOverview` | oui, non observé | 0,25 |
| `POST /api/business/bookings/check-in` | `{ qr_code }` | `CheckInResult` | oui, non observé | 0,5 |
| `POST /api/business/bookings/{id}/check-in` | `{ qr_code }` | `CheckInResult` | oui, non observé | 0,5 |

**Chaque décision rend l'aperçu complet**, pour que le portail n'ait pas
à relire. C'est délibéré : un aller-retour de moins par décision, sur
l'écran où un hôte en prend vingt par service.

**`rejected` n'est pas `cancelled`.** L'établissement a refusé ; le
client n'a pas renoncé. Les deux états restent distincts de bout en
bout, et le motif codé est ce qui les rend exploitables.

**Une décision doit être un compare-and-set sur l'état lu.** Deux hôtes
au même pupitre, l'un tapant Accepter et l'autre Absent : sans cela le
carnet garde la dernière écriture arrivée, l'historique enregistre deux
départs du même état, et le client reçoit deux messages contradictoires.
C'est précisément le défaut que cet audit a corrigé côté portail
(`D.1`) ; répondez `409` au perdant et le portail dit « a changé
entre-temps. Rechargez la page. »

**Le check-in a une règle à part** : un code déjà utilisé répond `200`
avec `{ "ok": false, "error": "already_used" }`, **pas** un `409`. Un
statut d'erreur obligerait le portail à deviner le message, et l'hôte
doit lire « Ce client est déjà enregistré comme arrivé ».

Le QR appartient à l'application : **le portail valide un code, il ne
le fabrique jamais.**

**Test d'acceptation** — `tools/verify/decisions.mjs` :

```bash
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/decisions.mjs
```

Attendu : `Les quatre changements tiennent · lot 1`. Trente-quatre
contrôles, dont : les quatre décisions sur chaque ligne ouverte, la
feuille Décaler ne proposant que les créneaux du lieu, le téléphone sur
la ligne, et le tiroir portant le client.

### Palier 5 — L'établissement tient sa fiche · 4,25 j-h

| Méthode · chemin | Requête | Prouvé ? | j-h |
|---|---|---|---|
| `GET /api/business/venues/{id}` | — | **oui, observé** (108 appels) | 0,5 |
| `PUT /api/business/venues/{id}` | patch partiel | **oui, observé** | 0,5 |
| `PUT /api/business/venues/{id}/listing` | patch partiel | oui, non observé | 0,25 |
| `GET /api/business/venues/{id}/availability` | — | **oui, observé** (22 appels) | 0,25 |
| `PUT /api/business/venues/{id}/availability` | le tableau complet | oui, non observé | 0,25 |
| `GET /api/business/services/configuration?venue_id=` | — | **oui, observé** | 0,5 |
| `POST /api/business/services/configuration?venue_id=` | une action `{ kind, … }` | **oui, observé** | 1 |
| `GET /api/business/venues/{id}/assets?kind=photo` | — | **oui, observé** (14 appels) | 0,5 |
| `POST /api/business/venues/{id}/assets` | une action | oui, non observé | 0,5 |

**`GET /venues/{id}` est lu sur chaque écran**, pas seulement sur Ma
fiche : le bandeau de validation est un fait sur l'établissement que
toutes les pages doivent porter. 108 appels sur 514. Servez-le vite.

**Ce `GET` doit porter les 23 champs de `RestaurantProfile`.** L'écart
que l'audit a relevé côté FastAPI (`G-01`) en rend 14 : manquent
`initials` (la pastille de la barre latérale, qui reste vide sans lui),
`status` et `statusReason` (le bandeau de validation, qui n'apparaît
jamais sans eux), `subline`, `cuisine`, `currency`,
`onboardingCompleted`, `tags`, `features`, `ambience`.

**Les horaires se PUTtent en entier, pas en patch.** La grille
hebdomadaire est un tout, et un patch partiel laisse deux clients en
désaccord sur les jours absents.

**La configuration des services passe par une action JSON**, pas par un
endpoint par champ : le `kind` est ce sur quoi vous branchez, et
`expectedVersion` porte la concurrence optimiste — une version périmée
répond `409` et le portail dit « a changé entre-temps ». Actions du lot
1 : `service.create`, `service.edit`, `service.remove`, `service.set`,
`pacing.set`.

**Le fichier d'une photo ne passe pas par cet endpoint.** Le portail
envoie une action ; vous rendez une URL signée ; le navigateur y envoie
les octets. Aucun octet ne traverse `POST /assets`.

**Test d'acceptation** — `tools/verify/edges.mjs` :

```bash
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/edges.mjs
```

Attendu : aucun problème. L'outil marche sur les cas qu'un partenaire
provoque par accident : un mot de passe faux, une session morte avec un
formulaire ouvert, un double clic sur Enregistrer, une photo quatre fois
trop lourde, un établissement vide, et le vocabulaire d'un lounge.

### Palier 6 — Décaler, chercher · 2 j-h

| Méthode · chemin | Réponse | Prouvé ? | j-h |
|---|---|---|---|
| `GET /api/business/venues/{id}/slots?date=` | `BookableSlot[]` | oui, non observé | 1 |
| `PUT /api/business/bookings/{id}/reschedule` | `RestaurantOverview` | oui, non observé | 0,5 |
| `GET /api/business/venues/{id}/bookings/search?q=` | `Reservation[]` | oui, non observé | 0,5 |

Contractuel, et la ligne le dit : `Détail Sprint `, ligne 46,
`SP-Prio 02` — « le restaurateur ne reçoit pas de mail pour accepter ou
refuser la reservation **ou inviter l'utilisateur à choisir un autre
créneau** ».

**`slots` découpe sur `slotMinutes` du service**, et un service qui
franchit minuit rend des créneaux du lendemain : « Nuit », 21h00 →
02h00, rend `00:00` et `01:00` du jour suivant. Vérifié.

**`reschedule` doit vérifier que `at` est l'un des créneaux que `slots`
a rendus pour ce jour.** Le portail le vérifie avant d'appeler ; faites-le
aussi. L'état ne change pas — une demande décalée reste une demande.
`409` si elle a déjà bougé, ou si elle est arrivée, close ou refusée.

**La recherche a trois entrées**, parce que ce sont les trois choses
qu'un hôte a en main : un **nom** (insensible à la casse, n'importe où
dedans), un **téléphone** comparé **chiffres seuls** — ce qui fait que
`4418` trouve `+212 661 20 44 18`, les quatre derniers chiffres étant la
façon dont un client relit son numéro — et une **date** (`2026-09-25` ou
`25/09`). Moins de deux caractères : tableau vide.

**Test d'acceptation** : `decisions.mjs`, contrôles 12 à 22.

### Palier 7 — L'inscription d'un partenaire · 2 j-h

| Méthode · chemin | Prouvé ? | j-h |
|---|---|---|
| `POST /api/business/onboarding` | **oui, observé** | 0,75 |
| `GET /api/business/onboarding/{id}` | **oui, observé** | 0,25 |
| `PUT /api/business/onboarding/{id}` | **oui, observé** (16 appels) | 0,5 |
| `POST /api/business/onboarding/{id}/submit` | **oui, observé** | 0,5 |

Le brouillon vit **côté service**, pas dans le navigateur : fermer
l'onglet ne perd rien et le partenaire peut finir sur un autre appareil.

`POST /onboarding/{id}/submit` est **idempotent** : un brouillon déjà
consommé rend l'établissement qu'il a créé plutôt qu'un second.

**L'établissement naît `pending_review`.** Son tableau de bord
fonctionne entièrement ; l'application ne le liste pas. Le portail
affiche un bandeau qui le dit au partenaire.

**Test d'acceptation** — `tools/verify/inscription.mjs` :

```bash
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/inscription.mjs
```

Attendu : `Les six étapes de l'inscription passent`. L'outil refuse un
mot de passe de moins de huit caractères, refuse deux saisies de mot de
passe qui diffèrent, et va jusqu'au tableau de bord de l'établissement
créé.

### Palier 8 — La revue LYFE, et le mot de passe oublié · 2 j-h

| Méthode · chemin | Prouvé ? | j-h |
|---|---|---|
| `GET /api/business/venues/pending` | oui, non observé | 0,5 |
| `PUT /api/business/venues/{id}/validation` | oui, non observé | 0,5 |
| `POST /api/business/auth/password-reset` | oui, non observé | 1 |
| `PUT /api/business/zones/{zoneId}?venue_id=` | oui, non observé | 0,25 |
| `GET /api/business/venues/{id}/notification-preferences` | **oui, observé** | 0,25 |
| `PUT /api/business/venues/{id}/notification-preferences` | **oui, observé** | 0,25 |

**Les deux endpoints de revue sont réservés à LYFE.** L'autorisation
n'est pas un rôle sur un établissement : un propriétaire ne doit jamais
pouvoir valider sa propre annonce. Refusez-les à tout jeton qui n'est
pas celui de l'administration.

Ces deux-là relèvent de `Détail Sprint ` ligne 55, `SP-Prio 03` — pas de
`Prio 02`. Le front-end est écrit ; le service peut attendre son sprint.

**Le mot de passe oublié a trois règles** : la même réponse pour une
adresse connue et inconnue (`204` dans les deux cas), `422` seulement si
ce n'est pas une adresse, et le lien — sa durée de vie, son usage
unique, l'écran qui accepte le nouveau mot de passe — est à vous. Le
portail ne sert pas cet écran en Lot 1.

**Les préférences de notification** : un tableau de canaux par alerte,
vide pour « aucun ». Le lot 1 **stocke** `guestReminder` sans l'envoyer
— aucune ligne de `Prio 02` n'achète le rappel au client.

---

## 3. Ce qui reste à spécifier, et que le front-end n'a pas

Trois choses que l'audit a trouvées manquantes des deux côtés. Elles ne
sont pas des défauts du front-end : elles sont du travail non fait.

| Quoi | Ligne qui l'achète | Ce qu'il faut | j-h |
|---|---|---|---|
| **L'écran de vérification par code** — code envoyé par e-mail **ou** WhatsApp, au choix, saisi sur un écran dédié | `Détail Sprint ` 39, `SP-Prio 02`, verbatim | Service : `POST /auth/signup/verify` et `POST /auth/signup/resend`, plus l'envoi. Portail : une septième étape | 1,5 service + 0,5 portail |
| **L'alerte au restaurateur** quand une demande arrive | `Détail Sprint ` 46, `SP-Prio 02` | Un envoyeur derrière `messages_log`, sur les trois canaux que Notifications règle | 1,5 |
| **La purge des données de client** après `retention_months` | Loi 09-08, et `venue_settings.retention_months` existe déjà | Un travail planifié. La requête d'anonymisation est écrite au contrat §3.2 | 0,5 |

Et deux du côté front-end, que l'audit a laissées ouvertes avec leur
raison :

| Quoi | Pourquoi pas fait ici | j-h |
|---|---|---|
| Remplacer `jsqr` (non maintenu depuis 2021) par `BarcodeDetector` avec `jsqr` en repli iOS | Un décodeur de QR se change contre une vraie caméra, ce que le conteneur d'audit n'a pas | 1 |
| Compléter `business_venue` de FastAPI (14 champs sur 23) | L'endpoint n'est pas sur le chemin du déploiement actuel | 0,5 |
| Externaliser les 184 chaînes françaises de la surface lot 1, **si** une seconde langue est demandée | Aucune ligne du plan ne la demande | 2 |

---

## 4. Ce que LYFE fournit, ce que DigiNegoce construit

| | LYFE fournit | DigiNegoce construit |
|---|---|---|
| **Écrans** | Les six écrans partenaire, Connexion et Inscription, aux deux largeurs, en React/Next.js, avec leurs états de chargement, de vide et d'erreur | — |
| **Maquettes** | Figma, page `09 Dashboard basique · Dar Zellij` — 43 cadres, ordinateur et téléphone, y compris les superpositions et les états liés | — |
| **Contrat** | `docs/lot1-openapi.yaml` (OpenAPI 3.1, validée), `docs/LOT1_API_CONTRACT.md` (la prose), et `tools/mock-api.mjs` (une implémentation exécutable) | Le service qui l'implémente |
| **Schéma** | `db/schema.sql` — 69 tables, applicable à Postgres sans traduction, plus les migrations et leur registre | Les tables, si vous partez du schéma ; sinon la traduction |
| **Jeu de données** | Deux établissements semés — un restaurant à Marrakech, un lounge à Casablanca — plus l'instantané statique | — |
| **Tests d'acceptation** | Douze outils sous `tools/verify/`, dont celui de la poignée de main entre le portail et l'application | Les faire passer |
| **Authentification** | Le formulaire, la session signée, le périmètre par établissement, les rôles, le plafond de tentatives | Le vrai contrôle d'identité : `POST /auth/session`, la rotation, la révocation |
| **Données personnelles** | L'inventaire des sept champs et leur finalité (contrat §3.2), la requête d'anonymisation | L'appliquer : la purge, le droit de suppression |
| **Envois** | Les préférences, par alerte et par canal ; une ligne dans `messages_log` à chaque message que le portail prétend avoir envoyé | L'envoi lui-même : e-mail, push, WhatsApp |
| **Carte** | L'écran, le point déplaçable, le géocodage | Un fournisseur de tuiles de production (`NEXT_PUBLIC_MAP_TILE_URL`) — les tuiles publiques d'OSM ne sont pas un fournisseur |
| **Application grand public** | La lecture des mêmes tables (`backend/postgres_dashboard.py`), la grille de créneaux du lieu, le filtre sur les établissements validés | Les écrans de l'application qui ne lisent pas encore l'API |

---

## 5. Le total, et comment le lire

| Palier | j-h |
|---|---|
| 1 · Le portail s'ouvre | 1,5 |
| 2 · Les six écrans portent des données | 3 |
| 3 · Le carnet se promène | 1 |
| 4 · Le partenaire décide | 2,5 |
| 5 · L'établissement tient sa fiche | 4,25 |
| 6 · Décaler, chercher | 2 |
| 7 · L'inscription | 2 |
| 8 · La revue LYFE, le mot de passe oublié, les notifications | 2 |
| **Sous-total contrat Lot 1** | **18,25** |
| Ce qui reste à spécifier (§3, côté service) | 3,5 |
| **Total** | **21,75** |

**L'hypothèse, à nouveau, parce qu'un chiffre sans hypothèse ne vaut
rien :** un développeur qui connaît sa pile, les tables déjà en place,
l'endpoint **et son test**. Pas le modèle de données, pas
l'infrastructure, pas la revue, pas le déploiement.

**Ce qui fait baisser ce chiffre :** les tranches lot 2 de
`RestaurantOverview` peuvent être servies vides (environ un tiers du
palier 2), et les deux endpoints de revue relèvent de `SP-Prio 03` donc
d'un autre sprint (−1 j-h sur le périmètre d'octobre).

**Ce qui le ferait monter :** un modèle de données qui ne ressemble pas
à `db/schema.sql`, auquel cas chaque palier porte sa traduction ; et
tout endpoint servi sans son test, qui coûte alors deux fois au premier
écran qui s'en sert.

---

## 6. Avant de dire que c'est fini

Les douze outils, dans l'ordre où ils se contredisent le moins :

```bash
npm install --no-save playwright axe-core     # une fois
npm run build && npx next start -p 3210 &
npm run db:reset                              # sur une base fraîche

LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/walk.mjs
LYFE_LOT=1 BASE=http://localhost:3210 W=390 H=844 node tools/verify/walk.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/payload.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/states.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/configuration.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/events.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/inscription.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/decisions.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/edges.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/journey.mjs
LYFE_LOT=1 BASE=http://localhost:3210 node tools/verify/handshake.mjs
```

Cinq d'entre eux **écrivent**, et le disent : contre le pilote statique
ils s'arrêtent avec une phrase plutôt que d'échouer. `handshake.mjs`
demande en plus que le portail et l'application partagent **une** base
Postgres — c'est le seul qui teste les deux produits ensemble — et se
déclare outil du lot 1.

**Sur une base remise à zéro**, et c'est important : le jeu de données
porte exactement une réservation en attente de décision, et le premier
outil qui l'atteint la décide. Ceux d'après trouvent un carnet sans
rien à décider ; ils l'écrivent au lieu d'échouer dessus, mais une
suite lancée deux fois sur la même base mesure ses propres restes.

Le résultat attendu, mode par mode, est dans `docs/AUDIT_LOT1.md`,
partie B.
