-- Phase 3 (synthetic-only): encrypted, versioned Deal Room PDF vault.
-- Must follow foundation and provider-signing migrations.
CREATE TABLE IF NOT EXISTS dealroom_documents (
  id uuid PRIMARY KEY,
  listing_id varchar(120) NOT NULL,
  title varchar(200) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  current_version integer NOT NULL DEFAULT 1 CHECK(current_version > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS dealroom_documents_listing_idx
  ON dealroom_documents(listing_id,status,created_at);

CREATE TABLE IF NOT EXISTS dealroom_document_versions (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES dealroom_documents(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  filename varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL DEFAULT 'application/pdf',
  original_length integer NOT NULL CHECK (original_length > 0 AND original_length <= 5242880),
  sha256 varchar(64) NOT NULL,
  iv bytea NOT NULL CHECK (octet_length(iv) = 12),
  auth_tag bytea NOT NULL CHECK (octet_length(auth_tag) = 16),
  ciphertext bytea NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dealroom_doc_version_unique UNIQUE(document_id,version)
);
CREATE INDEX IF NOT EXISTS dealroom_doc_versions_document_idx
  ON dealroom_document_versions(document_id,version);
