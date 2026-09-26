-- The square tile a venue is drawn as in the app's lists.
--
-- The app has a thumbnail slot on every list card and in its search
-- results, and the portal had nowhere to put one: the only pictures a
-- partner could give were the carousel photos, which are 16:9, so the
-- tile was a centre crop of a wide photograph made by whoever rendered
-- it. A logo in that slot came out with its own edges cut off.
--
-- On the venue there is no new column: `venue_assets` already carries
-- a `logo` kind, and one row of it is the vignette. What is new is the
-- onboarding draft, which has to hold the file between step 4 and the
-- moment the venue exists — the same three columns the cover and the
-- carte already have.

ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS thumbnail_object_key   TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS thumbnail_content_type TEXT NOT NULL DEFAULT '';
ALTER TABLE onboarding_drafts ADD COLUMN IF NOT EXISTS thumbnail_size_bytes   INTEGER NOT NULL DEFAULT 0;
