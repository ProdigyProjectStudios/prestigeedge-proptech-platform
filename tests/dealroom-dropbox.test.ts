import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  canIssueNdaForListing,
  completedForExpectedSigner,
  DropboxSignClient,
  parseDropboxCallback,
  signatureConfiguration,
  verifyDropboxEvent,
  type DropboxSignConfig,
  type DropboxSignatureRequest,
} from "../server/dealroom/dropbox-sign";

const config: DropboxSignConfig = {
  apiKey: "unit-test-key",
  templateId: "template123",
  signerRole: "Buyer",
  clientId: "my-app",
  testMode: true,
};
const verified: DropboxSignatureRequest = {
  signature_request_id: "external_request_123",
  is_complete: true,
  is_declined: false,
  has_error: false,
  test_mode: true,
  metadata: { dealroom_envelope_id: "local-uuid", dealroom_listing_id: "MNA-2047" },
  signatures: [{ signer_email_address: "buyer@example.com", status_code: "signed" }],
};
const expected = {
  providerRequestId: "external_request_123",
  buyerEmail: "Buyer@Example.com",
  envelopeId: "local-uuid",
  listingId: "MNA-2047",
  testMode: true,
};

describe("Dropbox Sign verification and release gates", () => {
  it("requires explicit credentials, postgres storage and a provider switch", () => {
    assert.equal(signatureConfiguration({}), null);
    assert.equal(signatureConfiguration({ DEALROOM_STORAGE: "postgres", DROPBOX_SIGN_API_KEY: "secret" }), null);
    assert.equal(signatureConfiguration({
      DEALROOM_SIGNATURE_PROVIDER: "dropbox", DEALROOM_STORAGE: "postgres",
      DROPBOX_SIGN_API_KEY: "key", DROPBOX_SIGN_TEMPLATE_ID: "template",
    })?.testMode, true);
    assert.equal(signatureConfiguration({
      DEALROOM_SIGNATURE_PROVIDER: "dropbox", DEALROOM_STORAGE: "postgres",
      DROPBOX_SIGN_API_KEY: "key", DROPBOX_SIGN_TEMPLATE_ID: "template",
      DROPBOX_SIGN_TEST_MODE: "false",
    }), null);
  });
  it("requires additional signoff to send live signing requests", () => {
    const active = signatureConfiguration({
      DEALROOM_SIGNATURE_PROVIDER: "dropbox", DEALROOM_STORAGE: "postgres",
      DROPBOX_SIGN_API_KEY: "key", DROPBOX_SIGN_TEMPLATE_ID: "template",
      DROPBOX_SIGN_TEST_MODE: "false", DEALROOM_LIVE_SIGNATURES_ENABLED: "true",
      DEALROOM_NDA_LEGAL_APPROVED: "true",
    });
    assert.equal(active?.testMode, false);
  });
  it("never sends a test NDA against a real listing", () => {
    assert.equal(canIssueNdaForListing("MNA-2047", config), true);
    assert.equal(canIssueNdaForListing("real-uuid", config, {
      DEALROOM_REAL_INVENTORY_CLASSIFIED: "true",
    }), false);
    assert.equal(canIssueNdaForListing("MNA-2047", { ...config, testMode: false }), false);
    assert.equal(canIssueNdaForListing("real-uuid", { ...config, testMode: false }, {
      DEALROOM_REAL_INVENTORY_CLASSIFIED: "true",
      DEALROOM_NDA_LEGAL_APPROVED: "true",
      DEALROOM_LIVE_SIGNATURES_ENABLED: "true",
    }), false);
  });
  it("rejects malformed and tampered event signatures", () => {
    const event_time = "1793394000";
    const event_type = "signature_request_all_signed";
    const event_hash = createHmac("sha256", config.apiKey).update(event_time + event_type).digest("hex");
    const payload = {
      event: {
        event_time, event_type, event_hash,
        event_metadata: { reported_for_app_id: "my-app" },
      },
      signature_request: { signature_request_id: "external_request_123" },
    };
    assert.equal(verifyDropboxEvent(payload, config), true);
    assert.equal(verifyDropboxEvent({ ...payload, event: { ...payload.event, event_type: "signature_request_sent" } }, config), false);
    assert.equal(verifyDropboxEvent({ ...payload, event: { ...payload.event, event_hash: "00".repeat(32) } }, config), false);
    assert.equal(verifyDropboxEvent({ ...payload, event: { ...payload.event, event_time: "bad" } }, config), false);
    assert.equal(verifyDropboxEvent({ ...payload, event: { ...payload.event, event_metadata: { reported_for_app_id: "other" } } }, config), false);
  });
  it("verifies signer, metadata, provider ID and test mode independently", () => {
    assert.equal(completedForExpectedSigner(verified, expected), true);
    assert.equal(completedForExpectedSigner({ ...verified, is_complete: false }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, has_error: true }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, is_declined: true }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, test_mode: false }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, metadata: {} }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, signature_request_id: "someone_elses_request" }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, signatures: [{ signer_email_address: "attacker@example.com", status_code: "signed" }] }, expected), false);
    assert.equal(completedForExpectedSigner({ ...verified, signatures: [{ signer_email_address: "buyer@example.com", status_code: "awaiting_signature" }] }, expected), false);
  });
  it("parses documented multipart json field and rejects malformed JSON", () => {
    assert.equal((parseDropboxCallback({ json: '{"event":{"event_type":"callback_test"}}' }) as any).event.event_type, "callback_test");
    assert.throws(() => parseDropboxCallback({ json: "{" }));
    assert.throws(() => parseDropboxCallback(null));
  });
  it("sends an actual template-shaped request with correct signer and metadata using a fake transport", async () => {
    let sent: RequestInit | undefined;
    let endpoint = "";
    const fakeFetch: typeof fetch = async (url, init) => {
      endpoint = String(url);
      sent = init;
      return new Response(JSON.stringify({
        signature_request: { signature_request_id: "external_request_123", test_mode: true },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const client = new DropboxSignClient(config, fakeFetch);
    const result = await client.sendTemplatedNda({
      envelopeId: "local-uuid", listingId: "MNA-2047",
      buyerName: "Ava Morgan", buyerEmail: "buyer@example.com",
    });
    assert.equal(result.providerRequestId, "external_request_123");
    assert.equal(endpoint, "https://api.hellosign.com/v3/signature_request/send_with_template");
    const body = sent?.body as FormData;
    assert.equal(body.get("template_ids[0]"), config.templateId);
    assert.equal(body.get("signers[0][email_address]"), "buyer@example.com");
    assert.equal(body.get("signers[0][role]"), "Buyer");
    assert.equal(body.get("metadata[dealroom_envelope_id]"), "local-uuid");
    assert.equal(body.get("test_mode"), "1");
    assert.match(String((sent?.headers as Record<string, string>)?.authorization), /^Basic /);
  });
  it("checks provider GET status rather than trusting the callback body", async () => {
    const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({
      signature_request: verified,
    }), { status: 200 });
    const client = new DropboxSignClient(config, fakeFetch);
    const request = await client.getSignatureRequest("external_request_123");
    assert.equal(completedForExpectedSigner(request, expected), true);
    await assert.rejects(() => client.getSignatureRequest("../../etc/passwd"), /Invalid provider request ID/);
    const failedClient = new DropboxSignClient(config, async () => new Response("unavailable", { status: 500 }));
    await assert.rejects(() => failedClient.getSignatureRequest("external_request_123"), /HTTP 500/);
  });
});
