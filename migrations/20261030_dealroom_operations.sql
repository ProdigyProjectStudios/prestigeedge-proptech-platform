-- Phase 4: synthetic-only operational deals, staff tasks and durable CRM delivery queue.
-- Requires Deal Room foundation, signing, and vault migrations first.
CREATE TABLE IF NOT EXISTS dealroom_deals (
  id uuid PRIMARY KEY,
  listing_id varchar(120) NOT NULL,
  buyer_id uuid NOT NULL REFERENCES users(id),
  owner_id uuid NOT NULL REFERENCES users(id),
  stage varchar(32) NOT NULL DEFAULT 'qualified' CHECK (stage IN
    ('qualified','nda_requested','nda_signed','due_diligence','offer','won','lost')),
  crm_object_id varchar(120),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dealroom_deals_buyer_listing_uidx UNIQUE(listing_id,buyer_id)
);
CREATE INDEX IF NOT EXISTS dealroom_deals_listing_idx ON dealroom_deals(listing_id,stage,updated_at);

CREATE TABLE IF NOT EXISTS dealroom_tasks (
  id uuid PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES dealroom_deals(id) ON DELETE RESTRICT,
  title varchar(200) NOT NULL,
  description text NOT NULL DEFAULT '',
  assigned_to uuid NOT NULL REFERENCES users(id),
  status varchar(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','done','canceled')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS dealroom_tasks_deal_idx ON dealroom_tasks(deal_id,status,due_at);

CREATE TABLE IF NOT EXISTS dealroom_crm_outbox (
  id uuid PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES dealroom_deals(id),
  event_type varchar(50) NOT NULL,
  status varchar(22) NOT NULL DEFAULT 'pending' CHECK(status IN
    ('pending','processing','delivered','review_required')),
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  external_object_id varchar(120),
  last_error varchar(200),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dealroom_crm_outbox_ready_idx
  ON dealroom_crm_outbox(status,available_at,created_at);
CREATE INDEX IF NOT EXISTS dealroom_crm_outbox_deal_idx
  ON dealroom_crm_outbox(deal_id,created_at);
