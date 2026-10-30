# Prestige Edge: deal operations and HubSpot handoff (Phase 4)

Status: Draft stacked pull request on top of the durable foundation, provider signing and encrypted document vault. No branch has been merged, no production database migration has been applied, and no live HubSpot API has been called.

## Implemented scope

- Limited in code to the fictional MNA-2047 listing; real inventory and private customer data must not enter this example.
- Active authenticated agency staff can create one deal per client test account, advance guarded stages, assign follow-up tasks, update task status and review a persistent CRM outbox.
- Deal lifecycle: qualified, NDA requested, verified NDA, due diligence, offer, won/lost. NDA signed and later stages require a real provider-verified grant in the local system.
- Deal creation and transitions atomically update PostgreSQL records, audit events and a durable CRM outbox.
- HubSpot is an optional adapter for test-portal deals, only activated by explicit configuration and a staff click on Sync next event.
- Outgoing data contains only fictional deal ID, case name, configured pipeline and stage; no buyer name/email, price, real address, financial data or documents.
- First authorized sync performs a create request and stores its remote object ID. Later requests PATCH by the known remote ID. Ambiguous sends remain manual-review only, and blocked prior events prevent unsafe subsequent sends for the same deal.
- Premium staff command center integrates into the authenticated Deal Room admin view. Public demo and buyer sessions cannot use it.

## Isolated staging deployment

1. Apply all four migrations in order: foundation, signatures, vault, then operations.
2. Set DEALROOM_STORAGE=postgres and DEALROOM_OPERATIONS_ENABLED=true. Confirm authenticated agent/admin access, and create a separate fictional client account.
3. In a dedicated HubSpot test portal, obtain an appropriate service key and configure DEALROOM_CRM_PROVIDER=hubspot, DEALROOM_CRM_SYNC_ENABLED=true, HUBSPOT_ACCESS_TOKEN and HUBSPOT_DEAL_PIPELINE_ID.
4. Map the HUBSPOT_STAGE_QUALIFIED, HUBSPOT_STAGE_NDA_REQUESTED, HUBSPOT_STAGE_NDA_SIGNED, HUBSPOT_STAGE_DUE_DILIGENCE, HUBSPOT_STAGE_OFFER, HUBSPOT_STAGE_WON and HUBSPOT_STAGE_LOST variables to that portal's actual internal pipeline stage IDs.
5. Open MNA-2047 using a signed-in staff account and create a fictional deal for the test client account. Create a staff follow-up task.
6. Verify NDA-signed stage is rejected before provider completion; complete a Dropbox Sign test NDA with a test mailbox you control; refresh and advance the stage.
7. Click Sync next event to send a synthetic deal to your HubSpot test portal. Confirm the app saves the remote object ID. Subsequent stage sync should use PATCH for the same ID.
8. Simulate failed/ambiguous provider responses and verify the outbox shows review_required and blocks blind duplicate sends.

## Verification and limitations

GitHub Actions runs clean install, security/provider/vault/ops tests, targeted TypeScript checks, build and all four PostgreSQL migrations on a disposable Postgres 16 container. A full staging runtime transaction test and actual HubSpot/Dropbox Sign acceptance still require credentials and explicit user-controlled deployment.

Production still requires buyer email verification, stable tenancy and listing ownership, private inventory classification, malware scanning, key rotation, CRM provider onboarding, current API contract validation and retention policy. HubSpot legacy v3 endpoints are used here because they have a known create/update contract; production should migrate to HubSpot 2026 date-versioned APIs after independent portal validation.

Official reference: https://developers.hubspot.com/docs/reference/api/overview
