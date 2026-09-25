-- LYFE's own staff, who review listings.
--
-- No rows are inserted here: who works for LYFE is not something a
-- migration can know. `db/seed.mjs` creates one for the demo dataset,
-- and a deployment adds its own.

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    TEXT PRIMARY KEY,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
