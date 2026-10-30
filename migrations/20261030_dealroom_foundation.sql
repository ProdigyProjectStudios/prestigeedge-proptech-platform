-- Apply before DEALROOM_STORAGE=postgres. Safe to rerun.
-- Existing agency tables are unchanged. The Deal Room demo is not a legal signature workflow.
CREATE TABLE IF NOT EXISTS dealroom_sessions (
  session_token_hash varchar(64) PRIMARY KEY,
  role varchar(10) NOT NULL CHECK (role IN ('buyer','admin')),
  kind varchar(16) NOT NULL CHECK (kind IN ('demo','authenticated')),
  principal_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK ((kind = 'demo' AND principal_id IS NULL) OR (kind = 'authenticated' AND principal_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS dealroom_sessions_expires_idx ON dealroom_sessions(expires_at);
CREATE TABLE IF NOT EXISTS dealroom_envelopes (
  envelope_id uuid PRIMARY KEY,
  listing_id varchar(120) NOT NULL,
  buyer_session_hash varchar(64) NOT NULL REFERENCES dealroom_sessions(session_token_hash),
  buyer_name text NOT NULL,
  status varchar(12) NOT NULL CHECK (status IN ('created','sent','signed','declined')),
  provider varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  CONSTRAINT dealroom_envelopes_session_listing_uidx UNIQUE(listing_id, buyer_session_hash)
);
CREATE INDEX IF NOT EXISTS dealroom_envelopes_listing_idx ON dealroom_envelopes(listing_id);
CREATE TABLE IF NOT EXISTS dealroom_grants (
  grant_id uuid PRIMARY KEY,
  listing_id varchar(120) NOT NULL,
  buyer_session_hash varchar(64) NOT NULL REFERENCES dealroom_sessions(session_token_hash),
  buyer_name text NOT NULL,
  envelope_id uuid NOT NULL REFERENCES dealroom_envelopes(envelope_id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dealroom_grants_session_listing_uidx UNIQUE(listing_id, buyer_session_hash)
);
CREATE INDEX IF NOT EXISTS dealroom_grants_listing_idx ON dealroom_grants(listing_id);
CREATE TABLE IF NOT EXISTS dealroom_audit (
  id uuid PRIMARY KEY,
  listing_id varchar(120) NOT NULL,
  event varchar(80) NOT NULL,
  actor_name text NOT NULL,
  actor_role varchar(10) NOT NULL,
  detail text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dealroom_audit_listing_time_idx ON dealroom_audit(listing_id, occurred_at);
