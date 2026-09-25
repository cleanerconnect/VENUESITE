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
