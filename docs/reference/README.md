# Reference documents

Source documents the scope is argued from, committed so a claim in
`HANDOFF.md` or a PR can be checked without asking anyone for a file.

## `Planning_Lyfe_V3_20260923.xlsx`

DigiNegoce's Planning Lyfe V3, dated 23 September 2026. Two rows decide
what the venue dashboard ships first, and both are quoted verbatim
wherever this repository states the scope.

### `Planning V3`, row **Prio 02** (row 39)

| Column | Value |
| --- | --- |
| `Sprint` | `Prio 02` |
| `Date début prévisionnelle` | 12 October 2026 |
| `Date fin Prévisionnelle` | 30 October 2026 |
| `Fonctionnalités couvertes` | `Restau & Drinks :` · `- Dashobaord basique (Authentification + Création de Venue + Gestion des reservation uniquement)` · `- Réservation via whatsapp` · `- Ano & Changes` |
| `Prérequis à préparer 10 jours avant le démarrage du Sprint` | `Restau & Drinks` · `- Mauettes pour Dasboard Restau & Drinks` · `- Maquettes pour authentification partenaire Venue` · `- Débloquer les campagnes Whatsapp` |

The maquette date is not written in the sheet; it follows from the
prerequisite column, whose header reads *« Prérequis à préparer 10 jours
avant le démarrage du Sprint »*. Ten days before 12 October is
**2 October 2026**, and that is the date this repository commits to.

### `Détail Sprint `, row **40**

| Column | Value |
| --- | --- |
| `EPIC` | `Dashboard` |
| `US - Name` | `Dashboard restaurant partenaire web` |
| `User Story (US)` | `Mise en place des Dashboards basique (Authentification + Création de Venue + Gestion des reservation uniquement)` |
| `Phase` | `BETA` |
| `Nouveau Sprint 092026` | `SP-Prio 02` |
| `Statut` | `A faire` |

Row 41 is the same user story for `Dashboard Drinks/Cellar partenaire`,
which is why the lounge configuration renders the same seven screens.

### What the two rows decide

*« Gestion des reservation **uniquement** »* is the operative word. Lot 1
is authentication, the venue's own record, and the booking work — and
nothing else. Row 133 of `Détail Sprint ` puts *« Mise en place des
Dashboards avancés »* in `SP-Prio 08` (22 February – 12 March 2027),
which is where every other screen in this repository belongs.
