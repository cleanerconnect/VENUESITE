# Handover — LYFE Portail Partenaire

The single entry point. Read this before the code; everything else is
linked from here.

---

## 1. What DigiNegoce wires: the Dashboard basique

The portal ships in **two lots**, and only the first is being wired.

**Lot 1 is the *Dashboard basique* of sprint Prio 02**, 12 to
30 October 2026. The scope is one line of DigiNegoce's own plan, which
is committed here as `docs/reference/Planning_Lyfe_V3_20260923.xlsx`:

> **Planning V3**, row `Prio 02` — `Restau & Drinks :` ·
> `- Dashobaord basique (Authentification + Création de Venue + Gestion
> des reservation uniquement)`

and the same sentence again as the user story:

> **Détail Sprint**, row 40 — EPIC `Dashboard` · US-Name
> `Dashboard restaurant partenaire web` · User Story
> `Mise en place des Dashboards basique (Authentification + Création de
> Venue + Gestion des reservation uniquement)` · `BETA` · `SP-Prio 02` ·
> `A faire`

Row 41 is the identical story for `Dashboard Drinks/Cellar partenaire`,
which is why a lounge renders the same seven screens as a restaurant.

**The backend contract is written out in French, endpoint by endpoint:
[`docs/LOT1_API_CONTRACT.md`](LOT1_API_CONTRACT.md).** Read it before
writing any service code. It lists, per Lot 1 screen, every call the
portal makes — method, path, request body, response shape — and the
tables of `db/schema.sql` each one reads or writes; it maps, cell by
cell, row 39 of `ChiffrageV3.0`'s « Spécifications Chiffrage Dét. »
sheet, whose seven endpoints the driver now matches 7/7 with six of them
called; and it says where the two scope documents disagree — row 39 puts
analytics, boost and review replies in the same cell as the booking
work, and `Planning V3`'s Prio 02 row says *« Gestion des reservation
uniquement »*.

**Everything the contract describes is actually called.** The HTTP driver
had been written, typed and never run; it now runs against
`tools/mock-api.mjs`, a Business Service that answers the contract out of
the committed capture, and the three places where the portal wrote
somewhere other than where it said are closed:

- **authentication resolves from the service** — `directory.ts` has a
  third branch, and one session endpoint carries identity, venue scoping
  and roles;
- **all five booking decisions reach the driver** — accepter, refuser
  with its coded reason, check-in by scan and by name, absent, annuler,
  each behind the optimistic update with a rollback on refusal;
- **every Ma fiche form writes through the driver** — identity, the
  listing, the opening hours and the photos.

A Lot 1 deployment also stopped asking for six reads it renders nothing
from. `docs/INTEGRATION.md` §1 predates all of this and still lists the
old `/restaurants/{id}/…` paths; for anything Lot 1, the contract wins.

**Maquettes are due 2 October 2026.** That date is derived, not quoted:
the prerequisite column of `Planning V3` is headed *« Prérequis à
préparer 10 jours avant le démarrage du Sprint »*, and its Prio 02 cell
asks for *« Mauettes pour Dasboard Restau & Drinks »* and *« Maquettes
pour authentification partenaire Venue »*. Ten days before 12 October is
2 October. The Figma page `09 Dashboard basique · Dar Zellij` is that
delivery.

**Lot 2 is everything else this repository renders.** Twenty-five further
screens, designed, built and rendered here — but handed over as
**front-end and design only**. They are the *« Mise en place des
Dashboards avancés »* of `Détail Sprint` row 133, sprint **Prio 08**,
22 February to 12 March 2027. Nothing in Lot 2 is being connected now,
nothing in Lot 2 should be demonstrated as available, and no Lot 1
screen links into one.

The split is a setting, not a branch. `LYFE_LOT` decides which product a
running instance is, and it **defaults to 1**:

```bash
npm run dev                 # Lot 1 — the Dashboard basique
LYFE_LOT=2 npm run dev      # Lot 2 — everything this repo renders
```

At `LYFE_LOT=1` the twenty-five Lot 2 routes are not registered — they
404, the way they would in a build that never had them — their nav
entries do not render, and the sidebar lists six entries under no group
header at all — the event dashboard's sidebar rules its two groups with
a hairline and names neither, and this is the same sidebar.
`GET /api/health` reports the lot in force. The field lives on every row
of the route index (`lib/nav/routes.ts`), which is what the styleguide
table, the navigation and the capture tools all read.

### The seven Lot 1 screens, and the door before them

Three nouns in the sprint row, and the word that decides the rest:
*uniquement*. Seven screens, plus the onboarding flow — « Création de
Venue » is one of the three nouns and had no screen at all until now.

| # | Screen | Route | Which noun | What Lot 1 buys |
|---:|---|---|---|---|
| 0 | Inscription | `/inscription` | Création de Venue | Six steps a partner walks on their own: themselves, the establishment, the address, a photo, the weekly hours, a summary. The draft is saved on the seam after every step, so a closed tab loses nothing, and step 6 creates the venue and signs them in on it. |
| 1 | Connexion | `/login` | Authentification | The one entry point: resolve the account to its venue. Its line for non-partners now opens the flow above instead of offering an e-mail address. |
| 2 | Ma fiche | `/restaurant/ma-fiche` | Création de Venue | Identity, address, contact, photos and opening hours. The record itself, nothing curated on top of it. |
| 3 | Disponibilités | `/restaurant/disponibilites` | Création de Venue | Services, capacity, pacing and the booking window — the hours the venue can be booked for. |
| 4 | Accueil | `/restaurant` | Gestion des réservations | Today's book, and the sentence above it. No tiles. |
| 5 | Réservations | `/restaurant/reservations` | Gestion des réservations | Any day's book, walked a step at a time or picked from a calendar, scoped to one of that day's services — and the four decisions on the row: accepter, refuser with a coded reason, check-in, no-show. |
| 6 | Check-in | `/restaurant/check-in` | Gestion des réservations | Validate a booking at the door, by code or by name. |
| 7 | Notifications | `/restaurant/notifications` | Gestion des réservations | One alert: a new booking needs a decision. |

The sidebar collapses to two hairline-separated runs — the four
operational screens, then the two that configure the establishment —
and drops the group names with them: a label earns its place over ten
groups, not over two, and the event sidebar labels neither of its own.
Structurally it is now that sidebar entry for entry: the wordmark, the
workspace caption (`établissement` against `organisateur`), the identity
card that opens the switcher, the entries at 13.5 px on 40 px rows with
an 18 px icon each, and a footer card carrying the signed-in person,
their role and a kebab holding Se déconnecter.

### What a Lot 1 deployment must never show

Eight concepts, each belonging to a screen that arrives with Prio 08.
They are gated twice — in the builders, so the rule holds on all three
drivers, and in the seed, so a Lot 1 dataset does not contain the state
to leak in the first place:

| Concept | The screen that owns it |
|---|---|
| Liste d'attente, walk-in | Liste d'attente |
| Acompte | Acomptes |
| Palier de fidélité | the loyalty service |
| Étiquettes, segments | Tags et segments |
| Any KPI, any amount | Performance, Bilans, Lyfe Pay |
| Avis | Avis |
| Boost, and the acquisition channels that name one | Visibilité |
| Visit counts, no-show risk scores | Liste clients, Performance |

`tools/verify/configuration.mjs` checks the money half outright: Lot 1
reports on nothing, so a dirham anywhere on the seven screens fails the
run.

### The Lot 2 screens

Calendrier · Liste d'attente · Briefing · Liste clients · Fiche client ·
Tags et segments · Audience · Menu · Avis · Visibilité · Offres ·
Expériences · Guest list · Tables minimums · Promoteurs · Acomptes ·
Annulations · Lyfe Pay · Performance · Bilans · Campagnes ·
Équipe et rôles · Paramètres · Abonnement · Support.

Front-end and design are complete for all of them and are the deliverable
for them. `docs/PHASE7.md` is the worked example of the whole dashboard,
both lots, and `08 Exemple complet · Dar Zellij` in Figma is its design;
`09 Dashboard basique · Dar Zellij` is the Prio 02 product on its own.

**Where the source is.** `docs/reference/Planning_Lyfe_V3_20260923.xlsx`,
with `docs/reference/README.md` quoting the two rows and showing how the
2 October date follows from the plan's own prerequisite column. If the
plan and this file ever disagree, the plan wins.

---

## 2. What this is

The partner portal for **LYFE**, Morocco's lifestyle discovery platform.
Two workspaces behind one login:

- **Espace partenaire** — the venue side: six screens in Lot 1's
  Dashboard basique, thirty-one across both lots, from tonight's service
  to the monthly payout. The worked example for everything else.
- **Espace organisateur** — the event side: sixteen screens for a
  promoter selling tickets. Outside the lot split, and unchanged by it.
  Reads are real; writes have no backend to shape them against yet
  (§12, gap 1).

It is a **front end with a seam**, not a product with a database. Every
read and write goes through one interface with three drivers, so
connecting the real Business Service is filling in the HTTP adapter and
setting two environment variables — not a rewrite. What ships today runs
on a committed snapshot, which is why a cold clone renders every screen
before anyone stands a service up.

Scope is deliberate and narrow: the portal shows what LYFE delivers and
nothing else. No kitchen management, no stock, no POS, no staff
scheduling. See §14.

---

## 3. Run it cold

No database, no services, no credentials:

```bash
npm install
npm run dev          # http://localhost:3000 → /dashboard
```

That serves the committed static dataset. `/login` takes an address and
a password and nothing else — there is no account list to pick from, no
guest entry and no shortcut past the form, because none of those exists
in production. The credentials live in `src/lib/auth/accounts.ts`, the
file a real backend replaces; `yassine@darzellij.ma` owns both venues
and is the account every capture and check uses.

Optionally promote to a real database, after which edits persist across
restarts:

```bash
npm run db:reset     # seeds .data/lyfe.db from db/schema.sql + db/seed.mjs
npm run db:snapshot  # re-captures the static dataset from that database
```

`GET /api/health` says which of the three drivers is live. The rule is in
`lib/data/mode.ts`: `http` when `LYFE_API_BASE_URL` and `LYFE_API_TOKEN`
are set, else `db` when a seeded SQLite file exists, else `static`.
`LYFE_DATA` forces any of the three.

**Two venues are seeded on purpose.** Dar Zellij is a restaurant in
Marrakech with Lyfe Pay history; Nomad Rooftop is a lounge in Casablanca
with none. The pair is what makes three rules checkable rather than
asserted: the configuration switch, the money-tile rule (§12.7) and the
minimum group size on Audience.

### Before you trust a change, walk it

Six browser checks and one recorder are committed under
`tools/verify/`, kept out of `package.json` deliberately — they need a
running server and a browser binary, and a check that pretends to be a
unit test is a check that gets skipped in CI and then deleted.

```bash
npm install --no-save playwright          # once
npm run build && npx next start -p 3210   # in one terminal

node tools/verify/walk.mjs            # the venue screens this lot registers (W/H/VENUE overridable)
node tools/verify/events.mjs          # the 19 event + shared routes
node tools/verify/states.mjs          # ?etat= forceable on every venue route in the lot
node tools/verify/configuration.mjs   # restaurant vs lounge behaves as specified
node tools/verify/audience.mjs        # the minimum group of ten, both configurations
node tools/verify/inscription.mjs     # the six onboarding steps, the resume, the landing
node tools/verify/extract.mjs         # records what every route renders (asserts nothing)
```

**Set `LYFE_LOT` on the server and on the tool, or the run is
meaningless.** The tools derive their screen list from the route index
and filter it by the same variable the build filters routes with; set it
on one side only and the tool asks for screens the server does not
register, then calls the 404s failures.

```bash
LYFE_LOT=1 npx next start -p 3210     # 17 venue screens
LYFE_LOT=1 node tools/verify/walk.mjs

LYFE_LOT=2 npx next start -p 3210     # 31
LYFE_LOT=2 node tools/verify/walk.mjs
```

Both modes pass at **both widths** — `W=390 H=844` included, which is
the check that catches a page scrolling sideways on a phone. Under
Lot 1 `audience.mjs` reports that its screen is
not registered and exits clean rather than failing on a 404 it asked for
itself, and `configuration.mjs` asserts a different sidebar in each lot:
in Lot 2 the nine or ten named groups, in Lot 1 the six entries, the
absence of every screen the lot does not buy, and no group header at
all — the header is what Lot 1 dropped, so a header appearing there is
itself the failure. Vie nocturne and Paiements are entirely Lot 2, so a
lounge does not see Vie nocturne either.

Run them against a **production build**, not `npm run dev`. Three of them
fill the login form before React has hydrated in dev, and the submit gate
never opens; the symptom is a timeout on a disabled button.

**And run them a third time, on the HTTP driver.** `tools/mock-api.mjs`
is a Business Service that answers `docs/LOT1_API_CONTRACT.md` out of the
committed capture, which is what lets the seam be exercised rather than
only compiled:

```bash
node tools/mock-api.mjs &                       # :3311, GET /__health needs no token
LYFE_LOT=1 LYFE_DATA=http \
  LYFE_API_BASE_URL=http://localhost:3311 LYFE_API_TOKEN=mock \
  npx next start -p 3210 &
LYFE_LOT=1 node tools/verify/walk.mjs           # same assertions, other driver
```

Check `/api/health` says `"data":"http"` before you believe the run: a
stray server from an earlier session on the same port will answer, and
then a phase you think is testing SQLite is testing something else. That
is not hypothetical — it happened while writing this.

`extract.mjs` is the odd one out: it asserts nothing, it *records*. At
its default depth it writes the route outline; at `DEPTH=full` it writes
every table cell, list row, metric, chart geometry and form value, with
`SHOTS=` capturing reference PNGs. That file is what the Figma export is
built from, which is why Phase 7 found four content-losing bugs in it — a
screen that reads as prose in the JSON is a screen the extractor is not
seeing properly.

One trap, because it has now cost time twice: if a stale `next start`
still holds `:3210`, the new one fails to bind with `EADDRINUSE` and
every check silently measures the *old* build. Kill by PID
(`pkill -9 -f next-server`) and confirm the port is free before
rebuilding.

---

### Déployer — Vercel avec Neon Postgres

Le portail tourne en local sur SQLite et en production sur Postgres,
**avec le même `db/schema.sql`**, écrit dans l'intersection des deux
dialectes. Une seule variable décide : `DATABASE_URL`.

| Variable | Effet |
|---|---|
| `DATABASE_URL` | présente → pilote `db`, moteur **Postgres**. C'est ce que Vercel définit quand un projet Neon est rattaché. |
| *(absente)* | pilote `db` sur **SQLite** si `.data/lyfe.db` existe, sinon pilote `static` (le jeu de données figé) |
| `LYFE_LOT` | `1` par défaut — le Dashboard basique. `2` n'est à mettre que pour montrer le périmètre complet. |
| `DATABASE_POOL_MAX` | facultatif, 4 par défaut : le plafond de connexions par instance |

**Dans Vercel**, une fois par projet :

1. **Storage → Create Database → Neon Postgres**, puis *Connect* au
   projet `venuesite`. Vercel écrit `DATABASE_URL` (et ses alias
   `POSTGRES_*`) sur les trois environnements. Rien d'autre à régler :
   il n'y a pas de clé d'API à fournir, la carte utilise
   OpenStreetMap.
2. **Redéployer** — les variables ne sont lues qu'au démarrage d'une
   instance.
3. **Semer une fois**, depuis une machine qui a le dépôt et l'URL
   (copiez la chaîne *pooled* depuis Neon ou Vercel) :

```bash
export DATABASE_URL="postgres://…-pooler.…neon.tech/neondb?sslmode=require"
npm run db:migrate     # applique schema.sql + les fonctions de compatibilité
npm run db:reset       # génère le jeu de démonstration et le copie dans Postgres
```

`db:reset` écrit d'abord `.data/lyfe.db` — le générateur de données
n'existe qu'en un seul exemplaire — puis applique le schéma et copie
chaque table dans Postgres, dans l'ordre où `db/schema.sql` les déclare,
qui est un ordre de dépendances. `npm run db:push` refait la copie seule.
Les deux bases portent alors les mêmes lignes, ce qui est ce qui rend
comparable un passage des outils sur l'une et sur l'autre.

4. **Vérifier** : `GET /api/health` doit répondre

```json
{ "adapters": { "data": "db", "dataEngine": "postgres" } }
```

`"data": "static"` sur un déploiement veut dire qu'aucune base n'est
rattachée : les écrans s'affichent depuis l'instantané, mais l'étape 6
de l'inscription refuse de créer l'établissement — il n'y a rien où
l'écrire. `"dataEngine": "sqlite"` en production veut dire que le
portail écrit dans un fichier qu'un redéploiement jettera.

**Ce que Postgres change dans le code : rien.** Les sept magasins
parlent aux quatre mêmes fonctions — `all`, `one`, `run`,
`transaction` — et `src/lib/db/store.ts` choisit le moteur derrière
elles. Deux détails y sont réglés une fois pour toutes : les `?` sont
traduits en `$1…$n`, et les types que `pg` renverrait autrement
(`COUNT(*)` en chaîne, une date en objet `Date`, une colonne JSON déjà
désérialisée) sont épinglés pour qu'une ligne ait la même forme sur les
deux moteurs. Les quelques requêtes qui utilisent `strftime`,
`julianday`, `date(x, modifier)` ou `datetime(x)` — des fonctions
SQLite — trouvent en face des fonctions de même nom installées par
`db:migrate` depuis `db/postgres-compat.sql`.

## 4. The styleguide

Open **`/styleguide`**. It needs no session and no seeded database —
every specimen renders from literal props — and it is the fastest way to
see what exists before reading a line of code.

Seven sections, in this order:

| Section | What it holds |
|---|---|
| `Tokens` | colours, typography, radii, shadows, motion — read from the CSS variables, so editing `globals.css` edits this page |
| `Contrôles` | what you click and what you fill, in every state: empty, filled, in error, disabled |
| `Surfaces` | cards, pills, headers, tiles, drawers, empty states and loading skeletons |
| `Blocs d'écran` | every block the spec engine can paint, rendered from a hand-written spec by the same renderer the app uses |
| `États` | loading, empty, failed and access-denied — each forceable on any route from its URL |
| `Vocabulaire` | every domain term with its label, tone and icon, generated from the same tables the app reads |
| `Écrans` | **the route index** — see §6 |

It is also the enforcement mechanism for the rule that keeps the
components portable: `components/ui/` imports nothing from the data
layer, so if the styleguide renders, that rule still holds.

---

## 5. The Figma file, and how its pages map to the repo

**`LYFE Portail Partenaire`** —
<https://www.figma.com/design/fztoNaEvTrZrWDaLy1MEWg>

The file is not a mockup of the portal; it is generated *from* it. Every
French string, number and status pill on pages `04` and `08` came out of
the running portal through `tools/verify/extract.mjs`, never typed. Read
`00 Lisez-moi` in the file first — it states the naming rules the pages
follow.

| Figma page | Mirrors | Built from |
|---|---|---|
| `00 Lisez-moi` | this document and `docs/TARGET_SPEC.md` | — |
| `01 Fondations` | `src/app/globals.css` | the token block, 1:1 |
| `02 Composants` | `src/components/ui/` | 29 components, 175 variants; a component is named for its file |
| `03 Entrée` | `/login`, `/splash`, `/contact` | built without the shell, as the code renders them |
| `04 Espace partenaire` | the 31 venue screens | structure, in ten Sections named for the ten nav groups of `src/lib/nav/workspaces.ts`. Every screen frame carries its lot in the frame name — `[lot 1]` or `[lot 2]`, 6 and 25 |
| `05 Espace organisateur` | the 16 event screens | structure, in two Sections |
| `06 États` | `loading` / empty / error / denied | four compositions, not four frames per screen |
| `07 Téléphone` | the seven phone-first screens at 390 | plus two phone surfaces |
| `08 Exemple complet · Dar Zellij` | every screen of both lots, populated | `docs/phase7-dar-zellij.json` and the 67 PNGs in `docs/phase7-reference/` |
| `09 Dashboard basique · Dar Zellij` | the seven Prio 02 screens at 1440 **and** at 390, with their tab, day, service, overlay and « Enregistré » states — 35 frames, and it plays as a prototype from either width, see §5.1 | `docs/lot1-dar-zellij.json` and the 17 PNGs in `docs/lot1-reference/`, both captured at `LYFE_LOT=1` |

Two rules the file keeps, and a designer extending it should keep too:
the library on `02 Composants` is the source for components, and `08` is
the **only** page where detaching from it is allowed — because a Figma
instance cannot be given rows.

`09` keeps that rule. Its frames are clones of `08`'s, cut to the sprint
row's scope, and their sidebars are instances of a second library
component — `Chrome / Sidebar · Dashboard basique`, holding the four
groups and six screens a Prio 02 deployment renders — rather than
detached. The lot changes which screens exist, and which screens exist
is exactly what that component draws, so it earns a component of its own.

### 5.1 `09` plays

Press Present on `09` and it starts on Connexion and behaves like the
portal: Se connecter lands on Accueil, « Inscrire mon établissement »
opens the six-step inscription and walks it with Continuer and
Précédent — Passer cette étape included, on the photo — until step 6
lands on Accueil, every sidebar entry goes to its screen, Ouvrir le
carnet opens the book, the topbar pill goes to Check-in, the day arrows and the service tabs on Réservations move
between that screen's day and service states, Accepter on Nabil
Cherkaoui's row raises the confirmation, Scanner le code raises the
camera, and Enregistrer on Ma fiche, Disponibilités and Notifications
shows the saved state. Navigation is instant and keeps its scroll
position, because every frame but Connexion carries the same sidebar and
a host moving between screens should not be thrown back to the top.
Overlays dissolve in over 0.2s.

Eight sections, one per screen, left to right in the order a partner
meets them, 240px apart. `0 · Inscription` is the leftmost, before
Connexion, because it is the door a partner with no account comes
through; it holds the six steps at both widths and nothing else, as the
flow has no states beside them — every step *is* a state of one card.
This is the one page in the file whose sections are named for screens
rather than for the nav groups of `src/lib/nav/workspaces.ts` — a
prototype reads in the order it is played, not in the order the sidebar
groups its entries.

Each section holds two sub-sections side by side, also 240px apart:
`Ordinateur` at 1440 on the left, `Téléphone` at 390 on the right. Under
the screen in each, its related states are grouped and labelled — the
camera, the confirmations, the two journées and their two services, the
three Ma fiche tabs, the « Enregistré » states. So a section reads down
as one screen and across as one screen at two widths, and nothing on the
page is a frame whose relationship to its neighbours you have to guess.

Where the page came from — the capture command, the workbook rows the
scope is read off, and what happened to the eleven screens Lot 1 leaves
out — is stated on `00 Lisez-moi` under « D'où vient la page 09 », not
on the page itself. `09` keeps only its title and the four form rules.

The phone flow starts on `Téléphone`, the second starting point, and
plays the same screens at 390 — the six inscription steps included,
which carry no chrome because the flow runs outside the portal shell: a fixed header, a scrolling column
and a fixed bottom bar of four tabs. Attente is Liste d'attente, which
Lot 1 does not buy, so the bar a basique deployment draws has four tabs
and not five — `Chrome / BottomTabs · Dashboard basique` on `02`, one
variant per active tab, for the same reason the sidebar earned its own
basique variant set. Ma fiche, Disponibilités and Notifications sit
behind the Plus tab, which is the hub the four tabs do not carry.

Réservations models two days either side of today and both services, six
frames in all: the day arrow at each edge of that range is drawn
disabled rather than left to do nothing, and moving day keeps the
service you were looking at. The phone flow models one day and one
service and points at the desktop section for the rest.

Four details a designer extending it should know.

The overlays carry their own scrim as a child rectangle, because
`overlayBackground` and `overlayBackgroundInteraction` are read-only
through the Plugin API: that rectangle is what dims the screen behind
and what closes the overlay when clicked.

The entry for the screen you are already on is deliberately unwired —
Figma refuses a navigation whose destination is the frame the reaction
lives on, and there is nowhere to go. The same holds for the active tab
of a tab set.

Each phone frame declares its chrome through `numberOfFixedChildren`,
which counts from the *end* of the child list, so the header, its
hairline and the tab bar are the last three children of every phone
frame. Reorder them and the chrome starts scrolling.

The phone headers carry a dashed `LYFE · marque couleur (à téléverser)`
slot rather than the wordmark. The file holds only the white-on-dark
artwork, which is invisible on a white header, and `figma.createImage`
decodes bytes locally without uploading them — an image made through the
Plugin API renders blank. The slot names itself so the colour asset
drops straight in; it is not a hand-drawn stand-in, which is what this
file already replaced three of.

**One search box.** There were two: a stub in the topbar that opened
nothing, and a real one inside the Carnet that filtered the rows under
it. A host looking for a booking had to know which of the two did the
work, and the answer changed per screen. The topbar's is the real one
and the only one — a screen with a searchable list claims it on mount
and supplies the placeholder, so the chrome says what *this* screen
searches. ⌘K focuses it, which is what the hint beside it always
claimed.

**Host density.** Lot 1 is read by a restaurant owner who is not
comfortable with software, standing at a host stand. Lot 2's scale is an
analyst's — 14px body, 12px meta, grey secondary text — and at a stand
that is a screen you lean into. The same design system runs at a second
density: `data-density="host"` on the shell, set from `activeLot()`,
steps the type to a 16px base with nothing below 13px, moves secondary
text from grey to ink at 70 %, and puts a 44px floor under every
control. It is a mode, not a set of per-screen overrides, so a component
that never heard of Lot 1 still comes out right inside it.
`/styleguide#tokens` renders both densities side by side.

A booking row is drawn in that density rather than in the Lot 2 one: the
time and the party size lead in 22px, because they decide what happens
in the next ten minutes; the name follows at 17px, because it is what a
host says out loud; zone, channel and note are tertiary. The state is a
band down the row's left edge **and** a word beside it — the colour
reads across the room, the word survives a greyscale print. Rows are
grouped under their sitting, the way a paper book is ruled off.

**What `09` holds.** Seven Sections, one per screen, in the order a
partner meets them, 240 px apart. Each splits into two sub-sections —
`Ordinateur` on the left at 1440, `Téléphone` on the right at 390 — and
the support frames (refused state, switcher states, overlays, saved
states, day and tab variants) sit under the frame they belong to:

| Section | Ordinateur | Téléphone |
|---|---|---|
| `1 · Connexion` | Connexion · **Sélecteur d'établissement · états** · **Connexion · identifiants refusés** | Connexion |
| `2 · Accueil` | Accueil | Accueil · Plus |
| `3 · Réservations` | Réservations · Déjeuner · jour précédent (+ Déjeuner) · jour suivant (+ Déjeuner) · Overlay réservation confirmée | Réservations · Overlay réservation confirmée |
| `4 · Check-in` | Check-in · Overlay caméra | Check-in · Overlay caméra |
| `5 · Ma fiche` | Ma fiche · Enregistré · Horaires (+ Enregistré) · Photos | Ma fiche · Enregistré |
| `6 · Disponibilités` | Disponibilités · Enregistré | Disponibilités · Enregistré |
| `7 · Notifications` | Notifications · Enregistré | Notifications · Enregistré |

Two frames on the page are not screen captures. The switcher frame is
three states of the venue picker at the top of the sidebar — one
establishment (a card with no affordance), several closed, several open
with the active one checked. It is there because `Détail Sprint` row 41
puts the same user story on `Dashboard Drinks/Cellar partenaire`, so one
account holding a restaurant and a bar is the normal case, not an edge
one. Each state carries its label and nothing else: the frame is a
reference for what to build, and a paragraph explaining why is a
paragraph that goes stale where nobody is reading it.

`Connexion · identifiants refusés` is the second: the sign-in form after
a refusal, which cannot be drawn on the same frame as the resting form
without the frame asserting two things at once. One message above the
pair rather than two beneath it — a wrong address and a wrong password
read the same, so the form cannot be used to find out which partners
have accounts — and both fields marked without repeating the reason.

**The sidebar knows which screen it is on.** `Chrome / Sidebar ·
Dashboard basique` is a variant set with one property, `Écran actif`,
and six values — one per Lot 1 screen. Every frame on `09` sets its own,
so Réservations highlights Réservations. Before, all six instances
highlighted Accueil, which is the one state the component could draw.

**What no frame on `09` shows.** A sweep of every text node on the page
returns nothing for any of: liste d'attente, walk-in, acompte, palier,
étiquette, segment, avis, boost, any KPI label, any amount in MAD, an
ISO date, or a time off the half-hour grid. That is the same list the
builders and the seed gate, checked against the glyphs on the canvas
rather than against the code that drew them.

Réservations is the service resolved from the clock: a French long-form
day and the service with its hours in the header, the Journée block, and
the book — four filter chips and fifteen rows. The row the service is
waiting on, Nabil Cherkaoui, is drawn in its **hover state**, so
**accepter, refuser and signaler une absence** are readable without
opening anything; a confirmed row shows check-in and absent. Accueil is
the greeting and the same fifteen bookings, with no tile and no action —
the decisions are taken on Réservations, which is the screen that shows
the outcome.

One thing is deliberately left as designed: a row's note ("Anniversaire,
dessert avec bougie") is drawn on Accueil but not in the Réservations
book, which is how `08` has always drawn both.

Page and component ids, the variable collections and the verification
record live in `docs/phase6-figma-state.json`.

---

## 6. The spec

**`docs/TARGET_SPEC.md`** is the screen-by-screen target the venue side is
built against, and the document to read first when deciding whether
something belongs. Ten sections, one per nav group, each screen with its
purpose, its sections, its actions, what it reads and what it writes.

The relationship is enforced, not aspirational: `src/lib/restaurant/slugs.ts`
is the canonical screen list, the builder registry is a total map over it,
and `restaurantHref` builds every nav link from it — so a screen in the
spec with no builder is a compile error, and a nav link to a screen that
does not exist cannot be written.

---

## 7. The route index

`src/lib/nav/routes.ts` is the one list of what the portal ships — 53
rows: 31 venue, 16 event, 3 entry, 3 shared. The styleguide's `Écrans`
section renders it, linked, with roles, status and lot.

**Every row carries a `lot`.** 39 rows are lot 1 — the seventeen venue
screens of §1 plus the entry flow, the styleguide and the whole event
workspace, none of which the split touches — and 14 are lot 2, the venue
screens a Lot 1 deployment does not register. The gate reads this field,
so the table the styleguide prints and the routes the router serves
cannot disagree. Three statuses:

- **`built`** (41) — complete.
- **`partial`** (6) — work *this repo* owes: `/events/new`,
  `/events/:id/edit`, `/visibilite`, `/promo-codes`, `/scanner`,
  `/team`. All six are the event side's missing write path (§11, gap 1).
- **`service`** (6) — nothing is missing from the portal; a third party
  is not connected. Each row carries its dependency verbatim, so nobody
  goes looking for a bug that is not there.

| Route | What waits, and on what |
|---|---|
| `/restaurant/menu` | Assisted PDF-to-articles import awaits an **extraction service**. The PDF upload itself works — the file card is published on the listing. |
| `/restaurant/avis` | Public replies and redirection to Google or Tripadvisor await **those platforms being connected**. The survey, the links and the redirect threshold all save. |
| `/restaurant/acomptes` | **Payzone** is not connected, and the specification leaves the direction of the flow open: the venue collects directly, or LYFE collects and remits. Both paths use the same idempotency key, so the choice does not change this screen. |
| `/restaurant/bilans` | PDF export goes through the browser's own print, which renders correctly. A server-side render awaits a **composition service**. |
| `/restaurant/campagnes` | No **send gateway** is connected. Messages are logged with their cost and recipient, and the console says once that nothing is being sent. |
| `/restaurant/notifications` | Channels, schedules and templates all save. Delivery awaits LYFE's **Twilio or Infobip** account. |

The distinction between `partial` and `service` is the point of the
third status: "partial" once told a reader to go hunting for a bug that
was not there.

---

## 8. The schema is the Business Service contract

`db/schema.sql` — **65 tables**. It is not an implementation detail of
this repository; it is the specification of what the Business Service must
store. It is written on the Postgres/SQLite intersection precisely so it
ports without translation, and `db/seed.mjs` fills it with a dataset the
whole portal renders from.

**A counter is never typed beside its rows.** `services.booked_covers`,
`arrived_covers`, `no_show_covers`, `revenue_cents` and every
`service_slot_load` bar are `UPDATE`d from the reservations at the end of
the seed, and a customer's `visit_count` has one completed booking behind
each visit. Four frames used to contradict themselves because those
columns were written by hand; a Business Service that maintains them owes
the same discipline. `docs/PHASE7.md` §9 has the detail.

Four properties the specification names, and where they live:

- **Every row is venue-scoped.** Every table carries `venue_id`, every
  store function scopes by it in the `WHERE` clause, and that id comes
  from the resolved session — never from a payload. `platform_benchmarks`
  is the one deliberate exception: a row there is an anonymised cohort,
  not a venue, which is why it carries none.
- **Versioned writes.** `service_definitions`, `pacing_rules`,
  `deposit_policies` and `cancellation_policies` carry a `version`. A
  write that read an older value is refused, not merged — a lost update
  there is a double-booked room or money taken under a rule nobody chose.
- **Idempotent money.** `deposits.idempotency_key` is unique. Capture,
  release and refund all send it; a replayed request finds the key spent
  and stops.
- **Spend has exactly one source.** `transactions`. `MoneyDesk.hasTransactionSource`
  is the single fact every money tile keys off, and where it is false the
  tile is *absent* — not zero, not estimated.

Reads cross the seam as **bundles**, not one table at a time: a screen
renders one coherent snapshot, and six round trips would let a counter
disagree with the list beneath it. `SCREEN_NEEDS` declares which bundles
each screen wants. Writes are a **typed union per bundle**, so each
surface is one endpoint rather than forty routes to write and forty to
secure, and every action returns the refreshed bundle.

---

## 9. The four documents

The phase record — what was built, what was found, and what was left
open. Read in order, they are the history of the repository:

| Document | What it covers |
|---|---|
| `docs/PHASE4.md` | Handoff completion: the event side off fixtures, every route given its four states |
| `docs/PHASE5.md` | Completing the venue dashboard: 28 tables to 63, the seam, the app contract in both directions, drinks as a configuration |
| `docs/PHASE6.md` | The Figma export: variables, components, frames, and §5 — the écarts found by reading the code against the documents, all now closed |
| `docs/PHASE7.md` | The worked example: one venue, every screen, populated from the seed; §6 — six observations, four of them defects still open here; §9 — the coherence pass, frame by frame |

`tools/mock-api.mjs` sits with them rather than with the docs: it is a
Business Service that answers `LOT1_API_CONTRACT.md` out of the committed
capture, so the HTTP driver can be run rather than only compiled. See the
contract's §9.

Five reference documents sit beside them:
`docs/LOT1_API_CONTRACT.md` (**the Lot 1 backend contract**, in French —
every call the seven screens make, the tables behind them, and what is
not wired) ·
`docs/INTERFACE.md` (how the UI is put together) ·
`docs/CONVERGENCE.md` (what was unified, what is still duplicated) ·
`docs/APP_MAPPING.md` (app element → portal control) ·
`docs/INTEGRATION.md` (the API and AI seams — superseded on Lot 1 paths
by the contract above).

`docs/SCOPE_AUDIT.md` and `docs/PHASE2_HARDCODED_AUDIT.md` are earlier
passes, kept for provenance.

**Start with `docs/TARGET_SPEC.md` if you are deciding whether something
belongs; with `docs/PHASE7.md` §6 if you are looking for the next bug to
fix.**

---

## 10. What is solid

**The design system.** One `SideSheet`, one `MetricTile`, one
`FilterTabs`, one `PageHeader`, one chart theme, one tooltip, one set of
loading skeletons. Every colour in the app resolves to a token in
`globals.css`; the only literals left are four third-party brand colours,
labelled as such. `components/ui/` imports nothing from the data layer,
which is what makes the styleguide possible and what keeps the
components portable.

**The spec engine.** Twenty-six of the venue workspace's thirty-one
screens are pure functions returning JSON-serialisable `ScreenSpec` values,
painted by a block registry. Adding a screen is a builder plus an entry
in a typed slug list; the registry is a total map over that list, so a
missing screen or a dead link is a compile error rather than a 404 in
production.

The other five are routes rather than specs — Ma fiche, Menu, Équipe et
rôles, Check-in and Fiche client. Drag reordering, file upload and a live
camera are not blocks, and inventing a block type per field would have
been worse than a page. A type-level exclusion keeps the registry total
anyway.

**Writes are a closed list too.** A spec is JSON, so a button carries a
command *name*; the screen carries the form that name opens, and one
server action switches on the name against a list both halves import.
A button cannot dispatch a verb the server has never heard of, and a
verb with no handler says so rather than doing nothing.

**The data seam.** `RestaurantRepository` is the single interface every
read and write in the venue workspace goes through. `MockRestaurantRepository`
implements it against a real SQLite database (`db/schema.sql`, 65 tables,
seeded by `db/seed.mjs`); `HttpRestaurantRepository` implements it against
`/api/business/*`; `StaticRestaurantRepository` implements it against a
snapshot captured from the seeded database through those same store
functions, which is what lets a cold clone render everything with no
infrastructure at all. Integration is: fill in the HTTP adapter, set
`LYFE_API_BASE_URL` and `LYFE_API_TOKEN`, delete nothing.

Reads arrive as bundles rather than one table at a time, because a screen
renders one coherent snapshot and six round trips would let a counter
disagree with the list beneath it. Writes are a typed union per bundle:
one HTTP endpoint per surface instead of forty routes to write and forty
to secure.

**The app contract, both directions.** `lib/integrations/events.ts` is
what the platform sends in; `lib/integrations/outbound.ts` is what the
portal sends out. Every guest-affecting action — confirm, refuse, table
ready, seated, deposit requested, table confirmed, guest-list check-in —
emits the consumer-app notification *and* the tracking event through one
helper, so "both are emitted" is a property of the code rather than a
rule somebody has to remember. With no gateway configured the emissions
are recorded and the console says once that nothing is being sent, which
is better than succeeding silently.

**Venue scoping.** Every query and every mutation carries `venue_id` in
its WHERE clause, and that id comes from the resolved session, never from
a payload. Verified: a request for a venue the user does not hold returns
403; a forged cookie falls back to the user's own venue; an
unauthenticated request redirects to `/login`. `updateMenuItem` aimed at
another venue's dish updates zero rows and raises.

**Optimistic writes with real rollback.** `useOptimisticForm` applies an
edit immediately, rolls it back if the server refuses, and shows which of
those happened. `useRestaurantStore` snapshots before every mutation so
the toast's "Annuler" is real, not decorative.

**Asset uploads.** HMAC-signed tickets, a swappable storage driver, and
only the object key is stored — never a URL. Verified: a forged key is
403, oversized is 403, expired is 410, wrong type is 422, path traversal
is 404 with no leak.

---

## 11. What is deliberately not built

These are **open, not worked around**. Nothing in the codebase pretends
they exist.

| Item | Current state | What the team builds |
|---|---|---|
| **Real authentication** | A local credential store behind a `SessionDriver` interface, plus a presence cookie for the middleware. Nothing in the portal lists it, and there is no guest or demo path around it | Implement `SessionDriver` against the Business Service. `resolveSession()` already re-checks venue access on every request |
| **PostgreSQL** | SQLite via `node:sqlite`, on the Postgres/SQLite intersection of SQL | Point the store at Postgres. The schema is written to port; no SQLite-only syntax |
| **S3 + CloudFront** | A local filesystem driver behind a `StorageDriver` interface | Implement the driver with presigned PUT and CloudFront reads. The portal must never see a raw credential — that constraint is already structural, since it only ever handles object keys |
| **The `/api/business/*` backend** | `HttpRestaurantRepository` is written against it and unused | Stand the service up; flip the env var |
| **Live push** | Webhooks land and revalidate | Fan out to open dashboards; dedupe across instances on the event `id` |

---

## 12. What is a gap, ranked

| # | Gap | Consequence | Size |
|---|---|---|---|
| 0 | ~~Authentication talked to no service; four booking decisions never left the browser; Ma fiche wrote past the driver~~ — **closed.** See `docs/LOT1_API_CONTRACT.md` §5, and `tools/mock-api.mjs` for the double they were verified against | — | — |
| 1 | ~~Event workspace reads fixtures directly~~ — **done in Phase 4.** What remains is the *write* path: there is no `EventRepository` mutation surface, because there is no event backend to shape one against | Creating an event, promo code or boost persists nothing | Large. The venue side is the worked example to copy |
| 2 | No add/remove for menu items | A venue with a new dish has to call support | Small |
| 2b | Menu items and the staff list are the last two writes that still call SQLite directly instead of the repository | Those two screens cannot run against a backend | Small, and the four Ma fiche forms are the worked example |
| 3 | ~~No editor for seating areas~~ — **done in Phase 5.** Zones open and close from Ma fiche, and the write reaches the app immediately | — | — |
| 4 | ~~No preview of the app listing~~ — **done in Phase 5.** Ma fiche renders the listing from the same values the form edits | — | — |
| 5 | ~500 French literals inline, almost all one-off headings | A copy change means a code change | Medium, mechanical |
| 6 | ~~`loading.tsx` only on venue routes~~ — **done in Phase 4.** Every route has loading, empty, error and denied states | — | — |

Gap 1 is the one to do first: the venue side is now a complete worked
example of a repository seam with three drivers, a typed action union and
a snapshot generator, and the event side needs the same treatment for
writes.

Beyond those, six venue routes are marked **service à brancher** rather
than partial. Nothing is missing from the portal on them; what is missing
is Payzone, a message gateway, a review platform or a PDF extractor. The
distinction matters because "partial" told the last reader to go looking
for a bug that was not there.

---

## 13. Rules to keep

Eight things that will rot quietly if nobody defends them.

1. **`components/ui/` imports nothing from `lib/db`, `lib/data` or
   `lib/mock`.** If a component needs data, it takes a prop. This is
   what keeps `/styleguide` working, and the styleguide is what keeps
   the components honest.
2. **No colour literals, and the rule currently holds.** A new colour is
   a token in `globals.css` and a role name, not a value at a call site.
   A tint is that token at an opacity — `bg-violet/12` in a class,
   `color-mix(in oklab, var(--color-violet) 12%, transparent)` in a
   gradient or shadow — never a hand-written `rgba()`. Same for
   `fontSize` (the metric scale), radii (`rounded-chip`) and spacing
   (everything derives from `--spacing`).

   This was aspirational until the Phase 6 audit, which found the rule
   broken in thirty-four places: `Pill`'s eleven tones written as rgba
   (one of them a violet in the palette nowhere else), twenty-six inline
   `rounded-[12px]`, four gold hero glows the token comment claimed did
   not exist, and two variants painting a second variant's colour.
   `grep -rn 'rgba([0-9]' src --include='*.ts' --include='*.tsx'` returns
   one hit — a comment in `Pill.tsx` recording the stray value. Two hits
   means it has started rotting again. Scope it to the code: unscoped it
   also counts `globals.css`, where eighteen `rgba()` values are the
   token *definitions* and so are the rule being kept, not broken.

   Colour holds; radius is only half done, and the sentence above should
   not be read as claiming otherwise.
   `grep -rno 'rounded-\[[0-9]\+px\]' src` returns 26 hits across 19
   files — `10px` ×17, `6px` ×4, `14px` ×3, `34px` and `44px` once each.
   Phase 6 removed the `rounded-[12px]` because `--radius-chip` matched
   them exactly; these are sizes the scale has no name for. Phase 7 hit
   one of them head-on: the avatar chip's `rounded-[14px]` has no token,
   so the Figma avatars bind `rayon/chip` and sit 2px rounder than the
   portal. Either give the remaining five values names, or accept them —
   but do not add a sixth.
3. **A domain state is a term.** Add it to the union, add it to the map
   in `vocabulary.ts` (label + tone + icon), and it appears in the
   styleguide automatically. The compiler enforces the pairing.
4. **Money is centimes in the database and major units above the store.**
   Converted once, in the store.
5. **The venue id comes from the session.** Never from a payload, a
   query string, or a request body. Every new query carries it.
6. **A copy string moves to `lib/copy/fr.ts` when a second component
   would want it.** A one-off heading stays where it reads.
7. **Spend, revenue and average ticket appear only where a transaction
   source exists.** Where none does, the tile is *absent* — not zero, not
   estimated. `MoneyDesk.hasTransactionSource` is the single fact every
   money tile in the portal keys off, and Nomad Rooftop is seeded without
   Lyfe Pay precisely so the rule can be checked rather than asserted.
8. **Drinks is a configuration, not a second product.** It enables the
   Vie nocturne group, renames covers to people, adds table types as
   inventory and adds dress code and age policy. There is no
   per-configuration screen list anywhere in the codebase, and there
   should never be one.

---

## 14. Scope, once more

The venue workspace shows what LYFE delivers and nothing else. No kitchen
management, no stock, no food costing, no suppliers, no POS, no staff
scheduling, no table service. Those were removed in this pass, including
their nav entries, their database tables and their placeholder screens —
not hidden behind a flag.

One concept was reframed rather than deleted: a guest arriving is real
and app-facing, so `seated` became `arrived` everywhere, and the store
now checks a guest in instead of assigning them a table. Seating *areas*
survived, because asking for the terrace when you book is a booking
preference the app offers, not a floor layout.

If a feature request arrives that would reintroduce any of the removed
set, the question to ask first is whether LYFE ships it. A partner seeing
a feature we do not deliver is worse than not showing it.
