-- « Mode de gestion des réservations » — DigiNegoce, 27 October.
--
-- The creation flow now asks, before anything else, where a booking
-- for this establishment is supposed to land: in the LYFE dashboard,
-- on WhatsApp, or in the partner's own system through our API. The
-- answer is a fact about the venue, not a preference about the portal,
-- so it lives on the venue row.
--
-- 'dashboard' for every venue that already exists, which is what they
-- have been doing all along: the column's default is the honest
-- back-fill here, not a guess.
ALTER TABLE venues
  ADD COLUMN management_mode TEXT NOT NULL DEFAULT 'dashboard';

-- The draft carries it too, so the answer survives the tab closing the
-- way every other answer in the flow does.
ALTER TABLE onboarding_drafts
  ADD COLUMN management_mode TEXT NOT NULL DEFAULT 'dashboard';

-- No CHECK on either ALTER: SQLite cannot add a constraint to an
-- existing table without rewriting it, and rewriting two tables to
-- guard a value both writers already validate is a migration that can
-- fail in production to protect against a bug that cannot reach it.
-- `db/schema.sql` carries the CHECK for every database created from
-- here on; `isManagementMode` guards the writes.
