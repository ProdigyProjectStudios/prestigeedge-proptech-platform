# PrestigeEdge Deal Room · Durable transaction foundation

**Status:** Implementation on feature branch, not deployed or provider-certified.

This milestone replaces restart-sensitive in-memory Deal Room state with an **opt-in PostgreSQL backend** while retaining the existing fictional MNA-2047 portfolio journey. PostgreSQL is the source of truth for sessions, NDA envelopes, access grants and audit events when enabled. No fallback to memory occurs when database mode is selected and the required tables are missing.

## Implemented in this milestone

- Persistent, expiring sessions. The database stores a SHA-256 token hash, not the raw bearer token.
- Real-account session initiation via `POST /api/dealroom/auth-session`, using existing JWT middleware and deriving buyer/admin role from the active account. Real-account requests must provide both matching `Authorization: Bearer ...` and `X-DR-Session`.
- Real-account session validation on every request, including identity and active-role rechecking.
- Durable NDA envelopes, grants and ordered audit events with per-session/listing keys.
- Atomic demonstration signature: row lock, envelope transition, access grant and two audit records commit together; retries return the original grant.
- Public demonstration roles disabled by default in production unless `DEALROOM_DEMO_ACCESS=true`. Even when enabled, the demonstration session is restricted to the fictional listing `MNA-2047`.
- Safe asynchronous API error forwarding, storage readiness validation on startup and redaction of Deal Room response bodies from HTTP request logs.
- `GET /api/dealroom/capabilities` truthfully reports storage and integration availability.

## Deploy / activate

1. Back up your database and review the migration and its existing-table names.
2. In a **separate staging PostgreSQL database**, apply `migrations/20261030_dealroom_foundation.sql` using your trusted SQL client (e.g. Neon SQL Editor). The migration creates four additive tables; it does not change your existing agency tables.
3. Set `DEALROOM_STORAGE=postgres` in staging. The app refuses startup if any of the four required tables are missing.
4. For the synthetic portfolio walkthrough only, set `DEALROOM_DEMO_ACCESS=true` and continue using the existing client `/deal-room` route. Do not use public demo admin access with real transaction data.
5. To exercise the real-account identity path, set a strong `JWT_SECRET` and obtain a normal application JWT. Call `POST /api/dealroom/auth-session` with this JWT; subsequent requests require both credentials.
6. Run `npm run test:dealroom`, `npm run build`, then the isolated PostgreSQL integration suite described below. Review logs and repeat the NDA flow across a server restart.
7. Deploy only after staging passes and the existing frontend is configured for the intended demo/account mode.

`DEALROOM_STORAGE` defaults to the legacy in-memory demonstration store (with a 12-hour session limit). This is deliberate for backwards compatibility, **not** a production database fallback.

## Tests

- `npm run test:dealroom` — HTTP-level synthetic NDA walkthrough (401/403 checks, duplicate NDA, cross-buyer denial, idempotent signing, protected CIM and admin audit), plus security-helper tests. Runs automatically for all pull requests and main-branch pushes.
- `DEALROOM_TEST_DATABASE_URL=<isolated-staging-db-url> DEALROOM_TEST_CONFIRM=yes npm run test:dealroom:postgres` — creates synthetic test sessions in **only** the explicitly named test DB, verifies access isolation, idempotent signing and durable event state. This suite skips by default.
- `npm run build` — application bundle.
- `npm run check` — existing full TypeScript issues are documented in `docs/publication.md`; do not misrepresent baseline errors as newly introduced or resolved.

The GitHub Actions workflow also runs `npm ci` and `npm run build` for every pull request and main update. A passing build does not replace the existing full TypeScript check or database/integration acceptance tests.

This branch has not run a live database migration, external e-signature event, CRM sync or object-storage round trip. Those are release gates, not completed features.

## Security boundaries and remaining engineering

**The demonstration sign endpoint is still a simulation, not a legally binding or verified e-signature.** It is unavailable to authenticated accounts. Their NDA request path also fails closed until a real provider has been connected and verified.

Next milestones, in dependency order:

1. **Verified e-signatures:** integrate DocuSign/Dropbox Sign using server-side envelope issuance, signed raw-body webhook validation, replay protection, provider status verification and transactional grant creation. Include positive and malicious callback tests. Never enable browser-triggered signing for a real account.
2. **Confidential document vault:** classify inventory and prevent the public catalogue exposing classified records; implement private object storage, short-lived authorized downloads, virus/file validation, metadata versions, revocation and complete read auditing.
3. **CRM and operational workflows:** durable deal stages, owner assignment, buyer outreach tasks, controlled HubSpot/Pipedrive (or chosen CRM) outbound sync via retryable idempotent jobs, clear consent and safe field mapping.
4. **Multi-tenant production authorization:** tie Deal Room resources to tenant, stable buyer identities, listing ownership and active roles; implement revocation, expiry, retention, export and recovery.

The existing demo's structured CIM is **not** a secure document vault. No private files or customer transactions should be entered into this public demo. Production rollout requires the next milestones and end-to-end security testing.
