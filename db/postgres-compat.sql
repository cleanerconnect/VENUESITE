-- SQLite's date and time functions, for Postgres.
--
-- `db/schema.sql` is in the intersection of the two dialects, but the
-- *queries* the stores run are not quite: a handful reach for
-- `strftime`, `julianday`, `date(x, modifier)` and `datetime(x)`, which
-- SQLite has and Postgres does not. There were two ways to close that
-- gap: carry two spellings of thirty queries in the application, or
-- teach Postgres the four functions once. This is the second.
--
-- Every timestamp in this schema is TEXT in ISO-8601 — that is what
-- makes it portable — so these take text and hand back what SQLite
-- hands back. `'now'` is accepted wherever SQLite accepts it.
--
-- Applied by `npm run db:migrate`, after the schema.

CREATE SCHEMA IF NOT EXISTS lyfe_compat;

-- ── the instant a value names ────────────────────────────────
CREATE OR REPLACE FUNCTION lyfe_compat.as_ts(value text)
RETURNS timestamp
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN value IS NULL THEN NULL
    WHEN lower(value) IN ('now', 'now()') THEN now()::timestamp
    ELSE value::timestamp
  END
$$;

-- ── julianday(x) ─────────────────────────────────────────────
-- Days since noon UTC, 24 November 4714 BC. Only ever used here as a
-- difference between two of them, but it is the real number so that a
-- query which does something else with it still means what it says.
CREATE OR REPLACE FUNCTION public.julianday(value text)
RETURNS double precision
LANGUAGE sql IMMUTABLE AS $$
  SELECT EXTRACT(EPOCH FROM lyfe_compat.as_ts(value)) / 86400.0 + 2440587.5
$$;

-- ── datetime(x) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.datetime(value text)
RETURNS timestamp
LANGUAGE sql IMMUTABLE AS $$
  SELECT lyfe_compat.as_ts(value)
$$;

-- ── date(x) and date(x, modifier) ────────────────────────────
-- `date('now', '-30 days')` is SQLite's window arithmetic. The modifier
-- reads as a Postgres interval as-is, which is the whole trick.
CREATE OR REPLACE FUNCTION public.date(value text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(lyfe_compat.as_ts(value), 'YYYY-MM-DD')
$$;

CREATE OR REPLACE FUNCTION public.date(value text, modifier text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(lyfe_compat.as_ts(value) + modifier::interval, 'YYYY-MM-DD')
$$;

-- ── strftime(format, x) ──────────────────────────────────────
-- The five formats the queries use: %Y, %m, %d, %H, %M and %w. %w is
-- SQLite's day of week, 0 = Sunday, which `to_char(…, 'D')` returns as
-- 1 = Sunday, so it is shifted rather than renamed.
CREATE OR REPLACE FUNCTION public.strftime(fmt text, value text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE fmt
    WHEN '%Y' THEN to_char(lyfe_compat.as_ts(value), 'YYYY')
    WHEN '%m' THEN to_char(lyfe_compat.as_ts(value), 'MM')
    WHEN '%d' THEN to_char(lyfe_compat.as_ts(value), 'DD')
    WHEN '%H' THEN to_char(lyfe_compat.as_ts(value), 'HH24')
    WHEN '%M' THEN to_char(lyfe_compat.as_ts(value), 'MI')
    WHEN '%w' THEN (EXTRACT(DOW FROM lyfe_compat.as_ts(value)))::int::text
    WHEN '%Y-%m' THEN to_char(lyfe_compat.as_ts(value), 'YYYY-MM')
    WHEN '%Y-%m-%d' THEN to_char(lyfe_compat.as_ts(value), 'YYYY-MM-DD')
    ELSE to_char(lyfe_compat.as_ts(value), fmt)
  END
$$;
