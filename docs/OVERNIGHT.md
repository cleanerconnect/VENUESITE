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
