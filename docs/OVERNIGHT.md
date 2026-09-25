# Travail de nuit — journal

Ce fichier est le journal d'une session autonome : ce qui a été fait, ce
qui a été trouvé, ce qui reste. Une entrée par étape, dans l'ordre. Les
choix pris sans pouvoir demander sont notés comme tels, avec la règle
suivie : **l'option la plus simple qui garde le périmètre du Lot 1**.

La dernière section, « À regarder en premier », est écrite pour être lue
seule.

---

## Étape 0 — Postgres et la carte (la demande précédente, terminée)

### Fait

**Un moteur Postgres à côté de SQLite, choisi par `DATABASE_URL`.**
`src/lib/db/store.ts` était un fichier de quatre fonctions —
`all`, `one`, `run`, `transaction` — au-dessus de `node:sqlite`. Il a
maintenant une couture : les mêmes quatre fonctions, deux moteurs
derrière. Rien d'autre dans l'application ne sait lequel répond.

- `db/schema.sql` s'applique à Postgres **sans traduction** : il était
  écrit dans l'intersection des deux dialectes, et cela a été vérifié
  plutôt que supposé — 67 tables, zéro erreur.
- Les `?` sont traduits en `$1…$n` dans une seule fonction.
- Les types que `pg` renverrait autrement sont épinglés pour qu'une
  ligne ait la même forme sur les deux moteurs : `COUNT(*)` en nombre et
  non en chaîne, une date en chaîne ISO et non en objet `Date`, une
  colonne JSON en texte brut comme SQLite la rend.
- Une transaction tient un client à elle, porté par un
  `AsyncLocalStorage`, donc les magasins n'ont pas eu à se passer une
  connexion de fonction en fonction.
- `db/postgres-compat.sql` installe `strftime`, `julianday`,
  `date(x[, modifier])` et `datetime(x)` — les quatre fonctions SQLite
  qu'une trentaine de requêtes utilisent. **Choix** : deux façons de
  fermer cet écart existaient, porter deux orthographes de trente
  requêtes dans le code, ou apprendre quatre fonctions à Postgres une
  fois. La seconde est la plus simple et ne touche pas au périmètre.

**La couche de magasins est devenue asynchrone.** C'était la vraie
dépense : 267 appels de requête, 91 fonctions, sept fichiers. Les
transformations mécaniques ont été faites par codemod (await sur les
appels, `async` sur la fonction qui les contient, `Promise<T>` sur le
type de retour, parenthèses autour d'un `await` suivi d'un accès), le
reste à la main — quatre `.map` dont le corps interroge la base, qui
sont devenus des `Promise.all`, et trois `forEach` contenant une
écriture, qui étaient des écritures non attendues et sont devenues des
boucles. `npx tsc --noEmit` est propre.

**`db:migrate` et `db:seed` marchent sur Postgres.** Un seul générateur
de données, deux destinations : `db/seed.mjs` écrit SQLite comme avant,
puis, si `DATABASE_URL` est présent, applique le schéma et copie chaque
table dans Postgres dans l'ordre de déclaration du schéma — qui est un
ordre de dépendances. **Choix** : réécrire les 2 000 lignes du semeur en
asynchrone aurait donné deux générateurs à faire dériver ; la copie en
donne un seul et rend les deux bases identiques, ce qui est ce qui rend
comparable un passage des outils sur l'une et sur l'autre.

**Une vraie carte, sur Adresse et sur Ma fiche.** Leaflet, tuiles
OpenStreetMap, aucune clé d'API. L'adresse tapée est géocodée par
Nominatim derrière notre propre route (`/api/geocode`, qui porte le
User-Agent que la politique d'usage demande et filtre sur le Maroc), le
point se déplace à la main, et les coordonnées partent dans le
brouillon de l'inscription et dans la fiche. Sur Ma fiche, les deux
champs texte « Latitude » et « Longitude » — des nombres qu'un
restaurant ne connaît pas sur lui-même — sont remplacés par la carte.

**Le message « Aucune base de données » disparaît dès qu'une base est
là**, parce que `DATABASE_URL` fait passer `dataMode()` à `db`. Son
texte dit maintenant les deux chemins, `npm run db:reset` en local et
« rattachez une base Postgres » sur un déploiement, au lieu de conseiller
une commande qu'on ne peut pas lancer sur Vercel.

### Trouvé

- **Quatre écrans du Lot 2 débordaient à 390 px** (Réservations, Liste
  clients, Promoteurs, Campagnes) : `walk` à 390 n'avait jamais été
  lancé que sur le Lot 1. Corrigé avant cette étape, noté ici parce que
  c'est ce qui a mis la matrice de vérification à quatre cases.
- **`node:sqlite` rend `changes` sur une écriture, `pg` rend
  `rowCount`** : un appelant lisait `.changes` pour savoir si une mise à
  jour avait touché une ligne. `run()` rend maintenant `{ changes }` sur
  les deux moteurs.
- **Les tuiles et le géocodeur sont injoignables depuis le bac à sable**,
  et une tuile qui échoue écrit dans la console — ce que `walk` compte
  comme un défaut. Les outils ignorent désormais ces deux hôtes, par
  l'URL de la ressource autant que par le texte du message, et rien
  d'autre.
- `npm install` d'une dépendance supprime `playwright`, installé en
  `--no-save`. À réinstaller après chaque ajout de paquet.

### Reste

- La vérification de cette étape : les six outils sur les deux moteurs
  dans les deux lots (Lot 1 SQLite ✓, Lot 1 Postgres ✓, Lot 2 Postgres ✓,
  Lot 2 SQLite en cours au moment d'écrire).
- Les captures de référence n'ont pas été refaites : la carte change
  l'écran Ma fiche et l'étape 3, et il faudra les recapturer à l'étape 4.

---

## Étape 1 — Stabiliser : le parcours d'un vrai partenaire, six fois

### Fait

**Un nouvel outil, `tools/verify/journey.mjs`.** Les six autres lisent
des écrans ; celui-ci s'en sert. Il crée un compte que personne n'a
utilisé, remplit les six étapes — un nom avec un trait d'union et des
accents, un numéro marocain, une vraie photo téléversée par le même
ticket que la production, un point déposé puis **traîné** sur la carte,
une semaine type avec dimanche fermé — puis travaille l'établissement
qu'il vient de créer : les six écrans, chaque formulaire enregistré
**et relu depuis la base**, la déconnexion par le menu du compte, puis
le même travail sur l'établissement du jeu de données, qui a un carnet
plein : flèches de jour, sélecteur de date, onglets de service, puces de
filtre, recherche, accepter, refuser avec motif, check-in, et le
rechargement qui vérifie que la décision a tenu.

**Trois passes propres d'affilée sur ordinateur et trois sur téléphone**,
chacune avec un compte neuf et une base resemée, contre Postgres. Puis
la matrice complète : six outils × deux lots × deux moteurs, plus
`walk` à 390 en lot 1. Tout est vert.

### Trouvé — et corrigé

**1. Le fuseau horaire cassait l'hydratation et affichait les mauvaises
heures.** C'est la trouvaille de la nuit. Le portail formatait ses dates
dans le fuseau du runtime : le serveur Vercel tourne en UTC, Casablanca
est en UTC+1, et le constructeur d'écrans tourne **deux fois** — une
fois sur le serveur pour la première peinture, une fois sur le client
pour la copie optimiste. React voyait « 12h00 – 15h00 » servi sous un
client qui rendait « 13h00 – 16h00 », jetait l'hydratation de trois
écrans (`/restaurant`, `/reservations`, `/check-in`) et repartait en
rendu client ; et un partenaire marocain lisait **toutes ses heures de
service une heure trop tôt**.

Deux moitiés à la correction : `src/lib/time/zone.ts` fixe
`VENUE_TIME_ZONE` (`Africa/Casablanca`, surchargeable par
`NEXT_PUBLIC_VENUE_TZ`) et tous les formateurs passent par
`formatInTimeZone`, donc les deux runtimes produisent la même chaîne ;
et `next.config.js` pose `TZ` pour le serveur, parce que la *logique* de
date — quel jour le carnet affiche, si un service est en cours — n'a de
sens que dans le fuseau de l'établissement. Une heure d'écart faisait
basculer le tableau de bord au lendemain une heure en retard.

**2. Un `setState` pendant le rendu.** `useHydrateRestaurant` écrivait
dans le magasin zustand au milieu du rendu de `RestaurantScreen`, ce qui
met à jour tous les autres abonnés en pleine passe — React nomme la
paire dans son avertissement : « Cannot update a component
(CheckInSheet) while rendering a different component
(RestaurantScreen) ». Le semis part dans un effet ; la première peinture
n'en a pas besoin, elle a la charge utile du serveur.

**3. Pas de recherche sur un téléphone.** La boîte de recherche vit dans
la chrome et chaque écran la « réclame » ; la chrome ne la rendait qu'à
partir de `md:`. Donc Réservations offrait une recherche sur un
ordinateur et **aucune dans la main**, sur un portail dont la règle est
le téléphone d'abord. Elle a maintenant sa ligne sur téléphone, affichée
seulement quand un écran l'a réclamée.

### Trouvé — dans l'outil, pas dans le produit

Noté parce que la prochaine personne qui écrira un test tombera dessus :

- `page.textContent("body")` **inclut le contenu des `<script>`**, donc
  la charge utile RSC, qui porte le « This page could not be found » de
  Next sur *chaque* page : tous les écrans semblaient cassés. C'est
  `innerText` qu'il faut.
- La valeur d'un champ n'est pas du texte de page : elle se lit avec
  `inputValue()`.
- La chrome existe en deux exemplaires, ordinateur et téléphone, donc un
  sélecteur sans `:visible` clique un bouton invisible.
- `/logout` n'existe pas : la déconnexion est un `menuitem` Radix dans le
  kebab du compte.

### Reste

- Les captures de référence ne sont pas refaites (la carte a changé Ma
  fiche et l'étape 3) — à l'étape 4.
- Les graphiques du Lot 2 côté événements (`RevenueChart`,
  `PromoCodeDetailDrawer`) formatent encore dans le fuseau du runtime.
  Ils n'affichent qu'un jour, jamais une heure, et sont hors Lot 1 ; le
  `TZ` du serveur les couvre côté SSR.

---

## Étape 2 — Durcir : les chemins qu'on prend par accident

### Fait

**Un second outil, `tools/verify/edges.mjs`.** `journey.mjs` marche le
chemin prévu ; celui-ci marche les autres : un mot de passe faux, une
adresse qui n'a pas de compte, une session morte avec un formulaire
ouvert, deux tapes sur le même bouton, un réseau qui met une seconde à
répondre, une photo de 12 Mo sortie d'un téléphone, un établissement
vide, un bar. Chaque cas a la même condition de réussite : **le portail
dit ce qui s'est passé, en français, et reste utilisable.**

Les dix cas de la liste, et où ils sont couverts :

| Cas | Où |
|---|---|
| session expirée | `edges` — formulaire ouvert, cookies retirés, enregistrement |
| mot de passe faux | `edges` — et une adresse inconnue, qui ne dit pas si le compte existe |
| double envoi | `edges` — deux clics dans le même tick sur Enregistrer et sur Accepter |
| réseau lent | `edges` — 350 ms sur chaque requête, et la décision doit répondre avant |
| états vides | `journey` — les six écrans du nouvel établissement |
| établissement sans réservation | `journey` — « un carnet vide le dit » |
| configuration bar | `edges` (Nomad Rooftop) et `journey` passe 2, qui s'inscrit comme bar |
| accents français | `journey` — « Amine El Fassi-Ouazzani », « Riad Zitoun n° », « Médina », relus depuis la base |
| téléphone marocain | `journey` — `+212 6 61 22 33 44`, relu tel quel |
| photo hors limite | `edges` — 12 Mo refusés avec la limite nommée |

### Trouvé — et corrigé

**1. Une session expirée perdait la saisie en silence.** Le cas le plus
grave de la nuit. Un partenaire modifie sa fiche, sa session meurt
entre-temps, il appuie sur Enregistrer : le middleware répondait à
l'appel d'action serveur par un **307 vers /login**, le `fetch` de
l'action suivait la redirection, recevait une page HTML au lieu d'un
résultat, et le formulaire n'entendait **ni succès ni échec** — la barre
restait sur « Enregistrement… » indéfiniment et ce qui avait été tapé
était perdu sans un mot.

Deux corrections. Le middleware **laisse passer les actions serveur** :
ce sont les pages qu'il protège, et chaque action garde sa propre porte
(`requireVenueAccess` sur toute écriture liée à un établissement), donc
l'action répond « Session expirée. Reconnectez-vous. » comme *résultat*,
que le formulaire affiche en gardant les valeurs à l'écran. Et
`useOptimisticForm` a désormais un plafond de quinze secondes : une
écriture qui ne répond pas est annoncée comme échouée plutôt que filée
en boucle.

**2. Un bar lisait « Couverts » dans son carnet.** Le tri de
Réservations avait ce libellé en dur — le dernier endroit du carnet qui
parlait encore la langue du restaurant à un lounge. Il passe par
`coverNoun(vocabulary)`, comme le reste de l'écran.

### Reste

- La vérification de l'étape : `journey` et `edges` propres sur les deux
  largeurs, et la matrice complète relancée derrière.

---

## Étape 3 — Brancher l'application grand public

### Fait

Le dépôt `cleanerconnect/LYFE` a été ajouté à la session et lu.
L'application est en deux morceaux : `frontend/`, un client Expo /
React Native, et `backend/`, une API FastAPI dont la source de vérité
est **MongoDB**. Le tableau de bord, lui, écrit dans **Postgres** depuis
l'étape 0. Deux produits, deux langages, deux bases : le même
établissement existait deux fois et personne ne pouvait le dire.

**Ce qui a été écrit — `backend/postgres_dashboard.py`, côté LYFE.** Un
module de 673 lignes qui sert les routes de l'application *depuis la
base du tableau de bord*, via `asyncpg`. Il n'est importé que si
`DATABASE_URL` est présent, et `backend/server.py` enregistre ses
routeurs **avant** le routeur Mongo pour qu'ils gagnent la résolution de
chemin. Sans la variable, l'API se comporte exactement comme avant.

| L'application demande | Servi depuis |
|---|---|
| `GET /api/restaurants` et `/{id}` | `venues`, avec `availability_slots` en `opening_hours`, la première photo de `venue_assets` en `image`, la moyenne de `reviews` en `rating` |
| `POST /api/auth/guest`, `GET /api/auth/me` | une ligne dans `app_sessions` |
| `POST /api/bookings/enhanced` | une ligne `reservations` à l'état `requested` — ce que le carnet affiche comme « À confirmer », avec Accepter et Refuser — plus une ligne `customers` clée sur `app_user_id` et une entrée dans `reservation_status_history` |
| `GET /api/bookings/enhanced` | les mêmes lignes, cycle de vie du tableau de bord traduit vers les cinq statuts de l'application |
| `PUT /api/bookings/enhanced/{id}/status` | un changement d'état que le tableau de bord lit immédiatement |

Le `/api/business/*` du contrat est servi pour la partie dont la charge
utile **est** une table : un établissement (`GET`/`PUT`), ses
disponibilités, le carnet d'une journée, et les cinq décisions sur une
ligne — confirmer, refuser, annuler, no-show, check-in.

**L'interface de l'application n'a pas été touchée.** C'est vérifiable
et non déclaratif : `git diff` sur `frontend/` entre la base et la tête
de branche est **vide**. La référence de ce que les écrans affichent a
été prise dans leur propre code — les formes `Restaurant` et
`BookingEnhanced` que le client analyse — plutôt que redessinée ; le
fichier Figma `yEBXM5UoNTQI7MKc9sMB9y` est le dessin de ces mêmes
écrans, et rien n'en a bougé.

**La preuve — `tools/verify/handshake.mjs`, côté portail.** Un seul
script, de bout en bout, sans fixture :

1. un partenaire s'inscrit sur le tableau de bord, six étapes, dans un
   vrai navigateur ;
2. l'API de l'application liste le nouvel établissement, avec l'adresse,
   le point de la carte et les horaires posés à l'étape 5 ;
3. un invité le réserve par `POST /api/bookings/enhanced` ;
4. la demande apparaît sur Réservations et est comptée sur Accueil, et
   le partenaire l'accepte ;
5. l'application relit la réservation comme `confirmed`, et le carnet
   dit « Confirmée » ;
6. une annulation faite dans l'application se voit sur le tableau de
   bord.

Vingt vérifications, toutes vertes.

### Trouvé — et corrigé

**1. L'insertion dans `reservation_status_history` échouait.** Le module
écrivait une colonne `venue_id` qui n'existe pas : la table est
`from_state` / `to_state` / `actor`, avec une contrainte sur
`venue|user|system`. Les trois insertions ont été réécrites, l'acteur
par défaut étant `venue`.

**2. La référence de réservation était tronquée.** Un `.upper()[-10:]`
coupait le `LYFE-` du début et rendait « YFE-C04AAB » — une référence
que le partenaire ne peut pas rapprocher de celle que l'invité lit dans
l'application. Le `qr_code` est désormais renvoyé entier.

### Choix pris sans pouvoir demander

**`GET /api/business/overview` n'est pas servi depuis Python**, et c'est
une décision plutôt qu'un oubli. C'est un composite que le tableau de
bord assemble à partir des mêmes tables (la salutation, les agrégats,
les services, les zones, le fil d'activité, les avis, les versements) ;
une copie Python de cet assemblage serait une seconde implémentation de
la logique d'un écran, libre de diverger de la première. Le tableau de
bord lit donc Postgres directement — `LYFE_DATA=db`, ce qui est sa
configuration de déploiement — et cette API est la moitié « application »
de la même base. L'option la plus simple qui garde le périmètre.

**Une table ajoutée, `app_sessions`**, créée à la demande par le module
lui-même : l'application a besoin d'une session invité, et le schéma du
tableau de bord n'en a pas — ses comptes sont des comptes partenaires.
Elle est hors du contrat Lot 1, et volontairement minimale.

### Reste

- **`PORTAL_BASE_URL`** doit pointer sur le déploiement du portail : les
  photos appartiennent au tableau de bord (`/api/assets/<clé>`), donc
  une URL d'image doit le désigner. Sans la variable, les images de
  l'application seront relatives et cassées.
- L'API de l'application garde `MONGO_URL` : les routes qui ne sont pas
  dans le tableau ci-dessus restent servies par Mongo. Basculer le reste
  n'était pas demandé.
- Rien n'est déployé côté LYFE. La branche `claude/awesome-heisenberg-klorrv`
  est poussée ; aucune demande de fusion n'a été ouverte.
