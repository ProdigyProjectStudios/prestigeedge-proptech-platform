# Prestige Edge: encrypted document vault (Phase 3)

Status: draft branch stacked on provider-signing Phase 2. No live Replit or production client documents have been touched. This is a small-file encrypted vault for a **fictional showcase listing**, not a certified production document-management system.

## Implemented

- Private PostgreSQL-backed document metadata and AES-256-GCM ciphertext, with a new random nonce for each file/version.
- Associated authenticated encryption binds each PDF to its listing, document ID and exact version. SHA-256 digest is checked after decryption; tampered data fails closed.
- Upload supports PDF-only (header/mime/filename checked), maximum 5 MiB; the application does not embed PDFs inline or expose direct public URLs.
- Staff may create documents, upload new versions, and revoke an entire document/version history.
- Verified account buyers need a completed **Dropbox Sign** provider NDA for the same listing before they can list/download records. Public demo role-switching tokens never authorize the vault.
- Downloads set no-store, nosniff, attachment disposition, and sandbox CSP headers; successful reads, writes, version changes and revocations are audited.
- Premium upload/list/version/download/revoke panel in authenticated buyer and agency views.

## Strict limitations

- The vault only works with **MNA-2047 fictional inventory**. A hard-coded listing gate prevents accidental private-client data ingestion until tenant ownership, buyer invitations, confidential catalogue segregation, verified email identity and data retention policies are built.
- **No malware scanner** is connected; file magic/mime validation is not malware detection. Use only self-authored synthetic PDFs.
- The current database ciphertext model suits small demo documents, not arbitrarily large commercial data rooms. Full private object storage is the intended large-file production migration.
- Key rotation, backup recovery, document classification, stable organization permissions, retention/erasure policies, provider signed-PDF archival and compliance review remain unimplemented.
- Provider signings in this phase are **test-mode**, not legally binding. An external test email and webhook acceptance still need verification in staging.

## Safe staging setup

1. Apply the migrations in order to a separate staging database:
   - migrations/20261030_dealroom_foundation.sql
   - migrations/20261030_dealroom_signatures.sql
   - migrations/20261030_dealroom_vault.sql
2. Set DEALROOM_STORAGE=postgres, and configure the authenticated account/JWT infrastructure plus Phase 2 signing.
3. Generate a **random 32-byte key** and store the 64-character hexadecimal value only in Replit Secrets as DEALROOM_DOCUMENT_ENCRYPTION_KEY. Back up the key offline securely; losing it makes files unrecoverable.
4. Set DEALROOM_VAULT_ENABLED=true in staging. App startup fails if storage/migration/key requirements are not met.
5. Sign into an actual **staff** account, use the Deal Room account mode, open MNA-2047 and upload a harmless synthetic PDF.
6. Confirm an unsigned buyer receives 403 on listing/downloading. Sign the Dropbox Sign test NDA from a separate test buyer account. After verified provider callback and grant, verify list/download works.
7. Upload a second version, verify the current content, revoke the document, and verify the buyer can no longer download it.
8. Exercise restart persistence, encryption failure when the wrong key is supplied, and audited access before merging.

## Automated checks

- npm run test:dealroom: cryptographic roundtrip, nonce uniqueness, AAD binding, invalid PDF rejection, wrong-key/tampering errors, synthetic-listing restriction and prior auth/provider tests.
- CI PostgreSQL 16 migration smoke applies all three migrations twice and inserts sample document/version records with constraints.
- CI checks touched Deal Room TypeScript diagnostics and builds the full client/server.
- **Not verified:** actual PostgreSQL runtime binary encode/decode on Neon, real Dropbox Sign events, real browser uploads, or production deployment. No CI result should be described as live-provider acceptance.

## Vault endpoints (authenticated; hidden from public demo)

- GET /api/dealroom/listings/MNA-2047/documents: buyer with verified NDA or staff
- POST /api/dealroom/listings/MNA-2047/documents: staff-only multipart PDF + title
- POST /api/dealroom/documents/{id}/versions: staff-only multipart PDF revision
- DELETE /api/dealroom/documents/{id}: staff-only revoke
- GET /api/dealroom/documents/{id}/download: verified buyer or staff, attachment download

Next: separate real inventory permissions and private catalogue, then build CRM outbox and operational workflow features.
