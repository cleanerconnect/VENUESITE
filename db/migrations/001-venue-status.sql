-- LYFE reviews a listing before the app shows it.
--
-- Every venue that predates this migration is already live, so it is
-- stamped 'validated' with its creation date: the review flow starts
-- with the venues created after it.

-- Idempotente, comme les trois autres.
--
-- Une migration qu'un opérateur pressé a appliquée à la main sans
-- écrire sa ligne dans `schema_migrations` était rejouée au déploiement
-- suivant, échouait sur « column already exists », et faisait échouer
-- toute la transaction. `IF NOT EXISTS` sur les colonnes et un garde sur
-- la contrainte rendent le rejeu inoffensif.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS status_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS status_changed_at TEXT;

-- Seuls les établissements qui n'ont pas encore été décidés.
UPDATE venues SET status = 'validated', status_changed_at = created_at
 WHERE status_changed_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venues_status_check'
  ) THEN
    ALTER TABLE venues ADD CONSTRAINT venues_status_check
      CHECK (status IN ('pending_review','validated','rejected'));
  END IF;
END $$;
