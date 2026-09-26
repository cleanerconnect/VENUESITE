-- The cuisine becomes one of ten ids, and the sentence it used to hold
-- gets a column of its own.
--
-- The app's search screen has a filter row — Marocaine, Japonaise,
-- Italienne, Indienne, Mexicaine, Libanaise, Française, Asiatique,
-- Méditerranéenne, Fusion — and a venue is behind one of those taps or
-- behind none. `venues.cuisine` was free text, so which of them a venue
-- answered to was decided by a substring match on whatever its partner
-- had typed: « Cuisine marocaine contemporaine, tajines et pastilla »
-- matched « Marocaine » by luck, and « cuisine du terroir » matched
-- nothing at all, with a fiche that looked complete either way.
--
-- So `cuisine` now holds the id and `specialties` holds the sentence.
-- The backfill maps the free text onto an id where the text says which
-- one, and keeps the original line in `specialties` either way — an
-- unmapped row loses no words, it loses only a filter it was never
-- reliably in.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS specialties TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS specialties TEXT NOT NULL DEFAULT '';

-- The sentence first, while `cuisine` still holds it. Only where the
-- partner wrote something that is not already an id, and only where
-- `specialties` is still empty, so re-running this changes nothing.
UPDATE venues
   SET specialties = substr(cuisine, 1, 80)
 WHERE specialties = ''
   AND cuisine <> ''
   AND cuisine NOT IN ('marocaine','japonaise','italienne','indienne','mexicaine',
                       'libanaise','francaise','asiatique','mediterraneenne','fusion');

UPDATE onboarding_drafts
   SET specialties = substr(cuisine, 1, 80)
 WHERE specialties = ''
   AND cuisine <> ''
   AND cuisine NOT IN ('marocaine','japonaise','italienne','indienne','mexicaine',
                       'libanaise','francaise','asiatique','mediterraneenne','fusion');

-- Then the id. Accents are matched as written because that is how a
-- partner types them; the id itself never carries one, because it
-- travels in a query string.
UPDATE venues SET cuisine = 'marocaine'       WHERE lower(cuisine) LIKE '%marocain%';
UPDATE venues SET cuisine = 'japonaise'       WHERE lower(cuisine) LIKE '%japonais%';
UPDATE venues SET cuisine = 'italienne'       WHERE lower(cuisine) LIKE '%italien%';
UPDATE venues SET cuisine = 'indienne'        WHERE lower(cuisine) LIKE '%indien%';
UPDATE venues SET cuisine = 'mexicaine'       WHERE lower(cuisine) LIKE '%mexicain%';
UPDATE venues SET cuisine = 'libanaise'       WHERE lower(cuisine) LIKE '%libanais%';
UPDATE venues SET cuisine = 'francaise'       WHERE lower(cuisine) LIKE '%français%'
                                                 OR lower(cuisine) LIKE '%francais%';
UPDATE venues SET cuisine = 'asiatique'       WHERE lower(cuisine) LIKE '%asiatique%';
UPDATE venues SET cuisine = 'mediterraneenne' WHERE lower(cuisine) LIKE '%méditerran%'
                                                 OR lower(cuisine) LIKE '%mediterran%';
UPDATE venues SET cuisine = 'fusion'          WHERE lower(cuisine) LIKE '%fusion%';

-- Anything the ten did not claim is emptied rather than left as prose.
-- An id column holding a sentence is a filter that silently matches
-- nothing, which is the failure this migration exists to end; the
-- sentence is safe in `specialties` and the partner re-picks from a
-- select of ten.
UPDATE venues
   SET cuisine = ''
 WHERE cuisine NOT IN ('marocaine','japonaise','italienne','indienne','mexicaine',
                       'libanaise','francaise','asiatique','mediterraneenne','fusion');

UPDATE onboarding_drafts
   SET cuisine = ''
 WHERE cuisine NOT IN ('','marocaine','japonaise','italienne','indienne','mexicaine',
                       'libanaise','francaise','asiatique','mediterraneenne','fusion');
