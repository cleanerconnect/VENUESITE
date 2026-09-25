# Contrat backend — Lot 1 · Dashboard basique

À l'attention de l'équipe **DigiNegoce**.

Ce document dit exactement ce que le portail partenaire appelle quand il
tourne en **Lot 1**, écran par écran : la méthode, le chemin, la forme
de la requête, la forme de la réponse, et les tables de `db/schema.sql`
que chaque appel lit ou écrit.

**Tout ce qui est décrit ici est appelé.** Le pilote HTTP avait été
écrit, typé, et jamais exécuté ; il tourne maintenant contre un double
du service (§9), et la liste du §3 est celle qu'un parcours réel produit
plutôt qu'une intention. Les trois endroits où le portail écrivait
ailleurs qu'annoncé — l'identité, les décisions sur une réservation, les
formulaires de Ma fiche — sont fermés, et le §5 dit comment, parce qu'un
contrat qui passe cela sous silence est un contrat qu'on découvre en
recette.

**D'où viennent ces informations.** Elles sont relevées dans le code, pas
dans un backlog :

| Source | Ce qu'elle décide |
|---|---|
| `src/lib/data/http-repository.ts` | Le pilote HTTP : les chemins, les méthodes, les en-têtes. C'est **la** référence. |
| `src/lib/data/repository.ts` | L'interface que tout pilote implémente, et les types des actions. |
| `src/lib/auth/directory.ts` | La session : identité, périmètre par établissement, rôles. |
| `src/lib/types/business.ts` · `src/lib/types/restaurant.ts` · `src/lib/types/venue-operations.ts` | Les formes de réponse, au champ près. |
| `src/lib/restaurant/screens.ts` (`screenNeeds`) | Quel écran demande quelle tranche, dans quel lot. |
| `src/app/actions/*.ts` | Les écritures, et par où elles passent réellement. |
| `db/schema.sql` | Les tables, telles que le pilote SQLite les lit et les écrit. |
| `tools/mock-api.mjs` | Une implémentation de ce contrat, exécutable. |

**Les deux documents de périmètre**, tous deux versionnés dans
`docs/reference/` :

- `Planning_Lyfe_V3_20260923.xlsx`, feuille « Détail Sprint » ligne 40 —
  *« Mise en place des Dashboards basique (Authentification + Création de
  Venue + Gestion des reservation **uniquement** ) »*, sprint
  `SP-Prio 02`. C'est ce qui décide des sept écrans : Connexion, Accueil,
  Réservations, Check-in, Ma fiche, Disponibilités, Notifications.
- `DigiNegoce_LYFE_App_ChiffrageV3_0.xlsx`, feuille « Spécifications
  Chiffrage Dét. » ligne 39 — `Restaurant Dashboard`, sept endpoints, la
  collection `business_accounts`, 14 jours dont 8 de backend. C'est ce
  qui décide des chemins. Le §6 la reprend cellule par cellule.

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
- **Le jeton est un jeton de service, pas un jeton de partenaire.**
  Il n'en existe qu'un — `LYFE_API_TOKEN` — et l'identité du partenaire
  voyage en paramètre : `user_id` sur la session, `venue_id` sur les
  appels scopés. Ce paragraphe disait « le service doit résoudre le
  périmètre depuis le jeton » ; avec un seul jeton c'est impossible, et
  l'audit de recette l'a corrigé. Ce qui reste vrai, et qui est une
  obligation des deux côtés :
  - le portail vérifie lui-même, **à chaque écriture**, que le
    partenaire connecté détient l'établissement (`requireVenueAccess`) ;
  - le service doit vérifier que le `venue_id` demandé est bien celui
    d'un partenaire du porteur, parce qu'un seul contrôle est un
    contrôle qu'on oublie ;
  - **ce jeton ne doit jamais être accepté depuis un navigateur.** Il
    n'est lu que dans du code `server-only`, il n'atteint jamais le
    client, et le service devrait refuser une origine navigateur sur ces
    routes.
- **`401` et `403` ne veulent pas dire la même chose.** `401` = « le
  service ne nous connaît pas » ; `403` = « ce partenaire n'a pas le
  droit ». Le portail les traite différemment.

**Et une spécification exécutable :** `docs/lot1-openapi.yaml`, OpenAPI
3.1, validée. Elle est dérivée de `http-repository.ts` et du trafic
réellement observé — 514 appels, 19 endpoints, aucun 404 — et non de ce
markdown. Là où les deux divergeaient, c'est ce fichier-ci qui a été
corrigé. Chaque opération y indique si elle a été observée en trafic ou
seulement lue dans les types.

---

## 2. Les écrans, un par un

Les chemins sont donnés tels que le pilote les construit. `{id}` est un
segment de chemin, `venue_id` un paramètre de requête.

Sept écrans, plus le parcours d'inscription : « Création de Venue » est
l'un des trois mots de la ligne Prio 02, et il n'avait pas d'écran. Il
en a six, en un seul parcours, et ils viennent avant tout le reste —
c'est la porte par laquelle un partenaire entre de lui-même.

### 2.0 Inscription — `/inscription`

Six étapes : **Vous**, **Votre établissement**, **Adresse**, **Photos**,
**Horaires**, **C'est prêt**. Une seule route, un brouillon côté
service, et quatre appels.

| # | Méthode | Chemin | Requête | Réponse |
|---|---|---|---|---|
| 1 | `POST` | `/api/business/onboarding` | `{ fullName, email, phone, password }` | `{ userId, draft }` |
| 2 | `GET` | `/api/business/onboarding/{draftId}` | — | `OnboardingDraft \| null` |
| 3 | `PUT` | `/api/business/onboarding/{draftId}` | un fragment de `OnboardingDraft` | `OnboardingDraft` |
| 4 | `POST` | `/api/business/onboarding/{draftId}/submit` | — | `{ venueId }` |

**Le compte existe dès l'étape 1**, et c'est une décision, pas un
raccourci : l'alternative est de garder un mot de passe quelque part
pendant que les cinq autres étapes se remplissent, et un mot de passe
dans un brouillon est un mot de passe dans une sauvegarde. L'appel 1
crée donc la personne et rend le brouillon de son établissement.
`409 { code: "email_taken" }` si l'adresse a déjà un compte : c'est la
seule erreur de champ du parcours.

```json
{
  "id": "onb_a1b2c3d4",
  "ownerId": "usr_e5f6a7b8",
  "step": 3,
  "venueName": "Le Petit Riad",
  "venueType": "bar",
  "city": "Marrakech",
  "address": "45 rue de la Kasbah, Médina",
  "latitude": 31.6295, "longitude": -7.9811,
  "coverObjectKey": "venues/onb_a1b2c3d4/photo/....jpg",
  "coverContentType": "image/jpeg",
  "coverSizeBytes": 184320,
  "hours": [
    { "weekday": 1, "closed": false, "opensAt": "12:00", "closesAt": "23:00" }
  ],
  "submittedVenueId": null,
  "updatedAt": "2026-09-24T22:10:00.000Z"
}
```

`venueType` est le mot du partenaire — `restaurant` ou `bar` — et il est
traduit en vocabulaire de l'application (`restaurant` / `drinks`) au
moment où l'établissement est créé, pas avant. Le libellé à l'écran est
« Un restaurant » et « Un bar ou lounge » : la seconde moitié de la
ligne du sprint est `Dashboard Drinks/Cellar`, et un rooftop dont le
seul choix se lit « Un bar » se voit imposer un mot qui n'est pas le
sien. **La valeur stockée reste `bar`** — c'est le libellé qui change,
pas l'énumération. `step` est l'étape la plus avancée atteinte : c'est
ce qui fait qu'un onglet fermé ne perd rien, et le portail rouvre le
parcours là où il s'est arrêté plutôt qu'au début.

**`city` est une liste fermée de cinq valeurs** — `Casablanca`,
`Marrakech`, `Rabat`, `Tanger`, `Agadir` — et le service doit la
valider, pas seulement l'écran : une ville saisie librement, c'est cinq
orthographes de Marrakech dans la base au bout d'un mois, et
l'application cherche et regroupe sur cette chaîne. Une valeur hors
liste se refuse en `400 { code: "city_unknown" }` ; c'est ce que fait
`tools/mock-api.mjs`. Ouvrir une sixième ville est une ligne de
constante (`ONBOARDING_CITIES`) et un déploiement.

**L'appel 4 est « Création de Venue » elle-même**, et il doit être
idempotent : un brouillon déjà soumis rend l'établissement qu'il a déjà
créé, jamais un second. Ce que le portail attend qu'il crée, parce que
c'est ce que le pilote SQLite crée et ce dont les sept écrans ont
besoin pour s'afficher :

1. l'établissement (`venues`), avec son nom, son type, sa ville et son
   adresse ;
2. ses réglages (`venue_settings`) — la configuration `restaurant` ou
   `lounge`, que **tous** les écrans lisent pour leur vocabulaire ;
3. l'appartenance du propriétaire (`staff`, rôle `owner`) ;
4. son compte métier (`business_accounts`) ;
5. les alertes par défaut (`notification_preferences`) ;
6. une fenêtre réservable par jour ouvert (`availability_slots`), depuis
   la grille de l'étape 5 ;
7. **une définition de service et le service du jour** — sans elles
   l'Accueil du nouvel établissement n'a pas de service en cours, et
   l'écran ne s'affiche pas du tout. C'est le piège de cet endpoint.

La photo de couverture, si l'étape 4 n'a pas été passée, a été
téléversée sous l'espace du brouillon ; la ligne de média créée à
l'étape 6 pointe sur la même clé, sans déplacer d'octets.

**Ce qui est obligatoire**, et c'est tout : un nom, une adresse e-mail
et un mot de passe de huit caractères pour le compte ; le nom, le type,
la ville et l'adresse pour l'établissement. Le téléphone, le point sur
la carte, la photo et les horaires ont tous une réponse par défaut —
les horaires arrivent pré-remplis en semaine type, 12h00–23h00, ce qui
est déjà valide. L'étape 4 dit à voix haute qu'elle peut être passée.

*Tables écrites (pilote SQLite)* : `partner_accounts`,
`onboarding_drafts`, puis à l'étape 6 `venues`, `venue_settings`,
`staff`, `business_accounts`, `notification_preferences`,
`availability_slots`, `service_definitions`, `services`, et
`venue_assets` si une photo a été ajoutée.

### 2.1 Connexion — `/login`

| # | Méthode | Chemin | Requête | Réponse |
|---|---|---|---|---|
| 1 | `POST` | `/api/business/auth/session` | `{ email, password }` | le compte et ses établissements |
| 2 | `GET` | `/api/business/auth/session?user_id={id}` | — | le même compte, à chaque requête suivante |

L'écran n'a pas d'autre appel : il prend une adresse et un mot de passe,
et ce que le service répond décide de tout le reste — où le partenaire
atterrit, quels établissements il peut ouvrir, et avec quel rôle. La
forme de la réponse et les quatre règles que le service doit respecter
sont au §5.1.

`GET /api/business/account` existe aussi dans le pilote et rend le
`BusinessAccount` de la colonne K de la ligne 39 :

```json
{
  "businessId": "biz_dar_zellij",
  "venueId": "rst_dar_zellij",
  "ownerId": "usr_yassine",
  "subscriptionTier": "annual",
  "featuresEnabled": ["bookings", "availability", "analytics", "crm"]
}
```

Aucun écran ne l'appelle : la session porte déjà ce dont la coquille a
besoin. Il reste au contrat parce que c'est la collection que la ligne 39
nomme, et parce que `featuresEnabled` est la porte des fonctionnalités le
jour où elle servira. `subscriptionTier` est transporté parce que la
colonne existe — **rien dans le portail ne branche sur sa valeur** (§6.5).

*Tables lues (pilote SQLite)* : `staff`, `venues`, `business_accounts`.

### 2.2 Accueil — `/restaurant`

| # | Méthode | Chemin | Réponse | Rendu en Lot 1 |
|---|---|---|---|---|
| 1 | `GET` | `/api/business/settings?venue_id={id}` | `VenueSettings` | oui (vocabulaire, configuration) |
| 2 | `GET` | `/api/business/overview?venue_id={id}` | `RestaurantOverview` | oui — c'est l'écran |
| — | `GET` | `/api/business/service-floor?venue_id={id}` | `ServiceFloor` | **plus appelé en Lot 1** (§4) |
| — | `GET` | `/api/business/payments?venue_id={id}` | `MoneyDesk` | **plus appelé en Lot 1** (§4) |

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
| 3 | `GET` | `/api/business/bookings?venue_id={id}&date=YYYY-MM-DD` | `DayBook` | oui (toute autre journée) |
| — | `GET` | `/api/business/payments?venue_id={id}` | `MoneyDesk` | **plus appelé en Lot 1** (§4) |

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
| — | `GET` | `/api/business/venues/{id}/menu` | `MenuItem[]` | **plus appelé en Lot 1** (§4) |
| — | `GET` | `/api/business/venues/{id}/assets?kind=menu_file` | `VenueAsset[]` | **plus appelé en Lot 1** (§4) |
| — | `GET` | `/api/business/venues/{id}/staff` | `StaffMemberRow[]` | **plus appelé en Lot 1** (§4) |

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
| — | `GET` | `/api/business/marketing?venue_id={id}` | `Marketing` | **plus appelé en Lot 1** (§4) |

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

Ce que votre service doit servir pour que l'inscription et les sept
écrans fonctionnent.
**Tous ces appels sont émis aujourd'hui** par un portail en mode `http` —
c'est la liste qu'un parcours complet produit, pas une intention.

| Méthode | Chemin | Écrans |
|---|---|---|
| `POST` | `/api/business/onboarding` | Inscription · étape 1 |
| `GET` | `/api/business/onboarding/{id}` | Inscription · reprise |
| `PUT` | `/api/business/onboarding/{id}` | Inscription · étapes 2 à 5 |
| `POST` | `/api/business/onboarding/{id}/submit` | Inscription · étape 6 |
| `POST` | `/api/business/auth/session` | Connexion |
| `POST` | `/api/business/auth/password-reset` | Connexion · « Mot de passe oublié ? » |
| `GET` | `/api/business/auth/session?user_id=` | toutes les requêtes — identité, périmètre, rôle |
| `GET` | `/api/business/settings?venue_id=` | les six écrans internes |
| `GET` | `/api/business/overview?venue_id=` | Accueil, Réservations, Check-in, Ma fiche, Disponibilités, Notifications |
| `GET` | `/api/business/bookings?venue_id=&date=` | Réservations |
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
| `PUT` | `/api/business/venues/{id}` | Ma fiche · Identité |
| `PUT` | `/api/business/venues/{id}/availability` | Ma fiche · Horaires |
| `POST` | `/api/business/venues/{id}/assets` | Ma fiche · Photos |

Et les verbes du cycle de vie d'une réservation, qui sont la raison
d'être de l'écran Réservations (§5.2) :

| Méthode | Chemin | Requête | Réponse |
|---|---|---|---|
| `PUT` | `/api/business/bookings/{id}/confirm` | — | `RestaurantOverview` |
| `PUT` | `/api/business/bookings/{id}/reject` | `{ reason, note }` | `RestaurantOverview` |
| `PUT` | `/api/business/bookings/{id}/cancel` | — | `RestaurantOverview` |
| `POST` | `/api/business/bookings/{id}/no-show` | — | `RestaurantOverview` |
| `POST` | `/api/business/bookings/{id}/remind` | — | `204` |

`GET /api/business/account` reste au contrat sans être appelé (§2.1), de
même que `remind` : le rappel la veille est un message que LYFE envoie au
client, et aucun écran du Lot 1 ne le déclenche à la main.

`reason` est un code, pas du texte libre : `fully_booked` ·
`party_too_large` · `outside_service` · `venue_closed` · `duplicate` ·
`other`. Un motif en texte libre ne s'agrège pas, et c'est la matière
première d'une analyse de qualité de service.

**Une décision de contrat à garder.** Ces mutations renvoient la charge
utile complète plutôt qu'un `204`, pour que le client réconcilie sa copie
optimiste avec ce qui s'est réellement passé au lieu de déclencher un
second appel et de vivre avec une fenêtre où les deux divergent.

### 3.1 Ce que la gestion des réservations et la création de venue ajoutent

Quatre changements, et ce qu'ils demandent à un backend. Tout le reste de
ce document reste vrai.

**Un établissement est validé par LYFE avant d'exister dans
l'application.** `venues` porte trois colonnes de plus :

| Colonne | Valeurs | Sens |
|---|---|---|
| `status` | `pending_review` · `validated` · `rejected` | `/inscription` crée un `pending_review`. **Seul un `validated` est listé par l'application.** Le tableau de bord du partenaire fonctionne dans les trois cas. |
| `status_reason` | texte | Le motif du refus, et **la seule chose que le partenaire voit** à son sujet. Vide sauf si `status = 'rejected'`. |
| `status_changed_at` | ISO 8601 | Quand LYFE a décidé. |

L'autorisation est une table, `platform_admins`, et non un rôle
d'établissement : un propriétaire ne doit pas pouvoir valider sa propre
fiche, et un rôle porté par son appartenance à un lieu serait exactement
cela.

| Méthode | Chemin | Requête | Réponse |
|---|---|---|---|
| `GET` | `/api/business/venues/pending` | — | `PendingVenue[]` |
| `PUT` | `/api/business/venues/{id}/validation` | `{ status, reason }` | `PendingVenue[]` — la file après la décision |

`PendingVenue` porte ce qu'il faut pour décider et rien d'autre : `id`,
`name`, `kind`, `city`, `address`, `contactEmail`, `contactPhone`,
`ownerName`, `createdAt`, `hasPhoto`, `openDays`. Les deux derniers sont
des booléens de complétude, pas des photos ni des horaires : la question
est « est-ce un vrai établissement », pas « à quoi ressemble sa fiche ».

**Décaler une réservation**, la quatrième décision sur une ligne :

| Méthode | Chemin | Requête | Réponse |
|---|---|---|---|
| `GET` | `/api/business/venues/{id}/slots?date=YYYY-MM-DD` | — | `BookableSlot[]` — `{ at, serviceLabel }` |
| `PUT` | `/api/business/bookings/{id}/reschedule` | `{ at }` | `RestaurantOverview` |

Trois règles que le backend doit tenir, parce que le portail les tient :

1. **`at` doit être un créneau que `slots` a renvoyé pour son jour.** Le
   portail le vérifie avant d'écrire ; un service qui ne le vérifie pas
   laissera passer une heure que l'application refuserait, et le client
   se présentera devant une table qui n'a jamais été tenue.
2. **L'état ne change pas.** Décaler répond à *quand*, pas à *si* : une
   demande décalée reste une demande en attente de réponse, une
   réservation acceptée reste acceptée. Un décalage qui accepterait
   silencieusement une demande serait l'établissement s'engageant sur une
   table sur laquelle il ne s'est pas engagé.
3. **Le client est prévenu par le même appel.** Une réservation déplacée
   sans que le client le sache est le mode de défaillance de cette
   fonctionnalité, et en faire deux appels est ce qui permet d'oublier le
   second. Le portail écrit une ligne `messages_log` de type
   `reservation_decalee`.

**Chercher une réservation dans tout le carnet**, et non filtrer la
journée affichée :

| Méthode | Chemin | Réponse |
|---|---|---|
| `GET` | `/api/business/venues/{id}/bookings/search?q=` | `Reservation[]` |

Trois entrées, parce que ce sont les trois choses qu'un hôte a en main :
un **nom** (insensible à la casse, n'importe où dedans), un
**téléphone** — comparé **chiffres seuls**, ce qui est ce qui fait que
`4418` trouve `+212 661 20 44 18`, les quatre derniers chiffres étant la
façon dont un client relit son numéro au téléphone — et une **date**
(`2026-09-25` ou `25/09`). Le portail groupe le résultat par jour.

**La durée d'un créneau est choisie par l'établissement**, par service :

| Colonne | Valeurs | Sens |
|---|---|---|
| `service_definitions.slot_minutes` | `15` · `30` · `60` | La grille sur laquelle ce service place ses réservations. Réservations groupe ses lignes dessus, la courbe de charge est découpée dessus, **et l'application doit proposer ses créneaux dessus** — sinon les deux produits ne s'accordent pas sur ce qui est réservable. |

Par défaut `30`, qui est la valeur que les deux produits supposaient
avant que le champ existe : rien de déjà réservé n'est redécoupé.

**Le client sur la ligne et dans le tiroir.** `GET
/api/business/overview` et `GET /api/business/bookings` doivent porter,
sur chaque réservation, `guestEmail` et `guestBirthYear` en plus de ce
qu'elles portaient — tous deux **facultatifs**, parce que l'application
les demande dans un profil que personne n'est obligé de remplir. Le
portail ne dessine pas la ligne quand la valeur manque : un « — » dans un
champ Âge se lit comme un fait sur le client.

### 3.2 Les données personnelles, et qui en répond

Le Lot 1 affiche, sur une réservation, les données que l'application a
déjà collectées auprès du client. Il n'en saisit aucune et n'en
conserve aucune de son propre chef : la base appartient au service. La
loi 09-08 et les délibérations de la CNDP demandent malgré tout que la
finalité de chaque champ soit écrite, et que la durée de conservation
soit effective — pas seulement paramétrable. Voici l'inventaire et les
deux obligations qui restent au service.

| Champ | Finalité, en une phrase | Qui l'a collecté |
|---|---|---|
| `guestName` | Appeler la table par son nom à l'arrivée. | L'application, au compte |
| `guestPhone` | Joindre le client pour confirmer, décaler ou relancer — le seul geste qu'un hôte fait d'une réservation en dehors de l'écran. | L'application, au moment de réserver |
| `guestEmail` | Joindre le client quand le téléphone ne répond pas. | L'application, au compte |
| `partySize` | Placer la table. | L'application |
| `note` | Honorer la demande : allergie, occasion, préférence de salle. | L'application |
| `visits` | Reconnaître un habitué. Dérivé, jamais saisi. | Calculé |
| `guestBirthYear` | **Aucune finalité déclarée, et aucun produit LYFE ne le collecte aujourd'hui.** Le portail affiche l'âge quand le champ arrive et ne dessine rien quand il manque. | personne |

Deux conséquences, et elles sont fermes :

1. **`note` peut contenir une donnée de santé.** « Sans gluten pour deux
   couverts », « allergie aux fruits de mer » : au sens de la loi 09-08
   c'est une donnée sensible, qui demande le consentement explicite du
   client et un traitement plus strict que le reste. Le champ est
   nécessaire — un restaurant qui ne le voit pas empoisonne quelqu'un —
   mais le consentement se recueille dans l'application, au moment où le
   client l'écrit, et pas dans ce portail.
2. **`guestBirthYear` ne doit pas être envoyé** tant qu'un produit ne le
   collecte pas avec une finalité écrite et un consentement. Le portail
   n'est pas une raison de le collecter.

**La conservation n'est pas appliquée.** `venue_settings.retention_months`
existe, se règle dans Paramètres, se stocke, et **rien ne la lit** : aucun
travail planifié, aucune requête, rien ne supprime ni n'anonymise un
client après le délai. C'est au service de le faire, et voici la requête
qu'il doit exécuter — anonymiser plutôt que supprimer, pour que les
comptes d'un service passé restent justes :

```sql
-- Anonymise les clients d'un établissement qui n'ont plus réservé
-- depuis `retention_months`. Les réservations restent, comptées et
-- sans nom.
UPDATE customers AS c
   SET full_name = 'Client anonymisé',
       phone     = '',
       email     = '',
       birth_year = NULL,
       app_user_id = NULL
 WHERE c.venue_id = $1
   AND NOT EXISTS (
     SELECT 1 FROM reservations r
      WHERE r.customer_id = c.id
        AND r.at > $2   -- now() - retention_months
   );

UPDATE reservations
   SET guest_name = 'Client anonymisé', guest_phone = '', note = NULL
 WHERE venue_id = $1 AND at <= $2;
```

Le droit d'accès et le droit de rectification se servent des mêmes
endpoints que le tableau de bord ; le droit de suppression a besoin de
la requête ci-dessus, déclenchée à la demande sur un client nommé. Le
portail n'a pas d'écran pour cela en Lot 1 : la Fiche client, où il
vivrait, est `SP-Prio 08`.

---

## 4. Ce que le portail n'appelle plus

Six lectures partaient en Lot 1 et leur charge utile n'atteignait aucun
pixel. Elles sont coupées :

| Appel | Demandé par | Pourquoi rien ne s'affichait |
|---|---|---|
| `GET /api/business/service-floor?venue_id=` | Accueil | Le constructeur de l'Accueil ne lit jamais ce bundle — dans aucun des deux lots. |
| `GET /api/business/payments?venue_id=` | Accueil, Réservations | Seuls `hasTransactionSource` et les acomptes en lisent, tous deux derrière une garde Lot 2. |
| `GET /api/business/marketing?venue_id=` | Notifications | Alimente le journal de délivrance, écran Prio 08. |
| `GET /api/business/venues/{id}/menu` | Ma fiche | L'onglet Menu n'existe pas en Lot 1. |
| `GET /api/business/venues/{id}/assets?kind=menu_file` | Ma fiche | La carte fichier est explicitement gardée en `lot === 2`. |
| `GET /api/business/venues/{id}/staff` | Ma fiche | L'onglet Équipe n'existe pas en Lot 1. |

Deux endroits, tous deux commentés : `screenNeeds()` dans
`src/lib/restaurant/screens.ts` filtre les tranches par lot, et le
`Promise.all` de `src/app/(organizer)/restaurant/ma-fiche/page.tsx` ne
demande la carte, son fichier et l'équipe qu'en Lot 2.

**Ce qu'un parcours complet appelle aujourd'hui**, relevé dans le journal
du serveur double (§9) après un passage sur les sept écrans des deux
établissements :

```
27 GET /api/business/settings          (vocabulaire et configuration)
13 GET /api/business/overview
 5 GET /api/business/venues/{id}...    (fiche, horaires, photos, préférences)
 5 GET /api/business/auth/session
 2 GET /api/business/services/configuration
 2 GET /api/business/bookings
 1 POST /api/business/auth/session
```

Aucun 4xx, aucun 5xx, et pas une seule des six lectures ci-dessus. Les
vingt-sept lectures de `settings` sont deux par page — la coquille la lit
pour la configuration, l'écran pour son vocabulaire ; c'est un cache à
ajouter, pas un endpoint de plus.

## 5. Ce qui était branché à côté, et ne l'est plus

Ce document a décrit pendant une passe trois manques qui faisaient du
Lot 1 un front-end démontrable et pas un front-end branchable. Ils sont
fermés. Ce qui suit dit comment, pour que la revue porte sur le bon
code.

### 5.1 L'authentification parle au service

`src/lib/auth/directory.ts` avait deux implémentations — le jeu statique
et SQLite — et le mode `http` retombait sur la seconde : un déploiement
pointé sur votre backend lisait *vos* réservations et résolvait
l'identité, le périmètre et les rôles dans une base locale. Signer
demandait donc un fichier SQLite même branché sur un service.

Il y a maintenant une troisième branche, choisie par la même règle que
la couche de données. Un seul endpoint la sert :

| Méthode | Chemin | Corps | Réponse |
|---|---|---|---|
| `POST` | `/api/business/auth/session` | `{ email, password }` | le compte |
| `GET` | `/api/business/auth/session?user_id=` | — | le compte |
| `GET` | `/api/business/auth/session?email=` | — | le compte |

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

Trois choses en découlent sans rien d'autre à tenir à jour : **qui** est
connecté, **quels établissements** il détient, et **avec quel rôle**. Le
portail ne demande rien de plus : le périmètre par établissement est ce
tableau `venues`, et le rôle décide de ce que chaque écran laisse faire.

Quatre règles que le service doit respecter :

1. **Un refus est un refus muet.** Une adresse inconnue et un mauvais mot
   de passe doivent répondre la même chose — un `401` suffit — sinon le
   formulaire devient un moyen de savoir quels partenaires ont un compte.
   Le portail affiche une seule phrase dans les deux cas.
2. **Le `GET` est appelé à chaque requête.** Le portail mémorise la
   réponse cinq secondes, pas plus : un rôle retiré prend effet presque
   tout de suite, et une navigation ne coûte pas cinq allers-retours.
3. **Un `venue_id` que le compte ne détient pas doit être refusé**, pas
   servi. Le portail re-vérifie l'accès à chaque écriture, mais l'autorité
   est le service.
4. **Le jeton est un jeton de service** (`LYFE_API_TOKEN`), pas une
   session utilisateur. Si vous voulez des sessions par partenaire, le
   `POST` est l'endroit où en rendre une ; la branche HTTP du portail est
   le seul fichier à changer.

La vérification des identifiants elle-même appartient au service dès
qu'il est configuré : les couples adresse/mot de passe de
`src/lib/auth/accounts.ts` sont un jeu de fixtures sans contrepartie en
production, et ils ne sont plus consultés dans ce mode.

### 5.1 bis « Mot de passe oublié ? » demande vraiment

Le lien sous le formulaire de connexion répondait « un lien de
réinitialisation vient d'être envoyé » sans que rien n'ait été prié
d'envoyer quoi que ce soit. Il passe maintenant par le pilote, comme
toute autre écriture.

| Méthode | Chemin | Requête | Réponse |
|---|---|---|---|
| `POST` | `/api/business/auth/password-reset` | `{ email }` | `204` |

Trois règles, et elles comptent :

1. **La même réponse pour une adresse connue et une adresse inconnue.**
   Un `404` sur une adresse absente transformerait ce formulaire en
   annuaire des partenaires de LYFE. `204` dans les deux cas.
2. **`422` uniquement si ce n'est pas une adresse** — une chaîne sans
   `@`. C'est une erreur de saisie, pas un verdict sur le compte.
3. **Le portail n'affiche jamais « envoyé » sans avoir reçu le `204`.**
   Un déploiement sans service derrière (pilote `db` ou `static`) dit
   au partenaire de passer par « Nous contacter » plutôt que de le
   laisser attendre un e-mail qui n'arrivera pas.

Le lien lui-même — sa durée de vie, son usage unique, l'écran qui
accepte le nouveau mot de passe — appartient au service. Le portail ne
sert pas d'écran de réinitialisation en Lot 1 : `Planning V3` ligne 39
ne prévoit le bouton « mot de passe oublié » que pour l'organisateur
côté Events, et le prévoir ici tient de l'anticipation raisonnable, pas
du périmètre acheté.

### 5.2 Les cinq décisions partent

Sur la ligne de réservation, le portail appliquait la décision à une
copie locale de la charge utile, offrait un « Annuler », et s'arrêtait
là. Une acceptation rechargée disparaissait, et deux hôtes sur deux
pupitres pouvaient accepter la même demande.

Chacune est maintenant une action serveur qui passe par le pilote, **et
garde la mise à jour optimiste** : l'écran répond au doigt, l'écriture
part derrière, et si le service la refuse la copie précédente est
restaurée et l'hôte lit pourquoi. Le mécanisme de retour arrière
existait déjà — c'est à cela qu'il servait.

| Décision | Endpoint | Vérifié |
|---|---|---|
| Accepter | `PUT /bookings/{id}/confirm` | ✅ `PUT …/res_010/confirm → 200`, et la ligne revient « Confirmée » après rechargement |
| Refuser | `PUT /bookings/{id}/reject` + `{ reason }` | ✅ `PUT …/res_010/reject → 200`, motif codé transmis |
| Check-in par scan | `POST /bookings/check-in` + `{ qr_code }` | ✅ déjà branché avant cette passe |
| Check-in par nom | `POST /bookings/{id}/check-in` | ✅ `POST …/res_001/check-in → 200` ; passait par SQLite en direct |
| Absent | `POST /bookings/{id}/no-show` | ✅ même chemin de code que les trois premières ; non cliquable à l'heure du test — « Absent » n'apparaît qu'une fois le créneau passé |
| Annuler | `PUT /bookings/{id}/cancel` | ✅ même chemin de code |

Le pilote SQLite, lui, ne persistait ni l'acceptation, ni l'annulation,
ni le refus : les trois méthodes rendaient la charge utile sans rien
écrire. Elles appellent maintenant `transitionBooking`, qui écrit l'état
**et** l'historique. Le refus écrit `rejected`, pas `cancelled` — le
schéma dit que les deux ne doivent jamais être confondus, parce qu'un
refus porte un motif et une annulation non.

### 5.3 Les formulaires de Ma fiche écrivent par le pilote

Toutes les écritures de `src/app/actions/venue.ts` appelaient les
magasins SQLite sans passer par le dépôt : en mode `http`, Ma fiche
affichait vos données et enregistrait les siennes.

| Formulaire | Endpoint | Vérifié |
|---|---|---|
| Identité | `PUT /api/business/venues/{id}` | ✅ `PUT …/rst_dar_zellij → 200` |
| Fiche (Lot 2) | `PUT /api/business/venues/{id}/listing` | par le même chemin de code |
| Horaires | `PUT /api/business/venues/{id}/availability` | endpoint 6 de la ligne 39, en lecture-modification-écriture |
| Photos | `POST /api/business/venues/{id}/assets` | action discriminée : `asset.record` · `asset.remove` · `asset.reorder` |

Deux conséquences utiles. Le garde-fou « lancez `db:reset` » ne s'applique
plus à ces formulaires : chaque pilote répond, et le jeu statique retient
la modification dans une superposition par processus, exactement comme il
le faisait déjà pour un check-in — donc un clone froid peut démontrer les
formulaires. Et la carte et l'équipe, qui sont les écrans Menu et Équipe
du Lot 2 et non Ma fiche, écrivent toujours SQLite en direct : ce sont
les deux dernières surfaces qui ne traversent pas la couture, et elles
sont hors Lot 1.

### 5.4 L'inscription passe par les quatre endpoints

Le parcours de `/inscription` n'a pas de chemin court : chaque étape
écrit par le pilote, comme le reste du Lot 1. En mode `http`, contre le
service factice de `tools/mock-api.mjs`, un parcours complet se lit dans
son journal — c'est la trace du test, pas une intention :

| Étape | Appel | Vérifié |
|---|---|---|
| 1 · le compte | `POST /api/business/onboarding` | ✅ `→ 200`, rend `{ userId, draft }` |
| reprise | `GET /api/business/onboarding/{id}` | ✅ `→ 200`, l'étape atteinte et les réponses |
| 2 à 5 | `PUT /api/business/onboarding/{id}` | ✅ quatre `→ 200`, un par étape enregistrée |
| 6 · la venue | `POST /api/business/onboarding/{id}/submit` | ✅ `→ 200`, rend `{ venueId }` ; l'Accueil de la nouvelle venue s'affiche derrière |

`tools/verify/inscription.mjs` est ce qui produit cette trace : il
marche les six étapes, ferme et rouvre le parcours, puis vérifie que
l'atterrissage salue le nouveau partenaire sur son établissement. Il
passe en lot 1 et en lot 2, en 1440 et en 390, en `db` et en `http`.

### 5.5 L'application grand public lit les mêmes tables

Le contrat ci-dessus décrit ce que le **portail** demande à un backend.
Il a depuis un second lecteur : l'application grand public
(`cleanerconnect/LYFE`, client Expo sur une API FastAPI), dont
`backend/postgres_dashboard.py` sert les routes depuis **la base du
portail**, en `asyncpg`, quand `DATABASE_URL` est présent.

Ce qui compte pour qui implémentera ce contrat : **les tables de la §7
sont désormais partagées**, et deux conventions y sont devenues
publiques.

**Une réservation venue de l'application** est une ligne `reservations`
à l'état `requested`, `channel = 'LYFE'`, une référence `qr_code` de la
forme `LYFE-XXXXXX`, accompagnée d'une ligne `customers` clée sur
l'identifiant d'utilisateur de l'application et d'une entrée dans
`reservation_status_history` dont l'`actor` est `user`. C'est exactement
ce que le carnet affiche comme « À confirmer », avec Accepter et
Refuser ; aucun chemin particulier n'existe pour ces lignes.

**Le vocabulaire des états est traduit, pas exposé.** Le portail sépare
volontairement `rejected` (l'établissement a refusé, avec un motif) de
`cancelled` (l'invité s'est désisté, sans motif) ; l'application n'a
qu'un mot pour les deux, et c'est celui que ses écrans dessinent depuis
toujours. La traduction se fait côté application :

| portail | application |
|---|---|
| `requested`, `waitlisted` | `pending` |
| `confirmed`, `modified` | `confirmed` |
| `arrived`, `completed` | `completed` |
| `cancelled`, `rejected` | `cancelled` |
| `no_show` | `no_show` |

**Une table hors contrat, `app_sessions`**, est créée à la demande par
ce module : l'application ouvre des sessions invité, et le schéma du
portail ne connaît que des comptes partenaires. Elle n'est lue ni écrite
par aucun des sept écrans.

**`GET /api/business/overview` n'est pas servi par cette API**, et ce
n'est pas un oubli : c'est le seul endpoint du contrat dont la charge
utile n'est pas une table mais un assemblage d'écran. Un backend qui
implémente ce contrat l'implémente une fois, pour le portail ; en
déploiement partagé le portail lit Postgres directement (`LYFE_DATA=db`)
et l'application ne lui demande rien.

`tools/verify/handshake.mjs` vérifie la chaîne entière en un script :
inscription dans un vrai navigateur, l'établissement listé par
l'application, une réservation posée par un invité, la demande comptée
sur l'Accueil du partenaire, l'acceptation, et le même statut relu des
deux côtés.

## 6. Correspondance avec ChiffrageV3.0 ligne 39

Le classeur est versionné : `docs/reference/DigiNegoce_LYFE_App_ChiffrageV3_0.xlsx`.
La ligne 39 de la feuille **« Spécifications Chiffrage Dét. »**, colonne
par colonne, et ce que le portail en fait.

### 6.1 La ligne, cellule par cellule

| Col. | Intitulé | Valeur ligne 39 | État dans le portail |
|---|---|---|---|
| A | Catégorie | `ADMIN` | — |
| B | Écran/Composant | `Restaurant Dashboard` | Les sept écrans du §2 |
| C | Version | `Beta` | Lot 1, sprint Prio 02 |
| D | Type | `Écran (Business)` | Portail partenaire séparé, pas l'app cliente |
| E | Fonctionnalité | `Dashboard restaurant partenaire` | ✅ |
| F | Boutons/Actions | huit actions | six en Lot 1, deux en Prio 08 — voir §6.3 |
| G | Flow Utilisateur | `Separate business app/web` · `Login restaurant → Dashboard → Réservations list → Actions` · `Analytics temps réel` | Le flow est exactement celui-là ; « Analytics temps réel » est Prio 08 |
| H | Endpoints Backend (FastAPI) | sept endpoints | **7/7 alignés**, 6/7 appelés en Lot 1 — voir §6.2 |
| I | Microservice | `Business Service` | `LYFE_API_BASE_URL` pointe sa racine |
| J | Collections PostgreSQL | `business_accounts` | Une collection nommée, vingt tables nécessaires — voir §6.4 |
| K | Champs Principaux | `business_id, venue_id, owner_id, subscription_tier, features_enabled` | `BusinessAccount`, au champ près |
| L | Estimation FE | `4 j` | Le front-end existe : les sept écrans sont rendus et branchés sur le pilote |
| M | Estimation BE | `8 j` | Le travail restant, et ce document en est la spécification |
| N | Estimation DB | `2 j` | Voir §7 pour ce que les écrans lisent et écrivent réellement |
| O | Estimation Totale | `14 j` | — |
| P | Complexité | `Complexe` | — |
| Q | Notes Techniques | `QR scanner app, analytics dashboards (Chart.js), revenue tracking, subscription tiers (Free/Premium/Enterprise), notification système nouvelles réservations` | Voir §6.5 |

### 6.2 Les sept endpoints de la colonne H

Ils sont recopiés ici tels quels, puis comparés au pilote
(`src/lib/data/http-repository.ts`).

| # | Ligne 39 | Pilote HTTP | Écart |
|---:|---|---|---|
| 1 | `GET /api/business/bookings?venue_id=&date=` | `GET /api/business/bookings?venue_id=&date=` | **Aucun.** Le pilote écrivait `/book` ; il a été renommé pour coller à la ligne. Rend un `DayBook` (§2.3). |
| 2 | `PUT /api/business/bookings/{id}/confirm` | `PUT /api/business/bookings/{id}/confirm` | **Aucun.** Appelé par « Accepter » depuis cette passe. |
| 3 | `PUT /api/business/bookings/{id}/reject` | `PUT /api/business/bookings/{id}/reject` | Chemin identique. **Le corps est un ajout** : `{ reason, note }`, où `reason` est un code — `fully_booked`, `party_too_large`, `outside_service`, `venue_closed`, `duplicate`, `other`. La ligne dit « Accepter/Refuser » sans dire avec quoi ; un motif en texte libre ne s'agrège pas. |
| 4 | `POST /api/business/bookings/{id}/check-in {qr_code}` | `POST /api/business/bookings/{id}/check-in` avec `{ qr_code }` | Chemin et corps identiques. **Un second chemin s'y ajoute** : `POST /api/business/bookings/check-in`, sans identifiant, pour un code scanné qui identifie la réservation à lui seul. |
| 5 | `POST /api/business/bookings/{id}/no-show` | `POST /api/business/bookings/{id}/no-show` | **Aucun.** Appelé par « Absent ». |
| 6 | `PUT /api/business/venues/{id}/availability` | `PUT /api/business/venues/{id}/availability` | **Aucun.** Appelé par les horaires de Ma fiche, en lecture-modification-écriture sur l'objet complet. |
| 7 | `GET /api/business/analytics?venue_id=` | `GET /api/business/analytics?venue_id=&period=` | Chemin identique, **`period` ajouté** (`7d` · `30d` · `90d` · `12m`). **Aucun écran du Lot 1 ne l'appelle** : les chiffres sont Performance et Bilans, Prio 08. |

Autrement dit : les sept chemins de la ligne 39 sont ceux du pilote, et
six des sept sont appelés par les écrans du Lot 1. C'est la bonne
nouvelle du document.

**Ce que la ligne 39 ne prévoit pas et que le Lot 1 exige.** Trois de ses
mots — « Authentification », « Création de Venue » de la ligne Prio 02 du
Planning V3, et la session que suppose son propre flow « Login
restaurant → … » — n'ont pas d'endpoint dans la colonne H. Il en faut
**neuf de plus**, tous déjà écrits dans le pilote :

| Méthode | Chemin | Pourquoi la ligne 39 ne l'a pas |
|---|---|---|
| `GET`/`POST` | `/api/business/auth/session` | Son flow commence par « Login restaurant » sans dire contre quoi. C'est la session : qui vous êtes, quels établissements vous détenez, avec quel rôle. |
| `GET` | `/api/business/overview?venue_id=` | La charge utile du tableau de bord. La ligne nomme la liste des réservations, pas l'écran qui les résume. |
| `GET`/`PUT` | `/api/business/settings?venue_id=` | La configuration de l'établissement — restaurant ou lounge — qui décide du vocabulaire, et les coordonnées qui reçoivent les alertes. |
| `GET`/`PUT` | `/api/business/venues/{id}` | « Création de Venue » : le dossier lui-même. |
| `GET`/`POST` | `/api/business/venues/{id}/assets?kind=photo` | Les photos de la fiche. |
| `GET`/`POST` | `/api/business/services/configuration?venue_id=` | Les services, leur capacité, leur cadence et la fenêtre de réservation. La ligne 39 dit « Modifier disponibilités » et ne couvre, par son endpoint 6, que les horaires d'ouverture. |
| `GET`/`PUT` | `/api/business/venues/{id}/notification-preferences` | L'alerte « nouvelle réservation » de la colonne Q, côté réglage. |
| `PUT` | `/api/business/zones/{zoneId}?venue_id=` | Ouvrir ou fermer une zone — terrasse, patio — sans toucher au service. |
| `PUT` | `/api/business/bookings/{id}/cancel` | Annuler une réservation confirmée. La ligne 39 a `reject` pour refuser une demande ; annuler une table déjà confirmée est un autre acte, et le schéma garde les deux états séparés. |

`POST /api/business/bookings/{id}/remind` et `GET /api/business/account`
existent aussi dans le pilote ; aucun écran du Lot 1 ne les appelle
aujourd'hui.

### 6.3 Les huit actions de la colonne F

| Action ligne 39 | Où elle est | État |
|---|---|---|
| `Voir réservations du jour` | Accueil et Réservations | ✅ |
| `Accepter/Refuser réservation` | Accueil et Réservations | ✅ passe par le pilote |
| `Marquer présence (QR scan)` | Check-in | ✅ scan **et** par nom |
| `Signaler no-show` | Accueil et Réservations | ✅ passe par le pilote |
| `Modifier disponibilités` | Disponibilités et Ma fiche · Horaires | ✅ |
| `Voir analytics: Taux remplissage, revenue estimé, taux no-show` | Performance, Bilans | ⛔ **Prio 08** |
| `Promouvoir restaurant (boost listing)` | Visibilité | ⛔ **Prio 08** |
| `Répondre reviews` | Avis | ⛔ **Prio 08** |

C'est le seul désaccord de fond entre les deux documents, et il vaut
d'être dit clairement : la ligne 39 met les analyses, la mise en avant et
la réponse aux avis dans la même cellule que la gestion des
réservations, alors que la ligne Prio 02 du `Planning V3` dit
« Authentification + Création de Venue + Gestion des reservation
**uniquement** ». Le portail suit le second : ces trois surfaces sont
construites et rendues, mais elles vivent en Lot 2 et aucun écran du
Lot 1 n'y mène. Si le chiffrage l'entend autrement, c'est une décision
de périmètre à prendre — pas un manque de code.

### 6.4 `business_accounts` (colonnes J et K)

La colonne K donne cinq champs. Le type les porte tous, au nom près :

| Colonne K | `BusinessAccount` (`src/lib/types/business.ts`) | Lu par |
|---|---|---|
| `business_id` | `businessId: string` | `GET /api/business/account` |
| `venue_id` | `venueId: string` | idem |
| `owner_id` | `ownerId: string` | idem |
| `subscription_tier` | `subscriptionTier: string` | **personne** — voir §6.5 |
| `features_enabled` | `featuresEnabled: string[]` | la porte des fonctionnalités |

La colonne J nomme **une** collection. Les sept écrans en lisent ou en
écrivent **vingt** (§7) : les réservations et leur historique d'états,
les clients, l'établissement et ses étiquettes, ses services et leur
charge, ses créneaux, ses jours de fermeture, ses zones, ses médias, ses
préférences de notification, ses réglages. `business_accounts` est le
dossier du partenaire, pas le carnet — et la ligne 39 ne nomme pas la
collection que ses propres endpoints 1 à 5 manipulent. Le §7 est la
liste que l'estimation DB de 2 jours doit couvrir.

### 6.5 Les notes techniques (colonne Q)

| Note ligne 39 | État |
|---|---|
| `QR scanner app` | Le QR est frappé côté application (EP20-US9). Le portail le transmet **opaque** et ne l'interprète jamais : c'est le point, pas une facilité. |
| `analytics dashboards (Chart.js)` | Les graphiques existent, en SVG écrit à la main plutôt qu'en Chart.js — une dépendance de moins pour un gain nul, et c'est un écart signalé de longue date dans `docs/SCOPE_AUDIT.md`. Écrans Prio 08 de toute façon. |
| `revenue tracking` | Prio 08. **Aucun montant n'apparaît sur les sept écrans du Lot 1**, et `tools/verify/configuration.mjs` fait échouer la vérification si un dirham s'y glisse. |
| `subscription tiers (Free/Premium/Enterprise)` | **Il n'y a aucune logique de palier dans le code.** Une recherche complète n'en trouve nulle part. `subscription_tier` est transporté parce que la colonne existe ; l'accès passe par `features_enabled`, pour qu'un changement commercial reste un changement de données. Si le chiffrage suppose trois paliers vendus, l'écart est dans le chiffrage. |
| `notification système nouvelles réservations` | L'écran Notifications règle l'alerte et ses canaux (push, e-mail, WhatsApp) et l'enregistre. **L'expédition attend un compte Twilio ou Infobip** ; le portail n'envoie rien. |

## 7. Les tables du Lot 1

Sur les 69 tables de `db/schema.sql`, voici celles que les sept écrans
touchent. Le pilote SQLite est la spécification exécutable de ce que
votre backend doit pouvoir répondre.

| Table | Lue par | Écrite par |
|---|---|---|
| `venues` | Accueil, Ma fiche, Connexion, Validations | Ma fiche (identité), Inscription (étape 6), Validations (`status`) |
| `venue_tags` | Accueil, Ma fiche | Ma fiche (fiche, Lot 2) |
| `venue_settings` | les six écrans | Notifications, Paramètres |
| `business_accounts` | Connexion (compte métier) | Inscription (étape 6) |
| `partner_accounts` | Connexion (mot de passe d'un partenaire inscrit) | Inscription (étape 1) |
| `onboarding_drafts` | Inscription (reprise) | Inscription (chaque étape) |
| `staff` | Connexion (annuaire, périmètre) | Équipe (Lot 2), Inscription (étape 6) |
| `reservations` | Accueil, Réservations, Check-in, recherche | Check-in, cycle de vie, Décaler (`at`) |
| `platform_admins` | la porte de `/admin/validations` | — (l'équipe LYFE, hors portail) |
| `reservation_status_history` | — | Check-in, cycle de vie |
| `customers` | Accueil, Réservations (jointure : visites, e-mail, année de naissance) | — |
| `services` · `service_slot_load` | Accueil, Réservations | — |
| `service_definitions` · `service_zones` | Disponibilités, Réservations (la grille), Décaler | Disponibilités, dont `slot_minutes` |
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

**Deux pièges, dans l'ordre où on les rencontre :**

1. **`LYFE_DATA=http` vaut la peine en recette.** Sans lui, un fichier
   `.data/lyfe.db` oublié sur la machine ne change rien — la règle
   ci-dessus donne la priorité au backend — mais l'inverse est vrai le
   jour où l'une des deux variables manque : le portail retombe
   silencieusement sur SQLite, et `/api/health` est le seul endroit qui
   le dit.
2. **La session est appelée à chaque requête** (§5.1). Un service qui
   répond en 400 ms à `GET /auth/session` ajoute 400 ms à chaque
   navigation. Le portail mémorise la réponse cinq secondes ; au-delà,
   c'est votre latence.

**Mapper une autre forme.** Si votre service ne renvoie pas exactement
ces objets, écrivez la conversion dans `http-repository.ts` — une
fonction `mapOverview()`, `mapDayBook()` — et nulle part ailleurs, plus
`readAccount()` dans `src/lib/auth/directory.ts` pour la session. Tout
l'intérêt de la couture est qu'un seul fichier connaisse le format du
fil ; une conversion répandue dans les écrans est une migration qu'on ne
peut plus faire.

---

## 9. Vérifier sans attendre le backend

`tools/mock-api.mjs` est un Business Service qui répond à ce contrat. Il
sert le jeu de données capturé — `src/lib/data/static/venue-snapshot.json`,
tiré de la base seedée par `tools/verify/extract.mjs` — sur les chemins
exacts du pilote, et il applique les écritures du Lot 1 en mémoire.

Il existe parce que le pilote HTTP avait été écrit, typé, et jamais
exécuté : le portail a trois pilotes de données et deux seulement avaient
déjà servi un écran. Rien ne vérifiait que les chemins correspondaient,
que les formes étaient celles que les types annoncent, ni qu'une écriture
revenait sous une forme que la lecture suivante accepte — et « ça
compile » n'est pas cette vérification.

```bash
npm run db:reset                       # une fois, pour la capture
node tools/mock-api.mjs &              # :3311
LYFE_LOT=1 LYFE_DATA=http \
  LYFE_API_BASE_URL=http://localhost:3311 LYFE_API_TOKEN=mock \
  npm run build && npm start &

LYFE_LOT=1 node tools/verify/walk.mjs          # les sept écrans
LYFE_LOT=1 node tools/verify/states.mjs        # les trois états
LYFE_LOT=1 node tools/verify/configuration.mjs # vocabulaire et périmètre
```

`GET /__health` répond sans jeton, pour qu'un script d'amorçage puisse
l'attendre. `MOCK_API_PASSWORD` change le mot de passe (par défaut
`demo`), `MOCK_API_TOKEN` exige un jeton précis, `PORT` change le port.

**Ce qu'il est.** Un double de test : l'état vit dans le processus et
meurt avec lui, le mot de passe est le même pour tous les comptes, et les
endpoints d'action du Lot 2 renvoient leur bundle sans l'appliquer. Le
reste est fidèle — y compris le refus `409 { code: "stale" }` sur une
version périmée, et le refus d'un `venue_id` que le compte ne détient
pas. Ce document est la spécification ; ce fichier est une
implémentation, tenue honnête par le fait d'être exécutée.
