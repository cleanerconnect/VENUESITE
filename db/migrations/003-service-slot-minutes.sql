-- The slot length a venue offers, per service.
--
-- 30 minutes for every existing service, because that is the grid the
-- portal and the app have both assumed since the first commit: the
-- default preserves what is already booked rather than re-cutting it.

ALTER TABLE service_definitions
  ADD COLUMN slot_minutes INTEGER NOT NULL DEFAULT 30;

ALTER TABLE service_definitions
  ADD CONSTRAINT service_definitions_slot_minutes_check
  CHECK (slot_minutes IN (15, 30, 60));
