-- Lot 1 · un compte par établissement, sur une base qui existe déjà.
--
-- Le périmètre arrêté avec DigiNegoce le 5 octobre est
-- « Authentification + Création de Venue + Gestion des réservations » :
-- pas de rôles, pas de sélecteur d'établissement. `db/seed.mjs` le
-- respecte depuis, mais une semence ne rejoue pas — elle ne s'exécute
-- que sur une base vide. La base de production, elle, porte encore les
-- quatre personnes de Dar Zellij et les trois du Nomad, et
-- `rachid@darzellij.ma` y tient deux établissements : il arrive donc sur
-- le sélecteur, qui est précisément l'écran que le lot ne vend pas.
--
-- Cette migration amène une base existante là où la semence du lot 1
-- l'aurait mise :
--
--   Dar Zellij     → usr_rachid, propriétaire, seul
--   Nomad Rooftop  → usr_sofia,  propriétaire, seule
--
-- Elle ne touche que les lignes du jeu de démonstration — les deux
-- établissements que la semence crée, et les cinq identifiants qu'elle
-- écrit. Un partenaire arrivé par /inscription a son propre user_id et
-- son propre établissement : rien ici ne le nomme, donc rien ici ne le
-- supprime.
--
-- Réservée au lot 1 par son nom de fichier : sous `LYFE_LOT=2` elle est
-- ignorée et n'est pas inscrite au registre, de sorte qu'un déploiement
-- basculé sur le lot 1 plus tard la reçoive à ce moment-là.

-- ── Dar Zellij ──────────────────────────────────────────────────────
--
-- Rachid y est déjà, en « manager » : la ligne existe, c'est son rôle
-- qui change.
UPDATE staff
   SET role = 'owner', pending = 0
 WHERE venue_id = 'rst_dar_zellij'
   AND user_id = 'usr_rachid';

-- Une base où il n'y serait pas : la ligne du propriétaire lui revient
-- plutôt que d'en créer une seconde, ce que l'index unique
-- (venue_id, user_id) refuserait de toute façon.
UPDATE staff
   SET user_id   = 'usr_rachid',
       full_name = 'Rachid Amrani',
       email     = 'rachid@darzellij.ma',
       role      = 'owner',
       pending   = 0
 WHERE venue_id = 'rst_dar_zellij'
   AND user_id = 'usr_yassine'
   AND NOT EXISTS (
         SELECT 1 FROM staff AS held
          WHERE held.venue_id = 'rst_dar_zellij'
            AND held.user_id = 'usr_rachid'
       );

DELETE FROM staff
 WHERE venue_id = 'rst_dar_zellij'
   AND user_id <> 'usr_rachid'
   AND user_id IN ('usr_yassine', 'usr_imane', 'usr_karim', 'usr_sofia', 'usr_mido');

-- ── Nomad Rooftop ───────────────────────────────────────────────────
UPDATE staff
   SET role = 'owner', pending = 0
 WHERE venue_id = 'bar_nomad_casa'
   AND user_id = 'usr_sofia';

UPDATE staff
   SET user_id   = 'usr_sofia',
       full_name = 'Sofia Bennis',
       email     = 'sofia@nomadrooftop.ma',
       role      = 'owner',
       pending   = 0
 WHERE venue_id = 'bar_nomad_casa'
   AND user_id = 'usr_yassine'
   AND NOT EXISTS (
         SELECT 1 FROM staff AS held
          WHERE held.venue_id = 'bar_nomad_casa'
            AND held.user_id = 'usr_sofia'
       );

DELETE FROM staff
 WHERE venue_id = 'bar_nomad_casa'
   AND user_id <> 'usr_sofia'
   AND user_id IN ('usr_yassine', 'usr_rachid', 'usr_imane', 'usr_karim', 'usr_mido');

-- ── Le compte commercial suit la personne ───────────────────────────
--
-- `business_accounts.owner_id` ne porte aucun droit — l'accès passe par
-- `staff` — mais le laisser sur usr_yassine ferait dire deux choses
-- différentes à la base sur qui tient Dar Zellij.
UPDATE business_accounts
   SET owner_id = 'usr_rachid'
 WHERE venue_id = 'rst_dar_zellij'
   AND owner_id IN ('usr_yassine', 'usr_imane', 'usr_karim');

UPDATE business_accounts
   SET owner_id = 'usr_sofia'
 WHERE venue_id = 'bar_nomad_casa'
   AND owner_id IN ('usr_yassine', 'usr_rachid', 'usr_imane', 'usr_karim');
