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

-- ═════════════════════════════════════════════════════════════
-- Phase 5 — the rest of the venue perimeter.
--
-- Same rules as above: every row carries `venue_id` and every store
-- function scopes by it, money is centimes, timestamps are ISO text,
-- assets are object keys. Where a policy is versioned or a write is
-- replayable, the row carries `version` or an idempotency key rather
-- than trusting the client to send the same thing twice safely.
-- ═════════════════════════════════════════════════════════════

-- ── Service time ─────────────────────────────────────────────

-- The door list. Separate from `reservations` on purpose: a party that
-- walks in has no booking, and seating one CREATES a reservation row so
-- the CRM captures the visit. Collapsing the two would make "waiting"
-- and "booked" the same state, which the room manifestly disagrees with.
CREATE TABLE IF NOT EXISTS waitlist (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name     TEXT NOT NULL,
  guest_phone    TEXT NOT NULL DEFAULT '',
  party_size     INTEGER NOT NULL,
  -- Minutes promised at the door. Edited by "Modifier le délai".
  quoted_minutes INTEGER NOT NULL,
  added_at       TEXT NOT NULL,
  notified_at    TEXT,
  seated_at      TEXT,
  removed_at     TEXT,
  source         TEXT NOT NULL CHECK (source IN ('walk_in','app')),
  status         TEXT NOT NULL CHECK (status IN ('waiting','notified','seated','left')),
  -- Only set when status is 'left'. Coded so the door can be analysed.
  removal_reason TEXT CHECK (removal_reason IN ('parti','no_show','doublon')),
  note           TEXT NOT NULL DEFAULT '',
  -- The booking created by "Installer", so the visit is one chain.
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_waitlist_venue_status ON waitlist(venue_id, status, added_at);

-- Per-venue door settings: is the online list open, what does it accept.
CREATE TABLE IF NOT EXISTS waitlist_settings (
  venue_id           TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  online_open        INTEGER NOT NULL DEFAULT 1,
  max_party_online   INTEGER NOT NULL DEFAULT 6,
  default_quote_min  INTEGER NOT NULL DEFAULT 20,
  paused_reason      TEXT NOT NULL DEFAULT '',
  updated_at         TEXT NOT NULL
);

-- Manager notes read at the pre-service briefing.
CREATE TABLE IF NOT EXISTS shift_notes (
  id         TEXT PRIMARY KEY,
  venue_id   TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  author_id  TEXT NOT NULL,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shift_notes_venue_date ON shift_notes(venue_id, date);

-- What Disponibilités actually edits: the recurring service definition.
-- `services` above is one dated occurrence of one of these.
CREATE TABLE IF NOT EXISTS service_definitions (
  id                 TEXT PRIMARY KEY,
  venue_id           TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  kind               TEXT NOT NULL,
  -- "1,2,3,4,5" — ISO weekdays the service runs.
  weekdays           TEXT NOT NULL,
  starts_at          TEXT NOT NULL,
  ends_at            TEXT NOT NULL,
  last_booking_at    TEXT NOT NULL,
  capacity_covers    INTEGER NOT NULL,
  -- Covers accepted per quarter hour — the pacing ceiling per slot.
  covers_per_quarter INTEGER NOT NULL DEFAULT 0,
  turn_minutes_small INTEGER NOT NULL DEFAULT 90,
  turn_minutes_large INTEGER NOT NULL DEFAULT 120,
  enabled            INTEGER NOT NULL DEFAULT 1,
  position           INTEGER NOT NULL DEFAULT 0,
  version            INTEGER NOT NULL DEFAULT 1,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_service_definitions_venue ON service_definitions(venue_id, position);

-- Zones a service will take bookings for. Booking preference, not layout.
CREATE TABLE IF NOT EXISTS service_zones (
  service_definition_id TEXT NOT NULL REFERENCES service_definitions(id) ON DELETE CASCADE,
  zone_id               TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  PRIMARY KEY (service_definition_id, zone_id)
);

-- The rules that decide what the app offers. One row per venue; the
-- version is checked on write so a stale edit is refused, not merged.
CREATE TABLE IF NOT EXISTS pacing_rules (
  venue_id             TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  max_arrivals_quarter INTEGER NOT NULL DEFAULT 12,
  max_covers_service   INTEGER NOT NULL DEFAULT 120,
  max_party_online     INTEGER NOT NULL DEFAULT 8,
  min_party_online     INTEGER NOT NULL DEFAULT 1,
  -- Parties above this go to request-only rather than confirming.
  request_only_above   INTEGER NOT NULL DEFAULT 8,
  -- How far ahead the book opens, and how late a same-day booking lands.
  booking_window_days  INTEGER NOT NULL DEFAULT 60,
  same_day_cutoff      TEXT NOT NULL DEFAULT '18:00',
  min_lead_minutes     INTEGER NOT NULL DEFAULT 60,
  online_booking_open  INTEGER NOT NULL DEFAULT 1,
  reopen_at            TEXT,
  version              INTEGER NOT NULL DEFAULT 1,
  updated_at           TEXT NOT NULL
);

-- Per-day capacity overrides set from Calendrier.
CREATE TABLE IF NOT EXISTS capacity_overrides (
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  note     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (venue_id, date)
);

-- ── Guest vocabulary ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id          TEXT PRIMARY KEY,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  -- A token name, never a hex value: the palette is the design system's.
  colour      TEXT NOT NULL DEFAULT 'violet',
  -- 'manual' is applied by hand; 'auto' is maintained by a rule below.
  origin      TEXT NOT NULL CHECK (origin IN ('manual','auto')),
  staff_visible INTEGER NOT NULL DEFAULT 1,
  archived    INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tags_venue ON tags(venue_id, position);

CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  applied_at  TEXT NOT NULL,
  PRIMARY KEY (customer_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_tags_venue ON customer_tags(venue_id, tag_id);

-- The editable thresholds behind each automatic tag. Kept as rows so a
-- venue can move "Habitué" from 4 visits to 6 without a deploy.
CREATE TABLE IF NOT EXISTS tag_rules (
  id         TEXT PRIMARY KEY,
  venue_id   TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  rule       TEXT NOT NULL CHECK (rule IN
               ('habitue','gros_panier','a_risque','nouveau','inactif')),
  -- Visits, no-shows, or a spend floor in centimes, per rule.
  threshold  INTEGER NOT NULL,
  window_days INTEGER NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tag_rules_venue ON tag_rules(venue_id);

-- A saved combination of tags and filters, reusable in Liste clients
-- and in Campagnes. Criteria are JSON because the filter set is the
-- screen's vocabulary, not the database's.
CREATE TABLE IF NOT EXISTS segments (
  id          TEXT PRIMARY KEY,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  criteria    TEXT NOT NULL DEFAULT '{}',
  -- Cached count, refreshed by the segment job. Never authoritative.
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_segments_venue ON segments(venue_id);

-- ── Growth ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offers (
  id              TEXT PRIMARY KEY,
  venue_id        TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN
                    ('percent','amount','free_item','set_menu')),
  -- Percent points, or centimes, depending on `kind`.
  value           INTEGER NOT NULL,
  free_item_label TEXT NOT NULL DEFAULT '',
  weekdays        TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
  service_ids     TEXT NOT NULL DEFAULT '[]',
  starts_on       TEXT NOT NULL,
  ends_on         TEXT NOT NULL,
  -- Nothing beyond this many covers gets the offer. 0 means uncapped.
  cover_cap       INTEGER NOT NULL DEFAULT 0,
  min_party       INTEGER NOT NULL DEFAULT 1,
  prepayment_required INTEGER NOT NULL DEFAULT 0,
  channel         TEXT NOT NULL DEFAULT 'app',
  status          TEXT NOT NULL CHECK (status IN
                    ('draft','scheduled','active','paused','archived')),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_venue ON offers(venue_id, starts_on);

-- Attribution, so "reservations attributed" is counted, not estimated.
CREATE TABLE IF NOT EXISTS offer_redemptions (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  offer_id       TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  covers         INTEGER NOT NULL,
  at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_offer ON offer_redemptions(offer_id, at);

CREATE TABLE IF NOT EXISTS experiences (
  id                TEXT PRIMARY KEY,
  venue_id          TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL CHECK (status IN
                      ('brouillon','publie','complet','termine')),
  starts_at         TEXT NOT NULL,
  ends_at           TEXT NOT NULL,
  -- Empty for a one-off; otherwise 'weekly', 'monthly', …
  recurrence        TEXT NOT NULL DEFAULT '',
  capacity          INTEGER NOT NULL,
  price_cents       INTEGER NOT NULL,
  -- 0 = nothing up front, 100 = full prepayment, anything between is a
  -- deposit percentage. One column beats a flag plus an amount.
  prepay_percent    INTEGER NOT NULL DEFAULT 0,
  cancellation_terms TEXT NOT NULL DEFAULT '',
  cover_asset_id    TEXT REFERENCES venue_assets(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_experiences_venue ON experiences(venue_id, starts_at);

CREATE TABLE IF NOT EXISTS experience_addons (
  id            TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  price_cents   INTEGER NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_experience_addons ON experience_addons(experience_id, position);

-- One sold seat. The QR is minted app-side; the portal only validates it.
CREATE TABLE IF NOT EXISTS tickets (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  customer_id   TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name    TEXT NOT NULL,
  guest_phone   TEXT NOT NULL DEFAULT '',
  seats         INTEGER NOT NULL DEFAULT 1,
  addons        TEXT NOT NULL DEFAULT '[]',
  amount_cents  INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN
                  ('reserve','paye','utilise','rembourse','annule')),
  qr_code       TEXT,
  checked_in_at TEXT,
  purchased_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_experience ON tickets(experience_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_qr ON tickets(qr_code);

-- ── Paiements ────────────────────────────────────────────────

-- When a booking needs money up front. Ordered rules, first match wins.
CREATE TABLE IF NOT EXISTS deposit_policies (
  id              TEXT PRIMARY KEY,
  venue_id        TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  applies_to      TEXT NOT NULL CHECK (applies_to IN
                    ('party_size','service','night','experience','table')),
  -- Party-size floor, or the id of the service / experience / table type.
  applies_value   TEXT NOT NULL DEFAULT '',
  mode            TEXT NOT NULL CHECK (mode IN
                    ('none','imprint','per_person','full')),
  amount_cents    INTEGER NOT NULL DEFAULT 0,
  no_show_fee_cents INTEGER NOT NULL DEFAULT 0,
  late_cancel_fee_cents INTEGER NOT NULL DEFAULT 0,
  grace_minutes   INTEGER NOT NULL DEFAULT 15,
  enabled         INTEGER NOT NULL DEFAULT 1,
  position        INTEGER NOT NULL DEFAULT 0,
  version         INTEGER NOT NULL DEFAULT 1,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deposit_policies_venue ON deposit_policies(venue_id, position);

CREATE TABLE IF NOT EXISTS deposits (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  policy_id      TEXT REFERENCES deposit_policies(id) ON DELETE SET NULL,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE,
  ticket_id      TEXT REFERENCES tickets(id) ON DELETE CASCADE,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name     TEXT NOT NULL,
  amount_cents   INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN
                   ('demande','paye','libere','capture','rembourse','echoue')),
  -- The Payzone reference, once the processor has one.
  processor_ref  TEXT,
  -- Sent with every capture and refund so a replayed request is refused
  -- rather than charging the guest twice.
  idempotency_key TEXT,
  requested_at   TEXT NOT NULL,
  paid_at        TEXT,
  settled_at     TEXT,
  failure_reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_deposits_venue_status ON deposits(venue_id, status, requested_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_idempotency ON deposits(idempotency_key);

CREATE TABLE IF NOT EXISTS cancellation_policies (
  venue_id          TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  free_until_hours  INTEGER NOT NULL DEFAULT 24,
  late_fee_cents    INTEGER NOT NULL DEFAULT 0,
  no_show_fee_cents INTEGER NOT NULL DEFAULT 0,
  -- Shown to the guest in the app at booking. Previewed in Annulations.
  guest_message     TEXT NOT NULL DEFAULT '',
  version           INTEGER NOT NULL DEFAULT 1,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cancellation_log (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  guest_name     TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('annulation','no_show')),
  -- Who ended the booking. The two are never collapsed, upstream or here.
  actor          TEXT NOT NULL CHECK (actor IN ('guest','venue','system')),
  reason         TEXT NOT NULL DEFAULT '',
  fee_cents      INTEGER NOT NULL DEFAULT 0,
  waived         INTEGER NOT NULL DEFAULT 0,
  disputed       INTEGER NOT NULL DEFAULT 0,
  at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cancellation_log_venue ON cancellation_log(venue_id, at);

-- The only legitimate source for "spend" anywhere in the dashboard.
-- Where this table has nothing for a venue, the spend tiles are hidden.
CREATE TABLE IF NOT EXISTS transactions (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  payout_id      TEXT REFERENCES payouts(id) ON DELETE SET NULL,
  amount_cents   INTEGER NOT NULL,
  fee_cents      INTEGER NOT NULL DEFAULT 0,
  method         TEXT NOT NULL CHECK (method IN ('wallet','carte','tpe')),
  status         TEXT NOT NULL CHECK (status IN ('reussie','remboursee','echouee')),
  processor_ref  TEXT,
  at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_venue_at ON transactions(venue_id, at);
CREATE INDEX IF NOT EXISTS idx_transactions_reservation ON transactions(reservation_id);

-- ── Vie nocturne ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guest_lists (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  night        TEXT NOT NULL,
  capacity     INTEGER NOT NULL,
  cutoff_at    TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('ouverte','fermee')),
  created_at   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_lists_venue_night ON guest_lists(venue_id, night, name);

-- Entry price by time band: free before 23h, 100 MAD after, and so on.
-- Rows rather than free text so the app can quote the right price.
CREATE TABLE IF NOT EXISTS guest_list_bands (
  id            TEXT PRIMARY KEY,
  guest_list_id TEXT NOT NULL REFERENCES guest_lists(id) ON DELETE CASCADE,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  until_at      TEXT NOT NULL,
  price_cents   INTEGER NOT NULL DEFAULT 0,
  -- Empty for everyone; otherwise 'femmes', 'couples', …
  applies_to    TEXT NOT NULL DEFAULT '',
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_guest_list_bands ON guest_list_bands(guest_list_id, position);

CREATE TABLE IF NOT EXISTS promoters (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL DEFAULT '',
  -- The slug behind the shareable link that pre-attributes app bookings.
  code         TEXT NOT NULL,
  commission_percent INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promoters_venue_code ON promoters(venue_id, code);

-- Inventory: how many booths of each kind the room has.
CREATE TABLE IF NOT EXISTS guest_list_entries (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  guest_list_id TEXT NOT NULL REFERENCES guest_lists(id) ON DELETE CASCADE,
  customer_id   TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name    TEXT NOT NULL,
  party_size    INTEGER NOT NULL DEFAULT 1,
  guest_phone   TEXT NOT NULL DEFAULT '',
  source        TEXT NOT NULL CHECK (source IN ('app','promoteur','sur_place')),
  promoter_id   TEXT REFERENCES promoters(id) ON DELETE SET NULL,
  qr_code       TEXT,
  checked_in_at TEXT,
  -- How many of the party actually walked in, which is rarely all of it.
  checked_in_count INTEGER NOT NULL DEFAULT 0,
  added_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gl_entries_list ON guest_list_entries(guest_list_id, guest_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_entries_qr ON guest_list_entries(qr_code);

CREATE TABLE IF NOT EXISTS table_types (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  count         INTEGER NOT NULL,
  min_guests    INTEGER NOT NULL,
  max_guests    INTEGER NOT NULL,
  -- Percentage of the minimum spend taken as a deposit.
  deposit_percent INTEGER NOT NULL DEFAULT 0,
  package       TEXT NOT NULL DEFAULT '',
  cancellation_hours INTEGER NOT NULL DEFAULT 24,
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_table_types_venue ON table_types(venue_id, position);

-- The minimum spend a table type carries on a given kind of night.
CREATE TABLE IF NOT EXISTS table_offers (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_type_id TEXT NOT NULL REFERENCES table_types(id) ON DELETE CASCADE,
  -- 'semaine', 'weekend', 'evenement' — or a date for a one-off night.
  night_kind    TEXT NOT NULL,
  night         TEXT,
  minimum_cents INTEGER NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_table_offers_type ON table_offers(table_type_id, night_kind);

CREATE TABLE IF NOT EXISTS table_reservations (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_type_id  TEXT NOT NULL REFERENCES table_types(id) ON DELETE CASCADE,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  promoter_id    TEXT REFERENCES promoters(id) ON DELETE SET NULL,
  guest_name     TEXT NOT NULL,
  guest_phone    TEXT NOT NULL DEFAULT '',
  party_size     INTEGER NOT NULL,
  night          TEXT NOT NULL,
  at             TEXT NOT NULL,
  minimum_cents  INTEGER NOT NULL,
  -- Filled from Lyfe Pay, or entered by a manager. Null while unknown —
  -- an unset minimum must not read as a spend of zero.
  reached_cents  INTEGER,
  status         TEXT NOT NULL CHECK (status IN
                   ('demandee','confirmee','arrivee','liberee','annulee')),
  deposit_id     TEXT REFERENCES deposits(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_table_reservations_night ON table_reservations(venue_id, night);

-- ── Marketing ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  channel       TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  template      TEXT NOT NULL CHECK (template IN
                  ('offre','evenement','newsletter','anniversaire','win_back')),
  segment_id    TEXT REFERENCES segments(id) ON DELETE SET NULL,
  subject       TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL CHECK (status IN
                  ('brouillon','programmee','envoi','envoyee','en_pause')),
  -- An automation fires on a trigger instead of a date.
  automation    TEXT NOT NULL DEFAULT '' CHECK (automation IN
                  ('','bienvenue','remerciement','win_back','anniversaire')),
  scheduled_for TEXT,
  sent_at       TEXT,
  -- Quoted before sending: channel cost per recipient, in centimes.
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  recipients    INTEGER NOT NULL DEFAULT 0,
  delivered     INTEGER NOT NULL DEFAULT 0,
  opened        INTEGER NOT NULL DEFAULT 0,
  clicked       INTEGER NOT NULL DEFAULT 0,
  reservations_attributed INTEGER NOT NULL DEFAULT 0,
  unsubscribed  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_venue ON campaigns(venue_id, created_at);

-- Every message the venue or the platform sent a guest, whatever the
-- surface — campaign, reminder, table-ready, review invite. One log so
-- Notifications and Campagnes cannot disagree on what went out.
CREATE TABLE IF NOT EXISTS messages_log (
  id             TEXT PRIMARY KEY,
  venue_id       TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  campaign_id    TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  channel        TEXT NOT NULL CHECK (channel IN ('email','sms','whatsapp','push')),
  kind           TEXT NOT NULL,
  recipient      TEXT NOT NULL,
  preview        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL CHECK (status IN
                   ('file','envoye','delivre','lu','echoue')),
  failure_reason TEXT NOT NULL DEFAULT '',
  at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_log_venue ON messages_log(venue_id, at);

-- Addresses that must never be contacted again, whatever the segment.
CREATE TABLE IF NOT EXISTS suppression_list (
  venue_id   TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  contact    TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  at         TEXT NOT NULL,
  PRIMARY KEY (venue_id, contact)
);

-- ── Reviews configuration ────────────────────────────────────

CREATE TABLE IF NOT EXISTS survey_config (
  venue_id          TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  enabled           INTEGER NOT NULL DEFAULT 0,
  send_after_hours  INTEGER NOT NULL DEFAULT 3,
  questions         TEXT NOT NULL DEFAULT '[]',
  -- Guests rating at or above this are invited to post publicly.
  redirect_from_rating INTEGER NOT NULL DEFAULT 4,
  google_url        TEXT NOT NULL DEFAULT '',
  tripadvisor_url   TEXT NOT NULL DEFAULT '',
  updated_at        TEXT NOT NULL
);

-- ── Establishment configuration ──────────────────────────────

-- The administrative half of Paramètres. Kept off `venues` because it is
-- read by billing and payouts, not by the consumer app.
CREATE TABLE IF NOT EXISTS venue_settings (
  venue_id           TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  -- 'restaurant', 'lounge', or 'both' — the switch that enables Vie
  -- nocturne. Distinct from `venues.kind`, which is what the app lists
  -- the place as; a restaurant with a rooftop bar is both.
  configuration      TEXT NOT NULL DEFAULT 'restaurant'
                       CHECK (configuration IN ('restaurant','lounge','both')),
  legal_name         TEXT NOT NULL DEFAULT '',
  ice                TEXT NOT NULL DEFAULT '',
  rc                 TEXT NOT NULL DEFAULT '',
  billing_address    TEXT NOT NULL DEFAULT '',
  iban               TEXT NOT NULL DEFAULT '',
  rib_asset_id       TEXT REFERENCES venue_assets(id) ON DELETE SET NULL,
  language           TEXT NOT NULL DEFAULT 'fr',
  timezone           TEXT NOT NULL DEFAULT 'Africa/Casablanca',
  consent_text       TEXT NOT NULL DEFAULT '',
  retention_months   INTEGER NOT NULL DEFAULT 36,
  google_place_url   TEXT NOT NULL DEFAULT '',
  instagram_handle   TEXT NOT NULL DEFAULT '',
  whatsapp_number    TEXT NOT NULL DEFAULT '',
  dress_code         TEXT NOT NULL DEFAULT '',
  minimum_age        INTEGER NOT NULL DEFAULT 0,
  api_access_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT NOT NULL
);

-- ── Subscription and support ─────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  venue_id      TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL DEFAULT 'annual',
  status        TEXT NOT NULL CHECK (status IN ('essai','actif','expire')),
  trial_ends_at TEXT,
  renews_at     TEXT,
  price_cents   INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT '',
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reference    TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('payee','due','impayee')),
  issued_on    TEXT NOT NULL,
  asset_id     TEXT REFERENCES venue_assets(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_venue ON invoices(venue_id, issued_on);

CREATE TABLE IF NOT EXISTS support_tickets (
  id          TEXT PRIMARY KEY,
  venue_id    TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  reference   TEXT NOT NULL,
  category    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('ouvert','en_cours','resolu')),
  author_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_venue ON support_tickets(venue_id, created_at);
