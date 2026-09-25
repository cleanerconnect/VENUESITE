-- The slot length a venue offers, per service.
--
-- 30 minutes for every existing service, because that is the grid the
-- portal and the app have both assumed since the first commit: the
-- default preserves what is already booked rather than re-cutting it.

-- Idempotente : une migration appliquée à la main sans sa ligne au
-- registre était rejouée et faisait échouer toute la transaction.
ALTER TABLE service_definitions
  ADD COLUMN IF NOT EXISTS slot_minutes INTEGER NOT NULL DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_definitions_slot_minutes_check'
  ) THEN
    ALTER TABLE service_definitions
      ADD CONSTRAINT service_definitions_slot_minutes_check
      CHECK (slot_minutes IN (15, 30, 60));
  END IF;
END $$;
