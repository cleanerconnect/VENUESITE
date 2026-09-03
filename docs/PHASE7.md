# Phase 7 — Exemple complet, Dar Zellij

Page **`08 Exemple complet · Dar Zellij`** of the Figma file
`LYFE Portail Partenaire`
(`fztoNaEvTrZrWDaLy1MEWg`), after `07 Téléphone`. Nothing on the eight
earlier pages changed.

The page is one thing: **an illustration of the system laid out on
`04 Espace partenaire`, built from the same components, populated with
Dar Zellij's seeded data as of the seed date.** The library remains the
source for components; this page is the source for what a full screen
looks like. It is also the only page in the file where detaching from the
library is allowed, because a Figma instance cannot be given rows.

---

## 1. How it was produced

No content was typed. Every French string, every number and every status
pill on the page came out of the running portal through two tools:

```bash
node tools/verify/extract.mjs                        # outline → docs/phase6-screens.json
DEPTH=full VENUE=res_dar_zellij node tools/verify/extract.mjs
                                                     # → docs/phase7-dar-zellij.json
DEPTH=full SHOTS=docs/phase7-reference node tools/verify/extract.mjs
                                                     # + 63 reference PNGs at 1440 and 390
```

Those 63 captures are also browsable as a single page, grouped the way
the sidebar groups them, at desktop and phone width:
<https://claude.ai/code/artifact/c1cda4df-57bd-4384-97a1-49c040af01a8>.
It is built from `docs/phase7-reference/` and adds nothing to it, so the
built file is not committed — the captures are the artefact, the browser
is a way of reading them.

`extract.mjs` was extended for this phase to capture what a screen
actually renders rather than its outline. Four capture bugs were found
and fixed while comparing frames against the reference shots, and each
one had been silently losing content:

| Symptom in the JSON | Cause | Fix |
|---|---|---|
| Every service-load chart read as prose | the bars are `<span>`, and the selector only looked at `<div>` | select any element with an inline `height: N%`, and carry its `background-color` so the over-capacity gold survives |
| Réservations showed three KPI tiles, not four | tiles were de-duplicated by *value*, so "À confirmer 1" was eaten by "Risque d'absence 1" | collapse only a genuine ancestor/descendant pair showing the same number |
| Row avatars read `À C`, `RIS`, `ACO` | `.rounded-full` matched the status pill before the avatar | match the initials chip (`bg-violet-soft`) and climb to the real row card first |
| Every row's actions were empty | the ancestor walk stopped inside the clickable area, below the action bar | the row card is the highest ancestor still holding exactly one `h4` |

Two things were added rather than fixed: a pill now carries its **tone**
(`bg-danger/10` and `bg-success/10` are the difference between a refusal
and a confirmation, and the class names it exactly), and a recharts chart
now carries its **path geometry**, so a line chart can be redrawn in
Figma instead of described.

The frames were then built by one renderer walking that JSON — a block
registry in Figma mirroring the one in `components/dashboard/blocks/`.
`kpi-grid`, `list`, `table`, `settings`, `rows`, `chart`, `empty`,
`prose` and `split` each have a painter; every painted node binds its
fills, strokes and radii to the `01 Fondations` variables and its text to
the `01 Fondations` styles.

---

## 2. Frames, by section

Ten navigation groups in the specification's order, one Figma Section
each, preceded by the entry flow and followed by the phone sub-section.
Frames are named `‹route› · ‹French title›`; a surface adds
`· ‹surface name›`.

| Section | Frames | What is in it |
|---|---:|---|
| `Entrée` | 3 | `/login` filled with Dar Zellij's owner account · the establishment switcher open on Dar Zellij and Nomad Rooftop · the resolved shell |
| `1 · Aujourd'hui` | 4 | Accueil · Réservations · Réservations · Détail réservation · Calendrier |
| `2 · En service` | 3 | Liste d'attente · Check-in · Briefing |
| `3 · Clients` | 4 | Liste clients · Liste clients · Fiche client · Fiche client (`cus_1`) · Tags et segments |
| `4 · Ma présence` | 3 | Ma fiche · Menu · Avis |
| `5 · Croissance` | 3 | Visibilité · Offres · Expériences |
| `6 · Vie nocturne` | 3 | Guest list · Tables minimums · Promoteurs |
| `7 · Paiements` | 3 | Acomptes · Annulations · Lyfe Pay |
| `8 · Pilotage` | 3 | Performance · Bilans · Campagnes |
| `9 · Établissement` | 3 | Disponibilités · Équipe et rôles · Notifications |
| `10 · Compte` | 3 | Paramètres · Abonnement · Support |
| `Téléphone` | 9 | Accueil · Réservations · Liste d'attente · Check-in · Briefing · Guest list · Tables minimums, at 390 · plus the Check-in sheet and the Détail réservation drawer as phone surfaces |
| **Total** | **44** | 30 venue screens · 2 desktop surfaces · 3 entry · 9 phone |

Seven **margin notes** sit beside the frames that reproduce an empty
state (§4). They are page furniture, not screens, and are not counted
above.

The thirty venue screens are the thirty of `docs/TARGET_SPEC.md`: the
twenty-nine nav entries plus Fiche client, which the specification lists
under Clients but the sidebar reaches through a row rather than a link.

---

## 3. Surfaces

The brief asks for seven. **Two exist in the portal for Dar Zellij and
are built; five have no reachable trigger**, and rather than force a
selector each was established by probe:

| Surface asked for | State |
|---|---|
| Réservations + Détail réservation | **built** — `/restaurant/reservations · Réservations · Détail réservation` |
| Liste clients + Fiche client | **built** — `/restaurant/clients · Liste clients · Fiche client` |
| Réservations + Nouvelle réservation | no surface. The button links to `?nouvelle=1`, and no code reads that parameter — see §6 |
| Réservations + Refuser | no surface. Filtering to "À confirmer" and opening the row offers *Marquer comme arrivé* and *Rappel SMS* only — see §6 |
| Check-in + scanned result card | no surface. The card needs a real reservation code, which the seed does not expose through the UI; an unknown code renders the not-found branch instead |
| Avis + reply being composed | no surface. `/restaurant/avis` carries no action buttons at all — replying is the part waiting on the review platforms, which is why the route's status is *service à brancher* |
| Disponibilités + row in edit | no surface. A service is edited in place; there is no "Modifier" row action to open |

Both phone surfaces the brief asks for — the Check-in sheet and the
Détail réservation drawer — are built.

---

## 4. Where the seed produced an empty state

Reproduced as the portal renders them, each with a margin note naming the
seed condition that would populate it.

| Route | What is empty | Seed condition |
|---|---|---|
| `/restaurant/guest-list` | the whole screen | Paramètres › Type de configuration set to Lounge (or both), then a night opened at the door. The Lounge venue in the dataset is Nomad Rooftop |
| `/restaurant/tables` | Demandes depuis l'application, Types de table, Minimums par type de nuit, Nuits passées | Lounge configuration, then at least one table type defined; requests only arrive once types are published to the app |
| `/restaurant/promoteurs` | the directory, and all three counters | Lounge configuration, then a promoter added; the presentation rate needs announced entries to divide by |
| `/restaurant/clients/cus_1` | Avis laissés | a review row attached to `cus_1`. The four seeded reviews belong to Leïla M., Thomas R., Amina B. and Karim H. |
| `/restaurant/visibilite` | Boost | a boost with a period and a budget. The dataset seeds none, deliberately, so the empty state stays visible |
| `/restaurant/ma-fiche` | Photos (zero) | objects uploaded through the storage driver. The dataset carries no binaries, so the listing has no image — and Visibilité counts the same absence under "Au moins six photos" |
| `/restaurant/check-in` | Trente dernières minutes | a check-in performed less than thirty minutes before the screen is opened. This block is relative to the clock, not to the seed date |

The three Vie nocturne routes deserve their own sentence, because it is
easy to misread them as broken. **The nav gates the group; the routes are
not gated.** A restaurant does not see Vie nocturne in the sidebar, but
`/restaurant/guest-list`, `/restaurant/tables` and `/restaurant/promoteurs`
all answer and render their empty state. All three belong on this page
for that reason, and all three carry the note.

---

## 5. The no-literals audit

Run over every node on page 08, the same script that was run on page 04.

| | Page 08 | Page 04 |
|---|---:|---:|
| Nodes | 8 868 | 4 872 |
| SOLID fills bound to a variable | **6 013** | 3 164 |
| SOLID fills **unbound** | **0** | 0 |
| Strokes bound | 425 | 274 |
| Strokes unbound | 12 | 10 |
| Radii bound | 2 526 | 1 974 |
| Radii unbound | 12 | 10 |
| Text with a style | 1 765 | 450 |

**The audit passes on this page exactly as it did on the partner page.**
Zero unbound fills. The unbound strokes and radii are one per Section —
the hairline and the 2px corner Figma draws on a Section itself, which is
canvas furniture and not part of any frame. Page 04 has ten because it
has ten sections; page 08 has twelve because it has twelve.

**Text.** 1 765 text nodes carry a `01 Fondations` style. 1 187 more sit
inside `Chrome / Sidebar`, `Chrome / Topbar` and `Chrome / BottomTabs`
instances, where the Plugin API reports an empty `textStyleId` on an
instance descendant even though the main component carries the style —
the same count and the same cause as on page 04. That leaves **500 drawn
text nodes without a style**, and they fall into exactly five buckets:

| Size and weight | Count | What it is |
|---|---:|---|
| 10px Bold, +12% tracking | 316 | Pill label — `text-[10px] font-bold tracking-[0.12em]` in `Pill.tsx` |
| 13px SemiBold | 97 | Button `sm` and FilterTabs label — `text-[13px]` |
| 15px Bold | 64 | Avatar initials — `text-[15px] font-bold` in `EntityListBlock.tsx` |
| 9px Bold, +12% tracking | 15 | the same pill at phone scale |
| 14 / 15px SemiBold | 7 | Button `md` and `lg` — `text-[14px]`, `text-[15px]` |
| 36px Fraunces Italic | 1 | the italic clause of the Accueil greeting |

The first five are control labels whose size the code sets inline,
outside the type scale — and the library's own `Button`, `Pill` and
`FilterTabs` components on `02 Composants` carry no text style on those
same labels for the same reason. This page is consistent with the
library, not looser than it. The sixth is the one node where a style had
to be given up: applying `text-h1` and then setting Fraunces Italic
clears `textStyleId`, and 36px Fraunces Italic is the truthful rendering,
so the size was kept and the style lost. `00 Lisez-moi` already carries
the Fraunces note.

---

## 6. What the portal does that is odd

Reproduced, not fixed. This phase changed no product code.

1. **`Nouvelle réservation` is a dead end.** The button links to
   `?nouvelle=1` and nothing in the codebase reads that parameter. The
   link resolves, the page reloads, no drawer opens.
2. **A reservation awaiting a decision cannot be accepted or refused from
   its drawer.** Filtering Réservations to "À confirmer" and opening the
   row offers *Marquer comme arrivé* and *Rappel SMS*. Accept and refuse
   exist on the Accueil "À traiter" rows, and nowhere else.
3. **`/restaurant/avis` has no action buttons at all.** Not a disabled
   reply, not a "service à brancher" notice on the row — nothing.
4. **`/restaurant/disponibilites` has no row action to edit a service.**
   The service rows are inert.
5. **`rounded-[14px]` on the avatar chip** (`EntityListBlock.tsx`) is an
   untokenised radius. It sits between `--radius-chip` (12px) and
   `--radius-md`. The Figma avatars bind `rayon/chip`, so they are 2px
   rounder than the portal — the one deliberate deviation on the page,
   taken because binding a token beat inventing one.

   Following it up found that the no-literals rule holds for colour but
   only half holds for radius: `grep -rno 'rounded-\[[0-9]\+px\]' src`
   returns 26 hits across 19 files (`10px` ×17, `6px` ×4, `14px` ×3,
   `34px` and `44px` once). Phase 6 removed the `rounded-[12px]` because
   `--radius-chip` matched them exactly and left the rest, which the
   README and HANDOFF did not say. Both now do. No code was changed.
6. **Two blocks are clock-relative, not seed-relative** — Accueil's
   greeting (*Bon après-midi* / *Bonsoir*) and its "Les quatre prochaines
   heures" strip, which starts from the current quarter-hour. The frames
   carry the afternoon reading, matching `docs/phase7-reference/`. Re-run
   the extractor at a different hour and both will differ; nothing else
   on the page will.

---

## 7. Comparison against the running portal

Every frame was screenshotted from Figma and put beside its
`docs/phase7-reference/` capture of the same route at the same width.
Differences in structure, order, copy and numbers were treated as bugs
and fixed in Figma; the fixes are the four extractor bugs in §1 plus the
Accueil hero, which had been flattened into three pale tiles and is now
the ink panel with its capacity ring, its three service metrics, its
caption and its engagement chip.

**What still differs, and why.**

| Residual | Where | Why it stays |
|---|---|---|
| KPI tiles have no icon | every screen with a `kpi-grid` | the icon is a Lucide glyph chosen by a string key in the spec; the tile's label, value, delta and meta are all present |
| Row kebab menus absent | list rows that have one | the menu is a Radix portal — it does not exist in the DOM until it is opened, so the extractor cannot see it |
| The dashed capacity line above the load bars | Accueil, Réservations | the line is positioned from `capacity / peak`; the bars carry their own heights and the over-capacity gold, so the reading survives without it |
| Search field and sort control inside a list card | Réservations, Liste clients, Guest list, Tables minimums | the extractor attaches form controls to a `settings` block, and a list block does not carry them |
| Line charts are the curve, without the filled area under it | Accueil, Performance | the area path references an SVG gradient by id; the stroke path is the data |
| `Tout voir →` sits under the list rather than beside the heading | Accueil | the renderer places a block's actions after its content |
| Avatar corner radius 12px vs 14px | every row with an avatar | §6.5 |
| Sidebar and topbar are the library's, not the portal's | every desktop frame | `Chrome / Sidebar` and `Chrome / Topbar` are `02 Composants` instances. The portal's venue switcher card, notification bell and the account card at the foot of the sidebar are not in those components. Changing them is a library change, and the brief keeps the library as the source for components |

Nothing in that list is a difference of copy, of number, or of the order
of anything.

---

## 8. Confirmations

- **Every screen in the schema is present.** Ten groups in the
  specification's order, one Section each, thirty venue screens, plus the
  entry flow before group one and the phone sub-section after group ten.
- **Every screen is populated.** No section is left as a titled
  container: every table has its rows, every list its entries, every
  chart its data, every metric its number, every form its values. Where a
  screen is empty for Dar Zellij, it is empty because the portal is —
  seven such places, each named in §4 with the condition that would fill
  it. Lyfe Pay carries all forty-six transactions and all three payouts;
  Liste clients all twelve clients; Réservations all seven bookings;
  Briefing all nine of its lists.
- **Every frame was compared against the running portal, not built from a
  description.** The content came out of the DOM into
  `docs/phase7-dar-zellij.json`; the frames were built from that file;
  each frame was then put beside its capture in `docs/phase7-reference/`.
  Four content-losing extractor bugs were found that way and fixed, and
  the JSON was re-captured after each.
- **Dar Zellij only.** The lounge delta already exists on
  `04 Espace partenaire`; no Nomad Rooftop frame was added.
- **Reproduce, not improve.** Six oddities are listed in §6 and none was
  fixed in code.
