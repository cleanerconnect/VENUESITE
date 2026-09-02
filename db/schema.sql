-- LYFE Business Service — partner dashboard schema.
--
-- This is the schema the Business Service owns in PostgreSQL. It is
-- written in the intersection of Postgres and SQLite DDL so the same file
-- creates the local store that backs the mock adapter — the brief
-- requires the two to behave identically, and one schema is the only way
-- to guarantee that.
--
-- Deliberate choices worth keeping:
--   · Money is stored in integer minor units (centimes). Floating point
--     money is a rounding bug waiting for a settlement to expose it.
--   · Timestamps are ISO-8601 TEXT. Postgres should use timestamptz; the
--     application layer already treats them as opaque ISO strings.
--   · Assets store an OBJECT KEY, never a URL, so the CDN domain can
--     change without a migration.
--   · Booking state transitions are an append-only log, not a column
--     overwrite, because refusal-by-venue and cancellation-by-user are
--     different events and analytics needs to tell them apart.

-- ── Tenancy ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS venues (
  id                   TEXT PRIMARY KEY,
  kind                 TEXT NOT NULL CHECK (kind IN ('restaurant','drinks')),
  name                 TEXT NOT NULL,
  short_name           TEXT NOT NULL,
  initials             TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  category             TEXT NOT NULL DEFAULT '',
  address              TEXT NOT NULL DEFAULT '',
  city                 TEXT NOT NULL,
  latitude             REAL,
  longitude            REAL,
  contact_email        TEXT NOT NULL DEFAULT '',
  contact_phone        TEXT NOT NULL DEFAULT '',
  website              TEXT NOT NULL DEFAULT '',
  currency             TEXT NOT NULL DEFAULT 'MAD',
  capacity             INTEGER NOT NULL DEFAULT 0,
  -- 1-4, rendered in the app as € to €€€€.
  price_range          INTEGER NOT NULL DEFAULT 2,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

-- Listing facets the app renders as chips. Rows rather than a JSON blob
-- so the app can filter on them without parsing.
CREATE TABLE IF NOT EXISTS venue_tags (
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  kind     TEXT NOT NULL CHECK (kind IN ('tag','feature','ambience')),
  value    TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, kind, value)
);

CREATE TABLE IF NOT EXISTS business_accounts (
  business_id       TEXT PRIMARY KEY,
  venue_id          TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  owner_id          TEXT NOT NULL,
  -- Carried because the column exists. Nothing gates on its value;
  -- feature access reads features_enabled. See docs/SCOPE_AUDIT.md.
  subscription_tier TEXT NOT NULL DEFAULT 'annual',
  features_enabled  TEXT NOT NULL DEFAULT '[]',
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_business_accounts_venue ON business_accounts(venue_id);
CREATE INDEX IF NOT EXISTS idx_business_accounts_owner ON business_accounts(owner_id);

-- A person may hold more than one venue, so access is a join table, not
-- a column on the account.
CREATE TABLE IF NOT EXISTS staff (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('owner','manager','staff')),
  last_active  TEXT,
  pending      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_venue_user ON staff(venue_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  -- The venue the session is currently acting on. A switch rewrites this
  -- row; it is never taken from the request body.
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  issued_at   TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ── Assets (S3 object keys, never URLs) ──────────────────────

CREATE TABLE IF NOT EXISTS venue_assets (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('cover','photo','logo','menu_file','export','qr')),
  object_key   TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_venue_kind ON venue_assets(venue_id, kind, position);

-- ── Room ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS zones (
  id        TEXT PRIMARY KEY,
  venue_id  TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  capacity  INTEGER NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_zones_venue ON zones(venue_id);

-- ── Availability ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_slots (
  id         TEXT PRIMARY KEY,
  venue_id   TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  weekday    INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  opens_at   TEXT NOT NULL,
  closes_at  TEXT NOT NULL,
  capacity   INTEGER NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  -- Bumped on every write. A concurrent edit that read an older value is
  -- rejected rather than silently overwriting — availability is the one
  -- edit that changes what customers can book right now.
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_slots_venue_day ON availability_slots(venue_id, weekday);

CREATE TABLE IF NOT EXISTS closures (
  id       TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  reason   TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_closures_venue_date ON closures(venue_id, date);

-- ── Services ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
  id                TEXT PRIMARY KEY,
  venue_id          TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  label             TEXT NOT NULL,
  date              TEXT NOT NULL,
  opens_at          TEXT NOT NULL,
  closes_at         TEXT NOT NULL,
  state             TEXT NOT NULL DEFAULT 'scheduled',
  capacity          INTEGER NOT NULL,
  booked_covers     INTEGER NOT NULL DEFAULT 0,
  arrived_covers    INTEGER NOT NULL DEFAULT 0,
  no_show_covers    INTEGER NOT NULL DEFAULT 0,
  revenue_cents     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_venue_date ON services(venue_id, date);

CREATE TABLE IF NOT EXISTS service_slot_load (
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  at         TEXT NOT NULL,
  covers     INTEGER NOT NULL,
  PRIMARY KEY (service_id, at)
);

-- ── Customers ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  id                    TEXT PRIMARY KEY,
  venue_id              TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  -- The consumer-app user, when the booking came from the app. Loyalty is
  -- keyed on this, not on the local record.
  app_user_id           TEXT,
  full_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  first_seen_at         TEXT NOT NULL,
  last_visit_at         TEXT,
  visit_count           INTEGER NOT NULL DEFAULT 0,
  total_spend_cents     INTEGER NOT NULL DEFAULT 0,
  -- Read from the loyalty service, never derived here.
  loyalty_tier          TEXT,
  loyalty_points        INTEGER,
  opted_out_of_marketing INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_customers_venue ON customers(venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_venue_phone ON customers(venue_id, phone);

CREATE TABLE IF NOT EXISTS customer_preferences (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  PRIMARY KEY (customer_id, label)
);

-- ── Reservations ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservations (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  service_id    TEXT REFERENCES services(id) ON DELETE SET NULL,
  customer_id   TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name    TEXT NOT NULL,
  guest_phone   TEXT NOT NULL,
  party_size    INTEGER NOT NULL,
  at            TEXT NOT NULL,
  -- The shared lifecycle. `rejected` (venue refused) and `cancelled`
  -- (user withdrew) are distinct states and must never be collapsed.
  state         TEXT NOT NULL CHECK (state IN
                  ('requested','confirmed','modified','cancelled','rejected',
                   'waitlisted','arrived','no_show','completed')),
  channel       TEXT NOT NULL,
  zone_id       TEXT REFERENCES zones(id) ON DELETE SET NULL,
  note          TEXT,
  deposit_cents INTEGER,
  no_show_risk  REAL,
  -- The app-side QR (EP20-US9). The portal validates it, never mints it.
  qr_code       TEXT,
  checked_in_at TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reservations_venue_at ON reservations(venue_id, at);
CREATE INDEX IF NOT EXISTS idx_reservations_venue_state ON reservations(venue_id, state);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_qr ON reservations(qr_code);

-- Append-only. A status column alone loses who acted and why, which is
-- exactly what quality analytics needs.
CREATE TABLE IF NOT EXISTS reservation_status_history (
  id             TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  from_state     TEXT,
  to_state       TEXT NOT NULL,
  actor          TEXT NOT NULL CHECK (actor IN ('venue','user','system')),
  actor_id       TEXT,
  reason_code    TEXT,
  note           TEXT,
  at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_history_reservation
  ON reservation_status_history(reservation_id, at);

CREATE TABLE IF NOT EXISTS no_show_records (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id    TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  party_size     INTEGER NOT NULL,
  at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_no_shows_customer ON no_show_records(customer_id, at);

-- ── Menu ─────────────────────────────────────────────────────

-- A dish as the app displays it: no cost, no stock, no covers sold.
CREATE TABLE IF NOT EXISTS menu_items (
  id          TEXT PRIMARY KEY,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  signature   INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1,
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_menu_venue ON menu_items(venue_id, position);

CREATE TABLE IF NOT EXISTS menu_item_dietary (
  item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);

-- ── Reviews ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name  TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL DEFAULT '',
  channel     TEXT NOT NULL,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_venue_at ON reviews(venue_id, at);

CREATE TABLE IF NOT EXISTS review_replies (
  id         TEXT PRIMARY KEY,
  review_id  TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  author_id  TEXT NOT NULL,
  -- Stays 0 until moderation rules are defined; the flag lives on the row
  -- so a policy change is a backfill, not a redeploy.
  published  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_replies_review ON review_replies(review_id);

CREATE TABLE IF NOT EXISTS review_tags (
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY (review_id, tag)
);

-- ── Notifications ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  venue_id   TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channels   TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (venue_id, event_type)
);

CREATE TABLE IF NOT EXISTS notifications (
  id       TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  type     TEXT NOT NULL,
  title    TEXT NOT NULL,
  body     TEXT NOT NULL,
  href     TEXT,
  read     INTEGER NOT NULL DEFAULT 0,
  at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_venue ON notifications(venue_id, at);

-- ── Money & visibility ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS payouts (
  id               TEXT PRIMARY KEY,
  venue_id         TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reference        TEXT NOT NULL,
  amount_cents     INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  covers_settled   INTEGER NOT NULL,
  period_start     TEXT NOT NULL,
  period_end       TEXT NOT NULL,
  scheduled_for    TEXT NOT NULL,
  paid_at          TEXT,
  state            TEXT NOT NULL DEFAULT 'scheduled'
);
CREATE INDEX IF NOT EXISTS idx_payouts_venue ON payouts(venue_id, scheduled_for);

CREATE TABLE IF NOT EXISTS boost_campaigns (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  starts_at    TEXT NOT NULL,
  ends_at      TEXT NOT NULL,
  budget_cents INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boosts_venue ON boost_campaigns(venue_id, starts_at);

-- Rolled up by the tracking pipeline (EP10/EP22), read-only to the portal.
CREATE TABLE IF NOT EXISTS analytics_daily (
  venue_id        TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  covers_served   INTEGER NOT NULL DEFAULT 0,
  revenue_cents   INTEGER NOT NULL DEFAULT 0,
  no_shows        INTEGER NOT NULL DEFAULT 0,
  bookings_made   INTEGER NOT NULL DEFAULT 0,
  bookings_refused INTEGER NOT NULL DEFAULT 0,
  capacity        INTEGER NOT NULL DEFAULT 0,
  impressions     INTEGER NOT NULL DEFAULT 0,
  listing_views   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, date)
);

-- ── Activity ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity (
  id              TEXT PRIMARY KEY,
  venue_id        TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  actor           TEXT NOT NULL,
  message         TEXT NOT NULL,
  reservation_id  TEXT,
  needs_attention INTEGER NOT NULL DEFAULT 0,
  at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_venue_at ON activity(venue_id, at);
