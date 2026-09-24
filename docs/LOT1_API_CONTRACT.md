# Contrat backend — Lot 1 · Dashboard basique

À l'attention de l'équipe **DigiNegoce**.

Ce document dit exactement ce que le portail partenaire appelle quand il
tourne en **Lot 1**, écran par écran : la méthode, le chemin, la forme
de la requête, la forme de la réponse, et les tables de `db/schema.sql`
que chaque appel lit ou écrit. Il dit aussi, sans détour, ce qui n'est
pas encore branché — un contrat qui passe sous silence les endroits où
le portail écrit ailleurs qu'appelé serait un contrat qu'on découvre en
recette.

**D'où viennent ces informations.** Elles sont relevées dans le code, pas
dans un backlog :

| Source | Ce qu'elle décide |
|---|---|
| `src/lib/data/http-repository.ts` | Le pilote HTTP : les chemins, les méthodes, les en-têtes. C'est **la** référence. |
| `src/lib/data/repository.ts` | L'interface que tout pilote implémente, et les types des actions. |
| `src/lib/types/business.ts` · `src/lib/types/restaurant.ts` · `src/lib/types/venue-operations.ts` | Les formes de réponse, au champ près. |
| `src/lib/restaurant/screens.ts` (`SCREEN_NEEDS`) | Quel écran demande quelle tranche de données. |
| `src/app/actions/*.ts` | Les écritures, et par où elles passent réellement. |
| `db/schema.sql` | Les tables, telles que le pilote SQLite les lit et les écrit. |

Le Lot 1, c'est la ligne `SP-Prio 02` du classeur
`docs/reference/Planning_Lyfe_V3_20260923.xlsx`, feuille « Détail
Sprint » ligne 40 : *« Mise en place des Dashboards basique
(Authentification + Création de Venue + Gestion des reservation
uniquement) »*. Sept écrans : Connexion, Accueil, Réservations,
Check-in, Ma fiche, Disponibilités, Notifications.

---

## 1. Comment le portail parle à un backend

Un seul fichier connaît le format du fil : `http-repository.ts`. Tout le
reste du portail passe par une interface (`RestaurantRepository`), ce qui
veut dire que si votre service renvoie une autre forme, elle se mappe là
et **nulle part ailleurs**.

- **Racine** : `LYFE_API_BASE_URL`. Tous les chemins ci-dessous s'y
  ajoutent tels quels.
- **Authentification** : `Authorization: Bearer ${LYFE_API_TOKEN}`, sur
  chaque appel.
- **En-têtes** : `Content-Type: application/json`.
- **Cache** : `cache: "no-store"`. Un tableau de bord de service en cours
  ne doit jamais afficher une salle d'il y a cinq minutes.
- **Délai** : 8 000 ms, configurable (`timeoutMs`). Au-delà, le portail
  lève une erreur `504` côté client, pas un écran vide.
- **Erreurs** : tout statut non-2xx est lu comme
  `{ "message": string, "code": string }` et remonté en `RepositoryError`
  avec le statut HTTP. Un `204` est accepté comme réponse vide.
- **Le périmètre vient du jeton, pas de l'URL.** `venue_id` voyage en
  paramètre de requête, mais ce n'est qu'une indication : le service
  doit résoudre le périmètre depuis le jeton et **refuser** un
  `venue_id` que le porteur ne détient pas. Le portail compte sur ce
  refus ; il ne le simule pas.

---

## 2. Les sept écrans, un par un

Les chemins sont donnés tels que le pilote les construit. `{id}` est un
segment de chemin, `venue_id` un paramètre de requête.

### 2.1 Connexion — `/login`

**Aucun appel HTTP au service métier aujourd'hui.** L'identification
passe par un annuaire local (`src/lib/auth/directory.ts`) : soit le
jeu de données statique, soit la base SQLite, jamais le réseau.
`verifyCredentials` compare une adresse et un mot de passe en mémoire.

C'est le premier manque, et il est structurel — voir §5.1.

| Ce qu'il faudra | Méthode | Chemin | Requête | Réponse |
|---|---|---|---|---|
| Échange d'identifiants | à définir | à définir | `{ email, password }` | un jeton + le compte |
| Le compte métier | `GET` | `/api/business/account` | — | `BusinessAccount` |

`GET /api/business/account` **existe déjà dans le pilote** et renvoie
`BusinessAccount` :

```json
{
  "businessId": "biz_…",
  "venueId": "rst_…",
  "ownerId": "usr_…",
  "subscriptionTier": "annual",
  "featuresEnabled": ["reservations", "checkin"]
}
```

Aucun écran ne l'appelle encore. `subscriptionTier` est transporté parce
que la colonne existe : **rien dans le portail ne branche sur sa
valeur**, l'accès aux fonctionnalités passe par `featuresEnabled`, pour
qu'un changement commercial reste un changement de données.

*Tables lues (pilote SQLite)* : `staff`, `venues`, `business_accounts`.

### 2.2 Accueil — `/restaurant`

| # | Méthode | Chemin | Réponse | Rendu en Lot 1 |
|---|---|---|---|---|
| 1 | `GET` | `/api/business/settings?venue_id={id}` | `VenueSettings` | oui (vocabulaire, configuration) |
| 2 | `GET` | `/api/business/overview?venue_id={id}` | `RestaurantOverview` | oui — c'est l'écran |
| 3 | `GET` | `/api/business/service-floor?venue_id={id}` | `ServiceFloor` | **non** (§4) |
| 4 | `GET` | `/api/business/payments?venue_id={id}` | `MoneyDesk` | **non** (§4) |

`RestaurantOverview` est le gros objet. Ses clés, verbatim
(`src/lib/types/restaurant.ts`) :

```
restaurant            RestaurantProfile
greeting              { firstName, salutation, clause, subline }
currentService        Service
zones                 Zone[]
coversToday           { count, deltaPctVsYesterday, series24h[], peakHourLabel }
averageTicket         { amountMad, deltaPctVsLastWeek }
occupancy             { pct, deltaPctVsLastWeek }
noShows               { count, lostRevenueMad }
revenueWeek           { amountMad, deltaPctVsLastWeek, series[] }
rating                { average, reviewCount, deltaVsLastMonth }
nextPayout            { amountMad, scheduledFor }
nudge?                { headline, body, href, ctaLabel }
upcomingReservations  Reservation[]
waitlist              Reservation[]
activity              RestaurantActivityItem[]
topItems              MenuItem[]
reviews               GuestReview[]
services              Service[]
payouts               RestaurantPayout[]
```

**Ce que l'Accueil du Lot 1 rend réellement** : `greeting`,
`currentService`, `upcomingReservations` et le vocabulaire venu de
`settings`. Les trois groupes de l'écran — À traiter, Prochaines
arrivées, Arrivés — sont des tris de `upcomingReservations` par `state`.
Tout le reste de la charge utile (`averageTicket`, `occupancy`,
`revenueWeek`, `rating`, `nextPayout`, `payouts`, `reviews`, `topItems`)
appartient aux écrans du Prio 08 et n'apparaît sur aucun écran du Lot 1 :
un Lot 1 peut renvoyer des zéros ou des tableaux vides sans rien casser.

`Reservation`, la forme qui porte tout l'écran :

```json
{
  "id": "res_…",
  "serviceId": "svc_…",
  "guestName": "Nabil Cherkaoui",
  "guestPhone": "+2126…",
  "partySize": 2,
  "at": "2026-09-24T20:00:00.000Z",
  "state": "requested",
  "channel": "app",
  "zoneId": "zone_…",
  "note": "Demande une table près de la fontaine",
  "visits": 3,
  "vip": false,
  "depositMad": 0,
  "noShowRisk": 0.12
}
```

`state` ∈ `requested` · `confirmed` · `modified` · `arrived` ·
`completed` · `no_show` · `cancelled` · `waitlisted`. L'Accueil ne lit
que les quatre premiers plus `arrived`.

`Service` : `{ id, kind, label, date, opensAt, closesAt, state, capacity,
bookedCovers, arrivedCovers, noShowCovers, revenueMad, slotLoad[] }`.

*Tables lues* : `venues`, `venue_tags`, `venue_settings`, `services`,
`service_definitions`, `service_slot_load`, `zones`, `reservations`
(jointes à `customers`), `waitlist`, `activity`, `analytics_daily`,
`reviews`, `review_replies`, `review_tags`, `payouts`, `menu_items`,
`menu_item_dietary`.

### 2.3 Réservations — `/restaurant/reservations`

| # | Méthode | Chemin | Réponse | Rendu en Lot 1 |
|---|---|---|---|---|
| 1 | `GET` | `/api/business/settings?venue_id={id}` | `VenueSettings` | oui |
| 2 | `GET` | `/api/business/overview?venue_id={id}` | `RestaurantOverview` | oui (la journée du jour) |
| 3 | `GET` | `/api/business/book?venue_id={id}&date=YYYY-MM-DD` | `DayBook` | oui (toute autre journée) |
| 4 | `GET` | `/api/business/payments?venue_id={id}` | `MoneyDesk` | **non** (§4) |

**L'appel `book` part à chaque affichage**, avec la date de l'URL
(`?jour=YYYY-MM-DD`) ou, à défaut, celle du jour. Ce que le constructeur
en fait dépend de la journée : si elle n'est pas aujourd'hui, ou si le
partenaire a choisi un service dans les onglets, les lignes viennent du
`DayBook` ; sinon elles viennent de `overview.upcomingReservations`,
parce qu'aujourd'hui c'est le service en cours avec les compteurs du
moteur. Autrement dit `book` doit répondre juste pour n'importe quelle
date, y compris celle du jour. `DayBook` est volontairement plus petit :

```json
{
  "date": "2026-09-25",
  "services": [ /* Service[] */ ],
  "reservations": [ /* Reservation[] */ ]
}
```

**Les quatre décisions de la ligne** (accepter, refuser avec motif,
check-in, absent) sont la raison d'être de l'écran. Leur état côté
portail est décrit en §5.2 : trois des quatre ne partent pas encore.

*Tables lues* : `reservations`, `customers`, `services`,
`service_definitions`, `venue_settings`.

### 2.4 Check-in — `/restaurant/check-in`

| # | Méthode | Chemin | Requête | Réponse |
|---|---|---|---|---|
| 1 | `GET` | `/api/business/overview?venue_id={id}` | — | `RestaurantOverview` |
| 2 | `GET` | `/api/business/settings?venue_id={id}` | — | `VenueSettings` |
| 3 | `POST` | `/api/business/bookings/check-in` | `{ "qr_code": "…" }` | `CheckInResult` |
| 4 | `POST` | `/api/business/bookings/{id}/check-in` | `{}` — le corps est vide, l'identifiant porte l'appel | `CheckInResult` |

Le code du QR est **opaque au portail** : il est frappé côté application
(EP20-US9), transmis tel quel, jamais analysé ici. C'est le point, pas
une facilité. D'où les deux chemins : avec un code scanné, l'identifiant
de réservation est superflu ; sans code, l'hôte a tapé un nom dans la
liste et c'est l'identifiant qui porte l'appel.

```json
{
  "ok": true,
  "bookingId": "res_…",
  "guestName": "Salma Bennani",
  "partySize": 4,
  "method": "qr",
  "error": null
}
```

`method` ∈ `qr` · `manual`. En échec, `ok: false` et `error` ∈
`unknown_code` · `already_used` · `wrong_venue` · `expired` — quatre
motifs distincts parce que l'écran dit quatre phrases différentes à
l'hôte.

**Attention** : le chemin scanné passe bien par le pilote ; le chemin
« taper un nom » ne passe pas encore (§5.2).

*Tables écrites* : `reservations`, `reservation_status_history`.

### 2.5 Ma fiche — `/restaurant/ma-fiche`

| # | Méthode | Chemin | Réponse | Rendu en Lot 1 |
|---|---|---|---|---|
| 1 | `GET` | `/api/business/venues/{id}` | `RestaurantProfile \| null` | oui (onglet Identité) |
| 2 | `GET` | `/api/business/venues/{id}/availability` | `VenueAvailability` | oui (onglet Horaires) |
| 3 | `GET` | `/api/business/venues/{id}/assets?kind=photo` | `VenueAsset[]` | oui (onglet Photos) |
| 4 | `GET` | `/api/business/overview?venue_id={id}` | `RestaurantOverview` | oui (les zones) |
| 5 | `GET` | `/api/business/settings?venue_id={id}` | `VenueSettings` | oui |
| 6 | `GET` | `/api/business/venues/{id}/menu` | `MenuItem[]` | **non** (§4) |
| 7 | `GET` | `/api/business/venues/{id}/assets?kind=menu_file` | `VenueAsset[]` | **non** (§4) |
| 8 | `GET` | `/api/business/venues/{id}/staff` | `StaffMemberRow[]` | **non** (§4) |

`RestaurantProfile` : `{ id, kind, name, shortName, initials, city,
subline, cuisine, capacity, contactEmail, contactPhone, website,
currency, onboardingCompleted, description, address, latitude?,
longitude?, priceRange, tags[], features[], ambience[] }`. En Lot 1
l'écran n'expose que le premier bloc — nom, description, catégorie,
adresse, coordonnées, contact ; `priceRange`, `tags`, `features` et
`ambience` sont la *fiche curée* du Prio 08.

`VenueAvailability` :

```json
{
  "venueId": "rst_…",
  "slots": [
    { "id": "slot_…", "weekday": 1, "opensAt": "19:00", "closesAt": "23:30",
      "capacity": 60, "enabled": true }
  ],
  "closures": [ { "id": "clo_…", "date": "2026-12-25", "reason": "Noël" } ],
  "updatedAt": "2026-09-24T18:00:00.000Z"
}
```

`weekday` est un jour ISO, 1 = lundi. `updatedAt` est un garde-fou : une
modification concurrente doit être refusée, pas fusionnée.

**Écritures de cet écran** : identité, horaires et photos passent
aujourd'hui *à côté* du pilote (§5.3).

*Tables lues* : `venues`, `venue_tags`, `availability_slots`, `closures`,
`venue_assets`, `zones`, `venue_settings`.
*Tables écrites* : `venues`, `venue_tags`, `availability_slots`,
`closures`, `venue_assets`.

### 2.6 Disponibilités — `/restaurant/disponibilites`

| # | Méthode | Chemin | Requête | Réponse |
|---|---|---|---|---|
| 1 | `GET` | `/api/business/settings?venue_id={id}` | — | `VenueSettings` |
| 2 | `GET` | `/api/business/overview?venue_id={id}` | — | `RestaurantOverview` |
| 3 | `GET` | `/api/business/services/configuration?venue_id={id}` | — | `ServiceConfiguration` |
| 4 | `GET` | `/api/business/venues/{id}/availability` | — | `VenueAvailability` |
| 5 | `POST` | `/api/business/services/configuration?venue_id={id}` | `ConfigurationAction` | `ServiceConfiguration` |
| 6 | `PUT` | `/api/business/zones/{zoneId}?venue_id={id}` | `{ "available": bool }` | `204` |

`ServiceConfiguration` est `{ services: ServiceDefinition[], pacing:
PacingRules }`.

```json
{
  "services": [{
    "id": "svc_…", "name": "Dîner", "kind": "dinner",
    "weekdays": [1,2,3,4,5,6,7],
    "startsAt": "19:00", "endsAt": "23:30", "lastBookingAt": "22:30",
    "capacityCovers": 60, "coversPerQuarter": 8,
    "turnMinutesSmall": 90, "turnMinutesLarge": 120,
    "zoneIds": ["zone_…"], "enabled": true,
    "version": 3, "updatedAt": "2026-09-24T18:00:00.000Z"
  }],
  "pacing": {
    "maxArrivalsPerQuarter": 8, "maxCoversPerService": 120,
    "maxPartyOnline": 8, "minPartyOnline": 1, "requestOnlyAbove": 8,
    "bookingWindowDays": 60, "sameDayCutoff": "17:00",
    "minLeadMinutes": 60, "onlineBookingOpen": true, "reopenAt": null,
    "version": 7, "updatedAt": "2026-09-24T18:00:00.000Z"
  }
}
```

**Les écritures sont versionnées.** Le corps du `POST` est une action
discriminée par `kind`, qui porte le numéro de version lu :

```json
{ "kind": "service.save", "id": "svc_…|null", "name": "Dîner",
  "kindLabel": "dinner", "weekdays": [1,2], "startsAt": "19:00",
  "endsAt": "23:30", "lastBookingAt": "22:30", "capacityCovers": 60,
  "coversPerQuarter": 8, "turnMinutesSmall": 90, "turnMinutesLarge": 120,
  "zoneIds": ["zone_…"], "enabled": true, "expectedVersion": 3 }

{ "kind": "service.remove", "id": "svc_…" }

{ "kind": "pacing.save", "maxArrivalsPerQuarter": 8,
  "maxCoversPerService": 120, "maxPartyOnline": 8, "minPartyOnline": 1,
  "requestOnlyAbove": 8, "bookingWindowDays": 60,
  "sameDayCutoff": "17:00", "minLeadMinutes": 60,
  "onlineBookingOpen": true, "reopenAt": null, "expectedVersion": 7 }
```

Si `expectedVersion` ne correspond plus, le service doit **refuser**
l'écriture, pas fusionner : c'est ce qui décide de ce qui est réservable
maintenant. Le portail sait dire « la donnée a changé entre-temps,
rechargez la page » — c'est le message que `screen-command.ts` rend
quand une écriture lève `StaleWriteError` — et il ne rejoue rien tout
seul.

**Une chose à finir côté portail** : `StaleWriteError` est levée par le
pilote SQLite, pas par le pilote HTTP. Celui-ci remonte tout statut
non-2xx en `RepositoryError` avec son statut et son `code`, donc un
refus pour cause de version se présenterait aujourd'hui à l'hôte comme
une erreur générique. Renvoyez un `409` avec
`{ "code": "stale", "message": "…" }` et la conversion se fait en une
ligne dans `http-repository.ts` ; c'est la réponse que nous attendons.

En Lot 1, l'écran n'expose que trois règles de `pacing` — groupe maximum
en ligne, réservation possible à l'avance, heure limite le jour même —
plus cinq autres derrière « Réglages avancés ». Toutes les autres clés
sont quand même écrites telles que relues : l'action porte l'objet
complet.

*Tables lues/écrites* : `service_definitions`, `service_zones`,
`pacing_rules`, `zones`, `venue_settings`.

### 2.7 Notifications — `/restaurant/notifications`

| # | Méthode | Chemin | Requête | Réponse | Rendu en Lot 1 |
|---|---|---|---|---|---|
| 1 | `GET` | `/api/business/settings?venue_id={id}` | — | `VenueSettings` | oui |
| 2 | `GET` | `/api/business/overview?venue_id={id}` | — | `RestaurantOverview` | oui |
| 3 | `GET` | `/api/business/venues/{id}/notification-preferences` | — | `NotificationPreferences` | oui |
| 4 | `PUT` | `/api/business/venues/{id}/notification-preferences` | `NotificationPreferences` | `NotificationPreferences` | oui |
| 5 | `PUT` | `/api/business/settings?venue_id={id}` | `VenueSettings` | `VenueSettings` | oui (le numéro et l'adresse) |
| 6 | `GET` | `/api/business/marketing?venue_id={id}` | `Marketing` | **non** (§4) |

```json
{
  "venueId": "rst_…",
  "newBooking": ["push", "email"],
  "cancellation": ["push"],
  "guestReminder": ["whatsapp"],
  "review": [],
  "dailySummary": []
}
```

Un canal ∈ `push` · `email` · `whatsapp` — trois valeurs, pas quatre :
il n'y a pas de canal `sms` dans le type, et l'écran n'en propose pas.
Les trois alertes que
le Lot 1 expose sont `newBooking`, `cancellation` et `guestReminder` ;
`review` et `dailySummary` doivent être acceptés et restitués tels quels.

Le numéro et l'adresse qui reçoivent les alertes vivent dans
`VenueSettings.alertPhone` / `alertEmail` — séparés du contact public de
la fiche, parce que le numéro qu'un client appelle pour réserver n'est
pas forcément celui qui doit sonner à 23h.

*Tables lues/écrites* : `notification_preferences`, `venue_settings`.

---

## 3. Le contrat minimal du Lot 1

Ce que votre service doit servir pour que les sept écrans fonctionnent —
**neuf lectures et six écritures** :

| Méthode | Chemin | Écrans |
|---|---|---|
| `GET` | `/api/business/account` | (à brancher, §2.1) |
| `GET` | `/api/business/settings?venue_id=` | les six écrans internes |
| `GET` | `/api/business/overview?venue_id=` | Accueil, Réservations, Check-in, Ma fiche, Disponibilités, Notifications |
| `GET` | `/api/business/book?venue_id=&date=` | Réservations |
| `GET` | `/api/business/venues/{id}` | Ma fiche |
| `GET` | `/api/business/venues/{id}/availability` | Ma fiche, Disponibilités |
| `GET` | `/api/business/venues/{id}/assets?kind=photo` | Ma fiche |
| `GET` | `/api/business/services/configuration?venue_id=` | Disponibilités |
| `GET` | `/api/business/venues/{id}/notification-preferences` | Notifications |
| `POST` | `/api/business/bookings/check-in` | Check-in (scan) |
| `POST` | `/api/business/bookings/{id}/check-in` | Check-in (par nom) |
| `POST` | `/api/business/services/configuration?venue_id=` | Disponibilités |
| `PUT` | `/api/business/settings?venue_id=` | Notifications, Paramètres |
| `PUT` | `/api/business/venues/{id}/notification-preferences` | Notifications |
| `PUT` | `/api/business/zones/{zoneId}?venue_id=` | Ma fiche, Disponibilités |

Et, dès que la gestion des réservations est réellement branchée (§5.2),
les cinq verbes du cycle de vie, déjà écrits dans le pilote :

| Méthode | Chemin | Requête | Réponse |
|---|---|---|---|
| `PUT` | `/api/business/bookings/{id}/confirm` | — | `RestaurantOverview` |
| `PUT` | `/api/business/bookings/{id}/reject` | `{ reason, note }` | `RestaurantOverview` |
| `PUT` | `/api/business/bookings/{id}/cancel` | — | `RestaurantOverview` |
| `POST` | `/api/business/bookings/{id}/no-show` | — | `RestaurantOverview` |
| `POST` | `/api/business/bookings/{id}/remind` | — | `204` |

`reason` est un code, pas du texte libre : `fully_booked` ·
`party_too_large` · `outside_service` · `venue_closed` · `duplicate` ·
`other`. Un motif en texte libre ne s'agrège pas, et c'est la matière
première d'une analyse de qualité de service.

**Une décision de contrat à garder.** Ces mutations renvoient la charge
utile complète plutôt qu'un `204`, pour que le client réconcilie sa copie
optimiste avec ce qui s'est réellement passé au lieu de déclencher un
second appel et de vivre avec une fenêtre où les deux divergent.

---

## 4. Ce que le portail appelle sans l'afficher

Six lectures partent aujourd'hui en Lot 1 et leur charge utile n'atteint
aucun pixel. Elles sont listées ici pour que personne ne les implémente
en croyant qu'un écran en dépend :

| Appel | Demandé par | Pourquoi rien ne s'affiche |
|---|---|---|
| `GET /api/business/service-floor?venue_id=` | Accueil | Le constructeur de l'Accueil ne lit jamais ce bundle — dans aucun des deux lots. |
| `GET /api/business/payments?venue_id=` | Accueil, Réservations | Seuls `hasTransactionSource` et les acomptes en lisent, tous deux derrière une garde Lot 2. |
| `GET /api/business/marketing?venue_id=` | Notifications | Alimente le journal de délivrance, écran Prio 08. |
| `GET /api/business/venues/{id}/menu` | Ma fiche | L'onglet Menu n'existe pas en Lot 1. |
| `GET /api/business/venues/{id}/assets?kind=menu_file` | Ma fiche | La carte fichier est explicitement gardée en `lot === 2`. |
| `GET /api/business/venues/{id}/staff` | Ma fiche | L'onglet Équipe n'existe pas en Lot 1. |

**Ce sont deux endroits à corriger, pas douze** :
`SCREEN_NEEDS` dans `src/lib/restaurant/screens.ts` (filtrer par lot) et
le `Promise.all` de `src/app/(organizer)/restaurant/ma-fiche/page.tsx`.
Tant que ce n'est pas fait, un backend Lot 1 doit répondre quelque chose
à ces six appels — un objet vide conforme au type suffit, le portail a
un repli pour chacun — ou les écrans concernés tomberont sur l'état
d'erreur.

---

## 5. Ce qui n'est pas branché

### 5.1 L'authentification ne parle à aucun service

`src/lib/auth/directory.ts` choisit entre deux annuaires : le jeu
statique et la base SQLite. **Il n'y a pas de troisième branche HTTP.**
Conséquence directe, et elle surprend : en mode `http`, la connexion
utilise encore l'annuaire *base de données*, donc un déploiement
configuré sur votre backend a quand même besoin d'un fichier SQLite
présent pour laisser quelqu'un entrer.

C'est le plus grand manque du Lot 1 et il est sous tous les autres : le
périmètre par établissement, les rôles et l'appartenance viennent tous
de là. Le remplacement est une troisième implémentation de l'interface
`Directory` (quatre méthodes : `listAccounts`, `findByEmail`, `findById`,
`canAccessVenue`), plus l'échange d'identifiants de §2.1. Rien au-dessus
de l'interface ne bouge.

### 5.2 Quatre décisions sur cinq ne partent pas

Sur la ligne de réservation, le portail applique la décision à une copie
locale de la charge utile (`src/lib/restaurant/store.ts`), affiche un
« Annuler » qui restaure la copie précédente, et s'arrête là.

| Décision | Passe par le pilote ? | Où elle atterrit aujourd'hui |
|---|---|---|
| Check-in par scan | **oui** | `POST /bookings/check-in` |
| Check-in en tapant un nom | non | `transitionBooking()`, SQLite en direct |
| Accepter | non | état client uniquement |
| Refuser (avec motif) | non | état client uniquement |
| Absent | non | état client uniquement |
| Annuler | non | état client uniquement |

Les cinq endpoints correspondants **sont écrits et typés** dans le pilote
(§3) ; ce qui manque est l'appel depuis le magasin, avec réconciliation
sur la charge utile renvoyée et retour arrière sur refus. Le mécanisme de
retour arrière existe déjà — c'est à cela qu'il sert.

Tant que ce n'est pas fait : une acceptation rechargée disparaît, et le
même couvert peut être validé deux fois depuis deux navigateurs.

### 5.3 Les formulaires écrivent à côté du pilote

Toutes les écritures de `src/app/actions/venue.ts` appellent les magasins
SQLite directement, sans passer par le dépôt :

| Action | Écrit dans | Devrait appeler |
|---|---|---|
| `saveVenueIdentity` | `venues` | `PUT /api/business/venues/{id}` |
| `saveVenueListing` | `venues`, `venue_tags` | idem |
| `saveSlot` | `availability_slots` | `PUT /api/business/venues/{id}/availability` |
| `saveClosure` · `deleteClosure` | `closures` | idem |
| `confirmUpload` · `removeAsset` · `saveAssetOrder` | `venue_assets` | endpoint d'actifs à définir |
| `saveMenuItem`, `saveStaffInvite`, `saveStaffRole`, `deleteStaff` | `menu_items`, `staff` | hors Lot 1 |

`updateAvailability` (`PUT …/availability`) existe dans le pilote et
n'est appelé par personne. Les écritures d'actifs n'ont pas encore
d'endpoint : le téléversement passe par `requestUpload` /
`confirmUpload`, qui s'appuient sur un pilote d'actifs local
(`src/lib/assets/local-driver.ts`).

En clair : **en mode `http`, Ma fiche affiche vos données et enregistre
les siennes.** C'est le deuxième manque à traiter après
l'authentification.

---

## 6. Correspondance avec ChiffrageV3.0 ligne 39

> **Réserve à lever.** `ChiffrageV3.0` n'est pas dans ce dépôt — le seul
> classeur versionné est `docs/reference/Planning_Lyfe_V3_20260923.xlsx`,
> qui n'a pas de feuille de ce nom, et dont la ligne 39 (« Détail Sprint »
> comme « Planning V3 ») porte autre chose : EP02-US04 d'un côté, la
> ligne Prio 02 de l'autre. La correspondance ci-dessous est donc établie
> avec **les sept endpoints que ce dépôt garde en mémoire du cadrage** —
> le tableau de `docs/INTEGRATION.md` §1 — et avec la table
> `business_accounts` de `db/schema.sql`. Déposez le classeur dans
> `docs/reference/` ou collez la ligne 39 et je reprends la
> correspondance au libellé près.

### 6.1 Les sept endpoints du cadrage, tels que le dépôt les enregistre

| # | Endpoint du cadrage | État dans le pilote HTTP | Différence |
|---:|---|---|---|
| 1 | `GET /restaurants/{id}/overview` | `GET /api/business/overview?venue_id=` | Même charge utile (`RestaurantOverview`). **Le chemin a changé** : préfixe `/api/business`, et l'établissement passe en paramètre de requête, pas en segment. |
| 2 | `POST /restaurants/{id}/reservations/{rid}/seat` | `POST /api/business/bookings/{id}/check-in` | Renommé : « seat » est devenu le check-in, qui est le verbe du produit. Un second chemin sans `{id}` existe pour le scan. |
| 3 | `POST /restaurants/{id}/reservations/{rid}/confirm` | `PUT /api/business/bookings/{id}/confirm` | **Méthode changée** : `PUT`, la confirmation étant idempotente. Aucun appelant aujourd'hui (§5.2). |
| 4 | `POST /restaurants/{id}/reservations/{rid}/cancel` | `PUT /api/business/bookings/{id}/cancel` | Idem. Un `reject` distinct, **absent du cadrage**, a été ajouté : refuser une demande et annuler une réservation confirmée ne sont pas le même acte, et le refus porte un motif codé. |
| 5 | `POST /restaurants/{id}/tables/{tid}/clear` | *aucun* | **Supprimé.** Le plan de salle est un écran Prio 08 ; aucun écran du Lot 1 ne libère une table. |
| 6 | `POST /restaurants/{id}/reservations/{rid}/remind` | `POST /api/business/bookings/{id}/remind` | Même verbe, nouveau préfixe. Aucun appelant. |
| 7 | `POST /restaurants/{id}/reviews/{rid}/reply` | `POST /api/business/reviews/{id}/reply` | Même verbe, nouveau préfixe. **Hors Lot 1** : Avis est Prio 08. |

**Ce que le cadrage ne prévoyait pas et que le Lot 1 exige** : les neuf
lectures et six écritures de §3 — la fiche, les horaires, les photos, la
configuration des services, le pacing, les préférences de notification,
les réglages, le carnet d'une autre journée, et l'absence (`no-show`).
« Création de Venue » et « Gestion des réservations » sont deux des trois
noms de la ligne Prio 02 ; sept endpoints centrés sur une réservation
n'en couvrent qu'un.

`docs/INTEGRATION.md` §1 est donc **périmé sur les chemins** : il décrit
encore `/restaurants/{id}/…`. Le présent document le remplace pour tout
ce qui touche au Lot 1.

### 6.2 `business_accounts`

La table existe dans `db/schema.sql` et le type existe dans
`src/lib/types/business.ts` :

| Colonne | Type TS | Lue par |
|---|---|---|
| `business_id` | `businessId: string` | `businessAccountForUser()` |
| `venue_id` | `venueId: string` | idem |
| `owner_id` | `ownerId: string` | idem |
| `subscription_tier` | `subscriptionTier: string` | **personne** |
| `features_enabled` | `featuresEnabled: string[]` | la porte des fonctionnalités |

Deux choses à dire clairement :

1. **Aucun écran n'appelle encore `GET /api/business/account`.** Le
   compte métier est typé, servi par les trois pilotes, et consommé par
   rien. C'est l'autre face de §5.1 : sans échange d'identifiants, il n'y
   a pas de moment où le portail demande « qui suis-je ».
2. **Il n'y a aucune logique de palier d'abonnement dans le code.** Une
   recherche complète n'en trouve nulle part. `subscription_tier` est
   transporté parce que la colonne existe ; l'accès passe par
   `features_enabled`, pour qu'un changement commercial reste un
   changement de données et pas un déploiement. Si le chiffrage suppose
   du Free/Premium/Enterprise, l'écart est dans le chiffrage, pas ici.

---

## 7. Les tables du Lot 1

Sur les 65 tables de `db/schema.sql`, voici celles que les sept écrans
touchent. Le pilote SQLite est la spécification exécutable de ce que
votre backend doit pouvoir répondre.

| Table | Lue par | Écrite par |
|---|---|---|
| `venues` | Accueil, Ma fiche, Connexion | Ma fiche (identité) |
| `venue_tags` | Accueil, Ma fiche | Ma fiche (fiche, Lot 2) |
| `venue_settings` | les six écrans | Notifications, Paramètres |
| `business_accounts` | Connexion (compte métier) | — |
| `staff` | Connexion (annuaire, périmètre) | Équipe (Lot 2) |
| `reservations` | Accueil, Réservations, Check-in | Check-in, cycle de vie |
| `reservation_status_history` | — | Check-in, cycle de vie |
| `customers` | Accueil, Réservations (jointure) | — |
| `services` · `service_slot_load` | Accueil, Réservations | — |
| `service_definitions` · `service_zones` | Disponibilités, Réservations | Disponibilités |
| `pacing_rules` | Disponibilités | Disponibilités |
| `availability_slots` · `closures` | Ma fiche, Disponibilités | Ma fiche (horaires) |
| `zones` | Accueil, Ma fiche | Ma fiche (disponibilité d'une zone) |
| `venue_assets` | Ma fiche | Ma fiche (photos) |
| `notification_preferences` | Notifications | Notifications |
| `activity` | Accueil (charge utile, non rendu en Lot 1) | — |
| `waitlist` | Accueil (charge utile, non rendu en Lot 1) | — |
| `analytics_daily` · `reviews` · `review_replies` · `review_tags` · `payouts` · `menu_items` · `menu_item_dietary` | Accueil (charge utile, non rendu en Lot 1) | — |
| `notifications` | — (cloche non construite) | — |

Les sept dernières lignes méritent d'être lues deux fois : `overview`
agrège des tables dont le Lot 1 n'affiche rien. Un backend Lot 1 peut
renvoyer des tableaux vides et des zéros pour toutes celles-là — le
portail rend correctement. Ce qui doit être juste, c'est
`greeting`, `currentService`, `services`, `upcomingReservations`,
`zones` et `restaurant`.

---

## 8. Faire tourner le portail en Lot 1 contre votre backend

Trois variables, et un contrôle.

```bash
# 1 · Le lot : sept écrans, pas trente-et-un.
export LYFE_LOT=1

# 2 · Le backend. Les deux ensemble, sinon le portail reste sur ses
#     données locales sans le dire autrement que par /api/health.
export LYFE_API_BASE_URL=https://votre-service/v1
export LYFE_API_TOKEN=…

# 3 · Optionnel mais recommandé en recette : forcer le pilote, pour
#     qu'un fichier SQLite qui traîne ne reprenne pas la main.
export LYFE_DATA=http

npm run build && npm start
```

**Contrôlez, ne supposez pas** :

```bash
curl -s localhost:3000/api/health
# {"status":"ok","lot":1,"lotReason":"…",
#  "adapters":{"data":"http","dataReason":"backend configuré (LYFE_API_BASE_URL)","ai":"mock"}}
```

`"data":"static"` ou `"db"` en production veut dire que le portail sert
des données locales à de vrais partenaires. La règle de choix du pilote
(`src/lib/data/mode.ts`) est : `http` si les deux variables sont
présentes, sinon `db` si un fichier SQLite existe, sinon `static`. Ce
repli est ce qui permet à un clone frais de tourner sans rien ; c'est
aussi ce qui fait qu'un déploiement mal configuré a l'air en bonne santé.

**Trois pièges, dans l'ordre où on les rencontre :**

1. **La connexion a besoin d'une base même en mode `http`** (§5.1).
   Pour une recette de bout en bout : `npm run db:reset` pour un fichier
   SQLite seedé qui sert l'annuaire, pendant que les écrans lisent votre
   service. Ce n'est pas élégant, c'est l'état des lieux.
2. **Répondez aux six appels de §4**, même par un objet vide conforme,
   ou l'Accueil, Réservations, Ma fiche et Notifications tomberont sur
   l'état d'erreur.
3. **Le mode `http` n'est pas couvert par les outils de vérification.**
   `tools/verify/*.mjs` marchent sur `db` et `static`. Pour valider votre
   backend, lancez-les avec `LYFE_LOT=1` contre votre instance — ils
   parcourent les sept écrans, forcent les trois états et vérifient le
   vocabulaire :

   ```bash
   BASE=https://portail-de-recette LYFE_LOT=1 node tools/verify/walk.mjs
   BASE=https://portail-de-recette LYFE_LOT=1 node tools/verify/states.mjs
   ```

**Mapper une autre forme.** Si votre service ne renvoie pas exactement
ces objets, écrivez la conversion dans `http-repository.ts` — une
fonction `mapOverview()`, `mapDayBook()` — et nulle part ailleurs. Tout
l'intérêt de la couture est qu'un seul fichier connaisse le format du
fil ; une conversion répandue dans les écrans est une migration qu'on ne
peut plus faire.
