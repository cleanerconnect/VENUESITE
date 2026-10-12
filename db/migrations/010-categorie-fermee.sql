-- « Catégorie » becomes one of eleven ids, and the sentence it used to
-- hold moves to a column of its own.
--
-- The same change `006` made to the cuisine, for the same reason and
-- with one difference. The reason: the app groups establishments by
-- category, and free text cannot be grouped — « Restaurant
-- gastronomique », « gastro », « resto gastronomique » and
-- « Gastronomique » are four strings and one answer, so a venue was
-- either in a group by luck or in none at all, with a fiche that looked
-- complete either way.
--
-- The difference: the list has an « Autre », and `006` had no such
-- escape. A city has places that are none of the ten, and the
-- alternative to an « Autre » with a sentence beside it is a partner
-- picking the nearest wrong one. So a free line that nothing maps lands
-- in `category_other` under `category = 'autre'` rather than being
-- emptied — nothing a partner wrote is lost, and the fiche stays in a
-- group the app can at least name.

-- `venues` only: `onboarding_drafts` has no `category` column, because
-- the six steps never ask for one. A partner answers it on Ma fiche
-- once the venue exists.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS category_other TEXT NOT NULL DEFAULT '';

-- The sentence first, while `category` still holds it. Only where the
-- partner wrote something that is not already an id, and only where
-- `category_other` is still empty, so re-running this changes nothing.
UPDATE venues
   SET category_other = substr(category, 1, 60)
 WHERE category_other = ''
   AND category <> ''
   AND category NOT IN ('restaurant_gastronomique','restaurant_traditionnel','bistrot',
                        'brasserie','rooftop','lounge','bar_a_cocktails','cafe',
                        'salon_de_the','street_food','autre');


-- Then the id. The order matters: « Restaurant gastronomique, riad »
-- has to be read as gastronomique before the bare « restaurant » test
-- would claim it as traditionnel, and « Bar à cocktails, rooftop » is a
-- cocktail bar on a roof — the review's list puts the bar first.
UPDATE venues SET category = 'restaurant_gastronomique'
 WHERE lower(category) LIKE '%gastronomique%';
UPDATE venues SET category = 'bar_a_cocktails'
 WHERE category <> 'restaurant_gastronomique'
   AND (lower(category) LIKE '%cocktail%');
UPDATE venues SET category = 'rooftop'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails')
   AND lower(category) LIKE '%rooftop%';
UPDATE venues SET category = 'salon_de_the'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop')
   AND (lower(category) LIKE '%salon de thé%' OR lower(category) LIKE '%salon de the%');
UPDATE venues SET category = 'street_food'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop','salon_de_the')
   AND (lower(category) LIKE '%street%' OR lower(category) LIKE '%cuisine de rue%');
UPDATE venues SET category = 'brasserie'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop',
                        'salon_de_the','street_food')
   AND lower(category) LIKE '%brasserie%';
UPDATE venues SET category = 'bistrot'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop',
                        'salon_de_the','street_food','brasserie')
   AND (lower(category) LIKE '%bistro%' OR lower(category) LIKE '%bistrot%');
UPDATE venues SET category = 'lounge'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop',
                        'salon_de_the','street_food','brasserie','bistrot')
   AND lower(category) LIKE '%lounge%';
UPDATE venues SET category = 'cafe'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop',
                        'salon_de_the','street_food','brasserie','bistrot','lounge')
   AND (lower(category) LIKE '%café%' OR lower(category) LIKE '%cafe%');
UPDATE venues SET category = 'restaurant_traditionnel'
 WHERE category NOT IN ('restaurant_gastronomique','bar_a_cocktails','rooftop',
                        'salon_de_the','street_food','brasserie','bistrot','lounge','cafe')
   AND (lower(category) LIKE '%traditionnel%' OR lower(category) LIKE '%riad%'
        OR lower(category) LIKE '%marocain%' OR lower(category) LIKE '%restaurant%');

-- Whatever the ten did not claim becomes « Autre », with the partner's
-- own line beside it from the first statement above. An id column
-- holding a sentence is a group the app silently puts nobody in; an
-- « Autre » that carries the sentence is at least the truth.
UPDATE venues
   SET category = 'autre'
 WHERE category NOT IN ('','restaurant_gastronomique','restaurant_traditionnel','bistrot',
                        'brasserie','rooftop','lounge','bar_a_cocktails','cafe',
                        'salon_de_the','street_food','autre');

-- And the sentence is dropped from the rows that landed on one of the
-- ten. It was saved first because mapping overwrites the column it is
-- read from; it is cleared here because `category_other` belongs to
-- « Autre » alone — a line beside « Rooftop » is a second category the
-- screens do not show and nothing reads, and the next save of that
-- fiche would clear it anyway. What the ten lost is a word like
-- « riad », which the id already says in the only form the app can
-- group by.
UPDATE venues
   SET category_other = ''
 WHERE category_other <> ''
   AND category <> 'autre';
