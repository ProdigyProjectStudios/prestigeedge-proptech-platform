-- Phase 2: migration must follow 20261030_dealroom_foundation.sql.
-- Test in an isolated staging PostgreSQL instance before production.
ALTER TABLE dealroom_envelopes
  ADD COLUMN IF NOT EXISTS provider_request_id varchar(150),
  ADD COLUMN IF NOT EXISTS buyer_principal_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS signer_email varchar(255),
  ADD COLUMN IF NOT EXISTS provider_test_mode boolean;

CREATE UNIQUE INDEX IF NOT EXISTS dealroom_envelopes_provider_id_uidx
  ON dealroom_envelopes(provider_request_id)
  WHERE provider_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS dealroom_envelopes_principal_listing_uidx
  ON dealroom_envelopes(listing_id,buyer_principal_id)
  WHERE buyer_principal_id IS NOT NULL;

ALTER TABLE dealroom_grants
  ADD COLUMN IF NOT EXISTS buyer_principal_id uuid REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS dealroom_grants_principal_listing_uidx
  ON dealroom_grants(listing_id,buyer_principal_id)
  WHERE buyer_principal_id IS NOT NULL;

-- This is an operational idempotency ledger, not an immutable compliance log.
-- It deliberately stores only event identifiers, not raw callback JSON or PII.
CREATE TABLE IF NOT EXISTS dealroom_provider_events (
  id uuid PRIMARY KEY,
  provider_request_id varchar(150) NOT NULL,
  event_type varchar(100) NOT NULL,
  event_time bigint NOT NULL,
  event_hash varchar(64) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_request_id, event_type, event_time, event_hash)
);
CREATE INDEX IF NOT EXISTS dealroom_provider_events_request_idx
  ON dealroom_provider_events(provider_request_id,received_at);
