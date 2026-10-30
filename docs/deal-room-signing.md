# Prestige Edge Deal Room: provider signing (Phase 2)

Status: draft stacked pull request on the durable Deal Room foundation. NOT deployed, not yet tested against an actual Dropbox Sign account.

## Implemented

- Authenticated buyers request template-backed NDAs by email through Dropbox Sign.
- An outbound reservation prevents automatic duplicate sends when the API times out; ambiguous requests require manual reconciliation.
- The callback verifies the Dropbox Sign HMAC and API app ID (when configured), then independently retrieves the provider request, checks exact envelope metadata, signer email, test mode and completed state.
- Only after verification can a single database transaction mark the envelope signed, create a principal-bound access grant, and write audit and replay entries.
- The React Deal Room provides an authenticated account option and a refreshable signing status, alongside the original synthetic role-switching preview.
- Public registration cannot choose admin/agent roles; the production JWT key must be strong and explicitly configured.

## Hard security limit

Only the fictional MNA-2047 listing can receive a Dropbox Sign **test-mode** NDA. The restriction is enforced in code, not just by environment flags. Test-mode signatures are NOT legally binding. Real listing confidentiality, tenant ownership, buyer email verification, NDA legal review, and document vault controls are not yet complete.

The public DemoSignatureProvider is separate and cannot unlock real deals.

## Staging activation

1. Apply migrations/20261030_dealroom_foundation.sql followed by migrations/20261030_dealroom_signatures.sql to an isolated staging PostgreSQL database.
2. Create a Dropbox Sign template with a Buyer signer role, and a test email account you control.
3. Configure the staging deployment's secret manager (never commit secrets):
    - DEALROOM_STORAGE=postgres
    - DEALROOM_SIGNATURE_PROVIDER=dropbox
    - DROPBOX_SIGN_API_KEY (secret)
    - DROPBOX_SIGN_TEMPLATE_ID (secret template identifier)
    - DROPBOX_SIGN_SIGNER_ROLE=Buyer
    - DROPBOX_SIGN_TEST_MODE=true
    - DROPBOX_SIGN_CLIENT_ID (optional, for app-scoped callbacks)
    - JWT_SECRET (at least 32 random characters)
    - DEALROOM_DEMO_ACCESS=true only if you want the separate synthetic public preview
    - Keep DEALROOM_LIVE_SIGNATURES_ENABLED=false
4. Set the Dropbox Sign account/API App HTTPS callback URL to /api/dealroom/webhooks/dropbox on your staging domain.
5. Sign in as a client using a mailbox you own. Visit /deal-room, choose Use my account, open MNA-2047, then request an NDA. Dropbox Sign sends an email even in test mode.
6. Follow the Dropbox Sign test email to sign. Return and refresh status; access must remain denied until a valid callback AND provider readback succeed.
7. Test forged callbacks, duplicate events, cross-buyer access and restart persistence before rollout.

Do not send test signatures to unsolicited recipients, and do not paste or commit API keys.

## Automated verification

- npm run test:dealroom includes HTTP NDA flow, authorization, registration privilege checks, provider HMAC and callback verification tests with fake provider transport.
- CI separately type-checks the isolated provider and callback code, builds the client/server, and applies both SQL migrations twice against disposable PostgreSQL 16 with uniqueness assertions.
- The runtime PostgreSQL integration suite is still opt-in and must use an isolated database; no real provider or Replit deployment was exercised.
- The repository has documented existing application-wide TypeScript issues; a passing build is not a passing whole-project type check.

## Subsequent work

1. Tenant/organization and listing ownership, buyer invitation / verified identity.
2. Hide confidential listing fields from the public catalogue, search and cache.
3. Private document vault with revocable access, secure object storage and signed download authorization.
4. Legally approved NDA retention and provider acceptance tests for production.
5. CRM outbox with idempotent delivery, retry and audit.

Official provider references:
https://developers.hellosign.com/api/signature-request/send-with-template
https://developers.hellosign.com/api/signature-request/get
https://developers.hellosign.com/docs/guides/events-and-callbacks/walkthrough
