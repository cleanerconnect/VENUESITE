-- One venue may have two guests with the same phone number, and many
-- with none at all.
--
-- `idx_customers_venue_phone` was created UNIQUE. The consumer app did
-- not collect a phone, so every guest it created carried `''` — and the
-- *second* person to book a given venue through the app hit « duplicate
-- key value violates unique constraint » and a 500. A shared number is
-- legitimate too: a couple, a family, a concierge booking three rooms.
--
-- The index is kept for the lookup it is actually used for — « is this
-- returning guest already a customer here » — without the assertion.

DROP INDEX IF EXISTS idx_customers_venue_phone;

CREATE INDEX IF NOT EXISTS idx_customers_venue_phone
  ON customers(venue_id, phone);
