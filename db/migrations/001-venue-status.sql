-- LYFE reviews a listing before the app shows it.
--
-- Every venue that predates this migration is already live, so it is
-- stamped 'validated' with its creation date: the review flow starts
-- with the venues created after it.

ALTER TABLE venues ADD COLUMN status TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE venues ADD COLUMN status_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN status_changed_at TEXT;

UPDATE venues SET status = 'validated', status_changed_at = created_at;

ALTER TABLE venues ADD CONSTRAINT venues_status_check
  CHECK (status IN ('pending_review','validated','rejected'));
