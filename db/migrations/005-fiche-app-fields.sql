-- What the app's restaurant and bar detail screens show, and the
-- dashboard had nowhere to put.
--
-- The screens carry four labelled lines under « Cuisine & Détails » —
-- type de cuisine, catégorie, fourchette de prix, ambiance — a header
-- that reads « quartier, ville », a photo carousel, a « Menu » pill and
-- a one-line tagline on every list card. Of those the schema already
-- held the category, the price band, the ambience rows and the photos.
--
-- Three columns are new on `venues`: the cuisine (which the category
-- column had been standing in for), the quarter, and the tagline.
--
-- On `onboarding_drafts`, the answers the new steps collect: the
-- cuisine and the price band on step 2, the quarter on step 3, a second
-- photo and the carte on step 4, and the ambience and equipment lists
-- on the optional step between Photos and Horaires.
--
-- Every column is NOT NULL with a default, so an existing row is
-- complete the moment the ALTER lands and no backfill is needed. The
-- cuisine is seeded from the category rather than left empty: that is
-- where a partner's answer to the question has been going.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS tagline  TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS cuisine  TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT '';

UPDATE venues SET cuisine = category WHERE cuisine = '' AND category <> '';

ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS cuisine     TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS price_range INTEGER NOT NULL DEFAULT 2;
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS district    TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS photo2_object_key   TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS photo2_content_type TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS photo2_size_bytes   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS menu_object_key     TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS menu_content_type   TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS menu_size_bytes     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS ambience TEXT NOT NULL DEFAULT '[]';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS features TEXT NOT NULL DEFAULT '[]';

-- The ambience list became a closed vocabulary of ids; the rows written
-- while it was free text hold labels. Only the ones the list has a name
-- for are rewritten — anything else stays as the partner typed it and
-- renders verbatim until they re-pick from the chips.
UPDATE venue_tags SET value = 'elegant'      WHERE kind = 'ambience' AND lower(value) = 'élégant';
UPDATE venue_tags SET value = 'minimaliste'  WHERE kind = 'ambience' AND lower(value) = 'minimaliste';
UPDATE venue_tags SET value = 'moderne'      WHERE kind = 'ambience' AND lower(value) = 'moderne';
UPDATE venue_tags SET value = 'traditionnel' WHERE kind = 'ambience' AND lower(value) = 'traditionnel';
UPDATE venue_tags SET value = 'romantique'   WHERE kind = 'ambience' AND lower(value) = 'romantique';
UPDATE venue_tags SET value = 'familial'     WHERE kind = 'ambience' AND lower(value) = 'familial';
UPDATE venue_tags SET value = 'convivial'    WHERE kind = 'ambience' AND lower(value) = 'convivial';
UPDATE venue_tags SET value = 'festif'       WHERE kind = 'ambience' AND lower(value) = 'festif';
UPDATE venue_tags SET value = 'intimiste'    WHERE kind = 'ambience' AND lower(value) = 'intimiste';
UPDATE venue_tags SET value = 'chaleureux'   WHERE kind = 'ambience' AND lower(value) = 'chaleureux';
